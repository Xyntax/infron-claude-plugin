import { DEFAULTS } from "../models.js";
import {
  confirmationGate,
  validateVideoParams,
  submitPollDownload,
  defaultOutputPath,
} from "./_video_common.js";

export const definition = {
  name: "infron__video_from_image",
  description:
    `Animate a still IMAGE into a video. Pass the publicly-accessible URL of a still image as start_image_url; the model continues the scene with motion.

Default model: bytedance/seedance-2.0/image-to-video (~$0.15/sec, up to 720p, no native audio).
Higher-quality alternative: google/veo3.1/image-to-video (~$0.40/sec, up to 1080p, native audio) — select it via the \`model\` parameter. Append the Seedance \`/fast/\` tier for quicker turnaround.

⚠️  COST WARNING: video costs real money and varies by model (Seedance ~$0.61 for 4s @ 720p; Veo ~$3.20 for 8s). The true charge is returned as actual_cost_usd.

CRITICAL: Before calling this tool, you MUST verbally confirm the cost with the user in conversation. Set the \`confirmed\` parameter to true only after they explicitly confirm.

Use this tool when:
  - The user has an existing image and wants it animated
  - You've just generated a still image with infron__image and the user wants motion added on top

Note: duration / resolution / aspect_ratio accept different values per model family — an invalid value returns the allowed set for that model.

For a purely text-driven video, use infron__video instead.
For dialogue/character-switching, use infron__video_first_last_frame.`,
  inputSchema: {
    type: "object",
    required: ["prompt", "confirmed", "start_image_url"],
    properties: {
      prompt: {
        type: "string",
        description: "Description of the motion / what should happen in the video, starting from the provided image.",
      },
      confirmed: {
        type: "boolean",
        description: "Must be true. Set only after the user explicitly confirms the cost.",
      },
      start_image_url: {
        type: "string",
        description: "Publicly accessible URL of the starting still image. GCS URLs from infron__image work. Local file paths are NOT supported.",
      },
      model: {
        type: "string",
        description: `Optional. Default: ${DEFAULTS.videoImageToVideo} (Seedance, ~$0.15/sec, ≤720p). Faster: bytedance/seedance-2.0/fast/image-to-video. Higher quality (≤1080p + native audio): google/veo3.1/image-to-video.`,
      },
      duration: {
        type: "string",
        description: "Clip length, as a STRING. Veo: '4s' or '8s' (default '8s'). Seedance: '4'…'15' or 'auto' (default '4'). Format is model-specific; an integer or wrong format is rejected with the allowed set.",
      },
      aspect_ratio: {
        type: "string",
        description: "Veo: '16:9' or '9:16'. Seedance also allows '21:9', '4:3', '1:1', '3:4'. Default: '16:9'.",
      },
      resolution: {
        type: "string",
        description: "Veo: '720p' or '1080p' (default '1080p'). Seedance: '480p' or '720p' (default '720p').",
      },
      generate_audio: {
        type: "boolean",
        description: "Generate an audio track. Veo: default true (native audio). Seedance: default false (no native audio track).",
      },
      output_path: {
        type: "string",
        description: "Local file path to save the MP4. Default: ./infron-video-<timestamp>.mp4.",
      },
    },
  },
};

export async function handler(args, ctx) {
  const model = args.model || DEFAULTS.videoImageToVideo;

  const gate = confirmationGate(args, model);
  if (gate) return gate;

  if (!args.start_image_url || typeof args.start_image_url !== "string") {
    return {
      isError: true,
      content: [{
        type: "text",
        text: JSON.stringify({
          status: "error",
          error_type: "bad_request",
          message: "start_image_url is required and must be a publicly accessible URL.",
        }, null, 2),
      }],
    };
  }

  const v = validateVideoParams(model, args);
  if (v.error) return v.error;

  const payload = {
    model,
    prompt: args.prompt,
    start_image_url: args.start_image_url,
    ...v.params,
  };

  return submitPollDownload({
    apiKey: ctx.apiKey,
    payload,
    outputPath: args.output_path || defaultOutputPath("infron-video"),
    toolLabel: "infron__video_from_image",
  });
}
