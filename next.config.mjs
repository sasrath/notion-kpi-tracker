/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["pdf-parse", "@notionhq/notion-mcp-server", "@modelcontextprotocol/sdk"],
};

export default nextConfig;
