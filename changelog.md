# Changelog

## 2026-09-01 — Batas respons: perangkat lain tidak lagi diblokir tanpa centang

- Pembatasan duplikat (email Google, nomor HP/email di formulir) hanya aktif jika **Batasi 1 respons per orang** dicentang.
- **Kumpulkan alamat email (Google)** tanpa batas respons: email tetap dicatat, perangkat/akun yang sama boleh mengirim lagi.
- Halaman publik tidak lagi menampilkan “sudah mengirim” hanya karena email Google pernah terdeteksi saat batas respons mati.
- Hint pengaturan diperjelas; perbaikan UI saat error duplikat (tidak lagi dianggap “satu respons per browser”).
- **MongoDB:** index unik lama `meta.respondentEmail` dihapus; respons lama dengan `meta.* = null` dibersihkan (menyebabkan E11000 pada submit kedua). Jalankan sekali: `npm run migrate:response-indexes` (baca `.env.local` otomatis).
- Submit tanpa batas respons memakai kunci unik berbasis waktu untuk `respondentKey` (`open:…`) dan `uniqueKey` (`uniq:…`).
- Perbaikan build Docker: error TS di `scripts/migrate-response-indexes.ts`; folder `scripts/` dikecualikan dari typecheck Next.js.

## 2026-09-01 — Prompt wawasan AI dari input pengguna

- Prompt hardcoded dihapus; instruksi analisis sepenuhnya dari textarea pengguna (wajib, maks. 4000 karakter).
- Form instruksi bisa di-collapse (`<details>`); placeholder berisi contoh instruksi.

## 2026-09-01 — Prompt wawasan AI: segment rendah/cukup/baik

- Segment: 1–4 rendah, 5–7 cukup, 8–10 baik.
- Bagian 3–5 merangkum jawaban dominan di 3 pertanyaan lain per kelompok segment.

## 2026-09-01 — Perbaikan OpenAI model gpt-5 / o-series

- API memakai `max_completion_tokens` (bukan `max_tokens`) untuk model `gpt-5*` dan `o*`.

## 2026-09-01 — Konteks tambahan saat generate wawasan AI

- Field teks opsional sebelum **Buat wawasan AI** / **Buat ulang** untuk memandu fokus laporan (maks. 2000 karakter).

## 2026-09-01 — Kartu Wawasan AI full width

- Panel dan isi laporan AI memakai lebar penuh; tabel memanfaatkan ruang horizontal.

## 2026-09-01 — Format laporan AI mengikuti contoh PDF presentasi

- Prompt mengikuti struktur laporan 10 bagian (gambaran umum, distribusi, silang kelompok, harapan, temuan, arah pastoral, catatan metodologis).
- Laporan penuh ditampilkan di panel Wawasan AI; grafik tetap sebagai lampiran visual.

## 2026-09-01 — Wawasan AI: rangkuman per pertanyaan

- AI **merangkum** respons tiap pertanyaan (bukan kesimpulan/rekomendasi umum).
- Struktur laporan: gambaran umum + `## Pertanyaan N` untuk setiap pertanyaan.
- Rangkuman per pertanyaan ditampilkan di kartu grafik; panel atas menampilkan gambaran umum.

## 2026-09-01 — Wawasan AI: paragraf naratif, bukan per kata

- Prompt menekankan kalimat utuh dan paragraf mengalir; data `topWords` tidak lagi dikirim ke AI.
- Tampilan laporan: lebar baca ~70 karakter, line-height lebih longgar.

## 2026-09-01 — Prompt wawasan AI disederhanakan

- Instruksi utama: baca hasil survei secara sistematik sesuai data terkumpul, siap dipresentasikan.

## 2026-09-01 — Perbaikan Failed to fetch wawasan AI

- Memuat wawasan tersimpan tidak lagi mengambil seluruh respons (757+); hanya hitung + timestamp terakhir.
- Server action AI: batas waktu 120 detik; error jaringan ditangkap di UI, bukan error boundary.

## 2026-09-01 — Laporan AI dirender sebagai Markdown

- Output AI diminta dalam format **Markdown (GFM)**; tampilan memakai `react-markdown` + `remark-gfm` (heading, paragraf, tabel, daftar).
- Parser custom diganti; laporan lama tetap tampil (heading plain text tetap terbaca sebagai paragraf).

