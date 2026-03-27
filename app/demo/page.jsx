"use client";

import HomePage from "@/app/page";

/* eslint-disable no-unused-vars -- kept in case the imports are needed later */
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
// Renders the full main dashboard (HomeP age) backed by static data.
// No Notion API calls are made — all data comes from DEMO_KPIS/DEMO_CLIENTS.

export default function DemoPage() {
  return <HomePage demoData={{ kpis: DEMO_KPIS, clients: DEMO_CLIENTS }} />;
}
