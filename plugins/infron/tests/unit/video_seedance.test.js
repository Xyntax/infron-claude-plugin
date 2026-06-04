import { describe, it, expect, afterEach, beforeAll, afterAll } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { mockFetch } from "../helpers/mock-fetch.js";
import { handler as videoHandler } from "../../lib/tools/video.js";
import { handler as fromImageHandler } from "../../lib/tools/video_from_image.js";
import { videoProfile, estimateCost } from "../../lib/models.js";

const SEEDANCE = "bytedance/seedance-2.0/text-to-video";

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

function tmpFile() {
  return path.join(os.tmpdir(), `infron-sd-${Date.now()}-${Math.random().toString(36).slice(2)}.mp4`);
}

// Seedance task response shape: URL under data.outputs[], real charge under data.cost.total_cost.
function seedanceHappyPath(taskId = "t-sd", postedRef) {
  return [
    {
      match: "/videos/generations",
      response: ({ options }) => {
        if (postedRef) postedRef.payload = JSON.parse(options.body);
        return { status: 200, json: { data: { task_id: taskId } } };
      },
    },
    {
      match: new RegExp(`/videos/tasks/${taskId}`),
      response: {
        status: 200,
        json: {
          data: {
            status: "completed",
            outputs: ["https://storage.googleapis.com/x/seedance.mp4"],
            cost: { total_cost: 0.6111 },
          },
        },
      },
    },
    { match: "seedance.mp4", response: { status: 200, text: "" } },
  ];
}

describe("Seedance 2.0 — param contract", () => {
  it("profile resolves Seedance family with its own allow-lists", () => {
    const p = videoProfile(SEEDANCE);
    expect(p.family).toBe("seedance");
    expect(p.durations).toContain("4");
    expect(p.durations).not.toContain("8s");
    expect(p.resolutions).toEqual(["480p", "720p"]);
    expect(p.defaultResolution).toBe("720p");
  });

  it("rejects Veo-format duration '8s' for a Seedance model (no charge)", async () => {
    const spy = mockFetch([{ match: "/", response: { status: 200, json: {} } }]);
    const result = await videoHandler(
      { prompt: "x", confirmed: true, model: SEEDANCE, duration: "8s" },
      { apiKey: "k" }
    );
    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error_type).toBe("bad_request");
    expect(parsed.message).toMatch(/'4'/); // lists the allowed Seedance durations
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("rejects 1080p for a Seedance model (Seedance maxes at 720p)", async () => {
    const result = await videoHandler(
      { prompt: "x", confirmed: true, model: SEEDANCE, duration: "4", resolution: "1080p" },
      { apiKey: "k" }
    );
    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error_type).toBe("bad_request");
    expect(parsed.message).toMatch(/480p, 720p/);
  });

  it("submits a valid Seedance job ('4'/720p), reports outputs[] URL + actual cost", async () => {
    const ref = {};
    currentSpy = mockFetch(seedanceHappyPath("t-sd", ref));
    const out = tmpFile();
    const result = await videoHandler(
      { prompt: "an apple", confirmed: true, model: SEEDANCE, duration: "4", resolution: "720p", output_path: out },
      { apiKey: "k" }
    );
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.status).toBe("success");
    expect(parsed.model).toBe(SEEDANCE);
    expect(parsed.duration).toBe("4");
    expect(parsed.resolution).toBe("720p");
    expect(parsed.actual_cost_usd).toBe(0.6111); // read from data.cost.total_cost
    // payload sent to the gateway must carry Seedance-shaped params
    expect(ref.payload.duration).toBe("4");
    expect(ref.payload.resolution).toBe("720p");
    expect(ref.payload.generate_audio).toBe(false); // Seedance default
    if (fs.existsSync(out)) fs.unlinkSync(out);
  });

  it("defaults to '4' / 720p / audio-off when params omitted for Seedance", async () => {
    const ref = {};
    currentSpy = mockFetch(seedanceHappyPath("t-def", ref));
    const out = tmpFile();
    await videoHandler(
      { prompt: "x", confirmed: true, model: SEEDANCE, output_path: out },
      { apiKey: "k" }
    );
    expect(ref.payload.duration).toBe("4");
    expect(ref.payload.resolution).toBe("720p");
    expect(ref.payload.aspect_ratio).toBe("16:9");
    expect(ref.payload.generate_audio).toBe(false);
    if (fs.existsSync(out)) fs.unlinkSync(out);
  });

  it("image-to-video accepts the Seedance image variant", async () => {
    const ref = {};
    currentSpy = mockFetch(seedanceHappyPath("t-i2v", ref));
    const out = tmpFile();
    const result = await fromImageHandler(
      {
        prompt: "animate it",
        confirmed: true,
        model: "bytedance/seedance-2.0/image-to-video",
        start_image_url: "https://example.com/a.png",
        duration: "5",
        output_path: out,
      },
      { apiKey: "k" }
    );
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.status).toBe("success");
    expect(ref.payload.start_image_url).toBe("https://example.com/a.png");
    expect(ref.payload.duration).toBe("5");
    if (fs.existsSync(out)) fs.unlinkSync(out);
  });

  it("confirmation gate quotes the Seedance rate, not Veo's", async () => {
    const result = await videoHandler(
      { prompt: "x", model: SEEDANCE, duration: "4" },
      { apiKey: "k" }
    );
    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error_type).toBe("confirmation_required");
    // 0.153 * 4 ≈ $0.61, nowhere near Veo's $1.60 for 4s
    expect(parsed.message).toMatch(/\$0\.6/);
    expect(estimateCost(SEEDANCE, { durationSeconds: 4 })).toBeCloseTo(0.612, 2);
  });
});
