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
