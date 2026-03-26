import { NextResponse } from "next/server";
import { getClients } from "@/lib/notion";
import { clientCache, CACHE_TTL } from "@/lib/cache";

export async function GET() {
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
