import path from "node:path";
import { generateImage, pollImageTask, downloadToFile, InfronError } from "../client.js";
import { DEFAULTS, estimateCost } from "../models.js";

// Mirrors image.js: aspect-to-pixel translation for models that demand pixel sizes.
const ASPECT_TO_PIXELS = {
  "1:1": "1024x1024",
  "16:9": "1792x1024",
  "9:16": "1024x1792",
  "3:2": "1536x1024",
  "2:3": "1024x1536",
  "4:3": "1408x1024",
  "3:4": "1024x1408",
};

function requiresPixelSize(model) {
  return model.includes("gpt-image");
}

function translateSize(model, size) {
  if (!requiresPixelSize(model)) return size;
  if (/^\d+x\d+$/.test(size)) return size;
  return ASPECT_TO_PIXELS[size] || "1024x1024";
}

function pollIntervalMs() {
  return parseInt(process.env.INFRON_IMAGE_POLL_INTERVAL_MS || "3000", 10);
}
function pollTimeoutMs() {
  return parseInt(process.env.INFRON_IMAGE_POLL_TIMEOUT_MS || String(5 * 60 * 1000), 10);
}

async function waitForImageTask(apiKey, taskId) {
  const startedAt = Date.now();
  const timeout = pollTimeoutMs();
  let last;
  while (Date.now() - startedAt < timeout) {
    await new Promise(r => setTimeout(r, pollIntervalMs()));
    last = await pollImageTask(apiKey, taskId);
    const status = last?.data?.status ?? last?.status;
    if (status === "completed" || status === "succeeded") return last;
    if (status === "failed" || status === "error") {
      const reason = last?.data?.fail_reason || JSON.stringify(last).slice(0, 500);
      throw new InfronError("server", `Image-edit task ${taskId} failed: ${reason}`);
    }
  }
  throw new InfronError("server", `Image-edit task ${taskId} timed out after ${timeout / 1000}s`);
}

export const definition = {
  name: "infron__image_edit",
  description:
    `Edit / transform an existing image via Infron's image-to-image models. Pass the publicly-accessible URL(s) of source image(s) plus a prompt describing the desired transformation.

USE THIS TOOL when the user wants to MODIFY an existing image — recolor, restyle, add elements, remove elements, change pose, etc. For generating a brand-new image from text, use infron__image instead.

Default model: google/nano-banana-pro-image-to-image ($0.15/image). Alternatives:
  - google/nano-banana-image-to-image    ($0.04, cheapest)
  - google/nano-banana-2-image-to-image  ($0.08)
  - openai/gpt-image-2/image-to-image    (token-billed, async)

Handles both sync (nano-banana family) and async (gpt-image-2) response shapes.
Aspect ratios auto-translate to pixel sizes for gpt-image-2.`,
  inputSchema: {
    type: "object",
    required: ["prompt", "source_image_urls"],
    properties: {
      prompt: {
        type: "string",
        description: "Describe the transformation. Example: 'change the background to a forest', 'make it black and white', 'add a hat'. Refers to the source image(s).",
      },
      source_image_urls: {
        type: "array",
        description: "Publicly accessible URLs of the source image(s). GCS URLs from a previous infron__image call work. Most models take exactly one source image; some support multiple (compositing).",
        items: { type: "string" },
        minItems: 1,
      },
      model: {
        type: "string",
        description: `Optional. Default: ${DEFAULTS.imageEdit}. Must be an *-image-to-image model.`,
      },
      aspect: {
        type: "string",
        description: "Aspect ratio of the output. Default: '1:1'. For gpt-image-2, aspect ratios auto-translate to pixel sizes.",
      },
      output_path: {
        type: "string",
        description: "Local file path to save the edited image. Default: ./infron-edit-<timestamp>.png in cwd.",
      },
      n: {
        type: "integer",
        minimum: 1,
        maximum: 4,
        description: "Number of variations to generate. Default: 1.",
      },
    },
  },
};

export async function handler(args, ctx) {
  const model = args.model || DEFAULTS.imageEdit;
  if (!model.includes("image-to-image")) {
    return {
      isError: true,
      content: [{
        type: "text",
        text: JSON.stringify({
          status: "error",
          error_type: "bad_request",
          message: `Model ${model} is not an image-to-image model. Use a *-image-to-image variant or omit the model parameter to use the default.`,
        }, null, 2),
      }],
    };
  }
  if (!Array.isArray(args.source_image_urls) || args.source_image_urls.length === 0) {
    return {
      isError: true,
      content: [{
        type: "text",
        text: JSON.stringify({
          status: "error",
          error_type: "bad_request",
          message: "source_image_urls must be a non-empty array of publicly-accessible image URLs.",
        }, null, 2),
      }],
    };
  }

  const aspect = args.aspect || "1:1";
  const size = translateSize(model, aspect);
  const n = args.n || 1;

  const submitResult = await generateImage(ctx.apiKey, {
    model,
    prompt: args.prompt,
    image_urls: args.source_image_urls,
    size,
    n,
  });

  let urls;
  let taskId = null;
  if (Array.isArray(submitResult?.data)) {
    urls = submitResult.data.map(d => d?.url).filter(Boolean);
  } else if (submitResult?.data?.task_id) {
    taskId = submitResult.data.task_id;
    const completed = await waitForImageTask(ctx.apiKey, taskId);
    const outputs = completed?.data?.outputs ?? completed?.data?.urls?.outputs ?? [];
    urls = Array.isArray(outputs) ? outputs.filter(Boolean) : [];
  } else {
    throw new Error(
      "Unrecognized Infron image_edit response shape. Got: " + JSON.stringify(submitResult).slice(0, 500)
    );
  }

  if (urls.length === 0) {
    throw new Error("Infron returned no edited image URLs. task_id=" + taskId);
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const defaultPath = path.join(process.cwd(), `infron-edit-${timestamp}.png`);
  const basePath = args.output_path || defaultPath;

  const saved = [];
  for (let i = 0; i < urls.length; i++) {
    const target = urls.length === 1
      ? basePath
      : basePath.replace(/(\.[^./\\]+)?$/, `-${i + 1}$1`);
    await downloadToFile(urls[i], target);
    saved.push(target);
  }

  const cost = estimateCost(model, { n: urls.length });

  return {
    content: [{
      type: "text",
      text: JSON.stringify({
        status: "success",
        saved,
        urls,
        model,
        aspect,
        size_used: size,
        async: taskId !== null,
        task_id: taskId,
        source_image_urls: args.source_image_urls,
        n: urls.length,
        estimated_cost_usd: cost,
      }, null, 2),
    }],
  };
}
