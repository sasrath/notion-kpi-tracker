import { NextResponse } from "next/server";
import { getKPIs } from "@/lib/notion";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("clientId") ?? undefined;
  const quarter  = searchParams.get("quarter")  ?? undefined;
  const year     = searchParams.get("year") ? Number(searchParams.get("year")) : undefined;

  try {
    const kpis = await getKPIs({ clientId, quarter, year });
    return NextResponse.json({ kpis });
  } catch (err) {
    console.error("[/api/kpis] Error:", err.message);
    return NextResponse.json(
      { error: "Failed to fetch KPIs from Notion." },
      { status: 500 }
    );
  }
}
