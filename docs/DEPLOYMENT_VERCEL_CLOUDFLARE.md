# Deploying KPI Tracker to Vercel + Cloudflare (sasrath.com)

## Prerequisites

- GitHub repo pushed (e.g. `github.com/sasrath/notion-kpi-tracker`)
- [Vercel account](https://vercel.com) (free tier works)
- Cloudflare account managing **sasrath.com**
- Notion integration token + database IDs (see `.env.example`)

---

## Part 1 — Deploy to Vercel

### 1.1 Import Project

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click **Import Git Repository** → select `notion-kpi-tracker`
3. Framework preset: **Next.js** (auto-detected)
4. Root directory: `/` (default)
5. Click **Deploy** — it will fail the first time because env vars are missing. That's fine.

### 1.2 Add Environment Variables

Go to **Project Settings → Environment Variables** and add:

| Variable | Value | Required |
|----------|-------|----------|
| `GOOGLE_API_KEY` | Your Gemini API key | Yes (or Anthropic) |
| `ANTHROPIC_API_KEY` | Your Claude API key | Optional |
| `NOTION_API_KEY` | Notion integration token | Yes |
| `NOTION_CLIENTS_DB_ID` | Clients database ID | Yes |
| `NOTION_REPORTS_DB_ID` | Reports database ID | Yes |
| `NOTION_KPIS_DB_ID` | KPIs database ID | Yes |
| `JUDGES_PASSWORD` | Password for `/judges` page | Yes |

> **Note**: `NOTION_MODE` and `VERCEL` are auto-set by Vercel — no need to add them.

### 1.3 Redeploy

After adding env vars, go to **Deployments** → click the three-dot menu on the latest deployment → **Redeploy**.

### 1.4 Verify

Your app is now live at `https://notion-kpi-tracker-<hash>.vercel.app`. Test:

| Route | What to check |
|-------|---------------|
| `/demo` | Static page loads with Intel/Apple/Nvidia data, no API calls |
| `/judges` | Password prompt appears, correct password shows full dashboard |
| `/` | Main dashboard loads, shows live Notion data |
| `/api/health` | Returns `{ status: "ok" }` |

---

## Part 2 — Connect Cloudflare Domain (sasrath.com)

You have two options: deploy the full app at `sasrath.com`, or use subdomains/paths.

### Option A — Full domain (sasrath.com → Vercel)

> Use this if sasrath.com is dedicated to the KPI Tracker.

#### 2A.1 Add Domain in Vercel

1. Go to **Project Settings → Domains**
2. Add `sasrath.com`
3. Vercel will show the required DNS records

#### 2A.2 Configure Cloudflare DNS

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com) → select **sasrath.com**
2. Go to **DNS → Records**
3. Add the record Vercel provides:

   | Type | Name | Content | Proxy |
   |------|------|---------|-------|
   | CNAME | `@` | `cname.vercel-dns.com` | **DNS only** (grey cloud) |

   > **Important**: Set proxy to **DNS only** (grey cloud icon). Vercel needs direct DNS resolution for SSL provisioning. Once SSL is issued you can optionally turn the orange cloud back on.

4. If you also want `www.sasrath.com`:

   | Type | Name | Content | Proxy |
   |------|------|---------|-------|
   | CNAME | `www` | `cname.vercel-dns.com` | **DNS only** |

#### 2A.3 Disable Cloudflare SSL Conflicts

1. In Cloudflare → **SSL/TLS → Overview**, set mode to **Full (strict)**
2. Go to **SSL/TLS → Edge Certificates** → disable **Always Use HTTPS** (Vercel handles this)
3. Under **Rules → Page Rules**, if you have any conflicting redirects for sasrath.com, remove them

#### 2A.4 Verify

- Wait 1-5 minutes for DNS propagation
- Visit `https://sasrath.com` — should show the main dashboard
- Visit `https://sasrath.com/demo` — static demo page
- Visit `https://sasrath.com/judges` — password-gated judges page

---

### Option B — Subdomain (kpi.sasrath.com → Vercel)

> Use this if sasrath.com already hosts other content (portfolio, blog, etc.)

#### 2B.1 Add Domain in Vercel

1. Go to **Project Settings → Domains**
2. Add `kpi.sasrath.com`

#### 2B.2 Configure Cloudflare DNS

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| CNAME | `kpi` | `cname.vercel-dns.com` | **DNS only** (grey cloud) |

#### 2B.3 Verify

- `https://kpi.sasrath.com/demo` → static showcase
- `https://kpi.sasrath.com/judges` → password-gated full app

---

## Route Summary for Sharing

| URL | Audience | Access |
|-----|----------|--------|
| `sasrath.com/demo` | Public / portfolio visitors | Open — static data only |
| `sasrath.com/judges` | Hackathon judges | Password-protected — full AI features |
| `sasrath.com/` | You (admin) | Full dashboard — same as judges but no banner |

---

## Troubleshooting

### "Password not configured on server"
→ `JUDGES_PASSWORD` env var is missing in Vercel. Add it and redeploy.

### SSL certificate errors
→ Ensure Cloudflare proxy is set to **DNS only** (grey cloud) for the Vercel CNAME. After Vercel provisions its SSL cert (usually within minutes), you can re-enable the orange cloud if needed.

### Notion rate limiting
→ In-memory caching (5-min TTL) is already active on `/api/kpis` and `/api/clients`. Multiple judges hitting the dashboard simultaneously will be served from cache.

### Static demo page not updating
→ `/demo` is statically generated at build time. To update the hardcoded data, edit `app/demo/page.jsx` and redeploy.

### DNS taking long to propagate
→ Cloudflare DNS changes typically propagate in under 5 minutes. You can check with:
```bash
dig sasrath.com CNAME +short
# Should return: cname.vercel-dns.com.
```
