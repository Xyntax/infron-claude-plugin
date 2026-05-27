import { vi } from "vitest";

/**
 * Build a fetch mock that responds based on URL pattern matching.
 * Each route is { match: substring|RegExp, response: {status, json|text, headers?} | function(req) }.
 *
 * Returns the spy so tests can assert call counts and order.
 */
export function mockFetch(routes) {
  const spy = vi.spyOn(globalThis, "fetch");
  spy.mockImplementation(async (url, options) => {
    const u = typeof url === "string" ? url : url.toString();
    for (const r of routes) {
      const m = typeof r.match === "string"
        ? u.includes(r.match)
        : r.match.test(u);
      if (!m) continue;
      const resp = typeof r.response === "function"
        ? await r.response({ url: u, options })
        : r.response;
      const status = resp.status ?? 200;
      const headers = new Headers(resp.headers || { "content-type": resp.json !== undefined ? "application/json" : "text/plain" });
      const body = resp.json !== undefined ? JSON.stringify(resp.json) : (resp.text ?? "");
      const arrayBuffer = async () => new TextEncoder().encode(body).buffer;
      return {
        ok: status >= 200 && status < 300,
        status,
        headers,
        text: async () => body,
        json: async () => JSON.parse(body),
        arrayBuffer,
      };
    }
    throw new Error(`mockFetch: no route matched ${u}`);
  });
  return spy;
}

export function restore(spy) {
  spy.mockRestore();
}
