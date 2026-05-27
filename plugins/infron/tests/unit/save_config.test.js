import { describe, it, expect, afterEach, beforeEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { mockFetch } from "../helpers/mock-fetch.js";
import { handler } from "../../lib/tools/save_config.js";

const origKey = process.env.INFRON_API_KEY;
const origDir = process.env.INFRON_CONFIG_DIR;

let currentSpy;
let tmp;

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "infron-save-"));
  process.env.INFRON_CONFIG_DIR = tmp;
  delete process.env.INFRON_API_KEY;
});
afterEach(() => {
  currentSpy?.mockRestore();
  fs.rmSync(tmp, { recursive: true, force: true });
  if (origDir !== undefined) process.env.INFRON_CONFIG_DIR = origDir; else delete process.env.INFRON_CONFIG_DIR;
  if (origKey !== undefined) process.env.INFRON_API_KEY = origKey; else delete process.env.INFRON_API_KEY;
});

describe("infron__save_config tool", () => {
  it("verifies key with /models, then writes config file", async () => {
    currentSpy = mockFetch([
      { match: "/models", response: { status: 200, json: { data: [{ id: "x" }] } } },
    ]);
    const result = await handler({ apiKey: "sk-good" });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.status).toBe("success");
    const cfg = JSON.parse(fs.readFileSync(path.join(tmp, "config"), "utf8"));
    expect(cfg.apiKey).toBe("sk-good");
  });

  it("does NOT save when verification returns 401", async () => {
    currentSpy = mockFetch([
      { match: "/models", response: { status: 401, text: "no" } },
    ]);
    const result = await handler({ apiKey: "sk-bad" });
    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text).error_type).toBe("auth_failed");
    expect(fs.existsSync(path.join(tmp, "config"))).toBe(false);
  });

  it("rejects empty apiKey without network call", async () => {
    const fetchSpy = mockFetch([]);
    const result = await handler({ apiKey: "" });
    expect(result.isError).toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
