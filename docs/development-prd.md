# Camp Development PRD v1

## Summary

Camp is an AI-powered study magazine, wiki, and archive platform. MVP ships as a Next.js + Supabase + Git-backed content web app. Published content is read from files under `content/`. Supabase stores auth, member roles, publish requests for plugin workflows, comments, reactions, views, and metadata. Hermes Agent, VPS, Obsidian sync, and automated Git publish jobs are future integration points.

## MVP scope

- Public pages: home, members, press, topics, daily review, study log, teach pages.
- Member pages: dashboard, write, agent placeholder.
- Admin pages: member role approval, publish request review.
- Content source of truth: Markdown or HTML content files under `content/`.
- Web editor behavior: `/write` is a community-style direct publisher. It accepts Markdown or HTML files, converts Markdown to an HTML document, writes a published content file into the selected public menu (`Topics`, `News Digest`, or `Study Log`), and redirects to the public post immediately.
- Plugin behavior: the Obsidian publisher still uses the authenticated `/api/content-submissions` contract to create GitHub content PRs for validation and deployment.
- Access policy: users start as `pending`; only `member` and `admin` can write or access `/agent`; only `admin` can access `/admin`.

## Data and interfaces

- Browser env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- Server-only env: `DATABASE_URL`, `SUPABASE_DB_*` values. Never prefix secrets with `NEXT_PUBLIC_`.
- Markdown frontmatter supports title, slug, type, status, visibility, author, memberSlug, category, tags, dates, coverImage, and excerpt.
- Supabase migration: `supabase/migrations/0001_initial.sql` creates profiles, roles, content index, publish requests, comments, reactions, views, triggers, and RLS policies.

## Acceptance criteria

- Public sample content renders from Markdown without a database connection.
- Protected routes redirect unauthenticated users to `/login`.
- Pending users can see dashboard state but cannot access member-only write/agent pages.
- Visitors can publish Markdown or HTML files directly from `/write` into the selected public menu.
- Admins can update member roles and publish request status.
- No GitHub token, database password, or service-role key is used in client code.
