/**
 * Notion MCP Client — Singleton MCP connection to the Notion MCP Server
 *
 * Uses @modelcontextprotocol/sdk to connect to @notionhq/notion-mcp-server
 * via stdio transport. All Notion operations go through MCP tool calls.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { resolve } from "path";

// ─── SINGLETON STATE (survives Next.js HMR via globalThis) ──────

const G = globalThis;
if (!G.__mcpClient) G.__mcpClient = null;
if (!G.__mcpConnectPromise) G.__mcpConnectPromise = null;

/**
 * Get (or create) the singleton MCP client connected to Notion MCP Server.
 * Uses stdio transport to spawn the MCP server as a subprocess.
 */
export async function getMCPClient() {
  if (G.__mcpClient) return G.__mcpClient;

  // Prevent concurrent connection attempts
  if (G.__mcpConnectPromise) return G.__mcpConnectPromise;

  G.__mcpConnectPromise = (async () => {
    const notionKey = process.env.NOTION_API_KEY;
    if (!notionKey) throw new Error("NOTION_API_KEY is not set in .env.local");

    console.log("[MCP] Starting Notion MCP server subprocess...");

    const transport = new StdioClientTransport({
      command: "node",
      args: [resolve(process.cwd(), "node_modules/@notionhq/notion-mcp-server/bin/cli.mjs")],
      env: {
        ...process.env,
        OPENAPI_MCP_HEADERS: JSON.stringify({
          Authorization: `Bearer ${notionKey}`,
          "Notion-Version": "2022-06-28",
        }),
      },
    });

    const client = new Client({
      name: "kpi-tracker",
      version: "1.0.0",
    });

    await client.connect(transport);
    G.__mcpClient = client;
    G.__mcpConnectPromise = null;

    console.log("[MCP] Connected to Notion MCP server.");
    return client;
  })();

  try {
    return await G.__mcpConnectPromise;
  } catch (err) {
    G.__mcpConnectPromise = null;
    throw err;
  }
}

/** Reset singleton so next call spawns a fresh connection. */
function resetClient() {
  console.warn("[MCP] Resetting stale client.");
  try { G.__mcpClient?.close(); } catch { /* ignore */ }
  G.__mcpClient = null;
  G.__mcpConnectPromise = null;
}

/**
 * Call an MCP tool on the Notion MCP Server and parse the JSON response.
 * Auto-reconnects once if the connection is dead.
 */
export async function callNotionTool(toolName, args = {}) {
  let retried = false;

  const attempt = async () => {
    const client = await getMCPClient();
    const result = await client.callTool({ name: toolName, arguments: args });

    const text = result.content?.[0]?.text;
    if (!text) throw new Error(`No response from MCP tool: ${toolName}`);

    const parsed = JSON.parse(text);

    // Check for Notion API errors
    if (parsed.status && parsed.status >= 400) {
      throw new Error(`Notion API error (${parsed.status}): ${parsed.message || parsed.code}`);
    }

    return parsed;
  };

  try {
    return await attempt();
  } catch (err) {
    // Reconnect once on connection errors
    if (!retried && /closed|enotconn|epipe|eof|disconnect|transport/i.test(err.message)) {
      retried = true;
      console.warn(`[MCP] Connection error on ${toolName}, reconnecting:`, err.message);
      resetClient();
      return await attempt();
    }
    throw err;
  }
}

/**
 * Close the MCP connection gracefully.
 */
export async function closeMCPClient() {
  if (G.__mcpClient) {
    try {
      await G.__mcpClient.close();
    } catch {
      // Ignore close errors
    }
    G.__mcpClient = null;
  }
}
