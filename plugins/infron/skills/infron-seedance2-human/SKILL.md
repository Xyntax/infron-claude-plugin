---
name: infron-seedance2-human
description: Generate a talking-head / portrait video from ONE virtual face using Infron's Seedance 2.0 virtual-portrait-reference-to-video model (the "人脸版" variant). Trigger with /infron-seedance2-human, or when the user wants a single-character portrait driven by one face image (identity preserved, optional speech/audio). Requires a public URL of a NON-real (illustrated / 3D / stylized) portrait — real-person photos are rejected by the model's privacy filter.
---

# Infron Seedance 2.0 — Virtual Portrait → Video (人脸版)

Drives the model **`bytedance/seedance-2.0/virtual-portrait-reference-to-video`**
through the `mcp__infron__video_reference` tool: one face image in → a video of
that character moving / speaking out, identity preserved.

Anything the user types after `/infron-seedance2-human` is their request —
treat any URL in it as the reference image and the rest as the prompt.

## When to use this vs. the general reference model
- **This skill (virtual-portrait):** a SINGLE portrait / talking-head from one face. Best for an avatar that looks at camera, emotes, or speaks.
- **General reference-to-video** (`bytedance/seedance-2.0/reference-to-video`, same tool, default model): when there are up to 9 reference images (character + outfit + product) to keep consistent. Use that model id instead.

## ⚠️ The one hard constraint — no real people
The virtual-portrait model runs an upstream privacy / anti-deepfake filter. A
reference that looks like a real human is rejected with
`InputImageSensitiveContentDetected`. The face MUST be clearly **virtual**:
illustrated, anime, 3D-rendered / CGI, or a stylized avatar. If the user hands
you a real selfie or photo, stop and say it will be rejected — then offer Path B
below (generate a virtual portrait first).

## What you need
1. **One reference image as a PUBLIC https URL.** Local file paths are NOT supported by the model. GCS URLs returned by `mcp__infron__image` work directly as references.
2. **A prompt** describing what the character does — motion, expression, camera, and (if it should talk) the exact line to speak.

## Step 1 — Get a usable reference URL
- **Path A — user gave a public image URL:** use it. Sanity-check it's a virtual/illustrated portrait, not a real photo.
- **Path B — user described a character, has no image, OR handed a real photo / local file:** generate a virtual portrait first with `mcp__infron__image` (default `google/nano-banana-pro-text-to-image`, ~$0.15). Prompt it for a non-photoreal look, e.g. *"3D-rendered stylized portrait of <description>, CGI character, not photorealistic, front-facing"*. Use the returned GCS URL as the reference. Tell the user this adds ~$0.15.
- **Local file, no public URL, no description:** the plugin can't upload local files. Ask for a public URL, or offer Path B.

## Step 2 — Pick parameters (Seedance cheat-sheet)
| Param | Allowed values | Default for a portrait |
|---|---|---|
| `model` | — | `bytedance/seedance-2.0/virtual-portrait-reference-to-video` (faster/cheaper: prefix `…/fast/…`) |
| `duration` (string) | `"4"`–`"15"` or `"auto"` | `"5"` |
| `resolution` | `"480p"`, `"720p"` | `"720p"` |
| `aspect_ratio` | `21:9`,`16:9`,`4:3`,`1:1`,`3:4`,`9:16` | `"9:16"` (vertical frames a face best; use `3:4`/`16:9` if asked) |
| `generate_audio` | bool | `true` if the portrait should speak, else `false` |

## Step 3 — Confirm cost, then generate
Seedance ≈ **$0.153/sec** at 720p — e.g. a 5s clip ≈ **$0.76** (480p is cheaper;
Path B adds ~$0.15 for the portrait). **Quote the number and get an explicit
"yes" in conversation BEFORE setting `confirmed: true`.** The tool hard-blocks
without it (`confirmation_required`).

Call shape:
```
mcp__infron__video_reference({
  model: "bytedance/seedance-2.0/virtual-portrait-reference-to-video",
  reference_image_urls: ["https://.../virtual-portrait.png"],   // exactly 1 for a portrait
  prompt: "<motion + expression + camera + line to speak>",
  duration: "5",
  resolution: "720p",
  aspect_ratio: "9:16",
  generate_audio: true,            // only if it should talk
  confirmed: true,                 // ONLY after the user confirms the cost
  output_path: "./infron-seedance2-human-<timestamp>.mp4"   // optional
})
```
The tool submits the job, polls until done, downloads the MP4, and returns
`saved` (local path), `url`, `task_id`, and the true `actual_cost_usd`.

## Step 4 — Deliver
Report the saved file path, the playable `url`, and the `actual_cost_usd`
(prefer it over the estimate — it's the real charge). The MP4 is on disk at the
returned path.

## Errors → fixes
- `need_setup: true` → run the `infron-setup` skill to save an API key, then retry.
- `InputImageSensitiveContentDetected` → the reference looked like a real person. Switch to a virtual/illustrated portrait (Path B).
- `confirmation_required` → you passed `confirmed` without confirming the cost first; quote the price, get a yes, retry.
- `bad_request` on duration/resolution/aspect_ratio → the tool returns the allowed set; re-pick from the cheat-sheet (durations are STRINGS).
