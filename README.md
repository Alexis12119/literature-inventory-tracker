# Literature Inventory — Monthly Movement of Literature

A shared inventory workspace that replaces the spreadsheet-based literature
tracker: monthly entry with automatic movement calculation, six-month reports
matching the paper form, workbook import, reorder suggestions, and an
analytics dashboard.

Built with Next.js (App Router), TypeScript (strict), Tailwind CSS,
`lucide-react` icons, Zod validation, and Vitest. Supabase Auth + PostgreSQL
arrive with the backend milestone — until then data persists per browser via
`localStorage` (clearly badged "Frontend preview" in the UI).

## Quickstart (pnpm only)

```bash
pnpm install
pnpm dev        # http://localhost:3000
```

## Scripts

| Command           | What it does                        |
| ----------------- | ----------------------------------- |
| `pnpm dev`        | Development server                  |
| `pnpm build`      | Production build                    |
| `pnpm start`      | Serve the production build          |
| `pnpm lint`       | ESLint                              |
| `pnpm typecheck`  | `tsc --noEmit`                      |
| `pnpm test`       | Unit tests (Vitest)                 |

Quality gate before committing: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`.

## Environment

Copy `.env.example` to `.env` and fill in the values (the file itself is never
committed). Frontend-only features need no variables; Supabase wiring lands
with the backend milestone.

## Features

- **Inventory workspace** (`/inventory`) — desktop 21-column grid with sticky
  identity columns and sticky headers, mobile single-month cards. Blank stays
  blank, `0` stays `0`, `Moved` is computed and read-only. Explicit Save with
  pending/saved/failed states.
- **Continuous cycles** — Mar–Aug / Sep–Feb reporting cycles from March 2024
  onward, English and Tagalog kept separate. The `+` button extends coverage
  to the next service year on demand.
- **Automatic carry-forward** — a blank *Originally on Hand* inherits the
  previous report's last counted stock (blue dashed cells, tooltip shows the
  source). Typing overrides; clearing restores the carry. Nothing is baked
  in, so fixing an old report updates the next one.
- **Workbook import / CSV export** — upload the real `.xlsx` tracker: every
  sheet is detected (headers are found, not assumed), rows match by item
  number then name, section dividers and `Moved` columns are skipped, and each
  sheet lands in its own cycle/language with per-sheet retargeting.
- **Reorder suggestions** — trailing-3-month average movement × adjustable
  lead time (default 3 months) minus stock on hand, plus the September
  campaign top-up for `llfi` (default 3000, adjustable).
- **Reports** (`/reports`) — two separate report types with a switcher:
  - *Summary (default)* — the Congregation Literature summary: congregation
    header (name/number from Settings), `Month Year | Language`, and a
    three-column table (`Item` | `Current Quantity on Hand` |
    `Average Monthly Movement`). Items follow the live catalog (same rows as
    the workspace, shown as `(code) name`), so catalog edits stay in sync;
    current counts come from the selected month, averages from trailing
    history, blanks stay blank.
  - *Six-month tracker* — single-month export (default Feb/Aug, the
    service-year end) or all six months. `Originally on Hand` shows only in
    the full view. One month control drives the label, year, and column.
  - Screen previews use the same compact type as the exports. **Download
    PDF** generates custom portrait PDFs (fitted tables, gray Moved columns);
    browser Print remains as a secondary option.
- **Dashboard** (`/`) — completion, missing counts, moved/received KPIs, a
  received-vs-moved trend chart, top movers, movement by category, reorder
  suggestions, and recent activity. Every figure derives from saved entries —
  never placeholders.
- **Publications** (`/publications`) — searchable catalog with add/edit
  dialog, revertible overrides of official entries, archive/restore, local
  additions, and **category management** (add, rename, hide/restore, delete
  empty custom categories). Renames keep original storage keys, so saved
  inventory survives them; the official report keeps the original wording.
- **Settings** (`/settings`) — congregation name/number used in report
  headers, plus application info. All catalog and settings edits persist in
  the browser.

## Movement calculation (single source: `src/lib/domain/movement.ts`)

Faithful to the spreadsheet
`=IF(ISBLANK(H10),"",IF(OR(H10>0,E10>0),MINUS(ADD(E10,G10),H10),…))`:

1. Blank physical count → blank movement. Only the count gates the result.
2. Count entered and (count > 0 or opening > 0) → opening + received − count.
3. Both zero → zero. Negatives preserved, never clamped.
4. Blank opening/received act as 0 **inside the arithmetic** once a count is
   entered (spreadsheet `ADD()` behavior); stored inputs still show blank.

## Project structure

- `app/` — routes, `loading`/`error`/`not-found`/`unauthorized` states
- `src/components/` — `ui/` primitives, `layout/` shell, `reports/` report view
- `src/features/` — `inventory/` (workspace, cycles, carry-forward, import),
  `catalog/` (sections, overrides, local pubs), `ordering/` (suggestions),
  `dashboard/` (analytics, charts), `settings/` (congregation identity)
- `src/lib/` — `domain/` (movement), `reports/` (template, summary, PDF),
  `validation/` (Zod)
- `tests/` — Vitest suites mirroring the above

## Testing

```bash
pnpm test
```

Covers movement math (blank-vs-zero, coercion, carry-forward), cycle math,
template wording/order, import mapping (header detection, matching, merge),
ordering (averages, campaign rule), catalog (sections, overrides),
summary resolution, and PDF generation.

## Deployment

Any Next.js host works (`pnpm build && pnpm start`). No server secrets are
required for the current frontend milestone.

## Roadmap

Backend milestone: Supabase Auth (self-registration, administrator /
literature-servant roles), PostgreSQL schema with versioned migrations,
server-mediated writes (no RLS in v1), server report snapshots, and activity
audit. See `AGENTS.md` for the full product spec.
