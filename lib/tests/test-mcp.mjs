import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { readFileSync } from "fs";

// Load env
const env = readFileSync(".env.local", "utf-8");
for (const line of env.split("\n")) {
  const [key, ...rest] = line.split("=");
  if (key && rest.length && !key.startsWith("#")) process.env[key.trim()] = rest.join("=").trim();
}

const transport = new StdioClientTransport({
  command: "node",
  args: ["node_modules/@notionhq/notion-mcp-server/bin/cli.mjs"],
  env: {
    ...process.env,
    OPENAPI_MCP_HEADERS: JSON.stringify({
      Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
      "Notion-Version": "2022-06-28",
    }),
  },
});

const client = new Client({ name: "test", version: "1.0.0" });
await client.connect(transport);

const tools = await client.listTools();
const needed = ["API-post-search", "API-post-page", "API-retrieve-a-database", "API-query-data-source", "API-get-self"];
for (const t of tools.tools) {
  if (needed.includes(t.name)) {
    console.log(`=== ${t.name} ===`);
    console.log(JSON.stringify(t.inputSchema, null, 2));
    console.log("");
  }
}

// Test: query the KPIs database
console.log("=== TEST: Retrieve DB ===");
const dbResult = await client.callTool({
  name: "API-retrieve-a-database",
  arguments: {
    database_id: process.env.NOTION_KPIS_DB_ID,
  },
});
const dbParsed = JSON.parse(dbResult.content[0].text);
console.log("DB title:", dbParsed.title?.[0]?.plain_text ?? dbParsed.status);
console.log("DB properties:", dbParsed.properties ? Object.keys(dbParsed.properties) : "none");

// Test: query with explicit Notion-Version
console.log("=== TEST: Query (no version arg) ===");
const result3 = await client.callTool({
  name: "API-query-data-source",
  arguments: {
    data_source_id: process.env.NOTION_KPIS_DB_ID,
    page_size: 2,
  },
});
console.log("Result v3:", result3.content[0].text.slice(0, 300));

// Test: retrieve data source (no version arg)
console.log("\n=== TEST: Retrieve data source (no version) ===");
const result4 = await client.callTool({
  name: "API-retrieve-a-data-source",
  arguments: {
    data_source_id: process.env.NOTION_KPIS_DB_ID,
  },
});
console.log("Result v4:", result4.content[0].text.slice(0, 300));
console.log("Results count:", parsed.results?.length);
if (parsed.results?.[0]) {
  console.log("First result keys:", Object.keys(parsed.results[0]));
  console.log("Properties:", Object.keys(parsed.results[0].properties || {}));
}

// Test: search for a client
console.log("\n=== TEST: Search ===");
const searchResult = await client.callTool({
  name: "API-post-search",
  arguments: {
    query: "Apple",
    page_size: 2,
  },
});
const searchParsed = JSON.parse(searchResult.content[0].text);
console.log("Search results:", searchParsed.results?.length);

// Test: get self
console.log("\n=== TEST: Get Self ===");
const selfResult = await client.callTool({
  name: "API-get-self",
  arguments: {},
});
const selfParsed = JSON.parse(selfResult.content[0].text);
console.log("Bot name:", selfParsed.name);
console.log("Bot type:", selfParsed.type);

await client.close();
