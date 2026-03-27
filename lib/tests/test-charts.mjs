/**
 * Quick chart data validation — verifies transforms produce correct filtered results
 */
import {
  getRevenueTrend, getLatestSummary,
  getMarginTrend, getKPIDistribution,
  getConfidenceDistribution, getQuarterlyHeatmap,
  getComposedData, getRadialBarData, getTreemapData,
  deduplicateKPIs, buildForecastChartData, getEPSTrend,
  getSegmentRevenueTrend, formatDollarM, formatValue,
} from "../transforms.js";

// Simulate real data from Notion — includes duplicates and mixed units like production
const clients = [
  { id: "apple-id", name: "Apple" },
  { id: "intel-id", name: "Intel" },
];

const rawKpis = [
  // Apple Q1 2025 — DUPLICATE ingestions with mixed units ($B vs $M)
  { id: "a1", name: "Revenue", clientId: "apple-id", value: 124.3, unit: "$B", quarter: "Q1", year: 2025, confidence: "High", source: "AI Parsed" },
  { id: "a1b", name: "Revenue", clientId: "apple-id", value: 124300, unit: "$M", quarter: "Q1", year: 2025, confidence: "High", source: "AI Parsed" },
  { id: "a2", name: "EPS — Earnings Per Share", clientId: "apple-id", value: 2.4, unit: "$", quarter: "Q1", year: 2025, confidence: "High", source: "AI Parsed" },
  { id: "a2b", name: "EPS", clientId: "apple-id", value: 2.4, unit: "$", quarter: "Q1", year: 2025, confidence: "High", source: "AI Parsed" },
  { id: "a3", name: "Gross Margin", clientId: "apple-id", value: 46.9, unit: "%", quarter: "Q1", year: 2025, confidence: "High", source: "AI Parsed" },
  { id: "a4", name: "Net Margin", clientId: "apple-id", value: 29.2, unit: "%", quarter: "Q1", year: 2025, confidence: "High", source: "AI Parsed" },
  { id: "a5", name: "Operating Income", clientId: "apple-id", value: 42.8, unit: "$B", quarter: "Q1", year: 2025, confidence: "High", source: "AI Parsed" },

  // Apple Q3 2025 — in $M
  { id: "a10", name: "Revenue", clientId: "apple-id", value: 95359, unit: "$M", quarter: "Q3", year: 2025, confidence: "High", source: "AI Parsed" },
  { id: "a11", name: "EPS — Earnings Per Share", clientId: "apple-id", value: 1.65, unit: "$", quarter: "Q3", year: 2025, confidence: "High", source: "AI Parsed" },
  { id: "a12", name: "Gross Margin", clientId: "apple-id", value: 47.1, unit: "%", quarter: "Q3", year: 2025, confidence: "High", source: "AI Parsed" },
  { id: "a13", name: "Net Margin", clientId: "apple-id", value: 26, unit: "%", quarter: "Q3", year: 2025, confidence: "Medium", source: "AI Parsed" },
  { id: "a14", name: "Operating Income", clientId: "apple-id", value: 29589, unit: "$M", quarter: "Q3", year: 2025, confidence: "High", source: "AI Parsed" },

  // Intel Q1 2025
  { id: "i1", name: "Revenue", clientId: "intel-id", value: 12.7, unit: "$B", quarter: "Q1", year: 2025, confidence: "High", source: "AI Parsed" },
  { id: "i2", name: "EPS", clientId: "intel-id", value: -0.19, unit: "$", quarter: "Q1", year: 2025, confidence: "High", source: "AI Parsed" },
  { id: "i3", name: "Gross Margin", clientId: "intel-id", value: 34.4, unit: "%", quarter: "Q1", year: 2025, confidence: "High", source: "AI Parsed" },
  { id: "i4", name: "Net Margin", clientId: "intel-id", value: -6.93, unit: "%", quarter: "Q1", year: 2025, confidence: "High", source: "AI Parsed" },
  { id: "i5", name: "Operating Income", clientId: "intel-id", value: -301, unit: "$M", quarter: "Q1", year: 2025, confidence: "Medium", source: "AI Parsed" },

  // Intel Q2 2025
  { id: "i6", name: "Revenue", clientId: "intel-id", value: 12859, unit: "$M", quarter: "Q2", year: 2025, confidence: "High", source: "AI Parsed" },
  { id: "i7", name: "EPS — Earnings Per Share", clientId: "intel-id", value: -0.67, unit: "$", quarter: "Q2", year: 2025, confidence: "High", source: "AI Parsed" },
  { id: "i8", name: "Gross Margin", clientId: "intel-id", value: 27.54, unit: "%", quarter: "Q2", year: 2025, confidence: "Medium", source: "AI Parsed" },
];

