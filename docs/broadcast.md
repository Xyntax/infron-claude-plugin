# Team broadcast templates

Drop these into Feishu / Slack / email when the plugin ships.

---

## Short version (Feishu DM / channel post)

> **Infron is now available inside Claude Code and Cowork.**
>
> You can ask Claude to generate images and videos using Infron's models,
> directly from any Claude session. Paste these two lines into Claude (Code
> or Cowork) — that's the entire install:
>
> ```
> /plugin marketplace add Xyntax/infron-claude-plugin
> /plugin install infron@infron-tools
> ```
>
> Then try: *"Use infron to draw a poster for our launch."* Claude will ask
> you for an Infron API key the first time — copy one from
> https://infron.ai/dashboard/apiKeys.
>
> Video generation costs ~$3.20 per 8-second clip; Claude will always confirm
> with you before charging. Image generation is ~$0.15 per image. Chat is
> opt-in (say "use infron chat" if you want it).
>
> Source + docs: https://github.com/Xyntax/infron-claude-plugin

---

## Long version (announcement email)

**Subject:** Try Infron from inside Claude

Hi team,

We've built a Claude plugin that gives the whole team access to Infron's
image, video, and chat models from inside Claude Code and Claude Cowork. No
more bouncing between tools — you tell Claude what you want, and it routes
to Infron automatically.

**Install (one-time, takes 30 seconds):**

Open Claude Code or Cowork. Paste these two lines:

```
/plugin marketplace add Xyntax/infron-claude-plugin
/plugin install infron@infron-tools
```

**First-time key setup:**

When you first ask Claude to generate an image or video, it'll walk you
through pasting an Infron API key. Get one from
https://infron.ai/dashboard/apiKeys. The key is saved to `~/.infron/config`
on your machine only.

**Try these:**

- *"Use infron to draw a poster, 9:16 portrait, for the launch event."*
- *"Generate an 8-second product video of [...]."* (Claude will confirm
  the $3.20 cost before firing.)
- *"List the infron image models."*

**Costs:**

| Operation | Approximate cost |
|---|---|
| Image (nano-banana-pro) | $0.15 each |
| Video (Veo 3.1, 8 seconds) | $3.20 |
| Chat completion | Per-token, varies by model |

You pay through your own Infron account. Top up at the dashboard.

**Help and feedback:**

- Source: https://github.com/Xyntax/infron-claude-plugin
- File a bug: https://github.com/Xyntax/infron-claude-plugin/issues
- DM me directly for anything urgent.

— Lawrence
