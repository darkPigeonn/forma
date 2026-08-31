# Forma — Architecture

**Stack (recommended):** Next.js (App Router) · TypeScript · MongoDB · Mongoose · Firebase Auth · Tailwind CSS · Zod · React Hook Form

---

## 1. High-level diagram

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────┐
│  Creator UI     │     │  Public Form UI  │     │  API / RSC  │
│  /dashboard     │────▶│  /f/[slug]       │────▶│  Route      │
│  /forms/[id]    │     │                  │     │  Handlers   │
└────────┬────────┘     └────────┬─────────┘     └──────┬──────┘
         │                       │                      │
         └───────────────────────┴──────────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │  Domain services        │
                    │  forms · questions ·    │
                    │  responses · auth       │
                    └────────────┬────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │  MongoDB (Mongoose)     │
                    └─────────────────────────┘
```

---



## 2. App layers


| Layer                    | Responsibility                   | Location                         |
| ------------------------ | -------------------------------- | -------------------------------- |
| **UI**                   | Pages, components, accessibility | `src/app`, `src/components`      |
| **Validation**           | Zod schemas shared client/server | `src/lib/validators`             |
| **Server actions / API** | Auth checks, orchestration       | `src/app/actions`, `src/app/api` |
| **Domain**               | Pure business rules              | `src/domain`                     |
| **Data**                 | Mongoose models + queries        | `src/db`                         |


**Rule:** UI never talks to the DB directly. Always go through server actions/API → domain → db.

---



## 3. Core data model (document-oriented)

Prefer **embedded** arrays for form structure and answers (natural for MongoDB). Use separate collections for top-level aggregates and indexes.

### Collections

```
users                          # app profile mirror (identity lives in Firebase Auth)
  _id, firebaseUid, email, name, photoURL?, onboardingCompletedAt?, createdAt, updatedAt

forms
  _id, ownerId,                # ownerId = Firebase UID (string)
  title, description, slug, shortCode, status (draft|published|closed),
  confirmationMessage,
  themeId,                     # teal | forest | ocean | sunset | grape | slate | paper
  limitOneResponse,            # cookie + respondentKey: one submit per browser
  sections: [
    { id, title, description, order }   // each section = one public page
  ],
  questions: [
    {
      id,           // string (cuid) — stable id for answers
      type,         // short_text | long_text | multiple_choice | checkboxes | dropdown | email | number | date
      label, helpText, required, order, sectionId,
      options?: { choices: [{ id, label }] }
    }
  ],
  createdAt, updatedAt

responses
  _id, formId, submittedAt,
  meta?: { userAgent?, ipHash?, respondentKey? },
  answers: [
    { questionId, value }   // value: string | number | string[] | null
  ]