// Apply dedup+normalization like the dashboard does
const kpis = deduplicateKPIs(rawKpis);

function check(name, condition, detail = "") {
  const icon = condition ? "✓" : "✗";
  console.log(`  ${icon} ${name}${detail ? " → " + detail : ""}`);
  return condition;
}

let pass = 0, fail = 0;

console.log("\n── Chart Data Validation ──────────────────────────\n");

// Test 0: Deduplication + normalization
console.log("Deduplication + Normalization:");
check("Raw has duplicates", rawKpis.length > kpis.length, `${rawKpis.length} raw → ${kpis.length} deduped`) ? pass++ : fail++;
const appleQ1Rev = kpis.find(k => k.clientId === "apple-id" && /^revenue$/i.test(k.name) && k.quarter === "Q1");
check("Apple Q1 Revenue normalized to $M", appleQ1Rev?.unit === "$M" && appleQ1Rev.value === 124300, `${appleQ1Rev?.value} ${appleQ1Rev?.unit}`) ? pass++ : fail++;
const appleQ3Rev = kpis.find(k => k.clientId === "apple-id" && /^revenue$/i.test(k.name) && k.quarter === "Q3");
check("Apple Q3 Revenue preserved", appleQ3Rev?.value === 95359, `${appleQ3Rev?.value} ${appleQ3Rev?.unit}`) ? pass++ : fail++;
const intelQ1Rev = kpis.find(k => k.clientId === "intel-id" && /^revenue$/i.test(k.name) && k.quarter === "Q1");
check("Intel Q1 Revenue $B→$M", intelQ1Rev?.unit === "$M" && intelQ1Rev.value === 12700, `${intelQ1Rev?.value} ${intelQ1Rev?.unit}`) ? pass++ : fail++;

// Test 1: Revenue trend with ALL clients
console.log("\nRevenue Trend (All Clients):");
const allRevenue = getRevenueTrend(kpis, clients);
check("Shows both clients", allRevenue.clientNames.length === 2, allRevenue.clientNames.join(", ")) ? pass++ : fail++;
check("Has chart data", allRevenue.chartData.length > 0, `${allRevenue.chartData.length} periods`) ? pass++ : fail++;

// Test 2: Revenue trend with Apple ONLY — now has Q1 AND Q3
console.log("\nRevenue Trend (Apple only):");
const appleKPIs = kpis.filter((k) => k.clientId === "apple-id");
const appleRevenue = getRevenueTrend(appleKPIs, clients);
check("Shows only Apple", appleRevenue.clientNames.length === 1 && appleRevenue.clientNames[0] === "Apple", appleRevenue.clientNames.join(", ")) ? pass++ : fail++;
check("Apple has 2 periods (Q1+Q3)", appleRevenue.chartData.length === 2, appleRevenue.chartData.map(d=>d.period).join(", ")) ? pass++ : fail++;

