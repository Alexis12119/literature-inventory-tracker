# Literature Inventory

A shared inventory tracker for English and Tagalog literature. It replaces the
spreadsheet workflow with monthly stock entry, historical records, catalog
management, activity history, and printable or downloadable reports.

Built with Next.js App Router, TypeScript, Tailwind CSS, Supabase Auth and
PostgreSQL, Zod, and Lucide React. Use **pnpm** for package management and
project scripts.

## Requirements

- Node.js compatible with the installed Next.js version
- pnpm (the repository uses pnpm 11)
- A Supabase project
- Supabase CLI for database migrations

## Local setup

1. Install dependencies and create a local environment file:

   ```bash
   pnpm install
   cp .env.example .env
   ```

2. Set the Supabase values in `.env`:

   ```dotenv
   NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   SUPABASE_SECRET_KEY=sb_secret_...
   ```

   The server secret may instead use the legacy variable
   `SUPABASE_SERVICE_ROLE_KEY`. Never add either server secret to a
   `NEXT_PUBLIC_` variable or expose it to browser code.

3. Link the CLI to the intended project and apply pending migrations:

   ```bash
   supabase login
   supabase link --project-ref <project-ref>
   supabase db push
   ```

   Migrations create the schema, seed the English and Tagalog catalog and
   reporting periods, and install the server-side pagination functions. They
   do not seed inventory quantities or user accounts.

4. In Supabase Auth settings, enable email sign-up and configure the site URL
   and redirect URL to include `http://localhost:3000/auth/callback` for local
   development. Configure the corresponding production URLs when deploying.

5. Start the app:

   ```bash
   pnpm dev
   ```

   Open <http://localhost:3000>.

## Initial administrator setup

Public registration always creates a pending literature-servant account. To
create the first administrator:

1. Register the administrator account through `/register` and confirm its
   email if email confirmation is enabled.
2. In the Supabase Dashboard SQL Editor, replace the example email below with
   the account's exact email and run this block. It activates that profile and
   promotes the account to administrator using trusted database access.

   ```sql
   do $$
   declare
     target_user_id uuid;
   begin
     select id into target_user_id
     from auth.users
     where email = 'admin@example.com';

     if target_user_id is null then
       raise exception 'No Auth user found for that email';
     end if;

     update public.profiles
     set is_deactivated = false
     where id = target_user_id;

     if not found then
       raise exception 'Profile is missing for that Auth user';
     end if;

     insert into public.user_roles (user_id, role)
     values (target_user_id, 'administrator')
     on conflict (user_id) do update
       set role = excluded.role,
           granted_by = null,
           granted_at = now();
   end $$;
   ```

3. Sign in through `/sign-in`. The administrator can approve later
   registrations from `/users`.

Only use the SQL Editor or another trusted administrative process for initial
administrator provisioning. The registration form does not allow users to
choose their own role.

## Application features

- **Dashboard (`/`)** — current inventory completion, missing counts, saved
  movement and receipts, trends, top movers, reorder suggestions, and recent
  activity based on database records.
- **Inventory (`/inventory`)** — shared monthly inventory for English and
  Tagalog, with March–August and September–February cycles. Supports monthly
  received quantities and physical counts, explicit saving, blank-versus-zero
  values, import, CSV export, and carry-forward from prior counts.
- **Publications (`/publications`)** — searchable, paginated catalog with
  category filtering and archived-item management. Administrators can add or
  edit publications, manage categories, and archive or restore records.
- **Reports (`/reports`)** — a Congregation Literature summary and a separate
  six-month tracker. Both use current saved data and support preview and PDF
  download; the tracker can also be printed.
- **Activity History (`/activity`)** — searchable, filterable, paginated
  records of inventory, catalog, account, and settings changes.
- **Users (`/users`)** — administrator-only, searchable and filterable user
  directory with account approval, suspension, and role management.
- **Settings (`/settings`)** — congregation name and number used in report
  headers.

New accounts remain pending until an administrator approves them. Inventory is
shared by authorized literature servants; there are no organization scopes or
report approval workflow.

## Inventory calculation

Movement is calculated centrally in `src/lib/domain/movement.ts` using the
spreadsheet's opening stock, received quantity, and physical count behavior:

- When a physical count is entered, movement is opening stock plus received
  minus the physical count. Blank opening or received values count as zero in
  this calculation; negative movement is preserved.
- Blank physical counts remain blank and are surfaced as missing entries.
- The app has an explicit untouched-opening-stock exception: if opening stock
  is positive and both received and physical count are blank, movement displays
  the opening stock as moved. Stored input values remain blank.

## Database and security

Database changes are versioned under `supabase/migrations/`. Apply them with
`supabase db push` after linking the CLI to the intended project. To review
local and remote migration state, run `supabase migration list`.

The initial version does not use Supabase Row Level Security. Private database
operations go through server-side code, which authenticates and authorizes
each operation before using the server secret. Migrations revoke direct table
access from `anon` and `authenticated`; the pagination RPC functions are
executable only by `service_role`. Do not expose the server secret or allow
browser code to access private tables directly. Review this model before
changing database grants or allowing client-side database access.

## Scripts

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start the development server |
| `pnpm build` | Build the production app |
| `pnpm start` | Serve the production build |
| `pnpm lint` | Run ESLint |
| `pnpm typecheck` | Run TypeScript without emitting files |
| `pnpm test` | Run the Vitest unit and domain tests |

End-to-end testing is not currently configured.

## Project layout

- `app/` — App Router pages, route handlers, and layouts
- `src/components/` — reusable UI, auth, layout, and report components
- `src/features/` — inventory, publications, users, settings, imports, and
  dashboard features
- `src/lib/auth/` — authentication and authorization gates
- `src/lib/data-access/` — server-side database operations
- `src/lib/domain/` — inventory and other business rules
- `src/lib/reports/` — report data and formatting
- `supabase/migrations/` — version-controlled database schema changes
- `tests/` — Vitest unit and domain tests

For the full product requirements and business rules, see [AGENTS.md](AGENTS.md).
For the Congregation Literature summary report specification, see
[Report.md](Report.md).
