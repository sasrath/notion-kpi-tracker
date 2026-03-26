// Shared static demo data — Intel, Apple, Nvidia public 10-Q/10-K FY 2025
// Used by both /demo (read-only showcase) and /judges (full-featured with static data)

export const DEMO_CLIENTS = [
  { id: "intel",  name: "Intel",  industry: "Semiconductors",       website: "intel.com",  status: "Active" },
  { id: "apple",  name: "Apple",  industry: "Consumer Electronics", website: "apple.com",  status: "Active" },
  { id: "nvidia", name: "Nvidia", industry: "Semiconductors",       website: "nvidia.com", status: "Active" },
];

export const DEMO_KPIS = [
  // ── Intel ──────────────────────────────────────────────────────────────────
  { id: "i-r-q1",  name: "Revenue",           value: 12700,  unit: "$M", quarter: "Q1", year: 2025, clientId: "intel",  source: "10-Q", confidence: "High"   },
  { id: "i-gm-q1", name: "Gross Margin",       value: 39.2,   unit: "%",  quarter: "Q1", year: 2025, clientId: "intel",  source: "10-Q", confidence: "High"   },
  { id: "i-nm-q1", name: "Net Margin",         value: -1.8,   unit: "%",  quarter: "Q1", year: 2025, clientId: "intel",  source: "10-Q", confidence: "High"   },
  { id: "i-eps-q1",name: "EPS",                value: -0.09,  unit: "$",  quarter: "Q1", year: 2025, clientId: "intel",  source: "10-Q", confidence: "High"   },
  { id: "i-oi-q1", name: "Operating Income",   value: -200,   unit: "$M", quarter: "Q1", year: 2025, clientId: "intel",  source: "10-Q", confidence: "High"   },

  { id: "i-r-q2",  name: "Revenue",            value: 13280,  unit: "$M", quarter: "Q2", year: 2025, clientId: "intel",  source: "10-Q", confidence: "High"   },
  { id: "i-gm-q2", name: "Gross Margin",       value: 40.1,   unit: "%",  quarter: "Q2", year: 2025, clientId: "intel",  source: "10-Q", confidence: "High"   },
  { id: "i-nm-q2", name: "Net Margin",         value: 1.2,    unit: "%",  quarter: "Q2", year: 2025, clientId: "intel",  source: "10-Q", confidence: "High"   },
  { id: "i-eps-q2",name: "EPS",                value: 0.04,   unit: "$",  quarter: "Q2", year: 2025, clientId: "intel",  source: "10-Q", confidence: "High"   },
  { id: "i-oi-q2", name: "Operating Income",   value: 310,    unit: "$M", quarter: "Q2", year: 2025, clientId: "intel",  source: "10-Q", confidence: "High"   },

  { id: "i-r-q3",  name: "Revenue",            value: 14100,  unit: "$M", quarter: "Q3", year: 2025, clientId: "intel",  source: "10-Q", confidence: "High"   },
  { id: "i-gm-q3", name: "Gross Margin",       value: 41.5,   unit: "%",  quarter: "Q3", year: 2025, clientId: "intel",  source: "10-Q", confidence: "High"   },
  { id: "i-nm-q3", name: "Net Margin",         value: 3.1,    unit: "%",  quarter: "Q3", year: 2025, clientId: "intel",  source: "10-Q", confidence: "Medium" },
  { id: "i-eps-q3",name: "EPS",                value: 0.10,   unit: "$",  quarter: "Q3", year: 2025, clientId: "intel",  source: "10-Q", confidence: "Medium" },
  { id: "i-oi-q3", name: "Operating Income",   value: 620,    unit: "$M", quarter: "Q3", year: 2025, clientId: "intel",  source: "10-Q", confidence: "High"   },

  { id: "i-r-q4",  name: "Revenue",            value: 14500,  unit: "$M", quarter: "Q4", year: 2025, clientId: "intel",  source: "10-K", confidence: "High"   },
  { id: "i-gm-q4", name: "Gross Margin",       value: 42.0,   unit: "%",  quarter: "Q4", year: 2025, clientId: "intel",  source: "10-K", confidence: "High"   },
  { id: "i-nm-q4", name: "Net Margin",         value: 4.5,    unit: "%",  quarter: "Q4", year: 2025, clientId: "intel",  source: "10-K", confidence: "High"   },
  { id: "i-eps-q4",name: "EPS",                value: 0.15,   unit: "$",  quarter: "Q4", year: 2025, clientId: "intel",  source: "10-K", confidence: "High"   },
  { id: "i-oi-q4", name: "Operating Income",   value: 870,    unit: "$M", quarter: "Q4", year: 2025, clientId: "intel",  source: "10-K", confidence: "High"   },

  // ── Apple ──────────────────────────────────────────────────────────────────
  { id: "a-r-q1",  name: "Revenue",            value: 124300, unit: "$M", quarter: "Q1", year: 2025, clientId: "apple",  source: "10-Q", confidence: "High"   },
  { id: "a-gm-q1", name: "Gross Margin",       value: 46.9,   unit: "%",  quarter: "Q1", year: 2025, clientId: "apple",  source: "10-Q", confidence: "High"   },
  { id: "a-nm-q1", name: "Net Margin",         value: 26.3,   unit: "%",  quarter: "Q1", year: 2025, clientId: "apple",  source: "10-Q", confidence: "High"   },
  { id: "a-eps-q1",name: "EPS",                value: 2.18,   unit: "$",  quarter: "Q1", year: 2025, clientId: "apple",  source: "10-Q", confidence: "High"   },
  { id: "a-oi-q1", name: "Operating Income",   value: 42500,  unit: "$M", quarter: "Q1", year: 2025, clientId: "apple",  source: "10-Q", confidence: "High"   },

  { id: "a-r-q2",  name: "Revenue",            value: 95400,  unit: "$M", quarter: "Q2", year: 2025, clientId: "apple",  source: "10-Q", confidence: "High"   },
  { id: "a-gm-q2", name: "Gross Margin",       value: 46.6,   unit: "%",  quarter: "Q2", year: 2025, clientId: "apple",  source: "10-Q", confidence: "High"   },
  { id: "a-nm-q2", name: "Net Margin",         value: 24.8,   unit: "%",  quarter: "Q2", year: 2025, clientId: "apple",  source: "10-Q", confidence: "High"   },
  { id: "a-eps-q2",name: "EPS",                value: 1.58,   unit: "$",  quarter: "Q2", year: 2025, clientId: "apple",  source: "10-Q", confidence: "High"   },
  { id: "a-oi-q2", name: "Operating Income",   value: 31200,  unit: "$M", quarter: "Q2", year: 2025, clientId: "apple",  source: "10-Q", confidence: "High"   },

  { id: "a-r-q3",  name: "Revenue",            value: 85800,  unit: "$M", quarter: "Q3", year: 2025, clientId: "apple",  source: "10-Q", confidence: "High"   },
  { id: "a-gm-q3", name: "Gross Margin",       value: 46.3,   unit: "%",  quarter: "Q3", year: 2025, clientId: "apple",  source: "10-Q", confidence: "High"   },
  { id: "a-nm-q3", name: "Net Margin",         value: 23.7,   unit: "%",  quarter: "Q3", year: 2025, clientId: "apple",  source: "10-Q", confidence: "Medium" },
  { id: "a-eps-q3",name: "EPS",                value: 1.35,   unit: "$",  quarter: "Q3", year: 2025, clientId: "apple",  source: "10-Q", confidence: "Medium" },
  { id: "a-oi-q3", name: "Operating Income",   value: 27100,  unit: "$M", quarter: "Q3", year: 2025, clientId: "apple",  source: "10-Q", confidence: "High"   },

  { id: "a-r-q4",  name: "Revenue",            value: 89900,  unit: "$M", quarter: "Q4", year: 2025, clientId: "apple",  source: "10-K", confidence: "High"   },
  { id: "a-gm-q4", name: "Gross Margin",       value: 46.2,   unit: "%",  quarter: "Q4", year: 2025, clientId: "apple",  source: "10-K", confidence: "High"   },
  { id: "a-nm-q4", name: "Net Margin",         value: 25.0,   unit: "%",  quarter: "Q4", year: 2025, clientId: "apple",  source: "10-K", confidence: "High"   },
  { id: "a-eps-q4",name: "EPS",                value: 1.46,   unit: "$",  quarter: "Q4", year: 2025, clientId: "apple",  source: "10-K", confidence: "High"   },
  { id: "a-oi-q4", name: "Operating Income",   value: 29800,  unit: "$M", quarter: "Q4", year: 2025, clientId: "apple",  source: "10-K", confidence: "High"   },

  // ── Nvidia ─────────────────────────────────────────────────────────────────
  { id: "n-r-q1",  name: "Revenue",            value: 44070,  unit: "$M", quarter: "Q1", year: 2025, clientId: "nvidia", source: "10-Q", confidence: "High"   },
  { id: "n-gm-q1", name: "Gross Margin",       value: 78.4,   unit: "%",  quarter: "Q1", year: 2025, clientId: "nvidia", source: "10-Q", confidence: "High"   },
  { id: "n-nm-q1", name: "Net Margin",         value: 55.8,   unit: "%",  quarter: "Q1", year: 2025, clientId: "nvidia", source: "10-Q", confidence: "High"   },
  { id: "n-eps-q1",name: "EPS",                value: 0.96,   unit: "$",  quarter: "Q1", year: 2025, clientId: "nvidia", source: "10-Q", confidence: "High"   },
  { id: "n-oi-q1", name: "Operating Income",   value: 29600,  unit: "$M", quarter: "Q1", year: 2025, clientId: "nvidia", source: "10-Q", confidence: "High"   },
  { id: "n-cc-q1", name: "Customer Count",     value: 4200,   unit: "#",  quarter: "Q1", year: 2025, clientId: "nvidia", source: "10-Q", confidence: "Medium" },

  { id: "n-r-q2",  name: "Revenue",            value: 48900,  unit: "$M", quarter: "Q2", year: 2025, clientId: "nvidia", source: "10-Q", confidence: "High"   },
  { id: "n-gm-q2", name: "Gross Margin",       value: 77.8,   unit: "%",  quarter: "Q2", year: 2025, clientId: "nvidia", source: "10-Q", confidence: "High"   },
  { id: "n-nm-q2", name: "Net Margin",         value: 56.2,   unit: "%",  quarter: "Q2", year: 2025, clientId: "nvidia", source: "10-Q", confidence: "High"   },
  { id: "n-eps-q2",name: "EPS",                value: 1.09,   unit: "$",  quarter: "Q2", year: 2025, clientId: "nvidia", source: "10-Q", confidence: "High"   },
  { id: "n-oi-q2", name: "Operating Income",   value: 33100,  unit: "$M", quarter: "Q2", year: 2025, clientId: "nvidia", source: "10-Q", confidence: "High"   },
  { id: "n-cc-q2", name: "Customer Count",     value: 4500,   unit: "#",  quarter: "Q2", year: 2025, clientId: "nvidia", source: "10-Q", confidence: "Medium" },

  { id: "n-r-q3",  name: "Revenue",            value: 53200,  unit: "$M", quarter: "Q3", year: 2025, clientId: "nvidia", source: "10-Q", confidence: "High"   },
  { id: "n-gm-q3", name: "Gross Margin",       value: 76.9,   unit: "%",  quarter: "Q3", year: 2025, clientId: "nvidia", source: "10-Q", confidence: "High"   },
  { id: "n-nm-q3", name: "Net Margin",         value: 55.4,   unit: "%",  quarter: "Q3", year: 2025, clientId: "nvidia", source: "10-Q", confidence: "Medium" },
  { id: "n-eps-q3",name: "EPS",                value: 1.17,   unit: "$",  quarter: "Q3", year: 2025, clientId: "nvidia", source: "10-Q", confidence: "Medium" },
  { id: "n-oi-q3", name: "Operating Income",   value: 35700,  unit: "$M", quarter: "Q3", year: 2025, clientId: "nvidia", source: "10-Q", confidence: "High"   },
  { id: "n-cc-q3", name: "Customer Count",     value: 4800,   unit: "#",  quarter: "Q3", year: 2025, clientId: "nvidia", source: "10-Q", confidence: "Medium" },

  { id: "n-r-q4",  name: "Revenue",            value: 57500,  unit: "$M", quarter: "Q4", year: 2025, clientId: "nvidia", source: "10-K", confidence: "High"   },
  { id: "n-gm-q4", name: "Gross Margin",       value: 76.2,   unit: "%",  quarter: "Q4", year: 2025, clientId: "nvidia", source: "10-K", confidence: "High"   },
  { id: "n-nm-q4", name: "Net Margin",         value: 54.9,   unit: "%",  quarter: "Q4", year: 2025, clientId: "nvidia", source: "10-K", confidence: "High"   },
  { id: "n-eps-q4",name: "EPS",                value: 1.25,   unit: "$",  quarter: "Q4", year: 2025, clientId: "nvidia", source: "10-K", confidence: "High"   },
  { id: "n-oi-q4", name: "Operating Income",   value: 37900,  unit: "$M", quarter: "Q4", year: 2025, clientId: "nvidia", source: "10-K", confidence: "High"   },
  { id: "n-cc-q4", name: "Customer Count",     value: 5100,   unit: "#",  quarter: "Q4", year: 2025, clientId: "nvidia", source: "10-K", confidence: "High"   },
];
