import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";

// ─── AVAILABLE MODELS ────────────────────────────────────────────

export const MODELS = [
  // Google Gemini models
  { id: "gemini-2.5-flash",       label: "Gemini 2.5 Flash",       provider: "google" },
  { id: "gemini-2.5-flash-lite",  label: "Gemini 2.5 Flash Lite",  provider: "google" },
  { id: "gemini-2.5-pro",         label: "Gemini 2.5 Pro",         provider: "google" },
  // Anthropic Claude models
  { id: "claude-haiku-4-5",    label: "Claude Haiku 4.5",    provider: "anthropic" },
  { id: "claude-sonnet-4-5",   label: "Claude Sonnet 4.5",   provider: "anthropic" },
  { id: "claude-sonnet-4-6",   label: "Claude Sonnet 4.6",   provider: "anthropic" },
];

export const DEFAULT_MODEL = "gemini-2.5-flash";

function getModelInfo(modelId) {
  return MODELS.find((m) => m.id === modelId) ?? MODELS.find((m) => m.id === DEFAULT_MODEL);
}

// ─── LAZY CLIENT INIT ────────────────────────────────────────────

function getGoogleClient() {
  if (!process.env.GOOGLE_API_KEY) throw new Error("GOOGLE_API_KEY is not set in .env.local");
  return new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
}

