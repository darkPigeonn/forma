# Forma — Product Specification

**Product:** Forma — a form builder & response collector (Google Forms–like)  
**Version:** 0.1 (MVP) · **Next:** 1.2.0 (see `docs/V1.2.0.md`)  
**Last updated:** 2026-08-19

---

## 1. Vision

Forma lets anyone create a form, share a link, collect answers, and review results — without spreadsheets or code. Focus: fast to create, pleasant to fill, clear to analyze.

---

## 2. Personas

| Persona | Goal |
|--------|------|
| **Creator** | Build surveys, registrations, feedback forms; share a link; see answers |
| **Respondent** | Open a link, answer quickly on phone or desktop, submit once |
| **Viewer** (optional later) | Read-only access to results shared by Creator |

---

## 3. MVP Scope (in)

### Auth & workspace
- Sign up / sign in via **Firebase Auth** (email + password or Google)
- Own forms list (dashboard)
- Create, rename, duplicate, delete forms
- Form status: **Draft** | **Published** | **Closed**

### Form builder
- Title + description
- Drag-and-drop (or up/down) question reorder
- Question types (MVP):
  - Short text
  - Long text (paragraph)
  - Multiple choice (single select)
  - Checkboxes (multi select)
  - Dropdown
  - Email
  - Number
  - Date
- Per question: required toggle, options editor (for choice types)
- Live preview of the public form
- Autosave while editing
- **Sections / pages:** split questions into pages; respondents use Next / Back

### Public form (respondent)
- Unique short shareable URL (`/f/{shortCode}`, ~8 chars; legacy long slugs still open)
- Mobile-first, accessible form fill UX
- Multi-page fill when the form has more than one section (progress, Next / Back, validate page before continuing)
- Client + server validation
- Success confirmation after submit
- Optional: limit to one response per browser (cookie + server check)

### Responses
- Response list per form
- Individual response detail
- Summary stats for choice questions (counts / %)
- Export CSV

### Settings (MVP-light)
- Form open/close
- Confirmation message text
- Form theme (preset colors for the public fill page)
- Limit to 1 response per browser

---

## 3b. v1.2.0 (planned)

Not G-Form feature-parity. Differentiation for Indonesian orgs (paroki, sekolah, komunitas):

- WhatsApp share pack (caption + short link + optional share image)
- One response per **HP or email** (not only browser cookie)
- Acara templates + daftar hadir
- Submit receipt (bukti kirim)
- Stretch: response status (baru / diproses / selesai)

Full plan: `docs/V1.2.0.md`.

---

## 4. Out of scope (v1)

- File uploads, signatures, payments
- Quiz scoring / answer keys
- Logic branching (show/hide)
- Collaborators / team roles
- Custom CSS / fully free-form theming (presets are in)
- Google Sheets sync, Zapier
- Offline PWA
- AI form generation (later)

---

## 5. Non-functional requirements

| Area | Requirement |
|------|-------------|
| Performance | Public form TTFB & interactivity feel snappy; builder autosave &lt; 1s perceived |
| Accessibility | WCAG 2.1 AA for public forms (labels, focus, errors, keyboard) |
| Responsiveness | Builder usable ≥1024px; public form excellent on mobile |
| Security | Auth-protected mutations; no IDOR on forms/responses; CSRF-safe APIs |
| Reliability | Durable storage; no silent data loss on autosave |
| i18n | English UI first; schema ready for later locales |

---

## 6. Success metrics (MVP)

- Creator can publish a 5-question form in &lt; 5 minutes
- Respondent can submit on mobile without confusion
- Creator can export all responses as CSV
- Zero critical accessibility blockers on public form

---

## 7. Domain glossary

| Term | Meaning |
|------|---------|
| **Form** | Container: title, description, sections, questions, settings, status |
| **Section** | A page of the form: title, description, and its questions |
| **Question** | One field with type, label, config, order, required, section |
| **Response** | One submission: answers + metadata (time, optional user) |
| **Answer** | Value for one question inside a response |
| **Slug** | Public URL identifier for a published form |
