import { NextResponse } from "next/server";
import { queryKPIs, containsInjection } from "@/lib/llm";
import { getKPIs, getClients } from "@/lib/notion";

const queryCounts = new Map();
const MAX_QUERIES = 20;

export async function POST(request) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const count = queryCounts.get(ip) ?? 0;
  if (count >= MAX_QUERIES) {
    return NextResponse.json(
      { error: "Query limit reached (20 per session). Please refresh." },
      { status: 429 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { question, model, kpis: inlineKpis, clients: inlineClients } = body;

  if (!question || typeof question !== "string") {
    return NextResponse.json({ error: "Question is required." }, { status: 400 });
  }
  if (question.length > 500) {
    return NextResponse.json({ error: "Question must be under 500 characters." }, { status: 400 });
  }
  if (containsInjection(question)) {
    return NextResponse.json(
      { answer: "Invalid query. Please ask a financial performance question." },
      { status: 200 }
    );
  }

  try {
    const [kpis, clients] = (inlineKpis && inlineClients)
      ? [inlineKpis, inlineClients]
      : await Promise.all([getKPIs(), getClients()]);
    const result = await queryKPIs({ question, kpis, clients, model });
    queryCounts.set(ip, count + 1);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[/api/query] Error:", err.message);
    return NextResponse.json(
      { answer: "Query failed. Please try again." },
      { status: 500 }
    );
  }
}
