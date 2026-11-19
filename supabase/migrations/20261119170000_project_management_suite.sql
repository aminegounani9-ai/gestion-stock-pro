-- Project Management Suite (additive, tenant-scoped; preserves existing records)
alter table public.project_tasks add column if not exists parent_task_id uuid references public.project_tasks(id) on delete set null;
create index if not exists project_tasks_parent_task_idx on public.project_tasks(parent_task_id);
create index if not exists project_tasks_company_due_idx on public.project_tasks(company_id,due_date);

create table if not exists public.project_milestones (
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade, project_id uuid not null,
 title text not null check(length(trim(title)) between 2 and 180), description text, due_date date,
 status text not null default 'planned' check(status in ('planned','in_progress','completed','at_risk')),
 progress numeric(5,2) not null default 0 check(progress between 0 and 100), owner_user_id uuid references auth.users(id) on delete set null,
 created_by uuid not null references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 constraint project_milestones_project_fk foreign key(company_id,project_id) references public.projects(company_id,id) on delete cascade
);
create table if not exists public.project_risks (
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade, project_id uuid not null,
 title text not null check(length(trim(title)) between 2 and 180), description text, category text not null default 'operational',
 probability integer not null default 3 check(probability between 1 and 5), impact integer not null default 3 check(impact between 1 and 5),
 mitigation_plan text, owner_user_id uuid references auth.users(id) on delete set null,
 status text not null default 'open' check(status in ('open','mitigating','accepted','closed')), review_date date,
 created_by uuid not null references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 constraint project_risks_project_fk foreign key(company_id,project_id) references public.projects(company_id,id) on delete cascade
);
create table if not exists public.project_issues (
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade, project_id uuid not null,
 title text not null check(length(trim(title)) between 2 and 180), description text,
 severity text not null default 'medium' check(severity in ('low','medium','high','critical')),
 status text not null default 'open' check(status in ('open','in_progress','resolved','closed')),
 assigned_to uuid references auth.users(id) on delete set null, due_date date, resolution text,
 created_by uuid not null references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 constraint project_issues_project_fk foreign key(company_id,project_id) references public.projects(company_id,id) on delete cascade
);
create table if not exists public.project_meetings (
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade, project_id uuid not null,
 title text not null check(length(trim(title)) between 2 and 180), meeting_at timestamptz not null, location text,
 attendees jsonb not null default '[]'::jsonb, agenda text, minutes text, decisions text, action_items text,
 created_by uuid not null references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 constraint project_meetings_project_fk foreign key(company_id,project_id) references public.projects(company_id,id) on delete cascade
);
create table if not exists public.project_documents (
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade, project_id uuid not null,
 title text not null check(length(trim(title)) between 2 and 180), document_type text not null default 'general', external_url text, notes text,
 uploaded_by uuid not null references auth.users(id), created_at timestamptz not null default now(),
 constraint project_documents_project_fk foreign key(company_id,project_id) references public.projects(company_id,id) on delete cascade
);
create table if not exists public.project_raci (
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade, project_id uuid not null,
 task_id uuid references public.project_tasks(id) on delete cascade, user_id uuid not null references auth.users(id) on delete cascade,
 responsibility text not null check(responsibility in ('responsible','accountable','consulted','informed')),
 created_by uuid not null references auth.users(id), created_at timestamptz not null default now(),
 constraint project_raci_project_fk foreign key(company_id,project_id) references public.projects(company_id,id) on delete cascade
);
create table if not exists public.project_task_comments (
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade, project_id uuid not null,
 task_id uuid not null references public.project_tasks(id) on delete cascade, user_id uuid not null references auth.users(id),
 comment text not null check(length(trim(comment)) between 1 and 5000), created_at timestamptz not null default now(),
 constraint project_task_comments_project_fk foreign key(company_id,project_id) references public.projects(company_id,id) on delete cascade
);
create table if not exists public.project_task_dependencies (
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade, project_id uuid not null,
 task_id uuid not null references public.project_tasks(id) on delete cascade, depends_on_task_id uuid not null references public.project_tasks(id) on delete cascade,
 dependency_type text not null default 'finish_to_start' check(dependency_type in ('finish_to_start','start_to_start','finish_to_finish','start_to_finish')),
 created_by uuid not null references auth.users(id), created_at timestamptz not null default now(),
 check(task_id <> depends_on_task_id), constraint project_task_dependencies_project_fk foreign key(company_id,project_id) references public.projects(company_id,id) on delete cascade,
 unique(task_id,depends_on_task_id)
);

