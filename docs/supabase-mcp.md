# Supabase MCP for Camp

Camp Supabase project ref: `pjttwbhjkprtdkquvawb`

## Codex MCP entry

Use a Camp-specific MCP server name so other projects that use the default `supabase` MCP are not affected:

```toml
[mcp_servers.supabase_camp]
url = "https://mcp.supabase.com/mcp?project_ref=pjttwbhjkprtdkquvawb&features=database,development,docs,debugging"
```

The default global `[mcp_servers.supabase]` entry should remain available for the previously configured project and should not be repointed to Camp.

## Login

Authorize the Camp-specific MCP server:

```bash
codex mcp login supabase_camp
```

If OAuth is unsupported for this named remote in the current Codex version, use the Supabase app connector or temporarily switch the default `supabase` entry only for the login session, then restore it immediately.

## Current status

- App env is configured with `NEXT_PUBLIC_SUPABASE_URL` and publishable key in `.env.local`.
- Direct DB host is `db.pjttwbhjkprtdkquvawb.supabase.co:5432`, but direct access may fail on IPv4-only networks.
- Camp MCP is isolated as `supabase_camp` to avoid cross-project side effects.

## Required next step

After `supabase_camp` is authorized and available in the active Codex session, apply:

```sql
supabase/migrations/0001_initial.sql
```

through MCP migration tooling, not by exposing database credentials in client code.
