import { describe, it, expect, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { mockFetch } from "../helpers/mock-fetch.js";
import { handler as imageHandler, definition } from "../../lib/tools/image.js";

let currentSpy;
afterEach(() => { currentSpy?.mockRestore(); });

function tmpFile(ext = ".png") {
  return path.join(os.tmpdir(), `infron-test-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
}

describe("infron__image tool", () => {
  it("has correct name and required prompt param", () => {
    expect(definition.name).toBe("infron__image");
    expect(definition.inputSchema.required).toContain("prompt");
  });

  it("downloads image and returns success payload", async () => {
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

  it("handles n>1 by appending index to filename", async () => {
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
