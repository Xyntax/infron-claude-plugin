import { DEFAULTS } from "../models.js";
import { MEDIA_BASE } from "../client.js";
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
    `Generate a video that FEATURES the people/subjects in reference images (Seedance 2.0 reference-to-video, on the media gateway). Pass references as reference_image_urls; the model renders a new video in which those subjects appear and move — the prompt describes what they do, preserving identity (face, hair, features).

Default model: bytedance/seedance-2.0/reference-to-video (general, up to 9 reference images, plain public image URLs).
For a single face / talking-head, use bytedance/seedance-2.0/virtual-portrait-reference-to-video via the \`model\` parameter (the "人脸版").

REAL FACES: the virtual-portrait model fully supports real people via an authorized asset flow — it is NOT blocked. A raw URL of a real face is rejected upstream; instead upload it first with infron__upload_asset (which registers it and waits for the consistency review to pass), then pass the returned asset:// URI here. In the prompt, refer to each reference as @Image1, @Image2, … (mapping to reference_image_urls[0], [1], …). Example prompt: "@Image1 the man is eating breakfast, English countryside behind him".

PARAMS: aspect_ratio 21:9/16:9/4:3/1:1/3:4/9:16 (def 16:9) · resolution 480p/720p (def 720p) · duration "4"–"15" · generate_audio (def true) · optional seed (>=1). Cost is token-based (~$0.61 for a 4s 720p clip with audio); the true charge is returned as actual_cost_usd.

CRITICAL: video costs real money. Set \`confirmed: true\` only when the caller has authorized the spend (a slash-command invocation that requests a video counts as authorization).

For animating a single still image (first frame → motion), use infron__video_from_image. For a purely text-driven video, use infron__video.`,
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
        description: "Generate a native audio track. Default: true (the gateway default for this family). Set false for a silent clip.",
      },
      seed: {
        type: "integer",
        minimum: 1,
        description: "Optional random seed (>=1) for reproducible generations.",
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

  // Gateway default for this family is audio ON (the manual's default). Apply it
  // before validation so an omitted generate_audio resolves to true, not false.
  if (args.generate_audio == null) args.generate_audio = true;

  const v = validateVideoParams(model, args);
  if (v.error) return v.error;

  if (args.seed != null && (!Number.isInteger(args.seed) || args.seed < 1)) {
    return badRequest("seed must be an integer >= 1.");
  }

  // The media gateway takes references as a flat `image_urls` array of strings —
  // either public https URLs or `asset://` URIs from /v1/upload/resources. For
  // the virtual-portrait ("face") model the prompt must reference each asset as
  // @Image1, @Image2, … (mapping to image_urls[0], [1], …).
  const payload = {
    model,
    prompt: args.prompt,
    image_urls: urls,
    video_urls: [],
    audio_urls: [],
    n: 1,
    ...(args.seed != null ? { seed: args.seed } : {}),
    ...v.params,
  };

  return submitPollDownload({
    apiKey: ctx.apiKey,
    payload,
    outputPath: args.output_path || defaultOutputPath("infron-video"),
    toolLabel: "infron__video_reference",
    submitUrl: `${MEDIA_BASE}/videos/generations`,
    tasksBase: `${MEDIA_BASE}/videos/tasks`,
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
