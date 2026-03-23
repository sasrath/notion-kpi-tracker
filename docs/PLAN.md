# Build Plan
## Client Quarterly Performance Tracker — Powered by Notion MCP

**Version:** 3.0 (Feature Complete)  
**Competition Deadline:** March 29, 2026 at 11:59 PM PST  
**Start Date:** March 21, 2026  
**Last Updated:** March 23, 2026

---

## Overview

This plan documents the build milestones for the Notion KPI Tracker. The application uses the **official Notion MCP Server** (`@notionhq/notion-mcp-server`) for all Notion operations — reads, writes, and search — making it a true MCP-native application for the Dev.to Notion MCP Challenge.

---

## Completed Milestones

### ✅ Phase 1 — Foundation & Notion Setup
- Created 3 Notion databases: Clients, Reports, KPIs
- Configured all database properties
- Shared databases with Notion integration
- Verified read/write access

### ✅ Phase 2 — AI Report Ingestion Pipeline
- Multi-model AI support (Google Gemini 2.5 Flash/Pro + Anthropic Claude)
- `ingestReport()` for URL-based ingestion with web search
- `ingestDocument()` for PDF upload parsing (10-K, 10-Q)
- Output validation, prompt injection detection, confidence scoring
- Rate limiting (max 5 ingestions per session)

### ✅ Phase 3 — Notion Write Pipeline + Human-in-the-Loop
- Complete CRUD operations for Clients, Reports, KPIs
- Client find-or-create logic
- KPI preview table with human-in-the-loop confirmation
- Custom KPI entry form

### ✅ Phase 4 — Dashboard UI (9+ Chart Types)
- KPI summary cards with trend indicators and aggregated "All Clients" view
- Area chart: quarterly revenue trend per client
- Bar chart: AI revenue forecast (actual + predicted next quarter)
- Line chart: margin trends over time (gross + net per client)
- Line chart: EPS trends over time per client
- Pie/Donut charts: KPI distribution + confidence distribution
- Heatmap: quarterly performance matrix
- Composed chart: combined revenue + margin overlay
- Horizontal bar chart: KPI gauges with negative value support
- Treemap: KPI landscape visualization
- Full KPI data table with filters, pagination, delete
- PDF upload with drag-and-drop and document type selector
- Model selector dropdown

### ✅ Phase 5 — Notion MCP Migration
- Installed `@modelcontextprotocol/sdk` and `@notionhq/notion-mcp-server`
- Discovered and verified 21 MCP tools available
- Created `lib/notion-mcp.js` — MCP client singleton with:
  - `StdioClientTransport` spawning Notion MCP server subprocess
  - Lazy initialization with concurrent connection protection
  - `callNotionTool()` helper for JSON-based tool calls
- Rewrote `lib/notion.js` — same exported API, MCP internals:
  - **Writes**: All use `API-post-page` MCP tool
  - **Reads**: All use `API-post-search` with client-side filtering by parent DB ID
  - **Search**: `findOrCreateClient()` uses MCP search by name
- Updated health check to use `API-get-self` and `API-retrieve-a-database` via MCP
- Updated `next.config.mjs` with MCP-related `serverExternalPackages`
- Zero changes needed in API routes (same exports from `lib/notion.js`)

### ✅ Phase 6 — UX Improvements & Bug Fixes
- Tab switching no longer kills async operations (CSS `hidden` class instead of conditional rendering)
- KPI delete functionality: individual (🗑 button) and bulk (checkbox + "Delete N selected")
- Paginated KPI table: 20 records per page with first/prev/next/last navigation
- KPI table filters by selected company
- Fixed dual port issue: dev server locked to `--port 3000`
- Model dropdown shows ALL models (Google + Anthropic) with availability status
- Unavailable models show "(no API key)" suffix and warning toast on selection attempt
- Fixed deprecated `gemini-2.0-flash` model in health check → `gemini-2.5-flash`
- MCP singleton uses `globalThis` to survive Next.js HMR in dev mode
- Auto-reconnect on stale MCP connections (ENOTCONN, EPIPE, EOF)
- Granular logging in confirm endpoint for debugging
- 1.5s delay on dashboard refresh after save (Notion search eventual consistency)

### ✅ Phase 7 — End-to-End Testing
- Created automated test suite (`test-e2e.mjs`) with 25 test cases across 10 categories
- Real-world test: Apple Q1 2025 earnings report ingested, KPIs extracted and saved
- All 25 tests pass (100% pass rate)
- 1 bug found and fixed (deprecated health check model)
- Test report generated (`docs/TEST_REPORT.md`)

### ✅ Phase 8 — Chart Data Quality & Normalization
- Fixed mixed $B/$M units causing chart distortion
- Added `normalizeKPI()`: converts $B→$M (×1000), $T→$M (×1M)
- Added `deduplicateKPIs()`: one entry per client+canonical+quarter+year
- Updated dashboard pipeline: raw KPIs → deduplicateKPIs → filteredKPIs → chart transforms
- Fixed client revenue comparison to use per-client latest quarter
- Replaced RadialBarChart with horizontal BarChart supporting negative values (ReferenceLine at zero)

