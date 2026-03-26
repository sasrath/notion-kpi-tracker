"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area,
  ComposedChart, ReferenceLine,
  Treemap,
} from "recharts";
import {
  getRevenueTrend, getLatestSummary,
  formatValue, confidenceColor,
  getMarginTrend, getKPIDistribution,
  getConfidenceDistribution, getQuarterlyHeatmap,
  getComposedData, getRadialBarData, getTreemapData,
  deduplicateKPIs, buildForecastChartData, getEPSTrend,
} from "@/lib/transforms";

// ─── COLOURS for charts ───────────────────────────────────────────
const CHART_COLORS = [
  "#4f6ef7", "#10b981", "#f59e0b", "#ef4444",
  "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16",
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

function Skeleton({ className = "" }) {
  return <div className={`skeleton ${className}`} />;
}

function Toast({ message, type = "success", duration = 4000, onClose }) {
  useEffect(() => {
    if (!duration) return; // 0 = persistent until replaced
    const t = setTimeout(onClose, duration);
    return () => clearTimeout(t);
  }, [duration, onClose]);
  const colors = { success: "bg-green-600", error: "bg-red-600", info: "bg-blue-600" };
  return (
    <div className={`fixed bottom-6 right-6 z-50 ${colors[type]} text-white px-5 py-3 rounded-xl shadow-xl text-sm max-w-sm flex items-center gap-3`}>
      {!duration && (
        <svg className="animate-spin h-4 w-4 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {message}
    </div>
  );
}

// ─── KPI CARD ────────────────────────────────────────────────────

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
        {kpi.source === "Custom" && <Badge label="Custom" variant="custom" />}
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

// ─── ADD REPORT FORM ─────────────────────────────────────────────

function AddReportPanel({ clients, onSuccess, selectedModel }) {
  const [mode, setMode] = useState("url"); // url | upload
  const [form, setForm] = useState({ url: "", clientName: "", ticker: "", quarter: "Q1", year: new Date().getFullYear() });
  const [file, setFile] = useState(null);
  const [docType, setDocType] = useState("10-K");
  const [step, setStep] = useState("form"); // form | loading | preview | saving | done
  const [preview, setPreview] = useState(null);
  const [warnings, setWarnings] = useState([]);
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const handleFetch = async () => {
    if (mode === "url" && !form.url) return setError("Report URL is required.");
    if (mode === "upload" && !file) return setError("Please select a file to upload.");
    if (!form.clientName) return setError("Client name is required.");
    setError(null);
    setStep("loading");

    try {
      let res;
      if (mode === "url") {
        res = await fetch("/api/ingest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, model: selectedModel }),
        });
      } else {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("clientName", form.clientName);
        fd.append("ticker", form.ticker);
        fd.append("quarter", docType === "10-K" ? "Annual" : form.quarter);
        fd.append("year", form.year);
        fd.append("model", selectedModel);
        fd.append("docType", docType);
        res = await fetch("/api/upload", { method: "POST", body: fd });
      }

      const data = await res.json();

      if (!res.ok) {
        setError(data.error);
        setStep("form");
      } else {
        setPreview(data.preview);
        setWarnings(data.warnings ?? []);
        setStep("preview");
      }
    } catch {
      setError("Request failed. Please try again.");
      setStep("form");
    }
  };

  const handleConfirm = async () => {
    setStep("saving");
    const source = mode === "upload" ? `${docType}: ${file.name}` : form.url;
    const res = await fetch("/api/ingest/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kpis: preview, ...form, url: source }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error);
      setStep("preview");
    } else {
      setStep("form");
      setPreview(null);
      setFile(null);
      setForm({ url: "", clientName: "", ticker: "", quarter: "Q1", year: new Date().getFullYear() });
      onSuccess(`Saved ${data.kpiCount} KPIs for ${form.clientName}`);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped && (dropped.type === "application/pdf" || dropped.name.endsWith(".pdf") || dropped.name.endsWith(".txt"))) {
      setFile(dropped);
      setError(null);
    } else {
      setError("Only PDF and text files are supported.");
    }
  };

  const updateKPI = (i, field, val) => {
    setPreview((prev) => prev.map((k, idx) => idx === i ? { ...k, [field]: val } : k));
  };

  const removeKPI = (i) => setPreview((prev) => prev.filter((_, idx) => idx !== i));

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 flex flex-col gap-5">
      <h2 className="text-lg font-bold text-slate-800">Add Client Report</h2>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>
      )}

      {(step === "form" || step === "loading") && (
        <div className="flex flex-col gap-4">
          {/* Mode Toggle */}
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
            <button
              onClick={() => setMode("url")}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                mode === "url" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              URL
            </button>
            <button
              onClick={() => setMode("upload")}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                mode === "upload" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Upload PDF
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {mode === "url" ? (
              <div className="col-span-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 block">Report URL</label>
                <input
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="https://investor.company.com/q3-2025-earnings"
                  value={form.url}
                  onChange={(e) => setForm({ ...form, url: e.target.value })}
                />
              </div>
            ) : (
              <div className="col-span-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 block">Document</label>
                <div
                  className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer ${
                    dragActive ? "border-brand-400 bg-brand-50" : file ? "border-green-300 bg-green-50" : "border-slate-200 hover:border-slate-300"
                  }`}
                  onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.txt"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) { setFile(f); setError(null); }
                    }}
                  />
                  {file ? (
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-green-600 text-lg">📄</span>
                      <span className="text-sm font-medium text-green-700">{file.name}</span>
                      <span className="text-xs text-slate-400">({(file.size / 1024).toFixed(0)} KB)</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); setFile(null); }}
                        className="text-xs text-red-400 hover:text-red-600 ml-2"
                      >
                        ✕ Remove
                      </button>
                    </div>
                  ) : (
                    <>
                      <p className="text-2xl mb-2">📎</p>
                      <p className="text-sm text-slate-600 font-medium">Drop your 10-K, 10-Q, or earnings report here</p>
                      <p className="text-xs text-slate-400 mt-1">PDF or plain text, max 10MB</p>
                    </>
                  )}
                </div>

                <div className="flex gap-2 mt-3">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Document Type:</label>
                  {["10-K", "10-Q", "Earnings Release", "Other"].map((t) => (
                    <button
                      key={t}
                      onClick={() => setDocType(t)}
                      className={`text-xs px-3 py-1 rounded-full font-medium transition-all ${
                        docType === t ? "bg-brand-500 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 block">Client Name</label>
              <input
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="Acme Corp"
                value={form.clientName}
                onChange={(e) => setForm({ ...form, clientName: e.target.value })}
                list="client-list"
              />
              <datalist id="client-list">
                {clients.map((c) => <option key={c.id} value={c.name} />)}
              </datalist>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 block">Ticker Symbol</label>
              <input
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 uppercase"
                placeholder="e.g. AAPL"
                maxLength={10}
                value={form.ticker}
                onChange={(e) => setForm({ ...form, ticker: e.target.value.toUpperCase() })}
              />
            </div>
            <div className={mode === "upload" && docType === "10-K" ? "grid grid-cols-1 gap-3" : "grid grid-cols-2 gap-3"}>
              {!(mode === "upload" && docType === "10-K") && (
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 block">Quarter</label>
                  <select
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    value={form.quarter}
                    onChange={(e) => setForm({ ...form, quarter: e.target.value })}
                  >
                    {["Q1","Q2","Q3","Q4"].map((q) => <option key={q}>{q}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 block">Year</label>
                <input
                  type="number"
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  value={form.year}
                  onChange={(e) => setForm({ ...form, year: Number(e.target.value) })}
                  min={2000}
                  max={new Date().getFullYear()}
                />
              </div>
            </div>
          </div>
          <button
            onClick={handleFetch}
            disabled={step === "loading"}
            className="bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white font-semibold rounded-xl px-6 py-3 text-sm"
          >
            {step === "loading" ? "AI is analyzing the report..." : mode === "upload" ? "Upload & Analyze" : "Fetch & Analyze"}
          </button>
        </div>
      )}

      {step === "preview" && preview && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">
              {preview.length} KPIs extracted — review and confirm before saving
            </p>
            <button onClick={() => setStep("form")} className="text-xs text-slate-400 hover:text-slate-600">← Back</button>
          </div>

          {warnings.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 text-xs text-yellow-700">
              ⚠️ Warnings: {warnings.join(" · ")}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-500 uppercase tracking-wide border-b border-slate-100">
                  <th className="text-left py-2 pr-4">KPI</th>
                  <th className="text-left py-2 pr-4">Value</th>
                  <th className="text-left py-2 pr-4">Unit</th>
                  <th className="text-left py-2 pr-4">Confidence</th>
                  <th className="text-left py-2 pr-4">Source</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {preview.map((kpi, i) => (
                  <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="py-2 pr-4 font-medium text-slate-700">{kpi.name}</td>
                    <td className="py-2 pr-4">
                      <input
                        type="number"
                        className="border border-slate-200 rounded-lg px-2 py-1 w-24 text-sm"
                        value={kpi.value ?? ""}
                        onChange={(e) => updateKPI(i, "value", Number(e.target.value))}
                      />
                    </td>
                    <td className="py-2 pr-4 text-slate-500">{kpi.unit}</td>
                    <td className="py-2 pr-4">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${confidenceColor(kpi.confidence)}`}>
                        {kpi.confidence}
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-xs text-slate-400 max-w-xs truncate">{kpi.source}</td>
                    <td className="py-2">
                      <button onClick={() => removeKPI(i)} className="text-red-400 hover:text-red-600 text-xs">✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            onClick={handleConfirm}
            disabled={step === "saving"}
            className="bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-semibold rounded-xl px-6 py-3 text-sm"
          >
            {step === "saving" ? "Saving to Notion..." : `✓ Confirm & Save ${preview.length} KPIs to Notion`}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── CUSTOM KPI FORM ─────────────────────────────────────────────

function CustomKPIPanel({ clients, onSuccess }) {
  const [form, setForm] = useState({
    clientId: "", kpiName: "", value: "", unit: "%", quarter: "Q1",
    year: new Date().getFullYear(), notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSave = async () => {
    if (!form.clientId || !form.kpiName || form.value === "") return setError("All required fields must be filled.");
    setError(null);
    setLoading(true);

    const res = await fetch("/api/custom-kpi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, value: Number(form.value), year: Number(form.year) }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) setError(data.error);
    else {
      setForm({ clientId: "", kpiName: "", value: "", unit: "%", quarter: "Q1", year: new Date().getFullYear(), notes: "" });
      onSuccess("Custom KPI saved to Notion!");
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 flex flex-col gap-5">
      <h2 className="text-lg font-bold text-slate-800">+ Add Custom KPI</h2>
      <p className="text-sm text-slate-500">Add a KPI the AI may have missed, or your own calculated metric.</p>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 block">Client *</label>
          <select
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            value={form.clientId}
            onChange={(e) => setForm({ ...form, clientId: e.target.value })}
          >
            <option value="">Select client…</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 block">KPI Name *</label>
          <input
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="e.g. Customer Acquisition Cost"
            maxLength={100}
            value={form.kpiName}
            onChange={(e) => setForm({ ...form, kpiName: e.target.value })}
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 block">Value *</label>
          <input
            type="number"
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="0.00"
            value={form.value}
            onChange={(e) => setForm({ ...form, value: e.target.value })}
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 block">Unit *</label>
          <select
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            value={form.unit}
            onChange={(e) => setForm({ ...form, unit: e.target.value })}
          >
            {["$M", "%", "$", "x", "days", "count", "other"].map((u) => <option key={u}>{u}</option>)}
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 block">Quarter *</label>
          <select
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            value={form.quarter}
            onChange={(e) => setForm({ ...form, quarter: e.target.value })}
          >
            {["Q1","Q2","Q3","Q4"].map((q) => <option key={q}>{q}</option>)}
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 block">Year *</label>
          <input
            type="number"
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            value={form.year}
            min={2000}
            max={new Date().getFullYear()}
            onChange={(e) => setForm({ ...form, year: e.target.value })}
          />
        </div>

        <div className="col-span-2">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 block">Notes / Source</label>
          <input
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="e.g. From page 14 footnote, manually calculated"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={loading}
        className="bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white font-semibold rounded-xl px-6 py-3 text-sm"
      >
        {loading ? "Saving..." : "Save Custom KPI to Notion"}
      </button>
    </div>
  );
}

// ─── KPI TABLE WITH PAGINATION + DELETE ──────────────────────────

const PAGE_SIZE = 20;

function KPITable({ kpis, clients, selectedClientId, onDelete }) {
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState(new Set());
  const [deleting, setDeleting] = useState(false);

  // Reset page when filters change
  useEffect(() => { setPage(0); setSelected(new Set()); }, [selectedClientId]);

  const filtered = kpis.filter((k) => !selectedClientId || k.clientId === selectedClientId);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageKPIs = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === pageKPIs.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(pageKPIs.map((k) => k.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} KPI record(s)? This cannot be undone.`)) return;
    setDeleting(true);
    await onDelete(Array.from(selected));
    setSelected(new Set());
    setDeleting(false);
  };

  const handleSingleDelete = async (id) => {
    if (!confirm("Delete this KPI record? This cannot be undone.")) return;
    setDeleting(true);
    await onDelete([id]);
    setSelected((prev) => { const next = new Set(prev); next.delete(id); return next; });
    setDeleting(false);
  };

  const clientName = selectedClientId
    ? clients.find((c) => c.id === selectedClientId)?.name ?? "Unknown"
    : null;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
      {deleting && (
        <div className="px-6 py-2.5 bg-amber-50 border-b border-amber-200 flex items-center gap-2.5">
          <svg className="animate-spin h-4 w-4 text-amber-600 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-xs font-semibold text-amber-800">Deleting records from Notion… please wait</span>
        </div>
      )}
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-700">
            {clientName ? `${clientName} — KPIs` : "All KPIs"}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Showing {pageKPIs.length} of {filtered.length} records
            {!selectedClientId && " · Select a company to filter"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <button
              onClick={handleBulkDelete}
              disabled={deleting}
              className="bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-xs font-semibold rounded-lg px-3 py-1.5"
            >
              {deleting ? "Deleting…" : `Delete ${selected.size} selected`}
            </button>
          )}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
              <th className="text-left px-4 py-3 w-8">
                <input
                  type="checkbox"
                  checked={pageKPIs.length > 0 && selected.size === pageKPIs.length}
                  onChange={toggleAll}
                  className="rounded border-slate-300"
                />
              </th>
              {["Client","KPI","Value","Unit","Quarter","Year","Source","Confidence",""].map((h) => (
                <th key={h} className="text-left px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageKPIs.map((kpi) => {
              const cn = clients.find((c) => c.id === kpi.clientId)?.name ?? "Unknown";
              return (
                <tr key={kpi.id} className={`border-t border-slate-50 hover:bg-slate-50 ${selected.has(kpi.id) ? "bg-blue-50/50" : ""}`}>
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(kpi.id)}
                      onChange={() => toggleSelect(kpi.id)}
                      className="rounded border-slate-300"
                    />
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-700">{cn}</td>
                  <td className="px-4 py-3 text-slate-600">{kpi.name}</td>
                  <td className="px-4 py-3 font-mono text-slate-800">{formatValue(kpi.value, kpi.unit)}</td>
                  <td className="px-4 py-3 text-slate-500">{kpi.unit}</td>
                  <td className="px-4 py-3 text-slate-500">{kpi.quarter}</td>
                  <td className="px-4 py-3 text-slate-500">{kpi.year}</td>
                  <td className="px-4 py-3">
                    <Badge label={kpi.source} variant={kpi.source === "Custom" ? "custom" : "ai"} />
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${confidenceColor(kpi.confidence)}`}>
                      {kpi.confidence}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleSingleDelete(kpi.id)}
                      disabled={deleting}
                      className="text-red-400 hover:text-red-600 disabled:opacity-30 text-xs font-medium"
                      title="Delete this KPI"
                    >
                      🗑
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            Page {page + 1} of {totalPages}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage(0)}
              disabled={page === 0}
              className="px-2 py-1 text-xs rounded-md border border-slate-200 disabled:opacity-30 hover:bg-slate-50"
            >
              ««
            </button>
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-2 py-1 text-xs rounded-md border border-slate-200 disabled:opacity-30 hover:bg-slate-50"
            >
              ‹ Prev
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="px-2 py-1 text-xs rounded-md border border-slate-200 disabled:opacity-30 hover:bg-slate-50"
            >
              Next ›
            </button>
            <button
              onClick={() => setPage(totalPages - 1)}
              disabled={page >= totalPages - 1}
              className="px-2 py-1 text-xs rounded-md border border-slate-200 disabled:opacity-30 hover:bg-slate-50"
            >
              »»
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── QUERY PANEL ─────────────────────────────────────────────────

function QueryPanel({ selectedModel, demoData }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleQuery = async () => {
    if (!question.trim()) return;
    setLoading(true);
    setAnswer(null);

    const res = await fetch("/api/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question,
        model: selectedModel,
        ...(demoData ? { kpis: demoData.kpis, clients: demoData.clients } : {}),
      }),
    });
    const data = await res.json();
    setAnswer(data.answer ?? data.error);
    setLoading(false);
  };

  const suggestions = [
    "Which client had the highest revenue in Q4?",
    "Who is underperforming vs last quarter?",
    "Compare gross margins across all clients",
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 flex flex-col gap-4">
      <h2 className="text-lg font-bold text-slate-800">Ask AI</h2>
      <div className="flex gap-3">
        <input
          className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          placeholder="Which client had the best Q4 performance?"
          value={question}
          maxLength={500}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleQuery()}
        />
        <button
          onClick={handleQuery}
          disabled={loading || !question.trim()}
          className="bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white font-semibold rounded-xl px-5 py-2.5 text-sm whitespace-nowrap"
        >
          {loading ? "Thinking..." : "Ask"}
        </button>
      </div>

      {!answer && (
        <div className="flex gap-2 flex-wrap">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => setQuestion(s)}
              className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full px-3 py-1.5"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {answer && (
        <div className="bg-slate-50 rounded-xl px-5 py-4 text-sm text-slate-700 leading-relaxed border border-slate-100 whitespace-pre-wrap">
          {answer}
        </div>
      )}
    </div>
  );
}

// ─── MAIN PAGE ───────────────────────────────────────────────────

export default function HomePage({ demoData } = {}) {
  const [clients, setClients] = useState([]);
  const [kpis, setKPIs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [toast, setToast] = useState(null);
  const [lastSync, setLastSync] = useState(null);
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState("");
  const [forecasts, setForecasts] = useState([]);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [forecastError, setForecastError] = useState(null);
  const forecastFetchedRef = useRef(false);

  const fetchData = useCallback(async () => {
    if (demoData) {
      setClients(demoData.clients);
      setKPIs(demoData.kpis);
      setLastSync(new Date());
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [cRes, kRes] = await Promise.all([
        fetch("/api/clients"),
        fetch("/api/kpis"),
      ]);
      const { clients: c } = await cRes.json();
      const { kpis: k } = await kRes.json();
      setClients(c ?? []);
      setKPIs(k ?? []);
      setLastSync(new Date());
    } catch {
      showToast("Failed to load data from Notion.", "error");
    }
    setLoading(false);
  }, [demoData]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Fetch available models on mount
  useEffect(() => {
    fetch("/api/models")
      .then((r) => r.json())
      .then(({ models: m, defaultModel }) => {
        setModels(m ?? []);
        setSelectedModel(defaultModel);
      })
      .catch(() => {});
  }, []);

  const handleModelChange = (modelId) => {
    const model = models.find((m) => m.id === modelId);
    if (model && !model.available) {
      showToast(`⚠️ No API key configured for ${model.label}. Add ${model.provider === "google" ? "GOOGLE_API_KEY" : "ANTHROPIC_API_KEY"} to .env.local`, "error");
      return;
    }
    setSelectedModel(modelId);
  };

  // Fetch AI revenue forecast for ALL clients (once on load, or on Refresh)
  const fetchForecast = useCallback(async () => {
    setForecastLoading(true);
    setForecastError(null);
    try {
      const res = await fetch("/api/forecast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: selectedModel,
          ...(demoData ? { kpis: demoData.kpis, clients: demoData.clients } : {}),
        }),
      });
      const data = await res.json();
      if (data.error) {
        setForecastError(data.error);
        setForecasts([]);
      } else {
        setForecasts(data.forecasts ?? []);
        forecastFetchedRef.current = true;
      }
    } catch {
      setForecastError("Failed to fetch forecast.");
      setForecasts([]);
    }
    setForecastLoading(false);
  }, [selectedModel]);

  // Auto-fetch forecast once when data + model are ready
  useEffect(() => {
    if (kpis.length > 0 && clients.length > 0 && selectedModel && !forecastFetchedRef.current) {
      fetchForecast();
    }
  }, [kpis.length, clients.length, selectedModel, fetchForecast]);

  const showToast = (message, type = "success", duration = 4000) => {
    setToast({ message, type, duration });
  };

  const handleSuccess = (msg) => {
    showToast(msg);
    // Notion search has eventual consistency — allow indexing time
    setTimeout(() => fetchData(), 1500);
  };

  const handleDeleteKPIs = async (ids) => {
    if (!ids.length) return;
    showToast(`Deleting ${ids.length} KPI record${ids.length > 1 ? "s" : ""}…`, "info", 0);
    try {
      const res = await fetch("/api/kpis/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Delete failed.", "error");
      } else {
        showToast(`Deleted ${data.deleted} KPI(s).`);
        // Remove deleted from local state immediately
        setKPIs((prev) => prev.filter((k) => !ids.includes(k.id)));
      }
    } catch {
      showToast("Failed to delete KPIs.", "error");
    }
  };

  // Dashboard data — normalize units, deduplicate, then filter by selected client
  const cleanKPIs = deduplicateKPIs(kpis);

  // Only show entities that have at least one KPI record
  const clientIdsWithData = new Set(cleanKPIs.map((k) => k.clientId));
  const activeClients = clients.filter((c) => clientIdsWithData.has(c.id));

  // If the currently selected entity was just deleted down to zero records, reset to "All"
  if (selectedClientId && !clientIdsWithData.has(selectedClientId)) {
    setSelectedClientId(null);
  }

  const filteredKPIs = selectedClientId ? cleanKPIs.filter((k) => k.clientId === selectedClientId) : cleanKPIs;
  const summary   = getLatestSummary(filteredKPIs, clients, selectedClientId);
  const { chartData, clientNames } = getRevenueTrend(filteredKPIs, clients);
  const { chartData: forecastChartData, clientNames: forecastClients } = buildForecastChartData(filteredKPIs, clients, forecasts);
  // Filter reasoning text to match the selected client
  const visibleForecasts = selectedClientId
    ? forecasts.filter((f) => {
        const selectedName = clients.find((c) => c.id === selectedClientId)?.name ?? "";
        const fcName = (f.client ?? "").toLowerCase();
        const selLower = selectedName.toLowerCase();
        return fcName === selLower || fcName.includes(selLower) || selLower.includes(fcName);
      })
    : forecasts;
  const { chartData: marginData, seriesNames: marginSeries } = getMarginTrend(filteredKPIs, clients);
  const { chartData: epsData, clientNames: epsClients } = getEPSTrend(filteredKPIs, clients);
  const kpiDistribution = getKPIDistribution(filteredKPIs);
  const confidenceDist = getConfidenceDistribution(filteredKPIs);
  const heatmapData = getQuarterlyHeatmap(filteredKPIs, clients);
  const { chartData: composedData, revenueSeries, marginSeries: composedMarginSeries } = getComposedData(filteredKPIs, clients);
  const radialData = getRadialBarData(filteredKPIs, clients, selectedClientId);
  const treemapData = getTreemapData(filteredKPIs, clients);

  const PIE_COLORS = ["#4f6ef7", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16", "#f97316", "#6366f1"];
  const CONF_COLORS = { High: "#10b981", Medium: "#f59e0b", Low: "#ef4444" };

  const tabs = [
    { id: "dashboard", label: "Dashboard" },
    { id: "add",       label: "Add Report" },
    { id: "custom",    label: "Custom KPI" },
    { id: "query",     label: "Ask AI" },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">K</div>
          <span className="font-bold text-slate-800 text-lg">KPI Tracker</span>
          <span className="text-xs text-slate-400 hidden sm:block">Powered by Notion MCP</span>
        </div>
        <div className="flex items-center gap-4">
          {models.length > 0 && (
            <select
              className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-500"
              value={selectedModel}
              onChange={(e) => handleModelChange(e.target.value)}
            >
              {models.map((m) => (
                <option key={m.id} value={m.id} disabled={!m.available}>
                  {m.label}{!m.available ? " (no API key)" : ""}
                </option>
              ))}
            </select>
          )}
          {lastSync && (
            <span className="text-xs text-slate-400 hidden sm:block">
              Synced {lastSync.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={fetchData}
            className="text-sm text-brand-500 hover:text-brand-700 font-medium"
          >
            ↻ Refresh
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6">

        {/* Tabs */}
        <div className="flex gap-1 bg-white rounded-2xl p-1 border border-slate-100 w-fit">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${
                activeTab === tab.id
                  ? "bg-brand-500 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Dashboard */}
        {activeTab === "dashboard" && (
          <div className="flex flex-col gap-6">
            {/* Client filter */}
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-500 font-medium">Filter:</span>
              <button
                onClick={() => setSelectedClientId(null)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                  !selectedClientId ? "bg-brand-500 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                All Entities
              </button>
              {activeClients.map((c) => (
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
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                {Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-28" />)}
              </div>
            ) : kpis.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
                <p className="text-4xl mb-3">📊</p>
                <p className="text-slate-600 font-semibold text-lg mb-1">No data yet</p>
                <p className="text-slate-400 text-sm">Go to &quot;Add Report&quot; to ingest your first client quarterly report.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                {summary.map((kpi) => <KPICard key={kpi.name} kpi={kpi} />)}
              </div>
            )}

            {/* Stats overview bar — only show on "All Entities" view */}
            {!loading && cleanKPIs.length > 0 && !selectedClientId && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-5 text-white">
                  <p className="text-xs font-medium opacity-80 uppercase tracking-wide">Total KPIs</p>
                  <p className="text-3xl font-bold mt-1">{cleanKPIs.length}</p>
                </div>
                <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-5 text-white">
                  <p className="text-xs font-medium opacity-80 uppercase tracking-wide">Clients</p>
                  <p className="text-3xl font-bold mt-1">{clients.length}</p>
                </div>
                <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl p-5 text-white">
                  <p className="text-xs font-medium opacity-80 uppercase tracking-wide">High Confidence</p>
                  <p className="text-3xl font-bold mt-1">{cleanKPIs.filter(k => k.confidence === "High").length}</p>
                </div>
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-5 text-white">
                  <p className="text-xs font-medium opacity-80 uppercase tracking-wide">Custom KPIs</p>
                  <p className="text-3xl font-bold mt-1">{cleanKPIs.filter(k => k.source === "Custom").length}</p>
                </div>
              </div>
            )}

            {/* Charts Row 1 — Revenue Trend + Radar Chart */}
            {!loading && kpis.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Revenue Trend Line Chart */}
                <div className="bg-white rounded-2xl border border-slate-100 p-6">
                  <h3 className="text-sm font-bold text-slate-700 mb-4">Revenue Trend</h3>
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <AreaChart data={chartData}>
                        <defs>
                          {clientNames.map((name, i) => (
                            <linearGradient key={name} id={`grad-${i}`} x1="0" y1="0" x2="0" y2="1">
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
                            key={name}
                            type="monotone"
                            dataKey={name}
                            stroke={CHART_COLORS[i % CHART_COLORS.length]}
                            strokeWidth={2.5}
                            fill={`url(#grad-${i})`}
                            dot={{ r: 4, strokeWidth: 2 }}
                            activeDot={{ r: 6, strokeWidth: 0 }}
                            connectNulls
                            animationDuration={800}
                          />
                        ))}
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-sm text-slate-400 text-center py-10">No revenue data found</p>
                  )}
                </div>

                {/* Right panel: Forecast (individual client) or Revenue by Client (all clients) */}
                <div className="bg-white rounded-2xl border border-slate-100 p-6">
                  {selectedClientId ? (
                    <>
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-sm font-bold text-slate-700">Revenue Forecast (AI)</h3>
                        <button
                          onClick={() => { forecastFetchedRef.current = false; fetchForecast(); }}
                          disabled={forecastLoading}
                          className="text-[11px] px-2 py-1 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 disabled:opacity-50 transition"
                        >
                          {forecastLoading ? "Forecasting…" : "Refresh"}
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-400 mb-4">Historical + AI-predicted next quarter</p>
                      {forecastLoading ? (
                        <div className="flex items-center justify-center py-16">
                          <div className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                          <span className="ml-2 text-xs text-slate-400">AI forecasting…</span>
                        </div>
                      ) : forecastError ? (
                        <p className="text-sm text-red-400 text-center py-10">{forecastError}</p>
                      ) : forecastChartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={280}>
                          <BarChart data={forecastChartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="period" tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip
                              contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
                              formatter={(value, name, props) => {
                                const isForecast = props.payload._forecast;
                                return [`$${value?.toLocaleString()}M${isForecast ? " (forecast)" : ""}`, name];
                              }}
                            />
                            <Legend wrapperStyle={{ fontSize: 11 }} />
                            {forecastClients.map((name, i) => (
                              <Bar
                                key={name}
                                dataKey={name}
                                fill={CHART_COLORS[i % CHART_COLORS.length]}
                                radius={[6, 6, 0, 0]}
                                animationDuration={800}
                              />
                            ))}
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <p className="text-sm text-slate-400 text-center py-10">No revenue data for forecast</p>
                      )}
                      {visibleForecasts.length > 0 && (
                        <div className="mt-3 space-y-1">
                          {visibleForecasts.map((f, i) => (
                            <p key={i} className="text-[11px] text-slate-500">
                              <span className="font-medium text-slate-700">{f.client}</span>: {f.reasoning}
                            </p>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <h3 className="text-sm font-bold text-slate-700 mb-4">Revenue by Client</h3>
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
                              <Bar
                                key={name}
                                dataKey={name}
                                fill={CHART_COLORS[i % CHART_COLORS.length]}
                                radius={[6, 6, 0, 0]}
                                animationDuration={800}
                              />
                            ))}
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <p className="text-sm text-slate-400 text-center py-10">No revenue data available</p>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Charts Row 2 — Margin Trend + EPS Trend */}
            {!loading && kpis.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Margin Trend Area Chart */}
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
                          <Line
                            key={name}
                            type="monotone"
                            dataKey={name}
                            stroke={CHART_COLORS[i % CHART_COLORS.length]}
                            strokeWidth={2}
                            dot={{ r: 3 }}
                            activeDot={{ r: 5, strokeWidth: 0 }}
                            connectNulls
                            animationDuration={800}
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-sm text-slate-400 text-center py-10">No margin data found</p>
                  )}
                </div>

                {/* EPS Trend Line Chart */}
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
                          <Line
                            key={name}
                            type="monotone"
                            dataKey={name}
                            stroke={CHART_COLORS[i % CHART_COLORS.length]}
                            strokeWidth={2}
                            dot={{ r: 3 }}
                            activeDot={{ r: 5, strokeWidth: 0 }}
                            connectNulls
                            animationDuration={800}
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-sm text-slate-400 text-center py-10">No EPS data found</p>
                  )}
                </div>
              </div>
            )}

            {/* Charts Row 3 — Distribution Charts + Heatmap */}
            {!loading && kpis.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* KPI Distribution Pie */}
                <div className="bg-white rounded-2xl border border-slate-100 p-6">
                  <h3 className="text-sm font-bold text-slate-700 mb-4">KPI Distribution</h3>
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie
                        data={kpiDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={85}
                        paddingAngle={3}
                        dataKey="value"
                        animationDuration={800}
                      >
                        {kpiDistribution.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
                        formatter={(value, name) => [`${value} entries`, name]}
                      />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Confidence Distribution */}
                <div className="bg-white rounded-2xl border border-slate-100 p-6">
                  <h3 className="text-sm font-bold text-slate-700 mb-4">Data Confidence</h3>
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie
                        data={confidenceDist}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={85}
                        paddingAngle={3}
                        dataKey="value"
                        animationDuration={800}
                      >
                        {confidenceDist.map((entry, i) => (
                          <Cell key={i} fill={CONF_COLORS[entry.name] ?? "#94a3b8"} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
                        formatter={(value, name) => [`${value} KPIs`, name]}
                      />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* QoQ Change Heatmap */}
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
                    <p className="text-sm text-slate-400 text-center py-10">Need multiple quarters for comparison</p>
                  )}
                </div>
              </div>
            )}

            {/* Charts Row 4 — Composed Revenue+Margin + Radial KPI Gauges */}
            {!loading && kpis.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Composed Chart — Revenue bars + Margin lines */}
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
                          contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
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
                    <p className="text-sm text-slate-400 text-center py-10">No revenue/margin data for composed view</p>
                  )}
                </div>

                {/* KPI Gauges — horizontal bars with negative support */}
                <div className="bg-white rounded-2xl border border-slate-100 p-6">
                  <h3 className="text-sm font-bold text-slate-700 mb-1">KPI Gauges</h3>
                  <p className="text-[11px] text-slate-400 mb-4">Latest values · Margins vs target (Gross 60%, Net 30%)</p>
                  {radialData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={radialData} layout="vertical" margin={{ left: 10, right: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                        <XAxis type="number" domain={[-100, 100]} tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}%`} />
                        <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={110} />
                        <Tooltip
                          contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
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
                    <p className="text-sm text-slate-400 text-center py-10">No KPI data for gauges</p>
                  )}
                </div>
              </div>
            )}

            {/* Charts Row 5 — Treemap */}
            {!loading && kpis.length > 0 && treemapData.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-100 p-6">
                <h3 className="text-sm font-bold text-slate-700 mb-1">KPI Landscape</h3>
                <p className="text-[11px] text-slate-400 mb-4">Size = absolute KPI value · Hover for details</p>
                <ResponsiveContainer width="100%" height={320}>
                  <Treemap
                    data={treemapData}
                    dataKey="size"
                    nameKey="name"
                    stroke="#fff"
                    animationDuration={800}
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
                      contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
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

            {/* Full KPI Table — filtered by company, top 20, with delete */}
            {!loading && kpis.length > 0 && (
              <KPITable
                kpis={kpis}
                clients={clients}
                selectedClientId={selectedClientId}
                onDelete={(ids) => {
                  handleDeleteKPIs(ids);
                }}
              />
            )}
          </div>
        )}

        {/* Always mount Add Report so async processing survives tab switches */}
        <div className={activeTab === "add" ? "" : "hidden"}>
          <AddReportPanel clients={clients} onSuccess={handleSuccess} selectedModel={selectedModel} />
        </div>
        <div className={activeTab === "custom" ? "" : "hidden"}>
          <CustomKPIPanel clients={clients} onSuccess={handleSuccess} />
        </div>
        <div className={activeTab === "query" ? "" : "hidden"}>
          <QueryPanel selectedModel={selectedModel} demoData={demoData} />
        </div>
      </div>

      {toast && (
        <Toast message={toast.message} type={toast.type} duration={toast.duration} onClose={() => setToast(null)} />
      )}
    </div>
  );
}
