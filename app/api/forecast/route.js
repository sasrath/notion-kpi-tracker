import { NextResponse } from "next/server";
import { forecastRevenue } from "@/lib/llm";
import { getKPIs, getClients } from "@/lib/notion";
import { deduplicateKPIs, getRevenueForecastInput } from "@/lib/transforms";

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { model, clientId } = body;

  try {
    const [rawKpis, clients] = await Promise.all([getKPIs(), getClients()]);
    const kpis = deduplicateKPIs(rawKpis);
    const filtered = clientId ? kpis.filter((k) => k.clientId === clientId) : kpis;
    const revenueByClient = getRevenueForecastInput(filtered, clients);

    if (Object.keys(revenueByClient).length === 0) {
      return NextResponse.json({ forecasts: [], error: "No revenue data found." });
    }

    const result = await forecastRevenue({ revenueByClient, model });

    if (!result.forecasts || !Array.isArray(result.forecasts)) {
      return NextResponse.json({ forecasts: [], error: "AI returned invalid format." });
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("[/api/forecast] Error:", err.message);
    return NextResponse.json({ forecasts: [], error: "Forecast failed." }, { status: 500 });
  }
}
