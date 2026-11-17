-- Inventory operations: inter-warehouse transfers, stock counts, returns and expenses.
create table if not exists public.stock_transfers (
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
 transfer_number text not null, source_warehouse_id uuid not null references public.warehouses(id), destination_warehouse_id uuid not null references public.warehouses(id),
 status text not null default 'completed' check(status in ('draft','completed','cancelled')), transfer_date timestamptz not null default now(),
 notes text, created_by uuid references auth.users(id), created_at timestamptz not null default now(), unique(company_id,transfer_number), check(source_warehouse_id<>destination_warehouse_id)
);
create table if not exists public.stock_transfer_items (
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
 transfer_id uuid not null references public.stock_transfers(id) on delete cascade, product_id uuid not null references public.products(id),
 quantity numeric not null check(quantity>0), unit_cost numeric not null default 0 check(unit_cost>=0)
);
create table if not exists public.inventory_counts (
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
 count_number text not null, warehouse_id uuid not null references public.warehouses(id),
 status text not null default 'posted' check(status in ('draft','posted','cancelled')), count_date timestamptz not null default now(),
 notes text, created_by uuid references auth.users(id), created_at timestamptz not null default now(), unique(company_id,count_number)
);
create table if not exists public.inventory_count_items (
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
 count_id uuid not null references public.inventory_counts(id) on delete cascade, product_id uuid not null references public.products(id),
 expected_quantity numeric not null, counted_quantity numeric not null check(counted_quantity>=0), difference numeric not null
);
create table if not exists public.stock_returns (
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
 return_number text not null, return_type text not null check(return_type in ('customer','supplier')),
 warehouse_id uuid not null references public.warehouses(id), customer_id uuid references public.customers(id), supplier_id uuid references public.suppliers(id),
 status text not null default 'completed' check(status in ('draft','completed','cancelled')), return_date timestamptz not null default now(),
 reason text, notes text, created_by uuid references auth.users(id), created_at timestamptz not null default now(),
 unique(company_id,return_number), check((return_type='customer' and supplier_id is null) or (return_type='supplier' and customer_id is null))
);
create table if not exists public.stock_return_items (
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
 return_id uuid not null references public.stock_returns(id) on delete cascade, product_id uuid not null references public.products(id),
 quantity numeric not null check(quantity>0), unit_price numeric not null default 0 check(unit_price>=0)
);
create table if not exists public.expenses (
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
 expense_number text not null, category text not null, description text not null, amount numeric not null check(amount>0),
 expense_date date not null default current_date, payment_method text, notes text, created_by uuid references auth.users(id),
 created_at timestamptz not null default now(), unique(company_id,expense_number)
);
do $$ declare t text; begin
 foreach t in array array['stock_transfers','stock_transfer_items','inventory_counts','inventory_count_items','stock_returns','stock_return_items','expenses'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('drop policy if exists %I on public.%I',t||'_company_access',t);
  execute format('create policy %I on public.%I for all to authenticated using (private.has_company_access(company_id)) with check (private.has_company_access(company_id))',t||'_company_access',t);
  execute format('grant select,insert,update,delete on public.%I to authenticated',t);
 end loop;
end $$;
create or replace function public.create_stock_transfer(p_company_id uuid,p_transfer_number text,p_source_warehouse_id uuid,p_destination_warehouse_id uuid,p_lines jsonb,p_notes text default null)
returns uuid language plpgsql security invoker set search_path='' as $$
declare v_id uuid; v_line jsonb; v_product uuid; v_qty numeric; v_cost numeric;
begin
 if auth.uid() is null or not private.has_company_access(p_company_id) then raise exception 'Accès refusé' using errcode='42501'; end if;
 if p_source_warehouse_id=p_destination_warehouse_id then raise exception 'Les entrepôts doivent être différents'; end if;
 if p_transfer_number is null or btrim(p_transfer_number)='' or jsonb_typeof(p_lines)<>'array' or jsonb_array_length(p_lines)=0 then raise exception 'Transfert invalide'; end if;
 if not exists(select 1 from public.warehouses where id=p_source_warehouse_id and company_id=p_company_id and is_active) or not exists(select 1 from public.warehouses where id=p_destination_warehouse_id and company_id=p_company_id and is_active) then raise exception 'Entrepôt invalide'; end if;
 insert into public.stock_transfers(company_id,transfer_number,source_warehouse_id,destination_warehouse_id,notes,created_by) values(p_company_id,btrim(p_transfer_number),p_source_warehouse_id,p_destination_warehouse_id,p_notes,auth.uid()) returning id into v_id;
 for v_line in select value from jsonb_array_elements(p_lines) loop
  v_product:=(v_line->>'product_id')::uuid; v_qty:=(v_line->>'quantity')::numeric; v_cost:=coalesce((v_line->>'unit_cost')::numeric,0);
  if v_qty<=0 or v_cost<0 or not exists(select 1 from public.products where id=v_product and company_id=p_company_id and is_active) then raise exception 'Ligne transfert invalide'; end if;
  insert into public.stock_transfer_items(company_id,transfer_id,product_id,quantity,unit_cost) values(p_company_id,v_id,v_product,v_qty,v_cost);
  insert into public.stock_movements(company_id,product_id,warehouse_id,movement_type,quantity,unit_cost,reference_type,reference_id,note,created_by) values(p_company_id,v_product,p_source_warehouse_id,'transfer_out',v_qty,v_cost,'stock_transfer',v_id,'Transfert '||btrim(p_transfer_number)||' - sortie',auth.uid());
  insert into public.stock_movements(company_id,product_id,warehouse_id,movement_type,quantity,unit_cost,reference_type,reference_id,note,created_by) values(p_company_id,v_product,p_destination_warehouse_id,'transfer_in',v_qty,v_cost,'stock_transfer',v_id,'Transfert '||btrim(p_transfer_number)||' - entrée',auth.uid());
 end loop; return v_id;
end; $$;
create or replace function public.post_inventory_count(p_company_id uuid,p_count_number text,p_warehouse_id uuid,p_lines jsonb,p_notes text default null)
returns uuid language plpgsql security invoker set search_path='' as $$
declare v_id uuid; v_line jsonb; v_product uuid; v_counted numeric; v_expected numeric; v_diff numeric;
begin
 if auth.uid() is null or not private.has_company_access(p_company_id) then raise exception 'Accès refusé' using errcode='42501'; end if;
 if p_count_number is null or btrim(p_count_number)='' or jsonb_typeof(p_lines)<>'array' or jsonb_array_length(p_lines)=0 then raise exception 'Inventaire invalide'; end if;
 if not exists(select 1 from public.warehouses where id=p_warehouse_id and company_id=p_company_id and is_active) then raise exception 'Entrepôt invalide'; end if;
 insert into public.inventory_counts(company_id,count_number,warehouse_id,notes,created_by) values(p_company_id,btrim(p_count_number),p_warehouse_id,p_notes,auth.uid()) returning id into v_id;
 for v_line in select value from jsonb_array_elements(p_lines) loop
  v_product:=(v_line->>'product_id')::uuid; v_counted:=(v_line->>'counted_quantity')::numeric;
  if v_counted<0 or not exists(select 1 from public.products where id=v_product and company_id=p_company_id and is_active) then raise exception 'Ligne inventaire invalide'; end if;
  select coalesce(sum(case when movement_type in ('opening','purchase','return_in','transfer_in','adjustment_in') then quantity else -quantity end),0) into v_expected from public.stock_movements where company_id=p_company_id and product_id=v_product and warehouse_id=p_warehouse_id;
  v_diff:=v_counted-v_expected;
  insert into public.inventory_count_items(company_id,count_id,product_id,expected_quantity,counted_quantity,difference) values(p_company_id,v_id,v_product,v_expected,v_counted,v_diff);
  if v_diff>0 then
   insert into public.stock_movements(company_id,product_id,warehouse_id,movement_type,quantity,reference_type,reference_id,note,created_by) values(p_company_id,v_product,p_warehouse_id,'adjustment_in',v_diff,'inventory_count',v_id,'Écart inventaire '||btrim(p_count_number),auth.uid());
  elsif v_diff<0 then
   insert into public.stock_movements(company_id,product_id,warehouse_id,movement_type,quantity,reference_type,reference_id,note,created_by) values(p_company_id,v_product,p_warehouse_id,'adjustment_out',abs(v_diff),'inventory_count',v_id,'Écart inventaire '||btrim(p_count_number),auth.uid());
  end if;
 end loop; return v_id;
end; $$;
create or replace function public.create_stock_return(p_company_id uuid,p_return_number text,p_return_type text,p_warehouse_id uuid,p_customer_id uuid,p_supplier_id uuid,p_lines jsonb,p_reason text default null,p_notes text default null)
returns uuid language plpgsql security invoker set search_path='' as $$
declare v_id uuid; v_line jsonb; v_product uuid; v_qty numeric; v_price numeric; v_movement text;
begin
 if auth.uid() is null or not private.has_company_access(p_company_id) then raise exception 'Accès refusé' using errcode='42501'; end if;
 if p_return_type not in ('customer','supplier') or jsonb_typeof(p_lines)<>'array' or jsonb_array_length(p_lines)=0 then raise exception 'Retour invalide'; end if;
 if not exists(select 1 from public.warehouses where id=p_warehouse_id and company_id=p_company_id and is_active) then raise exception 'Entrepôt invalide'; end if;
 if p_return_type='customer' and p_supplier_id is not null then raise exception 'Fournisseur non autorisé pour un retour client'; end if;
 if p_return_type='supplier' and p_customer_id is not null then raise exception 'Client non autorisé pour un retour fournisseur'; end if;
 if p_customer_id is not null and not exists(select 1 from public.customers where id=p_customer_id and company_id=p_company_id) then raise exception 'Client invalide'; end if;
 if p_supplier_id is not null and not exists(select 1 from public.suppliers where id=p_supplier_id and company_id=p_company_id) then raise exception 'Fournisseur invalide'; end if;
 v_movement:=case when p_return_type='customer' then 'return_in' else 'return_out' end;
 insert into public.stock_returns(company_id,return_number,return_type,warehouse_id,customer_id,supplier_id,reason,notes,created_by) values(p_company_id,btrim(p_return_number),p_return_type,p_warehouse_id,p_customer_id,p_supplier_id,p_reason,p_notes,auth.uid()) returning id into v_id;
 for v_line in select value from jsonb_array_elements(p_lines) loop
  v_product:=(v_line->>'product_id')::uuid; v_qty:=(v_line->>'quantity')::numeric; v_price:=coalesce((v_line->>'unit_price')::numeric,0);
  if v_qty<=0 or v_price<0 or not exists(select 1 from public.products where id=v_product and company_id=p_company_id and is_active) then raise exception 'Ligne retour invalide'; end if;
  insert into public.stock_return_items(company_id,return_id,product_id,quantity,unit_price) values(p_company_id,v_id,v_product,v_qty,v_price);
  insert into public.stock_movements(company_id,product_id,warehouse_id,movement_type,quantity,reference_type,reference_id,note,created_by) values(p_company_id,v_product,p_warehouse_id,v_movement,v_qty,'stock_return',v_id,'Retour '||btrim(p_return_number),auth.uid());
 end loop; return v_id;
end; $$;
revoke all on function public.create_stock_transfer(uuid,text,uuid,uuid,jsonb,text) from public,anon;
revoke all on function public.post_inventory_count(uuid,text,uuid,jsonb,text) from public,anon;
revoke all on function public.create_stock_return(uuid,text,text,uuid,uuid,uuid,jsonb,text,text) from public,anon;
grant execute on function public.create_stock_transfer(uuid,text,uuid,uuid,jsonb,text) to authenticated;
grant execute on function public.post_inventory_count(uuid,text,uuid,jsonb,text) to authenticated;
grant execute on function public.create_stock_return(uuid,text,text,uuid,uuid,uuid,jsonb,text,text) to authenticated;
