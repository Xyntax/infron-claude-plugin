// Default model selections per task type. Override at call time with the `model` parameter.
// Video text/image default to Seedance 2.0 (cheaper, ~$0.15/sec; replaces Veo as
// the house default per product direction 2026-06). Veo stays available via the
// `model` param for 1080p / native audio, and remains the default for the
// first-last-frame variant (Seedance has no first-last-frame model).
export const DEFAULTS = {
  image: "google/nano-banana-pro-text-to-image",
  imageEdit: "google/nano-banana-pro-image-to-image",
  videoTextToVideo: "bytedance/seedance-2.0/text-to-video",
  videoImageToVideo: "bytedance/seedance-2.0/image-to-video",
  // Reference-to-video ("face/portrait") — render a video featuring the people
  // in one or more reference images. Virtual-portrait variant is for a single
  // face/talking-head; the general model takes up to 9 reference images.
  videoReference: "bytedance/seedance-2.0/reference-to-video",
  videoFirstLastFrame: "google/veo3.1/first-last-frame-to-video",
};

// Pricing in USD. Used by tool descriptions, the confirmation gate's estimate,
// and the test price-ceiling helper.
// Source: memory/infron-api-access.md (Veo, 2026-05-26) + live gateway probe
// (Seedance, 2026-06-04: 4s @ 720p measured at $0.6111 → ~$0.153/sec).
export const PRICING = {
  "google/nano-banana-pro-text-to-image": { type: "per_image", usd: 0.15 },
  "google/nano-banana-pro-image-to-image": { type: "per_image", usd: 0.15 },
  "google/nano-banana-2-text-to-image": { type: "per_image", usd: 0.08 },
  "google/nano-banana-2-image-to-image": { type: "per_image", usd: 0.08 },
  "google/nano-banana-text-to-image": { type: "per_image", usd: 0.039 },
  "google/nano-banana-image-to-image": { type: "per_image", usd: 0.039 },
  "openai/gpt-image-2/text-to-image": { type: "per_token", usd: null },
  "openai/gpt-image-2/image-to-image": { type: "per_token", usd: null },
  "google/gemini-2.5-flash-image": { type: "per_image", usd: 0.04 },
  "google/veo3.1/text-to-video": { type: "per_second", usd: 0.40 },
  "google/veo3.1/image-to-video": { type: "per_second", usd: 0.40 },
  "google/veo3.1/first-last-frame-to-video": { type: "per_second", usd: 0.40 },
  // Seedance 2.0 — resolution-dependent; 720p (the default) measured ~$0.153/sec.
  // Reference/virtual-portrait models surface a large notional `request_price` in
  // /v1/models, but the real charge is token-based and matches the per-second rate
  // (virtual-portrait 5s @ 720p measured $0.7623 → ~$0.152/sec, 2026-06-08).
  // Actual cost is read back from the task response (data.cost.total_cost), so
  // this is only the a-priori confirmation-gate estimate.
  "bytedance/seedance-2.0/text-to-video": { type: "per_second", usd: 0.153 },
  "bytedance/seedance-2.0/image-to-video": { type: "per_second", usd: 0.153 },
  "bytedance/seedance-2.0/reference-to-video": { type: "per_second", usd: 0.153 },
  "bytedance/seedance-2.0/virtual-portrait-reference-to-video": { type: "per_second", usd: 0.153 },
  "bytedance/seedance-2.0/fast/text-to-video": { type: "per_second", usd: 0.153 },
  "bytedance/seedance-2.0/fast/image-to-video": { type: "per_second", usd: 0.153 },
  "bytedance/seedance-2.0/fast/reference-to-video": { type: "per_second", usd: 0.153 },
  "bytedance/seedance-2.0/fast/virtual-portrait-reference-to-video": { type: "per_second", usd: 0.153 },
};

// Per-family video parameter contracts. Different video model families accept
// genuinely different params (Veo wants duration "8s"/resolution 1080p; Seedance
// wants duration "8"/resolution 720p), so payloads must be built per family
// rather than one Veo-shaped payload for everything.
// Allow-lists below were verified against the live onerouter gateway 2026-06-04.
export const VIDEO_PROFILES = [
  {
    family: "seedance",
    test: (m) => /seedance/i.test(m),
    durations: ["auto", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15"],
    defaultDuration: "4",
    resolutions: ["480p", "720p"],
    defaultResolution: "720p",
    aspectRatios: ["21:9", "16:9", "4:3", "1:1", "3:4", "9:16"],
    defaultAspectRatio: "16:9",
    // Seedance accepts a generate_audio bool but does not produce a native audio
    // track the way Veo does; default off to avoid implying audio it won't make.
    defaultGenerateAudio: false,
  },
  {
    family: "veo",
    test: (m) => /veo/i.test(m),
    durations: ["4s", "8s"],
    defaultDuration: "8s",
    resolutions: ["720p", "1080p"],
    defaultResolution: "1080p",
    aspectRatios: ["16:9", "9:16"],
    defaultAspectRatio: "16:9",
    defaultGenerateAudio: true,
  },
];

// Resolve a model id to its video param profile. Unknown video models fall back
// to the Veo profile (prior behavior — no regression for models we haven't mapped).
export const VEO_PROFILE = VIDEO_PROFILES.find((p) => p.family === "veo");
export function videoProfile(model) {
  return VIDEO_PROFILES.find((p) => p.test(model)) || VEO_PROFILE;
}

// Parse a duration value to an integer number of seconds, or null if it isn't a
// plain seconds value ("8s" → 8, "8" → 8, "auto"/garbage/number → null).
export function durationSeconds(duration) {
  if (typeof duration !== "string") return null;
  const m = /^(\d+)s?$/.exec(duration.trim());
  return m ? parseInt(m[1], 10) : null;
}

// A safety ceiling enforced inside test helpers. Any test that asks the client to
// hit a model priced above this threshold aborts before the network call, so a
// typo can't accidentally burn $3.20 in a unit test.
export const TEST_PRICE_CEILING_USD = 0.20;

export function estimateCost(model, { durationSeconds: secs = 8, n = 1 } = {}) {
  const p = PRICING[model];
  if (p) {
    if (p.type === "per_image") return p.usd * n;
    if (p.type === "per_second") return Number.isFinite(secs) ? p.usd * secs : null;
    return null;
  }
  // Video model not in the price table: fall back to its family's per-second rate
  // if it explicitly matches a profile (don't guess a price for arbitrary models).
  const prof = VIDEO_PROFILES.find((v) => v.test(model));
  if (prof && /to-video/.test(model) && Number.isFinite(secs)) {
    const ref = PRICING[`${prof.family === "veo" ? "google/veo3.1" : "bytedance/seedance-2.0"}/text-to-video`];
    if (ref?.usd != null) return ref.usd * secs;
  }
  return null;
}
