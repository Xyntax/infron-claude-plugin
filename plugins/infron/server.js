#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { getApiKey, DASHBOARD_URL, configPath } from "./lib/config.js";
import { InfronError } from "./lib/client.js";
import { definitions, findHandler, requiresKey } from "./lib/tools/index.js";

const PACKAGE_NAME = "infron";
const PACKAGE_VERSION = "0.1.0";

const server = new Server(
  { name: PACKAGE_NAME, version: PACKAGE_VERSION },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: definitions,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params ?? {};

  const handler = findHandler(name);
  if (!handler) {
    return {
      isError: true,
      content: [{
        type: "text",
        text: JSON.stringify({
          status: "error",
          error_type: "unknown_tool",
          message: `Unknown tool: ${name}`,
        }, null, 2),
      }],
    };
  }

  // If this tool needs a key, check that one is available before dispatching.
  // We deliberately return a structured `need_setup` payload so the
  // infron-setup skill can pick it up and trigger the onboarding flow.
  let apiKey = null;
  if (requiresKey(name)) {
    apiKey = getApiKey();
    if (!apiKey) {
      return {
        isError: true,
        content: [{
          type: "text",
          text: JSON.stringify({
            status: "error",
            error_type: "need_setup",
            need_setup: true,
            message: "Infron API key is not configured.",
            hint: "Trigger the infron-setup skill to obtain and save a key.",
            dashboard_url: DASHBOARD_URL,
            config_path: configPath(),
          }, null, 2),
        }],
      };
    }
  }

  try {
    return await handler(args, { apiKey });
  } catch (err) {
    if (err instanceof InfronError) {
      return {
        isError: true,
        content: [{
          type: "text",
          text: JSON.stringify({
            status: "error",
            error_type: err.type,
            message: err.message,
            hint: err.hint,
            status_code: err.status,
          }, null, 2),
        }],
      };
    }
    return {
      isError: true,
      content: [{
        type: "text",
        text: JSON.stringify({
          status: "error",
          error_type: "unknown",
          message: err?.message || String(err),
        }, null, 2),
      }],
    };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
