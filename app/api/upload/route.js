import { NextResponse } from "next/server";
import pdf from "pdf-parse";
import { ingestDocument } from "@/lib/llm";

// 10MB max file size
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = ["application/pdf", "text/plain"];

// Simple in-memory rate limiter
const sessionCounts = new Map();
const MAX_PER_SESSION = 5;

export async function POST(request) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const count = sessionCounts.get(ip) ?? 0;
  if (count >= MAX_PER_SESSION) {
    return NextResponse.json(
      { error: `Session limit reached (${MAX_PER_SESSION} uploads). Please refresh to continue.` },
      { status: 429 }
    );
  }

  let formData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  const file = formData.get("file");
  const clientName = formData.get("clientName");
  const quarter = formData.get("quarter");
  const year = Number(formData.get("year"));
  const ticker = formData.get("ticker") || "";
  const model = formData.get("model") || "";
  const docType = formData.get("docType") || "Financial Document";

  // Validate required fields
  if (!file || !clientName || !quarter || !year) {
    return NextResponse.json(
      { error: "Missing required fields: file, clientName, quarter, year." },
      { status: 400 }
    );
  }

  if (!["Q1", "Q2", "Q3", "Q4"].includes(quarter)) {
    return NextResponse.json({ error: "Quarter must be Q1, Q2, Q3, or Q4." }, { status: 400 });
  }

  if (year < 2000 || year > new Date().getFullYear()) {
    return NextResponse.json({ error: "Invalid year." }, { status: 400 });
  }

  // Validate file type and size
  if (!ALLOWED_TYPES.includes(file.type) && !file.name?.endsWith(".pdf") && !file.name?.endsWith(".txt")) {
    return NextResponse.json(
      { error: "Only PDF and plain text files are supported." },
      { status: 400 }
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "File too large. Maximum size is 10MB." },
      { status: 400 }
    );
  }

  // Extract text from file
  let documentText;
  try {
    const buffer = Buffer.from(await file.arrayBuffer());

    if (file.type === "text/plain" || file.name?.endsWith(".txt")) {
      documentText = buffer.toString("utf-8");
    } else {
      const pdfData = await pdf(buffer);
      documentText = pdfData.text;
    }
  } catch (err) {
    return NextResponse.json(
      { error: `Failed to parse file: ${err.message}` },
      { status: 422 }
    );
  }

  if (!documentText || documentText.trim().length < 50) {
    return NextResponse.json(
      { error: "Could not extract sufficient text from the document." },
      { status: 422 }
    );
  }

  // Send to LLM for extraction
  const extraction = await ingestDocument({
    text: documentText,
    clientName,
    quarter,
    year,
    ticker,
    docType,
    model,
  });

  if (!extraction.success) {
    return NextResponse.json(
      { error: extraction.error, warnings: extraction.warnings },
      { status: 422 }
    );
  }

  sessionCounts.set(ip, count + 1);

  return NextResponse.json({
    preview: extraction.kpis,
    warnings: extraction.warnings,
    clientName,
    quarter,
    year,
    source: `${docType}: ${file.name}`,
  });
}
