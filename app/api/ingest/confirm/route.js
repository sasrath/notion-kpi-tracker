import { NextResponse } from "next/server";
import { findOrCreateClient, createReport, saveKPIs } from "@/lib/notion";
import { invalidateKPICache, invalidateClientCache } from "@/lib/cache";

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { kpis, clientName, quarter, year, url } = body;

  if (!kpis || !clientName || !quarter || !year || !url) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  try {
    // 1. Find or create client
    console.log(`[confirm] Finding/creating client: "${clientName}"`);
    const clientId = await findOrCreateClient(clientName);
    console.log(`[confirm] ✓ Client ID: ${clientId}`);

    // 2. Create the report record
    console.log(`[confirm] Creating report: ${quarter} ${year}`);
    const reportId = await createReport({
      clientId,
      quarter,
      year,
      reportUrl: url,
    });
    console.log(`[confirm] ✓ Report ID: ${reportId}`);

    // 3. Save all confirmed KPIs
    console.log(`[confirm] Saving ${kpis.length} KPIs...`);
    const kpiIds = await saveKPIs({ reportId, clientId, kpis, quarter, year });
    console.log(`[confirm] ✓ Saved ${kpiIds.length} KPIs`);

    // Invalidate caches so the dashboard shows fresh data
    invalidateKPICache();
    invalidateClientCache();

    return NextResponse.json({
      success: true,
      clientId,
      reportId,
      kpiCount: kpiIds.length,
    });
  } catch (err) {
    console.error("[confirm] ✗ Notion write error:", err.message, err.stack);
    return NextResponse.json(
      { error: `Failed to save data to Notion: ${err.message}` },
      { status: 500 }
    );
  }
}
