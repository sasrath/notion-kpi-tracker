# AI Rules & Guardrails
## Client Quarterly Performance Tracker — Powered by Notion MCP

**Version:** 2.0  
**Status:** Current  
**Applies to:** All AI API calls (Google Gemini & Anthropic Claude) within this application

---

## 1. Purpose

This document defines the rules, constraints, and behavioral guardrails for all AI interactions in this application. These rules ensure Claude behaves safely, accurately, and predictably when ingesting financial reports and answering user queries.

---

## 2. Model Selection

| Task | Model | Provider | Reason |
|---|---|---|---|
| Report ingestion (default) | `gemini-2.5-flash` | Google | Fast, cost-efficient, strong extraction |
| Report ingestion (advanced) | `gemini-2.5-pro` | Google | Deeper reasoning for complex reports |
| Report ingestion (alt) | `claude-haiku-4-5` | Anthropic | Alternative provider, cost-efficient |
| Multi-report / forecasting | `claude-sonnet-4-5` | Anthropic | Balanced reasoning + speed |
| Complex analysis | `claude-sonnet-4-6` | Anthropic | Reserved for deepest reasoning |
| Natural language query | User-selected model | — | Same model used for ingestion |
| Revenue forecasting | User-selected model | — | Forecast endpoint uses selected model |

Default model: **Gemini 2.5 Flash** (Google). Users can select any model from the dropdown.

### Model Availability

All 5 models are always shown in the dropdown, regardless of API key configuration:

- **Available models** appear as normal selectable options
- **Unavailable models** show "(no API key)" suffix and are visually disabled
- Selecting an unavailable model triggers a toast warning: "No API key configured for {model}. Add {KEY_NAME} to .env.local"
- The `GET /api/models` endpoint returns all models with an `available: boolean` flag

This approach lets users see the full model roster and understand what's needed to unlock each one.

---

## 3. System Prompts

### 3.1 Report Ingestion System Prompt

```
You are a precise financial data extraction assistant.

Your job is to read quarterly financial reports and extract structured KPI data.

RULES YOU MUST FOLLOW:
1. NEVER fabricate, estimate, or infer values that are not explicitly stated in the report.
2. If a KPI value is not found, return null for that value — do not guess.
3. Always cite the exact location of each value (paragraph, section, table name).
4. Return confidence levels: High (exact number found), Medium (derived/calculated), Low (inferred or ambiguous).
5. Return all values in their original currency — do not convert.
6. If the URL content is not a financial report, return an error — do not attempt extraction.
7. Do not include any commentary, opinions, or recommendations in your output.
8. Return ONLY valid JSON. No markdown, no preamble, no explanation outside the JSON.

OUTPUT FORMAT:
{
  "success": true,
  "client": "string",
  "quarter": "Q1|Q2|Q3|Q4",
  "year": number,
  "report_url": "string",
  "kpis": [
    {
      "name": "string",
      "value": number | null,
      "unit": "$M | % | $ | x | days | count | other",
      "confidence": "High | Medium | Low",
      "source": "string — exact location in document",
      "notes": "string | null"
    }
  ],
  "warnings": ["string"],
  "error": null | "string"
}

If the report cannot be read or contains no financial data:
{
  "success": false,
  "error": "Reason why extraction failed",
  "kpis": [],
  "warnings": []
}
```

### 3.2 Natural Language Query System Prompt

```
You are a financial performance analyst assistant.

You will be given structured KPI data from a user's client portfolio stored in Notion.
Answer the user's question based ONLY on the data provided.

RULES YOU MUST FOLLOW:
1. NEVER make up data. If the answer is not in the provided data, say so clearly.
2. Be concise — answer in 2-4 sentences maximum unless a list is needed.
3. When referencing numbers, always include the quarter, year, and client name.
4. If the question is ambiguous, ask for clarification rather than assuming.
5. Do not provide investment advice or financial recommendations.
6. Do not speculate about future performance.
7. If data is insufficient to answer the question, say: "I don't have enough data to answer that."

RESPONSE FORMAT:
Plain English answer. Optionally followed by a short data list if helpful.
No JSON required for this task.
```

