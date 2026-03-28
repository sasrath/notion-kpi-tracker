import { NextResponse } from "next/server";
import { getClients } from "@/lib/notion";
import { clientCache, CACHE_TTL } from "@/lib/cache";
import { DEMO_CLIENTS } from "@/lib/demo-data";

export async function GET() {
  // ✅ Server-side demo mode check — no NEXT_PUBLIC_ prefix needed here
  const isDemoMode =
    process.env.DEMO_MODE === "true" ||
    process.env.NEXT_PUBLIC_DEMO_MODE === "true";
  if (isDemoMode) {
    return NextResponse.json({ clients: DEMO_CLIENTS, demo: true });
  }

  const cacheKey = "all-clients";
  const cached = clientCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json({ clients: cached.data, cached: true });
  }

  try {
    const clients = await getClients();
    clientCache.set(cacheKey, { data: clients, timestamp: Date.now() });
    return NextResponse.json({ clients });
  } catch (err) {
    console.error("[/api/clients] Error:", err.message);
    return NextResponse.json(
      { error: "Failed to fetch clients from Notion." },
      { status: 500 }
    );
  }
}
