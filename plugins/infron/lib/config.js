import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export const DASHBOARD_URL = "https://infron.ai/dashboard/apiKeys";

// Read dir/path at call time so tests can override HOME or INFRON_CONFIG_DIR
// without re-importing the module (which Vite-based test runners block).
function configDir() {
  if (process.env.INFRON_CONFIG_DIR) return process.env.INFRON_CONFIG_DIR;
  // Prefer $HOME directly — os.homedir() ignores HOME on POSIX, which makes
  // tests hard to isolate. Fall back to os.homedir() if HOME is unset.
  return path.join(process.env.HOME || os.homedir(), ".infron");
}

export function configPath() {
  return path.join(configDir(), "config");
}

export function getApiKey() {
  if (process.env.INFRON_API_KEY && process.env.INFRON_API_KEY.trim()) {
    return process.env.INFRON_API_KEY.trim();
  }
  const p = configPath();
  if (fs.existsSync(p)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(p, "utf8"));
      if (typeof parsed?.apiKey === "string" && parsed.apiKey.trim()) {
        return parsed.apiKey.trim();
      }
    } catch {
      // corrupt config — treat as missing
    }
  }
  return null;
}

export function saveApiKey(apiKey) {
  if (typeof apiKey !== "string" || !apiKey.trim()) {
    throw new Error("apiKey must be a non-empty string");
  }
  const dir = configDir();
  const p = configPath();
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  fs.writeFileSync(p, JSON.stringify({ apiKey: apiKey.trim() }, null, 2), { mode: 0o600 });
  return p;
}
