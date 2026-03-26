# 🎬 Demo Video Script — notion-kpi.sasrath.com
### KPI Tracker — Notion MCP Challenge Demo

> **Recording URL:** https://notion-kpi.sasrath.com  
> **Total suggested runtime:** 8–10 minutes  
> **Format:** Screen record + voiceover  
> **Note:** All services used are **free tier**. Limitations listed at the end of this script.

---

## 🎙️ VOICEOVER PREPARATION NOTES

- Speak slowly and clearly — you're showing a live app, not rushing
- Pause 1–2 seconds after each click to let the UI animate
- Emphasise the words marked in **bold**
- `[ACTION]` = what you do on screen
- `[SAY]` = what you say

---

## SCENE 1 — Opening (30 seconds)

`[ACTION]` Open browser to `https://notion-kpi.sasrath.com`. Let the dashboard load fully.

`[SAY]`  
> "Welcome. What you're looking at is a **KPI Tracker** — an AI-powered client quarterly performance dashboard where **Notion is the entire backend**. No traditional database. No SQL. Just Notion, connected via the official Model Context Protocol."

> "Everything I'm about to show you — the AI extraction, the forecasting, the charts — all of it stores and reads from **a free Notion workspace** using the Notion MCP."

---

## SCENE 2 — The Dashboard Overview (60 seconds)

`[ACTION]` Scroll slowly down the dashboard to show all chart rows. Then scroll back to the top.

`[SAY]`  
> "The dashboard has **nine chart types**: revenue trend, margin trends over time, EPS trends, a quarterly heatmap, a treemap, a composed chart, confidence distribution, and an AI revenue forecast."

> "At the top you'll see **KPI summary cards** — Revenue, Gross Margin, Net Margin, EPS, and Operating Income. These update in real time from Notion."

> "Right now I'm on the **All Clients** view, which aggregates all companies together. I can switch to individual clients using these filter buttons."

`[ACTION]` Click one client name (e.g., Apple). Cards and charts update.

`[SAY]`  
> "Instant. All chart data is filtered client-side — zero extra API calls when you switch."

---

## SCENE 3 — AI Model Selector (30 seconds)

`[ACTION]` Click the model dropdown at the top of the page. Show the list of models.

`[SAY]`  
> "One of the key features is **multi-model AI support**. You can switch between Google Gemini 2.5 Flash, Gemini 2.5 Pro, Gemini 2.5 Flash Lite, and Anthropic Claude Haiku or Sonnet — without restarting anything."

> "The default is **Gemini 2.5 Flash** — it's fast, accurate, and completely free within Google AI Studio's quota."

`[ACTION]` Close the dropdown without changing.

---

## SCENE 4 — Adding a Report via URL (2 minutes)

`[ACTION]` Click the **"Add Report"** tab.

`[SAY]`  
> "This is where the magic happens. I can add a quarterly earnings report in two ways — by **pasting a URL**, or by **uploading a PDF**. Let me show you the URL method first."

`[ACTION]` Paste a public earnings press release URL (e.g., Apple IR or Intel investor relations page). Click **"Extract KPIs"**.

`[SAY]`  
> "The AI fetches the page content, reads through the financial data, and **extracts all the KPIs as structured JSON** — Revenue, Gross Margin, EPS, Operating Income, and any other metrics it finds."

`[ACTION]` Wait for extraction to complete. The preview table appears.

`[SAY]`  
> "Look at this — the AI pulled out every key metric with the **quarter, year, value, unit, and a confidence score**. High confidence means it found clean numbers. Medium confidence means it inferred from context."

> "This is the **human-in-the-loop** step. I can review every KPI, edit any wrong value, delete ones I don't want, or add custom metrics the AI missed."

`[ACTION]` Edit one KPI value to show editing. Then click **"Add Custom KPI"** and add one manually.

`[SAY]`  
> "I've just added a custom KPI manually — something the AI didn't extract. Now let me confirm and save."

`[ACTION]` Click **"Save to Notion"**.

`[SAY]`  
> "Saved. Notion MCP just created a new client record, a quarterly report entry, and all these KPIs as individual database rows — using the official **21-tool Notion MCP server**."

---

## SCENE 5 — Live Dashboard Update (30 seconds)

`[ACTION]` Click back to the **"Dashboard"** tab.

`[SAY]`  
> "The dashboard now shows the new data. No refresh needed. The charts rebuilt themselves with the updated Notion data."

`[ACTION]` Click the new client's name in the filter buttons. Zoom into the charts.

`[SAY]`  
> "Revenue trend, margins, EPS — all live from Notion."

---

## SCENE 6 — AI Revenue Forecast (60 seconds)

`[ACTION]` While on an individual client view, scroll to the **"Revenue Forecast (AI)"** chart.

`[SAY]`  
> "This is the AI revenue forecast. When you first load the dashboard, a single background AI call analyses all clients' historical revenue trends and **predicts the next quarter** for each."

> "The chart shows the last **three actual quarters** and one **AI-predicted future quarter** — marked with '(F)'."

`[ACTION]` Point to the forecast bar in the chart.

`[SAY]`  
> "The AI used trend analysis on the revenue growth rate to project this number. Below the chart you'll see its reasoning — a short explanation of why it picked this value."

