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
