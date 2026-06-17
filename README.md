# Camp

AI-powered study magazine / wiki / archive platform for study members.

## Repository

- GitHub: https://github.com/passeth/camp
- Default branch: `main`

## Implemented MVP foundation

- Next.js App Router, TypeScript, Tailwind CSS
- Git-backed Markdown content loader under `content/`
- Public pages for members, press, topics, daily reviews, study logs, and teach pages
- Supabase Auth/client setup with server/browser split
- Supabase migration for profiles, roles, publish requests, comments, reactions, views, and RLS
- Member-only dashboard, write page, and Agent placeholder
- Admin pages for member approval and publish request review

## Local development

Install dependencies:

```bash
pnpm install
```

Create `.env.local` from `.env.example` and fill in the Supabase project values:

```bash
cp .env.example .env.local
```

Run the app:

```bash
pnpm dev
```

Verify locally:

```bash
pnpm typecheck
pnpm lint
pnpm build
```

## Required environment variables

Browser-exposed:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Server-only, for migrations/scripts or direct Postgres access if needed:

```bash
DATABASE_URL=
SUPABASE_DB_PASSWORD=
SUPABASE_DB_HOST=
SUPABASE_DB_PORT=5432
SUPABASE_DB_NAME=postgres
SUPABASE_DB_USER=postgres
```

`NEXT_PUBLIC_*` values are browser-exposed by design. Do not add service-role keys, database passwords, GitHub tokens, VPS credentials, or other secrets to frontend code.

## Content model

Published content lives in Markdown files under:

- `content/press`
- `content/topics`
- `content/daily-review`
- `content/study-log`
- `content/teach`

Supabase stores auth, roles, comments, reactions, views, publish requests, and metadata. The browser never pushes to Git directly.

## Future work

- Apply Supabase migration to the project database.
- Configure the first admin user after signup.
- Connect Vercel deployment.
- Add Hermes Agent/VPS/Obsidian sync once the core site is stable.

## Vercel deployment

This repository includes `vercel.json` so Vercel treats the project as a Next.js app:

```json
{
  "framework": "nextjs",
  "installCommand": "pnpm install",
  "buildCommand": "pnpm build",
  "outputDirectory": ".next"
}
```

Do not set the Vercel Project Settings Output Directory to `public`. This repo-level `vercel.json` overrides that mistaken setting and points Vercel at the Next.js build output.
