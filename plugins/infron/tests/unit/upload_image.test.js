import { describe, it, expect, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { mockFetch } from "../helpers/mock-fetch.js";
import { handler, definition } from "../../lib/tools/upload_image.js";
import { UPLOAD_DEFAULT_MODEL } from "../../lib/models.js";

let currentSpy;
afterEach(() => { currentSpy?.mockRestore(); });

function tmpImage() {
  const p = path.join(os.tmpdir(), `infron-up-${Date.now()}-${Math.random().toString(36).slice(2)}.png`);
  fs.writeFileSync(p, Buffer.from("89504e470d0a1a0a0000", "hex")); // tiny non-empty stub
  return p;
}

const okData = (overrides = {}) => ({
  id: 14,
  status: "processing",
  upstream_status: "Processing",
  upstream_asset_uri: "asset://asset-xyz",
  gcs_url: "https://storage.googleapis.com/infron_gcs/x.png",
  file_name: "x.png",
  ...overrides,
});

const OK_ROUTE = (data = okData()) => ({
  match: "/upload/resources",
  response: { status: 200, json: { code: 200, message: "success", data } },
});

describe("infron__upload_image", () => {
  it("schema requires file_path", () => {
    expect(definition.inputSchema.required).toEqual(["file_path"]);
  });

  it("rejects a missing file_path with no network call", async () => {
    const spy = mockFetch([{ match: "/", response: { status: 200, json: {} } }]);
    const result = await handler({}, { apiKey: "k" });
    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text).error_type).toBe("bad_request");
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("uploads and returns reference_url + asset_uri + resource_id", async () => {
    const p = tmpImage();
    currentSpy = mockFetch([OK_ROUTE()]);
    const result = await handler({ file_path: p }, { apiKey: "k" });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.status).toBe("success");
    expect(parsed.reference_url).toBe("https://storage.googleapis.com/infron_gcs/x.png");
    expect(parsed.asset_uri).toBe("asset://asset-xyz");
    expect(parsed.resource_id).toBe(14);
    expect(parsed.model).toBe(UPLOAD_DEFAULT_MODEL); // asset-library-supporting default when none supplied
    fs.unlinkSync(p);
  });

  it("sends a POST (model carried in the multipart form) and honors a model override", async () => {
    const p = tmpImage();
    const ref = {};
    currentSpy = mockFetch([{
      match: "/upload/resources",
      response: ({ options }) => {
        ref.method = options.method;
        ref.hasAuth = !!options.headers?.Authorization;
        // fetch must derive the multipart boundary itself — no JSON content-type
        ref.contentType = options.headers?.["Content-Type"] || options.headers?.["content-type"] || null;
        return { status: 200, json: { code: 200, data: okData() } };
      },
    }]);
    const result = await handler(
      { file_path: p, model: "bytedance/seedance-2.0/virtual-portrait-reference-to-video" },
      { apiKey: "k" }
    );
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.model).toBe("bytedance/seedance-2.0/virtual-portrait-reference-to-video");
    expect(ref.method).toBe("POST");
    expect(ref.hasAuth).toBe(true);
    expect(ref.contentType).toBeNull();
    fs.unlinkSync(p);
  });

  it("throws on an empty file (no upload)", async () => {
    const p = path.join(os.tmpdir(), `infron-empty-${Date.now()}.png`);
    fs.writeFileSync(p, "");
    currentSpy = mockFetch([OK_ROUTE()]);
    await expect(handler({ file_path: p }, { apiKey: "k" })).rejects.toThrow(/empty/i);
    fs.unlinkSync(p);
  });

  it("throws on a logical 4xx returned inside an HTTP 200 body", async () => {
    const p = tmpImage();
    currentSpy = mockFetch([{
      match: "/upload/resources",
      response: { status: 200, json: { code: 400, data: null, message: "model is required" } },
    }]);
    await expect(handler({ file_path: p }, { apiKey: "k" })).rejects.toThrow(/model is required/);
    fs.unlinkSync(p);
  });
});
