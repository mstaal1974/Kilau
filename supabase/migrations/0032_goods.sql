-- ─── Goods: the departments beyond fragrance ─────────────────────────────────
--
-- Clothing, jewellery, cosmetics and watches are a second product family. They
-- do not fit `fragrances`: there is no 10/30/50 ml, no batch, no oil — a dress
-- has sizes and a lipstick has shades, so each product carries its variants as
-- a JSON array, one entry per SKU.
--
-- Orders stay in `commits`. A second order table would have meant a second copy
-- of the account page, the staff desk, the shipments join and the admin
-- console, and those would have drifted. Instead a commit row now points at
-- either a fragrance or a product, and the constraint below makes sure it is
-- exactly one of them.

begin;

create table if not exists public.products (
  id               text primary key,
  slug             text unique not null,
  name             text not null,
  department       text not null
                   check (department in ('womens','mens','jewellery','beauty','watches')),
  category         text not null,                         -- CategoryDef id, e.g. 'w-dresses'
  tagline          text not null default '',
  story            text not null default '',
  price_cents      integer not null check (price_cents >= 0),
  compare_at_cents integer check (compare_at_cents is null or compare_at_cents > 0),
  variant_kind     text not null default 'one'
                   check (variant_kind in ('size','shade','band','length','case','one')),
  -- [{code,label,price?,stock,swatch?}, …] — one entry per SKU.
  variants         jsonb not null default '[]'::jsonb,
  details          text[] not null default '{}',
  care             text,
  grams            integer not null default 250 check (grams > 0),
  hue              text not null default '#C8A063',
  shade            text not null default '#8A6215',
  image_url        text,
  status           text not null default 'live'
                   check (status in ('live','coming_soon','hidden')),
  vip_only         boolean not null default false,
  sort_order       integer not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists products_department_idx on public.products(department);
create index if not exists products_category_idx   on public.products(category);
create index if not exists products_status_idx     on public.products(status);

-- The catalogue is public, like the fragrances table; only the service role
-- writes to it (the admin console goes through the service key).
alter table public.products enable row level security;
drop policy if exists products_public_read on public.products;
create policy products_public_read on public.products for select using (true);

-- ─── Orders point at either family ───────────────────────────────────────────

alter table public.commits alter column fragrance_id drop not null;
alter table public.commits add column if not exists product_id text references public.products(id) on delete set null;
alter table public.commits add column if not exists variant text;
create index if not exists commits_product_id_idx on public.commits(product_id);

-- size_ml was constrained to the three bottle sizes. A dress has no millilitres,
-- so goods record zero and the constraint is widened rather than dropped.
alter table public.commits drop constraint if exists commits_size_ml_check;
alter table public.commits add constraint commits_size_ml_check
  check (size_ml in (0, 10, 30, 50));

-- Exactly one of the two, never both and never neither.
alter table public.commits drop constraint if exists commits_one_target;
alter table public.commits add constraint commits_one_target
  check ((fragrance_id is not null) <> (product_id is not null));

-- ─── Recording a paid order ──────────────────────────────────────────────────
-- Same function as 0029, with the two new columns in the insert list. The
-- guards are unchanged: the session id must match every row, every row must be
-- 'captured', and a session is only ever recorded once.

create or replace function public.record_paid_order(p_session_id text, p_rows jsonb)
returns integer language plpgsql security definer set search_path = public
as $$
declare v_count integer;
begin
  if p_session_id is null or p_session_id not like 'cs_%' or
     jsonb_typeof(p_rows) is distinct from 'array' then
    raise exception 'Invalid order';
  end if;
  if jsonb_array_length(p_rows) < 1 or jsonb_array_length(p_rows) > 100 then
    raise exception 'Invalid order size';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_session_id, 0));
  if exists(select 1 from public.processed_checkout_sessions where session_id = p_session_id) then
    return 0;
  end if;
  if exists(select 1 from public.commits where checkout_session_id = p_session_id) then
    insert into public.processed_checkout_sessions(session_id) values(p_session_id);
    return 0;
  end if;
  if exists(select 1 from jsonb_array_elements(p_rows) r where
    r->>'checkout_session_id' is distinct from p_session_id or
    r->>'status' is distinct from 'captured') then
    raise exception 'Invalid paid order rows';
  end if;
  insert into public.commits (fragrance_id, product_id, variant, user_id, user_email, contact_email, engraving, size_ml, charge_cents, payment_intent_id, format, qty, status, checkout_session_id, stripe_customer_id, delivery_method, delivery_name, delivery_phone, delivery_notes, ship_address, ship_city, ship_region, ship_postcode)
  select r.fragrance_id, r.product_id, r.variant, r.user_id, r.user_email, r.contact_email, r.engraving, r.size_ml, r.charge_cents, r.payment_intent_id, r.format, r.qty, r.status, r.checkout_session_id, r.stripe_customer_id, r.delivery_method, r.delivery_name, r.delivery_phone, r.delivery_notes, r.ship_address, r.ship_city, r.ship_region, r.ship_postcode
  from jsonb_populate_recordset(null::public.commits, p_rows) r;
  get diagnostics v_count = row_count;
  insert into public.processed_checkout_sessions(session_id) values(p_session_id);
  return v_count;
end;
$$;
revoke execute on function public.record_paid_order(text,jsonb) from public, anon, authenticated;
grant execute on function public.record_paid_order(text,jsonb) to service_role;

-- ─── The packing sheet reads both catalogues ─────────────────────────────────
-- staff_orders (0025) left-joined fragrances only, so a goods line would have
-- come back with a null name and printed blank on the sheet — the one place a
-- missing name means the wrong thing goes in the box. The join is widened and
-- each line now says which variant was bought.

