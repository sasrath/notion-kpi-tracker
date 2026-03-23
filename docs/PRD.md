# Product Requirements Document (PRD)
## Client Quarterly Performance Tracker — Powered by Notion MCP

**Version:** 2.0  
**Author:** TBD  
**Status:** Current  
**Last Updated:** March 23, 2026  
**Competition:** dev.to Notion MCP Challenge (Deadline: March 29, 2026)

---

## 1. Overview

### 1.1 Product Summary

A lightweight, AI-powered web application that enables users to track, visualize, and analyze their clients' quarterly financial performance. The app uses multi-model AI (Google Gemini 2.5 Flash/Pro or Anthropic Claude Haiku/Sonnet) to automatically fetch and parse quarterly reports from the web or uploaded PDFs, extracts KPIs, stores everything in Notion via the **official Notion MCP Server** (`@notionhq/notion-mcp-server`), and renders a live, interactive dashboard with 9+ chart types including AI revenue forecasting.

Notion acts as the sole backend — no traditional database is required. All Notion operations (reads, writes, search) are routed through MCP tool calls, making this a true MCP-native application.

### 1.2 Problem Statement

Consultants, analysts, and account managers who track multiple clients' performance currently face:

- Manual copy-pasting of data from quarterly reports (PDFs, web pages, press releases)
- No single place to compare clients side-by-side across quarters
- Missing or overlooked KPIs buried in footnotes or appendices
- No AI layer to surface insights or flag underperformers automatically

### 1.3 Solution

An app where the user provides a client name and a report URL or uploads a PDF (10-K, 10-Q). The AI (Gemini or Claude, user-selectable) fetches/reads the report, extracts key KPIs automatically, stores the structured data in Notion **through MCP tool calls**, and renders a live dashboard with interactive charts (radar, area, pie, heatmap, bar, line). Users can also manually add custom KPIs the AI may have missed.

### 1.4 Target Users

- Freelance consultants tracking client portfolios
- Account managers at agencies
- Financial analysts managing multiple client accounts
- Solo founders tracking their own business vs competitors

---

## 2. Goals & Success Metrics

### 2.1 Primary Goals

- Reduce time to populate a client KPI report from hours to under 2 minutes
- Provide a visual, at-a-glance dashboard across all clients and quarters
- Ensure Notion is the single source of truth — no separate database needed
- Enable human-in-the-loop KPI customization for accuracy

### 2.2 Success Metrics (for Challenge Demo)

| Metric | Target |
|---|---|
| Time to ingest a report | < 2 minutes |
| KPI extraction accuracy | > 80% of standard KPIs found |
| Dashboard load time | < 3 seconds |
| Custom KPI save time | < 5 seconds |
| Lines of backend code | 0 (Notion = backend) |

---

## 3. Features

### 3.1 Core Features (MVP)

#### F1 — AI Report Ingestion
- User inputs a client name and either a public URL (quarterly report, earnings release, press release) **or uploads a PDF** (10-K, 10-Q)
- AI (Gemini or Claude, user-selectable via dropdown) fetches the page content or parses the uploaded PDF
- AI extracts structured KPIs from the content
- Extracted data is written to Notion via **MCP tool calls** (`API-post-page`)
- User receives a confirmation with what was found

#### F2 — Live KPI Dashboard
- Pulls all client data from Notion in real time via **MCP search** (`API-post-search`)
- Displays KPI summary cards (Revenue, Gross Margin, Net Margin, EPS, Operating Income, Customer Count)
- **Aggregated "All Clients" view**: sums Revenue/Operating Income/Customer Count, averages margins/EPS
- 9+ interactive chart types:
  - Area chart: revenue trend per client over quarters
  - Bar chart: AI revenue forecast (actual + predicted next quarter with reasoning)
  - Line chart: margin trends (gross + net per client)
  - Line chart: EPS trends per client over time
  - Pie/Donut charts: KPI distribution + confidence distribution
  - Heatmap: quarterly performance matrix
  - Composed chart: combined revenue + margin overlay
  - Horizontal bar chart: KPI gauges (supports negative values)
  - Treemap: KPI landscape visualization
