import { describe, it, expect, afterEach } from "vitest";
import { mockFetch } from "../helpers/mock-fetch.js";
import { generateImage, chatCompletion, listModels, verifyKey, pollVideoTask, InfronError } from "../../lib/client.js";

let currentSpy;
afterEach(() => { currentSpy?.mockRestore(); });

describe("client error mapping", () => {
  it("maps 401 to InfronError(type=auth_failed)", async () => {
    currentSpy = mockFetch([{ match: "/models", response: { status: 401, text: "unauthorized" } }]);
    await expect(verifyKey("bad-key")).rejects.toMatchObject({ type: "auth_failed", status: 401 });
  });

  it("maps 403 to InfronError(type=auth_failed)", async () => {
    currentSpy = mockFetch([{ match: "/models", response: { status: 403, text: "forbidden" } }]);
    await expect(verifyKey("bad-key")).rejects.toMatchObject({ type: "auth_failed", status: 403 });
  });

  it("maps 429 to InfronError(type=rate_limit)", async () => {
    currentSpy = mockFetch([{ match: "/models", response: { status: 429, text: "slow down" } }]);
    await expect(verifyKey("ok")).rejects.toMatchObject({ type: "rate_limit", status: 429 });
  });

  it("maps 422 to InfronError(type=bad_request)", async () => {
    currentSpy = mockFetch([{ match: "/images/generations", response: { status: 422, text: "size literal_error" } }]);
    await expect(generateImage("ok", { model: "google/nano-banana-pro-text-to-image", prompt: "x", size: "9999x9999" }))
      .rejects.toMatchObject({ type: "bad_request", status: 422 });
  });

  it("maps 500 to InfronError(type=server)", async () => {
    currentSpy = mockFetch([{ match: "/models", response: { status: 500, text: "boom" } }]);
    await expect(verifyKey("ok")).rejects.toMatchObject({ type: "server", status: 500 });
  });

  it("wraps fetch failure as InfronError(type=network)", async () => {
    currentSpy = mockFetch([{ match: "/models", response: () => { throw new TypeError("connection refused"); } }]);
    await expect(verifyKey("ok")).rejects.toMatchObject({ type: "network" });
  });
});

describe("client request shape", () => {
  it("generateImage POSTs to /images/generations with model+prompt+size", async () => {
    let captured = null;
    currentSpy = mockFetch([{
      match: "/images/generations",
      response: ({ options }) => {
        captured = JSON.parse(options.body);
        return { status: 200, json: { data: [{ url: "https://example.com/x.png" }] } };
      },
    }]);
    await generateImage("k", { model: "m", prompt: "p", size: "16:9" });
    expect(captured).toMatchObject({ model: "m", prompt: "p", size: "16:9" });
  });

  it("chatCompletion requires model and messages", async () => {
    await expect(chatCompletion("k", { messages: [] })).rejects.toMatchObject({ type: "bad_request" });
    await expect(chatCompletion("k", { model: "m", messages: [] })).rejects.toMatchObject({ type: "bad_request" });
  });

  it("listModels returns data array from response", async () => {
    currentSpy = mockFetch([{
      match: "/models",
      response: { status: 200, json: { data: [{ id: "m1" }, { id: "m2" }] } },
    }]);
    const ms = await listModels("k");
    expect(ms).toHaveLength(2);
    expect(ms[0].id).toBe("m1");
  });

  it("pollVideoTask hits video.onerouter.pro tasks endpoint", async () => {
    let hitUrl = null;
    currentSpy = mockFetch([{
      match: /video\.onerouter\.pro\/v1\/videos\/tasks\/abc-123/,
      response: ({ url }) => {
        hitUrl = url;
        return { status: 200, json: { data: { status: "running" } } };
      },
    }]);
    await pollVideoTask("k", "abc-123");
    expect(hitUrl).toContain("video.onerouter.pro/v1/videos/tasks/abc-123");
  });
});
