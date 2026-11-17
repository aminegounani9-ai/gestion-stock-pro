drop policy if exists movements_write_company on public.stock_movements;
create policy movements_write_company on public.stock_movements for insert to authenticated with check (
 private.has_company_access(company_id,array['owner','admin','manager','warehouse'])
 or (private.has_company_access(company_id,array['sales']) and movement_type in ('sale','return_in') and reference_type in ('sale','stock_return'))
);
drop policy if exists returns_write_company on public.stock_returns;
create policy returns_write_company on public.stock_returns for insert to authenticated with check (
 private.has_company_access(company_id,array['owner','admin','manager','warehouse'])
 or (return_type='customer' and private.has_company_access(company_id,array['sales']))
);
drop policy if exists return_items_write_company on public.stock_return_items;
create policy return_items_write_company on public.stock_return_items for insert to authenticated with check (
 exists(select 1 from public.stock_returns sr where sr.id=return_id and sr.company_id=stock_return_items.company_id)
 and exists(select 1 from public.products p where p.id=product_id and p.company_id=stock_return_items.company_id)
 and (private.has_company_access(company_id,array['owner','admin','manager','warehouse'])
  or (exists(select 1 from public.stock_returns sr where sr.id=return_id and sr.return_type='customer' and sr.company_id=stock_return_items.company_id) and private.has_company_access(company_id,array['sales'])))
);
