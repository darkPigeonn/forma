# Survei — Production Guideline

Panduan deploy dan operasional **Survei** ke production. Untuk arsitektur teknis, lihat [`ARCHITECTURE.md`](./ARCHITECTURE.md).

**Last updated:** 2026-08-31

---

## 1. Ringkasan stack

| Komponen | Layanan |
|----------|---------|
| App | Next.js 16 (App Router), Node ≥ 20.9 |
| Database | MongoDB (Atlas atau self-hosted) |
| Auth | Firebase Auth + Firebase Admin (session cookie) |
| File storage | AWS S3 (disarankan) atau Firebase Storage |
| Rate limit | Upstash Redis (wajib multi-instance) |
| Email (opsional) | Resend |

---

## 2. Prasyarat sebelum deploy

- [ ] Domain production + HTTPS (TLS di reverse proxy / platform)
- [ ] MongoDB cluster dengan backup otomatis
- [ ] Proyek Firebase (Auth + Admin SDK)
- [ ] Bucket S3 privat + IAM user terbatas (jika pakai upload file)
- [ ] Upstash Redis (region dekat server app)
- [ ] `NEXT_PUBLIC_SITE_URL` mengarah ke domain final (tanpa trailing slash)

---

## 3. Environment variables

Salin dari [`.env.example`](../.env.example). **Jangan** commit `.env.local` atau secret ke git.

### Wajib

| Variable | Catatan |
|----------|---------|
| `MONGODB_URI` | Connection string MongoDB production |
| `NEXT_PUBLIC_SITE_URL` | `https://survei.domainanda.com` — untuk link share, QR, undangan |
| `NEXT_PUBLIC_FIREBASE_*` | Config web Firebase (boleh public) |
| `FIREBASE_PROJECT_ID` | Admin SDK |
| `FIREBASE_CLIENT_EMAIL` | Admin SDK |
| `FIREBASE_PRIVATE_KEY` | Admin SDK; newline sebagai `\n` di env |
| `NODE_ENV` | `production` (biasanya otomatis di platform) |

### Sangat disarankan (production)

| Variable | Catatan |
|----------|---------|
| `UPSTASH_REDIS_REST_URL` | Rate limit terdistribusi |
| `UPSTASH_REDIS_REST_TOKEN` | Tanpa ini, limit hanya per proses (lemah saat scale) |
| `AWS_REGION` | Mis. `ap-southeast-3` |
| `AWS_ACCESS_KEY_ID` | IAM: `s3:PutObject`, `GetObject`, `DeleteObject` |
| `AWS_SECRET_ACCESS_KEY` | |
| `AWS_BUCKET` | Bucket privat, tanpa public ACL |

### Opsional

| Variable | Catatan |
|----------|---------|
| `AWS_S3_PREFIX` | Prefix key, mis. `survei_keuskupan/` |
| `DOCUMENT_STORAGE_ENDPOINT` | MinIO / S3-compatible |
| `RESEND_API_KEY` | Undangan kolaborator — **wajib di server production** (bukan `.env.local` dev) |
| `EMAIL_FROM` | `"Survei <noreply@domainanda.com>"` — pakai tanda kutip jika ada spasi/`>` |

### Firebase Console

1. **Authentication** → aktifkan Email/Password + Google
2. **Authorized domains** → tambahkan domain production
3. **Google sign-in** → OAuth consent + redirect URI jika perlu
4. **Storage** → hanya jika tidak pakai S3 (fallback upload)

### `FIREBASE_PRIVATE_KEY`

Di beberapa platform (Vercel, Railway), paste key dengan `\n` literal:

```
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"
```

---

## 4. Build & deploy

### Perintah standar

```bash
npm ci
npm run lint
npm test
npm run build
npm run start
```

Default port Next.js: **3000**. Atur `PORT` sesuai platform.

### Node.js

- Minimum: **20.9.0** (`package.json` → `engines`)
- Disarankan: Node 22 LTS di production

### Docker (VPS / self-hosted)

Cara tercepat untuk production di server sendiri. Detail lengkap: bagian **4b** di bawah.

```bash
cp .env.docker.example .env.production
# Edit .env.production — isi MongoDB, Firebase, S3, Upstash, NEXT_PUBLIC_*

docker compose up -d --build
docker compose logs -f survei
```

App listen di `HOST_PORT` (default **3000**). Letakkan **nginx/Caddy** di depan untuk HTTPS.

### Platform umum

