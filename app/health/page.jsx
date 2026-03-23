"use client";

import { useState } from "react";

function StatusRow({ label, status }) {
  const ok = status?.ok;
  return (
    <div className="flex items-start gap-3 py-3 border-b border-slate-100 last:border-0">
      <span className={`mt-0.5 text-lg ${ok ? "text-green-500" : "text-red-500"}`}>
        {ok ? "✅" : "❌"}
      </span>
      <div>
        <p className="font-semibold text-slate-700 text-sm">{label}</p>
        <p className={`text-xs mt-0.5 ${ok ? "text-green-600" : "text-red-600"}`}>
          {status?.message}
        </p>
      </div>
    </div>
  );
}

export default function HealthPage() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(false);

  const check = async () => {
    setLoading(true);
    const res = await fetch("/api/health");
    const json = await res.json();
    setData(json);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 w-full max-w-md flex flex-col gap-6">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Connection Health Check</h1>
          <p className="text-sm text-slate-500 mt-1">
            Verify that your AI provider and Notion are connected correctly.
          </p>
        </div>

        <button
          onClick={check}
          disabled={loading}
          className="bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white font-semibold rounded-xl px-6 py-3 text-sm"
        >
          {loading ? "Checking connections..." : "Run Health Check"}
        </button>

        {data && (
          <div className="flex flex-col gap-1">
            <div className={`rounded-xl px-4 py-3 text-sm font-semibold mb-2 ${
              data.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
            }`}>
              {data.ok ? "🎉 All systems connected!" : "⚠️ Some connections failed — check details below."}
            </div>

            <StatusRow
              label={`AI Provider (${data.results.ai?.provider ?? "unknown"})`}
              status={data.results.ai}
            />
            <StatusRow label="Notion API"           status={data.results.notion} />
            <StatusRow label="Clients Database"     status={data.results.databases?.clients} />
            <StatusRow label="Reports Database"     status={data.results.databases?.reports} />
            <StatusRow label="KPIs Database"        status={data.results.databases?.kpis} />
          </div>
        )}

        <a href="/" className="text-sm text-brand-500 hover:text-brand-700 font-medium text-center">
          ← Back to Dashboard
        </a>
      </div>
    </div>
  );
}