### ✅ Phase 9 — AI Revenue Forecasting
- Removed radar chart and client revenue comparison chart
- Created AI Revenue Forecast feature:
  - `forecastRevenue()` function in `lib/llm.js` with Google + Anthropic support
  - `FORECAST_SYSTEM_PROMPT` for structured JSON forecast output
  - `_forecastWithGoogle()` using JSON mode (`responseMimeType: "application/json"`, maxOutputTokens: 4096)
  - `_forecastWithAnthropic()` with markdown stripping
  - Retry logic (2 attempts) for transient failures
  - `safeParseJSON()` for robust truncated JSON repair (quote-counting, stack-based bracket closing)
- Created `/api/forecast` endpoint
- Added `getRevenueForecastInput()` and `buildForecastChartData()` to transforms
- Grouped bar chart showing: previous quarter, latest quarter, AI-predicted next quarter
- Forecast reasoning displayed below chart per client
- Forecast cached in state — fetched once on load, manual Refresh button available

### ✅ Phase 10 — Dashboard Polish & Data Aggregation
- Added "EPS Trends Over Time" line chart (fills empty Row 2 slot next to Margin Trends)
- Added `getEPSTrend()` transform function
- Fixed "All Clients" summary cards: now aggregates across clients (sum for Revenue/Operating Income/Customer Count, average for margins/EPS) instead of showing only the latest single-client data
- Stats overview bar (Total KPIs, Clients, High Confidence, Custom) only shown on "All Clients" view
- Forecast no longer re-fetches on tab/client switch (forecastFetchedRef prevents it)

### ✅ Phase 11 — Test Coverage Expansion
- Chart data transform tests: 43 assertions across 20 test groups
- Covers: deduplication, normalization, revenue trend, summary cards, forecast data, KPI distribution, margin trend, composed data, radial bar, treemap, EPS trend
- JSON repair tests: 6 truncation patterns (truncated key, mid-string, one complete + one truncated, valid, markdown-wrapped)
- All tests passing

### MCP Tools Used

| MCP Tool | Purpose | Where Used |
|---|---|---|
| `API-post-page` | Create records in any database | `findOrCreateClient`, `createReport`, `saveKPIs`, `saveCustomKPI` |
| `API-post-search` | Find pages across workspace | `getClients`, `getKPIs`, `findOrCreateClient` |
| `API-patch-page` | Archive/delete records | `deleteKPI`, `deleteKPIs` |
| `API-retrieve-a-database` | Get database schema | Health check |
| `API-get-self` | Verify bot connection | Health check |

---

## Remaining Work

### Phase 12 — Deployment & Submission
- [ ] Deploy to Vercel
- [ ] Record demo video
- [ ] Write dev.to submission post
- [ ] Submit before March 29 deadline

---

## Architecture Decision: MCP Search for Reads

The Notion MCP Server's `API-query-data-source` tool maps to the new `/v1/data_sources/{id}/query` endpoint, which does not work with traditional Notion databases. Our solution:

**Write operations** → `API-post-page` (direct, one-to-one mapping)  
**Read operations** → `API-post-search` + client-side filtering by `parent.database_id`

This approach:
- Routes 100% of Notion operations through MCP (no direct API calls)
- Maintains the same exported function signatures (zero changes to API routes)
- Works reliably with the current MCP server version (v2.2.1)
- Sorts and filters client-side (acceptable for typical KPI tracker scale)

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| MCP server subprocess crash | Low | Medium | Singleton auto-reconnects on next call |
| Search pagination limits | Low | Low | Client-side filtering handles moderate data volumes |
| MCP server version breaks | Low | High | Pinned to v2.2.1 in package.json |
| AI model API changes | Low | Medium | Multi-model support provides fallback |

---

## MVP Definition

The minimum viable submission includes:

- ✅ Notion MCP read/write working via official MCP server
- ✅ AI report ingestion (URL + PDF → KPIs → Notion via MCP)
- ✅ Human-in-the-loop confirmation step
- ✅ Interactive dashboard with 9+ chart types
- ✅ AI Revenue Forecasting with cached results and robust JSON repair
- ✅ Custom KPI form
- ✅ Natural language query
- ✅ KPI delete (individual + bulk)
- ✅ Paginated KPI table (20 per page)
- ✅ Model selection with availability warnings (5 models: Gemini Flash/Pro, Claude Haiku/Sonnet 4.5/4.6)
- ✅ Tab persistence for async operations
- ✅ Data normalization ($B→$M, deduplication)
- ✅ Aggregated "All Clients" summary cards (sum/average logic)
- ✅ End-to-end test suite (25 tests, 100% pass)
- ✅ Chart data transform tests (43 assertions, 100% pass)
- [ ] README with setup instructions
- [ ] Deployed and accessible via public URL
- [ ] dev.to post published