- **Paginated KPI table** (20 records per page) with first/prev/next/last navigation
- **Filter by company**: KPI table and cards filter by selected client
- **Delete functionality**: Individual delete (🗑 button) and bulk delete (checkbox select + "Delete N selected")
- Stats overview bar (Total KPIs, Clients, High Confidence, Custom) — "All Clients" view only
- Filter by: Client, Quarter, Year, KPI type

#### F3 — Custom KPI Entry
- Form to manually add a KPI the AI missed
- Fields: KPI Name, Value, Unit, Quarter, Client, Source/Notes
- "Custom" badge visually distinguishes manual entries from AI-parsed ones
- Saves directly to Notion via **MCP tool calls** (`API-post-page`)

#### F4 — Natural Language Query
- Text input: "Which client had the highest revenue growth in Q3?"
- Claude reads Notion data and returns a plain-English answer
- Optional: renders the relevant chart automatically

#### F5 — AI Revenue Forecasting
- AI predicts next quarter revenue for each client based on historical trends
- Uses the user-selected model (Gemini or Claude)
- Grouped bar chart: previous quarter + latest quarter + AI-predicted next quarter
- Forecast reasoning displayed per client below the chart
- Cached on first load — no re-fetch on tab/client switch (manual Refresh button available)
- Robust JSON repair (`safeParseJSON`) handles truncated AI responses gracefully
- Retry logic (2 attempts) for transient failures

### 3.2 Secondary Features (Nice to Have)

- ~~PDF upload support~~ ✅ **Implemented** — supports 10-K/10-Q PDF upload with drag-and-drop
- ~~Delete functionality~~ ✅ **Implemented** — individual and bulk KPI deletion via MCP (`API-patch-page` archive)
- ~~Record pagination~~ ✅ **Implemented** — top 20 records per page with full pagination controls
- ~~Model availability warnings~~ ✅ **Implemented** — all AI models shown with "(no API key)" for unconfigured providers
- ~~Tab persistence~~ ✅ **Implemented** — async operations survive tab switching (CSS hidden class approach)
- ~~AI revenue forecasting~~ ✅ **Implemented** — AI predicts next quarter revenue with cached results
- ~~Data normalization~~ ✅ **Implemented** — $B→$M conversion, deduplication of mixed-unit ingestions
- ~~Aggregated summary~~ ✅ **Implemented** — "All Clients" view sums/averages across clients
- Export dashboard as PNG or PDF
- Email digest of weekly performance summary
- Notion page auto-generated per client with full report breakdown
- Multi-user support (each user connects their own Notion workspace)

---

## 4. User Flows

### 4.1 Add a New Client Report

```
1. User clicks "Add Report"
2. Enters: Client Name, Report URL, Quarter (Q1/Q2/Q3/Q4), Year
3. Clicks "Fetch & Analyze"
4. App shows loading state: "Claude is reading the report..."
5. Claude returns extracted KPIs in a preview table
6. User reviews, edits if needed, confirms
7. Data is saved to Notion
8. Dashboard updates live
```

### 4.2 Add a Custom KPI

```
1. User clicks "+ Add Custom KPI" on dashboard
2. Fills in: Client, Quarter, KPI Name, Value, Unit, Notes
3. Clicks "Save to Notion"
4. KPI appears on dashboard with "Custom" badge
```

### 4.3 Query the Dashboard

```
1. User types: "Who underperformed vs target in Q2 2025?"
2. Claude queries Notion data
3. Returns: list of clients with actual vs target comparison
4. Optionally highlights them on the dashboard
```

---

## 5. KPIs Tracked (Default Set)

| KPI | Unit | Source |
|---|---|---|
| Revenue | $M | AI parsed |
| Revenue Growth QoQ | % | AI calculated |
| Revenue Growth YoY | % | AI calculated |
| Gross Margin | % | AI parsed |
| Net Margin | % | AI parsed |
| Operating Income | $M | AI parsed |
| EPS (Earnings Per Share) | $ | AI parsed |
| Customer Count | Number | AI parsed |
| Churn Rate | % | AI parsed |
| Custom KPIs | Any | User defined |