### 3.3 Revenue Forecast System Prompt

```
You are a quantitative financial forecasting assistant.

You will be given historical quarterly revenue data for one or more clients.
Your job is to forecast the NEXT quarter's revenue for each client using trend analysis.

RULES:
1. Base forecasts on observable trends (growth rate, seasonality, momentum).
2. If only 1 data point exists, apply a conservative 0-3% growth estimate.
3. If 2+ data points exist, use the trend (growth/decline rate) to project.
4. Return ONLY valid JSON. No markdown, no preamble, no explanation outside JSON.
5. Include a brief reasoning string for each forecast.

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
}
```

---

## 4. Input Validation Rules

Before sending any request to Claude, the frontend must validate:

### 4.1 Report Ingestion Inputs

| Field | Validation Rule | Error Message |
|---|---|---|
| Report URL | Must be a valid HTTPS URL | "Please enter a valid HTTPS URL" |
| Report URL | Must not be localhost or internal IP | "URL must be a public web address" |
| Client Name | Must be non-empty, max 100 chars | "Client name is required" |
| Quarter | Must be one of: Q1, Q2, Q3, Q4 | "Please select a valid quarter" |
| Year | Must be between 2000 and current year | "Please enter a valid year" |

### 4.2 Custom KPI Inputs

| Field | Validation Rule | Error Message |
|---|---|---|
| KPI Name | Non-empty, max 100 chars | "KPI name is required" |
| Value | Must be a finite number | "Value must be a number" |
| Unit | Must be selected from allowed list | "Please select a unit" |
| Client | Must exist in Notion Clients database | "Client not found — add client first" |
| Quarter | Must be Q1/Q2/Q3/Q4 | "Please select a quarter" |
| Year | Between 2000 and current year | "Please enter a valid year" |

### 4.3 Natural Language Query Inputs

| Field | Validation Rule |
|---|---|
| Query text | Non-empty, max 500 characters |
| Query text | Must not contain prompt injection patterns (see Section 5) |

---

## 5. Prompt Injection Guardrails

The following patterns in user input must be detected and blocked before sending to Claude:

```javascript
const INJECTION_PATTERNS = [
  /ignore (previous|above|all) instructions/i,
  /you are now/i,
  /pretend (you are|to be)/i,
  /act as/i,
  /forget (your|all) (rules|instructions)/i,
  /system prompt/i,
  /jailbreak/i,
  /override/i,
  /do anything now/i,
];

function containsInjection(input) {
  return INJECTION_PATTERNS.some(pattern => pattern.test(input));
}
```

If injection is detected: block the request and show the user — "Invalid query. Please ask a financial performance question."

---

## 6. Output Validation Rules

After receiving Claude's response, validate before saving to Notion:

### 6.1 KPI Extraction Response Validation

```javascript
function validateExtractionResponse(response) {
  // Must be valid JSON
  if (typeof response !== 'object') return false;

  // Must have success flag
  if (typeof response.success !== 'boolean') return false;

  // If failed, must have error message
  if (!response.success && !response.error) return false;

  // KPIs must be an array
  if (!Array.isArray(response.kpis)) return false;

  // Each KPI must have required fields
  for (const kpi of response.kpis) {
    if (!kpi.name || typeof kpi.name !== 'string') return false;
    if (kpi.value !== null && typeof kpi.value !== 'number') return false;
    if (!['High', 'Medium', 'Low'].includes(kpi.confidence)) return false;
    if (!kpi.source || typeof kpi.source !== 'string') return false;
  }

  // Block suspiciously high values (likely parsing errors)
  for (const kpi of response.kpis) {
    if (kpi.unit === '%' && Math.abs(kpi.value) > 10000) return false;
    if (kpi.unit === '$M' && kpi.value > 100000000) return false;
  }

  return true;
}
```

