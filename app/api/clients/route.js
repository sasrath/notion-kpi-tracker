import { NextResponse } from "next/server";
import { getClients } from "@/lib/notion";

export async function GET() {
  try {
    const clients = await getClients();
    return NextResponse.json({ clients });
  } catch (err) {
    console.error("[/api/clients] Error:", err.message);
    return NextResponse.json(
      { error: "Failed to fetch clients from Notion." },
      { status: 500 }
    );
  }
}
