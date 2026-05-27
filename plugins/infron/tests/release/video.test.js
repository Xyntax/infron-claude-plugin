/**
 * Release test — T12: real Veo 3.1 video generation.
 *
 * Cost: $3.20 per 8s clip.
 * Gated by INFRON_RUN_RELEASE=1 so this NEVER fires on a push or PR.
 * Runs only when CI is triggered by a git tag (see .github/workflows/release.yml).
 */
import { describe, it, expect, beforeAll } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { handler as videoHandler } from "../../lib/tools/video.js";
import { DEFAULTS } from "../../lib/models.js";
import { getApiKey } from "../../lib/config.js";

const SHOULD_RUN = process.env.INFRON_RUN_RELEASE === "1";

const ledgerPath = path.join(process.cwd(), "tests/.cost-ledger");
function logCost(label, usd) {
  try {
    fs.appendFileSync(ledgerPath, `${new Date().toISOString()}\t${label}\t$${usd.toFixed(2)}\n`);
  } catch { /* best-effort */ }
}

(SHOULD_RUN ? describe : describe.skip)("release: real Veo video", () => {
  let apiKey;
  beforeAll(() => {
    apiKey = getApiKey();
    if (!apiKey) throw new Error("INFRON_API_KEY required for release test");
  });

  it("T12: generates an 8s 720p video and downloads it (~$3.20)", async () => {
    const tmp = path.join(os.tmpdir(), `infron-release-${Date.now()}.mp4`);
    const result = await videoHandler(
      {
        prompt: "A red apple sitting on a wooden table, gentle camera dolly forward, natural light.",
        confirmed: true,
        model: DEFAULTS.videoTextToVideo,
        duration: "8s",
        resolution: "720p",   // cheapest acceptable resolution
        aspect_ratio: "16:9",
        generate_audio: false, // skip audio to keep it minimal
        output_path: tmp,
      },
      { apiKey }
    );
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.status).toBe("success");
    expect(fs.existsSync(tmp)).toBe(true);
    expect(fs.statSync(tmp).size).toBeGreaterThan(50_000); // a real MP4 is at least a few hundred KB
    fs.unlinkSync(tmp);
    logCost("T12.video", 3.20);
  }, 10 * 60_000); // 10 minutes
});
