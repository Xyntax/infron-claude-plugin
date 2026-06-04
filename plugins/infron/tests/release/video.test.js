/**
 * Release tests — video variants against the real API.
 *
 * T12–T14 verify Veo 3.1, with the model PINNED explicitly: this suite is the
 * Veo safety net and must keep testing Veo regardless of which model is the
 * house default. T15 verifies the current default video model (Seedance 2.0).
 *
 * Gated by INFRON_RUN_RELEASE=1 so this NEVER fires on push/PR.
 *
 * Cost when run end-to-end:
 *   T12  text-to-video      (Veo)       4s @ $0.40/s = $1.60
 *   T13  image-to-video     (Veo)       4s = $1.60 + $0.15 keyframe = $1.75
 *   T14  first-last-frame   (Veo)       4s = $1.60 + 2 × $0.15 keyframes = $1.90
 *   T15  text-to-video      (Seedance)  4s @ ~$0.153/s @720p ≈ $0.61
 *   ─────────────────────────────────────────────────────────────────────
 *   Total: ~$5.86
 *
 * The keyframe images are generated via nano-banana-pro and re-used so
 * we're testing the same pipeline a real user would hit.
 */
import { describe, it, expect, beforeAll } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { handler as imageHandler } from "../../lib/tools/image.js";
import { handler as videoHandler } from "../../lib/tools/video.js";
import { handler as videoFromImageHandler } from "../../lib/tools/video_from_image.js";
import { handler as videoFlfHandler } from "../../lib/tools/video_first_last_frame.js";
import { DEFAULTS } from "../../lib/models.js";
import { getApiKey } from "../../lib/config.js";

const SHOULD_RUN = process.env.INFRON_RUN_RELEASE === "1";

const ledgerPath = path.join(process.cwd(), "tests/.cost-ledger");
function logCost(label, usd) {
  try {
    fs.appendFileSync(ledgerPath, `${new Date().toISOString()}\t${label}\t$${usd.toFixed(2)}\n`);
  } catch { /* best-effort */ }
}

// Shared keyframe URLs for T13/T14, generated once in beforeAll
const state = { apiKey: null, startUrl: null, endUrl: null };

const VIDEO_TIMEOUT_MS = 10 * 60_000;
const KEYFRAME_TIMEOUT_MS = 2 * 60_000;

