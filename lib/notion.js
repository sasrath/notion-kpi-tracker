/**
 * Notion data layer — hybrid MCP + direct SDK
 *
 * Locally: All operations go through MCP tool calls (notion-mcp.js)
 * On Vercel: Falls back to direct @notionhq/client SDK (subprocess not supported)
 *
 * The USE_NOTION_SDK flag auto-detects Vercel or can be forced via env var.
 */

import { callNotionTool } from "./notion-mcp.js";
import { Client as NotionClient } from "@notionhq/client";

const USE_NOTION_SDK = !!process.env.VERCEL || process.env.NOTION_MODE === "sdk";

let _notionSDK = null;
function getNotionSDK() {
  if (!_notionSDK) {
    const key = process.env.NOTION_API_KEY;
    if (!key) throw new Error("NOTION_API_KEY is not set");
    _notionSDK = new NotionClient({ auth: key });
  }
  return _notionSDK;
}

/**
 * Unified Notion call — routes to MCP or direct SDK based on environment.
 */
async function notionCall(toolName, args) {
  if (!USE_NOTION_SDK) {
    return callNotionTool(toolName, args);
  }

  const notion = getNotionSDK();

  switch (toolName) {
    case "API-post-search":
      return notion.search(args);

    case "API-post-page":
      return notion.pages.create(args);

    case "API-patch-page": {
      const { page_id, ...rest } = args;
      return notion.pages.update({ page_id, ...rest });
    }

    default:
      throw new Error(`Unsupported Notion tool in SDK mode: ${toolName}`);
  }
}

const DB = {
  clients: process.env.NOTION_CLIENTS_DB_ID,
  reports: process.env.NOTION_REPORTS_DB_ID,
  kpis:    process.env.NOTION_KPIS_DB_ID,
};

// ─── HELPERS ────────────────────────────────────────────────────

/** Paginate through API-post-search and return all pages from a specific database. */
async function searchPagesInDB(databaseId, query = "") {
  const pages = [];
  let startCursor = undefined;
  let totalScanned = 0;

  do {
    const args = {
      filter: { property: "object", value: "page" },
      page_size: 100,
    };
    if (query) args.query = query;
    if (startCursor) args.start_cursor = startCursor;

    const res = await notionCall("API-post-search", args);
    totalScanned += (res.results?.length ?? 0);

    for (const page of res.results ?? []) {
      if (page.parent?.database_id === databaseId) {
        pages.push(page);
      }
    }

    startCursor = res.has_more ? res.next_cursor : undefined;
  } while (startCursor);

  console.log(`[search] DB ${databaseId.slice(0,8)}… → ${pages.length} pages (scanned ${totalScanned})`);
  return pages;
}

/** Parse a Notion page property value. */
function prop(page, name, type) {
  const p = page.properties?.[name];
  if (!p) return null;
  switch (type) {
    case "title":     return p.title?.[0]?.plain_text ?? null;
    case "number":    return p.number ?? null;
    case "select":    return p.select?.name ?? null;
    case "url":       return p.url ?? null;
    case "relation":  return p.relation?.[0]?.id ?? null;
    case "rich_text": return p.rich_text?.[0]?.plain_text ?? null;
    default:          return null;
  }
}

// ─── CLIENTS ────────────────────────────────────────────────────