create or replace function public.staff_orders(p_pass text, p_limit integer default 300)
returns table (
  order_ref     text,
  placed_at     timestamptz,
  amount_cents  bigint,
  email         text,
  ship_name     text,
  ship_phone    text,
  ship_notes    text,
  delivery_method text,
  ship_address  text,
  ship_city     text,
  ship_region   text,
  ship_postcode text,
  items         jsonb,
  packed        boolean,
  packed_at     timestamptz,
  tracking_number text,
  carrier       text,
  shipped_at    timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.staff_ok(p_pass) then
    raise exception 'not authorized' using errcode = 'insufficient_privilege';
  end if;

  return query
  with grouped as (
    select
      coalesce(c.checkout_session_id, c.payment_intent_id, c.id::text) as ref,
      min(c.created_at)                                    as placed,
      sum(coalesce(c.charge_cents, 0)::bigint * greatest(coalesce(c.qty, 1), 1))::bigint as cents,
      min(coalesce(c.contact_email, c.user_email))         as mail,
      min(c.delivery_name)                                 as dname,
      min(c.delivery_phone)                                as dphone,
      min(c.delivery_notes)                                as dnotes,
      min(c.delivery_method)                               as dmethod,
      min(c.ship_address)                                  as addr,
      min(c.ship_city)                                     as city,
      min(c.ship_region)                                   as region,
      min(c.ship_postcode)                                 as postcode,
      jsonb_agg(
        jsonb_build_object(
          'fragrance_id', c.fragrance_id,
          'product_id',   c.product_id,
          'variant',      c.variant,
          'name',         coalesce(f.name, p.name),
          'inspiration',  coalesce(f.inspiration, p.tagline),
          'format',       c.format,
          'size_ml',      c.size_ml,
          'qty',          coalesce(c.qty, 1),
          'engraving',    c.engraving
        )
        order by coalesce(f.name, p.name)
      ) as lines
    from public.commits c
    left join public.fragrances f on f.id = c.fragrance_id
    left join public.products   p on p.id = c.product_id
    where c.status = 'captured'
    group by 1
  )
  select
    g.ref, g.placed, g.cents, g.mail, g.dname, g.dphone, g.dnotes, g.dmethod,
    g.addr, g.city, g.region, g.postcode, g.lines,
    coalesce(o.packed, false), o.packed_at, o.tracking_number,
    coalesce(o.carrier, 'Australia Post'), o.shipped_at
  from grouped g
  left join public.order_fulfilment o on o.order_ref = g.ref
  order by g.placed desc
  limit greatest(1, least(coalesce(p_limit, 300), 1000));
end;
$$;

-- ─── The packing sheet reads both catalogues ─────────────────────────────────
-- staff_orders (0025) left-joined fragrances only, so a goods line would have
-- come back with a null name and printed blank on the sheet — the one place a
-- missing name means the wrong thing goes in the box. The join is widened and
-- each line now says which variant was bought.

create or replace function public.staff_orders(p_pass text, p_limit integer default 300)
returns table (
  order_ref     text,
  placed_at     timestamptz,
  amount_cents  bigint,
  email         text,
  ship_name     text,
  ship_phone    text,
  ship_notes    text,
  delivery_method text,
  ship_address  text,
  ship_city     text,
  ship_region   text,
  ship_postcode text,
  items         jsonb,
  packed        boolean,
  packed_at     timestamptz,
  tracking_number text,
  carrier       text,
  shipped_at    timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.staff_ok(p_pass) then
    raise exception 'not authorized' using errcode = 'insufficient_privilege';
  end if;

  return query
  with grouped as (
    select
      coalesce(c.checkout_session_id, c.payment_intent_id, c.id::text) as ref,
      min(c.created_at)                                    as placed,
      sum(coalesce(c.charge_cents, 0)::bigint * greatest(coalesce(c.qty, 1), 1))::bigint as cents,
      min(coalesce(c.contact_email, c.user_email))         as mail,
      min(c.delivery_name)                                 as dname,
      min(c.delivery_phone)                                as dphone,
      min(c.delivery_notes)                                as dnotes,
      min(c.delivery_method)                               as dmethod,
      min(c.ship_address)                                  as addr,
      min(c.ship_city)                                     as city,
      min(c.ship_region)                                   as region,
      min(c.ship_postcode)                                 as postcode,
      jsonb_agg(
        jsonb_build_object(
          'fragrance_id', c.fragrance_id,
          'product_id',   c.product_id,
          'variant',      c.variant,
          'name',         coalesce(f.name, p.name),
          'inspiration',  coalesce(f.inspiration, p.tagline),
          'format',       c.format,
          'size_ml',      c.size_ml,
          'qty',          coalesce(c.qty, 1),
          'engraving',    c.engraving
        )
        order by coalesce(f.name, p.name)
      ) as lines
    from public.commits c
    left join public.fragrances f on f.id = c.fragrance_id
    left join public.products   p on p.id = c.product_id
    where c.status = 'captured'
    group by 1
  )
  select
    g.ref, g.placed, g.cents, g.mail, g.dname, g.dphone, g.dnotes, g.dmethod,
    g.addr, g.city, g.region, g.postcode, g.lines,
    coalesce(o.packed, false), o.packed_at, o.tracking_number,
    coalesce(o.carrier, 'Australia Post'), o.shipped_at
  from grouped g
  left join public.order_fulfilment o on o.order_ref = g.ref
  order by g.placed desc
  limit greatest(1, least(coalesce(p_limit, 300), 1000));
end;
$$;

commit;