function getAnthropicClient() {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not set in .env.local");
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

// ─── GUARDRAILS ──────────────────────────────────────────────────

const INJECTION_PATTERNS = [
  /ignore (previous|above|all) instructions/i,
  /you are now/i,
  /pretend (you are|to be)/i,
  /act as(?! a financial)/i,
  /forget (your|all) (rules|instructions)/i,
  /system prompt/i,
  /jailbreak/i,
  /override/i,
  /do anything now/i,
];

export function containsInjection(text) {
  return INJECTION_PATTERNS.some((p) => p.test(text));
}

function validateURL(url) {
  try {
    const u = new URL(url);
    if (!["http:", "https:"].includes(u.protocol)) return false;
    if (u.hostname === "localhost") return false;
    if (/^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/.test(u.hostname)) return false;
    return true;
  } catch {
    return false;
  }
}

function validateKPIResponse(data) {
  if (typeof data !== "object" || data === null) return false;
  if (typeof data.success !== "boolean") return false;
  if (!Array.isArray(data.kpis)) return false;
  for (const kpi of data.kpis) {
    if (!kpi.name || typeof kpi.name !== "string") return false;
    if (kpi.value !== null && typeof kpi.value !== "number") return false;
    if (!["High", "Medium", "Low"].includes(kpi.confidence)) return false;
    // Block suspiciously extreme values (allow >100% for Tax Rate which can be anomalously high)
    if (kpi.unit === "%" && Math.abs(kpi.value) > 100000) return false;
    if (kpi.unit === "$M" && kpi.value > 10_000_000_000) return false;
  }
  return true;
}

// ─── REPORT INGESTION ────────────────────────────────────────────

const INGESTION_SYSTEM_PROMPT = `You are a precise financial data extraction assistant.

Your job is to read quarterly or annual financial reports and extract structured KPI data.

RULES YOU MUST FOLLOW:
1. NEVER fabricate, estimate, or infer values not explicitly stated in the report.
2. If a KPI value is not found, return null for that value — do not guess.
3. Always cite the source location of each value (paragraph, section, table name).
4. Assign confidence: High (exact number found), Medium (derived/calculated), Low (inferred or ambiguous).
5. If the content is not a financial report, return success: false with an error.
6. Do not include opinions, commentary, or recommendations.
7. Return ONLY valid JSON. No markdown, no preamble, no explanation outside the JSON.

NUMBER FORMATTING RULES — READ CAREFULLY:
- Parentheses mean NEGATIVE: $(0.6) = -0.6, $(0.12) = -0.12, (4.2%) = -4.2
- Dollar amounts in $B (billions): convert to $M by multiplying by 1000. e.g. $13.7B → 13700
- Dollar amounts already in $M: use as-is
- Percentage values: use the number only, no % symbol. e.g. 36.1% → 36.1
- "n/m" or "nm" (not meaningful): skip that KPI entry entirely — do NOT include it
- Percentage-point changes (ppts): ignore these — they are change metrics, not absolute values

GAAP vs NON-GAAP:
- If the report contains BOTH GAAP and Non-GAAP columns, extract BOTH.
- For GAAP KPIs: use the name as-is (e.g. "Gross Margin", "EPS").
- For Non-GAAP KPIs: append " (Non-GAAP)" to the name (e.g. "Gross Margin (Non-GAAP)", "EPS (Non-GAAP)").
- Never mix GAAP and Non-GAAP values into the same KPI entry.

KPIs TO EXTRACT (extract any you find — not limited to this list):
- Revenue ($M)
- Gross Margin (%)
- Net Margin (%)
- Operating Income ($M)
- Operating Margin (%)
- EPS — Earnings Per Share ($)
- EBITDA ($M)
- R&D Expenses ($M)
- Operating Expenses ($M)
- Tax Rate (%)
- Customer Count (#)
- Churn Rate (%)

OUTPUT FORMAT:
{
  "success": true,
  "kpis": [
    {
      "name": "Revenue",
      "value": 13700,
      "unit": "$M",
      "confidence": "High",
      "source": "Q4 2025 Earnings Summary table",
      "source_type": "AI Parsed",
      "notes": null
    },
    {
      "name": "Gross Margin (Non-GAAP)",
      "value": 37.9,
      "unit": "%",
      "confidence": "High",
      "source": "Q4 2025 Earnings Summary table, Non-GAAP column",
      "source_type": "AI Parsed",
      "notes": "Non-GAAP measure"
    }
  ],
  "warnings": ["EPS not found in report"],
  "error": null
}

If extraction fails:
{
  "success": false,
  "kpis": [],
  "warnings": [],
  "error": "Reason why extraction failed"
}`;

export async function ingestReport({ url, clientName, quarter, year, ticker, model: modelId }) {
  // Guardrails
  if (!validateURL(url)) {
    return { success: false, error: "Invalid or unsafe URL provided.", kpis: [], warnings: [] };
  }
  if (containsInjection(clientName)) {
    return { success: false, error: "Invalid client name.", kpis: [], warnings: [] };
  }

  const info = getModelInfo(modelId);
  let attempt = 0;
  const maxAttempts = 2;

  const userPrompt = `Fetch and analyze this quarterly report URL: ${url}

Extract all financial KPIs for:
- Client: ${clientName}${ticker ? `\n- Ticker: ${ticker}` : ""}
- Quarter: ${quarter}
- Year: ${year}

Return the structured JSON as specified.`;

  while (attempt < maxAttempts) {
    try {
      let parsed;

      if (info.provider === "google") {
        parsed = await _ingestWithGoogle({ userPrompt, modelId: info.id });
      } else {
        parsed = await _ingestWithAnthropic({ userPrompt, modelId: info.id });
      }

      if (!validateKPIResponse(parsed)) {
        throw new Error("Response failed validation checks");
      }

      return parsed;
    } catch (err) {
      attempt++;
      if (attempt >= maxAttempts) {
        return {
          success: false,
          error: `Extraction failed after ${maxAttempts} attempts: ${err.message}`,
          kpis: [],
          warnings: [],
        };
      }
      // Wait before retry
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}

// ─── DOCUMENT TEXT INGESTION (PDF / 10-K / 10-Q) ─────────────────

export async function ingestDocument({ text, clientName, quarter, year, ticker, docType, model: modelId }) {
  if (containsInjection(clientName)) {
    return { success: false, error: "Invalid client name.", kpis: [], warnings: [] };
  }
  if (!text || text.length < 100) {
    return { success: false, error: "Document text is too short or empty.", kpis: [], warnings: [] };
  }
  // Cap text to ~80k chars to avoid token limits
  const truncatedText = text.slice(0, 80000);

  const info = getModelInfo(modelId);
  let attempt = 0;
  const maxAttempts = 2;

  const userPrompt = `Analyze the following ${docType || "financial document"} text and extract all financial KPIs.

Client: ${clientName}${ticker ? `\nTicker: ${ticker}` : ""}
Period: ${quarter === "Annual" ? `Full Year ${year}` : `${quarter} ${year}`}
Document Type: ${docType || "Financial Document"}

IMPORTANT EXTRACTION NOTES:
- If the document contains a table with BOTH a GAAP column and a Non-GAAP column, extract values from BOTH columns as separate KPI entries. Append " (Non-GAAP)" to the name for Non-GAAP entries.
- Convert parenthetical values to negative numbers: $(0.6) → -0.6
- Convert $B values to $M by multiplying by 1000: $13.7B → 13700
- Skip any "n/m" or "nm" values entirely.
- Extract Operating Margin, R&D Expenses, Tax Rate, and any other KPIs you find beyond the standard list.

--- DOCUMENT TEXT ---
${truncatedText}
--- END DOCUMENT ---

Return the structured JSON as specified.`;

  while (attempt < maxAttempts) {
    try {
      let parsed;
      if (info.provider === "google") {
        parsed = await _ingestDocWithGoogle({ userPrompt, modelId: info.id });
      } else {
        parsed = await _ingestDocWithAnthropic({ userPrompt, modelId: info.id });
      }
      if (!validateKPIResponse(parsed)) {
        throw new Error("Response failed validation checks");
      }
      return parsed;
    } catch (err) {
      attempt++;
      if (attempt >= maxAttempts) {
        return {
          success: false,
          error: `Extraction failed after ${maxAttempts} attempts: ${err.message}`,
          kpis: [],
          warnings: [],
        };
      }
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}

async function _ingestDocWithGoogle({ userPrompt, modelId }) {
  const client = getGoogleClient();
  const model = client.getGenerativeModel({
    model: modelId,
    systemInstruction: INGESTION_SYSTEM_PROMPT,
  });
  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    generationConfig: { maxOutputTokens: 8000 },
  });
  const text = result.response.text();
  return JSON.parse(text.replace(/```json|```/g, "").trim());
}

async function _ingestDocWithAnthropic({ userPrompt, modelId }) {
  const client = getAnthropicClient();
  const response = await client.messages.create({
    model: modelId,
    max_tokens: 8000,
    system: INGESTION_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });
  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock) throw new Error("No text response from AI");
  return JSON.parse(textBlock.text.replace(/```json|```/g, "").trim());
}

// ─── GOOGLE GEMINI INGESTION ─────────────────────────────────────

async function _ingestWithGoogle({ userPrompt, modelId }) {
  const client = getGoogleClient();
  const model = client.getGenerativeModel({
    model: modelId,
    systemInstruction: INGESTION_SYSTEM_PROMPT,
  });

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    tools: [{ googleSearch: {} }],
    generationConfig: { maxOutputTokens: 8000 },
  });

  const text = result.response.text();
  const cleaned = text.replace(/```json|```/g, "").trim();
  return JSON.parse(cleaned);
}

