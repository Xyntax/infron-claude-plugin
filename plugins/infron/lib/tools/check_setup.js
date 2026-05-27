import { getApiKey, configPath, DASHBOARD_URL } from "../config.js";

export const definition = {
  name: "infron__check_setup",
  description:
    `Check whether the Infron plugin has an API key configured. Returns { configured: bool, source: 'env'|'config'|null }. Useful to call before suggesting setup.`,
  inputSchema: { type: "object", properties: {} },
};

export async function handler() {
  const fromEnv = !!(process.env.INFRON_API_KEY && process.env.INFRON_API_KEY.trim());
  const key = getApiKey();
  const configured = !!key;
  return {
    content: [{
      type: "text",
      text: JSON.stringify({
        status: "success",
        configured,
        source: !configured ? null : (fromEnv ? "env" : "config"),
        config_path: configPath(),
        dashboard_url: DASHBOARD_URL,
      }, null, 2),
    }],
  };
}
