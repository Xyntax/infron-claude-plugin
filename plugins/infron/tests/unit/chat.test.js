import { describe, it, expect, afterEach } from "vitest";
import { mockFetch } from "../helpers/mock-fetch.js";
import { handler as chatHandler, definition } from "../../lib/tools/chat.js";

let currentSpy;
afterEach(() => { currentSpy?.mockRestore(); });

describe("infron__chat tool", () => {
  it("requires model and messages", () => {
    expect(definition.inputSchema.required).toEqual(["model", "messages"]);
  });

  it("returns the assistant message from the response", async () => {
    currentSpy = mockFetch([{
      match: "/chat/completions",
      response: {
        status: 200,
        json: {
          model: "openai/gpt-5",
          choices: [{ message: { role: "assistant", content: "hi there" } }],
          usage: { prompt_tokens: 5, completion_tokens: 2, total_tokens: 7 },
        },
      },
    }]);
    const result = await chatHandler(
      { model: "openai/gpt-5", messages: [{ role: "user", content: "hi" }] },
      { apiKey: "k" }
    );
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.status).toBe("success");
    expect(parsed.message).toBe("hi there");
    expect(parsed.usage.total_tokens).toBe(7);
  });

  it("rejects empty messages array via client validation", async () => {
    await expect(
      chatHandler({ model: "m", messages: [] }, { apiKey: "k" })
    ).rejects.toMatchObject({ type: "bad_request" });
  });
});
