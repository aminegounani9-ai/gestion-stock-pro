create table if not exists public.payment_transactions (
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null references public.companies(id) on delete cascade,
 transaction_type text not null check (transaction_type in ('customer_receipt','supplier_payment')),
 sale_id uuid references public.sales(id),
 purchase_order_id uuid references public.purchase_orders(id),
 amount numeric(14,2) not null check (amount > 0),
 payment_method text not null check (payment_method in ('cash','bank_transfer','card','cheque','other')),
 transaction_date date not null default current_date,
 reference text,
 notes text,
 created_by uuid references auth.users(id),
 created_at timestamptz not null default now(),
 constraint payment_transaction_link_check check (
  (transaction_type='customer_receipt' and sale_id is not null and purchase_order_id is null)
  or (transaction_type='supplier_payment' and purchase_order_id is not null and sale_id is null)
 )
);
alter table public.payment_transactions enable row level security;
drop policy if exists payment_transactions_company_access on public.payment_transactions;
create policy payment_transactions_company_access on public.payment_transactions
 for all to authenticated
 using (
  private.has_company_access(company_id)
  and (
   (transaction_type='customer_receipt' and exists(select 1 from public.sales s where s.id=sale_id and s.company_id=payment_transactions.company_id))
   or
   (transaction_type='supplier_payment' and exists(select 1 from public.purchase_orders po where po.id=purchase_order_id and po.company_id=payment_transactions.company_id))
  )
 )
 with check (
  private.has_company_access(company_id)
  and (
   (transaction_type='customer_receipt' and exists(select 1 from public.sales s where s.id=sale_id and s.company_id=payment_transactions.company_id))
   or
   (transaction_type='supplier_payment' and exists(select 1 from public.purchase_orders po where po.id=purchase_order_id and po.company_id=payment_transactions.company_id))
  )
 );
grant select,insert,update,delete on public.payment_transactions to authenticated;
create index if not exists payment_transactions_company_date_idx on public.payment_transactions(company_id,transaction_date desc);
create index if not exists payment_transactions_sale_idx on public.payment_transactions(sale_id) where sale_id is not null;
create index if not exists payment_transactions_purchase_idx on public.payment_transactions(purchase_order_id) where purchase_order_id is not null;
