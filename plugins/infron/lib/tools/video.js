import { DEFAULTS } from "../models.js";
import {
  confirmationGate,
  validateDuration,
  submitPollDownload,
  defaultOutputPath,
} from "./_video_common.js";

export const definition = {
  name: "infron__video",
  description:
    `Generate a video from a TEXT prompt via Infron (default: google/veo3.1/text-to-video).

⚠️  COST WARNING: video generation costs ~$0.40 per second. An 8-second clip is ~$3.20.

CRITICAL: Before calling this tool, you MUST verbally confirm the cost with the user in conversation. Phrase it like: "This will generate an 8-second video for about $3.20. Confirm to proceed?" Wait for explicit yes/no. Do not call speculatively or as a test.

Set the \`confirmed\` parameter to true only after the user has explicitly confirmed in this conversation.

For image-to-video, use infron__video_from_image instead.
For dialogue/character-switching scenes, use infron__video_first_last_frame instead (avoids Veo's lip-sync bug on multi-character dialogue).

The tool submits the job, polls until completion (~60–300 seconds), and saves the MP4 to a local file.`,
  inputSchema: {
    type: "object",
    required: ["prompt", "confirmed"],
    properties: {
      prompt: {
        type: "string",
        description: "Description of the video scene, motion, and audio. Detailed cinematic prompts work best.",
      },
      confirmed: {
        type: "boolean",
        description: "Must be true. Set this only after the user has explicitly confirmed they want to spend the estimated cost in the current conversation.",
      },
      model: {
        type: "string",
        description: `Optional. Default: ${DEFAULTS.videoTextToVideo}.`,
        // For image-to-video use infron__video_from_image; for keyframe animation use infron__video_first_last_frame.
      },
      duration: {
        type: "string",
        description: "Duration string with 's' suffix ('4s' or '8s'). Default: '8s'. Must be a STRING — passing an integer is silently ignored server-side.",
      },
      aspect_ratio: {
        type: "string",
        description: "'16:9' (landscape) or '9:16' (portrait). Default: '16:9'.",
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
        description: "Local file path to save the MP4. Default: ./infron-video-<timestamp>.mp4 in the current directory.",
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

  const payload = {
    model: args.model || DEFAULTS.videoTextToVideo,
    prompt: args.prompt,
    duration,
    aspect_ratio: args.aspect_ratio || "16:9",
    resolution: args.resolution || "1080p",
    generate_audio: args.generate_audio !== false,
  };

  return submitPollDownload({
    apiKey: ctx.apiKey,
    payload,
    outputPath: args.output_path || defaultOutputPath("infron-video"),
    toolLabel: "infron__video",
  });
}
