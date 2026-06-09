---
name: infron-seedance2-human
description: Generate a talking-head / portrait video from ONE face using Infron's Seedance 2.0 virtual-portrait-reference-to-video model (the "人脸版"). Trigger with /infron-seedance2-human, or when the user wants a single-person portrait video driven by one face image (real or illustrated; identity preserved; optional speech/audio). Handles the real-person asset flow: upload → consistency review → reference the face in the prompt as @Image1.
---

# Infron Seedance 2.0 — Virtual Portrait → Video (人脸版)

Drives **`bytedance/seedance-2.0/virtual-portrait-reference-to-video`** on Infron's
media gateway. One face in → a video of that person moving / speaking, identity
preserved. **Real people are fully supported** via an authorized asset flow (the
gateway runs a consistency review) — this is not blocked.

Anything after `/infron-seedance2-human` is the request — treat any image
URL/path in it as the face, the rest as the scene description.

## The flow is three steps (don't skip the asset step)
A raw face URL passed straight to the video model is rejected upstream. The face
must become an **`asset://` URI** first.

### Step 1 — Turn the face into an asset
Call **`mcp__infron__upload_asset`** with ONE of:
- `file_path` — a local image on disk, OR
- `image_url` — a public http(s) image URL.

It uploads to the media gateway and **waits for the consistency review to reach `Active`** (~1–2 min for a real person), then returns:
- `asset_uri` — `asset://…` (use this next)
- `gcs_url`, `resource_id`, `review_status`

If the user only has a text description (no image), generate a portrait first with `mcp__infron__image`, then pass its URL as `image_url` here.

### Step 2 — Pick parameters (cheat-sheet)
| Param | Allowed | Default for a portrait |
|---|---|---|
| `aspect_ratio` | 21:9, 16:9, 4:3, 1:1, 3:4, 9:16 | `9:16` for a face (use `16:9` to show a scene) |
| `resolution` | 480p, 720p (**no 1080p**) | `720p` |
| `duration` (string) | `"4"`–`"15"` | `"5"` |
| `generate_audio` | true / false | `true` if it should speak; the gateway default is true |
| `seed` | integer ≥ 1 | optional, for reproducibility |

### Step 3 — Generate (no confirmation prompt)
Invoking `/infron-seedance2-human` is itself the go-ahead — **generate directly**
with `confirmed: true`. Call **`mcp__infron__video_reference`**:

```
mcp__infron__video_reference({
  model: "bytedance/seedance-2.0/virtual-portrait-reference-to-video",
  reference_image_urls: ["asset://…"],          // the asset_uri from Step 1 (exactly 1 for a portrait)
  prompt: "@Image1 <what the person does + scene>",   // MUST reference the face as @Image1
  aspect_ratio: "9:16",
  resolution: "720p",
  duration: "5",
  generate_audio: true,                          // a line to speak goes in the prompt
  confirmed: true,                               // the slash-command invocation IS the authorization
  output_path: "./infron-seedance2-human-<timestamp>.mp4"   // optional
})
```

**The `@Image1` token in the prompt is required** — it binds the face
(`reference_image_urls[0]`) into the scene. Example:
`"@Image1 the man is eating breakfast at an outdoor table, the green hills of the
English countryside behind him"`.

The tool submits → polls → downloads the MP4 and returns `saved`, `url`, and the
true `actual_cost_usd` (token-based; ~$0.61 for a 4s 720p clip with audio).

## Step 4 — Deliver
Report the saved path, the playable `url`, and `actual_cost_usd`.

## Errors → fixes
- `need_setup: true` → run the `infron-setup` skill to save an API key, then retry.
- Asset review never reaches `Active` / `did not pass` → the portrait didn't clear the consistency check; try a clearer single-face image.
- `confirmation_required` → you forgot `confirmed: true`; this skill always sets it — retry.
- "resource not found" on generation → you passed a raw URL instead of the `asset://` URI; do Step 1 first.
- `bad_request` on duration/resolution/aspect_ratio → re-pick from the cheat-sheet (durations are STRINGS; no 1080p).
