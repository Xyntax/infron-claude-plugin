import fs from "node:fs";

export const API_BASE = "https://llm.onerouter.pro/v1";
export const VIDEO_TASKS_BASE = "https://video.onerouter.pro/v1/videos/tasks";
export const IMAGE_TASKS_BASE = "https://image.onerouter.pro/v1/images/tasks";
// Reference / virtual-portrait ("face") video + the asset library live on the
// media gateway. The legacy llm./video. hosts 500 for the reference family.
export const MEDIA_BASE = "https://media.onerouter.pro/v1";

// media.onerouter.pro is Cloudflare-gated and 1010-blocks the default UA of both
// Node's fetch (undici) and python-urllib. A curl-style UA passes. Sent on every
// request — harmless on the other hosts, required on media.
const USER_AGENT = "curl/8.4.0";

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
        "User-Agent": USER_AGENT,
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

export async function generateVideoSubmit(apiKey, payload, submitUrl = `${API_BASE}/videos/generations`) {
  if (!payload.prompt) {
    throw new InfronError("bad_request", "video requires `prompt`.");
  }
  const resp = await request(apiKey, submitUrl, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return resp.json();
}

export async function pollVideoTask(apiKey, taskId, tasksBase = VIDEO_TASKS_BASE) {
  const resp = await request(apiKey, `${tasksBase}/${encodeURIComponent(taskId)}`);
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

export const UPLOAD_RESOURCES_URL = `${MEDIA_BASE}/upload/resources`;
export const RESOURCE_STATUS_BASE = `${MEDIA_BASE}/status/resources`;

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
 * Upload an image to the Infron media gateway and get back an `asset://` URI
 * (plus a public gcs_url). The asset is what the virtual-portrait / reference
 * video model takes in `image_urls`. Accepts either a local file (`filePath`,
 * sent multipart) or a public http(s) URL (`fileUrl`, sent as JSON).
 *
 * Three gateway quirks handled here:
 *   1. the form/body REQUIRES a `model` field alongside the file.
 *   2. it always returns HTTP 200 — logical failures arrive as { code: 4xx,
 *      message } in the JSON body, so we check `code` as well as resp.ok.
 *   3. media.onerouter.pro 1010-blocks the default UA → send a curl UA.
 *
 * The asset comes back `Processing`; real-person portraits must then pass a
 * consistency review (poll pollResourceStatus until Active) before use.
 */
export async function uploadResource(apiKey, { filePath, fileUrl, model }) {
  if (!model) {
    throw new InfronError("bad_request", "upload requires a `model`.");
  }
  if (!filePath && !fileUrl) {
    throw new InfronError("bad_request", "upload requires either a local `filePath` or a public `fileUrl`.");
  }

  let resp;
  try {
    if (fileUrl) {
      // Remote URL mode — JSON body, only http/https supported upstream.
      resp = await fetch(UPLOAD_RESOURCES_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "User-Agent": USER_AGENT,
        },
        body: JSON.stringify({ model, file: fileUrl }),
      });
    } else {
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
      // No Content-Type: fetch derives the multipart boundary from the FormData body.
      resp = await fetch(UPLOAD_RESOURCES_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "User-Agent": USER_AGENT },
        body: form,
      });
    }
  } catch (e) {
    if (e instanceof InfronError) throw e;
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

// Fetch the review status of an uploaded asset. Returns the `data` object whose
// `upstream_status` advances Processing -> Active (usable) or Failed/Rejected.
export async function getResourceStatus(apiKey, resourceId) {
  const resp = await request(apiKey, `${RESOURCE_STATUS_BASE}/${encodeURIComponent(resourceId)}`);
  const json = await resp.json();
  return json.data ?? json;
}

/**
 * Poll an uploaded asset until its real-person consistency review reaches Active.
 * Returns the final status data. Throws if the review fails or times out.
 */
export async function pollResourceActive(apiKey, resourceId, { intervalMs = 4000, timeoutMs = 300000 } = {}) {
  const startedAt = Date.now();
  let last;
  while (Date.now() - startedAt < timeoutMs) {
    last = await getResourceStatus(apiKey, resourceId);
    const status = last?.upstream_status;
    if (status === "Active") return last;
    if (status === "Failed" || status === "Rejected") {
      throw new InfronError(
        "bad_request",
        `Asset ${resourceId} review did not pass (status: ${status}).`,
        { hint: "Use a different portrait, or check the image meets the model's requirements." }
      );
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new InfronError(
    "server",
    `Asset ${resourceId} did not reach Active within ${timeoutMs / 1000}s (last status: ${last?.upstream_status}).`,
    { hint: "The consistency review is slow right now; retry the upload or poll the status endpoint again." }
  );
}