## 2026-09-01 — Tampilan laporan AI: narasi + tabel

- Laporan AI di-parse dan ditampilkan dengan judul bagian, paragraf, daftar, serta **tabel HTML** yang bisa di-scroll di mobile.
- Prompt AI diminta memakai format tabel markdown pipe agar tabel ter-render rapi.

## 2026-09-01 — Format laporan wawasan AI naratif

- Output AI berubah dari JSON ringkas menjadi **laporan naratif** (10 bagian: gambaran umum, distribusi, silang kelompok partisipasi, harapan, temuan, arah pastoral, catatan metodologis).
- Konteks AI diperkaya: rentang tanggal, cakupan jawaban per pertanyaan, analisis silang skala vs pilihan.
- UI menampilkan laporan penuh; grafik per pertanyaan tetap sebagai visualisasi pendukung.
- Cache format lama otomatis dikonversi ke laporan teks.


- Maks. **3 kali buat ulang** per snapshot data respons; tombol hilang setelah kuota habis.
- Respons baru mereset kuota.

## 2026-09-01 — Prompt wawasan AI disederhanakan

- Instruksi utama: baca hasil survei secara sistematik sesuai data terkumpul.

## 2026-09-01 — Perbaikan hydration word cloud

- Word cloud hanya di-render di client untuk menghindari mismatch posisi spiral SSR vs browser.

## 2026-09-01 — Wawasan AI tersimpan otomatis

- Wawasan AI yang sudah pernah dibuat dimuat dari database saat tab dibuka; tombol **Buat wawasan AI** hanya muncul jika belum ada.
- Setelah ada respons baru, cache lama tidak dipakai — tombol generate muncul lagi.

## 2026-09-01 — Wawasan AI on-demand

- Analisa AI hanya dijalankan setelah klik **Buat wawasan AI**, bukan otomatis saat tab dibuka.

## 2026-09-01 — Wawasan AI di tab Analisa

- Tab **Analisa & wawasan** menghasilkan ringkasan, temuan, rekomendasi, dan narasi per pertanyaan via AI.
- Cache MongoDB per formulir; invalidasi otomatis saat ada respons baru.
- Env: `OPENAI_API_KEY` atau `GEMINI_API_KEY` (opsional `OPENAI_MODEL` / `GEMINI_MODEL`).

## 2026-09-01 — Word cloud analisa respons

- Tata letak spiral, warna bervariasi, kata teratas lebih besar (Fraunces), animasi masuk & tooltip frekuensi saat hover.

## 2026-09-01 — Scroll semua respons per pertanyaan

- Daftar per pertanyaan: hapus paginasi; semua jawaban (setelah filter) tampil dalam kartu yang bisa di-scroll.

## 2026-09-01 — Filter daftar respons per pertanyaan

- Dropdown pilih pertanyaan (`?q=`) + pencarian & filter jawaban di tiap kartu pertanyaan.

## 2026-09-01 — Tab URL, label responden teks, scroll kartu

- Tab editor (`?tab=responses`, `?tab=responses&view=list&list=individual`) tetap setelah refresh.
- Sampel jawaban teks di analisa menampilkan nama/email responden, bukan waktu.
- Kartu pertanyaan (analisa & daftar per pertanyaan) bisa di-scroll saat konten panjang.

## 2026-09-01 — UX rentang di mobile

- Pertanyaan rentang di layar kecil memakai slider dengan thumb 44px dan angka terpilih besar.
- Di desktop, tombol angka dibungkus (wrap) ukuran 44×44px, bukan satu baris sempit.

## 2026-09-01 — Perbaikan build Docker (TypeScript)

- `revalidateTag` Next.js 16 wajib argumen kedua (`'max'`); Server Actions pakai `updateTag` untuk invalidasi cache form publik.
- Perbaikan tipe `LeanResponse.meta` dan fixture `collectRespondentEmail`.

## 2026-09-01 — Cache form publik (Next.js)

- `getPublicFormBySlug` memakai `unstable_cache` — load `/f/[slug]` tidak selalu hit MongoDB.
- Cache di-invalidate otomatis saat form diubah: meta, pertanyaan, status, header, hapus form.

## 2026-09-01 — Email responden tanpa login (deteksi browser)

