-- Openings live here: Originally on Hand depends on (publication, period),
-- not on any single month. The per-month column from the first migration
-- was never written to and is removed to keep one source of truth.

alter table public.inventory_records
  drop column if exists opening_on_hand;

create table if not exists public.cycle_openings (
  publication_id uuid not null references public.publications (id) on delete restrict,
  period_id uuid not null references public.reporting_periods (id) on delete cascade,
  quantity integer check (quantity is null or quantity between 0 and 999999),
  updated_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (publication_id, period_id)
);

revoke all on public.cycle_openings from anon, authenticated;

drop trigger if exists cycle_openings_touch on public.cycle_openings;
create trigger cycle_openings_touch
  before update on public.cycle_openings
  for each row execute function public.touch_updated_at();
