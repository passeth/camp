# Content publishing readiness

Camp accepts content submissions from the Obsidian Camp Publisher plugin through `POST /api/content-submissions`.
The endpoint creates a GitHub content PR, and GitHub Actions validates and merges trusted content-only PRs.

## Readiness contract

`GET /api/content-submissions` is public and returns the current publishing contract plus server readiness:

```json
{
  "ok": true,
  "contract": "camp.contentSubmission.v1",
  "supportedContentFormats": ["markdown", "html"],
  "github": {
    "prReady": false,
    "repository": "passeth/camp",
    "baseBranch": "main",
    "missingEnv": ["GITHUB_CONTENT_TOKEN"]
  }
}
```

`github.prReady` is `true` only when the deployed server has `GITHUB_CONTENT_TOKEN` configured.
The token is server-only and must not be copied into the Obsidian plugin or any browser-public environment variable.

## CLI verification

Run the public readiness check from this repository:

```bash
pnpm verify:publishing
```

This verifies:

- `GET /api/content-submissions` returns the expected contract
- Markdown and HTML submissions are advertised as supported
- the plugin download page links to the zip package
- the public zip contains `main.js`, `manifest.json`, and `styles.css`

After `GITHUB_CONTENT_TOKEN` is configured in Vercel, run the stricter gate:

```bash
pnpm verify:publishing -- --require-pr-ready
```

That stricter command fails if the deployed API still reports `github.prReady: false`.

## Obsidian operator flow

1. Install and enable `Camp Publisher` in Obsidian.
2. Run `Camp Publisher: Check Camp connection`.
3. If the check reports `GITHUB_CONTENT_TOKEN` as missing, configure that secret in Vercel before submitting content.
4. Run `Camp Publisher: Login to Camp`.
5. Insert Camp frontmatter if needed.
6. Submit the current Markdown or HTML note.

## HTML notes

Raw HTML notes are submitted with `contentFormat: html` and are stored under `content/{type}/{slug}.html`.
The website renders them as normal post pages with a sandboxed iframe and a `전체보기` fullscreen button.
