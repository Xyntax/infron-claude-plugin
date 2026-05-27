// Shared submit/poll/download flow for all Veo variants:
//   infron__video                  (text-to-video)
//   infron__video_from_image       (image-to-video)
//   infron__video_first_last_frame (keyframe animation)
//
// Each tool builds its own JSON payload and inputSchema and delegates the
// network/poll/download steps here.

import path from "node:path";
import {
  generateVideoSubmit,
  pollVideoTask,
  downloadToFile,
  InfronError,
} from "../client.js";
import { estimateCost } from "../models.js";

function pollIntervalMs() {
  return parseInt(process.env.INFRON_POLL_INTERVAL_MS || "5000", 10);
}
function pollTimeoutMs() {
  return parseInt(process.env.INFRON_POLL_TIMEOUT_MS || String(10 * 60 * 1000), 10);
}

export function confirmationGate(args) {
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
  return null;
}

export function validateDuration(duration) {
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
  return null;
}

/**
 * Submit a video job, poll until it completes, download the MP4.
 *
 * @param {object} opts
 * @param {string} opts.apiKey
 * @param {object} opts.payload  full Veo payload (model, prompt, duration, etc.)
 * @param {string} opts.outputPath  local path to save MP4
 * @param {string} opts.toolLabel  label for cost ledger / errors
 * @returns {Promise<object>} success content for MCP response
 */
export async function submitPollDownload({ apiKey, payload, outputPath, toolLabel }) {
  const submit = await generateVideoSubmit(apiKey, payload);
  const taskId = submit?.data?.task_id ?? submit?.task_id;
  if (!taskId) {
    throw new Error(`Infron returned no task_id for ${toolLabel}. Raw: ${JSON.stringify(submit).slice(0, 500)}`);
  }

  const startedAt = Date.now();
  const interval = pollIntervalMs();
  const timeout = pollTimeoutMs();
  let last;
  while (Date.now() - startedAt < timeout) {
    await new Promise(r => setTimeout(r, interval));
    last = await pollVideoTask(apiKey, taskId);
    const status = last?.data?.status ?? last?.status;
    if (status === "completed" || status === "succeeded") break;
    if (status === "failed" || status === "error") {
      const reason = last?.data?.fail_reason || JSON.stringify(last).slice(0, 500);
      throw new InfronError("server", `${toolLabel} task ${taskId} failed: ${reason}`);
    }
  }

  const finalStatus = last?.data?.status ?? last?.status;
  if (finalStatus !== "completed" && finalStatus !== "succeeded") {
    throw new InfronError(
      "server",
      `${toolLabel} task ${taskId} timed out after ${timeout / 1000}s`
    );
  }

  const videoUrl =
    last?.data?.urls?.video ??
    last?.data?.video_url ??
    last?.video_url ??
    (Array.isArray(last?.data?.outputs) ? last.data.outputs[0] : null);
  if (!videoUrl) {
    throw new Error(`Completed ${toolLabel} task has no video URL. Raw: ${JSON.stringify(last).slice(0, 500)}`);
  }

  await downloadToFile(videoUrl, outputPath);

  const durationSec = parseInt(payload.duration, 10);
  const cost = estimateCost(payload.model, { durationSeconds: durationSec });

  return {
    content: [{
      type: "text",
      text: JSON.stringify({
        status: "success",
        saved: outputPath,
        url: videoUrl,
        task_id: taskId,
        model: payload.model,
        duration: payload.duration,
        aspect_ratio: payload.aspect_ratio,
        resolution: payload.resolution,
        estimated_cost_usd: cost,
      }, null, 2),
    }],
  };
}

export function defaultOutputPath(prefix = "infron-video") {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return path.join(process.cwd(), `${prefix}-${timestamp}.mp4`);
}
