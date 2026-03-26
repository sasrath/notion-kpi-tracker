"use client";

import { useState } from "react";
import { DEMO_CLIENTS, DEMO_KPIS } from "@/lib/demo-data";
import HomePage from "@/app/page";

function PasswordGate({ onAuth }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [checking, setChecking] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password.trim()) return;
    setChecking(true);
    setError(null);
    try {
      const res = await fetch("/api/judges-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        onAuth();
      } else {
        const data = await res.json();
        setError(data.error || "Incorrect password.");
      }
    } catch {
      setError("Network error. Try again.");
    }
    setChecking(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-100 p-8 w-full max-w-sm flex flex-col gap-5 shadow-lg">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 bg-brand-500 rounded-xl flex items-center justify-center text-white font-bold text-lg">K</div>
          <h1 className="text-lg font-bold text-slate-800">KPI Tracker — Judges</h1>
          <p className="text-xs text-slate-400 text-center">Enter the access password to continue</p>
        </div>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-2.5 text-sm text-center">{error}</div>
        )}
        <input
          type="password"
          autoFocus
          className="border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button
          type="submit"
          disabled={checking || !password.trim()}
          className="bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white font-semibold rounded-xl px-5 py-3 text-sm transition-colors"
        >
          {checking ? "Verifying…" : "Enter"}
        </button>
      </form>
    </div>
  );
}

const DEMO_DATA = { clients: DEMO_CLIENTS, kpis: DEMO_KPIS };

export default function JudgesPage() {
  const [authed, setAuthed] = useState(false);

  if (!authed) return <PasswordGate onAuth={() => setAuthed(true)} />;

  return (
    <div className="relative">
      {/* Disclaimer banner */}
      <div className="bg-amber-50 border-b border-amber-200 px-6 py-3 text-center sticky top-0 z-50">
        <p className="text-sm text-amber-800 font-medium">
          ⚠️ Demo mode — Intel / Apple / Nvidia FY 2025 public data. Only free API keys active; AI features may be limited.
        </p>
      </div>
      <HomePage demoData={DEMO_DATA} />
    </div>
  );
}
