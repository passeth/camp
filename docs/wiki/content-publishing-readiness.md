# Content publishing readiness

Camp accepts content submissions from the Obsidian Camp Publisher plugin through `POST /api/content-submissions`.
The endpoint creates a GitHub content PR, and GitHub Actions validates and merges trusted content-only PRs.

## Web community publishing

The `/write` page is the direct community publishing path. It does not use the Supabase `publish_requests` approval queue.

Current behavior:

- visitors choose the destination menu: `Study Log`, `Topics`, `News Digest`, or `Camp Session`
- visitors upload a Markdown or HTML file, or paste Markdown/HTML directly into the body field
- visitors can paste a GitHub or YouTube link and ask the server to generate a structured Korean Markdown draft
- Markdown uploads are converted into a standalone HTML document on the server
- generated link drafts can be reviewed in the write form and published directly without creating a local file first
- when Supabase remote content storage is configured, the app writes the published HTML body into `content_index`
- posts can also carry `replyTo` metadata, which links a long-form reply post back to its parent post and lets the parent render that reply alongside short comments
- local development falls back to writing a published `.html` content file under the matching `content/` folder
- duplicate slugs are resolved with numeric suffixes such as `-2` and `-3`
- the user is redirected directly to the public post URL

This path is intentionally separate from the Obsidian plugin PR flow below.

Production deployments must not rely on runtime writes to `content/`. Vercel Functions only provide temporary writable filesystem space, so deployed community uploads need persistent storage. Apply `supabase/migrations/0006_content_index_body.sql` before enabling immediate public uploads in production; it adds `content_format`, `content`, and `excerpt` to `content_index`. Apply `supabase/migrations/0007_content_index_reply_links.sql` as well before enabling post-as-reply links in production; it adds `parent_type` and `parent_slug`.

Apply `supabase/migrations/0008_public_content_posts.sql` when visitors should publish directly without logging in. It keeps public inserts constrained to published, public, bounded-size content rows. Admin edits and deletes use `SUPABASE_SERVICE_ROLE_KEY`; deletes write an `archived` tombstone so remote storage can hide local fallback content with the same `{type, slug}`. Tombstones are intentionally excluded from public listings and the admin content list.

`Camp Session` is exposed as its own menu and route for bootcamp weekly learning materials. Until the Supabase `content_type` enum is expanded, remote storage maps those rows to `type = study-log` with `category = camp-session`, then converts them back to `camp-session` in the app. The same compatibility mapping is used for Camp Session comments.

## Admin content management

Admins can reach `/admin/content` after either:

- signing in with a Supabase account whose `member_roles.role` is `admin`
- using the password-only admin login on `/login`

The password-only path requires `ADMIN_PASSWORD` in the deployment environment. `ADMIN_SESSION_SECRET` can be set separately, but the app falls back to signing the admin cookie with `ADMIN_PASSWORD` when no separate secret is configured.

The admin content screen supports:

- listing manageable content, excluding deleted tombstone records
- editing title, slug, destination menu, author, category, tags, body, excerpt, and `replyTo`
- deleting content through an archived remote tombstone in production
- local development writes to the matching file under `content/`

## Relationships and discovery

Posts with `replyTo` metadata are treated as long-form replies. The parent post renders those linked posts in its comments area, and the recent-posts rail shows connected child posts under the parent so topic dependencies are visible at a glance.

Hashtags are clickable on cards, detail pages, and the left sidebar. Tag links use `?tag=...` and filter the current content listing.

Short comments also prefer Supabase. If Supabase is unavailable in a Vercel deployment, the local fallback writes to `/tmp` so the API does not fail on the read-only function bundle, but that fallback is temporary and not durable across cold starts or deployments.

Link draft generation uses `POST /api/link-drafts`. The route fetches source metadata server-side, then calls DeepSeek with `deepseek-v4-pro` to return JSON containing `title`, `category`, `tags`, and `markdown`. Configure `DEEPSEEK_API_KEY` as a server-only environment variable in local development and Vercel Production before enabling the feature. Do not prefix it with `NEXT_PUBLIC_`.

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

## Submission flow verification

Run the authenticated dry-run verifier to test the same Supabase login and Camp API submission path that the Obsidian plugin uses:

```bash
pnpm verify:submission
```

By default this:

- signs in with `CAMP_EMAIL` / `CAMP_PASSWORD`, or the local `ADMIN_EMAIL` / `ADMIN_PASSWORD`
- submits one Markdown dry-run payload
- submits one HTML dry-run payload
- verifies the generated content paths and rendered frontmatter
- does not create a GitHub branch or PR

After `pnpm verify:publishing -- --require-pr-ready` passes, run the live PR check explicitly:

```bash
pnpm verify:submission -- --live --yes --format markdown
```

Live mode creates a GitHub content PR. Use a single format per run unless you intentionally want multiple PRs.

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
