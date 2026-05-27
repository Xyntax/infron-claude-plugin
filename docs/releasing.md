# Releasing

How updates flow from `git push` to user installs.

## Two distribution channels

| Channel | Trigger | What it does | User-visible version |
|---|---|---|---|
| **Continuous delivery** | Every `git push` to `main` | New commit lands; users on next Claude session start auto-update via marketplace refresh | 12-char commit SHA (e.g. `d9f13c2e1817`) |
| **Tagged release** | `git push origin vX.Y.Z` | Triggers `.github/workflows/release.yml`: runs full suite incl. $5.50 Veo verification. If green, publishes a GitHub Release with auto-generated notes | Same SHA (tag is human-readable label only) |

Both channels deliver the same code. Tags exist for:
- Communicating major changes to users
- Gating the expensive Veo test (only fires on tags, not every push)
- A scannable changelog at [Releases](https://github.com/Xyntax/infron-claude-plugin/releases)

## How users get updates

**Auto** (preferred — happens at session startup, no action required):

Claude Code refreshes registered marketplaces in the background at the start
of every session. If a commit lands on `main` between sessions, the user's
plugin updates automatically. No restart loop, no chat prompt.

**Manual** (force-update mid-session):

Paste into any Claude Code Desktop chat:

```text
Update the Infron plugin: run `claude plugin marketplace update infron-tools && claude plugin update infron@infron-tools` in Bash. Then tell me to restart Claude.
```

The user clicks Allow on the Bash permission, the CLI pulls latest, Claude
prompts the user to restart. Necessary one-time for anyone who installed
before commit `d9f13c2` (the version-omission fix).

## Cutting a tagged release

When you want to broadcast a "new features" announcement and run the full
$5.50 Veo verification as a safety net:

```sh
# From the repo root, on main
git tag -a v0.2.0 -m "Image-to-image, video variants, async fix"
git push origin v0.2.0
```

What happens automatically:

1. `.github/workflows/release.yml` fires
2. Runs unit tests, integration tests (~$0.24), release tests (~$5.50 — full Veo verification)
3. If any test fails: no release is published. Fix and re-tag.
4. If all pass: creates a GitHub Release at `/releases/tag/v0.2.0` with auto-generated notes from commits since the previous tag.

The release shows up in the Releases page; users don't need to do anything
different — the auto-update mechanism still uses the commit SHA on `main`,
so they're already on the latest code by the time the release publishes.

## Semantic versioning convention

We loosely follow SemVer for tags:

- **Patch (`v0.2.1`)** — bug fixes, doc tweaks, no new tools or breaking changes
- **Minor (`v0.3.0`)** — new tool, new model support, new skill
- **Major (`v1.0.0`)** — breaking change to tool input/output schemas, removed tools

Pre-1.0, breaking changes can also land in minor bumps if the affected
surface is documented as experimental.

## Pre-release checks

Before tagging, run locally:

```sh
cd plugins/infron
npm run test:unit                                            # ~0.5s
INFRON_API_KEY=sk-... INFRON_RUN_INTEGRATION=1 npm run test:integ   # ~$0.24
# Optional: full Veo dry-run if you're nervous about a recent Veo refactor:
INFRON_API_KEY=sk-... INFRON_RUN_RELEASE=1 npm run test:release     # ~$5.50
```

If integration passes locally, the tagged release pipeline is very likely
to pass too (same tests, same environment shape).

## What NOT to do

- ❌ Don't add `"version": "x.y.z"` to `plugins/infron/.claude-plugin/plugin.json`. The omitted field is intentional — adding it back pins users to that version (see the v0.1.0 incident).
- ❌ Don't manually edit GitHub Release notes for a tag that the workflow auto-generated; re-running the workflow overwrites them. If you need custom notes, edit them after the workflow has fully completed.
- ❌ Don't tag a release without verifying integration tests pass locally — saves the $5.50 Veo run from being wasted on a known-broken commit.
