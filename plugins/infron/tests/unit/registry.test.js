import { describe, it, expect } from "vitest";
import { tools, definitions, requiresKey, findHandler } from "../../lib/tools/index.js";

describe("tools registry", () => {
  it("exposes all 6 tools", () => {
    expect(tools).toHaveLength(6);
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

  it("requiresKey returns true for image/video/chat/list_models", () => {
    expect(requiresKey("infron__image")).toBe(true);
    expect(requiresKey("infron__video")).toBe(true);
    expect(requiresKey("infron__chat")).toBe(true);
    expect(requiresKey("infron__list_models")).toBe(true);
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
  });
});
