# Camp Publisher Obsidian Plugin

This plugin submits the current Obsidian note to Camp. Camp creates a GitHub content PR, GitHub Actions validates it, and successful content PRs are auto-merged for Vercel deployment.

## Manual install during MVP

1. Copy this folder to your vault:
   `.obsidian/plugins/camp-publisher/`
2. In Obsidian, open `Settings -> Community plugins`.
3. Disable safe mode if needed, then enable `Camp Publisher`.
4. Open `Settings -> Camp Publisher` and set:
   - Camp site URL: `https://camp-self.vercel.app`
   - Supabase URL: `https://pjttwbhjkprtdkquvawb.supabase.co`
   - Supabase publishable key: value from Camp project env
5. Run command `Camp Publisher: Login to Camp`.
6. Open a Markdown note and run `Camp Publisher: Insert Camp frontmatter` if needed.
7. Run `Camp Publisher: Submit current note to Camp`.

## Required frontmatter

```md
---
title: "My note"
slug: "my-note"
type: "press"
category: "AI Study"
tags: ["camp", "obsidian"]
excerpt: "Short summary for cards and search."
---
```

Allowed `type` values: `press`, `topic`, `daily-review`, `study-log`, `teach`.
