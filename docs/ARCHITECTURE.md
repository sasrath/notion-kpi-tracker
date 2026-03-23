# Architecture Document
## Client Quarterly Performance Tracker — Powered by Notion MCP

**Version:** 2.0  
**Status:** Current  
**Last Updated:** March 23, 2026

---

## 1. System Overview

This application follows a **zero-backend architecture**. Notion serves as the sole persistent data layer. AI (Google Gemini + Anthropic Claude, user-selectable) handles all data ingestion, revenue forecasting, and intelligence. The frontend is a Next.js 15 App Router single-page application.

```
┌─────────────────────────────────────────────────────────┐
│                      USER BROWSER                        │
│                                                          │
│   ┌──────────────────────────────────────────────────┐  │
│   │              React Frontend (JSX)                 │  │
│   │   Dashboard │ Add Report │ Custom KPI │ Ask AI    │  │
│   └──────────┬───────────────────────┬───────────────┘  │
│              │                       │                   │
└──────────────┼───────────────────────┼───────────────────┘
               │                       │
       ┌───────┴───────┐               │
       ▼               ▼               ▼
┌──────────────┐ ┌──────────────┐ ┌───────────────────────┐
│ Google       │ │ Anthropic    │ │     Notion MCP         │
│ Gemini API   │ │ Claude API   │ │   (REST via OAuth)     │
│              │ │              │ │                        │
│ - Web Search │ │ - Extraction │ │  - Read databases      │
│ - Extraction │ │ - Queries    │ │  - Write pages         │
│ - Forecasts  │ │ - Forecasts  │ │  - Query filters       │
└──────────────┘ └──────────────┘ └───────────────────────┘
                                           │
                               ┌───────────────────────┐
                               │    Notion Workspace    │
                               │                        │
                               │  [Clients DB]          │
                               │  [Reports DB]          │
                               │  [KPIs DB]             │
                               └───────────────────────┘
```

---

## 2. Component Breakdown

### 2.1 Frontend — Next.js 15 App Router

**File:** `app/page.jsx`

The frontend is a Next.js 15 App Router single-page application:

```
App
├── Header (app title, AI model selector, Notion connection status, sync time)
├── TabBar (Dashboard | Add Report | Custom KPI | Ask AI)
├── MainView
│   ├── DashboardView (default)
│   │   ├── ClientFilterBar (pill buttons per client)
│   │   ├── KPICardRow (Revenue, Gross Margin, Net Margin, EPS, Operating Income, Customer Count)
│   │   ├── StatsOverviewBar (Total KPIs, Clients, High Confidence, Custom — "All Clients" only)
│   │   ├── Charts Row 1: AreaChart (Revenue Trend) + BarChart (Revenue Forecast AI)
│   │   ├── Charts Row 2: LineChart (Margin Trends) + LineChart (EPS Trends)
│   │   ├── Charts Row 3: PieChart (KPI Distribution) + PieChart (Confidence) + Heatmap
│   │   ├── Charts Row 4: ComposedChart (Revenue + Margin) + BarChart (KPI Gauges)
│   │   ├── Charts Row 5: Treemap (KPI Landscape)
│   │   └── KPITable (paginated, 20/page, checkbox select, delete, company filter)
│   ├── AddReportView (always mounted, hidden via CSS when inactive)
│   │   ├── ModeToggle (URL | Upload PDF)
│   │   ├── ReportForm (URL/file, client name, ticker, quarter, year)
│   │   ├── ExtractionPreview (AI results for review — human-in-the-loop)
│   │   └── ConfirmSaveButton
│   ├── CustomKPIView (always mounted, hidden via CSS when inactive)
│   │   └── CustomKPIForm
│   └── QueryView (always mounted, hidden via CSS when inactive)
│       ├── NaturalLanguageInput
│       ├── SuggestionChips
│       └── QueryResultPanel
└── Toast (success/error notifications)
```

**Tab Persistence:** All tab panels (Add Report, Custom KPI, Ask AI) are always mounted in the DOM but hidden via CSS `hidden` class when inactive. This ensures that async operations (e.g., AI report analysis) survive tab switching.

**KPI Summary Cards (All Clients):** When "All Clients" is selected, summary cards show aggregated values — Revenue, Operating Income, and Customer Count are **summed** across clients; Gross Margin, Net Margin, and EPS are **averaged**. Individual client views show that client's latest values.

