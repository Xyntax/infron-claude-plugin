# E2E results — 2026-05-26

## Automated (driven by Claude in this session)

| Test | Result | Cost | Notes |
|---|---|---|---|
| T10 — `/plugin marketplace add Xyntax/infron-claude-plugin` + `/plugin install infron@infron-tools` | ✅ PASS | $0 | Both commands succeed via `claude plugin` CLI. Cached at `~/.claude/plugins/cache/infron-tools/infron/0.1.0`. `node_modules` auto-installed during install. |
| MCP server boot (installed cache) | ✅ PASS | $0 | `initialize` returns `serverInfo`. `tools/list` returns all 6 tools with correct schemas. |
| `infron__list_models` (installed cache) | ✅ PASS | $0 | Returned 396 models, filter `nano-banana` matched 6. |
| `infron__image` (installed cache, real API) | ✅ PASS | $0.15 | Real call to `nano-banana-pro-text-to-image`. 278KB PNG saved to test dir. |
| T15-server — `need_setup` shape when no key configured | ✅ PASS | $0 | `image` returns `{error_type: "need_setup", need_setup: true}` shape. |
| Video confirmation gate — missing `confirmed` | ✅ PASS | $0 | Returns `confirmation_required`, no network call. |
| Video confirmation gate — `confirmed: false` | ✅ PASS | $0 | Returns `confirmation_required`. |
| Video duration validation — integer | ✅ PASS | $0 | Returns `bad_request` before network call. |
| Video duration validation — `"8"` (no `s`) | ✅ PASS | $0 | Returns `bad_request`. |
| `infron__save_config` — empty key | ✅ PASS | $0 | Returns `bad_request`, no network. |
| `infron__save_config` — bad key | ✅ PASS | $0 | Hits `/v1/models`, gets 401, returns `auth_failed`, does NOT save. |
| `infron__check_setup` — no key | ✅ PASS | $0 | Returns `configured: false, source: null`. |

Total spent in automated E2E: **$0.15**.

## Manual (need your real Claude terminal — auth required for `claude -p`)

These can't be automated from my Claude Code Desktop session because spawning a
fresh `claude -p` subprocess fails with "Not logged in". Run these in a
terminal where you're authenticated.

### Setup

```sh
mkdir -p /tmp/infron-e2e-manual && cd /tmp/infron-e2e-manual
claude
```

Plugin is already installed at user scope, so it'll be picked up.

### T11 — Image with "infron" keyword

```text
Use infron to draw a small red circle on white background, 1:1 aspect.
```

**Pass criteria:**
- Claude calls `mcp__infron__image` (visible in the tool-call UI)
- A PNG appears in cwd named `infron-image-*.png`
- Tool result shows `"model": "google/nano-banana-pro-text-to-image"`, `cost: $0.15`

### T13 — Hijack: "draw" without infron keyword

```text
Draw an image of a green square.
```

**Pass criteria:**
- Claude STILL calls `mcp__infron__image` (because the `infron-defaults` skill applies)
- Another PNG in cwd
- Cost: $0.15

### T14a — Chat NOT hijacked

```text
Hello, how are you today?
```

**Pass criteria:**
- Claude responds in plain text
- NO call to `mcp__infron__chat`
- Cost: $0

### T14b — Chat opt-in

```text
Use infron chat with google/gemini-2.5-flash to say the word "pong" in one word.
```

**Pass criteria:**
- Claude calls `mcp__infron__chat` with `model: "google/gemini-2.5-flash"`
- Returns a one-word reply
- Cost: <$0.01

### T15 — Full setup-skill flow (needs interactivity)

Move your INFRON_API_KEY out of the way so the plugin can't find it:

```sh
# In the same terminal where you'll start claude:
unset INFRON_API_KEY
# (or temporarily comment out the line in ~/.zshrc and restart the shell)
# Verify:
echo "key set? ${INFRON_API_KEY:-no}"
```

Start a fresh claude session, then prompt:

```text
Use infron to draw a blue triangle.
```

**Pass criteria:**
- `mcp__infron__image` returns `need_setup: true`
- Claude triggers the `infron-setup` skill
- Claude tells you to open https://infron.ai/dashboard/apiKeys and paste a key back
- After you paste, `mcp__infron__save_config` runs, verifies via `/v1/models`, writes `~/.infron/config`
- Image generates successfully

Cost: $0.15.

### T17 — Uninstall removes routing

```sh
claude plugin uninstall infron@infron-tools
```

Restart claude session. Prompt:

```text
Draw an image of a sunset.
```

**Pass criteria:**
- NO `mcp__infron__*` call (the server is gone)
- Claude either declines or uses a different image tool

### Cleanup

```sh
# If you commented out INFRON_API_KEY in zshrc, uncomment it
source ~/.zshrc

# Remove the temp test dir
rm -rf /tmp/infron-e2e-manual

# Reinstall the plugin (if you uninstalled in T17 and want to keep using it)
claude plugin install infron@infron-tools
```

## Skipped

- **T12 (Veo video, $3.20)** — only runs on `git tag v*.*.*` push via release.yml.
- **T16 (invalid key path)** — covered server-side by `save_config: rejects 401? error_type = auth_failed` above. Full UX flow is similar to T15.
