create or replace function private.list_company_users(p_company_id uuid)
returns table(user_id uuid,email text,role text,is_active boolean,created_at timestamptz)
language plpgsql security definer set search_path=''
as $$
begin
 if auth.uid() is null or not private.has_company_access(p_company_id,array['owner','admin']) then raise exception 'Not authorized' using errcode='42501'; end if;
 return query select cm.user_id,au.email::text,cm.role,cm.is_active,cm.created_at from public.company_members cm join auth.users au on au.id=cm.user_id where cm.company_id=p_company_id order by cm.created_at desc;
end;
$$;
revoke all on function private.list_company_users(uuid) from public,anon;
grant usage on schema private to authenticated;
grant execute on function private.list_company_users(uuid) to authenticated;
create or replace function public.list_company_users(p_company_id uuid)
returns table(user_id uuid,email text,role text,is_active boolean,created_at timestamptz)
language sql security invoker set search_path=''
as $$ select * from private.list_company_users(p_company_id); $$;
revoke all on function public.list_company_users(uuid) from public,anon;
grant execute on function public.list_company_users(uuid) to authenticated;