### 2.2 AI Layer — Multi-Model (Gemini + Claude)

**Default Model:** `gemini-2.5-flash` (Google, cost-optimized)  
**Alternative Models:** `gemini-2.5-pro`, `claude-haiku-4-5`, `claude-sonnet-4-5`, `claude-sonnet-4-6`  
**Tools enabled:** `web_search` (for URL ingestion), `pdf-parse` (for PDF upload)

Four primary AI functions:

**Function A — Report Ingestion (URL)**
```
Input:  { url, clientName, quarter, year, ticker }
Output: { kpis: [ { name, value, unit, confidence, source } ] }
```

**Function B — Document Ingestion (PDF)**
```
Input:  { text, clientName, quarter, year, ticker, docType }
Output: { kpis: [ { name, value, unit, confidence, source } ] }
```

**Function C — Revenue Forecasting**
```
Input:  { revenueByClient, model }
Output: { forecasts: [ { client, nextQuarter, nextYear, forecastValue, unit, reasoning } ] }
```
- Fetched once on dashboard load, cached in state (no re-fetch on tab/client switch)
- Robust JSON repair (`safeParseJSON`) handles truncated AI responses
- Retry logic (2 attempts) for transient failures

**Function D — Natural Language Query**
```
Input:  { question, kpis, clients, model }
Output: { answer: string }
```

### 2.3 Data Transform Layer

**File:** `lib/transforms.js`

18 exported functions for data normalization, deduplication, and chart preparation:

| Function | Purpose |
|---|---|
| `deduplicateKPIs()` | Normalize units ($B→$M, $T→$M) and deduplicate by client+KPI+quarter+year |
| `groupKPIs()` | Group KPIs by client → year → quarter |
| `getRevenueForecastInput()` | Prepare revenue data for AI forecasting |
| `buildForecastChartData()` | Build bar chart data with actual + forecasted periods |
| `getRevenueTrend()` | Revenue line/area chart data per client |
| `getLatestSummary()` | KPI summary cards (aggregated for multi-client, per-client otherwise) |
| `getClientComparison()` | Bar chart comparing clients on a KPI |
| `getRadarData()` | Radar chart data (unused in current UI) |
| `getMarginTrend()` | Margin line chart data (Gross + Net per client) |
| `getEPSTrend()` | EPS line chart data per client over time |
| `getKPIDistribution()` | Pie chart of KPI name distribution |
| `getConfidenceDistribution()` | Pie chart of High/Medium/Low confidence |
| `getQuarterlyHeatmap()` | Quarterly performance heatmap data |
| `formatValue()` | Format KPI value with unit prefix |
| `confidenceColor()` | Map confidence level to color |
| `getComposedData()` | Combined revenue + margin chart data |
| `getRadialBarData()` | Horizontal bar gauge data (supports negatives) |
| `getTreemapData()` | Treemap visualization data |

### 2.4 Notion MCP Layer

**Connection:** `@notionhq/notion-mcp-server` spawned as subprocess via `StdioClientTransport`  
**Client SDK:** `@modelcontextprotocol/sdk`  
**Auth:** `NOTION_API_KEY` passed via `OPENAPI_MCP_HEADERS` env var  
**Scope:** Read + Write to integration-connected pages only

#### MCP Tool Mapping

| Application Operation | MCP Tool | Notes |
|---|---|---|
| Create client/report/KPI page | `API-post-page` | Write to any database |
| Find pages (clients, KPIs) | `API-post-search` | With client-side filtering by parent DB ID |
| Delete/archive records | `API-patch-page` | Set `archived: true` to soft-delete |
| Verify connection | `API-get-self` | Returns bot info |
| Check database schema | `API-retrieve-a-database` | Get property definitions |
| Get specific page | `API-retrieve-a-page` | Full page properties |

#### MCP Architecture Details

```
Next.js API Route
       │
       ▼
lib/notion.js (exported functions: getClients, saveKPIs, deleteKPIs, etc.)
       │
       ▼
lib/notion-mcp.js (globalThis singleton MCP client + auto-reconnect + callNotionTool helper)
       │
       ▼
@modelcontextprotocol/sdk Client
       │ (stdio)
       ▼
@notionhq/notion-mcp-server (subprocess)
       │ (HTTP)
       ▼
Notion API (api.notion.com)
```

