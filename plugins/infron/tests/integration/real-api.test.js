/**
 * Integration tests — hit the real Infron API.
 *
 * Gated by INFRON_RUN_INTEGRATION=1 so unit-test runs and dev sessions don't burn budget.
 *
 * Cost per run (approximate):
 *  - T7 image   $0.15
 *  - T8 chat    <$0.01
 *  - T9 models  $0
 *  - T6 registry $0 (piggybacks on T9)
 *
 * Requires a real API key in INFRON_API_KEY (or in ~/.infron/config — but env is preferred for CI).
 *
 * Cost-ceiling guard: the helper `assertWithinTestBudget` aborts before any network call
 * if the requested model would cost more than $0.20, so a typo can't turn an "image" test
 * into a $3.20 Veo job.
 */
import { describe, it, expect, beforeAll } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { handler as imageHandler } from "../../lib/tools/image.js";
import { handler as imageEditHandler } from "../../lib/tools/image_edit.js";
import { handler as chatHandler } from "../../lib/tools/chat.js";
import { handler as listModelsHandler } from "../../lib/tools/list_models.js";
import { DEFAULTS, PRICING } from "../../lib/models.js";
import { getApiKey } from "../../lib/config.js";
import { assertWithinTestBudget } from "../helpers/price-guard.js";

const SHOULD_RUN = process.env.INFRON_RUN_INTEGRATION === "1";
const TEST_CHAT_MODEL = process.env.INFRON_TEST_CHAT_MODEL || "google/gemini-2.5-flash";

const ledgerPath = path.join(process.cwd(), "tests/.cost-ledger");
function logCost(label, usd) {
  try {
    fs.appendFileSync(ledgerPath, `${new Date().toISOString()}\t${label}\t$${usd.toFixed(4)}\n`);
  } catch { /* best-effort */ }
}

