-- Core domain schema: languages, catalog, reporting periods, inventory, audit.
--
-- Security posture (project decision: no RLS in v1): direct table access is
-- revoked from anon/authenticated entirely. All access goes through trusted
-- server-side code using the service-role key, after explicit
-- requireUser/requireAdmin checks.

-- Languages: the two separate inventories.
create table if not exists public.languages (
  code text primary key check (code in ('en', 'tl')),
  label text not null
);

-- Publication categories, per language, ordered. Renames never change keys;
-- hiding retains every quantity and is reversible.
create table if not exists public.publication_categories (
  id uuid primary key default gen_random_uuid(),
  language_code text not null references public.languages (code),
  name text not null check (char_length(name) between 1 and 60),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (language_code, name)
);

-- Catalog: one row per independently inventoried publication/issue.
-- Display edits never change identity; inventory references these ids.
create table if not exists public.publications (
  id uuid primary key default gen_random_uuid(),
  language_code text not null references public.languages (code),
  category_id uuid references public.publication_categories (id),
  item_no text check (item_no is null or char_length(item_no) between 1 and 20),
  name text not null check (char_length(name) between 1 and 200),
  code text check (code is null or char_length(code) between 1 and 20),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (language_code, item_no)
);
-- NOTE: unique(language, item_no) treats NULLs as distinct in Postgres,
-- so magazine rows (null item_no) rely on application-level code uniqueness.

-- Six-month reporting cycles, stored explicitly (never inferred).
create table if not exists public.reporting_periods (
  id uuid primary key default gen_random_uuid(),
  key text not null unique check (key ~ '^[0-9]{4}-(mar-aug|sep-feb)$'),
  label text not null,
  start_month date not null,
  end_month date not null,
  created_at timestamptz not null default now(),
  check (start_month < end_month)
);

-- The six month slots of a cycle, in display order.
create table if not exists public.reporting_months (
  id uuid primary key default gen_random_uuid(),
  period_id uuid not null references public.reporting_periods (id) on delete cascade,
  month date not null unique,
  position smallint not null check (position between 1 and 6),
  pair_label text not null,
  unique (period_id, position),
  unique (period_id, month)
);

-- Monthly measurements as rows (never monthly columns).
create table if not exists public.inventory_records (
  id uuid primary key default gen_random_uuid(),
  publication_id uuid not null references public.publications (id) on delete restrict,
  month_id uuid not null references public.reporting_months (id) on delete cascade,
  received integer check (received is null or received between 0 and 999999),
  on_hand integer check (on_hand is null or on_hand between 0 and 999999),
  opening_on_hand integer check (opening_on_hand is null or opening_on_hand between 0 and 999999),
  updated_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (publication_id, month_id)
);
create index if not exists inventory_records_month_idx on public.inventory_records (month_id);
create index if not exists inventory_records_pub_idx on public.inventory_records (publication_id);

-- Traceability log (append-only through the app; no user-facing delete).
create table if not exists public.audit_events (
  id bigserial primary key,
  actor uuid references public.profiles (id),
  action text not null,
  entity text not null,
  entity_id text,
  before jsonb,
  after jsonb,
  at timestamptz not null default now()
);
create index if not exists audit_events_at_idx on public.audit_events (at desc);

-- Shared application settings (e.g. congregation identity for reports).
-- Written by administrators only; readable by all active users server-side.
create table if not exists public.app_settings (
  key text primary key,
  value text not null default '',
  updated_by uuid references public.profiles (id),
  updated_at timestamptz not null default now()
);

-- No direct client access: server-mediated only.
revoke all on public.languages from anon, authenticated;
revoke all on public.publication_categories from anon, authenticated;
revoke all on public.publications from anon, authenticated;
revoke all on public.reporting_periods from anon, authenticated;
revoke all on public.reporting_months from anon, authenticated;
revoke all on public.inventory_records from anon, authenticated;
revoke all on public.audit_events from anon, authenticated;
revoke all on public.app_settings from anon, authenticated;

drop trigger if exists publications_touch on public.publications;
create trigger publications_touch
  before update on public.publications
  for each row execute function public.touch_updated_at();

drop trigger if exists inventory_records_touch on public.inventory_records;
create trigger inventory_records_touch
  before update on public.inventory_records
  for each row execute function public.touch_updated_at();
