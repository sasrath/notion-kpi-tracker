"use client";

import HomePage from "@/app/page";
import { DEMO_CLIENTS, DEMO_KPIS } from "@/lib/demo-data";

// ─── JUDGES BANNER ───────────────────────────────────────────────
// Rendered above the full dashboard. Informs judges that:
//  • This is a read-only preview backed by static data
//  • Free API keys (Gemini) are provided — AI features work
//  • Notion write operations are disabled in this view
function JudgesBanner() {
  return (
    <div className="w-full bg-indigo-700 text-white px-6 py-3 flex flex-wrap items-center justify-between gap-3 text-sm">
      <div className="flex items-center gap-3">
        <span className="text-lg">🏆</span>
        <div>
          <span className="font-bold">Judges Preview</span>
          <span className="text-indigo-200 mx-2">·</span>
          <span className="text-indigo-100">
            Free API keys provided — AI forecasting &amp; queries fully functional
          </span>
          <span className="text-indigo-200 mx-2">·</span>
          <span className="text-indigo-200 text-xs">
            Static demo data · Intel / Apple / Nvidia · FY 2025
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="bg-indigo-600 border border-indigo-400 text-indigo-100 text-xs px-3 py-1 rounded-full font-medium">
          Free API · Functionality limited
        </span>
        <a
          href="https://github.com/sasrath/notion-kpi-tracker"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-white/10 hover:bg-white/20 transition text-white text-xs px-3 py-1 rounded-full font-medium"
        >
          View Source ↗
        </a>
      </div>
    </div>
  );
}

// ─── JUDGES PAGE ─────────────────────────────────────────────────
// Full dashboard rendered with static Intel / Apple / Nvidia demo data.
// No Notion API calls are made — all reads/writes are mocked locally.
// AI features (forecast, Ask AI) use real Gemini free-tier API keys.
export default function JudgesPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <JudgesBanner />
      <div className="flex-1">
        <HomePage demoData={{ kpis: DEMO_KPIS, clients: DEMO_CLIENTS }} />
      </div>
    </div>
  );
}
