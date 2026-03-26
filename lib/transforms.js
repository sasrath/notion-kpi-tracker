// ─── CONSTANTS + MATCHING ─────────────────────────────────────────

const QUARTER_ORDER = { Q1: 1, Q2: 2, Q3: 3, Q4: 4 };

const SUMMARY_KPIS = [
  { key: "Revenue",        match: (n) => /^revenue$/i.test(n) },
  { key: "Gross Margin",   match: (n) => /gross\s*margin/i.test(n) },
  { key: "Net Margin",     match: (n) => /net\s*margin/i.test(n) },
  { key: "EPS",            match: (n) => /^eps/i.test(n) || /earnings\s*per\s*share/i.test(n) },
  { key: "Operating Income", match: (n) => /operating\s*(income|profit)/i.test(n) },
  { key: "Customer Count", match: (n) => /customer\s*(count|number)/i.test(n) },
];

function matchSummaryKPI(kpiName) {
  for (const s of SUMMARY_KPIS) {
    if (s.match(kpiName)) return s.key;
  }
  return null;
}

// ─── UNIT NORMALIZATION — convert $B/$T to $M so charts compare apples-to-apples ──

function normalizeKPI(kpi) {
  if (kpi.value == null) return kpi;
  const u = (kpi.unit ?? "").trim();

  // $B or "billion" → multiply by 1000 → $M
  if (/^\$B$/i.test(u) || /^billion$/i.test(u)) {
    return { ...kpi, value: kpi.value * 1000, unit: "$M" };
  }
  // "billion $" or "billion $M" etc → value is already in billions
  if (/billion\s*\$/i.test(u)) {
    return { ...kpi, value: kpi.value * 1000, unit: "$M" };
  }
  // $T or "trillion" → multiply by 1,000,000 → $M
  if (/^\$T$/i.test(u) || /^trillion$/i.test(u)) {
    return { ...kpi, value: kpi.value * 1_000_000, unit: "$M" };
  }
  // Bare "B" for financial KPIs → multiply by 1000 → $M
  if (/^B$/i.test(u)) {
    const canonical = matchSummaryKPI(kpi.name);
    if (canonical === "Revenue" || canonical === "Operating Income") {
      return { ...kpi, value: kpi.value * 1000, unit: "$M" };
    }
  }
  // "billion" anywhere in unit → treat as B
  if (/billion/i.test(u)) {
    return { ...kpi, value: kpi.value * 1000, unit: "$M" };
  }
  // Raw $ with very large values → convert to $M
  // (e.g., revenue of 8050000000 in unit "$" means raw dollars)
  if (/^\$$/i.test(u) && Math.abs(kpi.value) >= 1_000_000) {
    return { ...kpi, value: Math.round(kpi.value / 1_000_000), unit: "$M" };
  }
  return kpi;
}

// ─── DEDUPLICATION — one entry per client + canonical name + quarter + year ──

export function deduplicateKPIs(kpis) {
  const normalized = kpis.map(normalizeKPI);
  const seen = new Map();
  for (const kpi of normalized) {
    const canonical = matchSummaryKPI(kpi.name) ?? kpi.name.toLowerCase().trim();
    const key = `${kpi.clientId}|${canonical}|${kpi.quarter}|${kpi.year}`;
    seen.set(key, kpi);
  }
  return [...seen.values()];
}

// ─── GROUP KPIs by client → year → quarter ───────────────────────

export function groupKPIs(kpis, clients) {
  const clientMap = Object.fromEntries(clients.map((c) => [c.id, c.name]));

  const grouped = {};

  for (const kpi of kpis) {
    const clientName = clientMap[kpi.clientId] ?? "Unknown";
    if (!grouped[clientName]) grouped[clientName] = {};
    if (!grouped[clientName][kpi.year]) grouped[clientName][kpi.year] = {};
    if (!grouped[clientName][kpi.year][kpi.quarter]) {
      grouped[clientName][kpi.year][kpi.quarter] = [];
    }
    grouped[clientName][kpi.year][kpi.quarter].push(kpi);
  }

  return grouped;
}

