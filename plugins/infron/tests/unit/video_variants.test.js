import { describe, it, expect, afterEach, beforeAll, afterAll } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { mockFetch } from "../helpers/mock-fetch.js";
import { handler as fromImageHandler, definition as fromImageDef } from "../../lib/tools/video_from_image.js";
import { handler as flfHandler, definition as flfDef } from "../../lib/tools/video_first_last_frame.js";

const origInterval = process.env.INFRON_POLL_INTERVAL_MS;
const origTimeout = process.env.INFRON_POLL_TIMEOUT_MS;
beforeAll(() => {
  process.env.INFRON_POLL_INTERVAL_MS = "1";
  process.env.INFRON_POLL_TIMEOUT_MS = "10000";
});
afterAll(() => {
  if (origInterval !== undefined) process.env.INFRON_POLL_INTERVAL_MS = origInterval; else delete process.env.INFRON_POLL_INTERVAL_MS;
  if (origTimeout !== undefined) process.env.INFRON_POLL_TIMEOUT_MS = origTimeout; else delete process.env.INFRON_POLL_TIMEOUT_MS;
});

let currentSpy;
afterEach(() => { currentSpy?.mockRestore(); });

function tmpFile(ext = ".mp4") {
  return path.join(os.tmpdir(), `infron-test-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
}

function happyPath(taskId = "t-happy") {
  return [
    { match: "/videos/generations", response: { status: 200, json: { data: { task_id: taskId } } } },
    {
      match: new RegExp(`/videos/tasks/${taskId}`),
      response: { status: 200, json: { data: { status: "completed", urls: { video: "https://cdn/x.mp4" } } } },
    },
    { match: "cdn/x.mp4", response: { status: 200, text: "" } },
  ];
}

describe("infron__video_from_image", () => {
  it("schema requires prompt, confirmed, start_image_url", () => {
    expect(fromImageDef.inputSchema.required).toEqual(["prompt", "confirmed", "start_image_url"]);
  });

  it("refuses without confirmed=true (no network call)", async () => {
    const spy = mockFetch([{ match: "/", response: { status: 200, json: {} } }]);
    const result = await fromImageHandler(
      { prompt: "x", start_image_url: "https://example.com/a.png" },
      { apiKey: "k" }
    );
    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text).error_type).toBe("confirmation_required");
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("rejects missing start_image_url (bad_request, no network)", async () => {
    const spy = mockFetch([{ match: "/", response: { status: 200, json: {} } }]);
    const result = await fromImageHandler(
      { prompt: "x", confirmed: true },
      { apiKey: "k" }
    );
    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text).error_type).toBe("bad_request");
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("rejects integer duration before any network call", async () => {
    const result = await fromImageHandler(
      { prompt: "x", confirmed: true, start_image_url: "https://example.com/a.png", duration: 8 },
      { apiKey: "k" }
    );
    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text).error_type).toBe("bad_request");
  });

  it("submits with start_image_url and downloads on completion", async () => {
    let postedPayload = null;
    currentSpy = mockFetch([
      {
        match: "/videos/generations",
        response: ({ options }) => {
          postedPayload = JSON.parse(options.body);
          return { status: 200, json: { data: { task_id: "t-img2vid" } } };
        },
      },
      {
        match: "/videos/tasks/t-img2vid",
        response: { status: 200, json: { data: { status: "completed", urls: { video: "https://cdn/img2vid.mp4" } } } },
      },
      { match: "cdn/img2vid.mp4", response: { status: 200, text: "" } },
    ]);

    const out = tmpFile();
    const result = await fromImageHandler(
      {
        prompt: "animate the cat",
        confirmed: true,
        start_image_url: "https://example.com/cat.png",
        duration: "4s",
        output_path: out,
      },
      { apiKey: "k" }
    );

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.status).toBe("success");
    expect(parsed.task_id).toBe("t-img2vid");
    expect(parsed.model).toMatch(/image-to-video/);
    expect(postedPayload.start_image_url).toBe("https://example.com/cat.png");
    expect(postedPayload.duration).toBe("4s");
    if (fs.existsSync(out)) fs.unlinkSync(out);
  });
});

describe("infron__video_first_last_frame", () => {
  it("schema requires prompt, confirmed, start_image_url, end_image_url", () => {
    expect(flfDef.inputSchema.required).toEqual([
      "prompt", "confirmed", "start_image_url", "end_image_url",
    ]);
  });

  it("refuses without confirmed=true", async () => {
    const spy = mockFetch([{ match: "/", response: { status: 200, json: {} } }]);
    const result = await flfHandler(
      { prompt: "x", start_image_url: "https://e/a.png", end_image_url: "https://e/b.png" },
      { apiKey: "k" }
    );
    expect(result.isError).toBe(true);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("rejects missing start_image_url", async () => {
    const result = await flfHandler(
      { prompt: "x", confirmed: true, end_image_url: "https://e/b.png" },
      { apiKey: "k" }
    );
    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text).message).toMatch(/start_image_url/);
  });

  it("rejects missing end_image_url", async () => {
    const result = await flfHandler(
      { prompt: "x", confirmed: true, start_image_url: "https://e/a.png" },
      { apiKey: "k" }
    );
    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text).message).toMatch(/end_image_url/);
  });

  it("submits both keyframe URLs and downloads on completion", async () => {
    let postedPayload = null;
    currentSpy = mockFetch([
      {
        match: "/videos/generations",
        response: ({ options }) => {
          postedPayload = JSON.parse(options.body);
          return { status: 200, json: { data: { task_id: "t-flf" } } };
        },
      },
      {
        match: "/videos/tasks/t-flf",
        response: { status: 200, json: { data: { status: "completed", urls: { video: "https://cdn/flf.mp4" } } } },
      },
      { match: "cdn/flf.mp4", response: { status: 200, text: "" } },
    ]);

    const out = tmpFile();
    const result = await flfHandler(
      {
        prompt: "smooth zoom between the two scenes",
        confirmed: true,
        start_image_url: "https://example.com/start.png",
        end_image_url: "https://example.com/end.png",
        duration: "4s",
        output_path: out,
      },
      { apiKey: "k" }
    );

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.status).toBe("success");
    expect(parsed.task_id).toBe("t-flf");
    expect(parsed.model).toMatch(/first-last-frame/);
    expect(postedPayload.start_image_url).toBe("https://example.com/start.png");
    expect(postedPayload.end_image_url).toBe("https://example.com/end.png");
    if (fs.existsSync(out)) fs.unlinkSync(out);
  });

  it("propagates failed status as InfronError", async () => {
    currentSpy = mockFetch([
      { match: "/videos/generations", response: { status: 200, json: { data: { task_id: "t-fail" } } } },
      { match: "/videos/tasks/t-fail", response: { status: 200, json: { data: { status: "failed", fail_reason: "upstream error" } } } },
    ]);
    await expect(
      flfHandler(
        {
          prompt: "x",
          confirmed: true,
          start_image_url: "https://a",
          end_image_url: "https://b",
        },
        { apiKey: "k" }
      )
    ).rejects.toThrow(/failed/);
  });
});