(SHOULD_RUN ? describe : describe.skip)("integration: real Infron API", () => {
  let apiKey;
  beforeAll(() => {
    apiKey = getApiKey();
    if (!apiKey) {
      throw new Error("INFRON_API_KEY is not set. Integration tests need a real key.");
    }
  });

  // T9 — list models. Free.
  it("T9: lists at least 100 models from /v1/models", async () => {
    const result = await listModelsHandler({}, { apiKey });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.status).toBe("success");
    expect(parsed.total).toBeGreaterThan(100);
    logCost("T9.list_models", 0);
  }, 30_000);

  // T6 — registry sanity. Piggybacks on T9.
  it("T6: default image and video models exist on the live API", async () => {
    const result = await listModelsHandler({}, { apiKey });
    const parsed = JSON.parse(result.content[0].text);
    const ids = new Set(parsed.models.map(m => m.id));
    expect(ids.has(DEFAULTS.image), `Default image model ${DEFAULTS.image} not found in /v1/models`).toBe(true);
    expect(ids.has(DEFAULTS.videoTextToVideo), `Default video model ${DEFAULTS.videoTextToVideo} not found in /v1/models`).toBe(true);
    // also: every model we have pricing for should exist on the API
    for (const modelId of Object.keys(PRICING)) {
      if (!ids.has(modelId)) {
        console.warn(`PRICING references ${modelId} but it's missing from live /v1/models`);
      }
    }
  }, 30_000);

  // T8 — real chat. <$0.01 typical.
  // max_tokens=256: thinking-capable models (e.g. Gemini 2.5 Flash) burn
  // tokens on reasoning before emitting visible content, so a tight budget
  // can leave the user-facing message empty.
  it("T8: chat completion returns text", async () => {
    assertWithinTestBudget(TEST_CHAT_MODEL);
    const result = await chatHandler(
      {
        model: TEST_CHAT_MODEL,
        messages: [{ role: "user", content: "Reply with one word: pong" }],
        max_tokens: 256,
      },
      { apiKey }
    );
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.status).toBe("success");
    expect(typeof parsed.message).toBe("string");
    const tokens = parsed.usage?.total_tokens ?? 0;
    // Assert the call succeeded end-to-end: either visible content OR
    // accounted tokens. Some thinking models legitimately emit 0 visible
    // characters when reasoning eats the budget.
    expect(parsed.message.length > 0 || tokens > 0).toBe(true);
    logCost("T8.chat", tokens * 0.000001); // rough; actual depends on model
  }, 60_000);

  // T7 — real image (sync model). $0.15.
  it("T7: image generation returns a downloadable file (sync model)", async () => {
    assertWithinTestBudget(DEFAULTS.image, { n: 1 });
    const tmp = path.join(os.tmpdir(), `infron-int-${Date.now()}.png`);
    const result = await imageHandler(
      { prompt: "a simple red circle on white background", output_path: tmp, aspect: "1:1" },
      { apiKey }
    );
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.status).toBe("success");
    expect(parsed.saved).toEqual([tmp]);
    expect(parsed.async).toBe(false);
    expect(fs.existsSync(tmp)).toBe(true);
    expect(fs.statSync(tmp).size).toBeGreaterThan(1000);
    fs.unlinkSync(tmp);
    logCost("T7.image", 0.15);
  }, 120_000);

  // T7c — image-to-image regression. Uses the CHEAPEST text-to-image
  // (nano-banana) to generate a source URL, then feeds it to the CHEAPEST
  // image-to-image variant (nano-banana-image-to-image). Total ~$0.08.
  // Locks down: the image_urls field name (would have caught the day-of bug)
  // plus image_edit returning the standard shape.
  it("T7c: image_edit (image-to-image) accepts source_image_urls and saves output", async () => {
    // Step 1: cheap source
    const srcResult = await imageHandler(
      { prompt: "a tiny red square", aspect: "1:1", model: "google/nano-banana-text-to-image" },
      { apiKey }
    );
    const srcParsed = JSON.parse(srcResult.content[0].text);
    const srcUrl = srcParsed.urls?.[0];
    expect(srcUrl).toBeTruthy();
    logCost("T7c.source", 0.039);

    // Step 2: edit with cheapest i2i variant
    const tmp = path.join(os.tmpdir(), `infron-int-edit-${Date.now()}.png`);
    const editResult = await imageEditHandler(
      {
        prompt: "transform into a tiny green square",
        source_image_urls: [srcUrl],
        model: "google/nano-banana-image-to-image",
        output_path: tmp,
      },
      { apiKey }
    );
    const editParsed = JSON.parse(editResult.content[0].text);
    expect(editParsed.status).toBe("success");
    expect(editParsed.async).toBe(false); // nano-banana variants are sync
    expect(editParsed.source_image_urls).toEqual([srcUrl]);
    expect(fs.existsSync(tmp)).toBe(true);
    expect(fs.statSync(tmp).size).toBeGreaterThan(1000);
    fs.unlinkSync(tmp);
    logCost("T7c.image-edit", 0.039);
  }, 120_000);

  // T7b — regression for the async image bug (2026-05-26). gpt-image-2 returns
  // a task_id + polling URL on submission; the tool must poll until completed
  // and read URLs from data.outputs. Also exercises the auto aspect→pixel
  // translation since gpt-image-2 rejects "1:1".
  // Cost: ~$0.006 per image (token-billed).
  it("T7b: async image (gpt-image-2) polls and downloads", async () => {
    const tmp = path.join(os.tmpdir(), `infron-int-async-${Date.now()}.png`);
    const result = await imageHandler(
      {
        prompt: "a tiny red dot on white",
        model: "openai/gpt-image-2/text-to-image",
        aspect: "1:1",  // intentionally aspect, NOT pixels — must be auto-translated
        output_path: tmp,
      },
      { apiKey }
    );
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.status).toBe("success");
    expect(parsed.async).toBe(true);
    expect(parsed.task_id).toBeTruthy();
    expect(parsed.size_used).toBe("1024x1024"); // proves translation happened
    expect(parsed.saved).toEqual([tmp]);
    expect(fs.existsSync(tmp)).toBe(true);
    expect(fs.statSync(tmp).size).toBeGreaterThan(1000);
    fs.unlinkSync(tmp);
    logCost("T7b.gpt-image-2", 0.006);
  }, 5 * 60_000);
});
