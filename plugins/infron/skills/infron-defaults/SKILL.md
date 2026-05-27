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
a video / clip / animation, default to:

- Tool: `mcp__infron__video` (text-to-video) or `mcp__infron__video_from_image` (image-to-video)
- Default model: `google/veo3.1/text-to-video`
- Cost: **$0.40/second** ($3.20 for 8s clip). **Before calling the video tool,
  explicitly confirm the cost with the user.** Phrase it like:
  "This will generate an 8-second video for ~$3.20. Confirm to proceed?"

Do not auto-fire the video tool on speculative or test prompts.

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
