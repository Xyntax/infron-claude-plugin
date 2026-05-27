#!/usr/bin/env node
/**
 * Exhaustive model survey — calls every model exposed via `/v1/models` with
 * a minimal request appropriate to its category, records pass/fail and
 * response shape, and writes a Markdown coverage report.
 *
 * Skips video models (covered by the release.yml suite — each Veo call is
 * $0.40/sec minimum so they're tested separately) and skips non-plugin
 * surfaces (embeddings/rerank/TTS).
 *
 * Usage:
 *   INFRON_API_KEY=sk-... node scripts/survey-models.js
 *   INFRON_API_KEY=sk-... node scripts/survey-models.js --skip-image
 *   INFRON_API_KEY=sk-... node scripts/survey-models.js --only chat
 *   INFRON_API_KEY=sk-... node scripts/survey-models.js --budget 5.00
 *
 * The script tracks spend and aborts if the budget cap is exceeded.
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { getApiKey } from "../lib/config.js";
import { listModels, chatCompletion, generateImage, pollImageTask, InfronError } from "../lib/client.js";

const args = process.argv.slice(2);
function flag(name) { return args.includes(name); }
function flagVal(name, def = null) {
  const i = args.indexOf(name);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : def;
}

const SKIP_IMAGE = flag("--skip-image");
const SKIP_CHAT = flag("--skip-chat");
const ONLY = flagVal("--only"); // "chat" | "image"
const BUDGET = parseFloat(flagVal("--budget", "10.00"));
const CHAT_SAMPLE = parseInt(flagVal("--chat-sample", "0"), 10); // 0 = all

const apiKey = getApiKey();
if (!apiKey) {
  console.error("INFRON_API_KEY not set. Either export it or write ~/.infron/config first.");
  process.exit(2);
}

// Resolve repo root from the script location: scripts/survey-models.js lives
// at plugins/infron/scripts/, so the repo root is three levels up.
import { fileURLToPath } from "node:url";
const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), "../../..");
const REPORT_PATH = path.join(REPO_ROOT, "docs/model-coverage.md");
let totalSpentUsd = 0;
const results = { image: [], chat: [], skipped: [] };

function classify(modelId) {
  const lc = modelId.toLowerCase();
  if (/text-to-image|image-to-image/.test(lc)) return "image";
  if (/text-to-video|image-to-video|first-last-frame/.test(lc)) return "video";
  if (/embedding|embed/.test(lc)) return "embedding";
  if (/tts|text-to-speech|speech-to-text|stt|audio/.test(lc)) return "audio";
  if (/rerank/.test(lc)) return "rerank";
  if (/moderation/.test(lc)) return "moderation";
  return "chat";
}

function checkBudget(extraUsd) {
  if (totalSpentUsd + extraUsd > BUDGET) {
    console.error(`\n⛔ Budget cap reached: spent $${totalSpentUsd.toFixed(2)} + estimated $${extraUsd.toFixed(2)} would exceed cap $${BUDGET.toFixed(2)}`);
    console.error("Pass --budget X to raise. Stopping survey.");
    writeReport();
    process.exit(0);
  }
}

async function surveyImage(modelId) {
  const isPixelModel = modelId.includes("gpt-image");
  const size = isPixelModel ? "1024x1024" : "1:1";
  const isImageToImage = modelId.includes("image-to-image");

  // image-to-image needs a source image — skip for survey since we don't have a stable test fixture
  if (isImageToImage) {
    return { status: "skipped", reason: "image-to-image needs source URL; not part of automated survey" };
  }

  const maxCost = 0.20; // refuse to fire if estimated cost would exceed this
  checkBudget(maxCost);

  const t0 = Date.now();
  try {
    const result = await generateImage(apiKey, {
      model: modelId,
      prompt: "a tiny red dot on white",
      size,
      n: 1,
    });

    // Sync shape
    if (Array.isArray(result?.data) && result.data[0]?.url) {
      const cost = result?.cost?.total_cost ?? 0.15;
      totalSpentUsd += cost;
      return { status: "ok", shape: "sync", url: result.data[0].url, cost, latency_ms: Date.now() - t0 };
    }

    // Async shape — poll until done
    if (result?.data?.task_id) {
      const taskId = result.data.task_id;
      for (let i = 0; i < 60; i++) {
        await new Promise(r => setTimeout(r, 3000));
        const poll = await pollImageTask(apiKey, taskId);
        const status = poll?.data?.status;
        if (status === "completed" || status === "succeeded") {
          const cost = poll?.data?.cost?.total_cost ?? 0.01;
          totalSpentUsd += cost;
          const url = poll?.data?.outputs?.[0];
          return { status: "ok", shape: "async", task_id: taskId, url, cost, latency_ms: Date.now() - t0 };
        }
        if (status === "failed" || status === "error") {
          return { status: "fail", shape: "async", reason: poll?.data?.fail_reason || "failed", latency_ms: Date.now() - t0 };
        }
      }
      return { status: "fail", shape: "async", reason: "polling timeout (180s)" };
    }

    return { status: "fail", shape: "unknown", reason: "unrecognized response", raw: JSON.stringify(result).slice(0, 300) };
  } catch (err) {
    if (err instanceof InfronError) {
      return { status: "fail", reason: `${err.type}: ${err.message}`, status_code: err.status };
    }
    return { status: "fail", reason: err.message };
  }
}

async function surveyChat(modelId) {
  const maxCost = 0.01;
  checkBudget(maxCost);

  const t0 = Date.now();
  try {
    const result = await chatCompletion(apiKey, {
      model: modelId,
      messages: [{ role: "user", content: "Say hi." }],
      max_tokens: 8,
    });
    const message = result?.choices?.[0]?.message?.content ?? "";
    const tokens = result?.usage?.total_tokens ?? 0;
    const cost = result?.cost?.total_cost ?? 0.0001;
    totalSpentUsd += cost;
    return {
      status: "ok",
      message_len: message.length,
      tokens,
      cost,
      latency_ms: Date.now() - t0,
      sample: message.slice(0, 60),
    };
  } catch (err) {
    if (err instanceof InfronError) {
      return { status: "fail", reason: `${err.type}: ${err.message.slice(0, 100)}`, status_code: err.status };
    }
    return { status: "fail", reason: err.message.slice(0, 100) };
  }
}

function writeReport() {
  const lines = [];
  lines.push("# Model coverage report");
  lines.push(``);
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Spent on this run: $${totalSpentUsd.toFixed(4)}`);
  lines.push(`Budget cap: $${BUDGET.toFixed(2)}`);
  lines.push(``);
  lines.push(`## Summary`);
  const imgOk = results.image.filter(r => r.result.status === "ok").length;
  const imgFail = results.image.filter(r => r.result.status === "fail").length;
  const imgSkip = results.image.filter(r => r.result.status === "skipped").length;
  const chatOk = results.chat.filter(r => r.result.status === "ok").length;
  const chatFail = results.chat.filter(r => r.result.status === "fail").length;
  lines.push(``);
  lines.push(`- Image models: ${imgOk} ok / ${imgFail} fail / ${imgSkip} skipped (of ${results.image.length} attempted)`);
  lines.push(`- Chat models: ${chatOk} ok / ${chatFail} fail (of ${results.chat.length} attempted)`);
  lines.push(`- Categories not surveyed: ${results.skipped.length > 0 ? "embedding, rerank, audio, video" : "none"}`);

  lines.push(``);
  lines.push(`## Image models (text-to-image)`);
  lines.push(``);
  lines.push(`| Model | Status | Shape | Cost | Latency | Notes |`);
  lines.push(`|---|---|---|---|---|---|`);
  for (const { model, result } of results.image) {
    const cost = result.cost != null ? `$${result.cost.toFixed(4)}` : "—";
    const latency = result.latency_ms != null ? `${(result.latency_ms / 1000).toFixed(1)}s` : "—";
    const notes = result.reason || (result.shape === "async" ? `task_id` : "");
    lines.push(`| \`${model}\` | ${result.status} | ${result.shape || "—"} | ${cost} | ${latency} | ${notes} |`);
  }

  lines.push(``);
  lines.push(`## Chat models`);
  lines.push(``);
  lines.push(`| Model | Status | Latency | Tokens | Cost | Sample |`);
  lines.push(`|---|---|---|---|---|---|`);
  // Sort: failures first so they're surfaced
  const sortedChat = [...results.chat].sort((a, b) => {
    if (a.result.status !== b.result.status) return a.result.status === "fail" ? -1 : 1;
    return a.model.localeCompare(b.model);
  });
  for (const { model, result } of sortedChat) {
    const cost = result.cost != null ? `$${result.cost.toFixed(4)}` : "—";
    const latency = result.latency_ms != null ? `${(result.latency_ms / 1000).toFixed(1)}s` : "—";
    const tokens = result.tokens ?? "—";
    const sample = (result.sample || result.reason || "").replace(/\|/g, "\\|").slice(0, 60);
    lines.push(`| \`${model}\` | ${result.status} | ${latency} | ${tokens} | ${cost} | ${sample} |`);
  }

  lines.push(``);
  lines.push(`## Categories not surveyed`);
  lines.push(``);
  lines.push(`These model classes are exposed by the Infron API but NOT by the`);
  lines.push(`plugin's tools. Calling them through the plugin would fail.`);
  lines.push(``);
  for (const cat of Object.keys(results.notExposed || {})) {
    lines.push(`### ${cat} (${results.notExposed[cat].length} models)`);
    for (const id of results.notExposed[cat]) lines.push(`- \`${id}\``);
    lines.push(``);
  }

  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, lines.join("\n"));
  console.log(`\n📄 Report written to ${REPORT_PATH}`);
}

(async () => {
  console.log("Listing all models...");
  const all = await listModels(apiKey);
  console.log(`Found ${all.length} models.`);

  const byCategory = { image: [], video: [], chat: [], embedding: [], audio: [], rerank: [], moderation: [] };
  for (const m of all) {
    const id = m.id || m.name;
    const cat = classify(id);
    byCategory[cat]?.push(id);
  }
  console.log("Categorized:", Object.fromEntries(Object.entries(byCategory).map(([k, v]) => [k, v.length])));

  results.notExposed = {
    video: byCategory.video,
    embedding: byCategory.embedding,
    audio: byCategory.audio,
    rerank: byCategory.rerank,
    moderation: byCategory.moderation,
  };

  // Image survey
  if (!SKIP_IMAGE && (!ONLY || ONLY === "image")) {
    console.log(`\n=== Image survey (${byCategory.image.length} models) ===`);
    for (const model of byCategory.image) {
      process.stdout.write(`  ${model} ... `);
      const r = await surveyImage(model);
      results.image.push({ model, result: r });
      console.log(`${r.status}${r.shape ? ` (${r.shape})` : ""}${r.cost ? ` $${r.cost.toFixed(4)}` : ""}`);
      if (r.reason) console.log(`    ${r.reason}`);
    }
  }

  // Chat survey
  if (!SKIP_CHAT && (!ONLY || ONLY === "chat")) {
    const sample = CHAT_SAMPLE > 0 ? byCategory.chat.slice(0, CHAT_SAMPLE) : byCategory.chat;
    console.log(`\n=== Chat survey (${sample.length}${CHAT_SAMPLE > 0 ? `/${byCategory.chat.length} sampled` : ""} models) ===`);
    for (let i = 0; i < sample.length; i++) {
      const model = sample[i];
      const prefix = `  [${i + 1}/${sample.length}] ${model}`;
      process.stdout.write(`${prefix} ... `);
      const r = await surveyChat(model);
      results.chat.push({ model, result: r });
      const summary = r.status === "ok"
        ? `ok ${r.tokens || 0}tok ${(r.latency_ms / 1000).toFixed(1)}s $${(r.cost || 0).toFixed(4)}`
        : `fail (${r.reason?.slice(0, 60) || "?"})`;
      console.log(summary);
    }
  }

  console.log(`\n✅ Survey complete. Total spent: $${totalSpentUsd.toFixed(4)}`);
  writeReport();
})().catch(err => {
  console.error("Survey failed:", err);
  writeReport();
  process.exit(1);
});
