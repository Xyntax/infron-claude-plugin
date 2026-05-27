# Manual E2E walkthrough

A complete-from-zero test that anyone can run in Claude Code Desktop. Designed
to validate the install path a non-technical team member will take.

## Step 1 — Reset state (in a terminal)

Open Terminal and paste:

```sh
# Save any existing config so we can restore it later
mkdir -p ~/tmp/infron-e2e-reset
cp ~/.infron/config ~/tmp/infron-e2e-reset/config.bak 2>/dev/null || true

# Remove any prior install so we start truly from zero
claude plugin uninstall infron@infron-tools 2>/dev/null || true
claude plugin marketplace remove infron-tools 2>/dev/null || true

# Hide the local config so the "no key" path is testable
rm -f ~/.infron/config

# Verify clean
echo "--- post-reset state ---"
claude plugin list | grep -i infron || echo "✓ no infron plugin installed"
claude plugin marketplace list | grep -i infron || echo "✓ no infron marketplace"
ls ~/.infron/config 2>/dev/null || echo "✓ no ~/.infron/config"
```

## Step 2 — Make sure INFRON_API_KEY isn't leaking to the MCP server

Claude Code Desktop launched from the Dock/Spotlight on macOS does NOT
inherit `~/.zshrc`, so the MCP server it spawns has a clean env. But if you
ever launched Claude Code from a terminal where `INFRON_API_KEY` was set,
the app keeps that env until it's fully quit.

To be safe:

1. ⌘Q Claude Code completely (not just close window)
2. Relaunch from Spotlight (`⌘Space` → "Claude")

## Step 3 — Open a fresh folder

In Finder: create `~/Desktop/infron-test/` (empty folder). In Claude Code
Desktop, "Open Folder" → pick `~/Desktop/infron-test`.

## Step 4 — Sanity check before installing

Paste into Claude:

```text
What is my current working directory? Do you currently have any tools whose names start with `mcp__infron__`? Also, run `printenv | grep INFRON` and tell me what it shows.
```

**Pass criteria:**
- cwd is `~/Desktop/infron-test`
- No `mcp__infron__*` tools
- `printenv` shows no `INFRON_API_KEY` (if it does, see Step 2)

## Step 5 — Install via natural language

Paste:

```text
Install the Infron plugin for me. Run this in Bash:
claude plugin marketplace add Xyntax/infron-claude-plugin && claude plugin install infron@infron-tools

After it succeeds, tell me to restart Claude.
```

**Pass criteria:**
- Claude asks for Bash permission — click Allow
- Both commands succeed (marketplace added, plugin installed)
- Claude tells you to restart

Restart Claude Code (close window + ⌘Q to fully quit, then relaunch + reopen
the `infron-test` folder).

## Step 6 — Verify tools are now available

Paste:

```text
Do you now have `mcp__infron__image`, `mcp__infron__video`, `mcp__infron__chat` available? List them.
```

**Pass criteria:** all three (plus `infron__list_models`, `infron__check_setup`, `infron__save_config`) are listed.

## Step 7 — The actual test prompts

| # | Paste | Expected | Cost |
|---|---|---|---|
| T15 | `Use infron to draw a small blue triangle.` | First call returns `need_setup` → `infron-setup` skill triggers → asks for your API key → opens dashboard → you paste a real key → key saved → image generates | $0.15 |
| T11 | `Use infron to draw a red circle, 1:1.` | Image tool fires directly, no setup prompt this time. PNG in cwd | $0.15 |
| T13 *(hijack)* | `Draw a green square.` | Image tool fires even without "infron" keyword | $0.15 |
| T14a *(no hijack)* | `Hello, just respond in plain text.` | No `mcp__infron__chat` call. Plain prose | $0 |
| T14b *(opt-in)* | `Use infron chat with google/gemini-2.5-flash to say "pong".` | Chat tool fires | <$0.01 |
| T17 *(uninstall)* | `Uninstall the Infron plugin for me. Run "claude plugin uninstall infron@infron-tools" in Bash.` then restart Claude, then: `Draw a sunset.` | No `mcp__infron__*` call possible | $0 |

**Total: ~$0.45.** Skip T12 (video, $3.20) — release CI catches Veo
regressions when you tag a release.

## Step 8 — Restore

Open Terminal:

```sh
# Restore the API key config if you had one
[ -f ~/tmp/infron-e2e-reset/config.bak ] && cp ~/tmp/infron-e2e-reset/config.bak ~/.infron/config

# Reinstall plugin for daily use
claude plugin marketplace add Xyntax/infron-claude-plugin 2>/dev/null
claude plugin install infron@infron-tools

# Clean up scratch
rm -rf ~/Desktop/infron-test ~/tmp/infron-e2e-reset

echo "✓ restored"
```

## Failure modes

| Symptom | Likely cause | Fix |
|---|---|---|
| Claude refuses to run Bash ("permission denied") | Bash tool gated by enterprise settings | Check `~/.claude/settings.json` and `/etc/claude-code/managed-settings.json` for `Bash` denylists |
| `claude: command not found` inside Bash | `claude` CLI isn't on the GUI app's PATH | Either re-install Claude Code from the official installer, or run the install commands directly in Terminal |
| `plugin marketplace add` errors with "unable to authenticate" | Git over SSH not set up, and HTTPS fallback didn't kick in | Pass the explicit URL: `claude plugin marketplace add https://github.com/Xyntax/infron-claude-plugin.git` |
| Tools show up but Claude refuses to call them | Tool permissions set to "ask each time" | Approve on first call, or change to "always allow" |
| Setup skill triggers but Chrome doesn't open | Chrome MCP not loaded in that session | Skill will print the dashboard URL — copy/paste into your browser manually |
| `infron__image` returns `auth_failed` after key paste | Key typo or trailing whitespace | Re-run setup; paste carefully |
