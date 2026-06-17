# Admin Bootstrap

The initial Camp admin account is configured through local/server-only environment variables, not hardcoded in source code.

## Required local env

Add these to `.env.local`:

```bash
SUPABASE_SERVICE_ROLE_KEY=
ADMIN_EMAIL=
ADMIN_PASSWORD=
ADMIN_DISPLAY_NAME=Camp Admin
ADMIN_SLUG=camp-admin
```

`SUPABASE_SERVICE_ROLE_KEY` is required because creating Auth users and promoting roles must use Supabase Admin APIs. Never expose this key in client code or commit it to Git.

## Create or update the admin user

After applying `supabase/migrations/0001_initial.sql`, run:

```bash
pnpm admin:create
```

The script will:

1. Create the admin Auth user if missing.
2. Reset the configured admin password if the user already exists.
3. Upsert `profiles`.
4. Upsert `member_roles` with `role = 'admin'`.
