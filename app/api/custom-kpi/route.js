import { NextResponse } from "next/server";
import { saveCustomKPI } from "@/lib/notion";

const ALLOWED_UNITS = ["$M", "%", "$", "x", "days", "count", "other"];

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { clientId, kpiName, value, unit, quarter, year, notes } = body;

  // Validation
  if (!clientId || !kpiName || value === undefined || !unit || !quarter || !year) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }
  if (typeof value !== "number" || !isFinite(value)) {
    return NextResponse.json({ error: "Value must be a finite number." }, { status: 400 });
  }
  if (!ALLOWED_UNITS.includes(unit)) {
    return NextResponse.json({ error: `Unit must be one of: ${ALLOWED_UNITS.join(", ")}` }, { status: 400 });
  }
  if (!["Q1", "Q2", "Q3", "Q4"].includes(quarter)) {
    return NextResponse.json({ error: "Invalid quarter." }, { status: 400 });
  }
  if (year < 2000 || year > new Date().getFullYear()) {
    return NextResponse.json({ error: "Invalid year." }, { status: 400 });
  }
  if (kpiName.length > 100) {
    return NextResponse.json({ error: "KPI name too long (max 100 chars)." }, { status: 400 });
  }

  try {
    const pageId = await saveCustomKPI({ clientId, kpiName, value, unit, quarter, year, notes });
    return NextResponse.json({ success: true, pageId });
  } catch (err) {
    console.error("[/api/custom-kpi] Notion write error:", err.message);
    return NextResponse.json(
      { error: "Failed to save custom KPI to Notion." },
      { status: 500 }
    );
  }
}
