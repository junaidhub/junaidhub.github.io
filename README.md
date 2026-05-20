# JunaidHub

A lightweight, static dashboard hosted on **GitHub Pages** for quickly browsing notes, datasheets, code snippets, CSV component lists, and other reference material. No backend — everything is driven by a single `files.json` index that's regenerated locally with a Python script.

> **Live site:** https://junaidhub.github.io
> **Maintainer:** Junaid Sahibole

---

## Table of contents

1. [Features](#features)
2. [Project structure](#project-structure)
3. [Quick start](#quick-start)
4. [Adding content](#adding-content)
5. [Regenerating the index](#regenerating-the-index)
6. [Deployment](#deployment)
7. [`files.json` reference](#filesjson-reference)
8. [`notification.json` reference](#notificationjson-reference)
9. [Keyboard shortcuts](#keyboard-shortcuts)
10. [Customizing the UI](#customizing-the-ui)
11. [Troubleshooting](#troubleshooting)
12. [Roadmap](#roadmap)

---

## Features

- **Folder + file browser** — sidebar list and grid view of every folder under `data/`.
- **Per-file preview** — text/markdown, JSON, CSV (rendered as table), images, and PDF (in-page iframe).
- **Global search** (`/`) — searches file names *and* folder names across the whole index.
- **Light / dark theme** — toggle from the top bar or with `Ctrl + D`. Saved to `localStorage`.
- **Sort folders** — by recent activity, name, or file count.
- **"New" badges** — folders touched in the last 7 days are tagged automatically.
- **Per-file utilities** — copy link, open in new tab, download, copy raw text.
- **Notifications panel** — driven by `notification.json` with `info`/`success`/`warning`/`error` types.
- **Mobile-friendly** — sliding sidebar drawer + responsive grid.
- **No build step** — plain HTML, vanilla JS, Tailwind-free CSS using CSS variables.

---

## Project structure

```
junaidhub.github.io/
├── index.html              # Main dashboard
├── about.html              # Portfolio / about page
├── script.js               # UI logic (single file, no bundler)
├── assets/
│   └── style.css           # Theme + layout (light/dark via CSS variables)
├── data/                   # ALL your content lives here (one folder per topic)
│   ├── C and C++ Guide/
│   ├── Components list/
│   ├── Resources/
│   ├── Sandeep Sir Components/
│   └── WSL Commands/
├── files.json              # Auto-generated index (do not edit by hand)
├── notification.json       # Notifications panel content
├── generate_files_json.py  # Index generator
├── requirements.txt        # Python deps (stdlib only — file is informational)
├── Junaid Resume (2).pdf
└── README.md               # You are here
```

The site needs **no build tools**. Open `index.html` directly or push to GitHub Pages.

---

## Quick start

### View locally

The cleanest way is to serve via a tiny local HTTP server (so `fetch('files.json')` works):

```bash
# from the project root
python -m http.server 8000
```

Then open <http://localhost:8000>.

> Opening `index.html` by double-click (`file://`) will **fail** to load `files.json` in most browsers due to CORS. Always use a local server.

### Edit content

1. Drop your files into a folder under `data/` (create folders freely).
2. Run the generator (see [Regenerating the index](#regenerating-the-index)).
3. Reload the page.

---

## Adding content

### File types you can preview

| Type                          | Preview                              |
| ----------------------------- | ------------------------------------ |
| `txt`, `md`                   | Rendered inside a code block         |
| `csv`                         | Rendered as a sortable HTML table    |
| `json`                        | Pretty-printed JSON in a code block  |
| `png`, `jpg`, `jpeg`, `gif`, `webp`, `svg` | Inline image preview     |
| `pdf`                         | Embedded iframe viewer               |
| anything else                 | Download link                        |

### File naming tips

- Keep names short and descriptive — they show in the tab strip.
- Avoid trailing periods or extremely long sentences-as-filenames.
- Spaces and parentheses are fine — the UI uses safe attribute encoding.
- Skip these prefixes — the generator ignores them:
  - `.` (dotfiles, e.g. `.DS_Store`)
  - `~$` (Office lockfiles)
  - System junk: `Thumbs.db`, `desktop.ini`, `.DS_Store`

### Creating a new folder

Just `mkdir data/<Your Folder>` and drop files in. Re-run the generator.

---

## Regenerating the index

Whenever files change, run:

```bash
python generate_files_json.py
```

You'll see something like:

```
files.json written: J:\myfiles\junaidhub.github.io\files.json
  5 folders, 25 files, 11.2 MB total
```

That rewrites `files.json` with:

- per-file: `name`, `type`, `url`, `size`, `size_human`, `updated`
- per-folder: `folder`, `file_count`, `total_size`, `total_size_human`, `latest`, `files[]`
- root metadata: `generated_at`, `total_folders`, `total_files`, `total_size`, `total_size_human`

### Optional: run it automatically on every commit

Add a Git pre-commit hook (`.git/hooks/pre-commit`):

```bash
#!/bin/sh
python generate_files_json.py
git add files.json
```

Make it executable: `chmod +x .git/hooks/pre-commit`.

---

## Deployment

This repo is published with **GitHub Pages**.

1. Push to the `main` branch of `junaidhub.github.io` (a user/organization Pages repo).
2. In **Settings → Pages**, source = `main` / `(root)`.
3. The site is live at `https://junaidhub.github.io` within ~1 minute.

That's it — no Actions, no build step.

---

## `files.json` reference

```jsonc
{
  "generated_at": "2026-05-21T00:41:26",
  "root": "data",
  "total_folders": 5,
  "total_files": 25,
  "total_size": 11794896,
  "total_size_human": "11.2 MB",
  "folders": [
    {
      "folder": "C and C++ Guide",
      "file_count": 4,
      "total_size": 11277,
      "total_size_human": "11.0 KB",
      "latest": "2026-05-20T21:19:33",
      "files": [
        {
          "name": "C++ Functions.txt",
          "type": "txt",
          "url": "data/C and C++ Guide/C++ Functions.txt",
          "size": 2760,
          "size_human": "2.7 KB",
          "updated": "2026-05-20T21:19:33"
        }
      ]
    }
  ]
}
```

The UI **also accepts the legacy shape** (a plain array of folders) for backward compatibility, so you can downgrade safely.

---

## `notification.json` reference

```json
[
  {
    "title": "UI refresh",
    "message": "New dashboard with global search, dark mode, and per-file utilities.",
    "date": "2026-05-21",
    "type": "success"
  },
  {
    "title": "Maintenance window",
    "message": "Components sheet will be re-imported Friday.",
    "date": "2026-05-25",
    "type": "warning",
    "link": "https://example.com/details"
  }
]
```

| Field     | Required | Notes                                              |
| --------- | -------- | -------------------------------------------------- |
| `title`   | yes      | Bold heading                                       |
| `message` | yes      | Body text                                          |
| `date`    | yes      | ISO `YYYY-MM-DD` preferred; DD-MM-YYYY also parses |
| `type`    | no       | `info` / `success` / `warning` / `error`           |
| `link`    | no       | Adds an "Open ↗" link inline                       |

Dates are parsed with a flexible helper (`parseFlexibleDate` in `script.js`) so legacy `DD-MM-YYYY` still works, but new entries should use ISO.

---

## Keyboard shortcuts

| Key            | Action                          |
| -------------- | ------------------------------- |
| `/`            | Focus global search             |
| `Esc`          | Back to home / clear search box |
| `Ctrl` + `D`   | Toggle dark mode                |
| `↑` / `↓`      | Navigate search results         |
| `Enter`        | Open highlighted search result  |

---

## Customizing the UI

All theming lives in `assets/style.css` via CSS variables on `:root` and `body.dark`:

```css
:root {
  --primary: #2563eb;
  --accent:  #6366f1;
  --bg:      #f6f7fb;
  /* ... */
}
body.dark {
  --primary: #60a5fa;
  --bg:      #0b1020;
  /* ... */
}
```

Change those and the whole UI updates. To add new file-type icons, edit the `getFileIcon` map in `script.js` (uses Font Awesome class names).

---

## Troubleshooting

**`files.json` won't load when I open `index.html` directly**
Use `python -m http.server 8000` and visit `http://localhost:8000`. Browsers block `fetch()` on `file://` URLs.

**My new files aren't showing up**
Did you run `python generate_files_json.py`? The index is static — it only updates when you regenerate it.

**Folder shows but file is missing**
Check that the file isn't being filtered:
- starts with `.` or `~$`
- is in `Thumbs.db` / `desktop.ini` / `.DS_Store`
- has no extension and you're expecting a preview (it'll appear as a download link only)

**Notification date shows "Invalid Date"**
Use ISO format: `"date": "2026-05-21"`.

**Dark mode flashes on page load**
Theme is restored from `localStorage` on `DOMContentLoaded`. Hard refresh once after first visit.

---

## Roadmap

- [ ] Optional GitHub Action to regenerate `files.json` on every push.
- [ ] Recursive folder support (nested subfolders inside `data/`).
- [ ] Inline markdown rendering (currently shown as plain text).
- [ ] Per-file syntax highlighting for code snippets.
- [ ] PWA / offline mode.

---

## License

Personal portfolio content — © Junaid Sahibole. Code in `script.js`, `style.css`, and `generate_files_json.py` is MIT-licensed; reuse freely.
