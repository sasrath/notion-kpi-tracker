# Deploying KPI Tracker to Vercel + Cloudflare ({your_domain})

## Prerequisites

- GitHub repo pushed (e.g. `github.com/sasrath/notion-kpi-tracker`)
- [Vercel account](https://vercel.com) (free tier works)
- Cloudflare account managing **{your_domain}**
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

> **Note**: `NOTION_MODE` and `VERCEL` are auto-set by Vercel — no need to add them.

### 1.3 Redeploy

After adding env vars, go to **Deployments** → click the three-dot menu on the latest deployment → **Redeploy**.

### 1.4 Verify

Your app is now live at `https://notion-kpi-tracker-<hash>.vercel.app`. Test:

| Route | What to check |
|-------|---------------|
| `/demo` | Static page loads with Intel/Apple/Nvidia data, no API calls |
| `/` | Main dashboard loads, shows live Notion data |
| `/api/health` | Returns `{ status: "ok" }` |

---

## Part 2 — Connect Cloudflare Domain ({your_domain})

You have two options: deploy the full app at `{your_domain}`, or use subdomains/paths.

### Option A — Full domain ({your_domain} → Vercel)

> Use this if {your_domain} is dedicated to the KPI Tracker.

#### 2A.1 Add Domain in Vercel

1. Go to **Project Settings → Domains**
2. Add `{your_domain}`
3. Vercel will show the required DNS records

#### 2A.2 Configure Cloudflare DNS

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com) → select **{your_domain}**
2. Go to **DNS → Records**
3. Add the record Vercel provides:

   | Type | Name | Content | Proxy |
   |------|------|---------|-------|
   | CNAME | `@` | `cname.vercel-dns.com` | **DNS only** (grey cloud) |

   > **Important**: Set proxy to **DNS only** (grey cloud icon). Vercel needs direct DNS resolution for SSL provisioning. Once SSL is issued you can optionally turn the orange cloud back on.

4. If you also want `www.{your_domain}`:

   | Type | Name | Content | Proxy |
   |------|------|---------|-------|
   | CNAME | `www` | `cname.vercel-dns.com` | **DNS only** |

#### 2A.3 Disable Cloudflare SSL Conflicts

1. In Cloudflare → **SSL/TLS → Overview**, set mode to **Full (strict)**
2. Go to **SSL/TLS → Edge Certificates** → disable **Always Use HTTPS** (Vercel handles this)
3. Under **Rules → Page Rules**, if you have any conflicting redirects for {your_domain}, remove them

#### 2A.4 Verify

- Wait 1-5 minutes for DNS propagation
- Visit `https://{your_domain}` — should show the main dashboard
- Visit `https://{your_domain}/demo` — static demo page

---

### Option B — Subdomain (kpi.{your_domain} → Vercel)

> Use this if {your_domain} already hosts other content (portfolio, blog, etc.)

#### 2B.1 Add Domain in Vercel

1. Go to **Project Settings → Domains**
2. Add `kpi.{your_domain}`

#### 2B.2 Configure Cloudflare DNS

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| CNAME | `kpi` | `cname.vercel-dns.com` | **DNS only** (grey cloud) |

#### 2B.3 Verify

- `https://notion-kpi.{your_domain}/demo` → static showcase
- `https://notion-kpi.{your_domain}/` → main dashboard (live Notion data)

---

## Route Summary for Sharing

| URL | Audience | Access |
|-----|----------|--------|
| `notion-kpi.{your_domain}` | Public / blog visitors | Open — `/demo` with static data |
| `notion-kpi.{your_domain}/` | You (admin) | Full dashboard — live Notion data |

---

## Troubleshooting

### SSL certificate errors
→ Ensure Cloudflare proxy is set to **DNS only** (grey cloud) for the Vercel CNAME. After Vercel provisions its SSL cert (usually within minutes), you can re-enable the orange cloud if needed.

### Notion rate limiting
→ In-memory caching (5-min TTL) is already active on `/api/kpis` and `/api/clients`. Multiple judges hitting the dashboard simultaneously will be served from cache.

### Static demo page not updating
→ `/demo` is statically generated at build time. To update the hardcoded data, edit `app/demo/page.jsx` and redeploy.

### DNS taking long to propagate
→ Cloudflare DNS changes typically propagate in under 5 minutes. You can check with:
```bash
dig {your_domain} CNAME +short
# Should return: cname.vercel-dns.com.
```
