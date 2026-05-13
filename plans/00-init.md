# 00 — Init

## Goal

Get a deployable Next.js + Supabase skeleton running locally and on Vercel, with a clean route structure for `display` and `control` surfaces. No app logic yet.

## Scope

**In:**
- Next.js scaffold (TS, App Router, Tailwind)
- Supabase project provisioned, env wired
- Supabase client helpers (browser + server)
- Route shells: `/`, `/display/[matchId]`, `/control/[matchId]`
- Vercel deploy connected
- Basic Tailwind config tuned for TV (font sizing, dark default)

**Out (deferred to later plans):**
- Any data model
- Any real UI beyond placeholders
- Auth flows
- Realtime

## Concrete steps

1. **Scaffold Next.js**
   - `pnpm create next-app@latest .` — TS, Tailwind, App Router, ESLint, `src/` dir, import alias `@/*`
   - Verify dev server runs

2. **Install Supabase packages**
   - `pnpm add @supabase/supabase-js @supabase/ssr`

3. **Provision Supabase project**
   - Create project via Supabase MCP (`create_project`) or dashboard
   - Capture `NEXT_PUBLIC_SUPABASE_URL` and publishable (anon) key into `.env.local`
   - Add `.env.local` to `.gitignore` (Next default already does this — verify)
   - Commit a `.env.example` with the variable names

4. **Supabase client helpers**
   - `src/lib/supabase/client.ts` — browser client via `createBrowserClient`
   - `src/lib/supabase/server.ts` — server client via `createServerClient` (cookie-aware)
   - Don't write auth flow yet, just the factories

5. **Route shells**
   - `src/app/page.tsx` — placeholder landing
   - `src/app/display/[matchId]/page.tsx` — empty server component, log the id
   - `src/app/control/[matchId]/page.tsx` — empty client component, log the id
   - Optional: `src/app/display/layout.tsx` that forces full-bleed, no scrollbars, dark bg

6. **TV-friendly Tailwind defaults**
   - In `globals.css`, set base background dark, body font-size scaled for 1080p viewing distance
   - Add a `safe-area` utility for TV overscan (~5% inset) — used later by display layout
   - No design system yet; just sensible defaults

7. **Deploy to Vercel**
   - Push to GitHub
   - Import to Vercel, add the two Supabase env vars
   - Confirm prod deploy renders `/` and both route shells

## Exit criteria

- `pnpm dev` runs locally; visiting `/display/test` and `/control/test` renders a placeholder with the id shown.
- Prod Vercel URL serves the same three routes.
- `.env.example` documents required variables.
- Supabase project exists and is reachable from the app (a smoke `supabase.from('_').select()` call returning a structured error, not a network error, is sufficient).

## Notes

- Use `pnpm`. If the user prefers `npm`/`bun`, swap throughout.
- Skip Biome/Prettier customization until it actually annoys someone.
- The `[matchId]` segment is a placeholder — once the data model lands in plan 01, these routes start resolving to real rows.