export async function getClients() {
  const pages = await searchPagesInDB(DB.clients);

  return pages
    .map((p) => ({
      id: p.id,
      name:     prop(p, "Name", "title") ?? "Unnamed",
      industry: prop(p, "Industry", "select"),
      website:  prop(p, "Website", "url"),
      status:   prop(p, "Status", "select") ?? "Active",
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function findOrCreateClient(name, industry = null, website = null) {
  // Search by client name
  const pages = await searchPagesInDB(DB.clients, name);
  const match = pages.find(
    (p) => (prop(p, "Name", "title") ?? "").toLowerCase() === name.toLowerCase()
  );

  if (match) return match.id;

  // Create new client
  const page = await notionCall("API-post-page", {
    parent: { database_id: DB.clients },
    properties: {
      Name:     { title: [{ text: { content: name } }] },
      Status:   { select: { name: "Active" } },
      ...(industry && { Industry: { select: { name: industry } } }),
      ...(website  && { Website:  { url: website } }),
    },
  });

  return page.id;
}

// ─── REPORTS ────────────────────────────────────────────────────

export async function createReport({ clientId, quarter, year, reportUrl, rawSummary }) {
  const page = await notionCall("API-post-page", {
    parent: { database_id: DB.reports },
    properties: {
      Title: {
        title: [{ text: { content: `${quarter} ${year} Report` } }],
      },
      Client:     { relation: [{ id: clientId }] },
      Quarter:    { select: { name: quarter } },
      Year:       { number: year },
      ReportURL:  { url: reportUrl },
      IngestedAt: { date: { start: new Date().toISOString() } },
      ...(rawSummary && {
        RawSummary: { rich_text: [{ text: { content: rawSummary.slice(0, 2000) } }] },
      }),
    },
  });
  return page.id;
}

// ─── KPIs ────────────────────────────────────────────────────────

export async function saveKPIs({ reportId, clientId, kpis, quarter, year }) {
  const results = [];
  const errors = [];

  for (const kpi of kpis) {
    if (kpi.value === null || kpi.value === undefined) continue;

    try {
      const page = await notionCall("API-post-page", {
        parent: { database_id: DB.kpis },
        properties: {
          Name:       { title: [{ text: { content: kpi.name } }] },
          Report:     { relation: [{ id: reportId }] },
          Client:     { relation: [{ id: clientId }] },
          Value:      { number: kpi.value },
          Unit:       { select: { name: kpi.unit ?? "other" } },
          Quarter:    { select: { name: quarter } },
          Year:       { number: year },
          Source:     { select: { name: kpi.source_type ?? "AI Parsed" } },
          Confidence: { select: { name: kpi.confidence ?? "Medium" } },
          ...(kpi.notes && {
            Notes: { rich_text: [{ text: { content: kpi.notes } }] },
          }),
        },
      });
      console.log(`[saveKPIs] ✓ "${kpi.name}" → ${page.id}`);
      results.push(page.id);
    } catch (err) {
      console.error(`[saveKPIs] ✗ "${kpi.name}": ${err.message}`);
      errors.push({ name: kpi.name, error: err.message });
    }
  }

  if (errors.length > 0 && results.length === 0) {
    throw new Error(`All KPI saves failed. First error: ${errors[0].error}`);
  }
  if (errors.length > 0) {
    console.warn(`[saveKPIs] Partial: ${results.length} saved, ${errors.length} failed`);
  }

  return results;
}

export async function saveCustomKPI({ clientId, kpiName, value, unit, quarter, year, notes }) {
  let resolvedClientId = clientId;
  if (typeof clientId === "string" && !clientId.includes("-")) {
    resolvedClientId = await findOrCreateClient(clientId);
  }

  const page = await notionCall("API-post-page", {
    parent: { database_id: DB.kpis },
    properties: {
      Name:       { title: [{ text: { content: kpiName } }] },
      Client:     { relation: [{ id: resolvedClientId }] },
      Value:      { number: value },
      Unit:       { select: { name: unit } },
      Quarter:    { select: { name: quarter } },
      Year:       { number: year },
      Source:     { select: { name: "Custom" } },
      Confidence: { select: { name: "High" } },
      ...(notes && {
        Notes: { rich_text: [{ text: { content: notes } }] },
      }),
    },
  });

  return page.id;
}

export async function getKPIs({ clientId, quarter, year } = {}) {
  let pages = await searchPagesInDB(DB.kpis);

  // Client-side filtering (MCP search doesn't support property filters)
  if (clientId) {
    pages = pages.filter((p) => prop(p, "Client", "relation") === clientId);
  }
  if (quarter) {
    pages = pages.filter((p) => prop(p, "Quarter", "select") === quarter);
  }
  if (year) {
    pages = pages.filter((p) => prop(p, "Year", "number") === year);
  }

  return pages
    .map((p) => ({
      id: p.id,
      name:       prop(p, "Name", "title") ?? "",
      clientId:   prop(p, "Client", "relation"),
      value:      prop(p, "Value", "number"),
      unit:       prop(p, "Unit", "select") ?? "other",
      quarter:    prop(p, "Quarter", "select") ?? "",
      year:       prop(p, "Year", "number"),
      source:     prop(p, "Source", "select") ?? "AI Parsed",
      confidence: prop(p, "Confidence", "select") ?? "Medium",
      notes:      prop(p, "Notes", "rich_text"),
    }))
    .sort((a, b) => (b.year ?? 0) - (a.year ?? 0) || b.quarter.localeCompare(a.quarter));
}

export async function deleteKPI(pageId) {
  // Archive the page (Notion's "delete" = move to trash)
  await notionCall("API-patch-page", {
    page_id: pageId,
    archived: true,
  });
  console.log(`[deleteKPI] ✓ Archived ${pageId}`);
}

export async function deleteKPIs(pageIds) {
  const results = [];
  const errors = [];
  for (const id of pageIds) {
    try {
      await deleteKPI(id);
      results.push(id);
    } catch (err) {
      console.error(`[deleteKPIs] ✗ ${id}: ${err.message}`);
      errors.push({ id, error: err.message });
    }
  }
  return { deleted: results.length, errors: errors.length };
}
