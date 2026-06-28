# Camp

Camp is a community-style study archive for publishing study notes, bootcamp materials, shared links, and news digests. The current product is optimized for fast posting, public replies, hashtag discovery, and lightweight admin moderation.

## Current Product

Camp exposes four main community sections:

- `Study Log`: meeting notes, study records, decks, and follow-up posts.
- `Camp Session`: bootcamp weekly learning materials and practice notes.
- `벽타기`: links shared from chat rooms, with original-link previews and short AI summaries.
- `News Digest`: external news, resources, and short digest posts.

Older routes such as members, daily review, teach, and topics still exist in the codebase for compatibility, but they are not part of the current primary navigation.

## Core Flows

### Posting

- `/write` publishes immediately without login.
- Writers choose the target section before posting.
- Markdown and HTML files can be uploaded directly.
- Markdown is converted to readable HTML, including tables and link/embed directives.
- Direct body input is also supported.
- GitHub and YouTube links can generate a draft through the link draft API.

### Replies

- Posts support public replies without login.
- Replies require a nickname and a delete password.
- Reply bodies auto-link URLs, show link cards, and embed YouTube previews when possible.
- `게시글로 답하기` creates a full post connected to the original post.
- Linked posts are shown from both sides so discussion threads can become backlinks.

### Wall Climb

`/wall-climb` is a lightweight shared-link board.

- The `+` button opens a modal composer.
- Users add a source link, author, shared note, editable summary, and hashtags.
- The summarize action uses DeepSeek to summarize the linked source itself, not the user's shared note.
- GitHub, YouTube, X, and general web links try to preserve native preview metadata.
- Preview cards use the source image/title/description when available and open the original URL.
- Long shared notes and summaries are collapsed by default and can be expanded.

### Discovery

- Hashtags are clickable on listing pages and detail pages.
- The left community sidebar lists available hashtags with counts.
- Listing pages support tag filtering through `?tag=...`.
- Recent posts prioritize posts with replies or linked child posts and show reply counts.

### Admin

- Password-based admin login is available through `/login`.
- `/admin/content` supports editing, deleting, and pinning posts.
- Pinned posts are sorted above normal posts.
- Deleted posts are archived/hidden from normal listings.

## Tech Stack

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- Supabase for deployed content, comments, and public posting
- Local Markdown/HTML files under `content/` for local development seed content
- DeepSeek API for link summaries

## Local Development

Install dependencies:

```bash
pnpm install
```

Create local environment variables:

```bash
cp .env.example .env.local
```

Run the app:

```bash
pnpm dev
```

Useful checks:

```bash
pnpm typecheck
pnpm lint
pnpm build
```

## Environment Variables

Browser-exposed Supabase values:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Server-only Supabase and admin values:

```bash
SUPABASE_SERVICE_ROLE_KEY=
ADMIN_EMAIL=
ADMIN_PASSWORD=
ADMIN_DISPLAY_NAME=Camp Admin
ADMIN_SLUG=camp-admin
ADMIN_SESSION_SECRET=
```

Server-only AI and GitHub values:

```bash
DEEPSEEK_API_KEY=
GITHUB_CONTENT_TOKEN=
CAMP_API_TOKEN=
GITHUB_REPOSITORY_NAME=passeth/camp
GITHUB_BASE_BRANCH=main
```

Optional direct database values for migration/scripts:

```bash
DATABASE_URL=
SUPABASE_DB_PASSWORD=
SUPABASE_DB_HOST=
SUPABASE_DB_PORT=5432
SUPABASE_DB_NAME=postgres
SUPABASE_DB_USER=postgres
```

Never expose service-role keys, database passwords, GitHub tokens, or DeepSeek keys through `NEXT_PUBLIC_*`.

## Data Model

Local content lives in:

- `content/study-log`
- `content/camp-session`
- `content/wall-climb`
- `content/press`

Production content is written to Supabase through `content_index`. The app maps `camp-session` and `wall-climb` into the shared public content store while preserving their own routes and categories.

Comments are stored through the comment store and support anonymous replies with password-based deletion.

Current Supabase migrations are in `supabase/migrations`:

- `0001_initial.sql`
- `0002_anonymous_comments.sql`
- `0003_comment_passwords.sql`
- `0005_publish_request_files.sql`
- `0006_content_index_body.sql`
- `0007_content_index_reply_links.sql`
- `0008_public_content_posts.sql`
- `0009_content_index_pinned.sql`

Apply these migrations to the deployed Supabase project before relying on production posting, replies, linked posts, or pinned posts.

## Deployment

The production site runs on Vercel:

```txt
https://camp-self.vercel.app
```

This repository includes `vercel.json` so Vercel builds it as a Next.js app:

```json
{
  "framework": "nextjs",
  "installCommand": "pnpm install",
  "buildCommand": "pnpm build",
  "outputDirectory": ".next"
}
```

Do not set the Vercel project output directory to `public`; the app must deploy the `.next` output.

For deployed write/reply/admin flows to work, Vercel must have the Supabase and admin environment variables above. For Wall Climb summaries, `DEEPSEEK_API_KEY` must also be configured.

## Agent Publishing API

Camp provides token-authenticated publishing APIs so another agent can create posts without receiving Supabase credentials. External agents call Camp, Camp verifies `CAMP_API_TOKEN`, then the server writes to Supabase in production or local `content/` files in development.

Base URL:

```txt
https://camp-self.vercel.app
```

Required request headers:

```txt
Authorization: Bearer <CAMP_API_TOKEN>
Content-Type: application/json
```

Do not share Supabase keys, database passwords, GitHub tokens, or DeepSeek keys with external agents. Share only the Camp API URL and a scoped `CAMP_API_TOKEN`.

