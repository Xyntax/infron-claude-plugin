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
  it("T8: chat completion returns text", async () => {
    assertWithinTestBudget(TEST_CHAT_MODEL);
    const result = await chatHandler(
      {
        model: TEST_CHAT_MODEL,
        messages: [{ role: "user", content: "Reply with one word: pong" }],
        max_tokens: 16,
      },
      { apiKey }
    );
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.status).toBe("success");
    expect(typeof parsed.message).toBe("string");
    expect(parsed.message.length).toBeGreaterThan(0);
    const tokens = parsed.usage?.total_tokens ?? 0;
    logCost("T8.chat", tokens * 0.000001); // rough; actual depends on model
  }, 60_000);

  // T7 — real image. $0.15.
  it("T7: image generation returns a downloadable file", async () => {
    assertWithinTestBudget(DEFAULTS.image, { n: 1 });
    const tmp = path.join(os.tmpdir(), `infron-int-${Date.now()}.png`);
    const result = await imageHandler(
      { prompt: "a simple red circle on white background", output_path: tmp, aspect: "1:1" },
      { apiKey }
    );
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.status).toBe("success");
    expect(parsed.saved).toEqual([tmp]);
    expect(fs.existsSync(tmp)).toBe(true);
    expect(fs.statSync(tmp).size).toBeGreaterThan(1000); // real PNG, not empty
    fs.unlinkSync(tmp);
    logCost("T7.image", 0.15);
  }, 120_000);
});
