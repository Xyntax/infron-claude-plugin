# Team broadcast templates

Drop these into Feishu / Slack / email when the plugin ships.

The install path uses natural language + the Bash tool — it works on every
Claude Code Desktop version, including older ones where `/plugin` slash
commands aren't exposed in the chat box.

---

## URGENT — for anyone who installed before 2026-05-27

⚠️ A version-pinning bug shipped in v0.1.0 means existing installs are stuck on
the original release and missed every fix since (gpt-image-2 image generation,
3 Veo video tools, image-to-image, etc.). The fix is now live — to pick it up,
**every existing user needs to run this once**:

Paste into Claude Code Desktop chat:

```
Update the Infron plugin: run `claude plugin marketplace update infron-tools && claude plugin update infron@infron-tools` in Bash. Then tell me to restart Claude.
```

Click Allow, restart Claude. Future updates will be automatic at session
startup — this manual step is only needed once to escape the pinned version.

---

## Short version (Feishu DM / channel post)

> **Infron is now available inside Claude Code Desktop.**
>
> Open any Claude Code session and paste this into the chat:
>
> ```
> Install the Infron plugin for me. Run this in Bash:
> claude plugin marketplace add Xyntax/infron-claude-plugin && claude plugin install infron@infron-tools
>
> After it succeeds, tell me to restart Claude.
> ```
>
> Click "Allow" when Claude asks for Bash permission. Restart Claude. Done.
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

**Subject:** Try Infron from inside Claude Code

Hi team,

We've shipped a Claude Code plugin that gives everyone access to Infron's
image, video, and chat models from inside Claude Code Desktop. No more
bouncing between tools — you tell Claude what you want and it routes to
Infron automatically.

**Install (one paste, ~30 seconds):**

Open any Claude Code Desktop session and paste this into the chat:

```
Install the Infron plugin for me. Run this in Bash:
claude plugin marketplace add Xyntax/infron-claude-plugin && claude plugin install infron@infron-tools

After it succeeds, tell me to restart Claude.
```

Click "Allow" when Claude asks for Bash permission. Restart your Claude
Code session. The plugin is now active.

**First-time key setup:**

When you first ask Claude to generate an image or video, it'll walk you
through pasting an Infron API key. Get one from
https://infron.ai/dashboard/apiKeys. The key is saved to `~/.infron/config`
on your machine only — never uploaded anywhere.

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

---

## If the user's environment doesn't have a Bash tool

(Rare — but possible in heavily-restricted enterprise Claude Code installs.)

They'll need to run the install commands in Terminal directly:

```sh
claude plugin marketplace add Xyntax/infron-claude-plugin
claude plugin install infron@infron-tools
```

If they don't have the `claude` CLI at all, they need to install Claude Code
Desktop first from https://claude.com/code.