---

## 6. Guardrails & Constraints

### 6.1 AI Guardrails

- Claude must never fabricate KPI values — if a value cannot be found, it returns `null` with a note
- Claude must cite the source location (e.g., "Found in Q3 2025 earnings release, paragraph 2")
- Claude must not store personally identifiable information (PII) in Notion
- Claude must flag if a report URL is inaccessible or returns no financial content
- Confidence scoring: each extracted KPI is tagged as High / Medium / Low confidence
- User must confirm extracted KPIs before they are saved to Notion (human-in-the-loop)

### 6.2 Data Guardrails

- All data is stored only in the user's own Notion workspace — the app has no central database
- The app never stores API keys in the frontend or in version control
- API keys are loaded from `.env` only — never hardcoded
- Notion writes are scoped to the specific integration token provided — no broader workspace access
- Rate limiting: max 5 report ingestions per session to avoid API cost overruns

### 6.3 UX Guardrails

- If AI extraction fails, user is shown a clear error with the reason — never a silent failure
- Custom KPI form validates: value must be numeric, unit must be selected, client must exist
- All dashboard data shows the last-updated timestamp so users know data freshness
- Empty states are informative — new users see a clear "Add your first client" prompt

### 6.4 Cost Guardrails

- Gemini 2.5 Flash is used by default (fast, cost-efficient)
- Token usage is estimated and shown to the user before each report ingestion
- Batch processing is used where possible to reduce API calls
- AI forecasts cached after first load — no redundant API calls on tab/client switch

---

## 7. Out of Scope (v1.0)

- Real-time stock price feeds
- Automated scheduled report fetching (cron jobs)
- Multi-user collaboration on the same workspace
- Mobile native app (web responsive only)
- Reports behind paywalls or login walls

---

## 8. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (App Router), React 19, Tailwind CSS |
| Charts | Recharts (Line, Bar, Area, Pie, ComposedChart, Treemap, Heatmap — 9+ chart types) |
| AI Layer | Google Gemini 2.5 Flash/Pro (default) + Anthropic Claude Haiku 4.5 / Sonnet 4.5 / Sonnet 4.6 |
| Notion Integration | **Notion MCP Server** (`@notionhq/notion-mcp-server`) via `@modelcontextprotocol/sdk` |
| PDF Parsing | `pdf-parse` for 10-K/10-Q document uploads |
| Backend/DB | Notion via MCP (zero traditional backend) |
| Hosting | Vercel or Netlify (free tier) |
| Auth | None for v1 (single user, API keys in .env) |

### 8.1 MCP Integration Details

All Notion operations are routed through the official Notion MCP Server:

| Operation | MCP Tool | Description |
|---|---|---|
| Create client/report/KPI | `API-post-page` | Write new records to any Notion database |
| Search for pages | `API-post-search` | Find pages across the workspace |
| Delete/archive records | `API-patch-page` | Archive pages (Notion's delete mechanism) |
| Retrieve database schema | `API-retrieve-a-database` | Get database property definitions |
| Retrieve specific page | `API-retrieve-a-page` | Get full page properties |
| Health check | `API-get-self` | Verify MCP & Notion connection |

The MCP server is spawned as a subprocess via `StdioClientTransport` and managed as a singleton.

---

## 9. Timeline

| Day | Milestone |
|---|---|
| Day 1 | Notion database schema + MCP connection working |
| Day 2 | AI report ingestion pipeline (fetch → extract → write to Notion) |
| Day 3 | Dashboard UI with charts (mock data first) |
| Day 4 | Wire dashboard to live Notion data |
| Day 5 | Custom KPI form + natural language query |
| Day 6 | Polish UI, error handling, guardrails |
| Day 7 | Write dev.to submission post + record demo video |
| Day 8 | Submit before March 29 deadline |
