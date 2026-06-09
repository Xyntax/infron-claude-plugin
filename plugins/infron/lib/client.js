import fs from "node:fs";

export const API_BASE = "https://llm.onerouter.pro/v1";
export const VIDEO_TASKS_BASE = "https://video.onerouter.pro/v1/videos/tasks";
export const IMAGE_TASKS_BASE = "https://image.onerouter.pro/v1/images/tasks";

export class InfronError extends Error {
  constructor(type, message, { hint = null, status = null, raw = null } = {}) {
    super(message);
    this.type = type;
    this.hint = hint;
    this.status = status;
    this.raw = raw;
  }
}

async function request(apiKey, url, options = {}) {
  let resp;
  try {
    resp = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });
  } catch (e) {
    throw new InfronError("network", `Network request failed: ${e.message}`, {
      hint: "Check your internet connection or VPN.",
    });
  }

  if (!resp.ok) {
    const status = resp.status;
    const body = await resp.text().catch(() => "");
    if (status === 401 || status === 403) {
      throw new InfronError("auth_failed", "Infron API key was rejected.", {
        hint: "Re-run setup with a fresh key from https://infron.ai/dashboard/apiKeys.",
        status,
        raw: body,
      });
    }
    if (status === 429) {
      throw new InfronError("rate_limit", "Rate limit exceeded.", {
        hint: "Wait a moment and retry.",
        status,
        raw: body,
      });
    }
    if (status >= 400 && status < 500) {
      throw new InfronError(
        "bad_request",
        `Infron API returned ${status}.`,
        { hint: body.slice(0, 500), status, raw: body }
      );
    }
    throw new InfronError("server", `Infron API server error ${status}.`, {
      hint: "Retry in a few seconds. If persistent, check infron.ai status.",
      status,
      raw: body,
    });
  }

  return resp;
}

export async function verifyKey(apiKey) {
  const resp = await request(apiKey, `${API_BASE}/models`);
  return resp.json();
}

export async function listModels(apiKey) {
  const resp = await request(apiKey, `${API_BASE}/models`);
  const data = await resp.json();
  return data.data ?? data.models ?? [];
}

export async function chatCompletion(apiKey, payload) {
  if (!payload.model) {
    throw new InfronError("bad_request", "chat requires an explicit `model` parameter.", {
      hint: "Call infron__list_models to see available chat models.",
    });
  }
  if (!Array.isArray(payload.messages) || payload.messages.length === 0) {
    throw new InfronError("bad_request", "chat requires non-empty `messages` array.");
  }
  const resp = await request(apiKey, `${API_BASE}/chat/completions`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return resp.json();
}

export async function generateImage(apiKey, payload) {
  if (!payload.prompt) {
    throw new InfronError("bad_request", "image requires `prompt`.");
  }
  const resp = await request(apiKey, `${API_BASE}/images/generations`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return resp.json();
}

export async function generateVideoSubmit(apiKey, payload) {
  if (!payload.prompt) {
    throw new InfronError("bad_request", "video requires `prompt`.");
  }
  const resp = await request(apiKey, `${API_BASE}/videos/generations`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return resp.json();
}

export async function pollVideoTask(apiKey, taskId) {
  const resp = await request(apiKey, `${VIDEO_TASKS_BASE}/${encodeURIComponent(taskId)}`);
  return resp.json();
}

export async function pollImageTask(apiKey, taskId) {
  const resp = await request(apiKey, `${IMAGE_TASKS_BASE}/${encodeURIComponent(taskId)}`);
  return resp.json();
}

export async function downloadToFile(url, outputPath) {
  let resp;
  try {
    resp = await fetch(url);
  } catch (e) {
    throw new InfronError("network", `Failed to fetch ${url}: ${e.message}`);
  }
  if (!resp.ok) {
    throw new InfronError("network", `Failed to download ${url}: HTTP ${resp.status}`);
  }
  const buf = Buffer.from(await resp.arrayBuffer());
  fs.writeFileSync(outputPath, buf);
  return outputPath;
}

export const UPLOAD_RESOURCES_URL = `${API_BASE}/upload/resources`;

const IMAGE_CONTENT_TYPES = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  bmp: "image/bmp",
};

function guessContentType(fileName) {
  const ext = (fileName.split(".").pop() || "").toLowerCase();
  return IMAGE_CONTENT_TYPES[ext] || "application/octet-stream";
}

/**
 * Upload a LOCAL image file to Infron and get back a publicly-usable reference.
 *
 * The gateway stores the file to GCS (a public URL, immediately fetchable) and
 * also registers an upstream `asset://` URI. Either can be passed as a reference
 * image URL to infron__video_reference / infron__image_edit / infron__video_from_image.
 *
 * Two gateway quirks handled here:
 *   1. multipart form REQUIRES a `model` field alongside `file`.
 *   2. it always returns HTTP 200 — logical failures arrive as { code: 4xx,
 *      message } in the JSON body, so we check `code` as well as resp.ok.
 */
export async function uploadResource(apiKey, { filePath, model }) {
  if (!model) {
    throw new InfronError("bad_request", "upload requires a `model`.");
  }
  let buf;
  try {
    buf = fs.readFileSync(filePath);
  } catch (e) {
    throw new InfronError("bad_request", `Could not read file '${filePath}': ${e.message}`, {
      hint: "Pass an absolute path to a local image file.",
    });
  }
  if (!buf || buf.length === 0) {
    throw new InfronError("bad_request", `File is empty: ${filePath}`);
  }

  const fileName = filePath.split(/[/\\]/).pop() || "upload";
  const form = new FormData();
  form.append("model", model);
  form.append("file", new Blob([buf], { type: guessContentType(fileName) }), fileName);

  let resp;
  try {
    // Deliberately NO Content-Type header: fetch derives the multipart boundary
    // from the FormData body. (The shared `request()` helper forces JSON, so this
    // upload path does its own fetch.)
    resp = await fetch(UPLOAD_RESOURCES_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });
  } catch (e) {
    throw new InfronError("network", `Upload request failed: ${e.message}`, {
      hint: "Check your internet connection or VPN.",
    });
  }

  const text = await resp.text().catch(() => "");
  if (!resp.ok) {
    if (resp.status === 401 || resp.status === 403) {
      throw new InfronError("auth_failed", "Infron API key was rejected.", {
        hint: "Re-run setup with a fresh key from https://infron.ai/dashboard/apiKeys.",
        status: resp.status,
        raw: text,
      });
    }
    throw new InfronError(
      resp.status >= 500 ? "server" : "bad_request",
      `Upload returned HTTP ${resp.status}.`,
      { hint: text.slice(0, 500), status: resp.status, raw: text }
    );
  }

  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new InfronError("server", `Upload returned a non-JSON response: ${text.slice(0, 300)}`);
  }
  if (typeof json.code === "number" && json.code >= 400) {
    throw new InfronError("bad_request", `Upload failed: ${json.message || "unknown error"}`, {
      raw: text,
    });
  }
  return json.data ?? json;
}
