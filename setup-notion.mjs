/**
 * setup-notion.mjs
 * Run this ONCE to create all 3 Notion databases automatically.
 *
 * Usage:
 *   node setup-notion.mjs
 *
 * Prerequisites:
 *   - NOTION_API_KEY set in .env.local
 *   - A parent Notion page ID where databases will be created
 *     (set NOTION_PARENT_PAGE_ID in .env.local)
 */

import { Client } from "@notionhq/client";
import { readFileSync } from "fs";

// Load .env.local manually (no dotenv needed in Node 20+)
function loadEnv() {
  try {
    const env = readFileSync(".env.local", "utf-8");
    for (const line of env.split("\n")) {
      const [key, ...rest] = line.split("=");
      if (key && rest.length) process.env[key.trim()] = rest.join("=").trim();
    }
  } catch {
    console.error("❌  Could not read .env.local — make sure it exists.");
    process.exit(1);
  }
}

loadEnv();

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const PARENT_PAGE_ID = process.env.NOTION_PARENT_PAGE_ID;

if (!process.env.NOTION_API_KEY) {
  console.error("❌  NOTION_API_KEY is missing from .env.local");
  process.exit(1);
}
if (!PARENT_PAGE_ID) {
  console.error("❌  NOTION_PARENT_PAGE_ID is missing from .env.local");
  console.error("   Create a blank page in Notion, copy its ID from the URL, and add it.");
  process.exit(1);
}

// ─── DATABASE SCHEMAS ─────────────────────────────────────────────

const CLIENTS_SCHEMA = {
  Name:     { title: {} },
  Industry: { select: { options: [
    { name: "Technology", color: "blue" },
    { name: "Finance",    color: "green" },
    { name: "Healthcare", color: "red" },
    { name: "Retail",     color: "yellow" },
    { name: "Other",      color: "gray" },
  ]}},
  Website:  { url: {} },
  Status:   { select: { options: [
    { name: "Active",   color: "green" },
    { name: "Inactive", color: "red" },
    { name: "Prospect", color: "yellow" },
  ]}},
};

const REPORTS_SCHEMA = {
  Title:      { title: {} },
  Quarter:    { select: { options: [
    { name: "Q1", color: "blue" },
    { name: "Q2", color: "green" },
    { name: "Q3", color: "yellow" },
    { name: "Q4", color: "orange" },
  ]}},
  Year:       { number: { format: "number" } },
  ReportURL:  { url: {} },
  IngestedAt: { date: {} },
  RawSummary: { rich_text: {} },
  Client:     { relation: { database_id: "PLACEHOLDER_CLIENTS" } }, // filled in after clients DB created
};

const KPIS_SCHEMA = {
  Name:       { title: {} },
  Value:      { number: { format: "number" } },
  Unit:       { select: { options: [
    { name: "$M",    color: "green" },
    { name: "%",     color: "blue" },
    { name: "$",     color: "yellow" },
    { name: "x",     color: "purple" },
    { name: "days",  color: "orange" },
    { name: "count", color: "pink" },
    { name: "other", color: "gray" },
  ]}},
  Quarter:    { select: { options: [
    { name: "Q1", color: "blue" },
    { name: "Q2", color: "green" },
    { name: "Q3", color: "yellow" },
    { name: "Q4", color: "orange" },
  ]}},
  Year:       { number: { format: "number" } },
  Source:     { select: { options: [
    { name: "AI Parsed", color: "blue" },
    { name: "Custom",    color: "purple" },
  ]}},
  Confidence: { select: { options: [
    { name: "High",   color: "green" },
    { name: "Medium", color: "yellow" },
    { name: "Low",    color: "red" },
  ]}},
  Notes:      { rich_text: {} },
  Client:     { relation: { database_id: "PLACEHOLDER_CLIENTS" } },
  Report:     { relation: { database_id: "PLACEHOLDER_REPORTS" } },
};

// ─── CREATE DATABASES ─────────────────────────────────────────────

async function createDatabase(title, properties, emoji) {
  const db = await notion.databases.create({
    parent: { type: "page_id", page_id: PARENT_PAGE_ID },
    title: [{ type: "text", text: { content: title } }],
    icon: { type: "emoji", emoji },
    properties,
  });
  return db.id;
}

async function updateRelation(databaseId, propertyName, targetDatabaseId) {
  await notion.databases.update({
    database_id: databaseId,
    properties: {
      [propertyName]: {
        relation: { database_id: targetDatabaseId, type: "single_property", single_property: {} },
      },
    },
  });
}

// ─── MAIN ─────────────────────────────────────────────────────────

async function main() {
  console.log("\n🚀  Setting up Notion databases for KPI Tracker...\n");

  // 1. Create Clients DB (no relations needed)
  console.log("📋  Creating Clients database...");
  const clientsId = await createDatabase("Clients", CLIENTS_SCHEMA, "🏢");
  console.log(`   ✅  Clients DB created: ${clientsId}`);

  // 2. Create Reports DB with Client relation
  console.log("📄  Creating Quarterly Reports database...");
  const reportsSchema = {
    ...REPORTS_SCHEMA,
    Client: { relation: { database_id: clientsId, type: "single_property", single_property: {} } },
  };
  const reportsId = await createDatabase("Quarterly Reports", reportsSchema, "📑");
  console.log(`   ✅  Reports DB created: ${reportsId}`);

  // 3. Create KPIs DB with Client + Report relations
  console.log("📊  Creating KPIs database...");
  const kpisSchema = {
    ...KPIS_SCHEMA,
    Client: { relation: { database_id: clientsId, type: "single_property", single_property: {} } },
    Report: { relation: { database_id: reportsId, type: "single_property", single_property: {} } },
  };
  const kpisId = await createDatabase("KPIs", kpisSchema, "📈");
  console.log(`   ✅  KPIs DB created: ${kpisId}`);

  // ─── PRINT RESULTS ───────────────────────────────────────────────
  console.log("\n" + "─".repeat(60));
  console.log("✅  All databases created successfully!\n");
  console.log("Add these to your .env.local:\n");
  console.log(`NOTION_CLIENTS_DB_ID=${clientsId}`);
  console.log(`NOTION_REPORTS_DB_ID=${reportsId}`);
  console.log(`NOTION_KPIS_DB_ID=${kpisId}`);
  console.log("\n" + "─".repeat(60));
  console.log("\n📌  Next steps:");
  console.log("   1. Copy the 3 database IDs above into your .env.local");
  console.log("   2. Run: npm run dev");
  console.log("   3. Open: http://localhost:3000\n");
}

main().catch((err) => {
  console.error("\n❌  Setup failed:", err.message);
  if (err.code === "unauthorized") {
    console.error("   → Your NOTION_API_KEY is invalid or expired.");
  }
  if (err.code === "object_not_found") {
    console.error("   → NOTION_PARENT_PAGE_ID not found.");
    console.error("     Make sure the integration has access to that page.");
  }
  process.exit(1);
});
