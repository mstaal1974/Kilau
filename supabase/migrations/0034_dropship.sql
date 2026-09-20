-- ─── Dropshipping: supplier provenance, photography, and the order queue ─────
--
-- Two things arrive with a dropshipped line that a house-made one never had:
-- somebody else's photographs, and somebody else who has to be told to ship it.
--
-- Photography first. `image_url` held one picture, which is enough for a bottle
-- shot the house took and nowhere near enough for a supplier listing, where the
-- colour you picked is the whole point of the photograph. So a product now
-- carries an ordered array, and a variant can carry its own.
--
-- Then the order. When a paid order contains a dropshipped line, somebody has
-- to place it with the supplier. That hand-off is a queue rather than a call:
-- a row is written for every paid order at the moment it is recorded, and the
-- dispatcher works the queue afterwards. A supplier being slow, rate-limited or
-- simply down can then never fail a payment that has already been taken.

begin;

-- ─── Photography and provenance ──────────────────────────────────────────────

alter table public.products add column if not exists images text[] not null default '{}';
alter table public.products add column if not exists supplier text;
alter table public.products add column if not exists supplier_product_id text;
alter table public.products add column if not exists supplier_url text;
alter table public.products add column if not exists cost_cents integer check (cost_cents is null or cost_cents >= 0);
alter table public.products add column if not exists lead_min_days integer check (lead_min_days is null or lead_min_days >= 0);
alter table public.products add column if not exists lead_max_days integer check (lead_max_days is null or lead_max_days >= 0);

-- One row per supplier listing: re-importing a catalogue updates the piece
-- rather than adding a second copy of it.
create unique index if not exists products_supplier_key
  on public.products(supplier, supplier_product_id)
  where supplier is not null and supplier_product_id is not null;

-- Carry the single image already stored into the array, once.
update public.products
   set images = array[image_url]
 where image_url is not null and image_url <> '' and cardinality(images) = 0;

-- ─── The supplier queue ──────────────────────────────────────────────────────

create table if not exists public.supplier_orders (
  id                uuid primary key default gen_random_uuid(),
  -- The Stripe Checkout Session the order was paid under; one queue row per
  -- order, so a retry can never place the same order twice.
  order_ref         text not null unique,
  supplier          text not null default 'alidrop',
  -- Exactly what will be sent: the lines, the address, the contact. Built on
  -- the server from the paid order, never from the browser.
  payload           jsonb not null,
  status            text not null default 'pending'
                    check (status in ('pending','sent','failed','cancelled','manual')),
  -- What the supplier called it back, once it has one.
  supplier_order_id text,
  tracking_number   text,
  tracking_url      text,
  carrier           text,
  attempts          integer not null default 0,
  last_error        text,
  created_at        timestamptz not null default now(),
  sent_at           timestamptz,
  updated_at        timestamptz not null default now()
);
create index if not exists supplier_orders_status_idx on public.supplier_orders(status);
create index if not exists supplier_orders_created_idx on public.supplier_orders(created_at desc);

-- The queue holds customer addresses, so nobody reads it but the service role.
alter table public.supplier_orders enable row level security;
revoke all on public.supplier_orders from anon, authenticated;

-- ─── Queueing, from the same transaction that records the order ──────────────
--
-- Called by the webhook (and by /api/stripe/confirm, whichever runs first)
-- right after record_paid_order. `on conflict do nothing` is what makes the
-- second caller a no-op rather than a duplicate order at the supplier.

create or replace function public.queue_supplier_order(
  p_order_ref text,
  p_supplier  text,
  p_payload   jsonb
)
returns boolean language plpgsql security definer set search_path = public
as $$
declare v_inserted boolean;
begin
  if p_order_ref is null or p_order_ref = '' or jsonb_typeof(p_payload) is distinct from 'object' then
    raise exception 'Invalid supplier order';
  end if;
  insert into public.supplier_orders(order_ref, supplier, payload)
  values (p_order_ref, coalesce(nullif(p_supplier, ''), 'alidrop'), p_payload)
  on conflict (order_ref) do nothing;
  get diagnostics v_inserted = row_count;
  return v_inserted;
end;
$$;
revoke execute on function public.queue_supplier_order(text,text,jsonb) from public, anon, authenticated;
grant execute on function public.queue_supplier_order(text,text,jsonb) to service_role;

-- ─── Recording the outcome of an attempt ─────────────────────────────────────

create or replace function public.settle_supplier_order(
  p_order_ref         text,
  p_status            text,
  p_supplier_order_id text default null,
  p_error             text default null
)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if p_status not in ('pending','sent','failed','cancelled','manual') then
    raise exception 'Invalid supplier order status';
  end if;
  update public.supplier_orders
     set status            = p_status,
         supplier_order_id = coalesce(p_supplier_order_id, supplier_order_id),
         last_error        = case when p_status = 'failed' then p_error else null end,
         attempts          = attempts + 1,
         sent_at           = case when p_status = 'sent' then now() else sent_at end,
         updated_at        = now()
   where order_ref = p_order_ref;
end;
$$;
revoke execute on function public.settle_supplier_order(text,text,text,text) from public, anon, authenticated;
grant execute on function public.settle_supplier_order(text,text,text,text) to service_role;

commit;
