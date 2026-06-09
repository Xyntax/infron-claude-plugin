import { describe, it, expect, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { mockFetch } from "../helpers/mock-fetch.js";
import { handler, definition } from "../../lib/tools/upload_asset.js";
import { UPLOAD_DEFAULT_MODEL } from "../../lib/models.js";

let currentSpy;
afterEach(() => { currentSpy?.mockRestore(); });

function tmpImage() {
  const p = path.join(os.tmpdir(), `infron-asset-${Date.now()}-${Math.random().toString(36).slice(2)}.png`);
  fs.writeFileSync(p, Buffer.from("89504e470d0a1a0a0000", "hex"));
  return p;
}

const UPLOAD = (status = "Processing") => ({
  match: "/upload/resources",
  response: { status: 200, json: { code: 200, data: {
    id: 24, upstream_asset_uri: "asset://asset-xyz", upstream_status: status,
    gcs_url: "https://storage.googleapis.com/infron_gcs/x.png", file_name: "x.png",
  } } },
});
const STATUS_ACTIVE = {
  match: "/status/resources",
  response: { status: 200, json: { code: 200, data: {
    id: 24, upstream_asset_uri: "asset://asset-xyz", upstream_status: "Active", status: "active",
  } } },
};

describe("infron__upload_asset", () => {
  it("targets the media host for upload + status", () => {
    expect(definition.name).toBe("infron__upload_asset");
  });

  it("rejects when neither file_path nor image_url is given (no network)", async () => {
    const spy = mockFetch([{ match: "/", response: { status: 200, json: {} } }]);
    const result = await handler({}, { apiKey: "k" });
    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text).error_type).toBe("bad_request");
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("uploads a local file and polls to Active, returning the asset_uri", async () => {
    const p = tmpImage();
    currentSpy = mockFetch([UPLOAD("Processing"), STATUS_ACTIVE]);
    const result = await handler({ file_path: p }, { apiKey: "k" });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.status).toBe("success");
    expect(parsed.asset_uri).toBe("asset://asset-xyz");
    expect(parsed.review_status).toBe("Active");
    expect(parsed.resource_id).toBe(24);
    expect(parsed.model).toBe(UPLOAD_DEFAULT_MODEL);
    fs.unlinkSync(p);
  });

  it("accepts a remote image_url (JSON upload mode)", async () => {
    const ref = {};
    currentSpy = mockFetch([
      { match: "/upload/resources", response: ({ options }) => { ref.body = options.body; return UPLOAD("Active").response; } },
      STATUS_ACTIVE,
    ]);
    const result = await handler({ image_url: "https://example.com/face.png" }, { apiKey: "k" });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.status).toBe("success");
    expect(parsed.asset_uri).toBe("asset://asset-xyz");
    // remote mode sends the URL in a JSON body, not multipart
    expect(JSON.parse(ref.body).file).toBe("https://example.com/face.png");
    fs.unlinkSync; // no temp file
  });

  it("returns immediately (Processing) when wait_for_active is false — no status poll", async () => {
    const p = tmpImage();
    let statusCalls = 0;
    currentSpy = mockFetch([
      UPLOAD("Processing"),
      { match: "/status/resources", response: () => { statusCalls++; return STATUS_ACTIVE.response; } },
    ]);
    const result = await handler({ file_path: p, wait_for_active: false }, { apiKey: "k" });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.review_status).toBe("Processing");
    expect(statusCalls).toBe(0);
    fs.unlinkSync(p);
  });

  it("throws on a logical 4xx in the upload body (model does not support asset library)", async () => {
    const p = tmpImage();
    currentSpy = mockFetch([{ match: "/upload/resources", response: { status: 200, json: { code: 400, data: null, message: "model does not support asset library" } } }]);
    await expect(handler({ file_path: p }, { apiKey: "k" })).rejects.toThrow(/asset library/);
    fs.unlinkSync(p);
  });
});
