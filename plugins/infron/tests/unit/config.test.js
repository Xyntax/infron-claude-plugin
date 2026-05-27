import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { getApiKey, saveApiKey, configPath } from "../../lib/config.js";

const origKey = process.env.INFRON_API_KEY;
const origDir = process.env.INFRON_CONFIG_DIR;

let tmp;
beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "infron-test-"));
  process.env.INFRON_CONFIG_DIR = tmp;
  delete process.env.INFRON_API_KEY;
});
afterEach(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
  if (origDir !== undefined) process.env.INFRON_CONFIG_DIR = origDir; else delete process.env.INFRON_CONFIG_DIR;
  if (origKey !== undefined) process.env.INFRON_API_KEY = origKey; else delete process.env.INFRON_API_KEY;
});

describe("config.getApiKey", () => {
  it("returns null when neither env nor file is set", () => {
    expect(getApiKey()).toBeNull();
  });

  it("returns INFRON_API_KEY from env when present", () => {
    process.env.INFRON_API_KEY = "sk-test-env";
    expect(getApiKey()).toBe("sk-test-env");
  });

  it("trims whitespace from env var", () => {
    process.env.INFRON_API_KEY = "  sk-spaced  ";
    expect(getApiKey()).toBe("sk-spaced");
  });

  it("falls back to config file when env is unset", () => {
    saveApiKey("sk-from-file");
    expect(fs.existsSync(configPath())).toBe(true);
    expect(getApiKey()).toBe("sk-from-file");
  });

  it("prefers env over file when both are set", () => {
    saveApiKey("sk-from-file");
    process.env.INFRON_API_KEY = "sk-from-env";
    expect(getApiKey()).toBe("sk-from-env");
  });

  it("returns null when config file is corrupt JSON", () => {
    fs.mkdirSync(tmp, { recursive: true });
    fs.writeFileSync(configPath(), "not json");
    expect(getApiKey()).toBeNull();
  });
});

describe("config.saveApiKey", () => {
  it("writes file with 0600 permissions", () => {
    saveApiKey("sk-secret");
    const stat = fs.statSync(configPath());
    const mode = stat.mode & 0o777;
    expect(mode).toBe(0o600);
  });

  it("rejects empty/non-string keys", () => {
    expect(() => saveApiKey("")).toThrow();
    expect(() => saveApiKey(null)).toThrow();
    expect(() => saveApiKey(undefined)).toThrow();
  });
});
