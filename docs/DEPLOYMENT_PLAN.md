# Deployment Plan — KPI Tracker

## Current State
- **Framework**: Next.js 15 (React 19, App Router)
- **Port**: 3010 (local dev)
- **Backend**: Notion DB via MCP (local) / direct SDK (Vercel)
- **AI**: Google Gemini + Anthropic Claude (multi-model)
- **Domain**: sasrath.com

---

## Route Architecture

| Route | Purpose | AI Access | Data Source | Auth |
|-------|---------|-----------|-------------|------|
| `/` | Main dashboard (existing) | Full | Notion (live) | — |
| `/demo` | Static showcase for sasrath.com | **None** | Hardcoded (Intel, Apple, Nvidia 10-Q/10-K 2025-26) | — |
| `/judges` | Full-featured playground for judges | Full | Notion (live) | — |

### `/demo` — Static Showcase
- Hardcoded KPI data for Intel, Apple, Nvidia (FY 2025-26 quarterly)
- All charts render from static data — no API calls
- No "Add Report", "Custom KPI", or "Ask AI" tabs
- Read-only: no delete, no ingest, no forecast
- Suitable for embedding / iframe on sasrath.com

### `/judges` — Judge Playground
- Full functionality identical to `/` (main dashboard)
- Persistent disclaimer banner: _"Only free API keys are added, functionality limited"_
- Connected to live Notion data + AI models

---

## In-Memory Caching (No Redis)

Added to `/api/kpis` and `/api/clients` route handlers:

```
Request flow:
  Judge 1 → fetches from Notion → stores in Map() cache (5 min TTL)
  Judges 2-10 within 5 min → served from memory instantly → 0 Notion calls
```

- **Implementation**: `Map()` with timestamp-based TTL (5 minutes)
- **Cache key**: Serialized from query params (kpis) or fixed string (clients)
- **Invalidation**: Automatic after TTL expires; cache is per-process (resets on deploy)
- **Trade-off**: Serverless functions on Vercel spin up separate instances, so cache is per-instance. Still effective for burst traffic from multiple judges loading simultaneously.

---

## Deployment Steps

### 1. Local Development
```bash
npm run dev          # runs on port 3010
```

### 2. Vercel Production
- Push to `main` → auto-deploy via Vercel
- Environment variables set in Vercel dashboard:
  - `NOTION_API_KEY`, `NOTION_CLIENTS_DB_ID`, `NOTION_REPORTS_DB_ID`, `NOTION_KPIS_DB_ID`
  - `GOOGLE_API_KEY`, `ANTHROPIC_API_KEY`
  - `NOTION_MODE=sdk` (auto-detected on Vercel)

### 3. Custom Domain (sasrath.com)
- Add custom domain in Vercel project settings
- Point DNS (CNAME or A record) to Vercel
- `/demo` page serves as the public-facing showcase
- `/judges` page shared privately with judges

### 4. Function Timeouts (vercel.json)
Already configured:
- Ingest/Upload/Forecast: 60s
- Confirm/Query: 30s

---

## UI Changes Summary
- "All Clients" filter button → "All Entities" (CEO tracks clients + competition)
- New `/demo` route — static showcase page
- New `/judges` route — full app with disclaimer banner
- In-memory caching on `/api/kpis` and `/api/clients`
- Dev port updated to 3010