(SHOULD_RUN ? describe : describe.skip)("release: video variants (Veo pinned + Seedance default)", () => {
  beforeAll(async () => {
    state.apiKey = getApiKey();
    if (!state.apiKey) throw new Error("INFRON_API_KEY required for release tests");
  });

  // T12 — text-to-video. $1.60 @ 4s.
  it("T12: text-to-video (Veo 3.1) generates a 4s 720p clip (~$1.60)", async () => {
    const tmp = path.join(os.tmpdir(), `infron-release-t2v-${Date.now()}.mp4`);
    const result = await videoHandler(
      {
        prompt: "A red apple resting on a wooden table, soft natural light, gentle camera dolly forward.",
        confirmed: true,
        model: "google/veo3.1/text-to-video", // pinned: Veo safety net, independent of default
        duration: "4s",
        resolution: "720p",
        aspect_ratio: "16:9",
        generate_audio: false,
        output_path: tmp,
      },
      { apiKey: state.apiKey }
    );
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.status).toBe("success");
    expect(parsed.duration).toBe("4s");
    expect(fs.existsSync(tmp)).toBe(true);
    expect(fs.statSync(tmp).size).toBeGreaterThan(50_000);
    fs.unlinkSync(tmp);
    logCost("T12.text-to-video-4s", 1.60);
  }, VIDEO_TIMEOUT_MS);

  // T13 — image-to-video. Generates a keyframe via nano-banana, then animates it.
  // ~$1.75 ($0.15 image + $1.60 video).
  it("T13: image-to-video (Veo 3.1) animates a generated keyframe (~$1.75)", async () => {
    // Step 1: generate the starting keyframe (nano-banana-pro)
    const keyframePath = path.join(os.tmpdir(), `infron-release-key-start-${Date.now()}.png`);
    const imgResult = await imageHandler(
      {
        prompt: "A solitary cherry blossom on a black background, centered, studio lighting.",
        aspect: "16:9",
        output_path: keyframePath,
      },
      { apiKey: state.apiKey }
    );
    const imgParsed = JSON.parse(imgResult.content[0].text);
    expect(imgParsed.status).toBe("success");
    const startUrl = imgParsed.urls?.[0];
    expect(startUrl).toBeTruthy();
    state.startUrl = startUrl;
    logCost("T13.keyframe-start", 0.15);

    // Step 2: animate it
    const tmp = path.join(os.tmpdir(), `infron-release-i2v-${Date.now()}.mp4`);
    const result = await videoFromImageHandler(
      {
        prompt: "The cherry blossom slowly rotates clockwise; petals catch glints of light.",
        confirmed: true,
        start_image_url: startUrl,
        model: "google/veo3.1/image-to-video", // pinned: Veo safety net
        duration: "4s",
        resolution: "720p",
        aspect_ratio: "16:9",
        generate_audio: false,
        output_path: tmp,
      },
      { apiKey: state.apiKey }
    );
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.status).toBe("success");
    expect(parsed.task_id).toBeTruthy();
    expect(fs.existsSync(tmp)).toBe(true);
    expect(fs.statSync(tmp).size).toBeGreaterThan(50_000);
    fs.unlinkSync(tmp);
    if (fs.existsSync(keyframePath)) fs.unlinkSync(keyframePath);
    logCost("T13.image-to-video-4s", 1.60);
  }, VIDEO_TIMEOUT_MS + KEYFRAME_TIMEOUT_MS);

  // T14 — first-last-frame. Generates two keyframes, then interpolates.
  // ~$1.90 (2 × $0.15 + $1.60).
  // Reuses startUrl from T13 if available; generates fresh end frame.
  it("T14: first-last-frame (Veo 3.1) interpolates between two keyframes (~$1.90)", async () => {
    // Reuse start frame from T13 if available, otherwise generate
    let startUrl = state.startUrl;
    if (!startUrl) {
      const startPath = path.join(os.tmpdir(), `infron-release-key-start-flf-${Date.now()}.png`);
      const startResult = await imageHandler(
        {
          prompt: "A solitary cherry blossom on a black background, centered, studio lighting.",
          aspect: "16:9",
          output_path: startPath,
        },
        { apiKey: state.apiKey }
      );
      startUrl = JSON.parse(startResult.content[0].text).urls[0];
      logCost("T14.keyframe-start", 0.15);
      if (fs.existsSync(startPath)) fs.unlinkSync(startPath);
    }
    expect(startUrl).toBeTruthy();

    // Generate end frame
    const endPath = path.join(os.tmpdir(), `infron-release-key-end-${Date.now()}.png`);
    const endResult = await imageHandler(
      {
        prompt: "A cluster of cherry blossoms in full bloom, same black background, studio lighting, same composition.",
        aspect: "16:9",
        output_path: endPath,
      },
      { apiKey: state.apiKey }
    );
    const endUrl = JSON.parse(endResult.content[0].text).urls[0];
    expect(endUrl).toBeTruthy();
    logCost("T14.keyframe-end", 0.15);

    // Interpolate
    const tmp = path.join(os.tmpdir(), `infron-release-flf-${Date.now()}.mp4`);
    const result = await videoFlfHandler(
      {
        prompt: "The single cherry blossom blooms into a full cluster, petals unfurling smoothly.",
        confirmed: true,
        start_image_url: startUrl,
        end_image_url: endUrl,
        model: "google/veo3.1/first-last-frame-to-video", // pinned: Veo safety net
        duration: "4s",
        resolution: "720p",
        aspect_ratio: "16:9",
        generate_audio: false,
        output_path: tmp,
      },
      { apiKey: state.apiKey }
    );
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.status).toBe("success");
    expect(parsed.task_id).toBeTruthy();
    expect(fs.existsSync(tmp)).toBe(true);
    expect(fs.statSync(tmp).size).toBeGreaterThan(50_000);
    fs.unlinkSync(tmp);
    if (fs.existsSync(endPath)) fs.unlinkSync(endPath);
    logCost("T14.first-last-frame-4s", 1.60);
  }, VIDEO_TIMEOUT_MS + 2 * KEYFRAME_TIMEOUT_MS);

  // T15 — Seedance 2.0 text-to-video: the current DEFAULT video model.
  // Uses DEFAULTS.videoTextToVideo so a future default change is caught here.
  // ~$0.61 @ 4s/720p. Seedance params: bare-int duration, ≤720p.
  it("T15: text-to-video (Seedance 2.0, the default) generates a 4s 720p clip (~$0.61)", async () => {
    expect(DEFAULTS.videoTextToVideo).toMatch(/seedance/); // guard: this test assumes Seedance is default
    const tmp = path.join(os.tmpdir(), `infron-release-sd-t2v-${Date.now()}.mp4`);
    const result = await videoHandler(
      {
        prompt: "A red apple resting on a wooden table, soft natural light, gentle camera dolly forward.",
        confirmed: true,
        model: DEFAULTS.videoTextToVideo,
        duration: "4",
        resolution: "720p",
        aspect_ratio: "16:9",
        output_path: tmp,
      },
      { apiKey: state.apiKey }
    );
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.status).toBe("success");
    expect(parsed.model).toMatch(/seedance/);
    expect(parsed.duration).toBe("4");
    expect(parsed.resolution).toBe("720p");
    expect(typeof parsed.actual_cost_usd).toBe("number"); // gateway reports the real charge
    expect(fs.existsSync(tmp)).toBe(true);
    expect(fs.statSync(tmp).size).toBeGreaterThan(50_000);
    fs.unlinkSync(tmp);
    logCost("T15.seedance-text-to-video-4s", parsed.actual_cost_usd ?? 0.61);
  }, VIDEO_TIMEOUT_MS);
});