// ─── ANTHROPIC INGESTION ─────────────────────────────────────────

async function _ingestWithAnthropic({ userPrompt, modelId }) {
  const client = getAnthropicClient();
  const response = await client.messages.create({
    model: modelId,
    max_tokens: 8000,
    system: INGESTION_SYSTEM_PROMPT,
    tools: [{ type: "web_search_20250305", name: "web_search" }],
    messages: [{ role: "user", content: userPrompt }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock) throw new Error("No text response from AI");

  const cleaned = textBlock.text.replace(/```json|```/g, "").trim();
  return JSON.parse(cleaned);
}

// ─── NATURAL LANGUAGE QUERY ──────────────────────────────────────

const QUERY_SYSTEM_PROMPT = `You are a financial performance analyst assistant.

You will be given structured KPI data from a user's client portfolio.
Answer the user's question based ONLY on the data provided.

RULES:
1. NEVER make up data. If the answer is not in the data, say so clearly.
2. Match your response length to the complexity of the question:
   - Simple (one client, one metric): 1-3 sentences.
   - Comparative (multiple clients or quarters): use a short list or table.
   - Do NOT pad answers with filler. Do NOT cut off mid-sentence.
3. Always include quarter, year, and client name when referencing numbers.
4. If the question is ambiguous, ask for clarification.
5. Do not provide investment advice or financial recommendations.
6. Do not speculate about future performance.
7. If data is insufficient: say exactly what is missing.`;

// ─── SAFE JSON PARSING (handles truncated AI responses) ──────────

function safeParseJSON(text) {
  // Try direct parse first
  try { return JSON.parse(text); } catch {}

  // Strip markdown fences if present
  const stripped = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  try { return JSON.parse(stripped); } catch {}

  // Try to extract the outermost JSON object (or start of one)
  const objMatch = stripped.match(/\{[\s\S]*/);
  if (objMatch) {
    try { return JSON.parse(objMatch[0]); } catch {}

    // Attempt to repair truncated JSON
    let c = objMatch[0];

    // 1. Remove unterminated string literal: count unescaped quotes
    const quoteCount = (c.match(/(?<!\\)"/g) || []).length;
    if (quoteCount % 2 !== 0) {
      // Odd quotes = last string is unterminated, strip from last `"` to end
      c = c.replace(/"[^"]*$/, "");
    }

    // 2. Remove dangling key with colon but no value: , "reasoning":
    c = c.replace(/,\s*"[^"]*"\s*:\s*$/, "");

    // 3. Remove trailing incomplete object inside array: , { ... (no closing })
    c = c.replace(/,\s*\{[^}]*$/, "");

    // 4. Remove dangling comma + partial value
    c = c.replace(/,\s*"[^"]*"\s*:\s*[^,}\]]*$/, "");

    // 5. Clean trailing commas
    c = c.replace(/,\s*$/, "");

    // 6. Build correct closing sequence using a nesting stack
    const stack = [];
    let inString = false;
    for (let i = 0; i < c.length; i++) {
      const ch = c[i];
      if (inString) {
        if (ch === "\\" && i + 1 < c.length) { i++; continue; }
        if (ch === '"') inString = false;
      } else {
        if (ch === '"') inString = true;
        else if (ch === "{") stack.push("}");
        else if (ch === "[") stack.push("]");
        else if (ch === "}" || ch === "]") stack.pop();
      }
    }
    c += stack.reverse().join("");

    try { return JSON.parse(c); } catch {}
  }

  throw new SyntaxError(`Unable to parse AI response as JSON: ${text.slice(0, 200)}`);
}

// ─── REVENUE FORECAST ────────────────────────────────────────────

const FORECAST_SYSTEM_PROMPT = `You are a quantitative financial forecasting assistant.

You will be given historical quarterly revenue data for one or more clients.
Forecast EXACTLY ONE next quarter's revenue for each client using trend analysis.

RULES:
1. Forecast only the single next quarter. Do NOT forecast multiple quarters.
2. Base forecasts on observable trends (growth rate, seasonality, momentum).
3. If only 1 data point exists, apply a conservative 0-3% growth estimate.
4. If 2+ data points exist, use the trend (growth/decline rate) to project.
5. Return ONLY valid JSON. No markdown, no preamble, no explanation outside JSON.
6. Include a brief reasoning string for each forecast.
7. Return exactly ONE forecast entry per client.

OUTPUT FORMAT:
{
  "forecasts": [
    {
      "client": "Apple",
      "nextQuarter": "Q4",
      "nextYear": 2025,
      "forecastValue": 98000,
      "unit": "$M",
      "reasoning": "Based on Q1→Q3 trend showing X% decline, projecting continued momentum."
    }
  ]
}`;

export async function forecastRevenue({ revenueByClient, model: modelId }) {
  const info = getModelInfo(modelId);

  const userMessage = `Here is historical quarterly revenue data by client:

${JSON.stringify(revenueByClient, null, 2)}

Forecast the next quarter's revenue for each client. Return ONLY the JSON object.`;

  const maxRetries = 2;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      if (info.provider === "google") {
        return await _forecastWithGoogle(userMessage, info.id);
      } else {
        return await _forecastWithAnthropic(userMessage, info.id);
      }
    } catch (err) {
      if (attempt === maxRetries - 1) {
        return { forecasts: [], error: err.message };
      }
    }
  }
  return { forecasts: [], error: "Forecast failed after retries." };
}

async function _forecastWithGoogle(userMessage, modelId) {
  const client = getGoogleClient();
  const model = client.getGenerativeModel({
    model: modelId,
    systemInstruction: FORECAST_SYSTEM_PROMPT,
  });
  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: userMessage }] }],
    generationConfig: { maxOutputTokens: 4096, responseMimeType: "application/json" },
  });
  const text = result.response.text() || "{}";
  return safeParseJSON(text);
}

