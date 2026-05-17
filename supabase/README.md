# Supabase local development

This directory contains the database migrations for Wumbotron.

## Start the local database

Run these commands from the repo root:

```bash
cd /Users/maxricketts-uy/repos/wumbotron
supabase start
supabase db reset
```

If this checkout does not have `supabase/config.toml` yet, initialize Supabase
first:

```bash
supabase init
```

Docker Desktop must be running before `supabase start` or `supabase status` can
inspect the local containers.

This project uses `54332` for the direct local Postgres port to avoid conflicts
with other Supabase projects that may already be using the default `54322`.

## App environment

The Next.js app reads:

```bash
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<local anon key>
```

These values belong in `.env.local`, which is ignored by git. The local anon key
is printed by `supabase start` and `supabase status`.

## Migrations

Apply all migrations to the local database with:

```bash
supabase db reset
```

This recreates the local database and runs every file in `supabase/migrations/`.
