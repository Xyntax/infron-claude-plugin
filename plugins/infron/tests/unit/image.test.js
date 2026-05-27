import { describe, it, expect, afterEach, beforeAll, afterAll } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { mockFetch } from "../helpers/mock-fetch.js";
import { handler as imageHandler, definition } from "../../lib/tools/image.js";

const origInterval = process.env.INFRON_IMAGE_POLL_INTERVAL_MS;
const origTimeout = process.env.INFRON_IMAGE_POLL_TIMEOUT_MS;
beforeAll(() => {
  process.env.INFRON_IMAGE_POLL_INTERVAL_MS = "1";
  process.env.INFRON_IMAGE_POLL_TIMEOUT_MS = "10000";
});
afterAll(() => {
  if (origInterval !== undefined) process.env.INFRON_IMAGE_POLL_INTERVAL_MS = origInterval; else delete process.env.INFRON_IMAGE_POLL_INTERVAL_MS;
  if (origTimeout !== undefined) process.env.INFRON_IMAGE_POLL_TIMEOUT_MS = origTimeout; else delete process.env.INFRON_IMAGE_POLL_TIMEOUT_MS;
});

let currentSpy;
afterEach(() => { currentSpy?.mockRestore(); });

function tmpFile(ext = ".png") {
  return path.join(os.tmpdir(), `infron-test-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
}

describe("infron__image tool — schema + sync path", () => {
  it("has correct name and required prompt param", () => {
    expect(definition.name).toBe("infron__image");
    expect(definition.inputSchema.required).toContain("prompt");
  });

  it("downloads image and returns success payload (sync model)", async () => {
    const fakePng = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    currentSpy = mockFetch([
      {
        match: "/images/generations",
        response: { status: 200, json: { data: [{ url: "https://cdn.example.com/img-abc.png" }] } },
      },
      {
        match: "cdn.example.com/img-abc.png",
        response: { status: 200, text: fakePng.toString("binary"), headers: { "content-type": "image/png" } },
      },
    ]);

    const out = tmpFile();
    const result = await imageHandler(
      { prompt: "a cat", output_path: out },
      { apiKey: "k" }
    );
    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.status).toBe("success");
    expect(parsed.saved).toContain(out);
    expect(parsed.model).toBe("google/nano-banana-pro-text-to-image");
    expect(parsed.async).toBe(false);
    expect(parsed.task_id).toBeNull();
    expect(parsed.estimated_cost_usd).toBe(0.15);
    expect(fs.existsSync(out)).toBe(true);

    fs.unlinkSync(out);
  });

  it("uses caller-supplied model override", async () => {
    let postedModel = null;
    currentSpy = mockFetch([
      {
        match: "/images/generations",
        response: ({ options }) => {
          postedModel = JSON.parse(options.body).model;
          return { status: 200, json: { data: [{ url: "https://x.com/y.png" }] } };
        },
      },
      { match: "x.com/y.png", response: { status: 200, text: "" } },
    ]);
    const out = tmpFile();
    await imageHandler({ prompt: "x", model: "google/gemini-2.5-flash-image", output_path: out }, { apiKey: "k" });
    expect(postedModel).toBe("google/gemini-2.5-flash-image");
    if (fs.existsSync(out)) fs.unlinkSync(out);
  });

  it("propagates 422 size errors as bad_request", async () => {
    currentSpy = mockFetch([
      { match: "/images/generations", response: { status: 422, text: "size literal_error" } },
    ]);
    await expect(
      imageHandler({ prompt: "x", aspect: "1024x1024" }, { apiKey: "k" })
    ).rejects.toMatchObject({ type: "bad_request", status: 422 });
  });

  it("handles n>1 by appending index to filename (sync)", async () => {
    currentSpy = mockFetch([
      {
        match: "/images/generations",
        response: {
          status: 200,
          json: { data: [
            { url: "https://x.com/a.png" },
            { url: "https://x.com/b.png" },
          ] },
        },
      },
      { match: /x\.com\/[ab]\.png/, response: { status: 200, text: "" } },
    ]);
    const out = tmpFile();
    const result = await imageHandler({ prompt: "x", n: 2, output_path: out }, { apiKey: "k" });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.saved).toHaveLength(2);
    expect(parsed.saved[0]).toMatch(/-1\.png$/);
    expect(parsed.saved[1]).toMatch(/-2\.png$/);
    parsed.saved.forEach(p => { if (fs.existsSync(p)) fs.unlinkSync(p); });
  });
});

describe("infron__image tool — async (gpt-image-2) path", () => {
  // Regression for the gpt-image-2 bug Lawrence hit on 2026-05-26:
  // the API returns data: { task_id, status, urls: { query } } and the tool
  // must poll image.onerouter.pro until status=completed, then read URLs
  // from data.outputs (NOT data[0].url).

  it("polls async task and downloads from data.outputs", async () => {
    let pollCount = 0;
    let postedSize = null;
    currentSpy = mockFetch([
      {
        match: "/images/generations",
        response: ({ options }) => {
          postedSize = JSON.parse(options.body).size;
          return {
            status: 200,
            json: {
              code: 200,
              message: "success",
              data: {
                task_id: "img-task-1",
                object: "image",
                model: "openai/gpt-image-2/text-to-image",
                status: "created",
                urls: { query: "https://image.onerouter.pro/v1/images/tasks/img-task-1" },
              },
            },
          };
        },
      },
      {
        match: "image.onerouter.pro/v1/images/tasks/img-task-1",
        response: () => {
          pollCount++;
          if (pollCount < 3) return { status: 200, json: { data: { task_id: "img-task-1", status: "in_progress" } } };
          return {
            status: 200,
            json: {
              data: {
                task_id: "img-task-1",
                status: "completed",
                outputs: ["https://storage.googleapis.com/x/done.png"],
              },
            },
          };
        },
      },
      { match: "storage.googleapis.com/x/done.png", response: { status: 200, text: "" } },
    ]);

    const out = tmpFile();
    const result = await imageHandler(
      { prompt: "x", model: "openai/gpt-image-2/text-to-image", output_path: out },
      { apiKey: "k" }
    );
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.status).toBe("success");
    expect(parsed.async).toBe(true);
    expect(parsed.task_id).toBe("img-task-1");
    expect(parsed.saved).toEqual([out]);
    // Default "1:1" should have been auto-translated to "1024x1024"
    expect(postedSize).toBe("1024x1024");
    expect(pollCount).toBeGreaterThanOrEqual(3);
    if (fs.existsSync(out)) fs.unlinkSync(out);
  });

  it("throws InfronError when async task status=failed", async () => {
    currentSpy = mockFetch([
      {
        match: "/images/generations",
        response: { status: 200, json: { data: { task_id: "t-fail", status: "created" } } },
      },
      {
        match: "/images/tasks/t-fail",
        response: { status: 200, json: { data: { task_id: "t-fail", status: "failed", fail_reason: "upstream 400" } } },
      },
    ]);
    await expect(
      imageHandler({ prompt: "x", model: "openai/gpt-image-2/text-to-image" }, { apiKey: "k" })
    ).rejects.toThrow(/failed/);
  });

  it("times out async task if status never resolves", async () => {
    process.env.INFRON_IMAGE_POLL_TIMEOUT_MS = "30";
    currentSpy = mockFetch([
      { match: "/images/generations", response: { status: 200, json: { data: { task_id: "t-stall", status: "created" } } } },
      { match: "/images/tasks/t-stall", response: { status: 200, json: { data: { status: "in_progress" } } } },
    ]);
    await expect(
      imageHandler({ prompt: "x", model: "openai/gpt-image-2/text-to-image" }, { apiKey: "k" })
    ).rejects.toThrow(/timed out/);
    process.env.INFRON_IMAGE_POLL_TIMEOUT_MS = "10000";
  });
});

describe("infron__image tool — size translation", () => {
  function captureSize(opts = {}) {
    let captured = null;
    const spy = mockFetch([
      {
        match: "/images/generations",
        response: ({ options }) => {
          captured = JSON.parse(options.body).size;
          if (opts.async) {
            return { status: 200, json: { data: { task_id: "t", status: "completed", outputs: ["https://x/y.png"] } } };
          }
          return { status: 200, json: { data: [{ url: "https://x/y.png" }] } };
        },
      },
      { match: "x/y.png", response: { status: 200, text: "" } },
      { match: "/images/tasks/t", response: { status: 200, json: { data: { status: "completed", outputs: ["https://x/y.png"] } } } },
    ]);
    return { getCaptured: () => captured, restore: () => spy.mockRestore() };
  }

  it("passes aspect ratios through unchanged for nano-banana models", async () => {
    const cap = captureSize();
    currentSpy = { mockRestore: cap.restore };
    const out = tmpFile();
    await imageHandler({ prompt: "x", aspect: "16:9", output_path: out }, { apiKey: "k" });
    expect(cap.getCaptured()).toBe("16:9");
    if (fs.existsSync(out)) fs.unlinkSync(out);
  });

  it("translates aspect ratios to pixels for gpt-image-2", async () => {
    const cases = [
      ["1:1", "1024x1024"],
      ["16:9", "1792x1024"],
      ["9:16", "1024x1792"],
      ["3:2", "1536x1024"],
      ["2:3", "1024x1536"],
    ];
    for (const [aspect, expected] of cases) {
      const cap = captureSize({ async: true });
      const out = tmpFile();
      await imageHandler(
        { prompt: "x", aspect, model: "openai/gpt-image-2/text-to-image", output_path: out },
        { apiKey: "k" }
      );
      expect(cap.getCaptured(), `aspect ${aspect}`).toBe(expected);
      cap.restore();
      if (fs.existsSync(out)) fs.unlinkSync(out);
    }
  });

  it("passes explicit pixel sizes through unchanged for gpt-image-2", async () => {
    const cap = captureSize({ async: true });
    currentSpy = { mockRestore: cap.restore };
    const out = tmpFile();
    await imageHandler(
      { prompt: "x", aspect: "1024x1536", model: "openai/gpt-image-2/text-to-image", output_path: out },
      { apiKey: "k" }
    );
    expect(cap.getCaptured()).toBe("1024x1536");
    if (fs.existsSync(out)) fs.unlinkSync(out);
  });

  it("falls back to 1024x1024 for unknown aspect ratio on gpt-image-2", async () => {
    const cap = captureSize({ async: true });
    currentSpy = { mockRestore: cap.restore };
    const out = tmpFile();
    await imageHandler(
      { prompt: "x", aspect: "21:9", model: "openai/gpt-image-2/text-to-image", output_path: out },
      { apiKey: "k" }
    );
    expect(cap.getCaptured()).toBe("1024x1024");
    if (fs.existsSync(out)) fs.unlinkSync(out);
  });
});

describe("infron__image tool — response shape errors", () => {
  it("throws clear error on unrecognized response shape (no data array, no task_id)", async () => {
    currentSpy = mockFetch([
      { match: "/images/generations", response: { status: 200, json: { unexpected: "shape" } } },
    ]);
    await expect(
      imageHandler({ prompt: "x" }, { apiKey: "k" })
    ).rejects.toThrow(/Unrecognized.*response shape/);
  });
});
