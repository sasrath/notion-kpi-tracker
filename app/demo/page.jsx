"use client";

import { useState, useMemo } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area,
  ComposedChart, ReferenceLine, Treemap,
} from "recharts";
import {
  getRevenueTrend, getLatestSummary,
  formatValue, confidenceColor,
  getMarginTrend, getKPIDistribution,
  getConfidenceDistribution, getQuarterlyHeatmap,
  getComposedData, getRadialBarData, getTreemapData,
  deduplicateKPIs, getEPSTrend,
} from "@/lib/transforms";

// ─── COLOURS ─────────────────────────────────────────────────────
const CHART_COLORS = [
  "#4f6ef7", "#10b981", "#f59e0b", "#ef4444",
  "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16",
];
const PIE_COLORS = ["#4f6ef7", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16", "#f97316", "#6366f1"];
const CONF_COLORS = { High: "#10b981", Medium: "#f59e0b", Low: "#ef4444" };

// ─── STATIC CLIENTS ──────────────────────────────────────────────

const DEMO_CLIENTS = [
  { id: "intel",  name: "Intel",  industry: "Semiconductors", website: "intel.com",  status: "Active" },
  { id: "apple",  name: "Apple",  industry: "Consumer Electronics", website: "apple.com",  status: "Active" },
  { id: "nvidia", name: "Nvidia", industry: "Semiconductors", website: "nvidia.com", status: "Active" },
];

// ─── STATIC KPI DATA (10-Q / 10-K, FY 2025-26) ─────────────────
// Realistic approximate figures based on public filings pattern

const DEMO_KPIS = [
  // ── Intel ─────────────────────────────────────────────────
  // Q1 2025 (10-Q)
  { id: "i-r-q1", name: "Revenue", value: 12700, unit: "$M", quarter: "Q1", year: 2025, clientId: "intel", source: "10-Q", confidence: "High" },
  { id: "i-gm-q1", name: "Gross Margin", value: 39.2, unit: "%", quarter: "Q1", year: 2025, clientId: "intel", source: "10-Q", confidence: "High" },
  { id: "i-nm-q1", name: "Net Margin", value: -1.8, unit: "%", quarter: "Q1", year: 2025, clientId: "intel", source: "10-Q", confidence: "High" },
  { id: "i-eps-q1", name: "EPS", value: -0.09, unit: "$", quarter: "Q1", year: 2025, clientId: "intel", source: "10-Q", confidence: "High" },
  { id: "i-oi-q1", name: "Operating Income", value: -200, unit: "$M", quarter: "Q1", year: 2025, clientId: "intel", source: "10-Q", confidence: "High" },
  // Q2 2025 (10-Q)
  { id: "i-r-q2", name: "Revenue", value: 13280, unit: "$M", quarter: "Q2", year: 2025, clientId: "intel", source: "10-Q", confidence: "High" },
  { id: "i-gm-q2", name: "Gross Margin", value: 40.1, unit: "%", quarter: "Q2", year: 2025, clientId: "intel", source: "10-Q", confidence: "High" },
  { id: "i-nm-q2", name: "Net Margin", value: 1.2, unit: "%", quarter: "Q2", year: 2025, clientId: "intel", source: "10-Q", confidence: "High" },
  { id: "i-eps-q2", name: "EPS", value: 0.04, unit: "$", quarter: "Q2", year: 2025, clientId: "intel", source: "10-Q", confidence: "High" },
  { id: "i-oi-q2", name: "Operating Income", value: 310, unit: "$M", quarter: "Q2", year: 2025, clientId: "intel", source: "10-Q", confidence: "High" },
  // Q3 2025 (10-Q)
  { id: "i-r-q3", name: "Revenue", value: 14100, unit: "$M", quarter: "Q3", year: 2025, clientId: "intel", source: "10-Q", confidence: "High" },
  { id: "i-gm-q3", name: "Gross Margin", value: 41.5, unit: "%", quarter: "Q3", year: 2025, clientId: "intel", source: "10-Q", confidence: "High" },
  { id: "i-nm-q3", name: "Net Margin", value: 3.1, unit: "%", quarter: "Q3", year: 2025, clientId: "intel", source: "10-Q", confidence: "Medium" },
  { id: "i-eps-q3", name: "EPS", value: 0.10, unit: "$", quarter: "Q3", year: 2025, clientId: "intel", source: "10-Q", confidence: "Medium" },
  { id: "i-oi-q3", name: "Operating Income", value: 620, unit: "$M", quarter: "Q3", year: 2025, clientId: "intel", source: "10-Q", confidence: "High" },
  // Q4 2025 (10-K annual)
  { id: "i-r-q4", name: "Revenue", value: 14500, unit: "$M", quarter: "Q4", year: 2025, clientId: "intel", source: "10-K", confidence: "High" },
  { id: "i-gm-q4", name: "Gross Margin", value: 42.0, unit: "%", quarter: "Q4", year: 2025, clientId: "intel", source: "10-K", confidence: "High" },
  { id: "i-nm-q4", name: "Net Margin", value: 4.5, unit: "%", quarter: "Q4", year: 2025, clientId: "intel", source: "10-K", confidence: "High" },
  { id: "i-eps-q4", name: "EPS", value: 0.15, unit: "$", quarter: "Q4", year: 2025, clientId: "intel", source: "10-K", confidence: "High" },
  { id: "i-oi-q4", name: "Operating Income", value: 870, unit: "$M", quarter: "Q4", year: 2025, clientId: "intel", source: "10-K", confidence: "High" },

  // ── Apple ─────────────────────────────────────────────────
  // Q1 FY2026 = Calendar Q4 2025 (10-Q)
  { id: "a-r-q1", name: "Revenue", value: 124300, unit: "$M", quarter: "Q1", year: 2025, clientId: "apple", source: "10-Q", confidence: "High" },
  { id: "a-gm-q1", name: "Gross Margin", value: 46.9, unit: "%", quarter: "Q1", year: 2025, clientId: "apple", source: "10-Q", confidence: "High" },
  { id: "a-nm-q1", name: "Net Margin", value: 26.3, unit: "%", quarter: "Q1", year: 2025, clientId: "apple", source: "10-Q", confidence: "High" },
  { id: "a-eps-q1", name: "EPS", value: 2.18, unit: "$", quarter: "Q1", year: 2025, clientId: "apple", source: "10-Q", confidence: "High" },
  { id: "a-oi-q1", name: "Operating Income", value: 42500, unit: "$M", quarter: "Q1", year: 2025, clientId: "apple", source: "10-Q", confidence: "High" },
  // Q2 2025 (10-Q)
  { id: "a-r-q2", name: "Revenue", value: 95400, unit: "$M", quarter: "Q2", year: 2025, clientId: "apple", source: "10-Q", confidence: "High" },
  { id: "a-gm-q2", name: "Gross Margin", value: 46.6, unit: "%", quarter: "Q2", year: 2025, clientId: "apple", source: "10-Q", confidence: "High" },
  { id: "a-nm-q2", name: "Net Margin", value: 24.8, unit: "%", quarter: "Q2", year: 2025, clientId: "apple", source: "10-Q", confidence: "High" },
  { id: "a-eps-q2", name: "EPS", value: 1.58, unit: "$", quarter: "Q2", year: 2025, clientId: "apple", source: "10-Q", confidence: "High" },
  { id: "a-oi-q2", name: "Operating Income", value: 31200, unit: "$M", quarter: "Q2", year: 2025, clientId: "apple", source: "10-Q", confidence: "High" },
  // Q3 2025 (10-Q)
  { id: "a-r-q3", name: "Revenue", value: 85800, unit: "$M", quarter: "Q3", year: 2025, clientId: "apple", source: "10-Q", confidence: "High" },
  { id: "a-gm-q3", name: "Gross Margin", value: 46.3, unit: "%", quarter: "Q3", year: 2025, clientId: "apple", source: "10-Q", confidence: "High" },
  { id: "a-nm-q3", name: "Net Margin", value: 23.7, unit: "%", quarter: "Q3", year: 2025, clientId: "apple", source: "10-Q", confidence: "Medium" },
  { id: "a-eps-q3", name: "EPS", value: 1.35, unit: "$", quarter: "Q3", year: 2025, clientId: "apple", source: "10-Q", confidence: "Medium" },
  { id: "a-oi-q3", name: "Operating Income", value: 27100, unit: "$M", quarter: "Q3", year: 2025, clientId: "apple", source: "10-Q", confidence: "High" },
  // Q4 2025 (10-K)
  { id: "a-r-q4", name: "Revenue", value: 89900, unit: "$M", quarter: "Q4", year: 2025, clientId: "apple", source: "10-K", confidence: "High" },
  { id: "a-gm-q4", name: "Gross Margin", value: 46.2, unit: "%", quarter: "Q4", year: 2025, clientId: "apple", source: "10-K", confidence: "High" },
  { id: "a-nm-q4", name: "Net Margin", value: 25.0, unit: "%", quarter: "Q4", year: 2025, clientId: "apple", source: "10-K", confidence: "High" },
  { id: "a-eps-q4", name: "EPS", value: 1.46, unit: "$", quarter: "Q4", year: 2025, clientId: "apple", source: "10-K", confidence: "High" },
  { id: "a-oi-q4", name: "Operating Income", value: 29800, unit: "$M", quarter: "Q4", year: 2025, clientId: "apple", source: "10-K", confidence: "High" },

  // ── Nvidia ────────────────────────────────────────────────
  // Q1 FY2026 = Calendar Q1 2025 (10-Q)
  { id: "n-r-q1", name: "Revenue", value: 44070, unit: "$M", quarter: "Q1", year: 2025, clientId: "nvidia", source: "10-Q", confidence: "High" },
  { id: "n-gm-q1", name: "Gross Margin", value: 78.4, unit: "%", quarter: "Q1", year: 2025, clientId: "nvidia", source: "10-Q", confidence: "High" },
  { id: "n-nm-q1", name: "Net Margin", value: 55.8, unit: "%", quarter: "Q1", year: 2025, clientId: "nvidia", source: "10-Q", confidence: "High" },
  { id: "n-eps-q1", name: "EPS", value: 0.96, unit: "$", quarter: "Q1", year: 2025, clientId: "nvidia", source: "10-Q", confidence: "High" },
  { id: "n-oi-q1", name: "Operating Income", value: 29600, unit: "$M", quarter: "Q1", year: 2025, clientId: "nvidia", source: "10-Q", confidence: "High" },
  { id: "n-cc-q1", name: "Customer Count", value: 4200, unit: "#", quarter: "Q1", year: 2025, clientId: "nvidia", source: "10-Q", confidence: "Medium" },
  // Q2 2025 (10-Q)
  { id: "n-r-q2", name: "Revenue", value: 48900, unit: "$M", quarter: "Q2", year: 2025, clientId: "nvidia", source: "10-Q", confidence: "High" },
  { id: "n-gm-q2", name: "Gross Margin", value: 77.8, unit: "%", quarter: "Q2", year: 2025, clientId: "nvidia", source: "10-Q", confidence: "High" },
  { id: "n-nm-q2", name: "Net Margin", value: 56.2, unit: "%", quarter: "Q2", year: 2025, clientId: "nvidia", source: "10-Q", confidence: "High" },
  { id: "n-eps-q2", name: "EPS", value: 1.09, unit: "$", quarter: "Q2", year: 2025, clientId: "nvidia", source: "10-Q", confidence: "High" },
  { id: "n-oi-q2", name: "Operating Income", value: 33100, unit: "$M", quarter: "Q2", year: 2025, clientId: "nvidia", source: "10-Q", confidence: "High" },
  { id: "n-cc-q2", name: "Customer Count", value: 4500, unit: "#", quarter: "Q2", year: 2025, clientId: "nvidia", source: "10-Q", confidence: "Medium" },
  // Q3 2025 (10-Q)
  { id: "n-r-q3", name: "Revenue", value: 53200, unit: "$M", quarter: "Q3", year: 2025, clientId: "nvidia", source: "10-Q", confidence: "High" },
  { id: "n-gm-q3", name: "Gross Margin", value: 76.9, unit: "%", quarter: "Q3", year: 2025, clientId: "nvidia", source: "10-Q", confidence: "High" },
  { id: "n-nm-q3", name: "Net Margin", value: 55.4, unit: "%", quarter: "Q3", year: 2025, clientId: "nvidia", source: "10-Q", confidence: "Medium" },
  { id: "n-eps-q3", name: "EPS", value: 1.17, unit: "$", quarter: "Q3", year: 2025, clientId: "nvidia", source: "10-Q", confidence: "Medium" },
  { id: "n-oi-q3", name: "Operating Income", value: 35700, unit: "$M", quarter: "Q3", year: 2025, clientId: "nvidia", source: "10-Q", confidence: "High" },
  { id: "n-cc-q3", name: "Customer Count", value: 4800, unit: "#", quarter: "Q3", year: 2025, clientId: "nvidia", source: "10-Q", confidence: "Medium" },
  // Q4 2025 (10-K annual)
  { id: "n-r-q4", name: "Revenue", value: 57500, unit: "$M", quarter: "Q4", year: 2025, clientId: "nvidia", source: "10-K", confidence: "High" },
  { id: "n-gm-q4", name: "Gross Margin", value: 76.2, unit: "%", quarter: "Q4", year: 2025, clientId: "nvidia", source: "10-K", confidence: "High" },
  { id: "n-nm-q4", name: "Net Margin", value: 54.9, unit: "%", quarter: "Q4", year: 2025, clientId: "nvidia", source: "10-K", confidence: "High" },
  { id: "n-eps-q4", name: "EPS", value: 1.25, unit: "$", quarter: "Q4", year: 2025, clientId: "nvidia", source: "10-K", confidence: "High" },
  { id: "n-oi-q4", name: "Operating Income", value: 37900, unit: "$M", quarter: "Q4", year: 2025, clientId: "nvidia", source: "10-K", confidence: "High" },
  { id: "n-cc-q4", name: "Customer Count", value: 5100, unit: "#", quarter: "Q4", year: 2025, clientId: "nvidia", source: "10-K", confidence: "High" },
];

// ─── SMALL COMPONENTS ────────────────────────────────────────────

function Badge({ label, variant = "default" }) {
  const styles = {
    default:  "bg-slate-100 text-slate-600",
    custom:   "bg-purple-100 text-purple-700",
    ai:       "bg-blue-100 text-blue-700",
    warning:  "bg-yellow-100 text-yellow-700",
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles[variant]}`}>
      {label}
    </span>
  );
}

function KPICard({ kpi }) {
  if (!kpi.value) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-5 flex flex-col gap-1 opacity-50">
        <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">{kpi.name}</p>
        <p className="text-2xl font-bold text-slate-300">—</p>
        <p className="text-xs text-slate-300">No data</p>
      </div>
    );
  }

  const trendIcon = kpi.trend === "up" ? "↑" : kpi.trend === "down" ? "↓" : "→";
  const trendColor = kpi.trend === "up" ? "text-green-600" : kpi.trend === "down" ? "text-red-500" : "text-slate-400";

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 flex flex-col gap-2 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">{kpi.name}</p>
      </div>
      <p className="text-2xl font-bold text-slate-800">
        {formatValue(kpi.value, kpi.unit)}
      </p>
      <div className="flex items-center gap-2">
        {kpi.change !== null && (
          <span className={`text-sm font-semibold ${trendColor}`}>
            {trendIcon} {Math.abs(kpi.change).toFixed(1)}% QoQ
          </span>
        )}
        <span className="text-xs text-slate-400">{kpi.quarter} {kpi.year}</span>
      </div>
      {kpi.confidence && (
        <span className={`text-xs px-2 py-0.5 rounded-full w-fit font-medium ${confidenceColor(kpi.confidence)}`}>
          {kpi.confidence} confidence
        </span>
      )}
    </div>
  );
}

// ─── KPI TABLE (read-only) ───────────────────────────────────────

function DemoKPITable({ kpis, clients, selectedClientId }) {
  const [search, setSearch] = useState("");
  const [page, setPage]   = useState(0);
  const perPage = 15;

  const rows = useMemo(() => {
    const nameMap = Object.fromEntries(clients.map((c) => [c.id, c.name]));
    let list = selectedClientId ? kpis.filter((k) => k.clientId === selectedClientId) : kpis;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((k) =>
        k.name.toLowerCase().includes(q) ||
        (nameMap[k.clientId] ?? "").toLowerCase().includes(q) ||
        k.source?.toLowerCase().includes(q)
      );
    }
    return list.map((k) => ({ ...k, clientName: nameMap[k.clientId] ?? "Unknown" }));
  }, [kpis, clients, selectedClientId, search]);

  const totalPages = Math.ceil(rows.length / perPage);
  const pageRows   = rows.slice(page * perPage, (page + 1) * perPage);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h3 className="text-sm font-bold text-slate-700">All KPIs</h3>
        <input
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs w-56 focus:outline-none focus:ring-2 focus:ring-brand-500"
          placeholder="Search KPIs…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
        />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-100">
              <th className="py-3 pr-4">Entity</th>
              <th className="py-3 pr-4">KPI</th>
              <th className="py-3 pr-4">Value</th>
              <th className="py-3 pr-4">Period</th>
              <th className="py-3 pr-4">Source</th>
              <th className="py-3 pr-4">Confidence</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((k) => (
              <tr key={k.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                <td className="py-3 pr-4 font-medium text-slate-700">{k.clientName}</td>
                <td className="py-3 pr-4 text-slate-600">{k.name}</td>
                <td className="py-3 pr-4 font-semibold text-slate-800">{formatValue(k.value, k.unit)}</td>
                <td className="py-3 pr-4 text-slate-500">{k.quarter} {k.year}</td>
                <td className="py-3 pr-4">
                  <Badge label={k.source} variant={k.source === "10-K" ? "ai" : "default"} />
                </td>
                <td className="py-3 pr-4">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${confidenceColor(k.confidence)}`}>
                    {k.confidence}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-xs text-slate-400">{rows.length} KPIs total</span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1 text-xs rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
            >
              ← Prev
            </button>
            <span className="text-xs text-slate-500 py-1">
              Page {page + 1} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="px-3 py-1 text-xs rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MAIN DEMO PAGE ──────────────────────────────────────────────

export default function DemoPage() {
  const [selectedClientId, setSelectedClientId] = useState(null);

  const clients = DEMO_CLIENTS;
  const kpis    = DEMO_KPIS;

  const cleanKPIs    = deduplicateKPIs(kpis);
  const filteredKPIs = selectedClientId ? cleanKPIs.filter((k) => k.clientId === selectedClientId) : cleanKPIs;
  const summary      = getLatestSummary(filteredKPIs, clients, selectedClientId);
  const { chartData, clientNames }     = getRevenueTrend(filteredKPIs, clients);
  const { chartData: marginData, seriesNames: marginSeries } = getMarginTrend(filteredKPIs, clients);
  const { chartData: epsData, clientNames: epsClients }       = getEPSTrend(filteredKPIs, clients);
  const kpiDistribution  = getKPIDistribution(filteredKPIs);
  const confidenceDist   = getConfidenceDistribution(filteredKPIs);
  const heatmapData      = getQuarterlyHeatmap(filteredKPIs, clients);
  const { chartData: composedData, revenueSeries, marginSeries: composedMarginSeries } = getComposedData(filteredKPIs, clients);
  const radialData  = getRadialBarData(filteredKPIs, clients, selectedClientId);
  const treemapData = getTreemapData(filteredKPIs, clients);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">K</div>
          <span className="font-bold text-slate-800 text-lg">KPI Tracker</span>
          <span className="text-xs text-slate-400 hidden sm:block">Powered by Notion MCP</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs bg-amber-100 text-amber-700 px-3 py-1 rounded-full font-semibold">Static Demo</span>
        </div>
      </header>

      {/* Banner */}
      <div className="bg-gradient-to-r from-brand-500 to-indigo-600 text-white px-6 py-3 text-center text-sm">
        Static demo with sample data from Intel, Apple &amp; Nvidia (10-Q/10-K FY 2025). No live data or AI features.
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6">

        {/* Entity filter */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm text-slate-500 font-medium">Filter:</span>
          <button
            onClick={() => setSelectedClientId(null)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              !selectedClientId ? "bg-brand-500 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            All Entities
          </button>
          {clients.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedClientId(c.id)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                selectedClientId === c.id ? "bg-brand-500 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {summary.map((kpi) => <KPICard key={kpi.name} kpi={kpi} />)}
        </div>

        {/* Stats overview */}
        {!selectedClientId && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-5 text-white">
              <p className="text-xs font-medium opacity-80 uppercase tracking-wide">Total KPIs</p>
              <p className="text-3xl font-bold mt-1">{cleanKPIs.length}</p>
            </div>
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-5 text-white">
              <p className="text-xs font-medium opacity-80 uppercase tracking-wide">Entities</p>
              <p className="text-3xl font-bold mt-1">{clients.length}</p>
            </div>
            <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl p-5 text-white">
              <p className="text-xs font-medium opacity-80 uppercase tracking-wide">High Confidence</p>
              <p className="text-3xl font-bold mt-1">{cleanKPIs.filter(k => k.confidence === "High").length}</p>
            </div>
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-5 text-white">
              <p className="text-xs font-medium opacity-80 uppercase tracking-wide">Quarters</p>
              <p className="text-3xl font-bold mt-1">4</p>
            </div>
          </div>
        )}

        {/* Charts Row 1 — Revenue Trend + Revenue by Entity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-slate-100 p-6">
            <h3 className="text-sm font-bold text-slate-700 mb-4">Revenue Trend</h3>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={chartData}>
                  <defs>
                    {clientNames.map((name, i) => (
                      <linearGradient key={name} id={`demo-grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={CHART_COLORS[i % CHART_COLORS.length]} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={CHART_COLORS[i % CHART_COLORS.length]} stopOpacity={0} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
                    formatter={(value, name) => [`$${value?.toLocaleString()}M`, name]}
                  />
                  <Legend />
                  {clientNames.map((name, i) => (
                    <Area
                      key={name} type="monotone" dataKey={name}
                      stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={2.5}
                      fill={`url(#demo-grad-${i})`}
                      dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6, strokeWidth: 0 }}
                      connectNulls animationDuration={800}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-slate-400 text-center py-10">No revenue data</p>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 p-6">
            <h3 className="text-sm font-bold text-slate-700 mb-4">Revenue by Entity</h3>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="period" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
                    formatter={(value, name) => [`$${value?.toLocaleString()}M`, name]}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {clientNames.map((name, i) => (
                    <Bar key={name} dataKey={name} fill={CHART_COLORS[i % CHART_COLORS.length]} radius={[6, 6, 0, 0]} animationDuration={800} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-slate-400 text-center py-10">No revenue data</p>
            )}
          </div>
        </div>

        {/* Charts Row 2 — Margin + EPS Trends */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-slate-100 p-6">
            <h3 className="text-sm font-bold text-slate-700 mb-4">Margin Trends Over Time</h3>
            {marginData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={marginData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} unit="%" />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
                    formatter={(value) => [`${value?.toFixed(1)}%`]}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {marginSeries.map((name, i) => (
                    <Line key={name} type="monotone" dataKey={name}
                      stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={2}
                      dot={{ r: 3 }} activeDot={{ r: 5, strokeWidth: 0 }}
                      connectNulls animationDuration={800}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-slate-400 text-center py-10">No margin data</p>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 p-6">
            <h3 className="text-sm font-bold text-slate-700 mb-4">EPS Trends Over Time</h3>
            {epsData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={epsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
                    formatter={(value) => [`$${value?.toFixed(2)}`]}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {epsClients.map((name, i) => (
                    <Line key={name} type="monotone" dataKey={name}
                      stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={2}
                      dot={{ r: 3 }} activeDot={{ r: 5, strokeWidth: 0 }}
                      connectNulls animationDuration={800}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-slate-400 text-center py-10">No EPS data</p>
            )}
          </div>
        </div>

        {/* Charts Row 3 — Distributions + Heatmap */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl border border-slate-100 p-6">
            <h3 className="text-sm font-bold text-slate-700 mb-4">KPI Distribution</h3>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={kpiDistribution} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={3} dataKey="value" animationDuration={800}>
                  {kpiDistribution.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0" }} formatter={(value, name) => [`${value} entries`, name]} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 p-6">
            <h3 className="text-sm font-bold text-slate-700 mb-4">Data Confidence</h3>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={confidenceDist} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={3} dataKey="value" animationDuration={800}>
                  {confidenceDist.map((entry, i) => (
                    <Cell key={i} fill={CONF_COLORS[entry.name] ?? "#94a3b8"} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0" }} formatter={(value, name) => [`${value} KPIs`, name]} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 p-6">
            <h3 className="text-sm font-bold text-slate-700 mb-4">QoQ Performance Changes</h3>
            {heatmapData.length > 0 ? (
              <div className="overflow-y-auto max-h-[240px] space-y-2">
                {heatmapData.slice(0, 12).map((row, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-700 truncate">{row.client}</p>
                      <p className="text-[10px] text-slate-400 truncate">{row.kpi}</p>
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-lg whitespace-nowrap ${
                      row.change > 0 ? "text-green-700 bg-green-50" :
                      row.change < 0 ? "text-red-700 bg-red-50" :
                      "text-slate-500 bg-slate-50"
                    }`}>
                      {row.change > 0 ? "+" : ""}{row.change}%
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400 text-center py-10">Need multiple quarters</p>
            )}
          </div>
        </div>

        {/* Charts Row 4 — Composed + Gauges */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-slate-100 p-6">
            <h3 className="text-sm font-bold text-slate-700 mb-1">Revenue vs Margins</h3>
            <p className="text-[11px] text-slate-400 mb-4">Bars = Revenue ($M) · Lines = Margin (%)</p>
            {composedData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={composedData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="revenue" tick={{ fontSize: 11 }} orientation="left" label={{ value: "$M", angle: -90, position: "insideLeft", style: { fontSize: 10, fill: "#94a3b8" } }} />
                  <YAxis yAxisId="margin" tick={{ fontSize: 11 }} orientation="right" unit="%" label={{ value: "%", angle: 90, position: "insideRight", style: { fontSize: 10, fill: "#94a3b8" } }} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0" }}
                    formatter={(value, name) => {
                      if (name.includes("Revenue")) return [`$${value?.toLocaleString()}M`, name];
                      return [`${value?.toFixed(1)}%`, name];
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {revenueSeries.map((name, i) => (
                    <Bar key={name} yAxisId="revenue" dataKey={name} fill={CHART_COLORS[i % CHART_COLORS.length]} radius={[4, 4, 0, 0]} barSize={28} opacity={0.85} animationDuration={800} />
                  ))}
                  {composedMarginSeries.map((name, i) => (
                    <Line key={name} yAxisId="margin" type="monotone" dataKey={name} stroke={CHART_COLORS[(revenueSeries.length + i) % CHART_COLORS.length]} strokeWidth={2.5} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} connectNulls animationDuration={800} />
                  ))}
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-slate-400 text-center py-10">No composed data</p>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 p-6">
            <h3 className="text-sm font-bold text-slate-700 mb-1">KPI Gauges</h3>
            <p className="text-[11px] text-slate-400 mb-4">Latest values · Margins vs target</p>
            {radialData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={radialData} layout="vertical" margin={{ left: 10, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" domain={[-100, 100]} tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}%`} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={110} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0" }}
                    formatter={(value, name, props) => {
                      const d = props.payload;
                      return [formatValue(d.actual, d.unit), d.name];
                    }}
                  />
                  <ReferenceLine x={0} stroke="#94a3b8" strokeWidth={1} />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]} animationDuration={800} barSize={20}>
                    {radialData.map((d, i) => (
                      <Cell key={i} fill={d.value < 0 ? "#ef4444" : d.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-slate-400 text-center py-10">No gauge data</p>
            )}
          </div>
        </div>

        {/* Treemap */}
        {treemapData.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 p-6">
            <h3 className="text-sm font-bold text-slate-700 mb-1">KPI Landscape</h3>
            <p className="text-[11px] text-slate-400 mb-4">Size = absolute KPI value · Hover for details</p>
            <ResponsiveContainer width="100%" height={320}>
              <Treemap
                data={treemapData} dataKey="size" nameKey="name"
                stroke="#fff" animationDuration={800}
                content={({ x, y, width, height, name, shortName, client }) => {
                  if (width < 40 || height < 28) return null;
                  return (
                    <g>
                      <rect x={x} y={y} width={width} height={height} rx={6} fill="currentColor" className="text-slate-100" stroke="#fff" strokeWidth={2} />
                      <rect x={x} y={y} width={width} height={height} rx={6} fill={client === treemapData[0]?.client ? "#4f6ef7" : "#10b981"} opacity={0.8} stroke="#fff" strokeWidth={2} />
                      {width > 60 && height > 38 && (
                        <>
                          <text x={x + 8} y={y + 18} fill="#fff" fontSize={11} fontWeight="600">{shortName?.length > 14 ? shortName.slice(0, 12) + "…" : shortName}</text>
                          <text x={x + 8} y={y + 32} fill="rgba(255,255,255,0.75)" fontSize={9}>{client}</text>
                        </>
                      )}
                    </g>
                  );
                }}
              >
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0" }}
                  formatter={(value, name, props) => {
                    const d = props.payload;
                    return [formatValue(d.actual, d.unit), d.shortName];
                  }}
                  labelFormatter={(label) => label}
                />
              </Treemap>
            </ResponsiveContainer>
          </div>
        )}

        {/* KPI Table (read-only) */}
        <DemoKPITable kpis={kpis} clients={clients} selectedClientId={selectedClientId} />

        {/* Footer */}
        <div className="text-center text-xs text-slate-400 py-4">
          Static demo — data sourced from public SEC 10-Q/10-K filings for FY 2025.
          Visit <a href="https://sasrath.com" className="text-brand-500 hover:underline">sasrath.com</a> for more.
        </div>
      </div>
    </div>
  );
}
