# Camp Content PR Pipeline

## Goal

A study member writes in Obsidian, submits the current note with the Camp Publisher plugin, and sees the content appear on the Camp website after GitHub Actions validates and auto-merges the generated content PR.

## Submission contract v1

Endpoint:

```txt
POST /api/content-submissions
Authorization: Bearer <Supabase access token>
Content-Type: application/json
```

Body:

```json
{
  "submission": {
    "title": "My note",
    "slug": "my-note",
    "type": "press",
    "contentFormat": "markdown",
    "category": "AI Study",
    "tags": ["obsidian", "camp"],
    "excerpt": "Short summary shown on Camp cards.",
    "markdown": "# My note\n\nBody content...",
    "status": "published"
  }
}
```

For HTML lessons, send `contentFormat: "html"` and use the `html` field instead of `markdown`:

```json
{
  "submission": {
    "title": "Interactive lesson",
    "slug": "interactive-lesson",
    "type": "teach",
    "contentFormat": "html",
    "category": "Lesson",
    "tags": ["html", "lesson"],
    "excerpt": "Interactive HTML lesson.",
    "html": "<!DOCTYPE html><html>...</html>",
    "status": "published"
  }
}
```

Allowed `type` values:

- `press` -> `content/press/{slug}.md`
- `topic` -> `content/topics/{slug}.md`
- `daily-review` -> `content/daily-review/{slug}.md`
- `study-log` -> `content/study-log/{slug}.md`
- `teach` -> `content/teach/{slug}.md` or `content/teach/{slug}.html`

The API verifies the Supabase user token, requires `member` or `admin`, generates Markdown frontmatter, creates a `content/{memberSlug}/...` branch, commits the Markdown file, and opens a GitHub PR.

## Required Vercel environment variables

Already required for the app:

```txt
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

Required for PR creation:

```txt
GITHUB_CONTENT_TOKEN
GITHUB_REPOSITORY_NAME=passeth/camp
GITHUB_BASE_BRANCH=main
```

`GITHUB_CONTENT_TOKEN` should be a fine-grained GitHub token or GitHub App installation token with the minimum repository permissions:

- Contents: Read and write
- Pull requests: Read and write
- Metadata: Read

Do not expose this token in Obsidian or any client-side code.

## GitHub Actions behavior

Workflow: `.github/workflows/content-pr.yml`

On PRs that touch `content/**`:

1. Rejects non-Markdown/non-HTML or non-content changes.
2. Rejects content deletion in auto-merge PRs.
3. Validates all content frontmatter and duplicate `type + slug` pairs.
4. Runs `pnpm typecheck`, `pnpm lint`, and `pnpm build`.
5. Auto-merges same-repository branches whose name starts with `content/`.

If validation fails, the PR remains open for manual review.

## Obsidian plugin MVP

Folder: `plugins/camp-publisher/`

Manual install:

1. Copy `plugins/camp-publisher` to `<vault>/.obsidian/plugins/camp-publisher`.
2. Enable `Camp Publisher` in Obsidian Community Plugins.
3. Camp URL, Supabase URL, and the browser-public publishable key are prefilled for this Camp project.
4. Run `Camp Publisher: Check Camp connection` to confirm the server can create GitHub PRs, then run `Camp Publisher: Login to Camp`.
5. Run `Camp Publisher: Insert Camp frontmatter` if the note has no frontmatter. Raw HTML files are detected and default to `type: teach` plus `contentFormat: html`.
6. Run `Camp Publisher: Submit current note to Camp`.

Expected result:

```txt
Obsidian note -> Camp API -> GitHub PR -> GitHub Actions auto-merge -> Vercel deploy -> public post URL
```

## Repository-assisted install

If you have this repository locally, run:

```bash
pnpm plugin:install -- /absolute/path/to/your/obsidian/vault
```

The script copies only Obsidian runtime files: `manifest.json`, `main.js`, and `styles.css`.

## Download page

After deployment, download the installable plugin zip from:

```txt
https://camp-self.vercel.app/plugins/camp-publisher
```

## Deployment readiness check

Run this before asking study members to publish from Obsidian:

```bash
pnpm verify:publishing
```

After the server-only `GITHUB_CONTENT_TOKEN` is set in Vercel, require PR readiness too:

```bash
pnpm verify:publishing -- --require-pr-ready
```
