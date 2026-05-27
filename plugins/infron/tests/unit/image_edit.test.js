import { describe, it, expect, afterEach, beforeAll, afterAll } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { mockFetch } from "../helpers/mock-fetch.js";
import { handler, definition } from "../../lib/tools/image_edit.js";

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
  return path.join(os.tmpdir(), `infron-edit-test-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
}

describe("infron__image_edit — schema + validation", () => {
  it("requires prompt + source_image_urls", () => {
    expect(definition.inputSchema.required).toEqual(["prompt", "source_image_urls"]);
  });

  it("rejects missing source_image_urls (no network call)", async () => {
    const spy = mockFetch([{ match: "/", response: { status: 200, json: {} } }]);
    const result = await handler({ prompt: "make it red" }, { apiKey: "k" });
    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text).error_type).toBe("bad_request");
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("rejects empty source_image_urls array", async () => {
    const result = await handler({ prompt: "x", source_image_urls: [] }, { apiKey: "k" });
    expect(result.isError).toBe(true);
  });

  it("rejects non-image-to-image model", async () => {
    const result = await handler(
      { prompt: "x", source_image_urls: ["https://e/a.png"], model: "google/nano-banana-pro-text-to-image" },
      { apiKey: "k" }
    );
    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text).message).toMatch(/not an image-to-image/);
  });
});

describe("infron__image_edit — sync path (nano-banana)", () => {
  it("submits image_urls as array and downloads result", async () => {
    let posted;
    currentSpy = mockFetch([
      {
        match: "/images/generations",
        response: ({ options }) => {
          posted = JSON.parse(options.body);
          return { status: 200, json: { data: [{ url: "https://cdn/edited.png" }] } };
        },
      },
      { match: "cdn/edited.png", response: { status: 200, text: "" } },
    ]);

    const out = tmpFile();
    const result = await handler(
      {
        prompt: "make it green",
        source_image_urls: ["https://example.com/red.png"],
        output_path: out,
      },
      { apiKey: "k" }
    );
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.status).toBe("success");
    expect(parsed.async).toBe(false);
    expect(parsed.model).toBe("google/nano-banana-pro-image-to-image");
    expect(parsed.source_image_urls).toEqual(["https://example.com/red.png"]);
    expect(posted.image_urls).toEqual(["https://example.com/red.png"]);
    if (fs.existsSync(out)) fs.unlinkSync(out);
  });

  it("uses model override (e.g. cheaper nano-banana)", async () => {
    let postedModel;
    currentSpy = mockFetch([
      {
        match: "/images/generations",
        response: ({ options }) => {
          postedModel = JSON.parse(options.body).model;
          return { status: 200, json: { data: [{ url: "https://x/y.png" }] } };
        },
      },
      { match: "x/y.png", response: { status: 200, text: "" } },
    ]);
    const out = tmpFile();
    await handler(
      {
        prompt: "x",
        source_image_urls: ["https://e/a.png"],
        model: "google/nano-banana-image-to-image",
        output_path: out,
      },
      { apiKey: "k" }
    );
    expect(postedModel).toBe("google/nano-banana-image-to-image");
    if (fs.existsSync(out)) fs.unlinkSync(out);
  });
});

describe("infron__image_edit — async path (gpt-image-2)", () => {
  it("polls task and downloads from outputs", async () => {
    let postedSize;
    currentSpy = mockFetch([
      {
        match: "/images/generations",
        response: ({ options }) => {
          postedSize = JSON.parse(options.body).size;
          return { status: 200, json: { data: { task_id: "edit-task-1", status: "created" } } };
        },
      },
      {
        match: "/images/tasks/edit-task-1",
        response: { status: 200, json: { data: { status: "completed", outputs: ["https://cdn/done.png"] } } },
      },
      { match: "cdn/done.png", response: { status: 200, text: "" } },
    ]);
    const out = tmpFile();
    const result = await handler(
      {
        prompt: "make it sepia",
        source_image_urls: ["https://e/a.png"],
        model: "openai/gpt-image-2/image-to-image",
        output_path: out,
      },
      { apiKey: "k" }
    );
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.status).toBe("success");
    expect(parsed.async).toBe(true);
    expect(parsed.task_id).toBe("edit-task-1");
    expect(postedSize).toBe("1024x1024"); // auto-translated from default "1:1"
    if (fs.existsSync(out)) fs.unlinkSync(out);
  });

  it("surfaces task failure", async () => {
    currentSpy = mockFetch([
      { match: "/images/generations", response: { status: 200, json: { data: { task_id: "t-fail", status: "created" } } } },
      { match: "/images/tasks/t-fail", response: { status: 200, json: { data: { status: "failed", fail_reason: "bad input image" } } } },
    ]);
    await expect(
      handler(
        { prompt: "x", source_image_urls: ["https://e/a.png"], model: "openai/gpt-image-2/image-to-image" },
        { apiKey: "k" }
      )
    ).rejects.toThrow(/failed/);
  });
});