### Setup

Set `CAMP_API_TOKEN` as a server-only environment variable in Vercel Production and in `.env.local` for local tests:

```bash
CAMP_API_TOKEN=replace-with-a-long-random-token
```

Generate a token with:

```bash
openssl rand -hex 32
```

After adding or changing the Vercel environment variable, redeploy the production app.

### `POST /api/publish`

Creates a normal content post. Use this for `Study Log`, `Camp Session`, or `News Digest`.

Supported `type` values:

| Type | Route | Use |
| --- | --- | --- |
| `study-log` | `/study-log/{slug}` | Study notes, meeting records, decks, follow-up posts |
| `camp-session` | `/camp-session/{slug}` | Bootcamp weekly lessons and learning materials |
| `press` | `/press/{slug}` | News digest posts |

Request body:

| Field | Required | Type | Notes |
| --- | --- | --- | --- |
| `type` | No | string | Defaults to `study-log`. |
| `title` | Yes | string | Max 120 characters. Used for slug fallback. |
| `authorName` | Yes | string | Max 80 characters. |
| `content` | Yes | string | Markdown or HTML body. Max 500,000 characters. |
| `contentFormat` | No | `markdown` or `html` | Defaults to `markdown`. Markdown is converted to readable HTML. |
| `slug` | No | string | Optional preferred slug. The API appends a number if there is a conflict. |
| `category` | No | string | Optional category label. |
| `tags` | No | string array or comma-separated string | Leading `#` is stripped. Max 20 tags. |
| `excerpt` | No | string | Optional listing excerpt. Auto-generated when omitted. |
| `replyTo` | No | object | Connects the new post as a linked reply to another post. |

`replyTo` shape:

```json
{
  "type": "study-log",
  "slug": "2026-06-26-ai-study-first-meeting"
}
```

Example:

```bash
curl -X POST https://camp-self.vercel.app/api/publish \
  -H "Authorization: Bearer $CAMP_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "camp-session",
    "title": "Loop notes",
    "authorName": "Agent",
    "contentFormat": "markdown",
    "content": "# Loop notes\n\nStudy summary...",
    "category": "AI Agent",
    "tags": ["loop", "agent"]
  }'
```

Example response:

```json
{
  "ok": true,
  "href": "/camp-session/loop-notes",
  "slug": "loop-notes",
  "type": "camp-session"
}
```

### `POST /api/wall-climb`

Creates a `벽타기` shared-link entry. Use this for links from chat rooms, GitHub, YouTube, X, and general web pages.

Request body:

| Field | Required | Type | Notes |
| --- | --- | --- | --- |
| `sourceUrl` | Yes | URL string | Original link. |
| `note` | Yes | string | User's shared comment. The first non-empty line becomes the entry title. |
| `authorName` | Yes | string | Max 80 characters. |
| `summary` | No | string | Editable source summary. Defaults to `note` when omitted. |
| `tags` | No | string array or comma/space-separated string | The API automatically includes `벽타기` and the source kind. |
| `canonicalUrl` | No | URL string | Use when the displayed source should differ from the submitted link. |
| `sourceKind` | No | `github`, `youtube`, `x`, or `web` | Defaults to `web`. |
| `sourceTitle` | No | string | Link preview title. Defaults to the URL. |
| `sourceImage` | No | URL string | Preview image. GitHub and YouTube get fallback images automatically when possible. |

Example:

```bash
curl -X POST https://camp-self.vercel.app/api/wall-climb \
  -H "Authorization: Bearer $CAMP_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sourceUrl": "https://github.com/nexu-io/open-design",
    "sourceKind": "github",
    "sourceTitle": "GitHub - nexu-io/open-design",
    "note": "다음 스터디에서 볼 링크",
    "summary": "Open Design 관련 GitHub 링크입니다.",
    "authorName": "Agent",
    "tags": ["design", "github"]
  }'
```

Example response:

```json
{
  "ok": true,
  "href": "/wall-climb/다음-스터디에서-볼-링크",
  "slug": "다음-스터디에서-볼-링크",
  "type": "wall-climb"
}
```

### Error Responses

| Status | Meaning | Typical Fix |
| --- | --- | --- |
| `400` | Invalid JSON or invalid fields | Check required fields, URL format, field length, and `type`. |
| `401` | Missing bearer token | Add `Authorization: Bearer <CAMP_API_TOKEN>`. |
| `403` | Wrong bearer token | Use the current production token. |
| `503` | `CAMP_API_TOKEN` is not configured | Add the server-only environment variable and redeploy. |
| `500` | Publish failed after validation | Check Vercel logs and Supabase write configuration. |

### Prompt for External Agents

Give another agent this instruction, plus the token through a secure secret channel:

```txt
Post to Camp using the Camp Agent Publishing API.

Base URL: https://camp-self.vercel.app
Auth header: Authorization: Bearer <CAMP_API_TOKEN>

For normal posts, call POST /api/publish with JSON:
- type: study-log, camp-session, or press
- title
- authorName
- contentFormat: markdown or html
- content
- optional category, tags, excerpt, replyTo

For 벽타기 shared links, call POST /api/wall-climb with JSON:
- sourceUrl
- note
- authorName
- optional summary, tags, sourceKind, sourceTitle, sourceImage

Return the API response href after publishing.
```

## Scripts

```bash
pnpm dev
pnpm build
pnpm start
pnpm lint
pnpm typecheck
pnpm admin:create
pnpm verify:publishing
pnpm verify:submission
pnpm plugin:install
pnpm plugin:package
```

The Obsidian publisher plugin still exists under `plugins/camp-publisher`, but it is no longer the primary posting flow. The primary flow is direct web posting through `/write` and `/wall-climb`.
