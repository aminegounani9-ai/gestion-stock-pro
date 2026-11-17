-- Prevent cross-company references in operational records at the RLS boundary.
drop policy if exists stock_movements_company_member_access on public.stock_movements;
drop policy if exists stock_movements_company_member_access on public.stock_movements;
create policy stock_movements_company_member_access on public.stock_movements for all to authenticated
using (private.has_company_access(company_id) and exists(select 1 from public.products p where p.id=product_id and p.company_id=stock_movements.company_id) and exists(select 1 from public.warehouses w where w.id=warehouse_id and w.company_id=stock_movements.company_id))
with check (private.has_company_access(company_id) and exists(select 1 from public.products p where p.id=product_id and p.company_id=stock_movements.company_id) and exists(select 1 from public.warehouses w where w.id=warehouse_id and w.company_id=stock_movements.company_id));
drop policy if exists purchase_order_items_company_member_access on public.purchase_order_items;
drop policy if exists purchase_order_items_company_member_access on public.purchase_order_items;
create policy purchase_order_items_company_member_access on public.purchase_order_items for all to authenticated
using (private.has_company_access(company_id) and exists(select 1 from public.purchase_orders po where po.id=purchase_order_id and po.company_id=purchase_order_items.company_id) and exists(select 1 from public.products p where p.id=product_id and p.company_id=purchase_order_items.company_id))
with check (private.has_company_access(company_id) and exists(select 1 from public.purchase_orders po where po.id=purchase_order_id and po.company_id=purchase_order_items.company_id) and exists(select 1 from public.products p where p.id=product_id and p.company_id=purchase_order_items.company_id));
drop policy if exists sale_items_company_member_access on public.sale_items;
drop policy if exists sale_items_company_member_access on public.sale_items;
create policy sale_items_company_member_access on public.sale_items for all to authenticated
using (private.has_company_access(company_id) and exists(select 1 from public.sales s where s.id=sale_id and s.company_id=sale_items.company_id) and exists(select 1 from public.products p where p.id=product_id and p.company_id=sale_items.company_id))
with check (private.has_company_access(company_id) and exists(select 1 from public.sales s where s.id=sale_id and s.company_id=sale_items.company_id) and exists(select 1 from public.products p where p.id=product_id and p.company_id=sale_items.company_id));
drop policy if exists sales_company_member_access on public.sales;
drop policy if exists sales_company_member_access on public.sales;
create policy sales_company_member_access on public.sales for all to authenticated
using (private.has_company_access(company_id) and (customer_id is null or exists(select 1 from public.customers c where c.id=customer_id and c.company_id=sales.company_id)))
with check (private.has_company_access(company_id) and (customer_id is null or exists(select 1 from public.customers c where c.id=customer_id and c.company_id=sales.company_id)));
drop policy if exists purchase_orders_company_member_access on public.purchase_orders;
drop policy if exists purchase_orders_company_member_access on public.purchase_orders;
create policy purchase_orders_company_member_access on public.purchase_orders for all to authenticated
using (private.has_company_access(company_id) and (supplier_id is null or exists(select 1 from public.suppliers s where s.id=supplier_id and s.company_id=purchase_orders.company_id)))
with check (private.has_company_access(company_id) and (supplier_id is null or exists(select 1 from public.suppliers s where s.id=supplier_id and s.company_id=purchase_orders.company_id)));
drop policy if exists stock_transfer_items_company_access on public.stock_transfer_items;
drop policy if exists stock_transfer_items_company_access on public.stock_transfer_items;
create policy stock_transfer_items_company_access on public.stock_transfer_items for all to authenticated
using (private.has_company_access(company_id) and exists(select 1 from public.stock_transfers st where st.id=transfer_id and st.company_id=stock_transfer_items.company_id) and exists(select 1 from public.products p where p.id=product_id and p.company_id=stock_transfer_items.company_id))
with check (private.has_company_access(company_id) and exists(select 1 from public.stock_transfers st where st.id=transfer_id and st.company_id=stock_transfer_items.company_id) and exists(select 1 from public.products p where p.id=product_id and p.company_id=stock_transfer_items.company_id));
drop policy if exists inventory_count_items_company_access on public.inventory_count_items;
drop policy if exists inventory_count_items_company_access on public.inventory_count_items;
create policy inventory_count_items_company_access on public.inventory_count_items for all to authenticated
using (private.has_company_access(company_id) and exists(select 1 from public.inventory_counts ic where ic.id=count_id and ic.company_id=inventory_count_items.company_id) and exists(select 1 from public.products p where p.id=product_id and p.company_id=inventory_count_items.company_id))
with check (private.has_company_access(company_id) and exists(select 1 from public.inventory_counts ic where ic.id=count_id and ic.company_id=inventory_count_items.company_id) and exists(select 1 from public.products p where p.id=product_id and p.company_id=inventory_count_items.company_id));
drop policy if exists stock_return_items_company_access on public.stock_return_items;
drop policy if exists stock_return_items_company_access on public.stock_return_items;
create policy stock_return_items_company_access on public.stock_return_items for all to authenticated
using (private.has_company_access(company_id) and exists(select 1 from public.stock_returns sr where sr.id=return_id and sr.company_id=stock_return_items.company_id) and exists(select 1 from public.products p where p.id=product_id and p.company_id=stock_return_items.company_id))
with check (private.has_company_access(company_id) and exists(select 1 from public.stock_returns sr where sr.id=return_id and sr.company_id=stock_return_items.company_id) and exists(select 1 from public.products p where p.id=product_id and p.company_id=stock_return_items.company_id));
drop policy if exists stock_transfers_company_access on public.stock_transfers;
drop policy if exists stock_transfers_company_access on public.stock_transfers;
create policy stock_transfers_company_access on public.stock_transfers for all to authenticated
using (private.has_company_access(company_id) and exists(select 1 from public.warehouses w where w.id=source_warehouse_id and w.company_id=stock_transfers.company_id) and exists(select 1 from public.warehouses w where w.id=destination_warehouse_id and w.company_id=stock_transfers.company_id))
with check (private.has_company_access(company_id) and exists(select 1 from public.warehouses w where w.id=source_warehouse_id and w.company_id=stock_transfers.company_id) and exists(select 1 from public.warehouses w where w.id=destination_warehouse_id and w.company_id=stock_transfers.company_id));
drop policy if exists inventory_counts_company_access on public.inventory_counts;
drop policy if exists inventory_counts_company_access on public.inventory_counts;
create policy inventory_counts_company_access on public.inventory_counts for all to authenticated
using (private.has_company_access(company_id) and exists(select 1 from public.warehouses w where w.id=warehouse_id and w.company_id=inventory_counts.company_id))
with check (private.has_company_access(company_id) and exists(select 1 from public.warehouses w where w.id=warehouse_id and w.company_id=inventory_counts.company_id));
drop policy if exists stock_returns_company_access on public.stock_returns;
drop policy if exists stock_returns_company_access on public.stock_returns;
create policy stock_returns_company_access on public.stock_returns for all to authenticated
using (private.has_company_access(company_id) and exists(select 1 from public.warehouses w where w.id=warehouse_id and w.company_id=stock_returns.company_id) and (customer_id is null or exists(select 1 from public.customers c where c.id=customer_id and c.company_id=stock_returns.company_id)) and (supplier_id is null or exists(select 1 from public.suppliers s where s.id=supplier_id and s.company_id=stock_returns.company_id)))
with check (private.has_company_access(company_id) and exists(select 1 from public.warehouses w where w.id=warehouse_id and w.company_id=stock_returns.company_id) and (customer_id is null or exists(select 1 from public.customers c where c.id=customer_id and c.company_id=stock_returns.company_id)) and (supplier_id is null or exists(select 1 from public.suppliers s where s.id=supplier_id and s.company_id=stock_returns.company_id)));