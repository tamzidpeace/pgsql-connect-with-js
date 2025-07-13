import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { Client } from "pg";

const server = new McpServer({
  name: "db-connector",
  version: "1.0.0",
  capabilities: {
    resources: {},
    tools: {
      "get-table-data": {
        input_schema: {
          type: "object",
          properties: {
            tableName: {
              type: "string",
              description: "The name of the database table to retrieve data from.",
            },
            databaseName: {
              type: "string",
              description: "The name of the database to connect to. Defaults to 'inventory'.",
            },
          },
          required: ["tableName"],
        },
      },
    },
  },
});

server.tool(
  "get-table-data",
  z.object({
    tableName: z.string().describe("The name of the database table to retrieve data from."),
    databaseName: z.string().optional().describe("The name of the database to connect to. Defaults to 'inventory'."),
  }).shape,
  async ({ tableName, databaseName }) => {
    const client = new Client({
      host: '127.0.0.1',       // or your DB host
      port: 5432,              // default PostgreSQL port
      user: 'sail',
      password: 'secret',
      database: databaseName || 'inventory',
    });

    try {
      await client.connect();
      const res = await client.query(`SELECT * FROM ${tableName}`);
      return { content: [{ type: "text", text: JSON.stringify(res.rows) }] };
    } catch (error: any) {
      console.error(`Error fetching data from table ${tableName}:`, error.stack);
      throw new Error(`Failed to retrieve data from table ${tableName}: ${error.message}`);
    } finally {
      await client.end();
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Database Connector MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});

    
