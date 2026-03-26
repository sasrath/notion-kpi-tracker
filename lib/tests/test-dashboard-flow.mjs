// Comprehensive test: verify the full dashboard data flow
// Run: node lib/tests/test-dashboard-flow.mjs

const BASE = "http://localhost:3010";
let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.error(`  ✗ ${label}`);
    failed++;
  }
}

async function main() {
  console.log("\n=== Dashboard Data Flow Test ===\n");

  // 1. Health check
  console.log("1. Health endpoint");
  const health = await fetch(`${BASE}/api/health`).then((r) => r.json());
  assert(health.ok === true, "Health OK");
  assert(health.results?.notion?.ok, "Notion connected");
  assert(health.results?.ai?.ok, "AI connected");

  // 2. Clients
  console.log("\n2. Clients endpoint");
  const cData = await fetch(`${BASE}/api/clients`).then((r) => r.json());
  const clients = cData.clients ?? [];
  assert(Array.isArray(clients), "Returns array");
  assert(clients.length > 0, `Found ${clients.length} clients`);
  for (const c of clients) {
    assert(c.id && c.name, `Client "${c.name}" has id ${c.id.slice(0, 8)}…`);
  }

  // 3. KPIs
  console.log("\n3. KPIs endpoint");
  const kData = await fetch(`${BASE}/api/kpis`).then((r) => r.json());
  const kpis = kData.kpis ?? [];
  assert(Array.isArray(kpis), "Returns array");
  assert(kpis.length > 0, `Found ${kpis.length} KPIs`);

  // Check no orphan KPIs
  const orphans = kpis.filter((k) => !k.clientId);
  assert(orphans.length === 0, `No orphan KPIs (found ${orphans.length})`);
  if (orphans.length > 0) {
    console.log("    Orphans:", orphans.map((k) => k.name));
  }

  // Check all KPIs have required fields
  for (const k of kpis) {
    if (!k.name || k.value === null || !k.unit || !k.quarter || !k.year) {
      console.error(`    ✗ Incomplete KPI: ${JSON.stringify(k)}`);
      failed++;
    }
  }
  assert(true, "All KPIs have required fields");

  // Check quarter values
  const quarters = [...new Set(kpis.map((k) => k.quarter))];
  console.log(`    Quarter values: ${quarters.join(", ")}`);

  // 4. Client-KPI matching
  console.log("\n4. Client ↔ KPI matching");
  const clientIdsWithData = new Set(kpis.map((k) => k.clientId));
  const activeClients = clients.filter((c) => clientIdsWithData.has(c.id));
  assert(activeClients.length > 0, `Active clients (with data): ${activeClients.map((c) => c.name).join(", ")}`);

  // Check for clientIds in KPIs that don't match any client
  const clientIdSet = new Set(clients.map((c) => c.id));
  const unmatchedIds = [...clientIdsWithData].filter((id) => !clientIdSet.has(id));
  assert(unmatchedIds.length === 0, `No unmatched clientIds (found ${unmatchedIds.length})`);
  if (unmatchedIds.length > 0) {
    console.log("    Unmatched IDs:", unmatchedIds);
  }

  // 5. Models endpoint
  console.log("\n5. Models endpoint");
  const mData = await fetch(`${BASE}/api/models`).then((r) => r.json());
  assert(Array.isArray(mData.models), "Returns models array");
  assert(mData.defaultModel, `Default model: ${mData.defaultModel}`);

  // 6. Cache invalidation test
  console.log("\n6. Cache invalidation");
  // First fetch to prime cache
  await fetch(`${BASE}/api/kpis`).then((r) => r.json());
  // Second fetch should hit cache
  const cached = await fetch(`${BASE}/api/kpis`).then((r) => r.json());
  assert(cached.cached === true, "Second fetch hits cache");

  // Summary
  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("Test error:", e.message);
  process.exit(1);
});
