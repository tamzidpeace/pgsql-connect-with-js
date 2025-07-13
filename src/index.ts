import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { Client } from "pg";
import format from 'pg-format';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const server = new McpServer({
  name: "Database Connector",
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
      "execute-custom-query": {
        input_schema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "The SQL query to execute.",
            },
            databaseName: {
              type: "string",
              description: "The name of the database to connect to. Defaults to 'inventory'.",
            },
          },
          required: ["query"],
        },
      },
      "insert-table-data": {
        input_schema: {
          type: "object",
          properties: {
            tableName: {
              type: "string",
              description: "The name of the database table to insert data into.",
            },
            data: {
              type: "object",
              description: "The data to insert, where keys are column names and values are the data.",
              additionalProperties: true,
            },
            databaseName: {
              type: "string",
              description: "The name of the database to connect to. Defaults to 'inventory'.",
            },
          },
          required: ["tableName", "data"],
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
    // Validate and sanitize table name to prevent SQL injection
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
      throw new Error(`Invalid table name: ${tableName}`);
    }
    
    const client = new Client({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      database: databaseName || process.env.DB_NAME || 'inventory',
    });

    try {
      await client.connect();
      const query = format('SELECT * FROM %I', tableName); 
      const res = await client.query(query);
      return { content: [{ type: "text", text: JSON.stringify(res.rows) }] };
    } catch (error: any) {
      console.error(`Error fetching data from table ${tableName}:`, error.stack);
      throw new Error(`Failed to retrieve data from table ${tableName}: ${error.message}`);
    } finally {
      await client.end();
    }
  }
);

server.tool(
  "execute-custom-query",
  z.object({
    query: z.string().describe("The SQL query to execute."),
    databaseName: z.string().optional().describe("The name of the database to connect to. Defaults to 'inventory'."),
  }).shape,
  async ({ query, databaseName }) => {
    const client = new Client({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      database: databaseName || process.env.DB_NAME || 'inventory',
    });

    try {
      await client.connect();
      const res = await client.query(query);
      return { content: [{ type: "text", text: JSON.stringify(res.rows) }] };
    } catch (error: any) {
      console.error(`Error executing custom query: ${query}`, error.stack);
      throw new Error(`Failed to execute custom query: ${error.message}`);
    } finally {
      await client.end();
    }
  }
);

server.tool(
  "insert-table-data",
  z.object({
    tableName: z.string().describe("The name of the database table to insert data into."),
    data: z.record(z.any()).describe("The data to insert, where keys are column names and values are the data."),
    databaseName: z.string().optional().describe("The name of the database to connect to. Defaults to 'inventory'."),
  }).shape,
  async ({ tableName, data, databaseName }) => {
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
      throw new Error(`Invalid table name: ${tableName}`);
    }

    const columns = Object.keys(data);
    const values = Object.values(data);

    const client = new Client({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      database: databaseName || process.env.DB_NAME || 'inventory',
    });

    try {
      await client.connect();
      const query = format('INSERT INTO %I (%I) VALUES (%L) RETURNING *;', tableName, columns, values);
      const res = await client.query(query);
      return { content: [{ type: "text", text: JSON.stringify(res.rows[0]) }] };
    } catch (error: any) {
      console.error(`Error inserting data into table ${tableName}:`, error.stack);
      throw new Error(`Failed to insert data into table ${tableName}: ${error.message}`);
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

    