async function _forecastWithAnthropic(userMessage, modelId) {
  const client = getAnthropicClient();
  const response = await client.messages.create({
    model: modelId,
    max_tokens: 1000,
    system: FORECAST_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });
  const textBlock = response.content.find((b) => b.type === "text");
  const text = textBlock?.text ?? "{}";
  return safeParseJSON(text);
}

export async function queryKPIs({ question, kpis, clients, model: modelId }) {
  if (containsInjection(question)) {
    return { answer: "Invalid query. Please ask a financial performance question." };
  }
  if (question.length > 500) {
    return { answer: "Query is too long. Please keep it under 500 characters." };
  }

  const info = getModelInfo(modelId);

  // Build a compact data summary to pass as context
  const clientMap = Object.fromEntries(clients.map((c) => [c.id, c.name]));
  const dataContext = kpis
    .slice(0, 150) // cap at 150 KPIs to control token usage
    .map((k) => ({
      client: clientMap[k.clientId] ?? "Unknown",
      kpi: k.name,
      value: k.value,
      unit: k.unit,
      quarter: k.quarter,
      year: k.year,
      source: k.source,
    }));

  const userMessage = `Here is the KPI data from my client portfolio:

${JSON.stringify(dataContext, null, 2)}

Question: ${question}`;

  try {
    if (info.provider === "google") {
      return await _queryWithGoogle(userMessage, info.id);
    } else {
      return await _queryWithAnthropic(userMessage, info.id);
    }
  } catch (err) {
    return { answer: `Query failed: ${err.message}` };
  }
}

// ─── GOOGLE GEMINI QUERY ─────────────────────────────────────────

async function _queryWithGoogle(userMessage, modelId) {
  const client = getGoogleClient();
  const model = client.getGenerativeModel({
    model: modelId,
    systemInstruction: QUERY_SYSTEM_PROMPT,
  });

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: userMessage }] }],
    generationConfig: { maxOutputTokens: 2048 },

// ─── ANTHROPIC QUERY ─────────────────────────────────────────────

async function _queryWithAnthropic(userMessage, modelId) {
  const client = getAnthropicClient();
  const response = await client.messages.create({
    model: modelId,
    max_tokens: 2048,
    system: QUERY_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  return { answer: textBlock?.text ?? "No response generated." };
}
