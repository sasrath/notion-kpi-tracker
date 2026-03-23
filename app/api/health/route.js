import { NextResponse } from "next/server";
import { callNotionTool } from "@/lib/notion-mcp.js";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function GET() {
  const aiProvider = process.env.AI_PROVIDER
    || (process.env.GOOGLE_API_KEY ? "google" : "anthropic");

  const results = {
    ai: { ok: false, message: "", provider: aiProvider },
    notion:    { ok: false, message: "" },
    databases: {
      clients: { ok: false, message: "" },
      reports: { ok: false, message: "" },
      kpis:    { ok: false, message: "" },
    },
  };

  // ── Check AI Provider ────────────────────────────────────────────
  try {
    if (aiProvider === "google") {
      if (!process.env.GOOGLE_API_KEY) throw new Error("GOOGLE_API_KEY is not set");
      const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      await model.generateContent("ping");
      results.ai = { ok: true, message: "Google Gemini connected", provider: "google" };
    } else {
      if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not set");
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      await anthropic.messages.create({
        model: "claude-haiku-4-5",
        max_tokens: 10,
        messages: [{ role: "user", content: "ping" }],
      });
      results.ai = { ok: true, message: "Anthropic Claude connected", provider: "anthropic" };
    }
  } catch (err) {
    results.ai = { ok: false, message: err.message, provider: aiProvider };
  }

  // ── Check Notion MCP connection ──────────────────────────────────
  try {
    if (!process.env.NOTION_API_KEY) throw new Error("NOTION_API_KEY is not set");
    const me = await callNotionTool("API-get-self");
    results.notion = { ok: true, message: `MCP connected — bot: ${me.bot?.owner?.user?.name ?? me.name ?? "OK"}` };

    // ── Check each database via MCP ────────────────────────────────
    const dbChecks = [
      { key: "clients", envVar: "NOTION_CLIENTS_DB_ID" },
      { key: "reports", envVar: "NOTION_REPORTS_DB_ID" },
      { key: "kpis",    envVar: "NOTION_KPIS_DB_ID" },
    ];

    for (const { key, envVar } of dbChecks) {
      try {
        const dbId = process.env[envVar];
        if (!dbId || dbId.includes("your_")) {
          throw new Error(`${envVar} is not set in .env.local`);
        }
        const db = await callNotionTool("API-retrieve-a-database", { database_id: dbId });
        results.databases[key] = {
          ok: true,
          message: `Connected — "${db.title?.[0]?.plain_text ?? "Untitled"}"`,
        };
      } catch (err) {
        results.databases[key] = { ok: false, message: err.message };
      }
    }
  } catch (err) {
    results.notion = { ok: false, message: err.message };
  }

  const allOk =
    results.ai.ok &&
    results.notion.ok &&
    Object.values(results.databases).every((d) => d.ok);

  return NextResponse.json(
    { ok: allOk, results },
    { status: allOk ? 200 : 500 }
  );
}