// ─── REVENUE FORECAST INPUT (for AI forecasting) ─────────────────

export function getRevenueForecastInput(kpis, clients) {
  const clientMap = Object.fromEntries(clients.map((c) => [c.id, c.name]));
  const revenueKPIs = kpis.filter((k) => {
    const canonical = matchSummaryKPI(k.name);
    return canonical === "Revenue";
  });

  const byClient = {};
  for (const k of revenueKPIs) {
    const name = clientMap[k.clientId] ?? "Unknown";
    if (!byClient[name]) byClient[name] = [];
    byClient[name].push({
      quarter: k.quarter,
      year: k.year,
      value: k.value,
      unit: k.unit,
    });
  }

  // Sort each client's data chronologically and keep only last 4 quarters
  for (const name of Object.keys(byClient)) {
    byClient[name].sort(
      (a, b) => (a.year * 10 + (QUARTER_ORDER[a.quarter] ?? 0)) - (b.year * 10 + (QUARTER_ORDER[b.quarter] ?? 0))
    );
    byClient[name] = byClient[name].slice(-4);
  }

  return byClient;
}

// ─── BUILD FORECAST CHART DATA ───────────────────────────────────

export function buildForecastChartData(kpis, clients, forecasts) {
  const clientMap = Object.fromEntries(clients.map((c) => [c.id, c.name]));
  const revenueKPIs = kpis.filter((k) => {
    const canonical = matchSummaryKPI(k.name);
    return canonical === "Revenue";
  });

  const allClients = [...new Set(revenueKPIs.map((k) => clientMap[k.clientId] ?? "Unknown"))];

  // Collect actual periods, sorted, then keep only last 3
  const periodMap = new Map();
  for (const k of revenueKPIs) {
    const name = clientMap[k.clientId] ?? "Unknown";
    const period = `${k.quarter} ${k.year}`;
    const sortKey = k.year * 10 + (QUARTER_ORDER[k.quarter] ?? 0);
    if (!periodMap.has(period)) periodMap.set(period, { period, sortKey });
    periodMap.get(period)[name] = k.value;
  }

  let actuals = [...periodMap.values()].sort((a, b) => a.sortKey - b.sortKey);
  actuals = actuals.slice(-4); // last 4 quarters only

  // Add the single forecast period per client.
  // Only match by name — never fall back to assigning unrelated forecasts.
  // Deduplicate: one forecast point per client (take the first match).
  const forecastEntries = [];
  const forecastedClients = new Set(); // guard against duplicates from AI
  for (const fc of forecasts) {
    const fcName = (fc.client ?? "").toLowerCase();
    const matchedClient = allClients.find((c) => {
      const cl = c.toLowerCase();
      return cl === fcName || cl.includes(fcName) || fcName.includes(cl);
    });
    if (!matchedClient) continue;          // no name match — skip entirely
    if (forecastedClients.has(matchedClient)) continue; // already have a forecast for this client
    forecastedClients.add(matchedClient);
    const period = `${fc.nextQuarter} ${fc.nextYear} (F)`;
    const sortKey = fc.nextYear * 10 + (QUARTER_ORDER[fc.nextQuarter] ?? 0);
    const existing = forecastEntries.find((e) => e.period === period);
    if (existing) {
      existing[matchedClient] = fc.forecastValue;
    } else {
      forecastEntries.push({ period, sortKey, _forecast: true, [matchedClient]: fc.forecastValue });
    }
  }

  const chartData = [...actuals, ...forecastEntries].sort((a, b) => a.sortKey - b.sortKey);
  return { chartData, clientNames: allClients };
}

// ─── GET REVENUE TREND for line chart ────────────────────────────

