# E2E walkthrough — T10–T17

Run these after the plugin is pushed to GitHub so we exercise the install path
end-users will take.

## Setup

- Open a **separate** terminal (don't run inside the Claude session that owns
  this repo, to avoid plugin caching weirdness).
- Make a scratch dir to use as cwd:
  ```sh
  mkdir -p ~/tmp/infron-plugin-e2e && cd ~/tmp/infron-plugin-e2e
  claude
  ```
- For T15/T16 you'll need to mess with `~/.infron/config`. Back it up first:
  ```sh
  cp ~/.infron/config ~/.infron/config.bak 2>/dev/null || true
  ```

---

## T10 — `claude plugin install` + MCP server spawn

In the new Claude session:

```text
/plugin marketplace add Xyntax/infron-claude-plugin
/plugin install infron@infron-tools
```

**Expected:**
- Both commands succeed
- `/plugin list` shows `infron@infron-tools` as installed
- `claude --debug` (separately) shows the MCP server starts without errors

---

## T11 — Image tool fires on "infron" keyword

Prompt: `Use infron to draw a small red circle on a white background, 1:1 aspect.`

**Expected:**
- Claude calls `mcp__infron__image` with `prompt`, `aspect: "1:1"`, default model `google/nano-banana-pro-text-to-image`
- A PNG appears in cwd (e.g. `infron-image-...png`)
- Claude reports the saved path and the ~$0.15 cost
- Total spent: $0.15

---

## T13 — Hijack: "draw an image" without infron keyword still routes to Infron

Prompt: `Draw an image of a green square.`

**Expected:**
- Claude STILL calls `mcp__infron__image` (the `infron-defaults` skill applies)
- New PNG in cwd
- Total spent: $0.15

---

## T14 — Chat NOT hijacked

Prompt: `Hello, how are you today?`

**Expected:**
- Claude responds in plain prose, **without** calling `mcp__infron__chat`
- No spend

Prompt: `Use infron chat with google/gemini-2.5-flash to say "ping" in one word.`

**Expected:**
- Claude calls `mcp__infron__chat` with `model: "google/gemini-2.5-flash"`
- Returns a reply
- Total spent: < $0.01

---

## T15 — Setup flow when no key configured

In another terminal:
```sh
rm -f ~/.infron/config
unset INFRON_API_KEY   # if it's set in your shell, this only affects the test shell
```

Restart the test Claude session (so the MCP server reloads without the env
var). Prompt: `Use infron to draw a blue triangle.`

**Expected:**
- First tool call returns `need_setup: true` error
- Claude triggers the `infron-setup` skill
- Claude opens https://infron.ai/dashboard/apiKeys in browser
- Claude asks you to paste the key
- After paste, `mcp__infron__save_config` runs, verifies via `/v1/models`, writes `~/.infron/config`
- Original draw request retries and succeeds
- Total spent: $0.15

---

## T16 — Invalid key path

```sh
echo '{"apiKey":"sk-bogus"}' > ~/.infron/config
```

Prompt: `Use infron to draw anything.`

**Expected:**
- Tool returns `auth_failed` error
- Claude surfaces the dashboard URL and offers to re-run setup

Restore:
```sh
cp ~/.infron/config.bak ~/.infron/config   # if you backed it up
```

---

## T17 — Uninstall removes the hijack

```text
/plugin uninstall infron@infron-tools
```

Prompt: `Draw an image of a sunset.`

**Expected:**
- Claude does NOT call `mcp__infron__*` (the MCP server is gone)
- Claude either declines (no native image tool) or uses whatever built-in image generation Code/Cowork ships

---

## Cleanup

```sh
# Restore your key file (if you backed it up)
mv ~/.infron/config.bak ~/.infron/config 2>/dev/null || true

# Restore export INFRON_API_KEY in your shell if needed
source ~/.zshrc
```

## Total cost of full walkthrough

- T11: $0.15
- T13: $0.15
- T14: <$0.01
- T15: $0.15
- T16: $0 (only fails)
- ≈ $0.45 total

Skip T12 (video, $3.20) in manual walkthrough — let release CI handle it on tag.
