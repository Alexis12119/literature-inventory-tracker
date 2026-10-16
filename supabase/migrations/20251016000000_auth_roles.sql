-- Auth foundation: profiles, secure roles, approval-gated registration.
--
-- New signups land DEACTIVATED (pending). An administrator reviews each
-- registration and activates credible users; everyone else stays signed
-- out with an explanatory message. No self-service role selection exists
-- anywhere in this schema.
--
-- Security posture (project decision: no RLS in v1): direct table access
-- is revoked from anon/authenticated entirely. All reads/writes go through
-- trusted server-side code using the service-role key, after explicit
-- requireUser/requireAdmin checks. Revisit before exposing PostgREST.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  first_name text not null check (char_length(first_name) between 1 and 100),
  middle_name text check (middle_name is null or char_length(middle_name) between 1 and 100),
  last_name text not null check (char_length(last_name) between 1 and 100),
  -- true = pending approval OR suspended. Only an administrator flips this.
  is_deactivated boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_roles (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  role text not null check (role in ('administrator', 'literature_servant')),
  granted_by uuid references public.profiles (id),
  granted_at timestamptz not null default now()
);

-- No direct client access: server-mediated only.
revoke all on public.profiles from anon, authenticated;
revoke all on public.user_roles from anon, authenticated;

-- Signup trigger: profile (pending) + default servant role from metadata.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, first_name, middle_name, last_name)
  values (
    new.id,
    nullif(trim(both from coalesce(new.raw_user_meta_data ->> 'first_name', '')), ''),
    nullif(trim(both from coalesce(new.raw_user_meta_data ->> 'middle_name', '')), ''),
    nullif(trim(both from coalesce(new.raw_user_meta_data ->> 'last_name', '')), '')
  )
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, 'literature_servant')
  on conflict (user_id) do nothing;

  return new;
exception
  when others then
    -- Never block the auth signup itself; the app surfaces a pending state
    -- and the administrator can reconcile the profile manually.
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- updated_at maintenance.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch
  before update on public.profiles
  for each row execute function public.touch_updated_at();
