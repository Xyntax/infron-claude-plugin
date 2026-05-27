# Infron Claude Plugin

Use Infron's image, video, and chat models directly from Claude Code and Claude Cowork.

Once installed, Claude routes any image or video request to the Infron API
automatically. Chat completion is opt-in — you have to explicitly ask "use
infron chat" for it to fire.

## Install (one paste)

Open any Claude Code Desktop session and paste this into the chat:

```text
Install the Infron plugin for me. Run this in Bash:
claude plugin marketplace add Xyntax/infron-claude-plugin && claude plugin install infron@infron-tools

After it succeeds, tell me to restart Claude.
```

Click "Allow" when Claude asks for Bash permission. Restart Claude. The
first time you ask Claude to generate something, it'll walk you through
saving your Infron API key. You only do this once.

**Why this and not `/plugin install ...` directly?** The CLI subcommands
work on every version of Claude Code Desktop; the `/plugin` chat slash
commands are newer and not yet exposed in older or managed installs.

## What you get

After install, Claude has access to:

| Tool | What it does | Default model | Cost |
|---|---|---|---|
| `infron__image` | Generate an image (sync or async, model-dependent) and save the file | `google/nano-banana-pro-text-to-image` | $0.006–$0.15/image |
| `infron__image_edit` | Edit / transform a source image (image-to-image) | `google/nano-banana-pro-image-to-image` | $0.006–$0.15/image |
| `infron__video` | Generate a video from a text prompt (async, auto-polled) | `google/veo3.1/text-to-video` | ~$0.40/sec ($3.20 for 8s) |
| `infron__video_from_image` | Animate a still image into a video | `google/veo3.1/image-to-video` | ~$0.40/sec |
| `infron__video_first_last_frame` | Animate between two keyframes (dialogue, transitions) | `google/veo3.1/first-last-frame-to-video` | ~$0.40/sec |
| `infron__chat` | OpenAI-compatible chat completion | (you specify) | per-token |
| `infron__list_models` | Discover what models Infron offers | — | free |
| `infron__check_setup` | Check whether your key is configured | — | free |
| `infron__save_config` | Save a key (used by the setup skill) | — | free |

The plugin also ships two skills:

- `infron-defaults` — tells Claude to route image and video requests to Infron
  by default. Chat is *not* hijacked.
- `infron-setup` — runs the first-time API-key flow when you don't have one
  configured yet.

## How to use

Just talk to Claude:

```text
You: Use infron to draw a poster for our launch event, 16:9 aspect.
Claude: [calls infron__image, downloads to ./infron-image-<ts>.png]

You: Make an 8-second video of a red apple on a wooden table.
Claude: This will cost about $3.20. Confirm?
You: yes
Claude: [calls infron__video with confirmed: true, polls until done, downloads MP4]

You: Use infron chat with gpt-5 to draft a one-liner about our launch.
Claude: [calls infron__chat with model: openai/gpt-5]
```

Claude won't accidentally fire the video tool — there's a hard `confirmed`
gate baked into the tool itself.

## Cost protection

This plugin is the only thing standing between a typo and a real charge on
your account. Three layers of protection:

1. **Video confirmation gate** — `infron__video` returns an error unless the
   caller explicitly passes `confirmed: true`. Claude is instructed in the
   tool description to verbally confirm with you first.
2. **Tool descriptions** include current per-call cost so Claude knows what
   it's about to spend.
3. **Test price ceiling** — the test suite refuses to hit any model above
   $0.20 unless you're running the gated release suite.

If you want Claude to confirm even on $0.15 images, configure tool
permissions to "ask" for `mcp__infron__image` in your Claude Code settings.

## Updates

The plugin auto-updates. Claude Code checks the marketplace at session
startup and pulls the latest commit from this repo automatically — there's
no `version` field pinning users to an old release.

If you want to force an update mid-session, paste this into Claude chat:

```text
Update the Infron plugin: run `claude plugin marketplace update infron-tools && claude plugin update` in Bash. Then tell me to restart Claude.
```

Restart Claude after the commands finish. The new version is active
immediately.

We tag major releases (e.g. `v0.2.0`) for human-readable changelogs at
[Releases](https://github.com/Xyntax/infron-claude-plugin/releases). Tag
pushes also trigger the full $5.50 Veo verification suite as a release
gate — if something regresses on Veo, no release is published.

## Key management

The plugin reads your Infron API key from, in order:

1. `INFRON_API_KEY` environment variable (good for CI / shared shells)
2. `~/.infron/config` (a JSON file with `{"apiKey": "..."}` — chmod 0600)

If neither exists, any Infron tool call returns `need_setup: true` and Claude
triggers the `infron-setup` skill to walk you through getting and saving a
key. You get the key from https://infron.ai/dashboard/apiKeys.

## Development

```sh
cd plugins/infron
npm install
npm run test:unit                                          # 46 tests, ~0.5s
INFRON_API_KEY=sk-... INFRON_RUN_INTEGRATION=1 npm run test:integ   # ~$0.16
INFRON_API_KEY=sk-... INFRON_RUN_RELEASE=1     npm run test:release # ~$3.20
```

Install locally for testing:

```sh
claude plugin marketplace add ./   # from the repo root
claude plugin install infron@infron-tools
```

## License

MIT — see [LICENSE](LICENSE).