> "Switching between clients does **not** re-call the AI. The forecast was computed once on page load and is displayed client-side. You can force a refresh using the Refresh button."

---

## SCENE 7 — Ask AI / Natural Language Query (60 seconds)

`[ACTION]` Scroll to or click the **"Ask AI"** section in the dashboard.

`[SAY]`  
> "You can also **query your data in plain English**. Watch this."

`[ACTION]` Type a question like: "Which client had the highest revenue growth last quarter?" and submit.

`[SAY]`  
> "The AI reads from the Notion data and answers in natural language. It can compare clients, summarise trends, or flag anomalies — all from data that lives in Notion."

---

## SCENE 8 — PDF Upload (30 seconds)

`[ACTION]` Click **"Add Report"** → switch to the upload tab.

`[SAY]`  
> "The PDF upload path works the same way. Drag and drop any earnings PDF — annual report, press release, 10-Q — and the AI extracts the same structured KPIs."

> "This works especially well for reports that aren't publicly available as a URL, or older filings you have saved locally."

---

## SCENE 9 — Notion Backend (30 seconds)

`[ACTION]` Open Notion in a new tab and show the KPIs database with all the rows.

`[SAY]`  
> "This is the entire backend. Every KPI you just saw in the dashboard lives here — **in a regular Notion database**. No SQL, no Redis, no Postgres. Just Notion."

> "The app reads and writes through the **Notion MCP** — 21 tools covering search, create, update, and query operations."

`[ACTION]` Show a single KPI row in Notion with its properties (name, value, unit, quarter, confidence).

---

## SCENE 10 — Closing (30 seconds)

`[ACTION]` Switch back to the dashboard. Show the full view with multiple clients.

`[SAY]`  
> "To summarise: this is an end-to-end AI-powered KPI tracker. Reports go in through AI extraction. KPIs live in Notion. Charts render live. Forecasts run on demand. And everything runs on **free tiers** — Notion free, Google AI Studio free, and Vercel hobby."

> "The full setup takes about 10 minutes. Link to the repo and setup guide is in the description."

---

## ⚠️ Free Tier Limitations (Voice Over Section)

> Read this section near the end of the video or as a dedicated "limitations" slide:

`[SAY]`  
> "Before we wrap up, let me be transparent about the **free tier limitations** of this setup."

---

### Limitations to Voice Over:

1. **Google Gemini API (free tier)**  
   - 15 requests per minute, 1,500 requests per day  
   - Ingesting many reports quickly may hit rate limits — just wait 60 seconds and retry  
   - Flash Lite is faster and uses less quota than Flash or Pro

2. **Notion API**  
   - Free Notion plan supports unlimited API calls but has a block limit of 1,000 blocks per page  
   - For very large KPI databases (1,000+ entries), response time from Notion may increase  
   - Notion API returns data in pages by default — the app handles pagination automatically

3. **AI Accuracy**  
   - The AI extracts KPIs from publicly available text — paywalled pages or scanned PDFs with bad OCR may produce partial or incorrect results  
   - Always review the human-in-the-loop preview before saving  
   - Confidence scores indicate how certain the AI was — treat "Low" confidence values with caution

4. **Vercel Hobby Plan (deployment)**  
   - Serverless functions have a 10-second execution limit on the hobby plan  
   - AI ingestion takes 8–15 seconds — the `vercel.json` in this repo sets a 60-second timeout (requires pro plan for long routes)  
   - During demos, use the local dev server for the most reliable experience

5. **PDF Upload Size**  
   - Files larger than ~50MB may time out during upload  
   - Compressed PDFs or press releases work best — full annual reports (200+ pages) may exceed limits

6. **Revenue Forecast**  
   - Forecast requires at least 1 quarter of revenue data per client  
   - Accuracy improves significantly with 3+ quarters of history  
   - It is a statistical trend projection — not a financial advisory tool

7. **No Authentication**  
   - The current version has no login system — the dashboard is publicly accessible if deployed  
   - Suitable for personal use or demos; not recommended for sharing confidential client data publicly

---

## 📋 Checklist Before Recording

- [ ] `https://notion-kpi.sasrath.com` loads cleanly
- [ ] At least 2–3 clients already ingested with 2+ quarters each
- [ ] AI model set to Gemini 2.5 Flash (default)
- [ ] Browser zoom at 100%, dev tools closed
- [ ] Have a test earnings URL ready to paste (use a public press release)
- [ ] Have a sample PDF ready for the upload demo
- [ ] Notion workspace visible in another tab (for Scene 9)
- [ ] Screen recorder set to capture the full browser window + system audio off

---

## 🎬 Suggested Video Structure

| Time | Scene |
|------|-------|
| 0:00–0:30 | Opening + dashboard first look |
| 0:30–1:30 | Dashboard overview + client switching |
| 1:30–2:00 | AI model selector |
| 2:00–4:00 | Adding a report via URL |
| 4:00–4:30 | Dashboard live update |
| 4:30–5:30 | Revenue forecast chart |
| 5:30–6:30 | Ask AI / natural language query |
| 6:30–7:00 | PDF upload demo |
| 7:00–7:30 | Notion backend walkthrough |
| 7:30–8:00 | Limitations + closing |
