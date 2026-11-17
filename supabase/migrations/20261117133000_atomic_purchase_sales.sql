-- Atomic purchase receiving and sales posting. Both functions run as the caller and obey RLS.
create or replace function public.receive_purchase_order(
  p_company_id uuid,p_supplier_id uuid,p_warehouse_id uuid,p_order_number text,p_lines jsonb,p_notes text default null
) returns uuid language plpgsql security invoker set search_path='' as $$
declare v_order_id uuid; v_line jsonb; v_product_id uuid; v_qty numeric; v_cost numeric; v_total numeric:=0;
begin
  if auth.uid() is null or not private.has_company_access(p_company_id) then raise exception 'Accès refusé' using errcode='42501'; end if;
  if p_order_number is null or btrim(p_order_number)='' or jsonb_typeof(p_lines)<>'array' or jsonb_array_length(p_lines)=0 then raise exception 'Commande invalide'; end if;
  if not exists(select 1 from public.warehouses w where w.id=p_warehouse_id and w.company_id=p_company_id and w.is_active) then raise exception 'Entrepôt invalide'; end if;
  if p_supplier_id is not null and not exists(select 1 from public.suppliers s where s.id=p_supplier_id and s.company_id=p_company_id) then raise exception 'Fournisseur invalide'; end if;
  for v_line in select value from jsonb_array_elements(p_lines) loop
    v_qty:=(v_line->>'quantity')::numeric; v_cost:=(v_line->>'unit_cost')::numeric; v_product_id:=(v_line->>'product_id')::uuid;
    if v_qty<=0 or v_cost<0 or not exists(select 1 from public.products p where p.id=v_product_id and p.company_id=p_company_id and p.is_active) then raise exception 'Ligne achat invalide'; end if;
    v_total:=v_total+v_qty*v_cost;
  end loop;
  insert into public.purchase_orders(company_id,supplier_id,order_number,status,order_date,subtotal,notes,created_by)
  values(p_company_id,p_supplier_id,btrim(p_order_number),'received',current_date,v_total,p_notes,auth.uid()) returning id into v_order_id;
  for v_line in select value from jsonb_array_elements(p_lines) loop
    v_product_id:=(v_line->>'product_id')::uuid; v_qty:=(v_line->>'quantity')::numeric; v_cost:=(v_line->>'unit_cost')::numeric;
    insert into public.purchase_order_items(company_id,purchase_order_id,product_id,quantity,received_quantity,unit_cost) values(p_company_id,v_order_id,v_product_id,v_qty,v_qty,v_cost);
    insert into public.stock_movements(company_id,product_id,warehouse_id,movement_type,quantity,unit_cost,reference_type,reference_id,note,created_by)
    values(p_company_id,v_product_id,p_warehouse_id,'purchase',v_qty,v_cost,'purchase_order',v_order_id,'Réception commande '||btrim(p_order_number),auth.uid());
  end loop; return v_order_id;
end; $$;
create or replace function public.create_stock_sale(
  p_company_id uuid,p_customer_id uuid,p_warehouse_id uuid,p_invoice_number text,p_lines jsonb,p_discount numeric default 0,p_notes text default null
) returns uuid language plpgsql security invoker set search_path='' as $$
declare v_sale_id uuid; v_line jsonb; v_product_id uuid; v_qty numeric; v_price numeric; v_line_discount numeric; v_subtotal numeric:=0; v_total numeric;
begin
  if auth.uid() is null or not private.has_company_access(p_company_id) then raise exception 'Accès refusé' using errcode='42501'; end if;
  if p_invoice_number is null or btrim(p_invoice_number)='' or jsonb_typeof(p_lines)<>'array' or jsonb_array_length(p_lines)=0 then raise exception 'Vente invalide'; end if;
  if p_discount<0 then raise exception 'Remise invalide'; end if;
  if not exists(select 1 from public.warehouses w where w.id=p_warehouse_id and w.company_id=p_company_id and w.is_active) then raise exception 'Entrepôt invalide'; end if;
  if p_customer_id is not null and not exists(select 1 from public.customers c where c.id=p_customer_id and c.company_id=p_company_id) then raise exception 'Client invalide'; end if;
  for v_line in select value from jsonb_array_elements(p_lines) loop
    v_product_id:=(v_line->>'product_id')::uuid; v_qty:=(v_line->>'quantity')::numeric; v_price:=(v_line->>'unit_price')::numeric; v_line_discount:=coalesce((v_line->>'discount')::numeric,0);
    if v_qty<=0 or v_price<0 or v_line_discount<0 or v_line_discount>v_qty*v_price or not exists(select 1 from public.products p where p.id=v_product_id and p.company_id=p_company_id and p.is_active) then raise exception 'Ligne vente invalide'; end if;
    v_subtotal:=v_subtotal+v_qty*v_price-v_line_discount;
  end loop;
  if p_discount>v_subtotal then raise exception 'Remise supérieure au sous-total'; end if; v_total:=v_subtotal-p_discount;
  insert into public.sales(company_id,customer_id,invoice_number,status,sale_date,subtotal,discount,total,notes,created_by)
  values(p_company_id,p_customer_id,btrim(p_invoice_number),'completed',now(),v_subtotal,p_discount,v_total,p_notes,auth.uid()) returning id into v_sale_id;
  for v_line in select value from jsonb_array_elements(p_lines) loop
    v_product_id:=(v_line->>'product_id')::uuid; v_qty:=(v_line->>'quantity')::numeric; v_price:=(v_line->>'unit_price')::numeric; v_line_discount:=coalesce((v_line->>'discount')::numeric,0);
    insert into public.sale_items(company_id,sale_id,product_id,quantity,unit_price,discount,line_total) values(p_company_id,v_sale_id,v_product_id,v_qty,v_price,v_line_discount,v_qty*v_price-v_line_discount);
    insert into public.stock_movements(company_id,product_id,warehouse_id,movement_type,quantity,reference_type,reference_id,note,created_by)
    values(p_company_id,v_product_id,p_warehouse_id,'sale',v_qty,'sale',v_sale_id,'Vente '||btrim(p_invoice_number),auth.uid());
  end loop; return v_sale_id;
end; $$;
revoke all on function public.receive_purchase_order(uuid,uuid,uuid,text,jsonb,text) from public,anon;
revoke all on function public.create_stock_sale(uuid,uuid,uuid,text,jsonb,numeric,text) from public,anon;
grant execute on function public.receive_purchase_order(uuid,uuid,uuid,text,jsonb,text) to authenticated;
grant execute on function public.create_stock_sale(uuid,uuid,uuid,text,jsonb,numeric,text) to authenticated;