// Test 3: Revenue trend with Intel ONLY
console.log("\nRevenue Trend (Intel only):");
const intelKPIs = kpis.filter((k) => k.clientId === "intel-id");
const intelRevenue = getRevenueTrend(intelKPIs, clients);
check("Shows only Intel", intelRevenue.clientNames.length === 1 && intelRevenue.clientNames[0] === "Intel", intelRevenue.clientNames.join(", ")) ? pass++ : fail++;
check("Has 2 periods for Intel", intelRevenue.chartData.length === 2, intelRevenue.chartData.map((d) => d.period).join(", ")) ? pass++ : fail++;

// Test 4: Summary cards with fuzzy matching
console.log("\nSummary Cards (All):");
const allSummary = getLatestSummary(kpis, clients);
const epsCard = allSummary.find((s) => s.name === "EPS");
check("EPS card found via fuzzy match", epsCard?.value != null, `value=${epsCard?.value}`) ? pass++ : fail++;
const opIncCard = allSummary.find((s) => s.name === "Operating Income");
check("Operating Income card found", opIncCard?.value != null, `value=${opIncCard?.value}`) ? pass++ : fail++;

// Test 5: Summary cards filtered by Apple
console.log("\nSummary Cards (Apple only):");
const appleSummary = getLatestSummary(appleKPIs, clients, "apple-id");
const appleEPS = appleSummary.find((s) => s.name === "EPS");
check("Apple EPS found", appleEPS?.value != null, `value=${appleEPS?.value}`) ? pass++ : fail++;
const appleRev = appleSummary.find((s) => s.name === "Revenue");
check("Apple Revenue found (latest=Q3)", appleRev?.value === 95359, `value=${appleRev?.value}`) ? pass++ : fail++;

// Test 6: Forecast chart data (with mock forecasts)
console.log("\nForecast Chart Data (with forecasts):");
const mockForecasts = [
  { client: "Apple", nextQuarter: "Q4", nextYear: 2025, forecastValue: 98000, unit: "$M", reasoning: "Trend decline" },
  { client: "Intel", nextQuarter: "Q3", nextYear: 2025, forecastValue: 13200, unit: "$M", reasoning: "Slight growth" },
];
const fcAll = buildForecastChartData(kpis, clients, mockForecasts);
check("Both clients in forecast", fcAll.clientNames.length === 2, fcAll.clientNames.join(", ")) ? pass++ : fail++;
check("Forecast has actual + forecast periods", fcAll.chartData.length >= 3, `${fcAll.chartData.length} periods`) ? pass++ : fail++;
const forecastPeriod = fcAll.chartData.find(d => d._forecast);
check("Forecast period is marked", forecastPeriod != null, forecastPeriod?.period) ? pass++ : fail++;
check("Forecast period has values", forecastPeriod?.Apple === 98000 || forecastPeriod?.Intel === 13200) ? pass++ : fail++;

// Test 7: Forecast chart data (no forecasts yet)
console.log("\nForecast Chart Data (no forecasts):");
const fcEmpty = buildForecastChartData(kpis, clients, []);
check("Still has actual data", fcEmpty.chartData.length > 0, `${fcEmpty.chartData.length} periods`) ? pass++ : fail++;
check("No forecast periods", fcEmpty.chartData.every(d => !d._forecast)) ? pass++ : fail++;

// Test 8: Forecast chart data (Apple only)
console.log("\nForecast Chart Data (Apple only):");
const fcApple = buildForecastChartData(appleKPIs, clients, mockForecasts);
check("Only Apple in forecast", fcApple.clientNames.length === 1, fcApple.clientNames.join(", ")) ? pass++ : fail++;

// Test 10: KPI Distribution filtered
console.log("\nKPI Distribution (Intel only):");
const intelDist = getKPIDistribution(intelKPIs);
check("Intel-only KPIs", intelDist.every((d) => d.name !== "Customer Satisfaction Score"), `${intelDist.length} unique KPIs`) ? pass++ : fail++;

