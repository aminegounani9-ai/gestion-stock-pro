create table if not exists public.project_task_assignees (
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null references public.companies(id) on delete cascade,
 project_id uuid not null,
 task_id uuid not null references public.project_tasks(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 assignment_role text not null default 'collaborator' check(assignment_role in ('collaborator','technical_lead','reviewer','observer')),
 assigned_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 constraint project_task_assignees_project_fk foreign key(company_id,project_id) references public.projects(company_id,id) on delete cascade,
 constraint project_task_assignees_task_scope_fk foreign key(company_id,project_id,task_id) references public.project_tasks(company_id,project_id,id) on delete cascade,
 unique(task_id,user_id)
);
create index if not exists project_task_assignees_company_project_task_idx on public.project_task_assignees(company_id,project_id,task_id);
alter table public.project_task_assignees enable row level security;
create policy project_task_assignees_select_member on public.project_task_assignees for select to authenticated using (exists(select 1 from public.projects p where p.id=project_task_assignees.project_id and p.company_id=project_task_assignees.company_id));
create policy project_task_assignees_insert_manager on public.project_task_assignees for insert to authenticated with check (assigned_by=(select auth.uid()) and exists(select 1 from public.company_members cm where cm.company_id=project_task_assignees.company_id and cm.user_id=(select auth.uid()) and cm.is_active and cm.role=any(array['owner','admin','director','manager','supervisor'])) and exists(select 1 from public.projects p where p.id=project_task_assignees.project_id and p.company_id=project_task_assignees.company_id));
create policy project_task_assignees_delete_manager on public.project_task_assignees for delete to authenticated using (exists(select 1 from public.company_members cm where cm.company_id=project_task_assignees.company_id and cm.user_id=(select auth.uid()) and cm.is_active and cm.role=any(array['owner','admin','director','manager','supervisor'])) and exists(select 1 from public.projects p where p.id=project_task_assignees.project_id and p.company_id=project_task_assignees.company_id));