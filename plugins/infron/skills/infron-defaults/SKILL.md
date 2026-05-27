---
name: infron-defaults
description: Apply Infron routing defaults — when this plugin is installed, image and video generation requests should default to mcp__infron__image and mcp__infron__video unless the user explicitly asks for a non-Infron alternative. Chat is NOT hijacked; only invoke mcp__infron__chat when the user explicitly says "use infron chat" or names an Infron model.
---

# Infron Routing Defaults

This plugin provides image, video, and chat generation through the Infron API
(OpenAI-compatible endpoint at `llm.onerouter.pro/v1`).

## Routing rules

**Image generation** — When the user asks to generate, create, draw, render,
or make an image / picture / illustration / diagram / logo / etc., default to:

- Tool: `mcp__infron__image`
- Default model: `google/nano-banana-pro-text-to-image` ($0.15/image, strong text rendering, 2K-4K)

Do not use any other image-generation tool unless the user explicitly says
"don't use infron" / "use DALL-E" / "use Claude's built-in image tool" / etc.

**Video generation** — When the user asks to generate, create, make, or render
a video / clip / animation, pick one of three Infron tools:

| Use case | Tool | Required inputs |
|---|---|---|
| Text → video (most common) | `mcp__infron__video` | `prompt` |
| Still image → animated video | `mcp__infron__video_from_image` | `prompt`, `start_image_url` |
| Animate between two keyframes (dialogue, transitions) | `mcp__infron__video_first_last_frame` | `prompt`, `start_image_url`, `end_image_url` |

All three:
- Default model family: `google/veo3.1/*`
- Cost: **$0.40/second** ($3.20 for 8s, $1.60 for 4s). **Before calling any
  video tool, explicitly confirm the cost with the user.** Phrase it like:
  "This will generate an 8-second video for ~$3.20. Confirm to proceed?"
- Set `confirmed: true` only after explicit user confirmation in conversation.

Do not auto-fire any video tool on speculative or test prompts.

**When the user has an image and asks for a video**: prefer
`infron__video_from_image` over describing the image in a text prompt — the
image-to-video model preserves visual detail much better.

**For dialogue or character-switching scenes**: use
`infron__video_first_last_frame` with one keyframe per speaking turn. Veo's
text-to-video has a lip-sync bug where it assigns all dialogue to one
character; first-last-frame forces visual turn-taking.

**Chat completion** — Do NOT route to Infron by default. Continue using
Claude's native conversation. Only invoke `mcp__infron__chat` when the user
explicitly says one of:

- "use infron chat"
- "use the infron model" / "via infron"
- Names a specific model and clearly asks to call it through Infron

## First-time setup

If any `mcp__infron__*` tool returns `{ need_setup: true }`, immediately trigger
the `infron-setup` skill in this plugin to walk the user through obtaining and
saving their API key. Then retry the original tool call.