export function getRevenueTrend(kpis, clients) {
  const clientMap = Object.fromEntries(clients.map((c) => [c.id, c.name]));

  // Find all revenue KPIs
  const revenueKPIs = kpis.filter((k) =>
    k.name.toLowerCase().includes("revenue")
  );

  // Group by client
  const byClient = {};
  for (const kpi of revenueKPIs) {
    const name = clientMap[kpi.clientId] ?? "Unknown";
    if (!byClient[name]) byClient[name] = [];
    byClient[name].push({
      period: `${kpi.quarter} ${kpi.year}`,
      quarter: kpi.quarter,
      year: kpi.year,
      value: kpi.value,
      sortKey: kpi.year * 10 + (QUARTER_ORDER[kpi.quarter] ?? 0),
    });
  }

  // Sort each client's data chronologically
  for (const name of Object.keys(byClient)) {
    byClient[name].sort((a, b) => a.sortKey - b.sortKey);
  }

  // Build periods list (union of all periods)
  const allPeriods = [
    ...new Set(revenueKPIs.map((k) => ({
      label: `${k.quarter} ${k.year}`,
      sort: k.year * 10 + (QUARTER_ORDER[k.quarter] ?? 0),
    })).map(JSON.stringify)),
  ]
    .map(JSON.parse)
    .sort((a, b) => a.sort - b.sort)
    .map((p) => p.label);

  // Build recharts-compatible dataset
  const chartData = allPeriods.map((period) => {
    const row = { period };
    for (const [clientName, points] of Object.entries(byClient)) {
      const match = points.find((p) => p.period === period);
      row[clientName] = match ? match.value : null;
    }
    return row;
  });

  return { chartData, clientNames: Object.keys(byClient) };
}

// ─── GET LATEST KPI SUMMARY CARDS ────────────────────────────────

export function getLatestSummary(kpis, clients, selectedClientId = null) {
  const clientMap = Object.fromEntries(clients.map((c) => [c.id, c.name]));

  let filtered = kpis;
  if (selectedClientId) {
    filtered = kpis.filter((k) => k.clientId === selectedClientId);
  }

  // For a single client (or if only one client exists), show the latest value
  const uniqueClients = [...new Set(filtered.map((k) => k.clientId))];
  const isMultiClient = !selectedClientId && uniqueClients.length > 1;

  // KPIs that should be summed across clients; the rest are averaged
  const SUM_KPIS = new Set(["Revenue", "Operating Income", "Customer Count"]);

  if (isMultiClient) {
    // For each KPI, find each client's latest value, then aggregate
    return SUMMARY_KPIS.map(({ key: name }) => {
      const clientLatest = {};   // clientId → { value, sortKey, ... }
      const clientPrevious = {}; // clientId → previous entry
      for (const kpi of filtered) {
        const canonical = matchSummaryKPI(kpi.name);
        if (canonical !== name) continue;
        const sortKey = kpi.year * 10 + (QUARTER_ORDER[kpi.quarter] ?? 0);
        if (!clientLatest[kpi.clientId] || sortKey > clientLatest[kpi.clientId].sortKey) {
          if (clientLatest[kpi.clientId]) clientPrevious[kpi.clientId] = clientLatest[kpi.clientId];
          clientLatest[kpi.clientId] = { ...kpi, sortKey, clientName: clientMap[kpi.clientId] ?? "Unknown" };
        }
      }

      const entries = Object.values(clientLatest);
      if (entries.length === 0) return { name, value: null, unit: null, trend: null, change: null };

      const shouldSum = SUM_KPIS.has(name);
      const aggValue = shouldSum
        ? entries.reduce((s, e) => s + (e.value ?? 0), 0)
        : entries.reduce((s, e) => s + (e.value ?? 0), 0) / entries.length;

      // Use the most recent quarter/year among all clients for display
      const newest = entries.reduce((a, b) => (b.sortKey > a.sortKey ? b : a));

      // Compute change from previous period (aggregate previous too)
      const prevEntries = Object.values(clientPrevious);
      let change = null;
      if (prevEntries.length > 0) {
        const prevAgg = shouldSum
          ? prevEntries.reduce((s, e) => s + (e.value ?? 0), 0)
          : prevEntries.reduce((s, e) => s + (e.value ?? 0), 0) / prevEntries.length;
        if (prevAgg) change = ((aggValue - prevAgg) / Math.abs(prevAgg)) * 100;
      }

      return {
        name,
        value: shouldSum ? Math.round(aggValue) : parseFloat(aggValue.toFixed(2)),
        unit: newest.unit,
        quarter: newest.quarter,
        year: newest.year,
        clientName: "All",
        confidence: newest.confidence,
        source: newest.source,
        change: change !== null ? parseFloat(change.toFixed(2)) : null,
        trend: change === null ? null : change >= 0 ? "up" : "down",
      };
    });
  }

  // Single-client path: pick the most recent entry per KPI
  const latest = {};
  const previous = {};

  for (const kpi of filtered) {
    const key = matchSummaryKPI(kpi.name) ?? kpi.name;
    const sortKey = kpi.year * 10 + (QUARTER_ORDER[kpi.quarter] ?? 0);

    if (!latest[key] || sortKey > latest[key].sortKey) {
      if (latest[key]) previous[key] = latest[key];
      latest[key] = { ...kpi, sortKey, clientName: clientMap[kpi.clientId] ?? "Unknown" };
    }
  }

  return SUMMARY_KPIS.map(({ key: name }) => {
    const current = latest[name];
    const prev = previous[name];

    if (!current) return { name, value: null, unit: null, trend: null, change: null };

    const change =
      prev && prev.value && current.value
        ? ((current.value - prev.value) / Math.abs(prev.value)) * 100
        : null;

    return {
      name,
      value: current.value,
      unit: current.unit,
      quarter: current.quarter,
      year: current.year,
      clientName: current.clientName,
      confidence: current.confidence,
      source: current.source,
      change: change !== null ? parseFloat(change.toFixed(2)) : null,
      trend: change === null ? null : change >= 0 ? "up" : "down",
    };
  });
}

