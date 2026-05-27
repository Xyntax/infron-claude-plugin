import { describe, it, expect, afterEach, beforeAll, afterAll } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { mockFetch } from "../helpers/mock-fetch.js";
import { handler as videoHandler, definition } from "../../lib/tools/video.js";

// Compress polling so the test runs in <1s instead of >5min.
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

describe("infron__video tool — confirmation gate", () => {
  it("requires confirmed: true in schema", () => {
    expect(definition.inputSchema.required).toContain("confirmed");
  });

  it("refuses without confirmed=true", async () => {
    const result = await videoHandler({ prompt: "x" }, { apiKey: "k" });
    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text).error_type).toBe("confirmation_required");
  });

  it("refuses when confirmed=false explicitly", async () => {
    const result = await videoHandler({ prompt: "x", confirmed: false }, { apiKey: "k" });
    expect(result.isError).toBe(true);
  });

  it("never hits the network when not confirmed", async () => {
    const spy = mockFetch([{ match: "/", response: { status: 200, json: {} } }]);
    await videoHandler({ prompt: "x" }, { apiKey: "k" });
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe("infron__video tool — duration validation", () => {
  it("rejects integer duration (silently ignored server-side)", async () => {
    const result = await videoHandler({ prompt: "x", confirmed: true, duration: 8 }, { apiKey: "k" });
    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text).error_type).toBe("bad_request");
  });

  it("rejects bare string without 's' suffix", async () => {
    const result = await videoHandler({ prompt: "x", confirmed: true, duration: "8" }, { apiKey: "k" });
    expect(result.isError).toBe(true);
  });

  it("accepts '4s' and completes the flow", async () => {
    currentSpy = mockFetch([
      { match: "/videos/generations", response: { status: 200, json: { data: { task_id: "t-1" } } } },
      {
        match: "/videos/tasks/t-1",
        response: { status: 200, json: { data: { status: "completed", urls: { video: "https://cdn/v.mp4" } } } },
      },
      { match: "cdn/v.mp4", response: { status: 200, text: "" } },
    ]);
    const out = tmpFile();
    const result = await videoHandler({ prompt: "x", confirmed: true, duration: "4s", output_path: out }, { apiKey: "k" });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.status).toBe("success");
    expect(parsed.duration).toBe("4s");
    if (fs.existsSync(out)) fs.unlinkSync(out);
  });
});

describe("infron__video tool — polling state machine", () => {
  it("polls until status=completed, then downloads", async () => {
    let pollCount = 0;
    currentSpy = mockFetch([
      { match: "/videos/generations", response: { status: 200, json: { data: { task_id: "t-poll" } } } },
      {
        match: "/videos/tasks/t-poll",
        response: () => {
          pollCount++;
          if (pollCount < 3) return { status: 200, json: { data: { status: "running" } } };
          return { status: 200, json: { data: { status: "completed", urls: { video: "https://cdn/done.mp4" } } } };
        },
      },
      { match: "cdn/done.mp4", response: { status: 200, text: "" } },
    ]);
    const out = tmpFile();
    const result = await videoHandler({ prompt: "x", confirmed: true, output_path: out }, { apiKey: "k" });
    expect(JSON.parse(result.content[0].text).status).toBe("success");
    expect(pollCount).toBeGreaterThanOrEqual(3);
    if (fs.existsSync(out)) fs.unlinkSync(out);
  });

  it("throws on status=failed", async () => {
    currentSpy = mockFetch([
      { match: "/videos/generations", response: { status: 200, json: { data: { task_id: "t-fail" } } } },
      { match: "/videos/tasks/t-fail", response: { status: 200, json: { data: { status: "failed" } } } },
    ]);
    await expect(
      videoHandler({ prompt: "x", confirmed: true }, { apiKey: "k" })
    ).rejects.toThrow(/failed/);
  });

  it("times out after pollTimeoutMs if status never resolves", async () => {
    process.env.INFRON_POLL_TIMEOUT_MS = "20";
    currentSpy = mockFetch([
      { match: "/videos/generations", response: { status: 200, json: { data: { task_id: "t-stall" } } } },
      { match: "/videos/tasks/t-stall", response: { status: 200, json: { data: { status: "running" } } } },
    ]);
    await expect(
      videoHandler({ prompt: "x", confirmed: true }, { apiKey: "k" })
    ).rejects.toThrow(/timed out/);
    process.env.INFRON_POLL_TIMEOUT_MS = "10000";
  });
});
