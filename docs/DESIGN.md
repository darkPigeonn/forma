# Forma — Design System

**Brand:** Forma  
**Feel:** Calm, precise, paper-meets-digital — like a well-set form on a desk, not a SaaS dashboard clone.

---

## 1. Visual direction

- **Mood:** Clear, trustworthy, lightly warm — not cold enterprise, not playful neon
- **Anchor:** Typography + soft paper texture / subtle grain; product UI shows real form canvas
- **Avoid (hard):** Purple-indigo gradients, cream+#terracotta serif cliché, dark-mode-first, glow, emoji decoration, card-soup heroes

### Color tokens (CSS variables)

```css
:root {
  --color-bg: #e8eef0;           /* cool mist — clear page canvas */
  --color-bg-elevated: #ffffff;  /* white panels / inputs */
  --color-ink: #1c1917;          /* near-black stone */
  --color-ink-muted: #57534e;
  --color-border: #d0d9dc;
  --color-accent: #0f6e56;       /* deep teal — primary CTA */
  --color-accent-hover: #0b5a46;
  --color-danger: #b42318;
  --color-focus: #0f6e56;
  --color-success: #1b7a4e;
}
```

Accent = teal/forest. Background = cool mist (not cream). Elevated = pure white so content reads clearly. Ink = stone.

### Typography

- **Display / brand:** `"Fraunces"` (soft serif) — logo & page titles sparingly
- **UI / body:** `"Source Sans 3"` — forms, labels, tables
- **Mono (rare):** `"IBM Plex Mono"` — slugs, IDs in admin

Do **not** use Inter, Roboto, Arial, or system-ui as the primary brand stack.

---

## 2. Layout principles

| Surface | Rule |
|---------|------|
| **Marketing / landing** | One composition first viewport: brand + one headline + one line + CTA + full-bleed visual. No cards in hero. |
| **Dashboard** | Functional list: forms as rows/table, not card grids by default |
| **Builder** | Split or stacked: question list + preview; one job per panel |
| **Public form** | Single column, generous spacing, sticky progress optional later |

**Cards:** Only when they wrap an interaction (e.g. question editor block). Prefer borders/spacing over shadows.

---

## 3. Component UX rules

### Builder
- Clear “add question” affordance near last question
- Type picker: readable labels, not icon-only
- Required: toggle with visible label
- Autosave status: “Saving…” / “Saved” (aria-live polite)
- Drag handle + keyboard reorder (accessibility)

### Public form
- Visible labels (never placeholder-only)
- Inline errors next to fields after submit attempt
- Required marked with text or `*` + `aria-required`
- Large tap targets (≥44px) on mobile
- Focus ring using `--color-focus`
- Success state: calm confirmation, not confetti

### Responses
- Table for list; detail as readable Q→A
- Charts: simple bar/% for choice questions — no chart junk

---

## 4. Motion (2–3 intentional)

1. **Autosave indicator** — fade between states
2. **Question add/remove** — short height/opacity transition (~150–200ms)
3. **Public submit** — button loading → success panel crossfade

No parallax, no endless floating blobs.

---

## 5. Accessibility

- Semantic headings and landmarks
- Keyboard: tab order, Escape to close dialogs, Enter to submit forms appropriately
- Contrast ≥ 4.5:1 for body text
- Error messages associated via `aria-describedby`
- Prefer native controls; custom widgets must match ARIA patterns

---

## 6. Responsive breakpoints

| Breakpoint | Use |
|------------|-----|
| &lt; 768px | Public form primary; builder may stack / simplify |
| ≥ 768px | Builder two-pane comfortable |
| ≥ 1280px | Max content width ~1120–1200px for builder |

---

## 7. Brand test

If you remove the nav and the first screen could be any other product, branding is too weak — **Forma** name/wordmark must read as hero-level on marketing; in-app, wordmark stays quiet but consistent in the shell.