create index if not exists project_milestones_company_project_due_idx on public.project_milestones(company_id,project_id,due_date);
create index if not exists project_risks_company_project_status_idx on public.project_risks(company_id,project_id,status);
create index if not exists project_issues_company_project_status_idx on public.project_issues(company_id,project_id,status);
create index if not exists project_meetings_company_project_date_idx on public.project_meetings(company_id,project_id,meeting_at);
create index if not exists project_documents_company_project_idx on public.project_documents(company_id,project_id);
create index if not exists project_raci_company_project_idx on public.project_raci(company_id,project_id);
create index if not exists project_task_comments_task_date_idx on public.project_task_comments(task_id,created_at);
create index if not exists project_task_dependencies_task_idx on public.project_task_dependencies(task_id);

do $$
declare tbl text; actor_col text;
begin
 foreach tbl in array array['project_milestones','project_risks','project_issues','project_meetings','project_documents','project_raci','project_task_comments','project_task_dependencies']
 loop
  actor_col := case when tbl='project_documents' then 'uploaded_by' when tbl='project_task_comments' then 'user_id' else 'created_by' end;
  execute format('alter table public.%I enable row level security',tbl);
  execute format('drop policy if exists %I on public.%I',tbl||'_select_member',tbl);
  execute format('create policy %I on public.%I for select to authenticated using (exists(select 1 from public.company_members cm where cm.company_id=%I.company_id and cm.user_id=(select auth.uid()) and cm.is_active))',tbl||'_select_member',tbl,tbl);
  execute format('drop policy if exists %I on public.%I',tbl||'_insert_member',tbl);
  if tbl='project_task_comments' then
   execute format('create policy %I on public.%I for insert to authenticated with check (user_id=(select auth.uid()) and exists(select 1 from public.company_members cm where cm.company_id=%I.company_id and cm.user_id=(select auth.uid()) and cm.is_active))',tbl||'_insert_member',tbl,tbl);
  else
   execute format('create policy %I on public.%I for insert to authenticated with check (%I=(select auth.uid()) and exists(select 1 from public.company_members cm where cm.company_id=%I.company_id and cm.user_id=(select auth.uid()) and cm.is_active and cm.role=any(array[''owner'',''admin'',''director'',''manager'',''supervisor''])))',tbl||'_insert_member',tbl,actor_col,tbl);
  end if;
  execute format('drop policy if exists %I on public.%I',tbl||'_update_manager',tbl);
  execute format('create policy %I on public.%I for update to authenticated using (exists(select 1 from public.company_members cm where cm.company_id=%I.company_id and cm.user_id=(select auth.uid()) and cm.is_active and cm.role=any(array[''owner'',''admin'',''director'',''manager'',''supervisor'']))) with check (exists(select 1 from public.company_members cm where cm.company_id=%I.company_id and cm.user_id=(select auth.uid()) and cm.is_active and cm.role=any(array[''owner'',''admin'',''director'',''manager'',''supervisor''])))',tbl||'_update_manager',tbl,tbl,tbl);
  execute format('drop policy if exists %I on public.%I',tbl||'_delete_manager',tbl);
  execute format('create policy %I on public.%I for delete to authenticated using (exists(select 1 from public.company_members cm where cm.company_id=%I.company_id and cm.user_id=(select auth.uid()) and cm.is_active and cm.role=any(array[''owner'',''admin'',''director'',''manager''])))',tbl||'_delete_manager',tbl,tbl);
 end loop;
end $$;