import { DEFAULTS } from "../models.js";
import {
  confirmationGate,
  validateDuration,
  submitPollDownload,
  defaultOutputPath,
} from "./_video_common.js";

export const definition = {
  name: "infron__video_first_last_frame",
  description:
    `Generate a video that animates between TWO keyframes via Veo 3.1 first-last-frame-to-video. Pass start and end image URLs; Veo interpolates a coherent motion sequence between them.

⚠️  COST WARNING: ~$0.40 per second. An 8-second clip is ~$3.20.

CRITICAL: Before calling this tool, you MUST verbally confirm the cost with the user in conversation. Set the \`confirmed\` parameter to true only after they explicitly confirm.

Use this tool when:
  - The user wants tight control over the starting AND ending frame of the video
  - You're animating a dialogue / character-switching scene. Veo's vanilla text-to-video has a known voicing bug where it assigns all dialogue to one character; first-last-frame mode forces the visual turn-taking by switching mouth-open states between the two keyframes
  - You need a specific scene transition

For pure text-to-video, use infron__video.
For animating a single image without an end frame, use infron__video_from_image.`,
  inputSchema: {
    type: "object",
    required: ["prompt", "confirmed", "start_image_url", "end_image_url"],
    properties: {
      prompt: {
        type: "string",
        description: "Description of the motion/scene that connects start frame to end frame.",
      },
      confirmed: {
        type: "boolean",
        description: "Must be true. Set only after the user explicitly confirms the cost.",
      },
      start_image_url: {
        type: "string",
        description: "Publicly accessible URL of the starting keyframe. GCS URLs from infron__image work. Local file paths are NOT supported.",
      },
      end_image_url: {
        type: "string",
        description: "Publicly accessible URL of the ending keyframe. Same format requirements as start_image_url.",
      },
      model: {
        type: "string",
        description: `Optional. Default: ${DEFAULTS.videoFirstLastFrame}.`,
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
        description: "Local file path to save the MP4.",
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

  for (const field of ["start_image_url", "end_image_url"]) {
    if (!args[field] || typeof args[field] !== "string") {
      return {
        isError: true,
        content: [{
          type: "text",
          text: JSON.stringify({
            status: "error",
            error_type: "bad_request",
            message: `${field} is required and must be a publicly accessible URL.`,
          }, null, 2),
        }],
      };
    }
  }

  const payload = {
    model: args.model || DEFAULTS.videoFirstLastFrame,
    prompt: args.prompt,
    start_image_url: args.start_image_url,
    end_image_url: args.end_image_url,
    duration,
    aspect_ratio: args.aspect_ratio || "16:9",
    resolution: args.resolution || "1080p",
    generate_audio: args.generate_audio !== false,
  };

  return submitPollDownload({
    apiKey: ctx.apiKey,
    payload,
    outputPath: args.output_path || defaultOutputPath("infron-video"),
    toolLabel: "infron__video_first_last_frame",
  });
}
