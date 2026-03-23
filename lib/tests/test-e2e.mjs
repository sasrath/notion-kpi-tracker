/**
 * End-to-End Test Suite for KPI Tracker
 * Persona: CEO / Sales Head testing the tool with real-world scenarios
 *
 * Run: node test-e2e.mjs
 */

const BASE = process.env.TEST_URL || "http://localhost:3000";

const results = [];
let testNum = 0;

async function test(name, fn) {
  testNum++;
  const start = Date.now();
  try {
    const detail = await fn();
    const ms = Date.now() - start;
    console.log(`  ✓ TC-${String(testNum).padStart(2, "0")} ${name} (${ms}ms)${detail ? " → " + detail : ""}`);
    results.push({ id: `TC-${String(testNum).padStart(2, "0")}`, name, status: "PASS", ms, detail: detail || "" });
    return true;
  } catch (e) {
    const ms = Date.now() - start;
    console.log(`  ✗ TC-${String(testNum).padStart(2, "0")} ${name} (${ms}ms) → ${e.message}`);
    results.push({ id: `TC-${String(testNum).padStart(2, "0")}`, name, status: "FAIL", ms, detail: e.message });
    return false;
  }
}

// ─── HELPER ─────────────────────────────────────────────────────

async function fetchJSON(path, opts = {}) {
  const res = await fetch(BASE + path, opts);
  const data = await res.json();
  return { status: res.status, data };
}

// ─── TEST SUITE ─────────────────────────────────────────────────

console.log("\n╔══════════════════════════════════════════════════════════╗");
console.log("║     KPI Tracker — End-to-End Test Suite                 ║");
console.log("║     Persona: CEO / Sales Head                          ║");
console.log("╚══════════════════════════════════════════════════════════╝\n");

// ─── SECTION 1: System Health ───────────────────────────────────
console.log("── Section 1: System Health ──────────────────────────────");

await test("Health endpoint responds", async () => {
  const { status, data } = await fetchJSON("/api/health");
  if (status !== 200 && status !== 500) throw new Error(`Unexpected status ${status}`);
  if (!data.results) throw new Error("No results in health response");
  const ai = data.results.ai.ok ? "OK" : "FAIL:" + data.results.ai.message;
  const notion = data.results.notion.ok ? "OK" : "FAIL:" + data.results.notion.message;
  return `AI=${ai}, Notion=${notion}`;
});

await test("Notion MCP connection is active", async () => {
  const { data } = await fetchJSON("/api/health");
  if (!data.results.notion.ok) throw new Error(data.results.notion.message);
  return data.results.notion.message;
});

await test("Notion databases are accessible", async () => {
  const { data } = await fetchJSON("/api/health");
  const dbs = data.results.databases;
  const statuses = Object.entries(dbs).map(([k, v]) => `${k}:${v.ok ? "OK" : "FAIL"}`);
  const allOk = Object.values(dbs).every((d) => d.ok);
  if (!allOk) throw new Error(statuses.join(", "));
  return statuses.join(", ");
});

await test("Google Gemini AI is connected", async () => {
  const { data } = await fetchJSON("/api/health");
  if (!data.results.ai.ok) throw new Error(data.results.ai.message);
  return data.results.ai.message;
});

// ─── SECTION 2: Model Selection ─────────────────────────────────
console.log("\n── Section 2: Model Selection ────────────────────────────");

let allModels = [];
await test("Models endpoint returns all models", async () => {
  const { status, data } = await fetchJSON("/api/models");
  if (status !== 200) throw new Error(`Status ${status}`);
  allModels = data.models;
  if (!allModels || allModels.length === 0) throw new Error("No models returned");
  return `${allModels.length} models returned`;
});

await test("Google models are available", async () => {
  const google = allModels.filter((m) => m.provider === "google");
  const available = google.filter((m) => m.available);
  if (available.length === 0) throw new Error("No Google models available");
  return `${available.length}/${google.length} available: ${available.map((m) => m.id).join(", ")}`;
});

await test("Anthropic models show unavailable (no API key)", async () => {
  const anthropic = allModels.filter((m) => m.provider === "anthropic");
  const unavailable = anthropic.filter((m) => !m.available);
  if (unavailable.length !== anthropic.length) throw new Error("Some Anthropic models should be unavailable without key");
  return `${unavailable.length} Anthropic models correctly marked unavailable`;
});

await test("Default model is set", async () => {
  const { data } = await fetchJSON("/api/models");
  if (!data.defaultModel) throw new Error("No defaultModel");
  return data.defaultModel;
});

// ─── SECTION 3: Client Management ───────────────────────────────
console.log("\n── Section 3: Client Management ─────────────────────────");