- Kumpulkan email Google: tidak ada halaman login — deteksi otomatis dari sesi Firebase di browser + Google One Tap (Chrome).
- Formulir tetap bisa diisi jika email tidak terdeteksi; email disimpan bila tersedia.
- Env opsional: `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (Web client ID dari Firebase Console).

## 2026-09-01 — Kumpulkan email responden (Google)

- Pengaturan formulir: **Kumpulkan alamat email (Google)** — responden masuk dengan Google sebelum mengisi; email tampil di atas formulir (seperti Google Form) dan disimpan di meta respons.
- Satu akun Google hanya bisa mengirim sekali per formulir dengan opsi ini aktif.

## 2026-09-01 — Perbaikan klik angka pertanyaan rentang

- Preview rentang di builder dan tab Pratinjau sekarang bisa diklik (sebelumnya `disabled`).
- Angka skala di editor pertanyaan rentang bisa dipilih untuk uji tampilan.

## 2026-08-31 — Dokumentasi env email production (Docker)

- `.env.docker.example`: `RESEND_API_KEY` + `EMAIL_FROM` tidak lagi di-comment; contoh `EMAIL_FROM` dengan tanda kutip.
- `docs/PRODUCTION.md`: penjelasan `.env.local` ≠ `.env.production`, troubleshooting kolaborator email, perintah cek env di container.

## 2026-08-31 — Undangan kolaborator: pesan email lebih jelas

- Bedakan **belum dikonfigurasi** vs **gagal kirim** (Resend/domain) di UI kolaborator.
- Tombol **Salin tautan** dan **Kirim ulang email** untuk kolaborator berstatus Menunggu.
- Banner info jika `RESEND_API_KEY` / `EMAIL_FROM` belum diset di server.

## 2026-08-31 — Verifikasi email & profil saat daftar

- Daftar email/password: kirim email konfirmasi Firebase, lalu arahkan ke `/verify-email`.
- Setelah verifikasi: form profil di `/complete-profile` (nama wajib, HP opsional).
- Dasbor & editor formulir diblokir sampai email terverifikasi (akun email) dan profil selesai.
- Daftar Google: lewati verifikasi email, langsung ke form profil jika belum lengkap.
- Pengguna lama yang sudah menyelesaikan onboarding tour tidak diminta isi profil ulang.

## 2026-08-31 — Fitur kolaborator diaktifkan

- `featureFlags.collaborators = true` — undang kolaborator via email, badge di daftar formulir, halaman terima undangan `/invite/[token]`.
- Email undangan via Resend jika `RESEND_API_KEY` + `EMAIL_FROM` diset; tanpa itu tautan undangan tetap dibuat dan bisa disalin di UI.

## 2026-08-31 — Docker production

- `Dockerfile` (multi-stage, Next.js standalone), `docker-compose.yml`, `.env.docker.example`, `.dockerignore`.
- `output: "standalone"` di `next.config.ts`; scripts `npm run docker:build|up|down|logs`.
- Panduan deploy Docker di `docs/PRODUCTION.md` §4b.
- Bagian **Production (Docker)** di `README.md`.

## 2026-08-31 — Panduan production

- Dokumen baru `docs/PRODUCTION.md`: env, deploy, keamanan, checklist pre-launch, monitoring, backup, CI/CD.

## 2026-08-31 — Rebrand Forma → Survei

- Nama produk di UI, metadata halaman, email, share card, dan file unduhan QR diganti menjadi **Survei**.

## 2026-08-31 — Integration & E2E tests

- Integration tests untuk `POST /api/f/[slug]/submit` (mock DB): 404, 403 closed, validasi, unique conflict, sukses + cookie.
- Playwright E2E: smoke (landing, login, 404) + submit form publik (fixture MongoDB via `e2e/global-setup.ts`).
- Scripts: `npm run test:e2e`, `npm run test:all`.
- E2E menjalankan `next build && next start` di port **3100** (tidak bentrok dengan `npm run dev` di :3000).

## 2026-08-31 — Automated tests (Vitest)

- Vitest + `npm test` untuk critical path domain/lib.
- Coverage: validasi jawaban (termasuk file upload path), unique key HP/email, rate limit in-memory.

## 2026-08-31 — Distributed rate limiting (Upstash Redis)

- Public submit/upload memakai **Upstash Redis** saat `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` diset — limit konsisten di semua instance.
- Tanpa Upstash, fallback in-memory per proses (dev lokal).
- Sliding window via `@upstash/ratelimit`; gagal Redis → fail-open (request tetap diproses, error di-log).

## 2026-08-31 — Production hardening (audit follow-up)

- **Keamanan file upload:** validasi path jawaban file harus cocok dengan `form-uploads/{formId}/{questionId}/` — mencegah lampiran file dari form lain.
- **Security headers:** `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, dan HSTS (production only) di `next.config.ts`.
- **Logout:** revoke Firebase refresh tokens saat sign out agar session cookie tidak bisa dipakai ulang.
- **Node:** `engines.node >= 20.9.0` di `package.json`; `NEXT_PUBLIC_SITE_URL` didokumentasikan di `.env.example`.
- **ESLint:** perbaikan 9 error (setState-in-effect, prefer-const, immutability) — `npm run lint` bersih.