// ─── CLIENT COMPARISON (bar chart for current quarter) ───────────

export function getClientComparison(kpis, clients, kpiName = "Revenue") {
  const clientMap = Object.fromEntries(clients.map((c) => [c.id, c.name]));
  const canonical = matchSummaryKPI(kpiName) ?? kpiName;

  // Find each client's latest value for the requested KPI
  const latestByClient = {};
  for (const k of kpis) {
    const kpiCanonical = matchSummaryKPI(k.name) ?? k.name;
    if (kpiCanonical.toLowerCase() !== canonical.toLowerCase()) continue;
    const sortKey = k.year * 10 + (QUARTER_ORDER[k.quarter] ?? 0);
    if (!latestByClient[k.clientId] || sortKey > latestByClient[k.clientId].sortKey) {
      latestByClient[k.clientId] = { ...k, sortKey };
    }
  }

  return Object.values(latestByClient).map((k) => ({
    client: clientMap[k.clientId] ?? "Unknown",
    value: k.value,
    unit: k.unit,
    quarter: k.quarter,
    year: k.year,
    source: k.source,
  }));
}

// ─── RADAR CHART DATA (multi-KPI snapshot for a client) ──────────

const RADAR_KPIS = ["Revenue", "Gross Margin", "Net Margin", "EPS", "Operating Income", "Customer Count"];