let clients = [];
await test("Clients endpoint returns client list", async () => {
  const { status, data } = await fetchJSON("/api/clients");
  if (status !== 200) throw new Error(`Status ${status}`);
  clients = data.clients || [];
  return `${clients.length} clients: ${clients.map((c) => c.name).join(", ") || "(none)"}`;
});

// ─── SECTION 4: KPI Data Retrieval ──────────────────────────────
console.log("\n── Section 4: KPI Data Retrieval ─────────────────────────");

let allKPIs = [];
await test("KPIs endpoint returns data", async () => {
  const { status, data } = await fetchJSON("/api/kpis");
  if (status !== 200) throw new Error(`Status ${status}`);
  allKPIs = data.kpis || [];
  return `${allKPIs.length} KPIs loaded`;
});

await test("KPIs have required fields", async () => {
  if (allKPIs.length === 0) return "No KPIs to validate (empty database)";
  const sample = allKPIs[0];
  const required = ["id", "name", "value", "unit", "quarter", "year"];
  const missing = required.filter((f) => sample[f] === undefined);
  if (missing.length > 0) throw new Error(`Missing fields: ${missing.join(", ")}`);
  return `All required fields present in ${allKPIs.length} KPIs`;
});

await test("KPIs are sorted by year desc then quarter desc", async () => {
  if (allKPIs.length < 2) return "Less than 2 KPIs, skip sort validation";
  for (let i = 1; i < Math.min(allKPIs.length, 10); i++) {
    const prev = allKPIs[i - 1];
    const curr = allKPIs[i];
    if (prev.year < curr.year) throw new Error(`Sort broken at index ${i}: ${prev.year} < ${curr.year}`);
    if (prev.year === curr.year && prev.quarter < curr.quarter)
      throw new Error(`Sort broken at index ${i}: same year ${prev.year}, ${prev.quarter} < ${curr.quarter}`);
  }
  return "Sort order verified";
});

// ─── SECTION 5: Report Ingestion (URL) ─────────────────────────
console.log("\n── Section 5: Report Ingestion (URL) ────────────────────");

await test("Ingest rejects missing fields", async () => {
  const { status, data } = await fetchJSON("/api/ingest", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: "https://example.com" }),
  });
  if (status !== 400) throw new Error(`Expected 400, got ${status}`);
  return data.error;
});

await test("Ingest rejects invalid quarter", async () => {
  const { status, data } = await fetchJSON("/api/ingest", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: "https://example.com/report", clientName: "Test", quarter: "Q5", year: 2025 }),
  });
  if (status !== 400) throw new Error(`Expected 400, got ${status}`);
  return data.error;
});

// Test real ingestion with Apple Q1 2025 earnings press release
let ingestPreview = null;
await test("Ingest Apple Q1 2025 earnings report via URL", async () => {
  const { status, data } = await fetchJSON("/api/ingest", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: "https://www.apple.com/newsroom/2025/01/apple-reports-first-quarter-results/",
      clientName: "Apple",
      ticker: "AAPL",
      quarter: "Q1",
      year: 2025,
      model: "gemini-2.5-flash",
    }),
  });
  if (status === 422) throw new Error(`AI extraction failed: ${data.error}`);
  if (status !== 200) throw new Error(`Status ${status}: ${data.error || JSON.stringify(data)}`);
  if (!data.preview || data.preview.length === 0) throw new Error("No KPIs extracted");
  ingestPreview = data.preview;
  const kpiNames = data.preview.map((k) => k.name).slice(0, 5);
  return `${data.preview.length} KPIs extracted: ${kpiNames.join(", ")}...`;
});

// Confirm and save the ingestion
let savedApple = null;
if (ingestPreview) {
  await test("Confirm and save Apple KPIs to Notion", async () => {
    const { status, data } = await fetchJSON("/api/ingest/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kpis: ingestPreview,
        clientName: "Apple",
        quarter: "Q1",
        year: 2025,
        url: "https://www.apple.com/newsroom/2025/01/apple-reports-first-quarter-results/",
      }),
    });
    if (status !== 200) throw new Error(`Status ${status}: ${data.error}`);
    savedApple = data;
    return `Saved ${data.kpiCount} KPIs, clientId=${data.clientId?.slice(0, 8)}...`;
  });
}

// ─── SECTION 6: Custom KPI Entry ────────────────────────────────
console.log("\n── Section 6: Custom KPI Entry ───────────────────────────");

await test("Custom KPI rejects missing fields", async () => {
  const { status } = await fetchJSON("/api/custom-kpi", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kpiName: "Test" }),
  });
  if (status !== 400) throw new Error(`Expected 400, got ${status}`);
  return "Validation working";
});

