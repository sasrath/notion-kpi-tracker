# 🛠️ KPI Tracker — Step-by-Step Setup Guide

> Everything is **free**. No credit card. No paid services required.  
> You'll need: a Notion account, a Google account, and Node.js installed.

---

## What You're Setting Up

```
Your Computer (Next.js App)
        ↕
   Notion (free) ← stores all data
        ↕
  Google Gemini API (free tier) ← powers the AI
```

---

## Step 1 — Get the Code

Open your terminal and run:

```bash
git clone https://github.com/sasrath/notion-kpi-tracker.git
cd notion-kpi-tracker
npm install
```

> **Dialogue:** "We start by cloning the repo and installing dependencies. This takes about 30 seconds."

---

## Step 2 — Create a Free Google Gemini API Key

1. Open [aistudio.google.com/apikey](https://aistudio.google.com/apikey) in your browser
2. Sign in with your Google account
3. Click **"Create API Key"**
4. Select any existing project (or click "Create project in a new project")
5. Copy the key — it looks like `AIzaSy...`

> **Dialogue:** "Google AI Studio gives you a free API key to Gemini 2.5 Flash — the default model we use. No billing setup required."

---

## Step 3 — Create a Free Notion Account & Integration

### 3a. Sign Up for Notion (skip if you already have an account)
- Go to [notion.so](https://notion.so) → click **"Get Notion Free"**
- Sign up with email or Google

### 3b. Create an Integration
1. Go to [notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Click **"+ New integration"**
3. Name it: `KPI Tracker`
4. Workspace: select your workspace
5. Capabilities: leave defaults (read + update + insert)
6. Click **"Save"**
7. Copy the **Internal Integration Token** — it looks like `ntn_...`

> **Dialogue:** "Notion integrations are how external apps connect to your Notion workspace. This token is your app's password to your databases."

---

## Step 4 — Set Up Notion Databases (Automated)

### 4a. Create a Notion Page as the parent
1. Open Notion
2. Click **"+ New page"** in the sidebar
3. Name it: `KPI Tracker Data`
4. Copy the page ID from the URL:  
   `https://notion.so/myworkspace/KPI-Tracker-Data-{PAGE_ID}?...`  
   The page ID is the long string before the `?`

### 4b. Run the auto-setup script
```bash
NOTION_API_KEY=ntn_YOUR_KEY_HERE node setup-notion.mjs
```

This automatically creates 3 databases inside your page:
- **Clients** — company names
- **Quarterly Reports** — report metadata
- **KPIs** — extracted metrics

It prints 3 database IDs. Copy them for the next step.

> **Dialogue:** "Instead of manually creating databases, the setup script builds everything for you in seconds."

### 4c. Connect integration to databases (important!)
1. Open each of the 3 new databases in Notion
2. Click the **···** (three dots) in the top right
3. Go to **"Connections"** → **"Add connections"**
4. Search for `KPI Tracker` and click to add
5. Repeat for all 3 databases

---

## Step 5 — Configure Environment Variables

```bash
cp .env.example .env.local
```

Open `.env.local` in a text editor and fill it in:

```bash
# AI Provider (minimum — Gemini is free)
GOOGLE_API_KEY=AIzaSy...              # From Step 2

# Notion
NOTION_API_KEY=ntn_...                # From Step 3b
NOTION_CLIENTS_DB_ID=abc123...        # From Step 4b (auto-setup output)
NOTION_REPORTS_DB_ID=def456...        # From Step 4b
NOTION_KPIS_DB_ID=ghi789...           # From Step 4b
```

> **Dialogue:** "All keys live in a local `.env.local` file — they never leave your machine during development."

---

## Step 6 — Start the App

```bash
npm run dev
```

Open [http://localhost:3010](http://localhost:3010) in your browser.

You should see the KPI Tracker dashboard — empty, ready for your first report.

> **Dialogue:** "The app starts on port 3010. First load may take a few seconds as Next.js compiles."

---

## Step 7 — Add Your First Client Report

1. Click **"Add Report"** tab at the top
2. Paste a public quarterly earnings URL  
   *(e.g., an Apple or Intel press release from their investor relations page)*
3. The AI automatically extracts KPIs
4. Review the extracted KPIs — edit or remove any incorrect values
5. Click **"Save to Notion"**

Within 1–2 seconds you'll see the dashboard populate with live chart data.

> **Dialogue:** "The human-in-the-loop review step is key — you approve what gets saved. Nothing goes to Notion without your confirmation."

---

## Step 8 — Verify Everything Works

Run the test suite to confirm end-to-end connectivity:

```bash
# In a second terminal (keep npm run dev running)
node lib/tests/test-charts.mjs       # 43 chart tests
node lib/tests/test-json-repair.mjs  # 6 JSON repair tests
```

Both should show all tests passing.

---

## ⚠️ Free Tier Limitations

| Service | Free Tier Limit | Impact |
|---------|----------------|--------|
| **Google Gemini API** | 15 req/min, 1,500 req/day | ~250 reports/day before rate limiting |
| **Notion API (free plan)** | 1,000 blocks/page, API rate limits | Large databases (1000+ KPIs) may slow down |
| **Notion free plan** | Unlimited pages, unlimited API calls | No block limit concerns for typical use |
| **Vercel (hobby)** | 100 GB bandwidth/mo, 10s serverless timeout | AI ingestion may need timeout increase |
| **PDF upload** | Max ~50MB files via UI | Larger PDFs need URL method |

---

## Troubleshooting Quick Reference

| Error | Fix |
|-------|-----|
| "Failed to fetch clients" | Check `NOTION_API_KEY` and re-add integration to all 3 databases |
| "Extraction failed after 2 attempts" | URL is behind a paywall — try a direct press release URL |
| "No API key configured" | Add `GOOGLE_API_KEY` to `.env.local` |
| Charts not showing | Add at least 2 quarters of data for trend charts |
| "Unable to parse AI response" | Try a different AI model in the model dropdown |

---

## Optional: Add Claude AI Models

If you want to use Claude Haiku or Sonnet:

1. Create a free account at [console.anthropic.com](https://console.anthropic.com)
2. Generate an API key
3. Add to `.env.local`:
   ```bash
   ANTHROPIC_API_KEY=sk-ant-...
   ```
4. Restart the dev server — Claude models will appear in the model dropdown

> **Note:** Anthropic offers $5 free credits on signup. After that, Claude models are pay-per-use.
