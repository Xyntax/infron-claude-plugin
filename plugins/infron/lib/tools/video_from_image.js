import { DEFAULTS } from "../models.js";
import {
  confirmationGate,
  validateDuration,
  submitPollDownload,
  defaultOutputPath,
} from "./_video_common.js";

export const definition = {
  name: "infron__video_from_image",
  description:
    `Animate a still IMAGE into a video via Veo 3.1 image-to-video. Pass the publicly-accessible URL of a still image as start_image_url; Veo continues the scene with motion.

⚠️  COST WARNING: ~$0.40 per second. An 8-second clip is ~$3.20.

CRITICAL: Before calling this tool, you MUST verbally confirm the cost with the user in conversation. Set the \`confirmed\` parameter to true only after they explicitly confirm.

Use this tool when:
  - The user has an existing image and wants it animated
  - You've just generated a still image with infron__image and the user wants motion added on top

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
        description: `Optional. Default: ${DEFAULTS.videoImageToVideo}.`,
      },
      duration: {
        type: "string",
        description: "'4s' or '8s'. Default: '8s'. Must be a string with 's' suffix.",
      },
      aspect_ratio: {
        type: "string",
        description: "'16:9' or '9:16'. Default: '16:9'.",
      },
      resolution: {
        type: "string",
        description: "'720p' or '1080p'. Default: '1080p'.",
      },
      generate_audio: {
        type: "boolean",
        description: "Generate audio track. Default: true.",
      },
      output_path: {
        type: "string",
        description: "Local file path to save the MP4. Default: ./infron-video-<timestamp>.mp4.",
      },
    },
  },
};

export async function handler(args, ctx) {
  const gate = confirmationGate(args);
  if (gate) return gate;

  const duration = args.duration || "8s";
  const dv = validateDuration(duration);
  if (dv) return dv;

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

  const payload = {
    model: args.model || DEFAULTS.videoImageToVideo,
    prompt: args.prompt,
    start_image_url: args.start_image_url,
    duration,
    aspect_ratio: args.aspect_ratio || "16:9",
    resolution: args.resolution || "1080p",
    generate_audio: args.generate_audio !== false,
  };

  return submitPollDownload({
    apiKey: ctx.apiKey,
    payload,
    outputPath: args.output_path || defaultOutputPath("infron-video"),
    toolLabel: "infron__video_from_image",
  });
}