The MCP server is a **long-lived subprocess** managed as a singleton. It starts on the first API call and stays alive for subsequent requests. The `callNotionTool()` helper handles JSON parsing and error detection.

Three Notion databases:

**Database 1: Clients**
| Property | Type |
|---|---|
| Name | Title |
| Industry | Select |
| Website | URL |
| Status | Select (Active/Inactive) |
| Created | Date |

**Database 2: Quarterly Reports**
| Property | Type |
|---|---|
| Client | Relation → Clients |
| Quarter | Select (Q1/Q2/Q3/Q4) |
| Year | Number |
| Report URL | URL |
| Ingested At | Date |
| Raw Summary | Text |

**Database 3: KPIs**
| Property | Type |
|---|---|
| Report | Relation → Quarterly Reports |
| Client | Relation → Clients |
| KPI Name | Title |
| Value | Number |
| Unit | Select ($M / % / x / days / count) |
| Quarter | Select |
| Year | Number |
| Source | Select (AI Parsed / Custom) |
| Confidence | Select (High / Medium / Low) |
| Notes | Text |

---

## 3. Data Flow

### 3.1 Report Ingestion Flow

```
User submits URL + client info
         │
         ▼
Frontend calls Claude API
  System prompt: "You are a financial analyst. Extract KPIs."
  User message:  "Fetch this report: {url}, extract KPIs for {client}, {quarter} {year}"
  Tools:         web_search enabled
         │
         ▼
Claude fetches the URL via web_search
Claude reads and parses the content
Claude returns structured JSON:
  {
    "kpis": [
      { "name": "Revenue", "value": 4200, "unit": "$M",
        "confidence": "High", "source": "Paragraph 2, Q3 earnings" },
      ...
    ],
    "warnings": ["Could not find EPS - not mentioned in report"]
  }
         │
         ▼
Frontend renders KPI preview table
User reviews and confirms (human-in-the-loop gate)
         │
         ▼
Frontend writes to Notion via MCP:
  1. Create/find Client record
  2. Create Quarterly Report record
  3. Create one KPI record per extracted KPI
         │
         ▼
Dashboard re-fetches from Notion
UI updates with new data
```

### 3.2 Dashboard Render Flow

```
App loads
    │
    ▼
Fetch all KPIs from Notion KPIs database
Fetch all Clients from Notion Clients database
    │
    ▼
Group KPIs by: Client → Year → Quarter
    │
    ▼
Calculate derived metrics:
  - QoQ growth = (current - previous) / previous × 100
  - YoY growth = (current - prior year same quarter) / prior × 100
    │
    ▼
Render:
  KPI cards (latest quarter, most recent client selected)
  Line chart (revenue over time, per client)
  Bar chart (all clients, current quarter comparison)
  Table (full matrix view)
```

### 3.3 Custom KPI Flow

```
User fills Custom KPI form
    │
    ▼
Frontend validates:
  - Value is numeric
  - Unit is selected
  - Client exists in Notion
  - Quarter and Year are set
    │
    ▼
Write to Notion KPIs database:
  Source = "Custom"
  Confidence = "High" (user-provided)
    │
    ▼
Dashboard re-renders with new KPI
Custom badge displayed on KPI card
```

---

## 4. Environment Configuration

```bash
# .env.local (never committed to git)
GOOGLE_API_KEY=...            # Primary AI provider
ANTHROPIC_API_KEY=...         # Optional alternative AI provider
NOTION_API_KEY=ntn_...        # Notion integration token
NOTION_PARENT_PAGE_ID=...     # Parent page for database creation
NOTION_CLIENTS_DB_ID=...      # Clients database
NOTION_REPORTS_DB_ID=...      # Reports database
NOTION_KPIS_DB_ID=...         # KPIs database
```

---

## 5. Error Handling Architecture

