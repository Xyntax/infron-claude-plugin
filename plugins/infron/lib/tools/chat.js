import { chatCompletion } from "../client.js";

export const definition = {
  name: "infron__chat",
  description:
    `Send a chat completion request to Infron's OpenAI-compatible endpoint.

DO NOT use this tool by default for conversational requests — Claude's native conversation is preferred. Only call this tool when the user explicitly says one of:
- "use infron chat"
- "use the infron model" / "send it through infron"
- Names a specific model and asks to call it via Infron

The user MUST specify the model. Use infron__list_models to discover available options.`,
  inputSchema: {
    type: "object",
    required: ["model", "messages"],
    properties: {
      model: {
        type: "string",
        description: "Required. The model identifier. Examples: 'openai/gpt-5', 'anthropic/claude-opus-4.7', 'google/gemini-2.5-pro'. Use infron__list_models to discover available models.",
      },
      messages: {
        type: "array",
        description: "OpenAI-style messages array. Each item has {role: 'system'|'user'|'assistant', content: string}.",
        items: {
          type: "object",
          required: ["role", "content"],
          properties: {
            role: { type: "string", enum: ["system", "user", "assistant"] },
            content: { type: "string" },
          },
        },
        minItems: 1,
      },
      temperature: { type: "number", minimum: 0, maximum: 2 },
      max_tokens: { type: "integer", minimum: 1 },
      top_p: { type: "number", minimum: 0, maximum: 1 },
    },
  },
};

export async function handler(args, ctx) {
  const payload = { model: args.model, messages: args.messages };
  if (typeof args.temperature === "number") payload.temperature = args.temperature;
  if (typeof args.max_tokens === "number") payload.max_tokens = args.max_tokens;
  if (typeof args.top_p === "number") payload.top_p = args.top_p;

  const result = await chatCompletion(ctx.apiKey, payload);
  const message = result?.choices?.[0]?.message?.content ?? "";
  const usage = result?.usage ?? null;
  return {
    content: [{
      type: "text",
      text: JSON.stringify({
        status: "success",
        model: result?.model ?? args.model,
        message,
        usage,
      }, null, 2),
    }],
  };
}
