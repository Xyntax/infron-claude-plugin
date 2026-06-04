// Shared submit/poll/download flow for all video variants:
//   infron__video                  (text-to-video)
//   infron__video_from_image       (image-to-video)
//   infron__video_first_last_frame (keyframe animation)
//
// Each tool builds its own JSON payload and inputSchema and delegates param
// normalization and the network/poll/download steps here. Parameter contracts
// differ per model family (Veo vs Seedance), so validation is family-aware —
// see VIDEO_PROFILES in ../models.js.

import path from "node:path";
import {
  generateVideoSubmit,
  pollVideoTask,
  downloadToFile,
  InfronError,
} from "../client.js";
import { estimateCost, videoProfile, durationSeconds } from "../models.js";

function pollIntervalMs() {
  return parseInt(process.env.INFRON_POLL_INTERVAL_MS || "5000", 10);
}
function pollTimeoutMs() {
  return parseInt(process.env.INFRON_POLL_TIMEOUT_MS || String(10 * 60 * 1000), 10);
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

/**
 * Block generation until the caller has explicitly confirmed the cost. The
 * refusal message carries a model-specific estimate so the user sees the real
 * price for the chosen model (Veo ≈ $0.40/sec, Seedance ≈ $0.15/sec), not a
 * hardcoded Veo number.
 */
export function confirmationGate(args, model) {
  if (args.confirmed === true) return null;

  const profile = videoProfile(model);
  let secs = typeof args.duration === "string" ? durationSeconds(args.duration) : null;
  if (!Number.isFinite(secs)) secs = durationSeconds(profile.defaultDuration) ?? 8;
  const est = estimateCost(model, { durationSeconds: secs });
  const priceLine = est != null
    ? `${model} ≈ $${est.toFixed(2)} for ${secs}s (~$${(est / secs).toFixed(3)}/sec)`
    : `${model} — pricing varies; check the dashboard`;

  return {
    isError: true,
    content: [{
      type: "text",
      text: JSON.stringify({
        status: "error",
        error_type: "confirmation_required",
        message: `Video generation costs real money. Estimate: ${priceLine}. The \`confirmed\` parameter must be true.`,
        hint: "Ask the user to confirm the cost in conversation, then call again with confirmed: true.",
      }, null, 2),
    }],
  };
}

/**
 * Validate + normalize duration / resolution / aspect_ratio / generate_audio
 * against the model family's accepted values. Returns either
 *   { params: { duration, aspect_ratio, resolution, generate_audio } }
 * or
 *   { error: <MCP error response> }
 * with a message listing the allowed values for the chosen model.
 */
export function validateVideoParams(model, args) {
  const profile = videoProfile(model);
  const fam = profile.family;

  const duration = args.duration == null ? profile.defaultDuration : args.duration;
  if (typeof duration !== "string") {
    return {
      error: badRequest(
        `duration must be a string (got ${JSON.stringify(duration)}). Allowed for ${fam} model '${model}': ${profile.durations.map((d) => `'${d}'`).join(", ")}.`
      ),
    };
  }
  if (!profile.durations.includes(duration)) {
    return {
      error: badRequest(
        `duration '${duration}' is not allowed for ${fam} model '${model}'. Allowed: ${profile.durations.map((d) => `'${d}'`).join(", ")}.`
      ),
    };
  }

  const resolution = args.resolution == null ? profile.defaultResolution : args.resolution;
  if (!profile.resolutions.includes(resolution)) {
    return {
      error: badRequest(
        `resolution '${resolution}' is not allowed for ${fam} model '${model}'. Allowed: ${profile.resolutions.join(", ")}.`
      ),
    };
  }

  const aspect_ratio = args.aspect_ratio == null ? profile.defaultAspectRatio : args.aspect_ratio;
  if (!profile.aspectRatios.includes(aspect_ratio)) {
    return {
      error: badRequest(
        `aspect_ratio '${aspect_ratio}' is not allowed for ${fam} model '${model}'. Allowed: ${profile.aspectRatios.join(", ")}.`
      ),
    };
  }

  const generate_audio =
    args.generate_audio == null ? profile.defaultGenerateAudio : args.generate_audio === true;

  return { params: { duration, aspect_ratio, resolution, generate_audio } };
}

/**
 * Submit a video job, poll until it completes, download the MP4.
 *
 * @param {object} opts
 * @param {string} opts.apiKey
 * @param {object} opts.payload  full payload (model, prompt, duration, etc.)
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

  // Veo returns the URL under data.urls.video; Seedance under data.outputs[].
  const videoUrl =
    last?.data?.urls?.video ??
    last?.data?.video_url ??
    last?.video_url ??
    (Array.isArray(last?.data?.outputs) ? last.data.outputs[0] : null);
  if (!videoUrl) {
    throw new Error(`Completed ${toolLabel} task has no video URL. Raw: ${JSON.stringify(last).slice(0, 500)}`);
  }

  await downloadToFile(videoUrl, outputPath);

  const durationSec = durationSeconds(payload.duration);
  const estimated = estimateCost(payload.model, { durationSeconds: durationSec });
  // The gateway reports the true charge in the completed task; prefer it over our estimate.
  const actual = last?.data?.cost?.total_cost ?? null;

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
        estimated_cost_usd: estimated,
        actual_cost_usd: actual,
      }, null, 2),
    }],
  };
}

export function defaultOutputPath(prefix = "infron-video") {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return path.join(process.cwd(), `${prefix}-${timestamp}.mp4`);
}
