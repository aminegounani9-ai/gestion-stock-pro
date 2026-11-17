create table if not exists public.user_invitations (
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null references public.companies(id) on delete cascade,
 email text not null,
 role text not null check(role in ('admin','manager','warehouse','sales','viewer','staff')),
 invited_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 expires_at timestamptz not null default (now()+interval '7 days'),
 accepted_at timestamptz,
 unique(company_id,email)
);
alter table public.user_invitations enable row level security;
revoke all on public.user_invitations from anon;
grant select,insert,update,delete on public.user_invitations to authenticated;
drop policy if exists invitations_admin_select on public.user_invitations;
create policy invitations_admin_select on public.user_invitations for select to authenticated using(private.has_company_access(company_id,array['owner','admin']));
drop policy if exists invitations_admin_insert on public.user_invitations;
create policy invitations_admin_insert on public.user_invitations for insert to authenticated with check(invited_by=(select auth.uid()) and private.has_company_access(company_id,array['owner','admin']));
drop policy if exists invitations_admin_update on public.user_invitations;
create policy invitations_admin_update on public.user_invitations for update to authenticated using(private.has_company_access(company_id,array['owner','admin'])) with check(private.has_company_access(company_id,array['owner','admin']));
drop policy if exists invitations_admin_delete on public.user_invitations;
create policy invitations_admin_delete on public.user_invitations for delete to authenticated using(private.has_company_access(company_id,array['owner','admin']));
create or replace function private.guard_auth_signup_invitation()
returns trigger language plpgsql security definer set search_path='' as $$
declare invited public.user_invitations%rowtype;
begin
 select * into invited from public.user_invitations i where lower(i.email)=lower(new.email) and i.accepted_at is null and i.expires_at>now() order by i.created_at desc limit 1;
 if not found then raise exception 'Account creation is invitation-only. Contact your company administrator.'; end if;
 return new;
end;
$$;
create or replace function private.assign_invited_company_membership()
returns trigger language plpgsql security definer set search_path='' as $$
declare invited public.user_invitations%rowtype;
begin
 select * into invited from public.user_invitations i where lower(i.email)=lower(new.email) and i.accepted_at is null and i.expires_at>now() order by i.created_at desc limit 1;
 if found then
  insert into public.company_members(company_id,user_id,role,is_active) values(invited.company_id,new.id,invited.role,true) on conflict do nothing;
  update public.user_invitations set accepted_at=now() where id=invited.id;
 end if;
 return new;
end;
$$;
revoke all on function private.guard_auth_signup_invitation() from public,anon,authenticated;
revoke all on function private.assign_invited_company_membership() from public,anon,authenticated;
drop trigger if exists guard_auth_signup_invitation on auth.users;
create trigger guard_auth_signup_invitation before insert on auth.users for each row execute function private.guard_auth_signup_invitation();
drop trigger if exists assign_invited_company_membership on auth.users;
create trigger assign_invited_company_membership after insert on auth.users for each row execute function private.assign_invited_company_membership();
