import { DEFAULTS } from "../models.js";
import {
  confirmationGate,
  validateVideoParams,
  submitPollDownload,
  defaultOutputPath,
} from "./_video_common.js";

export const definition = {
  name: "infron__video",
  description:
    `Generate a video from a TEXT prompt via Infron.

Default model: bytedance/seedance-2.0/text-to-video (~$0.15/sec, up to 720p, 4–15s, no native audio).
Higher-quality alternative: google/veo3.1/text-to-video (~$0.40/sec, up to 1080p, native audio) — select it via the \`model\` parameter. Append the Seedance \`/fast/\` tier for quicker turnaround.

⚠️  COST WARNING: video costs real money and varies by model (Seedance ~$0.61 for 4s @ 720p; Veo ~$3.20 for 8s). The true charge is returned as actual_cost_usd.

CRITICAL: Before calling this tool, you MUST verbally confirm the cost with the user in conversation. Phrase it like: "This will generate an 8-second video for about $3.20. Confirm to proceed?" Wait for explicit yes/no. Do not call speculatively or as a test.

Set the \`confirmed\` parameter to true only after the user has explicitly confirmed in this conversation.

Note: duration / resolution / aspect_ratio accept different values per model family — an invalid value returns the allowed set for that model.

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
        description: `Optional. Default: ${DEFAULTS.videoTextToVideo} (Seedance, ~$0.15/sec, ≤720p). Faster: bytedance/seedance-2.0/fast/text-to-video. Higher quality (≤1080p + native audio): google/veo3.1/text-to-video. Use infron__list_models to discover more.`,
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
        description: "Local file path to save the MP4. Default: ./infron-video-<timestamp>.mp4 in the current directory.",
      },
    },
  },
};

export async function handler(args, ctx) {
  const model = args.model || DEFAULTS.videoTextToVideo;

  const gate = confirmationGate(args, model);
  if (gate) return gate;

  const v = validateVideoParams(model, args);
  if (v.error) return v.error;

  const payload = {
    model,
    prompt: args.prompt,
    ...v.params,
  };

  return submitPollDownload({
    apiKey: ctx.apiKey,
    payload,
    outputPath: args.output_path || defaultOutputPath("infron-video"),
    toolLabel: "infron__video",
  });
}