// Test 11: Margin trend filtered
console.log("\nMargin Trend (Intel only):");
const intelMargin = getMarginTrend(intelKPIs, clients);
check("Intel margin data exists", intelMargin.chartData.length > 0, `${intelMargin.chartData.length} periods, ${intelMargin.seriesNames.length} series`) ? pass++ : fail++;

// ── NEW CHART TESTS ──────────────────────────────────────────

// Test 12: ComposedChart data (all)
console.log("\nComposed Data (All):");
const composed = getComposedData(kpis, clients);
check("Has chart data", composed.chartData.length > 0, `${composed.chartData.length} periods`) ? pass++ : fail++;
check("Has revenue series", composed.revenueSeries.length > 0, composed.revenueSeries.join(", ")) ? pass++ : fail++;
check("Has margin series", composed.marginSeries.length > 0, composed.marginSeries.join(", ")) ? pass++ : fail++;

// Test 13: ComposedChart data (filtered)
console.log("\nComposed Data (Apple only):");
const appleComposed = getComposedData(appleKPIs, clients);
check("Apple-only revenue series", appleComposed.revenueSeries.every((s) => s.includes("Apple")), appleComposed.revenueSeries.join(", ")) ? pass++ : fail++;

// Test 14: RadialBar data (all)
console.log("\nRadial Bar Data (All):");
const radial = getRadialBarData(kpis, clients);
check("Has KPI gauges", radial.length > 0, `${radial.length} gauges`) ? pass++ : fail++;
check("Each gauge has value in -100..100", radial.every((d) => d.value >= -100 && d.value <= 100), radial.map((d) => `${d.name}=${d.value}`).join(", ")) ? pass++ : fail++;
check("Each gauge has actual value", radial.every((d) => d.actual != null)) ? pass++ : fail++;

// Test 15: RadialBar data (filtered — Intel has negatives)
console.log("\nRadial Bar Data (Intel only):");
const intelRadial = getRadialBarData(intelKPIs, clients, "intel-id");
check("Intel gauges exist", intelRadial.length > 0, `${intelRadial.length} gauges`) ? pass++ : fail++;
const intelNetMargin = intelRadial.find(d => d.name === "Net Margin");
check("Intel Net Margin gauge is negative", intelNetMargin?.value < 0, `value=${intelNetMargin?.value}, actual=${intelNetMargin?.actual}`) ? pass++ : fail++;
const intelEPS = intelRadial.find(d => d.name === "EPS");
check("Intel EPS gauge is negative", intelEPS?.value < 0, `value=${intelEPS?.value}, actual=${intelEPS?.actual}`) ? pass++ : fail++;

// Test 16: RadialBar data (Apple only — all positive)
console.log("\nRadial Bar Data (Apple only):");
const appleRadial = getRadialBarData(appleKPIs, clients, "apple-id");
check("Apple gauges exist", appleRadial.length > 0, `${appleRadial.length} gauges`) ? pass++ : fail++;

// Test 16: Treemap data (all)
console.log("\nTreemap Data (All):");
const treemap = getTreemapData(kpis, clients);
check("Has treemap nodes", treemap.length > 0, `${treemap.length} nodes`) ? pass++ : fail++;
check("Nodes have required fields", treemap.every((n) => n.name && n.shortName && n.client && n.size > 0)) ? pass++ : fail++;
check("Sorted by size desc", treemap[0].size >= treemap[treemap.length - 1].size) ? pass++ : fail++;

// Test 17: Treemap data (filtered)
console.log("\nTreemap Data (Intel only):");
const intelTreemap = getTreemapData(intelKPIs, clients);
check("Intel-only nodes", intelTreemap.every((n) => n.client === "Intel"), `${intelTreemap.length} nodes`) ? pass++ : fail++;

