# Forma — Implementation Tasks (Agent backlog)

Tasks below are what **I (the coding agent) will do** when you say to start building. Ordered by dependency. Checkboxes track progress.

**Suggested start command:** “Start Phase 0” or “Build MVP through Phase 3”.

---

## Phase 0 — Project foundation
- [x] Scaffold Next.js (App Router) + TypeScript + Tailwind + ESLint
- [x] Add MongoDB + Mongoose models (User, Form with embedded questions, Response with embedded answers) + indexes
- [x] Wire Firebase Auth (client SDK) + Firebase Admin (verify ID token / session cookie)
- [x] Upsert MongoDB `users` profile on login (`firebaseUid`, email, name)
- [x] Auth UI: sign up / sign in / sign out (email + password)
- [x] CSS variables + fonts (Fraunces, Source Sans 3) per DESIGN.md
- [x] App shell: protected dashboard layout (require verified Firebase session)
- [x] Env example (`.env.example`: `MONGODB_URI`, Firebase public + Admin) + README quickstart

## Phase 1 — Form CRUD
- [x] Create form (draft) from dashboard
- [x] List / rename / duplicate / delete forms
- [x] Form status: draft → published → closed
- [x] Unique public `slug` on publish
- [x] Ownership guards on all form mutations

## Phase 2 — Form builder
- [x] Question list UI (add, delete, reorder)
- [x] Question types: short, long, multiple choice, checkboxes, dropdown, email, number, date
- [x] Options editor for choice types
- [x] Required toggle + label/help text
- [x] Debounced autosave + “Saved” status
- [x] Live preview pane (desktop)
- [x] Zod schemas shared for question config

## Phase 3 — Public fill + submit
- [x] Public route `/f/[slug]` (published only)
- [x] Accessible form render from question schema
- [x] Client + server validation
- [x] Insert Response document with embedded answers (validate against form.questions)
- [x] Confirmation message page/state
- [x] Reject submits when closed
- [x] Basic rate limiting on submit

## Phase 4 — Responses & export
- [x] Responses list (owner only)
- [x] Response detail view
- [x] Choice-question summary (% / counts)
- [x] CSV export endpoint/download
- [x] Empty states when no responses

## Phase 5 — Polish & hardening
- [x] Landing page (brand-first, one composition)
- [x] Loading / error / empty states across app
- [x] Mobile pass on public form + builder
- [x] A11y pass (labels, focus, keyboard reorder)
- [x] Security review: IDOR, auth, env secrets
- [x] Seed script for demo form

---

## Post-MVP (requested)
- [x] Short public share links (`shortCode` + `/f/{code}`)
- [x] Concurrent public fill hardening (rate limits, pool, load script)

## Explicitly later (not my MVP work unless you ask)
- Branching logic, collaborators, themes, AI generate, Sheets sync

---

## Definition of done (MVP)
1. Signed-in user creates and publishes a multi-type form  
2. Anyone with the link can submit on mobile  
3. Owner sees responses + CSV export  
4. Matches DESIGN.md tokens/typography; follows ARCHITECTURE.md layers  

---

## How we’ll work
1. You approve scope / say which phase to start  
2. I implement phase tasks, keep commits only when you ask  
3. I update `changelog.md` after kept changes  
4. You review in browser; we iterate  
