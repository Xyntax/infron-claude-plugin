import { listModels } from "../client.js";

export const definition = {
  name: "infron__list_models",
  description:
    `List models available via the Infron API. Returns an array of model entries with id, type, and pricing where available. Use this to discover image, video, or chat models the user can pick.`,
  inputSchema: {
    type: "object",
    properties: {
      filter: {
        type: "string",
        description: "Optional substring filter applied to model IDs. Example: 'veo' to find video models, 'gpt' to find GPT models.",
      },
    },
  },
};

export async function handler(args, ctx) {
  const all = await listModels(ctx.apiKey);
  const filter = (args.filter || "").toLowerCase();
  const filtered = filter
    ? all.filter(m => (m.id || m.name || "").toLowerCase().includes(filter))
    : all;

  return {
    content: [{
      type: "text",
      text: JSON.stringify({
        status: "success",
        count: filtered.length,
        total: all.length,
        filter: filter || null,
        models: filtered.map(m => ({
          id: m.id ?? m.name,
          type: m.type ?? null,
          pricing: m.pricing ?? null,
        })),
      }, null, 2),
    }],
  };
}
