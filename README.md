# Wumbotron

Wumbotron is a TV/projector scoreboard app for shoveltoss. It has two main
surfaces:

- **Control**: phone/laptop-friendly operator pages for creating matches,
  recording tosses, and running tournaments.
- **Display**: read-only TV pages that update from Supabase Realtime.

The app is built with Next.js, React, Tailwind CSS, Vitest, and Supabase.

## Local setup

Install dependencies:

```bash
pnpm install
```

Start Docker Desktop, then start the local Supabase stack from the repo root:

```bash
supabase start
supabase db reset
```

Copy the local Supabase values into `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<publishable key from supabase status>
```

You can print the local values with:

```bash
supabase status
```

Then start the app:

```bash
pnpm dev
```

Open `http://localhost:3000`.

## Common commands

```bash
pnpm dev       # run the Next.js dev server
pnpm build     # build for production
pnpm start     # serve the production build
pnpm lint      # run ESLint
pnpm test      # run Vitest tests
```

Seed a demo match into the configured Supabase project:

```bash
pnpm seed:match
```

## Local database notes

Migrations live in `supabase/migrations/` and run in filename order.

To recreate the local database and apply every migration:

```bash
supabase db reset
```

This project uses direct Postgres port `54332` in `supabase/config.toml` to
avoid conflicts with other local Supabase projects. The app talks to Supabase
through the API URL on `54321`.

More details are in `supabase/README.md`.

## Basic workflow

1. Go to `/`.
2. Create a new match or tournament.
3. Open the display link from the control room on a TV/projector.
4. Record tosses from the control room.
5. Return to `/` to resume recent matches or tournaments.

Demos are available at `/demos`.