## 2026-08-31 — Bagikan QR & kolaborator disembunyikan

- Menu **Bagikan**: opsi **Tampilkan QR** (dialog pratinjau) dan **Unduh QR** (PNG).
- QR dioptimalkan untuk pemindaian: kontras hitam-putih, quiet zone 4 modul, koreksi error tinggi, pratinjau retina, unduhan 1200px untuk cetak.
- Fitur kolaborator disembunyikan sementara (`featureFlags.collaborators = false`); kode backend tetap ada.

## 2026-08-31 — Kolaborasi formulir (undang lewat email)

- Pemilik formulir dapat mengundang kolaborator lewat email (tab **Pengaturan → Kolaborator**).
- Peran **editor**: mengedit formulir, melihat/mengekspor respons; tidak bisa hapus/duplikat formulir atau mengelola kolaborator.
- Undangan dikirim via Resend (`RESEND_API_KEY`, `EMAIL_FROM`); tautan `/invite/{token}` tetap bisa disalin manual.
- Dasbor menampilkan formulir milik sendiri + yang dibagikan; badge **Dibagikan** untuk formulir kolaborasi.
- Undangan pending otomatis aktif saat pengguna masuk dengan email yang sesuai.

## 2026-08-31 — Seed survei lingkungan (tipe range)

- Skrip `seed-lingkungan-survey.ts`: Q1 skala 1–10 memakai tipe **range** (nilai numerik, bukan ID pilihan ganda).
- Opsi `SEED_RESPONSES_ONLY=1` untuk mengganti jawaban saja tanpa mengubah struktur formulir yang sudah diedit.

## 2026-08-31 — Panel putih per section di builder

- Tab **Pertanyaan**: setiap halaman/section formulir dibungkus panel putih (`forma-section`); pemisah antar-section tetap di luar panel.

## 2026-08-31 — Logo transparan & favicon

- Logo UI memakai `public/logo.png` (background putih dihapus dari `logo.jpeg`).
- Favicon/tab browser diganti dari ikon default Next.js ke `favicon.ico` + `icon.png` yang dihasilkan dari logo yang sama (`npm run generate:icons`).

## 2026-08-31 — Logo Forma

- Memasang `public/logo.jpeg` di header aplikasi, landing, login/signup, halaman formulir publik, dan favicon.
- Komponen `BrandLogo` untuk ukuran dan penempatan konsisten.

## 2026-08-31 — Aksi formulir di top bar

- Semua aksi formulir (kembali, status, salin/buka tautan, bagikan, terbitkan/tutup, duplikat, hapus) dipusatkan di satu top bar sticky.
- Menu **Bagikan** dan **Aksi lainnya** memakai dropdown agar tidak memenuhi layar.
- Blok duplikat/hapus di tab Pengaturan dihapus (sudah ada di top bar).

## 2026-08-31 — Section panel latar putih

- Utility `forma-section` untuk kartu/panel berborder putih (`bg-bg-elevated`).
- Tab Pengaturan: setiap blok (tema, header, konfirmasi, batas respons, aksi) memakai panel putih.
- Dashboard, login/signup, respons, builder, dan analisa: kontainer section yang sebelumnya abu (`bg-bg`) diseragamkan ke putih.

## 2026-08-31 — Kompresi gambar otomatis

- Gambar header formulir dan jawaban `file_upload` (format gambar) dikompres di server sebelum disimpan (resize + JPEG/WebP via `sharp`).
- Header: maks. 1920×1080, kualitas ~82%; unggahan responden: maks. 2048×2048, kualitas ~85%.
- GIF animasi tidak diubah; jika hasil kompresi lebih besar dari asli, file asli tetap dipakai.

