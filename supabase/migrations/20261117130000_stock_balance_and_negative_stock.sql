-- Derived stock balances and a database-side guard against negative inventory.
-- This migration is safe to re-run.
create or replace view public.stock_balances
with (security_invoker = true)
as
select
  sm.company_id,
  sm.product_id,
  sm.warehouse_id,
  coalesce(sum(case
    when sm.movement_type in ('opening','purchase','return_in','transfer_in','adjustment_in') then sm.quantity
    when sm.movement_type in ('sale','return_out','transfer_out','adjustment_out') then -sm.quantity
    else 0
  end),0)::numeric as quantity_on_hand
from public.stock_movements sm
group by sm.company_id, sm.product_id, sm.warehouse_id;

grant select on public.stock_balances to authenticated;

create or replace function public.prevent_negative_stock()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_on_hand numeric;
begin
  if new.movement_type in ('sale','return_out','transfer_out','adjustment_out') then
    perform 1
    from public.products p
    where p.id = new.product_id
      and p.company_id = new.company_id
    for update;

    select coalesce(sum(
      case
        when sm.movement_type in ('opening','purchase','return_in','transfer_in','adjustment_in') then sm.quantity
        when sm.movement_type in ('sale','return_out','transfer_out','adjustment_out') then -sm.quantity
        else 0
      end
    ),0)
    into v_on_hand
    from public.stock_movements sm
    where sm.company_id = new.company_id
      and sm.product_id = new.product_id
      and sm.warehouse_id = new.warehouse_id;

    if new.quantity > v_on_hand then
      raise exception 'Stock insuffisant. Disponible: %, demandé: %', v_on_hand, new.quantity
        using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists stock_movements_prevent_negative on public.stock_movements;
create trigger stock_movements_prevent_negative
before insert on public.stock_movements
for each row execute function public.prevent_negative_stock();

revoke all on function public.prevent_negative_stock() from public, anon, authenticated;