export function getRadarData(kpis, clients, selectedClientId = null) {
  const clientMap = Object.fromEntries(clients.map((c) => [c.id, c.name]));
  let filtered = kpis;
  if (selectedClientId) {
    filtered = kpis.filter((k) => k.clientId === selectedClientId);
  }

  // Get latest value for each KPI per client (using fuzzy matching)
  const latestByClient = {};
  for (const kpi of filtered) {
    const cName = clientMap[kpi.clientId] ?? "Unknown";
    const canonicalName = matchSummaryKPI(kpi.name);
    if (!canonicalName) continue; // skip KPIs not in RADAR set
    const sortKey = kpi.year * 10 + (QUARTER_ORDER[kpi.quarter] ?? 0);
    if (!latestByClient[cName]) latestByClient[cName] = {};
    if (!latestByClient[cName][canonicalName] || sortKey > latestByClient[cName][canonicalName].sortKey) {
      latestByClient[cName][canonicalName] = { value: kpi.value, sortKey };
    }
  }

  // Find max for each KPI to normalize to 0-100 scale
  const maxes = {};
  for (const name of RADAR_KPIS) {
    maxes[name] = 0;
    for (const client of Object.values(latestByClient)) {
      if (client[name]?.value != null) {
        maxes[name] = Math.max(maxes[name], Math.abs(client[name].value));
      }
    }
  }

  const clientNames = Object.keys(latestByClient);
  const data = RADAR_KPIS.map((name) => {
    const row = { kpi: name };
    for (const cName of clientNames) {
      const val = latestByClient[cName]?.[name]?.value;
      row[cName] = val != null && maxes[name] > 0 ? Math.round((Math.abs(val) / maxes[name]) * 100) : 0;
    }
    return row;
  });

  return { data, clientNames };
}

// ─── MARGIN TREND (area chart for margins over time) ─────────────

export function getMarginTrend(kpis, clients) {
  const clientMap = Object.fromEntries(clients.map((c) => [c.id, c.name]));
  const marginKPIs = kpis.filter((k) =>
    k.name.toLowerCase().includes("margin")
  );

  // Collect by period
  const byPeriod = {};
  for (const kpi of marginKPIs) {
    const period = `${kpi.quarter} ${kpi.year}`;
    const sortKey = kpi.year * 10 + (QUARTER_ORDER[kpi.quarter] ?? 0);
    if (!byPeriod[period]) byPeriod[period] = { period, sortKey };
    const label = `${clientMap[kpi.clientId] ?? "Unknown"} - ${kpi.name}`;
    byPeriod[period][label] = kpi.value;
  }

  const chartData = Object.values(byPeriod).sort((a, b) => a.sortKey - b.sortKey);
  const seriesNames = [...new Set(marginKPIs.map((k) => `${clientMap[k.clientId] ?? "Unknown"} - ${k.name}`))];

  return { chartData, seriesNames };
}

// ─── EPS TREND (line chart) ──────────────────────────────────────

export function getEPSTrend(kpis, clients) {
  const clientMap = Object.fromEntries(clients.map((c) => [c.id, c.name]));
  const epsKPIs = kpis.filter((k) => {
    const canonical = matchSummaryKPI(k.name);
    return canonical === "EPS";
  });

  const byPeriod = {};
  for (const kpi of epsKPIs) {
    const period = `${kpi.quarter} ${kpi.year}`;
    const sortKey = kpi.year * 10 + (QUARTER_ORDER[kpi.quarter] ?? 0);
    if (!byPeriod[period]) byPeriod[period] = { period, sortKey };
    const clientName = clientMap[kpi.clientId] ?? "Unknown";
    byPeriod[period][clientName] = kpi.value;
  }

  const chartData = Object.values(byPeriod).sort((a, b) => a.sortKey - b.sortKey);
  const clientNames = [...new Set(epsKPIs.map((k) => clientMap[k.clientId] ?? "Unknown"))];

  return { chartData, clientNames };
}

// ─── KPI DISTRIBUTION (pie chart) ────────────────────────────────

export function getKPIDistribution(kpis) {
  const counts = {};
  for (const kpi of kpis) {
    const label = matchSummaryKPI(kpi.name) ?? kpi.name;
    counts[label] = (counts[label] || 0) + 1;
  }
  const sorted = Object.entries(counts)
    .map(([name, count]) => ({ name, value: count }))
    .sort((a, b) => b.value - a.value);

  // Keep top 8, group the rest as "Other"
  if (sorted.length > 8) {
    const top = sorted.slice(0, 8);
    const otherCount = sorted.slice(8).reduce((s, e) => s + e.value, 0);
    top.push({ name: "Other", value: otherCount });
    return top;
  }
  return sorted;
}