## 2026-08-31 — Penyimpanan AWS S3 (selaras simk-garum)

- Upload file & gambar header ke S3 **privat** (tanpa ACL publik); akses baca lewat signed URL.
- Env vars utama: `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_BUCKET` (alias `AWS_S3_*` / `S3_*` tetap didukung).
- Opsional `AWS_S3_PREFIX` untuk prefix key (mis. `survei_keuskupan/form-headers/...`).
- Referensi file di DB memakai format `s3://bucket/key`; URL ditandatangani ulang saat halaman/form respons dibaca.
- Validasi jawaban file menerima URL `s3://`; tautan unduh di detail respons memakai signed URL segar.

## 2026-08-31 — Gambar header formulir

- Di tab **Pengaturan**, pemilik formulir dapat mengunggah atau menghapus gambar header (JPG/PNG/GIF/WebP, maks. 5 MB).
- Gambar ditampilkan di halaman isi publik dan pratinjau; tanpa gambar, fallback ke garis warna tema.
- Penyimpanan file: dukungan **AWS S3** (env `S3_REGION`, `S3_BUCKET`, kredensial IAM); opsional CloudFront via `S3_PUBLIC_BASE_URL`. Tanpa S3, fallback Firebase Storage.

## 2026-08-31 — Kartu pertanyaan di halaman formulir

- Setiap pertanyaan di halaman isi publik dan pratinjau ditampilkan sebagai kartu dengan latar putih (`bg-bg-elevated`), border halus, dan padding nyaman.
- Lebar konten formulir publik & pratinjau diperbesar (`max-w-xl` → `48rem`, selaras dengan builder).
- Skala tipografi distandarkan (`form-fill-typography.ts`): judul, label pertanyaan, input, dan opsi memakai `text-base` (16px); teks bantu/meta `text-sm`.

## 2026-08-31 — Tipe pertanyaan Rentang

- Menambah opsi tipe pertanyaan **Rentang** di builder: atur minimum/maksimum (mis. 1–10) dan label ujung opsional.
- Responden memilih nilai lewat tombol radio horizontal; validasi server & klien memastikan nilai dalam rentang.
- Analisa respons menampilkan grafik batang distribusi (sama seperti skala rating).
- Perbaikan: model Mongoose di dev di-register ulang agar enum tipe `range` dikenali setelah perubahan schema.

## 2026-08-31 — Daftar respons per responden

- Kolom waktu diganti **Responden** (nama/HP/email dari formulir, atau "Responden 1", "Responden 2", …); daftar diurutkan menurut nama responden.

## 2026-08-31 — Analisa per pertanyaan

- Tab **Analisa & wawasan** menampilkan satu kartu per pertanyaan (urut seperti formulir); filter rentang tanggal dan KPI agregat dihapus.
- Progress bar rating di bawah grafik batang skala dihapus.

## 2026-08-31 — Daftar respons per pertanyaan & per individu

- Sub-tab **Daftar respons**: **Per pertanyaan** (jawaban dikelompokkan per pertanyaan, dengan paginasi) dan **Per individu** (daftar respons per orang).

## 2026-08-31 — Tab daftar hadir dihapus

- Menghapus sub-tab **Daftar hadir** dari panel Respons (tetap ada **Analisa & wawasan** dan **Daftar respons**).

## 2026-08-31 — Dashboard analisa survei

- Redesain tab **Analisa & wawasan**: header formulir + filter tanggal, KPI (total, penyelesaian, CSAT), grafik batang & skala rating, donut untuk pilihan ganda, sentimen kata kunci + word cloud untuk jawaban terbuka, ekspor CSV/PDF (cetak), dan bagikan laporan.

## 2026-08-31 — Halaman analisa respons

- Tab **Analisa** di panel Respons: ringkasan survei (total, periode, skor rata-rata), distribusi skala 1–10, dan sampel jawaban terbuka.
- **Daftar respons** dan **Daftar hadir** dipindah ke sub-tab terpisah.

## 2026-08-31 — Fix WhatsApp share hydration mismatch

- Resolved React hydration error on the form editor: `publicFormUrl` now receives a server-derived `siteOrigin` so WhatsApp share links match between SSR and client.

## 2026-08-31 — Seed survei partisipasi lingkungan