| Platform | Catatan |
|----------|---------|
| **Docker** | `docker compose` + reverse proxy TLS (disarankan VPS) |
| **Vercel** | Set semua env di dashboard; MongoDB Atlas allowlist IP Vercel atau `0.0.0.0/0` |
| **VPS tanpa Docker** | `next start` di belakang nginx/Caddy; set `X-Forwarded-For` untuk rate limit IP |
| **PM2** | Satu instance OK untuk soft launch; multi-instance butuh Upstash |

### Jangan di production

- `npm run dev` — HMR, chunk 403 di headless, tidak untuk traffic nyata
- Commit `.env.local`, `.env.production`, service account JSON, atau private key ke repo

---

## 4b. Deploy dengan Docker

### File terkait

| File | Fungsi |
|------|--------|
| `Dockerfile` | Multi-stage build, output `standalone` |
| `docker-compose.yml` | Service `survei` |
| `.env.docker.example` | Template → salin ke `.env.production` |
| `.dockerignore` | Exclude `node_modules`, test, env |

### Langkah deploy

**1. Siapkan env**

```bash
cp .env.docker.example .env.production
nano .env.production   # atau editor lain
```

- `NEXT_PUBLIC_*` dipakai saat **build** image (client bundle)
- `MONGODB_URI`, `FIREBASE_*`, `AWS_*`, `UPSTASH_*`, `RESEND_*`, `EMAIL_FROM` hanya **runtime** (container)

> **Penting:** File `.env.local` di laptop **tidak** ikut ke server. Untuk Docker, isi `RESEND_API_KEY` dan `EMAIL_FROM` di **`.env.production` pada server**, lalu recreate container (lihat di bawah).

**2. Build & jalankan**

```bash
docker compose up -d --build
```

Atau via npm:

```bash
npm run docker:build
npm run docker:up
npm run docker:logs
```

**3. Cek**

```bash
curl -sI http://localhost:3000/
docker compose ps
```

**4. HTTPS (nginx contoh)**

