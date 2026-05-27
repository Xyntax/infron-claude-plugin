import { PRICING, TEST_PRICE_CEILING_USD } from "../../lib/models.js";

/**
 * Throw if the requested model has a known price above the test ceiling.
 * Use this in integration tests to guarantee a typo can't accidentally
 * trigger a $3.20 Veo job inside what looks like a "cheap" image test.
 */
export function assertWithinTestBudget(model, { durationSeconds = 1, n = 1 } = {}) {
  const p = PRICING[model];
  if (!p) return; // unknown pricing — let the test proceed but log
  let est = null;
  if (p.type === "per_image") est = p.usd * n;
  else if (p.type === "per_second") est = p.usd * durationSeconds;
  if (est !== null && est > TEST_PRICE_CEILING_USD) {
    throw new Error(
      `Price guard: model ${model} would cost ~$${est.toFixed(2)}, ` +
      `above the test ceiling of $${TEST_PRICE_CEILING_USD.toFixed(2)}. ` +
      `If this is intentional (release test), move it to tests/release/ and gate with INFRON_RUN_RELEASE=1.`
    );
  }
}