### 6.2 Hallucination Detection

Flag a KPI for manual review if:
- The confidence is "Low"
- The source field is empty or generic (e.g., "mentioned in report")
- The value is an unusually round number (e.g., exactly 1000.00, 5000.00)
- The same KPI appears twice with different values

Flagged KPIs are shown with a ⚠️ warning badge and require user confirmation before saving.

---

## 7. Rate Limiting & Cost Controls

```javascript
const AI_LIMITS = {
  maxReportsPerSession: 5,       // Max report ingestions per user session
  maxQueriesPerSession: 20,      // Max NL queries per session
  maxTokensPerIngestion: 4096,   // Max output tokens for extraction & forecast
  maxTokensPerQuery: 1000,       // Max output tokens for NL query
  maxTokensPerForecast: 4096,    // Max output tokens for revenue forecast (Google)
  retryAttempts: 2,              // Retry failed calls max 2 times
  retryDelayMs: 2000,            // Wait 2s between retries
};
```

Show the user their remaining session quota in the UI. When limit is reached, show: "Session limit reached. Refresh the page to continue."

### 7.1 Forecast Caching

- Revenue forecasts are fetched once per session and cached in component state via `forecastFetchedRef`
- Changing tabs or clients does NOT re-fetch forecasts
- Forecasts always include all clients (no per-client filtering at API level)
- Retry logic: 2 attempts with graceful fallback to `{ forecasts: [], error: message }`

---

## 8. Data Privacy Rules

- Never send full client names in search queries if they contain sensitive identifiers
- Never log raw Claude responses to the browser console in production builds
- Never store API keys in `localStorage`, `sessionStorage`, or any client-side storage
- Never include user-provided notes or comments in Claude prompts without sanitization
- Truncate report content sent to Claude to the first 50,000 characters to avoid token bloat

---

## 9. Graceful Degradation

If Claude is unavailable or returns an error:

- Dashboard still loads from Notion (read-only mode)
- Custom KPI form still works (no AI required)
- Show a banner: "AI features temporarily unavailable. You can still view and add data manually."
- Log the error with timestamp for debugging

---

## 10. Human-in-the-Loop Gate

**This is mandatory and must never be bypassed.**

Before any AI-extracted data is written to Notion:

1. Show the user a preview table of all extracted KPIs
2. Allow the user to: edit values, delete KPIs, or add missing ones
3. Require an explicit "Confirm & Save" click
4. Only after confirmation: write to Notion

This ensures the user is always in control of what enters their database. The AI is a helper, not the authority.

---

## 11. Robust JSON Parsing (`safeParseJSON`)

AI responses (especially from Gemini with `maxOutputTokens`) may be truncated mid-JSON. The `safeParseJSON()` function in `lib/llm.js` repairs common truncation patterns:

### Repair Steps (applied in order):

1. **Direct parse** — try `JSON.parse()` first
2. **Strip markdown** — remove ` ```json ` / ` ``` ` fences
3. **Extract JSON object** — find the outermost `{...` match
4. **Quote-counting** — count unescaped `"` characters; if odd, the last string is unterminated → strip from last `"` to end
5. **Remove dangling key** — trailing `, "key":` with no value
6. **Remove incomplete object** — trailing `, { ... ` inside an array (no closing `}`)
7. **Remove partial value** — trailing `, "key": partialValue`
8. **Clean trailing commas**
9. **Stack-based bracket closing** — walk the repaired string tracking `{`, `[`, `"` nesting; append missing `]` and `}` in correct order

This handles all common truncation points: mid-string, mid-key, mid-array, and mid-object.

### Test Coverage

6 truncation patterns are tested in `test-json-repair.mjs`:
- Complete valid JSON
- Truncated mid-string in `reasoning` field
- Truncated after key colon (`"reasoning":`)
- Truncated mid-array (partial second object)
- Truncated with markdown fences
- Completely malformed input (expects error)
