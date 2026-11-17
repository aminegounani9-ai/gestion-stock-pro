-- Harden company membership administration and cover the payment creator foreign key.
drop policy if exists members_update_admin on public.company_members;
create policy members_update_admin
on public.company_members
for update
to authenticated
using (
  user_id <> (select auth.uid())
  and (
    private.has_company_access(company_id, array['owner'])
    or (
      role <> 'owner'
      and private.has_company_access(company_id, array['admin'])
    )
  )
)
with check (
  user_id <> (select auth.uid())
  and (
    private.has_company_access(company_id, array['owner'])
    or (
      role <> 'owner'
      and private.has_company_access(company_id, array['admin'])
    )
  )
);

drop policy if exists members_delete_admin on public.company_members;
create policy members_delete_admin
on public.company_members
for delete
to authenticated
using (
  user_id <> (select auth.uid())
  and (
    private.has_company_access(company_id, array['owner'])
    or (
      role <> 'owner'
      and private.has_company_access(company_id, array['admin'])
    )
  )
);

create index if not exists payment_transactions_created_by_idx
on public.payment_transactions (created_by);
