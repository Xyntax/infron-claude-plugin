import { DEFAULTS } from "../models.js";
import {
  confirmationGate,
  validateVideoParams,
  submitPollDownload,
  defaultOutputPath,
} from "./_video_common.js";

const MAX_REFERENCE_IMAGES = 9;

export const definition = {
  name: "infron__video_reference",
  description:
    `Generate a video that FEATURES the people/subjects in one or more reference images (Seedance 2.0 reference-to-video). Pass publicly-accessible image URLs as reference_image_urls; the model renders a new video in which those subjects appear and move — the prompt describes what they do.

This is the "face / portrait" workflow: give it a person's face and the output video is generated from that person, preserving their identity (hair, features, etc.).

Default model: bytedance/seedance-2.0/reference-to-video (~$0.15/sec, ≤720p, up to 9 reference images). The actual charge is returned as actual_cost_usd.
For a single portrait / talking-head driven by one face, use bytedance/seedance-2.0/virtual-portrait-reference-to-video via the \`model\` parameter (the "人脸版" / virtual-portrait variant). Append the \`/fast/\` tier (e.g. bytedance/seedance-2.0/fast/reference-to-video) for lower latency/cost.

⚠️  REAL-PERSON FILTER: the virtual-portrait model rejects images that look like a real person (upstream privacy/anti-deepfake filter → "InputImageSensitiveContentDetected"). Use a clearly virtual / illustrated / 3D-rendered / stylized portrait, not a photo of a real human.

⚠️  COST WARNING: video costs real money (Seedance ~$0.15/sec; ~$0.76 for a 5s 720p clip). The true charge is returned as actual_cost_usd.

CRITICAL: Before calling this tool, you MUST verbally confirm the cost with the user in conversation. Set the \`confirmed\` parameter to true only after they explicitly confirm.

Use this tool when:
  - The user wants a video built from a specific person's face/photo (identity preserved)
  - The user wants several reference images (a character, an outfit, a product) to drive a consistent subject across the clip

Note: duration / resolution / aspect_ratio accept different values per model family — an invalid value returns the allowed set for that model.

For animating a single still image (first frame → motion), use infron__video_from_image instead.
For a purely text-driven video, use infron__video.`,
  inputSchema: {
    type: "object",
    required: ["prompt", "confirmed", "reference_image_urls"],
    properties: {
      prompt: {
        type: "string",
        description: "Description of what the referenced subject(s) do in the video — motion, action, expression, scene.",
      },
      confirmed: {
        type: "boolean",
        description: "Must be true. Set only after the user explicitly confirms the cost.",
      },
      reference_image_urls: {
        type: "array",
        items: { type: "string" },
        minItems: 1,
        maxItems: MAX_REFERENCE_IMAGES,
        description: `Publicly accessible URLs of reference images (e.g. a person's face). 1–${MAX_REFERENCE_IMAGES} images. GCS URLs from infron__image work. Local file paths are NOT supported.`,
      },
      model: {
        type: "string",
        description: `Optional. Default: ${DEFAULTS.videoReference} (general reference, up to ${MAX_REFERENCE_IMAGES} images). Single-face talking-head: bytedance/seedance-2.0/virtual-portrait-reference-to-video. Faster/cheaper: prefix with /fast/ (e.g. bytedance/seedance-2.0/fast/reference-to-video).`,
      },
      duration: {
        type: "string",
        description: "Clip length, as a STRING. Seedance: '4'…'15' or 'auto' (default '4'). An integer or wrong format is rejected with the allowed set.",
      },
      aspect_ratio: {
        type: "string",
        description: "Seedance: '21:9', '16:9', '4:3', '1:1', '3:4', '9:16'. Default: '16:9'. For a portrait/face, '9:16' or '3:4' frames it better.",
      },
      resolution: {
        type: "string",
        description: "Seedance: '480p' or '720p' (default '720p').",
      },
      generate_audio: {
        type: "boolean",
        description: "Generate a native audio track. Default: false. Set true for a talking portrait that should speak.",
      },
      output_path: {
        type: "string",
        description: "Local file path to save the MP4. Default: ./infron-video-<timestamp>.mp4.",
      },
    },
  },
};

export async function handler(args, ctx) {
  const model = args.model || DEFAULTS.videoReference;

  const gate = confirmationGate(args, model);
  if (gate) return gate;

  const urls = args.reference_image_urls;
  if (!Array.isArray(urls) || urls.length === 0) {
    return badRequest("reference_image_urls is required and must be a non-empty array of publicly accessible image URLs.");
  }
  if (urls.length > MAX_REFERENCE_IMAGES) {
    return badRequest(`reference_image_urls accepts at most ${MAX_REFERENCE_IMAGES} images (got ${urls.length}).`);
  }
  if (!urls.every((u) => typeof u === "string" && u.length > 0)) {
    return badRequest("Every entry in reference_image_urls must be a non-empty URL string. Local file paths are not supported.");
  }

  const v = validateVideoParams(model, args);
  if (v.error) return v.error;

  // The onerouter gateway takes reference images as a flat `image_urls` array of
  // URL strings (verified live 2026-06-08 — the OpenRouter-native `input_references`
  // shape is silently ignored by this gateway). Plain public https URLs are fetched
  // gateway-side; an `asset://` URI from /v1/upload/resources also works.
  const payload = {
    model,
    prompt: args.prompt,
    image_urls: urls,
    ...v.params,
  };

  return submitPollDownload({
    apiKey: ctx.apiKey,
    payload,
    outputPath: args.output_path || defaultOutputPath("infron-video"),
    toolLabel: "infron__video_reference",
  });
}

function badRequest(message) {
  return {
    isError: true,
    content: [{
      type: "text",
      text: JSON.stringify({ status: "error", error_type: "bad_request", message }, null, 2),
    }],
  };
}
