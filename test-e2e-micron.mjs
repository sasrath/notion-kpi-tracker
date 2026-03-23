/**
 * E2E Test: Micron report ingestion using Gemini 2.5 Flash Lite
 * Tests: models → clients → ingest → confirm → KPIs → query → forecast
 */

const BASE = "http://localhost:3000";
const MODEL = "gemini-2.5-flash-lite";
const MICRON_URL = "https://investors.micron.com/news-releases/news-release-details/micron-technology-inc-reports-results-second-quarter-fiscal-2025";

let passed = 0;
let failed = 0;

function assert(label, condition) {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.log(`  ❌ ${label}`);
    failed++;
  }
}

async function run() {
  console.log("=== E2E TEST: Micron + Gemini 2.5 Flash Lite ===\n");

  // 1. Models
  console.log("--- 1. GET /api/models ---");
  const modelsRes = await fetch(`${BASE}/api/models`);
  const modelsData = await modelsRes.json();
  const models = modelsData.models;
  assert("Models endpoint returns 200", modelsRes.status === 200);
  assert("Flash Lite is in model list", models.some(m => m.id === "gemini-2.5-flash-lite"));
  assert("Flash Lite is available (has API key)", models.find(m => m.id === "gemini-2.5-flash-lite")?.available === true);
  console.log(`  Total models: ${models.length}\n`);

  // 2. Clients
  console.log("--- 2. GET /api/clients ---");
  const clientsRes = await fetch(`${BASE}/api/clients`);
  const clientsData = await clientsRes.json();
  const clients = clientsData.clients || [];
  assert("Clients endpoint returns 200", clientsRes.status === 200);
  assert("Clients is an array", Array.isArray(clients));
  console.log(`  Clients: ${clients.map(c => c.name).join(", ") || "(none)"}\n`);

  // 3. Ingest Micron Q2 2025
  console.log("--- 3. POST /api/ingest (Micron Q2 FY2025 via Flash Lite) ---");
  const ingestRes = await fetch(`${BASE}/api/ingest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: MICRON_URL,
      clientName: "Micron",
      quarter: "Q2",
      year: 2025,
      model: MODEL,
    }),
  });
  const ingestData = await ingestRes.json();
  assert("Ingest returns 200", ingestRes.status === 200);
  assert("Has client name", !!ingestData.clientName);
  assert("KPIs extracted > 0", (ingestData.preview?.length ?? 0) > 0);

  if (ingestData.preview?.length > 0) {
    console.log(`  Client: ${ingestData.clientName}`);
    console.log(`  KPIs extracted: ${ingestData.preview.length}`);
    ingestData.preview.forEach(k =>
      console.log(`    - ${k.name} = ${k.value} ${k.unit} (${k.confidence})`)
    );

    const hasRevenue = ingestData.preview.some(k => /revenue/i.test(k.name));
    assert("Revenue KPI found", hasRevenue);
  } else {
    console.log(`  ERROR: ${ingestData.error || "No KPIs extracted"}`);
  }
  console.log();

  // 4. Confirm & Save
  if (ingestData.preview?.length > 0) {
    console.log("--- 4. POST /api/ingest/confirm (Save to Notion) ---");
    const confirmRes = await fetch(`${BASE}/api/ingest/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientName: ingestData.clientName || "Micron",
        quarter: "Q2",
        year: 2025,
        url: MICRON_URL,
        kpis: ingestData.preview,
      }),
    });
    const confirmData = await confirmRes.json();
    assert("Confirm returns 200", confirmRes.status === 200);
    assert("Report ID returned", !!confirmData.reportId);
    assert("KPIs saved > 0", (confirmData.kpiCount ?? 0) > 0);
    console.log(`  Report ID: ${confirmData.reportId}`);
    console.log(`  KPIs saved: ${confirmData.kpiCount ?? 0}\n`);
  }

  // 5. Get KPIs
  console.log("--- 5. GET /api/kpis ---");
  const kpisRes = await fetch(`${BASE}/api/kpis`);
  const kpisData = await kpisRes.json();
  const kpis = kpisData.kpis || [];
  assert("KPIs endpoint returns 200", kpisRes.status === 200);
  assert("KPIs is an array", Array.isArray(kpis));
  assert("KPIs count > 0", kpis.length > 0);

  const micronKPIs = kpis.filter(k => k.quarter === "Q2" && k.year === 2025);
  console.log(`  Total KPIs: ${kpis.length}`);
  console.log(`  Micron Q2 2025 KPIs: ${micronKPIs.length}`);
  micronKPIs.slice(0, 5).forEach(k =>
    console.log(`    - ${k.name} = ${k.value} ${k.unit}`)
  );
  console.log();

  // 6. NL Query
  console.log("--- 6. POST /api/query (NL Query via Flash Lite) ---");
  const queryRes = await fetch(`${BASE}/api/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question: "What was Micron revenue in Q2 2025?",
      model: MODEL,
    }),
  });
  const queryData = await queryRes.json();
  assert("Query returns 200", queryRes.status === 200);
  assert("Answer is non-empty", !!queryData.answer && queryData.answer.length > 10);
  console.log(`  Answer: ${queryData.answer?.slice(0, 300)}\n`);

  // 7. Forecast
  console.log("--- 7. POST /api/forecast (via Flash Lite) ---");
  const forecastRes = await fetch(`${BASE}/api/forecast`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL }),
  });
  const forecastData = await forecastRes.json();
  assert("Forecast returns 200", forecastRes.status === 200);
  assert("Has forecasts array", Array.isArray(forecastData.forecasts));

  if (forecastData.forecasts?.length > 0) {
    assert("At least one forecast", forecastData.forecasts.length > 0);
    forecastData.forecasts.forEach(f =>
      console.log(`    - ${f.client}: ${f.forecastValue} ${f.unit} (${f.nextQuarter} ${f.nextYear})`)
    );
  } else {
    console.log(`  Note: ${forecastData.error || "No forecasts (may need more data points)"}`);
  }
  console.log();

  // Summary
  console.log("=".repeat(50));
  console.log(`RESULTS: ${passed} passed, ${failed} failed out of ${passed + failed}`);
  console.log("=".repeat(50));

  process.exit(failed > 0 ? 1 : 0);
}

run().catch(e => {
  console.error("Test crashed:", e.message);
  process.exit(1);
});