| Error Scenario | Detection | Handling |
|---|---|---|
| URL not accessible | Claude returns error in JSON | Show user: "Report URL could not be fetched" |
| No financial content found | Claude returns empty KPIs array | Show: "No KPIs found — try a different URL" |
| Notion write fails | MCP tool returns status >= 400 | Retry once, then show error with Notion link |
| Notion token expired | MCP tool returns 401 | Show: "Reconnect your Notion workspace" |
| MCP server crash | Subprocess exits | Singleton auto-reconnects on next call via `resetClient()` |
| MCP connection stale | ENOTCONN/EPIPE/EOF | Auto-reconnect once, then retry the operation |
| Claude API rate limit | 429 from Anthropic | Queue request, show progress indicator |
| Invalid custom KPI | Frontend validation | Inline form errors before submission |
| Partial extraction | Confidence tagged Low | Yellow badge on KPI card with warning |
| Tab switch during async | Components unmounted | Fixed: CSS hidden class keeps components mounted |
| Notion search delay | Eventual consistency | 1.5s delay before dashboard refresh after save |
| Deprecated AI model | Health check 404 | Updated to use `gemini-2.5-flash` |
| AI forecast JSON truncated | Malformed JSON from Gemini/Claude | `safeParseJSON` repairs truncated responses (quote-counting, stack-based bracket closing) |
| AI forecast failure | API error or invalid output | Retry up to 2 times, show error with Refresh button |
| Mixed KPI units ($B vs $M) | Different ingestion sources | `normalizeKPI()` converts $B→$M (×1000), $T→$M (×1M) |
| Duplicate KPIs | Re-ingested reports | `deduplicateKPIs()` keeps one per client+canonical+quarter+year |

---

## 6. Security Architecture

- API keys stored in `.env` only — never in frontend JS bundles
- For production deployment: keys stored in Vercel/Netlify environment variables
- Notion integration scoped to specific pages — not full workspace admin access
- No user authentication in v1 (single-user app)
- No data leaves the user's own Notion workspace — zero central data storage
- `.gitignore` enforced for `.env`, `node_modules`, build artifacts

---

## 7. Scalability Considerations (Post v1.0)

- Add Supabase as a caching layer to reduce MCP search calls on heavy dashboards
- Add user auth (Clerk or Auth0) to support multiple users with separate Notion workspaces
- ~~Move AI ingestion to a serverless function~~ Already server-side via Next.js API routes
- Add webhook support — Notion notifies app when data changes, enabling real-time updates
- ~~Add PDF parsing support~~ ✅ Already implemented via `pdf-parse` for 10-K/10-Q uploads
- ~~Add AI forecasting~~ ✅ Already implemented — AI revenue forecast with cached results
- Transition from MCP search-based reads to native database queries when MCP adds support

---

## 8. Repository Structure

```
/
├── app/
│   ├── page.jsx                 # Main React app (dashboard, forms, charts, KPITable)
│   ├── layout.jsx               # Root layout
│   ├── globals.css              # Tailwind global styles
│   ├── health/page.jsx          # Health check UI
│   └── api/
│       ├── ingest/route.js      # URL ingestion endpoint
│       ├── ingest/confirm/route.js  # Save confirmed KPIs
│       ├── upload/route.js      # PDF upload endpoint
│       ├── clients/route.js     # Get clients list
│       ├── kpis/route.js        # Get KPIs with filters
│       ├── kpis/delete/route.js # Delete KPIs (archive via MCP)
│       ├── custom-kpi/route.js  # Add custom KPI
│       ├── forecast/route.js    # AI revenue forecasting endpoint
│       ├── models/route.js      # List AI models with availability
│       ├── query/route.js       # Natural language query
│       └── health/route.js      # Health check API (MCP + AI)
├── lib/
│   ├── notion-mcp.js            # MCP client singleton (globalThis) & auto-reconnect
│   ├── notion.js                # Notion CRUD via MCP tools (incl. deleteKPIs)
│   ├── llm.js                   # Multi-model AI (Gemini + Claude) with guardrails + forecasting + safeParseJSON
│   └── transforms.js            # 18 data transform functions (normalize, dedupe, chart prep)
├── docs/
│   ├── PRD.md                   # Product requirements
│   ├── ARCHITECTURE.md          # This file
│   ├── PLAN.md                  # Build plan
│   ├── AI_RULES.md              # AI guardrails & prompts
│   └── TEST_REPORT.md           # End-to-end test results
├── test-e2e.mjs                 # Automated E2E test suite (25 tests)
├── test-charts.mjs              # Chart data transform tests (43 assertions)
├── test-json-repair.mjs         # JSON repair/truncation tests (6 cases)
├── setup-notion.mjs             # Database setup helper
├── .env.local                   # Environment variables (not committed)
├── .gitignore
├── package.json
├── next.config.mjs              # Next.js config (serverExternalPackages)
├── tailwind.config.js
├── postcss.config.js
└── jsconfig.json
```