// ─── CONFIDENCE DISTRIBUTION ─────────────────────────────────────

export function getConfidenceDistribution(kpis) {
  const counts = { High: 0, Medium: 0, Low: 0 };
  for (const kpi of kpis) {
    if (counts[kpi.confidence] !== undefined) counts[kpi.confidence]++;
  }
  return Object.entries(counts).map(([name, value]) => ({ name, value }));
}

// ─── QUARTERLY PERFORMANCE HEATMAP DATA ──────────────────────────

export function getQuarterlyHeatmap(kpis, clients) {
  const clientMap = Object.fromEntries(clients.map((c) => [c.id, c.name]));
  const rows = [];

  // Group by client + KPI name, compute QoQ change
  const byClientKPI = {};
  for (const kpi of kpis) {
    const cName = clientMap[kpi.clientId] ?? "Unknown";
    const key = `${cName}|${kpi.name}`;
    if (!byClientKPI[key]) byClientKPI[key] = [];
    byClientKPI[key].push({
      ...kpi,
      sortKey: kpi.year * 10 + (QUARTER_ORDER[kpi.quarter] ?? 0),
    });
  }

  for (const [key, entries] of Object.entries(byClientKPI)) {
    const [client, kpiName] = key.split("|");
    const sorted = entries.sort((a, b) => b.sortKey - a.sortKey);
    if (sorted.length >= 2 && sorted[0].value != null && sorted[1].value != null && sorted[1].value !== 0) {
      const change = ((sorted[0].value - sorted[1].value) / Math.abs(sorted[1].value)) * 100;
      rows.push({ client, kpi: kpiName, change: parseFloat(change.toFixed(1)), quarter: `${sorted[0].quarter} ${sorted[0].year}` });
    }
  }

  return rows;
}

// ─── FORMAT HELPERS ───────────────────────────────────────────────

export function formatValue(value, unit) {
  if (value === null || value === undefined) return "—";

  switch (unit) {
    case "$M":
      return `$${value.toLocaleString("en-US", { maximumFractionDigits: 1 })}M`;
    case "%":
      return `${value.toFixed(1)}%`;
    case "$":
      return `$${value.toFixed(2)}`;
    case "count":
      return value.toLocaleString("en-US");
    default:
      return value.toString();
  }
}

export function confidenceColor(confidence) {
  switch (confidence) {
    case "High":   return "text-green-600 bg-green-50";
    case "Medium": return "text-yellow-600 bg-yellow-50";
    case "Low":    return "text-red-600 bg-red-50";
    default:       return "text-gray-500 bg-gray-50";
  }
}

// ─── COMPOSED CHART DATA (Revenue bars + Margin line) ────────────

export function getComposedData(kpis, clients) {
  const clientMap = Object.fromEntries(clients.map((c) => [c.id, c.name]));

  // Collect revenue + gross margin per period per client
  const byPeriod = {};
  for (const kpi of kpis) {
    const isRevenue = /^revenue$/i.test(kpi.name);
    const isGrossMargin = /gross\s*margin/i.test(kpi.name);
    const isNetMargin = /net\s*margin/i.test(kpi.name);
    if (!isRevenue && !isGrossMargin && !isNetMargin) continue;

    const cName = clientMap[kpi.clientId] ?? "Unknown";
    const period = `${kpi.quarter} ${kpi.year}`;
    const sortKey = kpi.year * 10 + (QUARTER_ORDER[kpi.quarter] ?? 0);

    if (!byPeriod[period]) byPeriod[period] = { period, sortKey };

    if (isRevenue) byPeriod[period][`${cName} Revenue`] = kpi.value;
    if (isGrossMargin) byPeriod[period][`${cName} Gross Margin`] = kpi.value;
    if (isNetMargin) byPeriod[period][`${cName} Net Margin`] = kpi.value;
  }

  const chartData = Object.values(byPeriod).sort((a, b) => a.sortKey - b.sortKey);

  // Derive series
  const revenueSeries = [];
  const marginSeries = [];
  const allKeys = new Set(chartData.flatMap(Object.keys));
  for (const key of allKeys) {
    if (key === "period" || key === "sortKey") continue;
    if (key.includes("Revenue")) revenueSeries.push(key);
    else marginSeries.push(key);
  }

  return { chartData, revenueSeries, marginSeries };
}

