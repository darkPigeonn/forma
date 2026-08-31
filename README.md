# Survei

Google Forms–like app: create forms, share a link, collect answers.

**Stack:** Next.js (App Router) · MongoDB + Mongoose · Firebase Auth · Tailwind · Zod

## Quick start

1. **Prerequisites:** Node 20+, MongoDB running locally (or Atlas URI), a Firebase project with **Email/Password** and **Google** sign-in enabled.

2. **Install**

```bash
npm install
```

3. **Env**

```bash
cp .env.example .env.local
```

Fill in:

| Variable | Where |
|----------|--------|
| `MONGODB_URI` | Local Mongo or Atlas connection string |
| `NEXT_PUBLIC_FIREBASE_*` | Firebase Console → Project settings → Your apps (Web) |
| `FIREBASE_*` Admin | Firebase Console → Project settings → Service accounts → Generate new private key |

Enable **Email/Password** and **Google** under Authentication → Sign-in method.  
For Google: use the Firebase-managed consent screen (or your own OAuth client). Add `localhost` to Authorized domains if needed.

Enable **Storage** in Firebase Console (default bucket) so **Unggah file** questions can store uploads. Ensure `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` matches that bucket.

4. **Run**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

5. **Optional demo seed** (after you sign up once)

Set `SEED_OWNER_UID` to your Firebase UID in `.env.local`, then:

```bash
npm run seed
```

Opens a published demo form at `/f/demo-feedback`.

## Production (Docker)

```bash
cp .env.docker.example .env.production
# Edit .env.production (MongoDB, Firebase, S3, Upstash, NEXT_PUBLIC_*)

docker compose up -d --build
```

Panduan lengkap: [docs/PRODUCTION.md](docs/PRODUCTION.md) (bagian **4b**).

## MVP status

- [x] Phase 0 — Foundation (Next.js, Mongo, Firebase)
- [x] Phase 1 — Form CRUD + publish/slug
- [x] Phase 2 — Form builder
- [x] Phase 3 — Public fill + submit
- [x] Phase 4 — Responses + CSV
- [x] Phase 5 — Landing polish, a11y, loading/error states, seed, security checklist

See `docs/TASKS.md` for details.

## Docs

- [Product spec](docs/SPEC.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Design](docs/DESIGN.md)
- [Production guideline](docs/PRODUCTION.md)
- [Tasks](docs/TASKS.md)
