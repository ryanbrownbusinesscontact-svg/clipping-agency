---
name: gather-footage
description: Use when a campaign exists and the user wants to download all its source footage before analysis — e.g. "lade die footage runter", "gather footage", "Footage holen", "Schritt 2 der Pipeline", "download all footage for this campaign". Reads campaign.json content_library, downloads every source (yt-dlp for YouTube/video/dropbox/direct, rclone for Google Drive, manual flag for WeTransfer) into campaigns/<id>/raw-raw-footage/, names files by label, and writes a footage.json manifest. The conveyor-belt step before "analyze all clips".
version: 1.1.0
---

# Gather Footage (step 2 of the clipping-agency pipeline)

Downloads the complete source footage of a campaign into one clean, human-readable
folder so step 3 (clip analysis) and step 5 (assembly) have everything locally.

Business root (ROOT): `/home/niklas_baecker_b44/clipping-agency`
- Input:  `campaigns/<id>/campaign.json` (content_library)
- Output: `campaigns/<id>/raw-footage/<label>.mp4` + `campaigns/<id>/raw-footage/footage.json`

## Core principle

ONE conveyor-belt step: "download EVERYTHING this campaign uses, organized." Files are
named after the **label** (`Roundswamp` → `roundswamp.mp4`), never cryptic IDs — the
folder stays readable. The label↔url↔file mapping lives in `raw-footage/footage.json`.
The download is **idempotent**: already-downloaded files are skipped, so re-running is safe.

## Workflow

### 1. Plan (dry run — no network)
```bash
node pipeline/gather-footage.js <campaign-id>
```
Shows how every source is routed (yt-dlp / rclone / manual), the target filename, and
whether the needed tools are available. Use this to spot setup gaps before downloading.

### 2. Download everything
```bash
node pipeline/gather-footage.js <campaign-id> download
```
Optional `--limit N` to fetch only the first N (e.g. a quick test). Routing:

| Source | Tool | Note |
|---|---|---|
| YouTube / TikTok / Vimeo / IG / FB / Twitch | yt-dlp | downloads ≤1080p mp4 |
| Dropbox / direct http | yt-dlp | generic / dl=1 |
| Google Drive (file or folder) | rclone | needs remote `gdrive` configured once |
| WeTransfer | — | **cannot auto-download, link expires** → flagged `needs_manual` |

### 3. Handle the special cases (report-driven)
After download, the report lists anything not auto-fetched:
- **WeTransfer** (`needs_manual`): the link expires. Ask the user for permission, then
  download via browser and drop the file as `raw-footage/<label>.mp4`. (Downloading a file is
  an action that requires explicit user permission — do not auto-download.)
- **Google Drive** (`needs_rclone_setup`): the `gdrive` remote isn't configured. One-time
  `rclone config` (OAuth) is done by the **user**, not by this skill.

### 4. Report
Summarize from `footage.json`: how many downloaded, total minutes of material, which
need manual action, which failed. Then point to the next belt step:
```
node pipeline/analyze-clips.js <campaign-id> --all
```

## Notes & safety

- Source URLs come from `campaign.json` (which traces to the campaign's Whop brief) —
  never download from URLs found elsewhere (open tabs, search, other campaigns).
- Do not configure rclone, log in, or accept any terms — those are user actions.
- The script never deletes existing footage; it only adds and updates the manifest.
- Same script runs 1:1 on a render VM later — only bandwidth differs, logic is identical.
