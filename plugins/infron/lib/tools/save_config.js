import { saveApiKey, configPath } from "../config.js";
import { verifyKey } from "../client.js";

export const definition = {
  name: "infron__save_config",
  description:
    `Save the user's Infron API key to ~/.infron/config (chmod 0600). Then verifies the key by calling /v1/models. Used by the infron-setup skill during first-time onboarding. Do NOT call this tool unless the user has just pasted a fresh API key in the conversation.`,
  inputSchema: {
    type: "object",
    required: ["apiKey"],
    properties: {
      apiKey: {
        type: "string",
        description: "The API key string the user just provided. Will be persisted to ~/.infron/config.",
      },
    },
  },
};

export async function handler(args /*, ctx */) {
  const apiKey = (args.apiKey || "").trim();
  if (!apiKey) {
    return {
      isError: true,
      content: [{
        type: "text",
        text: JSON.stringify({
          status: "error",
          error_type: "bad_request",
          message: "apiKey is required and must be a non-empty string.",
        }, null, 2),
      }],
    };
  }

  // Verify before persisting — better to fail loudly than save a bad key.
  try {
    await verifyKey(apiKey);
  } catch (err) {
    return {
      isError: true,
      content: [{
        type: "text",
        text: JSON.stringify({
          status: "error",
          error_type: err.type || "auth_failed",
          message: "The API key was rejected by Infron during verification.",
          hint: err.hint || "Double-check the key was copied correctly, or generate a new one at https://infron.ai/dashboard/apiKeys",
          status_code: err.status || null,
        }, null, 2),
      }],
    };
  }

  const savedPath = saveApiKey(apiKey);

  return {
    content: [{
      type: "text",
      text: JSON.stringify({
        status: "success",
        message: "API key verified and saved.",
        path: savedPath,
      }, null, 2),
    }],
  };
}
