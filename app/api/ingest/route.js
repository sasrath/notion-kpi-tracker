import { NextResponse } from "next/server";
import { ingestReport } from "@/lib/llm";
import { findOrCreateClient, createReport, saveKPIs } from "@/lib/notion";

// Simple in-memory rate limiter (per-session via IP)
const sessionCounts = new Map();
const MAX_PER_SESSION = 5;

export async function POST(request) {
  // Rate limiting by IP
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const count = sessionCounts.get(ip) ?? 0;
  if (count >= MAX_PER_SESSION) {
    return NextResponse.json(
      { error: `Session limit reached (${MAX_PER_SESSION} reports). Please refresh to continue.` },
      { status: 429 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { url, clientName, quarter, year, ticker, model } = body;

  // Input validation
  if (!url || !clientName || !quarter || !year) {
    return NextResponse.json(
      { error: "Missing required fields: url, clientName, quarter, year." },
      { status: 400 }
    );
  }
  if (!["Q1", "Q2", "Q3", "Q4"].includes(quarter)) {
    return NextResponse.json({ error: "Quarter must be Q1, Q2, Q3, or Q4." }, { status: 400 });
  }
  if (year < 2000 || year > new Date().getFullYear()) {
    return NextResponse.json({ error: "Invalid year." }, { status: 400 });
  }

  // Step 1: Claude ingests the report
  const extraction = await ingestReport({ url, clientName, quarter, year, ticker, model });

  if (!extraction.success) {
    return NextResponse.json({ error: extraction.error, warnings: extraction.warnings }, { status: 422 });
  }

  // Return extraction preview — frontend will confirm before saving
  // (Human-in-the-loop gate: saving happens in /api/ingest/confirm)
  sessionCounts.set(ip, count + 1);

  return NextResponse.json({
    preview: extraction.kpis,
    warnings: extraction.warnings,
    clientName,
    quarter,
    year,
    url,
  });
}