// ─── RADIAL BAR DATA (KPI gauges — latest values normalized) ─────

export function getRadialBarData(kpis, clients, selectedClientId = null) {
  const clientMap = Object.fromEntries(clients.map((c) => [c.id, c.name]));
  let filtered = selectedClientId ? kpis.filter((k) => k.clientId === selectedClientId) : kpis;

  // Get latest value for each summary KPI
  const latest = {};
  for (const kpi of filtered) {
    const canonical = matchSummaryKPI(kpi.name);
    if (!canonical) continue;
    const sortKey = kpi.year * 10 + (QUARTER_ORDER[kpi.quarter] ?? 0);
    if (!latest[canonical] || sortKey > latest[canonical].sortKey) {
      latest[canonical] = { value: kpi.value, unit: kpi.unit, sortKey, clientName: clientMap[kpi.clientId] };
    }
  }

  // Build gauges: normalize each to percentage of a reasonable target
  const targets = {
    "Revenue": null,       // auto-scale
    "Gross Margin": 60,    // % target
    "Net Margin": 30,      // % target
    "EPS": null,           // auto-scale
    "Operating Income": null,
    "Customer Count": null,
  };

  const GAUGE_COLORS = ["#4f6ef7", "#10b981", "#f59e0b", "#8b5cf6", "#06b6d4", "#ec4899", "#ef4444", "#84cc16"];

  const data = [];
  for (const { key } of SUMMARY_KPIS) {
    const entry = latest[key];
    if (!entry || entry.value == null) continue;

    let pct;
    if (targets[key] != null) {
      // Allow negative: e.g. -22% net margin → -73% of 30% target
      pct = Math.min(100, Math.max(-100, (entry.value / targets[key]) * 100));
    } else {
      // Auto-scale: preserve sign, cap magnitude at 100
      const sign = entry.value < 0 ? -1 : 1;
      pct = sign * Math.min(100, Math.abs(entry.value));
    }

    data.push({
      name: key,
      value: Math.round(pct),
      actual: entry.value,
      unit: entry.unit,
      fill: GAUGE_COLORS[data.length % GAUGE_COLORS.length],
    });
  }

  return data;
}

// ─── TREEMAP DATA (KPIs nested inside clients, sized by value) ───

export function getTreemapData(kpis, clients) {
  const clientMap = Object.fromEntries(clients.map((c) => [c.id, c.name]));

  // Get latest KPI per client + kpi-name (only positive numeric values work for treemap)
  const latest = {};
  for (const kpi of kpis) {
    const cName = clientMap[kpi.clientId] ?? "Unknown";
    const key = `${cName}|${kpi.name}`;
    const sortKey = kpi.year * 10 + (QUARTER_ORDER[kpi.quarter] ?? 0);
    if (!latest[key] || sortKey > latest[key].sortKey) {
      latest[key] = { client: cName, name: kpi.name, value: kpi.value, unit: kpi.unit, sortKey };
    }
  }

  // Build flat array with absolute values (treemap needs positive sizes)
  const nodes = Object.values(latest)
    .filter((e) => e.value != null && e.value !== 0)
    .map((e) => ({
      name: `${e.client}: ${e.name}`,
      shortName: e.name,
      client: e.client,
      size: Math.abs(e.value),
      actual: e.value,
      unit: e.unit,
    }))
    .sort((a, b) => b.size - a.size);

  return nodes;
}