// Test 18: EPS Trend (all clients)
console.log("\nEPS Trend (All):");
const epsTrend = getEPSTrend(kpis, clients);
check("Has EPS chart data", epsTrend.chartData.length > 0, `${epsTrend.chartData.length} periods`) ? pass++ : fail++;
check("Has client names", epsTrend.clientNames.length > 0, epsTrend.clientNames.join(", ")) ? pass++ : fail++;
check("Apple + Intel EPS present", epsTrend.clientNames.includes("Apple") && epsTrend.clientNames.includes("Intel")) ? pass++ : fail++;

// Test 19: EPS Trend (Apple only)
console.log("\nEPS Trend (Apple only):");
const appleEPSTrend = getEPSTrend(appleKPIs, clients);
check("Apple-only clients", appleEPSTrend.clientNames.length === 1 && appleEPSTrend.clientNames[0] === "Apple") ? pass++ : fail++;
check("Apple has 2 EPS periods (Q1+Q3)", appleEPSTrend.chartData.length === 2, `${appleEPSTrend.chartData.length} periods`) ? pass++ : fail++;

// ── formatDollarM ─────────────────────────────────────────────
console.log("\nformatDollarM:");
check("null → '—'", formatDollarM(null) === "—", formatDollarM(null)) ? pass++ : fail++;
check("undefined → '—'", formatDollarM(undefined) === "—", formatDollarM(undefined)) ? pass++ : fail++;
check("500 → '$500M'", formatDollarM(500) === "$500M", formatDollarM(500)) ? pass++ : fail++;
check("999 stays in $M", formatDollarM(999) === "$999M", formatDollarM(999)) ? pass++ : fail++;
check("1000 → '$1B'", formatDollarM(1000) === "$1B", formatDollarM(1000)) ? pass++ : fail++;
check("12750 → '$12.75B'", formatDollarM(12750) === "$12.75B", formatDollarM(12750)) ? pass++ : fail++;
check("95359 shows $B", formatDollarM(95359).endsWith("B"), formatDollarM(95359)) ? pass++ : fail++;
check("-5000 shows $B", formatDollarM(-5000).endsWith("B"), formatDollarM(-5000)) ? pass++ : fail++;

// ── formatValue $M auto-scale ──────────────────────────────────
console.log("\nformatValue $M auto-scale:");
check("$M 500 → '$500M'", formatValue(500, "$M") === "$500M", formatValue(500, "$M")) ? pass++ : fail++;
check("$M 1000 → shows $B", formatValue(1000, "$M").endsWith("B"), formatValue(1000, "$M")) ? pass++ : fail++;
check("$M 95359 → shows $B", formatValue(95359, "$M").endsWith("B"), formatValue(95359, "$M")) ? pass++ : fail++;
check("% 46.9 → '46.9%'", formatValue(46.9, "%") === "46.9%", formatValue(46.9, "%")) ? pass++ : fail++;
check("$ 2.40 → '$2.40'", formatValue(2.40, "$") === "$2.40", formatValue(2.40, "$")) ? pass++ : fail++;
check("null → '—'", formatValue(null, "$M") === "—", formatValue(null, "$M")) ? pass++ : fail++;

// ── Revenue matcher (SUMMARY_KPIS) — via getLatestSummary ─────
console.log("\nRevenue Matcher (broadened):");
const makeRevenueKPI = (name) => ({ id: name, name, clientId: "t1", value: 5000, unit: "$M", quarter: "Q1", year: 2025, confidence: "High", source: "Test" });
const matchClients = [{ id: "t1", name: "TestCo" }];

const m1 = getLatestSummary([makeRevenueKPI("Revenue")], matchClients, "t1");
check("'Revenue' matches", m1.some(s => s.name === "Revenue" && s.value != null), m1.map(s => `${s.name}=${s.value}`).join(", ")) ? pass++ : fail++;

const m2 = getLatestSummary([makeRevenueKPI("Total Revenue")], matchClients, "t1");
check("'Total Revenue' matches", m2.some(s => s.name === "Revenue" && s.value != null), m2.map(s => `${s.name}=${s.value}`).join(", ")) ? pass++ : fail++;

