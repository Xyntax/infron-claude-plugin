import path from "node:path";
import { generateVideoSubmit, pollVideoTask, downloadToFile, InfronError } from "../client.js";
import { DEFAULTS, estimateCost } from "../models.js";

// Defaults overridable via env so tests can run the polling loop in milliseconds.
// Read inside the handler (not at module load) so tests can change the values mid-run.
function pollIntervalMs() {
  return parseInt(process.env.INFRON_POLL_INTERVAL_MS || "5000", 10);
}
function pollTimeoutMs() {
  return parseInt(process.env.INFRON_POLL_TIMEOUT_MS || String(5 * 60 * 1000), 10);
}

export const definition = {
  name: "infron__video",
  description:
    `Generate a video via Infron (default: google/veo3.1/text-to-video).

⚠️  COST WARNING: video generation costs ~$0.40 per second. An 8-second clip is ~$3.20.

CRITICAL: Before calling this tool, you MUST verbally confirm the cost with the user in conversation. Phrase it like: "This will generate an 8-second video for about $3.20. Confirm to proceed?" Wait for explicit yes/no. Do not call speculatively or as a test.

Set the \`confirmed\` parameter to true only after the user has explicitly confirmed in this conversation. If \`confirmed\` is missing or false the tool returns an error without spending money.

The tool submits the job, polls until completion (~60–300 seconds), and saves the MP4 to a local file. Returns the path.`,
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
        description: `Optional. Default: ${DEFAULTS.videoTextToVideo}. For image-to-video use infron__video_from_image instead.`,
      },
      duration: {
        type: "string",
        description: "Duration string with 's' suffix. Examples: '4s', '8s'. Default: '8s'. NOTE: must be a STRING with 's' — passing an integer is silently ignored.",
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
  if (args.confirmed !== true) {
    return {
      isError: true,
      content: [{
        type: "text",
        text: JSON.stringify({
          status: "error",
          error_type: "confirmation_required",
          message: "Video generation costs real money (~$0.40/sec). The `confirmed` parameter must be true.",
          hint: "Ask the user to confirm the cost in conversation, then call again with confirmed: true.",
        }, null, 2),
      }],
    };
  }

  const model = args.model || DEFAULTS.videoTextToVideo;
  const duration = args.duration || "8s";
  const aspect_ratio = args.aspect_ratio || "16:9";
  const resolution = args.resolution || "1080p";
  const generate_audio = args.generate_audio !== false;

  // Re-validate duration shape — passing an int silently defaults to 8s server-side, which surprises users.
  if (typeof duration !== "string" || !/^\d+s$/.test(duration)) {
    return {
      isError: true,
      content: [{
        type: "text",
        text: JSON.stringify({
          status: "error",
          error_type: "bad_request",
          message: `duration must be a string like '4s' or '8s' (got: ${JSON.stringify(duration)}).`,
        }, null, 2),
      }],
    };
  }

  const submit = await generateVideoSubmit(ctx.apiKey, {
    model,
    prompt: args.prompt,
    duration,
    aspect_ratio,
    resolution,
    generate_audio,
  });

  const taskId = submit?.data?.task_id ?? submit?.task_id;
  if (!taskId) {
    throw new Error("Infron returned no task_id. Raw: " + JSON.stringify(submit).slice(0, 500));
  }

  const startedAt = Date.now();
  let last;
  while (Date.now() - startedAt < pollTimeoutMs()) {
    await new Promise(r => setTimeout(r, pollIntervalMs()));
    last = await pollVideoTask(ctx.apiKey, taskId);
    const status = last?.data?.status ?? last?.status;
    if (status === "completed" || status === "succeeded") break;
    if (status === "failed" || status === "error") {
      throw new InfronError("server", `Video generation failed: ${JSON.stringify(last).slice(0, 500)}`);
    }
  }

  const status = last?.data?.status ?? last?.status;
  if (status !== "completed" && status !== "succeeded") {
    throw new InfronError("server", `Video generation timed out after ${pollTimeoutMs() / 1000}s. task_id=${taskId}`);
  }

  const videoUrl = last?.data?.urls?.video ?? last?.data?.video_url ?? last?.video_url;
  if (!videoUrl) {
    throw new Error("Completed task has no video URL. Raw: " + JSON.stringify(last).slice(0, 500));
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outputPath = args.output_path || path.join(process.cwd(), `infron-video-${timestamp}.mp4`);
  await downloadToFile(videoUrl, outputPath);

  const durationSec = parseInt(duration, 10);
  const cost = estimateCost(model, { durationSeconds: durationSec });

  return {
    content: [{
      type: "text",
      text: JSON.stringify({
        status: "success",
        saved: outputPath,
        url: videoUrl,
        task_id: taskId,
        model,
        duration,
        aspect_ratio,
        resolution,
        estimated_cost_usd: cost,
      }, null, 2),
    }],
  };
}
