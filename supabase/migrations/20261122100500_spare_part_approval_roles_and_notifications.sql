-- Spare-part request approval roles and role-based notifications.
-- Managers, supervisors and warehouse users can review requests; warehouse issue remains scope-checked.
CREATE OR REPLACE FUNCTION private.can_access_spare_request(_company_id uuid, _request_id uuid, _permission text DEFAULT 'view'::text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select exists(
  select 1
  from public.spare_part_requests r
  where r.id=_request_id
    and r.company_id=_company_id
    and (
      private.has_company_access(_company_id,array['owner','admin'])
      or (
        _permission in ('view','approve')
        and private.has_company_access(_company_id,array['director','manager','supervisor','warehouse'])
      )
      or (
        _permission='view'
        and (
          r.requested_by=(select auth.uid())
          or exists(
            select 1
            from public.spare_part_request_items i
            where i.request_id=r.id
              and i.company_id=r.company_id
              and i.warehouse_id is not null
              and private.can_access_warehouse(i.company_id,i.warehouse_id,'view')
          )
        )
      )
      or (
        _permission in ('approve','issue')
        and exists(
          select 1 from public.spare_part_request_items i
          where i.request_id=r.id and i.company_id=r.company_id
        )
        and not exists(
          select 1 from public.spare_part_request_items i
          where i.request_id=r.id and i.company_id=r.company_id
            and i.warehouse_id is not null
            and not private.can_access_warehouse(i.company_id,i.warehouse_id,_permission)
        )
      )
    )
 );
$function$


CREATE OR REPLACE FUNCTION public.notify_spare_part_request_roles()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 v_title text;
 v_message text;
 v_type text;
begin
 if tg_op='INSERT' then
  v_title:='Nouvelle demande de pièce';
  v_message:='La demande '||new.request_number||' a été créée par '||
    coalesce(nullif(new.requested_for,''),'un utilisateur')||
    '. Merci de la consulter et de la traiter.';
  v_type:='spare_part_request_new';
 elsif tg_op='UPDATE' and old.status is distinct from new.status then
  v_title:='Mise à jour d’une demande de pièce';
  v_message:='La demande '||new.request_number||' est maintenant : '||new.status||'.';
  v_type:='spare_part_request_update';
 else
  return new;
 end if;

 insert into public.notifications(
  company_id,recipient_user_id,actor_user_id,notification_type,title,message,entity_type,entity_id
 )
 select new.company_id,cm.user_id,auth.uid(),v_type,v_title,v_message,'spare_part_request',new.id
 from public.company_members cm
 where cm.company_id=new.company_id
   and cm.is_active
   and (
     (tg_op='INSERT' and cm.role='warehouse')
     or (tg_op='UPDATE' and cm.role in ('manager','supervisor','warehouse','director','admin','owner'))
   )
   and cm.user_id is distinct from auth.uid()
   and cm.user_id is distinct from new.requested_by
   and not exists(
     select 1 from public.notifications n
     where n.company_id=new.company_id
       and n.recipient_user_id=cm.user_id
       and n.entity_type='spare_part_request'
       and n.entity_id=new.id
       and n.notification_type=v_type
       and (
         tg_op='INSERT'
         or n.created_at > now()-interval '2 minutes'
       )
   );

 return new;
end
$function$


CREATE OR REPLACE FUNCTION public.process_spare_part_request(p_company_id uuid, p_request_id uuid, p_action text, p_rejection_reason text DEFAULT NULL::text, p_issue_lines jsonb DEFAULT '[]'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 v_req public.spare_part_requests%rowtype;
 v_item record;
 v_line jsonb;
 v_qty numeric;
 v_total boolean;
 v_recipient uuid;
 v_wh uuid;
begin
 if auth.uid() is null or not private.has_company_access(p_company_id) then
  raise exception 'Accès refusé' using errcode='42501';
 end if;

 select * into v_req
 from public.spare_part_requests
 where id=p_request_id and company_id=p_company_id
 for update;
 if not found then raise exception 'Demande introuvable'; end if;

 if p_action in ('approve','reject') then
  if not (
    private.has_company_access(p_company_id,array['owner','admin','director','manager','supervisor','warehouse'])
    or exists(
      select 1 from public.user_scope_assignments usa
      where usa.company_id=p_company_id
        and usa.user_id=auth.uid()
        and usa.can_approve
        and lower(coalesce(usa.job_title,'')) similar to '%(responsable|responsible)%'
    )
  ) then
   raise exception 'Approbation réservée au Supervisor, Manager ou Magasinier autorisé' using errcode='42501';
  end if;
 elsif p_action='issue' then
  if not private.can_access_spare_request(p_company_id,p_request_id,'issue') then
   raise exception 'Droit de délivrance requis' using errcode='42501';
  end if;
 else
  raise exception 'Action inconnue';
 end if;

 if p_action='approve' then
  if v_req.status<>'submitted' then raise exception 'La demande ne peut plus être approuvée'; end if;
  update public.spare_part_request_items
  set approved_quantity=requested_quantity
  where request_id=p_request_id and company_id=p_company_id;
  update public.spare_part_requests
  set status='approved',reviewer_id=auth.uid(),reviewed_at=now(),updated_at=now()
  where id=p_request_id and company_id=p_company_id;

 elsif p_action='reject' then
  if v_req.status<>'submitted' then raise exception 'La demande ne peut plus être rejetée'; end if;
  if nullif(btrim(p_rejection_reason),'') is null then raise exception 'Motif de refus obligatoire'; end if;
  update public.spare_part_requests
  set status='rejected',reviewer_id=auth.uid(),reviewed_at=now(),
      rejection_reason=p_rejection_reason,updated_at=now()
  where id=p_request_id and company_id=p_company_id;

 elsif p_action='issue' then
  if v_req.status not in ('approved','partially_issued')
     or jsonb_typeof(p_issue_lines)<>'array'
     or jsonb_array_length(p_issue_lines)=0 then
   raise exception 'La demande doit être approuvée avant délivrance';
  end if;

  for v_line in select value from jsonb_array_elements(p_issue_lines) loop
   select * into v_item
   from public.spare_part_request_items
   where id=(v_line->>'item_id')::uuid
     and request_id=p_request_id
     and company_id=p_company_id
   for update;
   if not found then raise exception 'Ligne introuvable'; end if;

   v_qty:=(v_line->>'quantity')::numeric;
   v_wh:=coalesce(nullif(v_line->>'warehouse_id','')::uuid,v_item.warehouse_id);

   if v_qty<=0 or v_item.issued_quantity+v_qty>v_item.approved_quantity then
    raise exception 'Quantité délivrée invalide pour la ligne';
   end if;
   if v_wh is null or not exists(
     select 1 from public.warehouses w
     where w.id=v_wh and w.company_id=p_company_id and w.is_active
   ) then
    raise exception 'Sélectionnez un entrepôt valide pour chaque pièce';
   end if;
   if not private.can_access_warehouse(p_company_id,v_wh,'issue') then
    raise exception 'Vous ne disposez pas du droit de sortie sur cet entrepôt';
   end if;

   perform 1 from public.products
   where id=v_item.product_id and company_id=p_company_id
   for update;

   if (
     select coalesce(sum(
       case
        when movement_type in ('opening','purchase','return_in','transfer_in','adjustment_in') then quantity
        when movement_type in ('sale','return_out','transfer_out','adjustment_out') then -quantity
        else 0
       end
     ),0)
     from public.stock_movements
     where company_id=p_company_id and product_id=v_item.product_id and warehouse_id=v_wh
   )<v_qty then
    raise exception 'Stock insuffisant pour délivrer la quantité demandée';
   end if;

   insert into public.stock_movements(
    company_id,product_id,warehouse_id,movement_type,quantity,
    reference_type,reference_id,note,created_by
   )
   values(
    p_company_id,v_item.product_id,v_wh,'adjustment_out',v_qty,
    'spare_part_request',p_request_id,'Sortie demande '||v_req.request_number,auth.uid()
   );

   update public.spare_part_request_items
   set issued_quantity=issued_quantity+v_qty,warehouse_id=v_wh
   where id=v_item.id;
  end loop;

  select bool_and(issued_quantity>=approved_quantity) into v_total
  from public.spare_part_request_items
  where request_id=p_request_id and company_id=p_company_id;

  update public.spare_part_requests
  set status=case when coalesce(v_total,false) then 'fulfilled' else 'partially_issued' end,
      issued_by=auth.uid(),issued_at=now(),
      completed_at=case when coalesce(v_total,false) then now() else null end,
      updated_at=now()
  where id=p_request_id and company_id=p_company_id;
 end if;

 insert into public.notifications(
  company_id,recipient_user_id,actor_user_id,notification_type,title,message,entity_type,entity_id
 )
 values(
  p_company_id,v_req.requested_by,auth.uid(),'spare_part_request_update',
  'Mise à jour de la demande de sortie',
  'La demande '||v_req.request_number||' a été '||
   case
    when p_action='approve' then 'approuvée'
    when p_action='reject' then 'refusée'
    else 'délivrée par le magasinier'
   end||'.',
  'spare_part_request',p_request_id
 );

 return p_request_id;
end
$function$


drop policy if exists spare_part_requests_read_scoped on public.spare_part_requests;
create policy spare_part_requests_read_scoped on public.spare_part_requests for select to authenticated using (private.can_access_spare_request(company_id,id,'view') or private.has_company_access(company_id,array['owner','admin','director','manager','supervisor','warehouse']));

drop policy if exists spare_part_request_items_read_scoped on public.spare_part_request_items;
create policy spare_part_request_items_read_scoped on public.spare_part_request_items for select to authenticated using (private.has_company_access(company_id,array['owner','admin','director','manager','supervisor','warehouse']) or exists(select 1 from public.spare_part_requests r where r.id=request_id and r.company_id=spare_part_request_items.company_id and r.requested_by=(select auth.uid())) or private.can_access_warehouse(company_id,warehouse_id,'view'));

drop policy if exists spare_part_requests_update_scoped on public.spare_part_requests;

drop trigger if exists spare_part_request_role_notifications on public.spare_part_requests;
create trigger spare_part_request_role_notifications after insert or update of status on public.spare_part_requests for each row execute function public.notify_spare_part_request_roles();
revoke all on function public.notify_spare_part_request_roles() from public,anon;
grant execute on function public.notify_spare_part_request_roles() to authenticated;
