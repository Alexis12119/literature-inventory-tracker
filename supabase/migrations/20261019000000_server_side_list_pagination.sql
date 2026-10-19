-- Server-side filtering and pagination for the three large administrative lists.
-- These functions are only callable with the service role. Every application
-- action still authenticates and authorizes the caller before using them.

create or replace function public.catalog_page(
  p_language text,
  p_search text,
  p_category text,
  p_archived boolean,
  p_page integer,
  p_page_size integer
) returns jsonb
language sql
security definer
set search_path = ''
as $$
  with cats as (
    select c.id, c.name, c.sort_order, c.is_active,
      (select count(*) from public.publications cp
       where cp.category_id = c.id and cp.is_active = not p_archived) as item_count
    from public.publication_categories c
    where c.language_code = p_language and c.is_active
  ), filtered as (
    select p.id, p.category_id, p.item_no, p.name, p.code, p.sort_order, p.is_active,
      c.name as section, c.sort_order as category_order
    from public.publications p
    join cats c on c.id = p.category_id
    where p.language_code = p_language
      and p.is_active = not p_archived
      and (p_category = 'all' or c.name = p_category)
      and (coalesce(p_search, '') = '' or strpos(lower(concat_ws(' ', p.item_no, p.name, p.code)), lower(p_search)) > 0)
  ), page_rows as (
    select * from filtered
    order by category_order, sort_order, id
    limit least(greatest(p_page_size, 1), 50)
    offset (greatest(p_page, 1) - 1) * least(greatest(p_page_size, 1), 50)
  )
  select jsonb_build_object(
    'total', (select count(*) from filtered),
    'sections', coalesce((select jsonb_agg(jsonb_build_object('name', name, 'count', item_count) order by sort_order) from cats), '[]'::jsonb),
    'rows', coalesce((select jsonb_agg(jsonb_build_object(
      'id', id, 'itemNo', item_no, 'name', name, 'code', code,
      'section', section, 'active', is_active
    ) order by category_order, sort_order, id) from page_rows), '[]'::jsonb)
  );
$$;

create or replace function public.user_directory_page(
  p_search text,
  p_status text,
  p_role text,
  p_page integer,
  p_page_size integer
) returns jsonb
language sql
security definer
set search_path = ''
as $$
  with filtered as (
    select p.id, u.email, p.first_name, p.middle_name, p.last_name,
      coalesce(r.role, '—') as role, not p.is_deactivated as active, p.created_at
    from public.profiles p
    join auth.users u on u.id = p.id
    left join public.user_roles r on r.user_id = p.id
    where (coalesce(p_search, '') = '' or strpos(lower(concat_ws(' ', p.first_name, p.middle_name, p.last_name, u.email)), lower(p_search)) > 0)
      and (p_status = 'all' or (p_status = 'active' and not p.is_deactivated) or (p_status = 'pending' and p.is_deactivated))
      and (p_role = 'all' or coalesce(r.role, '—') = p_role)
  ), page_rows as (
    select * from filtered
    order by created_at desc, id
    limit least(greatest(p_page_size, 1), 50)
    offset (greatest(p_page, 1) - 1) * least(greatest(p_page_size, 1), 50)
  )
  select jsonb_build_object(
    'total', (select count(*) from filtered),
    'rows', coalesce((select jsonb_agg(jsonb_build_object(
      'id', id, 'email', coalesce(email, '—'),
      'displayName', concat_ws(' ', nullif(first_name, ''), nullif(middle_name, ''), nullif(last_name, '')),
      'role', role, 'active', active, 'createdAt', created_at
    ) order by created_at desc, id) from page_rows), '[]'::jsonb)
  );
$$;

create or replace function public.activity_page(
  p_search text,
  p_category text,
  p_since timestamptz,
  p_page integer,
  p_page_size integer
) returns jsonb
language sql
security definer
set search_path = ''
as $$
  with searchable as (
    select e.id, e.actor, e.action, e.after, e.at,
      case e.action
        when 'inventory.save' then 'Saved ' || coalesce(e.after ->> 'period', '') || ' / ' || upper(coalesce(e.after ->> 'lang', '')) || ' workspace'
        when 'inventory.import' then 'Imported ' || coalesce(e.after ->> 'total', '') || ' values (' || coalesce(e.after ->> 'sheets', '') || ' sheets)'
        when 'users.approve' then 'Approved account ' || coalesce(e.after ->> 'email', e.after ->> 'user_id', '')
        when 'users.suspend' then 'Suspended account ' || coalesce(e.after ->> 'user_id', '')
        when 'users.role' then 'Changed role to ' || coalesce(e.after ->> 'role', '')
        when 'catalog.save' then coalesce(e.after ->> 'detail', '')
        when 'settings.save' then 'Updated setting ' || coalesce(e.after ->> 'key', '')
        else e.action
      end as description
    from public.audit_events e
  ), filtered as (
    select e.id, e.actor, e.action, e.after, e.at
    from searchable e
    where (p_since is null or e.at >= p_since)
      and (p_category = 'all' or split_part(e.action, '.', 1) = p_category)
      and (coalesce(p_search, '') = '' or strpos(lower(e.action || ' ' || e.description || ' ' || coalesce(e.after::text, '')), lower(p_search)) > 0)
  ), page_rows as (
    select * from filtered
    order by at desc, id desc
    limit least(greatest(p_page_size, 1), 50)
    offset (greatest(p_page, 1) - 1) * least(greatest(p_page_size, 1), 50)
  )
  select jsonb_build_object(
    'total', (select count(*) from filtered),
    'rows', coalesce((select jsonb_agg(jsonb_build_object(
      'id', id, 'actor', actor, 'action', action, 'after', after, 'at', at
    ) order by at desc, id desc) from page_rows), '[]'::jsonb)
  );
$$;

revoke all on function public.catalog_page(text, text, text, boolean, integer, integer) from public, anon, authenticated;
revoke all on function public.user_directory_page(text, text, text, integer, integer) from public, anon, authenticated;
revoke all on function public.activity_page(text, text, timestamptz, integer, integer) from public, anon, authenticated;
grant execute on function public.catalog_page(text, text, text, boolean, integer, integer) to service_role;
grant execute on function public.user_directory_page(text, text, text, integer, integer) to service_role;
grant execute on function public.activity_page(text, text, timestamptz, integer, integer) to service_role;
