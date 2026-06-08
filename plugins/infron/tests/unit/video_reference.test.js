import { describe, it, expect, afterEach, beforeAll, afterAll } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { mockFetch } from "../helpers/mock-fetch.js";
import { handler, definition } from "../../lib/tools/video_reference.js";
import { DEFAULTS, videoProfile } from "../../lib/models.js";

const REF_MODEL = "bytedance/seedance-2.0/reference-to-video";
const PORTRAIT_MODEL = "bytedance/seedance-2.0/virtual-portrait-reference-to-video";

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
  return path.join(os.tmpdir(), `infron-ref-${Date.now()}-${Math.random().toString(36).slice(2)}.mp4`);
}

// Seedance task response shape: URL under data.outputs[], real charge under data.cost.total_cost.
function happyPath(taskId = "t-ref", postedRef) {
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
            outputs: ["https://storage.googleapis.com/x/ref.mp4"],
            cost: { total_cost: 0.7623 },
          },
        },
      },
    },
    { match: "ref.mp4", response: { status: 200, text: "" } },
  ];
}

describe("infron__video_reference", () => {
  it("schema requires prompt, confirmed, reference_image_urls", () => {
    expect(definition.inputSchema.required).toEqual(["prompt", "confirmed", "reference_image_urls"]);
  });

  it("defaults to the general reference-to-video model", () => {
    expect(DEFAULTS.videoReference).toBe(REF_MODEL);
  });

  it("refuses without confirmed=true (no network call)", async () => {
    const spy = mockFetch([{ match: "/", response: { status: 200, json: {} } }]);
    const result = await handler(
      { prompt: "x", reference_image_urls: ["https://example.com/face.png"] },
      { apiKey: "k" }
    );
    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text).error_type).toBe("confirmation_required");
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("rejects missing reference_image_urls (bad_request, no network)", async () => {
    const spy = mockFetch([{ match: "/", response: { status: 200, json: {} } }]);
    const result = await handler({ prompt: "x", confirmed: true }, { apiKey: "k" });
    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text).error_type).toBe("bad_request");
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("rejects an empty reference_image_urls array", async () => {
    const result = await handler(
      { prompt: "x", confirmed: true, reference_image_urls: [] },
      { apiKey: "k" }
    );
    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text).error_type).toBe("bad_request");
  });

  it("rejects more than 9 reference images", async () => {
    const urls = Array.from({ length: 10 }, (_, i) => `https://example.com/${i}.png`);
    const result = await handler(
      { prompt: "x", confirmed: true, reference_image_urls: urls },
      { apiKey: "k" }
    );
    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error_type).toBe("bad_request");
    expect(parsed.message).toMatch(/at most 9/);
  });

  it("rejects non-string entries in reference_image_urls", async () => {
    const result = await handler(
      { prompt: "x", confirmed: true, reference_image_urls: ["https://example.com/a.png", 42] },
      { apiKey: "k" }
    );
    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text).error_type).toBe("bad_request");
  });

  it("builds the flat image_urls payload and downloads on completion", async () => {
    const ref = {};
    currentSpy = mockFetch(happyPath("t-ref", ref));
    const out = tmpFile();
    const result = await handler(
      {
        prompt: "she smiles and waves",
        confirmed: true,
        reference_image_urls: ["https://example.com/face1.png", "https://example.com/face2.png"],
        duration: "5",
        resolution: "720p",
        aspect_ratio: "9:16",
        output_path: out,
      },
      { apiKey: "k" }
    );
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.status).toBe("success");
    expect(parsed.model).toBe(REF_MODEL);
    expect(parsed.actual_cost_usd).toBe(0.7623);
    // gateway contract: a flat array of URL strings under image_urls
    expect(ref.payload.image_urls).toEqual([
      "https://example.com/face1.png",
      "https://example.com/face2.png",
    ]);
    expect(ref.payload.input_references).toBeUndefined();
    expect(ref.payload.duration).toBe("5");
    expect(ref.payload.resolution).toBe("720p");
    expect(ref.payload.aspect_ratio).toBe("9:16");
    expect(ref.payload.generate_audio).toBe(false); // Seedance default
    if (fs.existsSync(out)) fs.unlinkSync(out);
  });

  it("honors the virtual-portrait model override and Seedance param contract", async () => {
    const ref = {};
    currentSpy = mockFetch(happyPath("t-vp", ref));
    const out = tmpFile();
    const result = await handler(
      {
        prompt: "talking head",
        confirmed: true,
        model: PORTRAIT_MODEL,
        reference_image_urls: ["https://example.com/face.png"],
        generate_audio: true,
        output_path: out,
      },
      { apiKey: "k" }
    );
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.status).toBe("success");
    expect(parsed.model).toBe(PORTRAIT_MODEL);
    expect(ref.payload.generate_audio).toBe(true);
    // virtual-portrait is a Seedance-family model → Seedance defaults apply
    expect(videoProfile(PORTRAIT_MODEL).family).toBe("seedance");
    expect(ref.payload.duration).toBe("4"); // Seedance default
    if (fs.existsSync(out)) fs.unlinkSync(out);
  });

  it("rejects Veo-format duration '8s' for a Seedance reference model (no charge)", async () => {
    const spy = mockFetch([{ match: "/", response: { status: 200, json: {} } }]);
    const result = await handler(
      {
        prompt: "x",
        confirmed: true,
        reference_image_urls: ["https://example.com/a.png"],
        duration: "8s",
      },
      { apiKey: "k" }
    );
    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error_type).toBe("bad_request");
    expect(parsed.message).toMatch(/'4'/);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("rejects an out-of-range Seedance duration '20' (no charge)", async () => {
    const spy = mockFetch([{ match: "/", response: { status: 200, json: {} } }]);
    const result = await handler(
      {
        prompt: "x",
        confirmed: true,
        reference_image_urls: ["https://example.com/a.png"],
        duration: "20",
      },
      { apiKey: "k" }
    );
    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error_type).toBe("bad_request");
    expect(parsed.message).toMatch(/'15'/); // lists the allowed Seedance durations
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("refuses with confirmed explicitly false (no network call)", async () => {
    const spy = mockFetch([{ match: "/", response: { status: 200, json: {} } }]);
    const result = await handler(
      { prompt: "x", confirmed: false, reference_image_urls: ["https://example.com/face.png"] },
      { apiKey: "k" }
    );
    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text).error_type).toBe("confirmation_required");
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("rejects an empty-string entry in reference_image_urls", async () => {
    const result = await handler(
      { prompt: "x", confirmed: true, reference_image_urls: ["https://example.com/a.png", ""] },
      { apiKey: "k" }
    );
    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text).error_type).toBe("bad_request");
  });

  it("accepts exactly 9 reference images (the maximum) and submits all of them", async () => {
    const ref = {};
    currentSpy = mockFetch(happyPath("t-9", ref));
    const out = tmpFile();
    const urls = Array.from({ length: 9 }, (_, i) => `https://example.com/face${i}.png`);
    const result = await handler(
      { prompt: "group shot", confirmed: true, reference_image_urls: urls, output_path: out },
      { apiKey: "k" }
    );
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.status).toBe("success");
    expect(ref.payload.image_urls).toHaveLength(9);
    expect(ref.payload.image_urls).toEqual(urls);
    if (fs.existsSync(out)) fs.unlinkSync(out);
  });

  it("accepts a /fast/ reference variant and routes it through the Seedance contract", async () => {
    const ref = {};
    currentSpy = mockFetch(happyPath("t-fast", ref));
    const out = tmpFile();
    const FAST = "bytedance/seedance-2.0/fast/reference-to-video";
    const result = await handler(
      {
        prompt: "she waves",
        confirmed: true,
        model: FAST,
        reference_image_urls: ["https://example.com/face.png"],
        output_path: out,
      },
      { apiKey: "k" }
    );
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.status).toBe("success");
    expect(parsed.model).toBe(FAST);
    expect(ref.payload.image_urls).toEqual(["https://example.com/face.png"]);
    expect(videoProfile(FAST).family).toBe("seedance");
    expect(ref.payload.duration).toBe("4"); // Seedance default applies to the fast tier
    if (fs.existsSync(out)) fs.unlinkSync(out);
  });
});
