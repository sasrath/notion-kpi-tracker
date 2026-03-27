# 📊 KPI Tracker — Powered by Notion MCP

> AI-powered client quarterly performance tracker with multi-model support (Google Gemini + Anthropic Claude), 11+ interactive charts, AI revenue forecasting, and Notion as the sole backend. Zero traditional database.

**Built for the [dev.to Notion MCP Challenge](https://dev.to/challenges/notion-2026-03-04)**

---

## ✨ Features

- 🤖 **AI Report Ingestion** — paste a URL or drag-and-drop a PDF, AI extracts KPIs automatically
- 📊 **Interactive Dashboard** — 11+ chart types (Area, Bar, Line, Pie, Heatmap, Treemap, Composed & more)
- 🔮 **AI Revenue Forecasting** — trend-based next-quarter revenue predictions per client
- 🧠 **Multi-Model AI** — choose from 5 models: Gemini 2.5 Flash/Pro, Claude Haiku 4.5, Sonnet 4.5/4.6
- ✋ **Human-in-the-Loop** — review and edit extracted KPIs before anything saves to Notion
- 🔄 **Drag-and-Drop Charts** — reorder dashboard charts by dragging; order persists across sessions
- 📌 **Pin KPI Charts** — click any KPI in the table to view its trend, then pin it to the dashboard
- ➕ **Custom KPIs** — manually add metrics the AI missed
- 💬 **Ask AI** — query your data in natural language
- 📈 **All Clients Aggregation** — summary cards intelligently aggregate across all clients
- 💰 **Smart $B Formatting** — revenue values ≥ $1,000M auto-display as $B (e.g., $12.7B)
- �️ **Static Demo** — try the app at `/demo` with pre-loaded Intel/Apple/Nvidia data, no API keys needed
- 🔒 **Secure** — API keys never touch the browser; prompt injection detection built-in

---

## 🖼️ Dashboard Preview

The dashboard includes 11+ drag-and-drop charts:

| Charts |
|--------|
| Revenue Trend (Area) · Revenue Forecast AI (Bar) |
| Margin Trends (Line) · EPS Trends (Line) |
| Segment Revenue Breakdown (Stacked Bar, span 2) |
| KPI Distribution (Pie) · Confidence Distribution (Pie) |
| QoQ Performance Heatmap · Revenue vs Margins (Composed) |
| KPI Gauges (Horizontal Bar) · KPI Landscape (Treemap, span 2) |
| + User-Pinned KPI Charts (dynamic, from KPI table) |

---

## 🚀 Getting Started

### Prerequisites

- [Node.js 18+](https://nodejs.org)
- [Notion account](https://notion.so) (free)
- At least one AI provider API key:
  - [Google AI Studio](https://aistudio.google.com/apikey) (recommended — Gemini 2.5 Flash is the default model)
  - [Anthropic Console](https://console.anthropic.com) (optional — for Claude models)

---

### 1. Clone the repo

```bash
git clone https://github.com/sasrath/notion-kpi-tracker.git
cd notion-kpi-tracker
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up Notion

**a) Create a Notion Integration**
1. Go to [notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Click "New integration"
3. Name it "KPI Tracker", select your workspace
4. Copy the **Internal Integration Token** (starts with `ntn_`)

**b) Run the automated setup script**
```bash
node setup-notion.mjs
```
This creates the 3 required databases (Clients, Quarterly Reports, KPIs) under your Notion page and prints the database IDs.

**c) Or set up manually**
1. Create 3 databases in Notion: **Clients**, **Quarterly Reports**, **KPIs**
2. Connect the integration to all 3 databases (`···` → Connections → Add connection)
3. Copy each database ID from its URL: `https://notion.so/myworkspace/{DATABASE_ID}?v=...`

### 4. Configure environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```bash
# AI Providers (at least one required)
GOOGLE_API_KEY=AIza...                # From aistudio.google.com/apikey
ANTHROPIC_API_KEY=sk-ant-...          # From console.anthropic.com (optional)

# Notion
NOTION_API_KEY=ntn_...                # From notion.so/my-integrations
NOTION_PARENT_PAGE_ID=...             # Parent page for auto-setup (optional)
NOTION_CLIENTS_DB_ID=abc123...        # Clients database ID
NOTION_REPORTS_DB_ID=def456...        # Quarterly Reports database ID
NOTION_KPIS_DB_ID=ghi789...          # KPIs database ID
```

### 5. Run the app

```bash
npm run dev
```

Open [http://localhost:3010](http://localhost:3010)

---

## 🏗️ How It Works

```
User pastes report URL  ──or──  User drags-and-drops a PDF
              ↓                            ↓
     AI fetches + reads               pdf-parse extracts text
              ↓                            ↓
              └──────────┬─────────────────┘
                         ↓
          AI extracts KPIs as structured JSON
                         ↓
          User reviews and confirms (human-in-the-loop)
                         ↓
          Data saved to Notion via MCP (21 tools)
                         ↓
          Dashboard reads from Notion → renders live charts
                         ↓
          AI forecasts next-quarter revenue from trends
```

Notion acts as the **sole backend** — no traditional database required.

---

## 📁 Project Structure

```
notion-kpi-tracker/
├── app/
│   ├── layout.jsx              # Root layout
│   ├── page.jsx                # Main dashboard (client component)
│   ├── globals.css             # Tailwind + custom styles
│   ├── demo/page.jsx           # Static demo page (Intel/Apple/Nvidia)
│   ├── health/page.jsx         # Health check page
│   └── api/
│       ├── clients/route.js    # GET clients from Notion
│       ├── kpis/route.js       # GET KPIs from Notion
│       ├── kpis/delete/route.js# DELETE a KPI
│       ├── ingest/route.js     # POST URL → AI extraction
│       ├── ingest/confirm/route.js # POST confirmed KPIs → Notion
│       ├── upload/route.js     # POST PDF → AI extraction
│       ├── query/route.js      # POST natural language query
│       ├── forecast/route.js   # POST revenue forecast
│       ├── models/route.js     # GET available AI models
│       ├── custom-kpi/route.js # POST manual KPI entry
│       └── health/route.js     # GET system health
├── lib/
│   ├── llm.js                  # Multi-model AI (Gemini + Claude), safeParseJSON
│   ├── notion.js               # Notion API client (direct SDK)
│   ├── notion-mcp.js           # Notion MCP client (21 tools, hybrid)
│   ├── transforms.js           # 19 data transform functions for charts
│   ├── cache.js                # In-memory cache (5 min TTL) with invalidation
│   └── demo-data.js            # Static demo datasets (Intel/Apple/Nvidia)
├── lib/tests/
│   ├── test-e2e-full.mjs       # 65 comprehensive E2E API tests
│   ├── test-dashboard-flow.mjs # 17 dashboard flow tests
│   ├── test-charts.mjs         # 43 chart data assertions
│   ├── test-json-repair.mjs    # 6 JSON truncation repair tests
│   ├── test-e2e.mjs            # Legacy end-to-end API tests
│   └── test-mcp.mjs            # MCP connection tests
├── docs/
│   ├── ARCHITECTURE.md         # System architecture (v2.0)
│   ├── PLAN.md                 # Build milestones (v3.0)
│   ├── PRD.md                  # Product requirements (v2.0)
│   └── AI_RULES.md             # AI guardrails & prompts (v2.0)
├── setup-notion.mjs            # Auto-creates Notion databases
├── next.config.mjs
├── package.json
├── tailwind.config.js
└── jsconfig.json
```

---

## 🧪 Testing

```bash
# Comprehensive E2E tests (77 tests, requires running server)
npm run dev &
node lib/tests/test-e2e-full.mjs

# Chart data transforms (70 assertions)
node lib/tests/test-charts.mjs

# JSON repair for truncated AI responses (6 tests)
node lib/tests/test-json-repair.mjs
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15.1 (App Router) |
| Frontend | React 19, Tailwind CSS 3.4 |
| Charts | Recharts 2.13 (11+ chart types) |
| Drag-and-Drop | @dnd-kit/core + @dnd-kit/sortable |
| AI (default) | Google Gemini 2.5 Flash |
| AI (alternative) | Anthropic Claude Haiku 4.5 / Sonnet 4.5 / Sonnet 4.6 |
| Backend/DB | Notion (via MCP + direct SDK, hybrid approach) |
| MCP | @modelcontextprotocol/sdk 1.27, @notionhq/notion-mcp-server 2.2 |
| PDF Parsing | pdf-parse |
| Deployment | Vercel (recommended) |

---

## 🚢 Deploy to Vercel

1. Push this repo to GitHub
2. Import the repo at [vercel.com/new](https://vercel.com/new)
3. Add all environment variables from `.env.local` in **Project → Settings → Environment Variables**
4. Deploy — Vercel auto-detects Next.js and builds automatically

> **Tip:** AI ingestion calls may take 10-15s. Consider increasing the function timeout in Vercel project settings if you experience timeouts.

---

## 🔧 Troubleshooting

**"Failed to fetch clients from Notion"**
→ Check your `NOTION_API_KEY` and ensure the integration is connected to your databases.

**"Extraction failed after 2 attempts"**
→ The report URL may be behind a paywall or not publicly accessible. Try a direct press release URL.

**"No API key configured for {model}"**
→ Add the required API key (`GOOGLE_API_KEY` or `ANTHROPIC_API_KEY`) to `.env.local`. Models without keys show "(no API key)" in the dropdown.

**"Unable to parse AI response as JSON"**
→ The AI response was truncated. The built-in `safeParseJSON` auto-repairs most truncation patterns. If it persists, try a different model or shorter report.

**Charts not showing**
→ You need at least 2 quarters of data for trend charts to render meaningfully.

**Forecast shows "No forecast data"**
→ Revenue KPIs are required. Ingest at least one report with revenue data, then refresh the page.

---

## 📄 License

MIT
