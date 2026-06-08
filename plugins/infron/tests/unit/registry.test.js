import { describe, it, expect } from "vitest";
import { tools, definitions, requiresKey, findHandler } from "../../lib/tools/index.js";

describe("tools registry", () => {
  it("exposes all 10 tools", () => {
    expect(tools).toHaveLength(10);
  });

  it("every tool has a name, description, and JSON schema", () => {
    for (const t of tools) {
      expect(t.definition.name).toMatch(/^infron__/);
      expect(typeof t.definition.description).toBe("string");
      expect(t.definition.description.length).toBeGreaterThan(20);
      expect(t.definition.inputSchema?.type).toBe("object");
      expect(typeof t.handler).toBe("function");
    }
  });

  it("definitions array is in sync with tools", () => {
    expect(definitions.map(d => d.name).sort()).toEqual(tools.map(t => t.definition.name).sort());
  });

  it("requiresKey returns true for all generative + introspection tools", () => {
    for (const name of [
      "infron__image",
      "infron__image_edit",
      "infron__video",
      "infron__video_from_image",
      "infron__video_reference",
      "infron__video_first_last_frame",
      "infron__chat",
      "infron__list_models",
    ]) {
      expect(requiresKey(name), name).toBe(true);
    }
  });

  it("requiresKey returns false for setup-related tools", () => {
    expect(requiresKey("infron__save_config")).toBe(false);
    expect(requiresKey("infron__check_setup")).toBe(false);
  });

  it("findHandler returns the right function for each tool", () => {
    expect(findHandler("infron__image")).toBeTypeOf("function");
    expect(findHandler("infron__nonexistent")).toBeNull();
  });

  it("default models in tool descriptions point at real entries in PRICING", async () => {
    const { PRICING, DEFAULTS } = await import("../../lib/models.js");
    expect(PRICING[DEFAULTS.image]).toBeDefined();
    expect(PRICING[DEFAULTS.videoTextToVideo]).toBeDefined();
    expect(PRICING[DEFAULTS.videoReference]).toBeDefined();
  });
});
