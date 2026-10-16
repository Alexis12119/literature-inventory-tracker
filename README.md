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
- **Reports** (`/reports`) — single-month export (default Feb/Aug, the
  service-year end) or all six months. Screen preview uses the same 6pt/4pt
  type as the export. **Download PDF** is a custom portrait generator
  (title, instructions with bulleted item 5, fitted table, gray Moved columns);
  browser Print remains as a secondary option.
- **Dashboard** (`/`) — completion, missing counts, moved/received KPIs, a
  received-vs-moved trend chart, top movers, movement by category, reorder
  suggestions, and recent activity. Every figure derives from saved entries —
  never placeholders.
- **Publications** (`/publications`) — searchable catalog with add (dialog),
  archive/restore, and local additions.

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
  `ordering/` (suggestions), `dashboard/` (analytics, charts)
- `src/lib/` — `domain/` (movement), `reports/` (template, PDF),
  `validation/` (Zod)
- `tests/` — Vitest suites mirroring the above

## Testing

```bash
pnpm test
```

Covers movement math (blank-vs-zero, coercion, carry-forward), cycle math,
template wording/order, import mapping (header detection, matching, merge),
ordering (averages, campaign rule), and PDF generation.

## Deployment

Any Next.js host works (`pnpm build && pnpm start`). No server secrets are
required for the current frontend milestone.

## Roadmap

Backend milestone: Supabase Auth (self-registration, administrator /
literature-servant roles), PostgreSQL schema with versioned migrations,
server-mediated writes (no RLS in v1), server report snapshots, and activity
audit. See `AGENTS.md` for the full product spec.
