import * as image from "./image.js";
import * as video from "./video.js";
import * as chat from "./chat.js";
import * as listModels from "./list_models.js";
import * as saveConfig from "./save_config.js";
import * as checkSetup from "./check_setup.js";

// Tools that need an API key. save_config and check_setup do not (they manage the key itself).
const TOOLS_REQUIRING_KEY = new Set(["infron__image", "infron__video", "infron__chat", "infron__list_models"]);

export const tools = [image, video, chat, listModels, saveConfig, checkSetup];

export const definitions = tools.map(t => t.definition);

export function requiresKey(toolName) {
  return TOOLS_REQUIRING_KEY.has(toolName);
}

export function findHandler(toolName) {
  const tool = tools.find(t => t.definition.name === toolName);
  return tool ? tool.handler : null;
}
