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
