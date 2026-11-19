do $$
declare tbl text; actor_col text;
begin
 foreach tbl in array array['project_milestones','project_risks','project_issues','project_meetings','project_documents','project_raci','project_task_comments','project_task_dependencies']
 loop
  actor_col := case when tbl='project_documents' then 'uploaded_by' when tbl='project_task_comments' then 'user_id' else 'created_by' end;
  execute format('drop policy if exists %I on public.%I',tbl||'_select_member',tbl);
  execute format('create policy %I on public.%I for select to authenticated using (exists(select 1 from public.projects p where p.id=%I.project_id and p.company_id=%I.company_id))',tbl||'_select_member',tbl,tbl,tbl);
  execute format('drop policy if exists %I on public.%I',tbl||'_insert_member',tbl);
  if tbl='project_task_comments' then
   execute format('create policy %I on public.%I for insert to authenticated with check (user_id=(select auth.uid()) and exists(select 1 from public.company_members cm where cm.company_id=%I.company_id and cm.user_id=(select auth.uid()) and cm.is_active) and exists(select 1 from public.projects p where p.id=%I.project_id and p.company_id=%I.company_id))',tbl||'_insert_member',tbl,tbl,tbl,tbl);
  else
   execute format('create policy %I on public.%I for insert to authenticated with check (%I=(select auth.uid()) and exists(select 1 from public.company_members cm where cm.company_id=%I.company_id and cm.user_id=(select auth.uid()) and cm.is_active and cm.role=any(array[''owner'',''admin'',''director'',''manager'',''supervisor''])) and exists(select 1 from public.projects p where p.id=%I.project_id and p.company_id=%I.company_id))',tbl||'_insert_member',tbl,actor_col,tbl,tbl,tbl);
  end if;
  execute format('drop policy if exists %I on public.%I',tbl||'_update_manager',tbl);
  execute format('create policy %I on public.%I for update to authenticated using (exists(select 1 from public.company_members cm where cm.company_id=%I.company_id and cm.user_id=(select auth.uid()) and cm.is_active and cm.role=any(array[''owner'',''admin'',''director'',''manager'',''supervisor''])) and exists(select 1 from public.projects p where p.id=%I.project_id and p.company_id=%I.company_id)) with check (exists(select 1 from public.company_members cm where cm.company_id=%I.company_id and cm.user_id=(select auth.uid()) and cm.is_active and cm.role=any(array[''owner'',''admin'',''director'',''manager'',''supervisor''])) and exists(select 1 from public.projects p where p.id=%I.project_id and p.company_id=%I.company_id))',tbl||'_update_manager',tbl,tbl,tbl,tbl,tbl,tbl,tbl);
  execute format('drop policy if exists %I on public.%I',tbl||'_delete_manager',tbl);
  execute format('create policy %I on public.%I for delete to authenticated using (exists(select 1 from public.company_members cm where cm.company_id=%I.company_id and cm.user_id=(select auth.uid()) and cm.is_active and cm.role=any(array[''owner'',''admin'',''director'',''manager''])) and exists(select 1 from public.projects p where p.id=%I.project_id and p.company_id=%I.company_id))',tbl||'_delete_manager',tbl,tbl,tbl,tbl);
 end loop;
end $$;