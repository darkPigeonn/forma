# Changelog

## 2026-08-13 — Concurrent public submit hardening

- Submit/upload rate limits: per-IP and per-form windows, with in-memory bucket pruning under load.
- MongoDB connection pool (`maxPoolSize: 25`) for concurrent response inserts.
- Public form lookup uses lean/select; JSON submit capped at 256 KB; client blocks double-submit.
- Added `npm run load:submit` smoke test for many concurrent fill requests.

## 2026-08-13 — Short link URLs

- Published forms get an 8-character short share code (`/f/{shortCode}`) used when copying links.
- Public routes resolve both `shortCode` and legacy long `slug` so old links keep working.
- Dashboard and form action bar copy/display the short path; existing published forms are backfilled on load.

## 2026-08-13 — Page background refresh

- Replaced warm cream page background with cool mist (`#e8eef0`) and pure white elevated surfaces so pages and panels read more clearly for users.
- Updated borders and landing grain to match; tokens synced in `globals.css` and `docs/DESIGN.md`.

## 2026-08-12 — Bahasa Indonesia UI

- Centralized user-facing copy in `src/lib/ui-id.ts`; all listed auth, dashboard, form editor, public fill, error/loading pages, and server messages now use Indonesian strings via `{ ui }`.
- Set document `lang="id"` and translated skip link, metadata description, validation/API errors, and default form confirmation fallbacks.

## 2026-08-13 — Select dropdown arrow styling

- Custom centered chevron for native `<select>` with proportional right padding (fixes misaligned browser arrows).

## 2026-08-13 — Fix hydration mismatch on dates

- Date display now uses fixed `id-ID` locale (`formatDateTime`) so server and client match on dashboard/responses.

## 2026-08-13 — Jenis pertanyaan: Unggah file

- Added question type `file_upload` (“Unggah file”) in builder + public form.
- Upload via `POST /api/f/[slug]/upload` to Firebase Storage (`form-uploads/...`).
- Answer stores file metadata (name, url, size, contentType, path); responses show download link.
- Limits: 10 MB; images, PDF, Word, Excel, TXT, CSV.

## 2026-08-12 — UI Bahasa Indonesia

- Semua label UI diganti ke Bahasa Indonesia via `src/lib/ui-id.ts` (`lang="id"`).
- Termasuk auth, dasbor, builder, formulir publik, respons, error/validasi, dan default judul/pesan.

## 2026-08-12 — UX: fewer steps

- Sticky form action bar: Publish / Copy link / Open without opening Settings.
- Inline title + optional description on the form page (blur to save).
- One-click “+ Add question”; type picker is optional.
- Dashboard: Copy link for live forms, primary Edit/Open, stronger empty CTA.
- Publish auto-copies the public link; public fill autofocuses the first field.
- Settings slimmed to confirmation message + duplicate/delete.

## 2026-08-12 — Google sign-in

- Added Firebase Google popup sign-in on `/login` and `/signup` (same session-cookie + Mongo user upsert flow).
- Updated SPEC, ARCHITECTURE, and README (enable Google provider in Firebase Console).

## 2026-08-12 — Seed UX

- `npm run seed` auto-uses the only MongoDB user when `SEED_OWNER_UID` is unset; lists UIDs if multiple users exist.

## 2026-08-12 — Phase 5 Polish & hardening

- Brand-first landing (Forma hero + one headline + CTA + full-bleed form canvas visual + motion).
- Loading skeletons for dashboard/forms/public; global + dashboard error UI; global not-found.
- Skip link, tablist arrow-key nav, `aria-required` on public fields, safe-area padding, reduced-motion support.
- Security checklist marked verified in ARCHITECTURE (ownership, session cookie, rate limit, CSV owner-only).
- Seed script: `npm run seed` with `SEED_OWNER_UID` → published `/f/demo-feedback`.

## 2026-08-12 — Phase 4 Responses & export

- Form page **Responses** tab: list, detail (Q→A), empty state.
- Choice-question summary bars with counts and %.
- Owner-only CSV export at `GET /api/forms/[formId]/responses/export`.
- All response reads ownership-checked (`ownerId === Firebase UID`).

## 2026-08-12 — Phase 3 Public fill + submit

- Public route `/f/[slug]` for published forms; closed shows a message; drafts 404.
- Accessible fill UI with client validation; submit via `POST /api/f/[slug]/submit`.
- Server validates answers against live questions; inserts Response with embedded answers.
- Confirmation message after success; rate limit 20 submits / minute / IP / slug.
- IP stored as hash only in response meta.

## 2026-08-12 — Phase 2 Form builder

- Form page tabs: Questions | Settings.
- Builder: add/delete/reorder questions; all 8 types; options editor; required + help text.
- Debounced autosave (~600ms) with Saving/Saved/error status; shared Zod question schemas.
- Live preview pane (desktop sticky; mobile via details).
- Moved `QUESTION_TYPES` / statuses to `src/lib/form-constants.ts` so client UI never imports Mongoose.

## 2026-08-12 — Phase 1 Form CRUD

- Dashboard lists owner forms (table) with Open / Duplicate / Delete.
- Create draft form (starter question included) → `/forms/[formId]`.
- Form settings: rename, description, confirmation message, publish/close/reopen.
- Publish assigns unique public `slug` (`/f/{slug}`); Copy link control.
- All mutations ownership-checked (`ownerId === Firebase UID`); delete also removes responses.
- Server actions + Zod validators + query layer under `src/db/queries/forms.ts`.

## 2026-08-12 — Phase 0 foundation

- Scaffolded Next.js 16 (App Router) + TypeScript + Tailwind v4 + ESLint.
- Added Mongoose models: `User` (firebaseUid), `Form` (embedded questions), `Response` (embedded answers) + indexes.
- Wired Firebase Auth client + Admin session cookies (`/api/auth/session`, `/api/auth/logout`); Mongo user upsert on login.
- Auth pages: `/login`, `/signup`; protected `/dashboard` shell with sign-out.
- Design tokens (teal/paper) + Fraunces / Source Sans 3 / IBM Plex Mono.
- Added `.env.example` and `README.md` quickstart.

## 2026-08-12 — Auth decision: Firebase

- Switched creator auth from Auth.js to **Firebase Authentication** (client SDK + Admin verify).
- MongoDB `users` is a profile mirror keyed by `firebaseUid`; `form.ownerId` = Firebase UID; no passwords in Mongo.
- Updated `docs/SPEC.md`, `docs/ARCHITECTURE.md`, `docs/TASKS.md`, `.cursor/rules/architecture.mdc`.

## 2026-08-12 — Database decision: MongoDB

- Switched persistence from PostgreSQL/Drizzle to **MongoDB + Mongoose**.
- Updated `docs/ARCHITECTURE.md`: document model (embedded questions/answers), indexes, connection pattern.
- Updated `docs/TASKS.md` Phase 0/3 and `.cursor/rules/architecture.mdc` to match.

## 2026-08-12 — Product planning (pre-code)

- Added `docs/SPEC.md`: product vision, personas, MVP scope, out-of-scope, NFRs.
- Added `docs/ARCHITECTURE.md`: stack, layers, data model, auth, folder conventions.
- Added `docs/DESIGN.md`: visual direction, tokens, typography, UX/a11y rules.
- Added `docs/TASKS.md`: phased agent backlog (Phase 0–5) for MVP build.
- Added Cursor rules: `.cursor/rules/architecture.mdc`, `.cursor/rules/ui.mdc`.