```nginx
server {
    listen 443 ssl http2;
    server_name survei.domainanda.com;

    # ssl_certificate ... (Let's Encrypt / certbot)

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Penting: `X-Forwarded-For` agar rate limit IP benar di belakang proxy.

### Update aplikasi

```bash
git pull
docker compose up -d --build
```

Jika `NEXT_PUBLIC_*` berubah, **wajib rebuild** (`--build`).

### MongoDB & Redis

Compose ini **hanya** menjalankan app Next.js. Gunakan layanan terpisah:

- **MongoDB Atlas** — allowlist IP server Docker
- **Upstash Redis** — untuk rate limit production

### Troubleshooting

| Gejala | Solusi |
|--------|--------|
| Build gagal `NEXT_PUBLIC_*` | Pastikan variabel terisi di `.env.production` sebelum `docker compose build` |
| `Missing MONGODB_URI` | Cek `env_file` di compose; restart container |
| Firebase `invalid private key` | Escape `\n` di `FIREBASE_PRIVATE_KEY` |
| Google login gagal | Tambah domain production di Firebase Authorized domains |
| Upload file gagal | Set `AWS_*` atau Firebase Storage bucket |
| Kolaborator: “Email belum dikonfigurasi” | Tambah `RESEND_API_KEY` + `EMAIL_FROM` di **`.env.production` server** (bukan `.env.local`), lalu `docker compose --env-file .env.production up -d` — **rebuild tidak wajib** |
| Cek env di container | `docker compose exec survei node -e "console.log('resend', !!process.env.RESEND_API_KEY, 'from', process.env.EMAIL_FROM)"` |

### Resource minimum

| Resource | Rekomendasi |
|----------|-------------|
| RAM | 512 MB–1 GB |
| CPU | 1 vCPU |
| Disk image | ~300–500 MB |

---

## 5. Keamanan

### Sudah diimplementasi di app

- Session httpOnly `forma_session` (5 hari), ditukar dari Firebase ID token di server
- Logout mencabut refresh token Firebase
- Ownership check pada form/respons (`ownerId === firebaseUid`)
- Validasi Zod di server; path file upload harus `form-uploads/{formId}/{questionId}/`
- Rate limit submit/upload (per IP + per form)
- Security headers: `nosniff`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, HSTS (production)
- S3 privat + signed URL (bukan public ACL)
- CSV export hanya untuk pemilik (session + ownership)

### Checklist operator

- [ ] HTTPS end-to-end
- [ ] MongoDB user dengan hak minimal (bukan root)
- [ ] Rotate IAM key / Firebase service account secara berkala
- [ ] Firebase rules: jangan expose Admin credentials ke client
- [ ] Backup MongoDB terjadwal + uji restore
- [ ] Monitor log error (submit gagal, session gagal, Redis down)

### Rate limit (default)

| Endpoint | Per IP / menit | Per form / menit |
|----------|----------------|------------------|
| Submit | 20 | 600 |
| Upload | 30 | 400 |

Jika Redis down, app **fail-open** (request tetap diproses, error di-log). Pantau log jika Upstash outage.

---

## 6. Pre-launch checklist

### Fungsional

- [ ] Sign up / sign in (email + Google)
- [ ] Buat form → publish → buka `/f/{slug}`
- [ ] Submit respons dari mobile
- [ ] Lihat respons + export CSV
- [ ] Tutup form → submit ditolak
- [ ] Link share / QR mengarah ke domain benar (`NEXT_PUBLIC_SITE_URL`)

### Teknis

- [ ] `npm run build` sukses di CI
- [ ] `npm test` lulus (25 tests)
- [ ] `npm run test:e2e` lulus (butuh `MONGODB_URI`; jalan di port 3100)
- [ ] Env production lengkap di platform
- [ ] MongoDB index terbuat (otomatis via Mongoose saat pertama jalan)

### Smoke test manual (5 menit)

```bash
# Setelah deploy
curl -sI https://survei.domainanda.com/ | head -5   # 200 + HSTS
# Login → buat 1 pertanyaan → publish → submit → export CSV
```

---

## 7. Monitoring & operasional

### Yang pantau

- Error rate HTTP 5xx pada `/api/f/*/submit`
- Latency MongoDB (Atlas metrics)
- Upstash Redis hit/miss & error
- Disk / memory Node process
- Jumlah respons per form (spike = kemungkinan abuse)

### Log yang sudah ada

- `session create failed` — auth / Firebase Admin
- `submit failed` — DB atau validasi
- `distributed rate limit failed` — Redis
- `upload failed` / `header upload failed` — storage

**Rekomendasi:** pasang Sentry / Datadog / platform log aggregation untuk production serius.

### Health check

Belum ada endpoint `/api/health`. Untuk load balancer, bisa gunakan `GET /` (200) atau tambahkan health route di fase berikutnya.

---

## 8. Backup & recovery

| Data | Cara backup |
|------|-------------|
| MongoDB | Atlas backup / `mongodump` terjadwal |
| S3 | Versioning bucket (opsional) |
| Firebase Auth | Export users via Firebase Console jika perlu migrasi |

**Restore:** restore MongoDB ke cluster baru → update `MONGODB_URI` → redeploy. Slug form & respons tetap di DB.

---

## 9. Skalabilitas

| Traffic | Rekomendasi |
|---------|-------------|
| Soft launch (< 1k submit/hari) | 1 instance Node, Atlas M10, Upstash free tier |
| Event / survei ramai | Upstash wajib; scale horizontal (2+ instance); pertimbangkan MongoDB pool (`maxPoolSize: 25` default) |
| Form sangat besar | Respons embedded — pertimbangkan pagination export (belum ada di MVP) |

Load smoke (staging):

```bash
npm run load:submit -- --slug=SLUG --answers=50
```

---

## 10. CI/CD (contoh)

```yaml
# Contoh alur minimal
- npm ci
- npm run lint
- npm test
- npm run build
# deploy artifact
# npm run test:e2e  # opsional; butuh MONGODB_URI di CI secrets
```

E2E di CI: set `MONGODB_URI`, `CI=true` (Playwright build + start port 3100).

---

## 11. Rollback

1. Redeploy commit/tag sebelumnya dari platform
2. Jika migrasi DB rusak: restore snapshot MongoDB
3. Env rollback: jangan hapus env lama sampai deploy baru stabil

---

## 12. Known limitations (MVP)

- Rate limit fail-open saat Redis down
- `limitOneResponse` via cookie — bisa di-bypass (clear cookie)
- Tidak ada pagination daftar respons (lambat jika > ribuan)
- Collaborator: undang editor via email (`/invite/[token]`); butuh `RESEND_API_KEY` + `EMAIL_FROM` untuk kirim email otomatis
- Cookie/session masih memakai prefix internal `forma_*` (kompatibilitas; tidak memengaruhi branding UI)

---

## 13. Dokumen terkait

- [SPEC.md](./SPEC.md) — scope produk
- [ARCHITECTURE.md](./ARCHITECTURE.md) — layer, auth, data model
- [DESIGN.md](./DESIGN.md) — UI tokens
- [.env.example](../.env.example) — daftar env lengkap

---

## 14. Kontak & eskalasi

Isi sesuai tim Anda, misalnya:

| Peran | Tanggung jawab |
|-------|----------------|
| Dev | Deploy, env, bug aplikasi |
| Infra | MongoDB, S3, DNS, TLS |
| Firebase admin | Auth, domain authorized |
