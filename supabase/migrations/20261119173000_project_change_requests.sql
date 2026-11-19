create table if not exists public.project_change_requests (
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null references public.companies(id) on delete cascade,
 project_id uuid not null,
 request_code text not null,
 title text not null check(length(trim(title)) between 2 and 180),
 description text,
 justification text,
 impact_analysis text,
 priority text not null default 'medium' check(priority in ('low','medium','high','critical')),
 status text not null default 'pending' check(status in ('pending','under_review','approved','rejected','implemented')),
 requested_by uuid not null references auth.users(id),
 approved_by uuid references auth.users(id),
 requested_at timestamptz not null default now(),
 decision_at timestamptz,
 implementation_notes text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint project_change_requests_project_fk foreign key(company_id,project_id) references public.projects(company_id,id) on delete cascade,
 unique(company_id,request_code)
);
create index if not exists project_change_requests_company_project_status_idx on public.project_change_requests(company_id,project_id,status);
alter table public.project_change_requests enable row level security;
create policy project_change_requests_select_member on public.project_change_requests for select to authenticated using (exists(select 1 from public.projects p where p.id=project_change_requests.project_id and p.company_id=project_change_requests.company_id));
create policy project_change_requests_insert_member on public.project_change_requests for insert to authenticated with check (requested_by=(select auth.uid()) and exists(select 1 from public.company_members cm where cm.company_id=project_change_requests.company_id and cm.user_id=(select auth.uid()) and cm.is_active) and exists(select 1 from public.projects p where p.id=project_change_requests.project_id and p.company_id=project_change_requests.company_id));
create policy project_change_requests_update_manager on public.project_change_requests for update to authenticated using (exists(select 1 from public.company_members cm where cm.company_id=project_change_requests.company_id and cm.user_id=(select auth.uid()) and cm.is_active and cm.role=any(array['owner','admin','director','manager','supervisor'])) and exists(select 1 from public.projects p where p.id=project_change_requests.project_id and p.company_id=project_change_requests.company_id)) with check (exists(select 1 from public.company_members cm where cm.company_id=project_change_requests.company_id and cm.user_id=(select auth.uid()) and cm.is_active and cm.role=any(array['owner','admin','director','manager','supervisor'])) and exists(select 1 from public.projects p where p.id=project_change_requests.project_id and p.company_id=project_change_requests.company_id));
create policy project_change_requests_delete_manager on public.project_change_requests for delete to authenticated using (exists(select 1 from public.company_members cm where cm.company_id=project_change_requests.company_id and cm.user_id=(select auth.uid()) and cm.is_active and cm.role=any(array['owner','admin','director','manager'])) and exists(select 1 from public.projects p where p.id=project_change_requests.project_id and p.company_id=project_change_requests.company_id));