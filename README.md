# CoachFlow — Stage 1

Coaching platform for personal trainers and their clients. This is Stage 1:
project architecture, database schema + RLS, Supabase auth, routing, and the
base UI system.

## 1. Install dependencies

```bash
npm install
```

## 2. Create a Supabase project

1. Go to https://supabase.com/dashboard and create a new project.
2. In **Project Settings → API**, copy the **Project URL** and **anon public** key.
3. Copy `.env.local.example` to `.env.local` and fill in those two values:

```bash
cp .env.local.example .env.local
```

## 3. Run the database migrations

In the Supabase dashboard, open **SQL Editor** and run the files in
`supabase/migrations/` **in order**:

1. `0001_init.sql` — tables, indexes, foreign keys
2. `0002_rls.sql` — Row Level Security policies
3. `0003_handle_new_user.sql` — auto-provisions a profile on signup
4. `0004_client_invitations.sql` — invitations and trainer/client connection
5. `0005_workout_mvp.sql` — assignment/session RPCs and shared exercise seed
6. `0006_revoke_anon_invitation_rpcs.sql` — keeps invitation RPCs off `anon`

If 0001–0004 are already applied, run only the new files. Do not re-run older
migrations against a live database.

(If you prefer the CLI: `supabase link` then `supabase db push`, with the
Supabase CLI installed locally.)

## 4. Disable email confirmation for local testing (optional but recommended)

In **Authentication → Providers → Email**, turn off "Confirm email" while you
develop, so signup logs you straight in. Turn it back on before going live.

## 5. Run the app

```bash
npm run dev
```

Visit http://localhost:3000.

## What to test in Stage 1

1. **Landing page** at `/` loads, nav links to `/pricing` and `/login` work.
2. **Sign up as a trainer**: go to `/signup`, choose "Trainer", fill the form.
   You should land on `/trainer/dashboard` showing your name and 0/0/0 stats.
3. **Sign up as a client** (use a second browser/incognito window and a
   different email): choose "Client" at `/signup`. You should land on
   `/client/dashboard`.
4. **Route protection**: while logged in as the trainer, manually visit
   `/client/dashboard` in the URL bar — you should get bounced back to
   `/trainer/dashboard`. Same the other way for the client account.
5. **Logged out protection**: log out (sidebar → Log out), then try to visit
   `/trainer/dashboard` directly — you should be redirected to `/login`.
6. **Sidebar nav**: click through Clients / Exercises / Workouts / Messages
   (trainer) and Workouts / History / Messages (client) — each should load a
   placeholder screen without erroring, confirming routing works end-to-end.
7. **In Supabase**: open **Table Editor** and confirm a row was created in
   `profiles` and in `trainers` or `clients` for each account you signed up.

If `npm install` or `npm run build` throws errors, paste them back to me and
I'll fix the source directly.

## Project structure

```
app/
  (public)/        landing page, pricing — no auth required
  (auth)/          login, signup — redirects away if already signed in
  trainer/         trainer-only area, guarded by middleware + layout
  client/          client-only area, guarded by middleware + layout
  auth/            callback + signout route handlers
components/
  ui/              hand-built shadcn-style primitives
  layout/          app shell (sidebar/topbar), shared placeholders
lib/
  supabase/        browser client, server client, middleware session helper
  types/            hand-authored DB types
  validations/      zod schemas for forms
supabase/migrations/ SQL, run in order in the Supabase SQL editor
middleware.ts        session refresh + role-based route protection
```