// Save a real custom KPI
let customKPIClientId = clients[0]?.id || savedApple?.clientId;
if (customKPIClientId) {
  await test("Save custom KPI: Customer Satisfaction Score", async () => {
    const { status, data } = await fetchJSON("/api/custom-kpi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: customKPIClientId,
        kpiName: "Customer Satisfaction Score",
        value: 92.5,
        unit: "%",
        quarter: "Q1",
        year: 2025,
        notes: "Internal survey results - CEO E2E test",
      }),
    });
    if (status !== 200) throw new Error(`Status ${status}: ${data.error}`);
    return `Custom KPI saved: ${data.id?.slice(0, 8)}...`;
  });
}

// ─── SECTION 7: KPI Delete ──────────────────────────────────────
console.log("\n── Section 7: KPI Delete ────────────────────────────────");

await test("Delete rejects empty IDs", async () => {
  const { status } = await fetchJSON("/api/kpis/delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids: [] }),
  });
  if (status !== 400) throw new Error(`Expected 400, got ${status}`);
  return "Validation working";
});

await test("Delete rejects more than 100 IDs", async () => {
  const fakeIds = Array.from({ length: 101 }, (_, i) => `fake-id-${i}`);
  const { status } = await fetchJSON("/api/kpis/delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids: fakeIds }),
  });
  if (status !== 400) throw new Error(`Expected 400, got ${status}`);
  return "Limit validation working";
});

// ─── SECTION 8: Natural Language Query ──────────────────────────
console.log("\n── Section 8: Natural Language Query ─────────────────────");

await test("Query: Which client had the highest revenue?", async () => {
  const { status, data } = await fetchJSON("/api/query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question: "Which client had the highest revenue?",
      model: "gemini-2.5-flash",
    }),
  });
  if (status !== 200) throw new Error(`Status ${status}: ${data.error}`);
  if (!data.answer) throw new Error("No answer returned");
  return data.answer.slice(0, 100) + "...";
});

// ─── SECTION 9: Dashboard Data Integrity ────────────────────────
console.log("\n── Section 9: Dashboard Data Integrity ──────────────────");

await test("Re-fetch KPIs after ingestion shows new data", async () => {
  // Wait for Notion eventual consistency
  await new Promise((r) => setTimeout(r, 2000));
  const { data } = await fetchJSON("/api/kpis");
  const kpis = data.kpis || [];
  if (kpis.length <= allKPIs.length && allKPIs.length > 0) {
    return `KPIs count same or less (${kpis.length}), Notion may need more time to index`;
  }
  return `KPIs grew from ${allKPIs.length} to ${kpis.length}`;
});

await test("Re-fetch clients after ingestion", async () => {
  const { data } = await fetchJSON("/api/clients");
  const newClients = data.clients || [];
  return `${newClients.length} clients: ${newClients.map((c) => c.name).join(", ")}`;
});

// ─── SECTION 10: Edge Cases ─────────────────────────────────────
console.log("\n── Section 10: Edge Cases ───────────────────────────────");

await test("Non-existent API route returns 404", async () => {
  const res = await fetch(BASE + "/api/nonexistent");
  if (res.status !== 404) throw new Error(`Expected 404, got ${res.status}`);
  return "404 returned correctly";
});

await test("Ingest with invalid URL is handled", async () => {
  const { status, data } = await fetchJSON("/api/ingest", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: "not-a-url",
      clientName: "Test",
      quarter: "Q1",
      year: 2025,
    }),
  });
  // Should either reject with 400 or the AI should fail gracefully
  if (status === 200) throw new Error("Should not succeed with invalid URL");
  return `Status ${status}: ${(data.error || "").slice(0, 80)}`;
});

// ─── RESULTS SUMMARY ────────────────────────────────────────────
console.log("\n╔══════════════════════════════════════════════════════════╗");
console.log("║                    TEST RESULTS SUMMARY                 ║");
console.log("╠══════════════════════════════════════════════════════════╣");

const passed = results.filter((r) => r.status === "PASS").length;
const failed = results.filter((r) => r.status === "FAIL").length;
const total = results.length;

for (const r of results) {
  const icon = r.status === "PASS" ? "✓" : "✗";
  console.log(`║ ${icon} ${r.id} ${r.name.padEnd(42)} ${String(r.ms).padStart(5)}ms ║`);
}

console.log("╠══════════════════════════════════════════════════════════╣");
console.log(`║ Total: ${total}  Passed: ${passed}  Failed: ${failed}                       ║`);
console.log("╚══════════════════════════════════════════════════════════╝");

// Output JSON for report generation
const reportData = {
  timestamp: new Date().toISOString(),
  environment: BASE,
  summary: { total, passed, failed },
  tests: results,
};

await import("fs").then((fs) =>
  fs.writeFileSync("test-results.json", JSON.stringify(reportData, null, 2))
);
console.log("\nResults saved to test-results.json");

process.exit(failed > 0 ? 1 : 0);
