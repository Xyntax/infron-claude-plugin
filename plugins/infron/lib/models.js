// Default model selections per task type. Override at call time with the `model` parameter.
export const DEFAULTS = {
  image: "google/nano-banana-pro-text-to-image",
  imageEdit: "google/nano-banana-pro-text-to-image",
  videoTextToVideo: "google/veo3.1/text-to-video",
  videoImageToVideo: "google/veo3.1/image-to-video",
  videoFirstLastFrame: "google/veo3.1/first-last-frame-to-video",
};

// Pricing in USD. Used by tool descriptions and the test price-ceiling helper.
// Source: memory/infron-api-access.md as of 2026-05-26.
export const PRICING = {
  "google/nano-banana-pro-text-to-image": { type: "per_image", usd: 0.15 },
  "google/nano-banana-text-to-image": { type: "per_image", usd: 0.05 },
  "openai/gpt-image-2/text-to-image": { type: "per_token", usd: null },
  "google/gemini-2.5-flash-image": { type: "per_image", usd: 0.04 },
  "google/veo3.1/text-to-video": { type: "per_second", usd: 0.40 },
  "google/veo3.1/image-to-video": { type: "per_second", usd: 0.40 },
  "google/veo3.1/first-last-frame-to-video": { type: "per_second", usd: 0.40 },
};

// A safety ceiling enforced inside test helpers. Any test that asks the client to
// hit a model priced above this threshold aborts before the network call, so a
// typo can't accidentally burn $3.20 in a unit test.
export const TEST_PRICE_CEILING_USD = 0.20;

export function estimateCost(model, { durationSeconds = 8, n = 1 } = {}) {
  const p = PRICING[model];
  if (!p) return null;
  if (p.type === "per_image") return p.usd * n;
  if (p.type === "per_second") return p.usd * durationSeconds;
  return null;
}
