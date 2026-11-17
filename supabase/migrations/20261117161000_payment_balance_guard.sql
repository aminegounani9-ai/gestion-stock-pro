create or replace function public.validate_payment_transaction()
returns trigger language plpgsql security invoker set search_path='' as $$
declare v_total numeric(14,2); v_paid numeric(14,2);
begin
 if new.transaction_type='customer_receipt' then
  select s.total into v_total from public.sales s where s.id=new.sale_id and s.company_id=new.company_id for update;
  if not found then raise exception 'Facture client introuvable'; end if;
  select coalesce(sum(p.amount),0) into v_paid from public.payment_transactions p where p.company_id=new.company_id and p.sale_id=new.sale_id and p.id is distinct from new.id;
 else
  select po.subtotal into v_total from public.purchase_orders po where po.id=new.purchase_order_id and po.company_id=new.company_id for update;
  if not found then raise exception 'Commande fournisseur introuvable'; end if;
  select coalesce(sum(p.amount),0) into v_paid from public.payment_transactions p where p.company_id=new.company_id and p.purchase_order_id=new.purchase_order_id and p.id is distinct from new.id;
 end if;
 if new.amount > greatest(v_total-v_paid,0)+0.005 then raise exception 'Le montant dépasse le solde restant (%)', greatest(v_total-v_paid,0); end if;
 return new;
end; $$;
drop trigger if exists payment_transaction_balance_guard on public.payment_transactions;
create trigger payment_transaction_balance_guard before insert or update on public.payment_transactions for each row execute function public.validate_payment_transaction();
revoke all on function public.validate_payment_transaction() from public,anon,authenticated;