const m3 = getLatestSummary([makeRevenueKPI("Net Revenue")], matchClients, "t1");
check("'Net Revenue' matches", m3.some(s => s.name === "Revenue" && s.value != null), m3.map(s => `${s.name}=${s.value}`).join(", ")) ? pass++ : fail++;

const m4 = getLatestSummary([makeRevenueKPI("Net Sales")], matchClients, "t1");
check("'Net Sales' matches", m4.some(s => s.name === "Revenue" && s.value != null), m4.map(s => `${s.name}=${s.value}`).join(", ")) ? pass++ : fail++;

const m5 = getLatestSummary([makeRevenueKPI("Total Net Sales")], matchClients, "t1");
check("'Total Net Sales' matches", m5.some(s => s.name === "Revenue" && s.value != null), m5.map(s => `${s.name}=${s.value}`).join(", ")) ? pass++ : fail++;

const m6 = getLatestSummary([makeRevenueKPI("CCG Revenue")], matchClients, "t1");
check("'CCG Revenue' does NOT match top-line Revenue", !m6.some(s => s.name === "Revenue" && s.value != null), m6.map(s => `${s.name}=${s.value}`).join(", ")) ? pass++ : fail++;

// ── getSegmentRevenueTrend ─────────────────────────────────────
console.log("\ngetSegmentRevenueTrend:");
const segKPIs = [
  { id: "s1", name: "CCG Revenue",  clientId: "intel-id", value: 7700, unit: "$M", quarter: "Q1", year: 2025, confidence: "High", source: "Test" },
  { id: "s2", name: "DCAI Revenue", clientId: "intel-id", value: 4100, unit: "$M", quarter: "Q1", year: 2025, confidence: "High", source: "Test" },
  { id: "s3", name: "Revenue",      clientId: "intel-id", value: 12700, unit: "$M", quarter: "Q1", year: 2025, confidence: "High", source: "Test" },
  { id: "s4", name: "CCG Revenue",  clientId: "intel-id", value: 8200, unit: "$M", quarter: "Q2", year: 2025, confidence: "High", source: "Test" },
  { id: "s5", name: "DCAI Revenue", clientId: "intel-id", value: 4500, unit: "$M", quarter: "Q2", year: 2025, confidence: "High", source: "Test" },
];
const segResult = getSegmentRevenueTrend(segKPIs, clients);
check("Has 2 segment names (CCG + DCAI)", segResult.segmentNames.length === 2, segResult.segmentNames.join(", ")) ? pass++ : fail++;
check("Top-line Revenue excluded from segments", !segResult.segmentNames.includes("Revenue"), segResult.segmentNames.join(", ")) ? pass++ : fail++;
check("Has 2 periods (Q1+Q2)", segResult.chartData.length === 2, segResult.chartData.map(d => d.period).join(", ")) ? pass++ : fail++;
const q1Row = segResult.chartData.find(d => d.period === "Q1 2025");
check("Q1 CCG Revenue = 7700", q1Row?.["CCG Revenue"] === 7700, `${q1Row?.["CCG Revenue"]}`) ? pass++ : fail++;
check("Q1 DCAI Revenue = 4100", q1Row?.["DCAI Revenue"] === 4100, `${q1Row?.["DCAI Revenue"]}`) ? pass++ : fail++;
check("Top-line not in row data", q1Row?.["Revenue"] == null, `${q1Row?.["Revenue"]}`) ? pass++ : fail++;

const emptySegResult = getSegmentRevenueTrend(kpis, clients); // rawKpis have no segment revenues
check("Returns empty when no segments", emptySegResult.segmentNames.length === 0) ? pass++ : fail++;

console.log(`\n── Results: ${pass} passed, ${fail} failed ──\n`);
process.exit(fail > 0 ? 1 : 0);