- Added `scripts/seed-lingkungan-survey.ts` (`npm run seed:lingkungan`) to create **Survei Partisipasi Lingkungan** for Atanasius Ivannoel with 4 questions (skala 1–10, alasan, harapan lingkungan, harapan Gereja Roh Kudus) and 757 random responses for analytics testing.

## 2026-08-31 — Firebase Auth IndexedDB fix

- Upgraded `firebase` from 12.17.1 to 12.18.0 to fix a known regression where Auth’s IndexedDB persistence threw `Database is closing/hidden` on tab visibility changes (e.g. Google sign-in popup, dev HMR).

## 2026-08-19 — v1.2.0 slices A–D

- WhatsApp share from the form bar: open WA, copy caption, download a share card image.
- Unique response by HP or email (Pengaturan); duplicates rejected on submit.
- Dashboard templates: pendaftaran acara, pendataan singkat, umpan balik; Responses tab has daftar hadir (printable).
- Public success screen includes a bukti kirim (code, time, copy/print).

## 2026-08-19 — Plan v1.2.0

- Documented differentiation release: WhatsApp share, unique HP/email, acara templates + daftar hadir, bukti kirim (stretch: response status).
- Plan: `docs/V1.2.0.md`; backlog checkboxes in `docs/TASKS.md`. Not started until “Start v1.2.0”.

## 2026-08-19 — Post-login onboarding

- First visit to the dashboard opens a 5-step guide (create, questions/sections, theme & limits, publish & responses).
- Skip or finish marks the tour done; “Lihat panduan” on the dashboard opens it again.

## 2026-08-19 — Limit to one response per browser

- Pengaturan: “Batasi 1 respons per orang” so the same browser cannot submit twice.
- Enforced with an HTTP-only cookie and a stored respondent key; returning visitors see “Anda sudah mengirim respons”.
- Clearing cookies / using another device can still submit again (no respondent login).

## 2026-08-19 — Form theme presets

- Pengaturan includes a form theme picker (teal, forest, ocean, sunset, grape, slate, paper).
- Chosen colors apply to the public fill page and the Pratinjau tab (header bar, background, accent).

## 2026-08-19 — App shell uses a page container

- Dashboard and form editor share a centered `.page-container` (max 72rem) for header and main.
- Removed the full-width form editor layout so the canvas lines up with the rest of the app.

## 2026-08-19 — Paged preview for multi-section forms

- Pratinjau shows one bagian at a time, with Kembali / Selanjutnya (and Kirim on the last page).
- Submit in preview does not send a response.

## 2026-08-19 — Clearer section layout in the builder

- Form title and description stay at the top of the canvas.
- Each bagian sits with its own questions; extra pages start after a “Halaman berikutnya” break.
- Section cards are labeled “Judul bagian” so they are not confused with the form title.

## 2026-08-19 — Allow empty question labels while editing

- Autosave no longer shows “Label pertanyaan wajib diisi” when a question title is blank.
- Blank labels are stored as “Pertanyaan tanpa judul”.

## 2026-08-19 — Preview tab

- Moved form preview out of the editor canvas into its own **Pratinjau** tab.
- Preview shows the respondent view of the current draft (answers are not submitted).

## 2026-08-19 — Google Forms–style builder layout

- Form editor is a centered canvas: title card, question cards, and a floating add toolbar.
- Removed the side-by-side live preview; the cards are the form (select a card to edit).
- Add question / add section sit beside the selected card (desktop) and in a bottom bar (mobile).

## 2026-08-18 — Form sections (multi-page forms)

- Creators can split a form into sections; each section is a page for respondents.
- Builder: add, rename, reorder, and delete sections; questions stay grouped per page.
- Public fill: Next / Back, page progress, and validation of the current page before continuing.
- Existing single-page forms keep working (one implicit section).

## 2026-08-18 — Fix Google sign-in popup

- Set `Cross-Origin-Opener-Policy: same-origin-allow-popups` so the Google popup can return the credential to the app.
- Initialize Firebase Auth in the browser with `browserPopupRedirectResolver` and pass it to `signInWithPopup`.
- Map more Firebase errors (provider disabled, network, popup/internal) instead of a generic failure.

## 2026-08-18 — Allow LAN origin in Next.js dev

- Set `allowedDevOrigins` in `next.config.ts` so the app can be loaded from `192.168.1.140` during `next dev` without blocked `/_next` requests.

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
