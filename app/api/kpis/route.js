import { NextResponse } from "next/server";
import { getKPIs } from "@/lib/notion";
import { kpiCache, CACHE_TTL } from "@/lib/cache";
import { DEMO_KPIS } from "@/lib/demo-data";

export async function GET(request) {
  // ✅ Server-side demo mode check — no NEXT_PUBLIC_ prefix needed here
  const isDemoMode =
    process.env.DEMO_MODE === "true" ||
    process.env.NEXT_PUBLIC_DEMO_MODE === "true";
  if (isDemoMode) {
    return NextResponse.json({ kpis: DEMO_KPIS, demo: true });
  }

  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("clientId") ?? undefined;
  const quarter  = searchParams.get("quarter")  ?? undefined;
  const year     = searchParams.get("year") ? Number(searchParams.get("year")) : undefined;

  const cacheKey = `kpis:${clientId ?? "all"}:${quarter ?? "all"}:${year ?? "all"}`;
  const cached = kpiCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json({ kpis: cached.data, cached: true });
  }

  try {
    const kpis = await getKPIs({ clientId, quarter, year });
    kpiCache.set(cacheKey, { data: kpis, timestamp: Date.now() });
    return NextResponse.json({ kpis });
  } catch (err) {
    console.error("[/api/kpis] Error:", err.message);
    return NextResponse.json(
      { error: "Failed to fetch KPIs from Notion." },
      { status: 500 }
    );
  }
}
