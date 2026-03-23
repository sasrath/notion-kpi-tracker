import { NextResponse } from "next/server";
import { deleteKPIs } from "@/lib/notion";

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { ids } = body;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "Provide an array of KPI page IDs to delete." }, { status: 400 });
  }

  if (ids.length > 100) {
    return NextResponse.json({ error: "Cannot delete more than 100 records at once." }, { status: 400 });
  }

  try {
    const result = await deleteKPIs(ids);
    console.log(`[delete] Deleted ${result.deleted}, errors ${result.errors}`);
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    console.error("[delete] Error:", err.message);
    return NextResponse.json({ error: "Failed to delete KPIs." }, { status: 500 });
  }
}
