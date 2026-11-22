# Project Instructions

## Creating New Posts/Pages

When creating a new post or page in any collection (`_embedded`, `_linux_networking`, `_linux_general`, `_yocto`):

- **Always include a preview image.** Every post must have a `picture` field in the front matter. If no project-specific image exists, download one (e.g. YouTube thumbnail, GitHub social preview) and save it to `assets/images/` before adding the front matter reference.
- The thumbnail plugin (`_plugins/post_thumbnail_generator.rb`) will fail the build if `picture` references a file that doesn't exist. Always verify the image file is present before building.
- If the `picture` key is omitted entirely (not present in front matter), no thumbnail is generated and the build won't fail — but this is not preferred. Every post should have a preview.

## Front Matter Template

```yaml
---
layout: default
title: "Post Title"
short_description: "One-line description"
status: "Done"           # Done, In Progress, or Pending
picture: "assets/images/filename.jpg"
latest_release: "Description of latest change"
index: 0                 # Sort order within collection (lower = first)
publish: true
---
```

## Build

```bash
bundle exec jekyll build
bundle exec jekyll serve   # local preview
```

## Board hubs and STAR sub-pages (2026-11-22)

Each board I have played with gets one hub page plus several sub-pages, all in `pages/_embedded/boards/<slug>/`:

- Hub `pages/_embedded/boards/<slug>/<slug>.md`: front matter as the template above plus
  `permalink: /embedded/boards/<slug>/` and `board_hub: true`. It shows on the home page Boards grid.
  Body: a few paragraphs on what the board is (SoC, why I bought it, what I got it to do), then
  `{% include board_children.html board="<slug>" %}`. No timeline section (2026-11-22).
- Sub-page `pages/_embedded/boards/<slug>/<topic>.md`: front matter as the template plus
  `permalink: /embedded/boards/<slug>/<topic>`, `board_parent: <slug>`, `result: "<one line, a number if possible>"`.
  It is NOT listed on the home page (index.md filters `board_parent`), only on its hub.
  Body follows STAR: `## Situation`, `## Task`, `## Action`, `## Result` (+ optional `## What I'd do next`),
  first person, real commands/logs from my own runs, numbers in Result.
- Every doc in a subfolder needs an explicit `permalink` (the collection default `/:collection/:name`
  would make all hubs collide).
- No custom Liquid filters or plugins in these pages: GitHub Pages builds in safe mode.

## Writing style for every post (2026-11-22)

- It is a vlog: write paragraphs. Tables only when they carry information you would look up (pin map,
  register bits, measured before/after numbers, a command reference), never to count or restate.
- No timeline / changelog sections. Only what the reader needs: the problem, the key step, the number.
  Quote the few log lines that matter, not whole logs.
- Videos are 16:9 only (H.264, ≤ 10 MB, `assets/videos/...`); no 9:16 phone cuts on the site.
