import { NextResponse } from "next/server";
import { MODELS, DEFAULT_MODEL } from "@/lib/llm";

export async function GET() {
  const models = MODELS.map((m) => {
    let available = false;
    if (m.provider === "google") available = !!process.env.GOOGLE_API_KEY;
    if (m.provider === "anthropic") available = !!process.env.ANTHROPIC_API_KEY;
    return { ...m, available };
  });

  return NextResponse.json({ models, defaultModel: DEFAULT_MODEL });
}