```

**Indexes (required):**

- `users.firebaseUid` — unique
- `users.email` — unique
- `forms.slug` — unique (sparse OK for drafts without slug; may be legacy long or short)
- `forms.shortCode` — unique sparse short share code used in copy-link URLs
- `forms.ownerId` + `forms.updatedAt`
- `responses.formId` + `responses.submittedAt`

**Why embed questions?** Builder autosave updates one document; public form loads one read.  
**Why embed answers?** One response = one insert; CSV/export reads whole docs.  
**When to split later:** very large forms / analytics pipelines → separate `answers` collection.

---



## 4. Key flows



### Create & edit

1. Authenticated user creates Form (draft, `questions: []`)
2. Builder mutates embedded `questions` via autosave (debounced `findByIdAndUpdate`)
3. Publish → validate ≥1 question, set status + unique `slug`



### Submit response

1. Public GET by slug (published only)
2. POST answers → Zod validate against live `questions`
3. Insert one `responses` document (answers embedded) — use a session/transaction if also updating counters later
4. Show confirmation



### View results

1. Owner-only access check
2. List/detail + aggregates for choice questions (`aggregation` pipeline)
3. CSV stream export

---



## 5. Auth & authorization (Firebase)

**Identity provider:** Firebase Authentication (MVP: email/password + Google).

| Side | Role |
|------|------|
| **Client** | Firebase JS SDK — sign up / sign in / sign out; obtain ID token |
| **Server** | Firebase Admin SDK — verify ID token (or session cookie); never trust client-only auth state for mutations |
| **MongoDB `users`** | Profile mirror keyed by `firebaseUid` — upsert on first successful login; **no passwords stored** |

**Session pattern (recommended for App Router):**
1. Client signs in with Firebase → gets ID token
2. Exchange for an HTTP-only **session cookie** via Admin `createSessionCookie` (or send Bearer token on each API call)
3. Server actions / route handlers call `verifySessionCookie` / `verifyIdToken` → `uid`
4. Upsert MongoDB user `{ firebaseUid: uid, email, name }`
5. Ownership checks use `form.ownerId === uid`

- Ownership: `form.ownerId === firebaseUid` for all private reads/writes
- Public: only `published` forms accept GET schema + POST responses
- Closed forms: readable confirmation only, reject new submits
- Respondents do **not** need Firebase auth for MVP (anonymous submit OK)

---



## 6. Folder conventions

```
src/
  app/
    (auth)/...
    (dashboard)/dashboard/...
    forms/[formId]/...          # builder + responses
    f/[slug]/...                # public fill
    actions/                    # server actions
  components/
    ui/
    form-builder/
    form-fill/
    responses/
  domain/
  db/
    client.ts                   # cached mongoose connect (Next.js)
    models/
      user.ts
      form.ts
      response.ts
    queries/
  lib/
    validators/
    firebase/
      client.ts                 # Firebase app (browser)
      admin.ts                  # Admin SDK (server-only)
      auth.ts                   # verify session / get current uid
```

**Next.js notes:**
- Singleton Mongoose connection helper (avoid HMR connection storms)
- Firebase Admin init once; keep service account / `FIREBASE_*` secrets server-only
- Expose only public Firebase web config (`apiKey`, `authDomain`, `projectId`, …) to the client

---



## 7. Tech decisions


| Decision   | Choice                                             | Why                                                                   |
| ---------- | -------------------------------------------------- | --------------------------------------------------------------------- |
| Framework  | Next.js App Router                                 | SSR public forms + auth + one deploy                                  |
| Auth       | Firebase Auth (+ Admin verify)                     | Managed identity; email/password + Google                             |
| Database   | MongoDB                                            | Flexible documents for questions/answers                              |
| ODM        | Mongoose                                           | Schemas, validation hooks, indexes                                    |
| Validation | Zod                                                | App-level contracts (client + server); Mongoose for persistence shape |
| Forms UI   | RHF + Zod                                          | Accessible controlled inputs                                          |
| Styling    | Tailwind + CSS variables                           | Design tokens                                                         |
| IDs        | ObjectId for docs; cuid for embedded `question.id`; Firebase UID for owners | Stable refs + identity from Firebase                    |


---



## 8. Security checklist (MVP verified)

- [x] Session / verified Firebase cookie required for dashboard + form editor layouts
- [x] Ownership checks on every form/response query (`ownerId === uid`)
- [x] Rate-limit public submit/upload (Upstash Redis when configured; in-memory fallback per process)
- [x] Mongo pool sized for concurrent public writes (`maxPoolSize`)
- [x] Load smoke script: `npm run load:submit -- --slug=… --answers=…`
- [x] MVP uses plain text only (no rich text HTML)
- [x] No secrets in client bundles; `MONGODB_URI` + Firebase Admin credentials server-only
- [x] CSV export only for owner (session + ownership)
- [x] HTTP-only `forma_session` cookie; ID tokens exchanged server-side, not kept as long-lived client storage for API auth

---



## 9. Evolution (post-MVP)

**v1.2.0 (planned):** WhatsApp share; `forms.uniqueBy` + `responses.meta.uniqueKey`; form templates in code; daftar hadir query; receipt id on response. See `docs/V1.2.0.md`.

- Branching logic as question rules on the form document
- File uploads → object storage + URL fields on answers
- Collaborators → membership collection + roles
- Response aggregates via scheduled pipelines or materialized summary fields

