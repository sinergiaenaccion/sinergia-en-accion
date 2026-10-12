-- Ejecutar una sola vez en el SQL Editor del proyecto Supabase conectado a Sinergia.
-- Mantener las tablas y funciones privadas; nunca exponer la service role key en el navegador.
create table if not exists public.sinergia_gift_cards (
  id bigint generated always as identity primary key,
  code_hash text unique not null,
  balance_ars bigint not null check (balance_ars >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists public.sinergia_gift_card_reservations (
  id bigint generated always as identity primary key,
  order_id text unique not null,
  gift_card_id bigint not null references public.sinergia_gift_cards(id),
  amount_ars bigint not null check (amount_ars > 0),
  status text not null default 'reserved' check (status in ('reserved','confirmed','released')),
  payment_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.sinergia_gift_cards enable row level security;
alter table public.sinergia_gift_card_reservations enable row level security;
revoke all on public.sinergia_gift_cards from anon, authenticated;
revoke all on public.sinergia_gift_card_reservations from anon, authenticated;

create or replace function public.reserve_sinergia_gift_card(p_code text, p_order_id text, p_max_amount bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare c public.sinergia_gift_cards%rowtype; available bigint; reserve_amount bigint; hashed text;
begin
  if p_max_amount <= 0 then return jsonb_build_object('ok',true,'amount',0); end if;
  hashed := encode(digest(upper(trim(p_code)), 'sha256'), 'hex');
  select * into c from public.sinergia_gift_cards where code_hash = hashed and active = true for update;
  if not found then return jsonb_build_object('ok',false,'message','La gift card no existe o está inactiva.'); end if;
  select c.balance_ars - coalesce(sum(r.amount_ars),0) into available
  from public.sinergia_gift_card_reservations r
  where r.gift_card_id = c.id and r.status = 'reserved';
  available := greatest(0, coalesce(available,c.balance_ars));
  reserve_amount := least(available, p_max_amount);
  if reserve_amount <= 0 then return jsonb_build_object('ok',false,'message','La gift card no tiene saldo disponible.'); end if;
  insert into public.sinergia_gift_card_reservations(order_id,gift_card_id,amount_ars,status)
  values(p_order_id,c.id,reserve_amount,'reserved')
  on conflict (order_id) do nothing;
  return jsonb_build_object('ok',true,'amount',reserve_amount);
end $$;

create or replace function public.confirm_sinergia_gift_card_redemption(p_order_id text, p_payment_id text)
returns boolean language plpgsql security definer set search_path = public as $$
declare r public.sinergia_gift_card_reservations%rowtype;
begin
  select * into r from public.sinergia_gift_card_reservations where order_id=p_order_id for update;
  if not found then return true; end if;
  if r.status = 'confirmed' then return true; end if;
  if r.status <> 'reserved' then return false; end if;
  update public.sinergia_gift_cards set balance_ars=balance_ars-r.amount_ars where id=r.gift_card_id and balance_ars>=r.amount_ars;
  if not found then return false; end if;
  update public.sinergia_gift_card_reservations set status='confirmed',payment_id=p_payment_id,updated_at=now() where id=r.id;
  return true;
end $$;

create or replace function public.release_sinergia_gift_card_reservation(p_order_id text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  update public.sinergia_gift_card_reservations set status='released',updated_at=now()
  where order_id=p_order_id and status='reserved';
  return true;
end $$;

revoke all on function public.reserve_sinergia_gift_card(text,text,bigint) from public, anon, authenticated;
revoke all on function public.confirm_sinergia_gift_card_redemption(text,text) from public, anon, authenticated;
revoke all on function public.release_sinergia_gift_card_reservation(text) from public, anon, authenticated;
grant execute on function public.reserve_sinergia_gift_card(text,text,bigint) to service_role;
grant execute on function public.confirm_sinergia_gift_card_redemption(text,text) to service_role;
grant execute on function public.release_sinergia_gift_card_reservation(text) to service_role;

-- Alta de gift card: insertar hash SHA-256 del código en mayúsculas y saldo inicial.
-- El hash debe generarse fuera del navegador. No guardar el código en texto plano.