---
name: infron-setup
description: One-time onboarding to obtain an Infron API key and save it to ~/.infron/config. Triggered automatically when any Infron tool returns need_setup=true, or when the user explicitly asks to set up / configure / log in to Infron.
---

# Infron API key setup

The Infron plugin needs an API key to call the Infron service. Walk the user
through these steps:

## Step 1 — Explain

Tell the user, briefly:

> Infron needs an API key. I'll open the Infron dashboard so you can copy one,
> then I'll save it locally to `~/.infron/config` (readable only by you).

## Step 2 — Open the dashboard

Open https://infron.ai/dashboard/apiKeys in the user's browser. Prefer the
Chrome MCP if available (`mcp__Claude_in_Chrome__navigate`); otherwise tell the
user the URL to open manually.

Walk them through creating a key (if they have none) and copying it.

## Step 3 — Receive the key

Ask the user to paste the key into the conversation. The key looks like a long
alphanumeric string (e.g., starting with `sk-` or similar). Do NOT echo the key
back to the user after they paste it; treat it as a credential.

## Step 4 — Save it

Call `mcp__infron__save_config` with `{ apiKey: "<the key>" }`. The tool will:
- Create `~/.infron/` if needed
- Write `~/.infron/config` with permissions `0600` (user-read-only)
- Verify the key by calling `/v1/models` once
- Return success or a structured error

If verification fails (401 / invalid key), tell the user the key didn't work
and ask them to re-check or generate a new one.

## Step 5 — Retry

Once the key is saved, retry the original tool call that triggered setup.
The user should see their image / video / chat result without needing to
say anything else.

## Notes

- Never log the key to the conversation, never write it to any file other
  than `~/.infron/config`, never include it in error messages back to the user.
- If the user already has `INFRON_API_KEY` set in their environment, the
  plugin will pick that up automatically — you don't need setup. (The tool's
  initial `need_setup` check covers this.)
