import { useCallback, useEffect, useMemo, useState } from "react";
import ModalPortal from "./ModalPortal";
import type { FormEvent } from "react";
import { Plus, RefreshCw, ShieldCheck, Building2, X, Check, Pencil } from "lucide-react";
import { supabase } from "./lib/supabase";

type ScopeType = "management" | "site" | "unit" | "service" | "department" | "equipment" | "warehouse";
type Row = { id: string; code?: string; name?: string; site_id?: string; unit_id?: string | null; service_id?: string | null; equipment_tag?: string; is_active?: boolean; [key: string]: any };
type Member = { user_id: string; email?: string; role?: string; is_active?: boolean };
const tables: Record<ScopeType,string> = { management:"org_managements", site:"org_sites", unit:"org_units", service:"org_services", department:"org_departments", equipment:"org_equipment", warehouse:"warehouses" };
const labels: Record<ScopeType,string> = { management:"Management", site:"Site", unit:"Unité", service:"Service", department:"Département", equipment:"Équipement", warehouse:"Entrepôt" };
const words={
 fr:{management:"Management / Direction générale",managementIntro:"Affectation hiérarchique au niveau de toute l’entreprise : accès transversal aux modules, sites, unités, services, départements et données.",director:"Directeur",assignDirector:"Nommer Directeur",currentDirectors:"Membres du Management",noDirectors:"Aucun directeur n’est encore affecté.",removeDirector:"Retirer du Management",selectMember:"Sélectionner un collaborateur",directorAssigned:"Accès Management accordé. Actualisez la session du collaborateur pour appliquer ses droits.",directorRemoved:"Accès Management retiré. Le rôle du collaborateur est repassé à Lecteur.",title:"Organisation de l'entreprise",intro:"Configurez les sites, unités, services, départements, équipements et magasins.",refresh:"Actualiser",code:"Code",tag:"Tag équipement",name:"Nom",designation:"Désignation",site:"Site",chooseSite:"Choisir un site",unit:"Unité (facultatif)",noUnit:"Aucune unité",service:"Service (facultatif)",noService:"Aucun service",address:"Adresse",manufacturer:"Fabricant",model:"Modèle",serial:"N° série",location:"Emplacement",save:"Enregistrer les modifications",add:"Ajouter",cancel:"Annuler",codeTag:"Code / Tag",attachment:"Rattachement",status:"Statut",action:"Action",active:"Actif",inactive:"Inactif",edit:"Modifier",disable:"Désactiver",enable:"Réactiver",empty:"Aucun élément enregistré",emptyHint:"Ajoutez le premier élément avec le formulaire ci-dessus.",rights:"Périmètres & autorisations",rightsIntro:"Les affectations peuvent couvrir plusieurs sites, unités, services ou équipements.",multiScopeHint:"Sélectionnez une ou plusieurs unités (Ctrl/Cmd + clic pour plusieurs choix).",multiScopeSaved:"affectation(s) enregistrée(s).",structure:"Structure",assignments:"Affectations",user:"Utilisateur",select:"Sélectionner",job:"Fonction / Poste",jobHint:"Manager, Responsable, Superviseur...",scopeType:"Type de périmètre",scope:"Périmètre",rightsCount:"Droits",remove:"Retirer",unavailable:"Élément indisponible",saveAssignment:"Enregistrer l'affectation",view:"Consulter",create:"Créer",update:"Modifier",delete:"Supprimer",approve:"Approuver",issue:"Délivrer",receive:"Réceptionner",transfer:"Transférer",inventory:"Inventorier"},
 en:{management:"Management / Executive direction",managementIntro:"Company-wide hierarchical assignment with cross-department access to all modules, sites, units, services, departments and records.",director:"Director",assignDirector:"Appoint director",currentDirectors:"Management members",noDirectors:"No director has been assigned yet.",removeDirector:"Remove from Management",selectMember:"Select a team member",directorAssigned:"Management access granted. The member should refresh their session to apply permissions.",directorRemoved:"Management access removed. The member role has been reset to Viewer.",title:"Company organization",intro:"Configure sites, units, services, departments, equipment and warehouses.",refresh:"Refresh",code:"Code",tag:"Equipment tag",name:"Name",designation:"Description",site:"Site",chooseSite:"Select a site",unit:"Unit (optional)",noUnit:"No unit",service:"Service (optional)",noService:"No service",address:"Address",manufacturer:"Manufacturer",model:"Model",serial:"Serial no.",location:"Location",save:"Save changes",add:"Add",cancel:"Cancel",codeTag:"Code / Tag",attachment:"Assignment",status:"Status",action:"Action",active:"Active",inactive:"Inactive",edit:"Edit",disable:"Deactivate",enable:"Reactivate",empty:"No records yet",emptyHint:"Add the first item using the form above.",rights:"Scopes & permissions",rightsIntro:"Assignments can cover multiple sites, units, services or equipment.",multiScopeHint:"Select one or more units (Ctrl/Cmd + click for multiple selections).",multiScopeSaved:"assignment(s) saved.",structure:"Structure",assignments:"Assignments",user:"User",select:"Select",job:"Job title / Role",jobHint:"Manager, Responsible, Supervisor...",scopeType:"Scope type",scope:"Scope",rightsCount:"Rights",remove:"Remove",unavailable:"Unavailable item",saveAssignment:"Save assignment",view:"View",create:"Create",update:"Edit",delete:"Delete",approve:"Approve",issue:"Issue",receive:"Receive",transfer:"Transfer",inventory:"Inventory"},
 ar:{management:"الإدارة العليا / الإدارة العامة",managementIntro:"تعيين هرمي على مستوى الشركة كاملة، مع صلاحية الاطلاع على جميع الوحدات والمواقع والمصالح والأقسام والبيانات.",director:"مدير عام",assignDirector:"تعيين مدير عام",currentDirectors:"أعضاء الإدارة العليا",noDirectors:"لم يتم تعيين مدير بعد.",removeDirector:"إزالة من الإدارة العليا",selectMember:"اختر موظفاً",directorAssigned:"تم منح صلاحية الإدارة العليا. يجب على المستخدم تحديث الجلسة لتطبيق الصلاحيات.",directorRemoved:"تمت إزالة صلاحية الإدارة العليا وإرجاع دور المستخدم إلى قارئ.",title:"الهيكل التنظيمي للشركة",intro:"إعداد المواقع والوحدات والمصالح والأقسام والمعدات والمخازن.",refresh:"تحديث",code:"الرمز",tag:"رمز المعدة",name:"الاسم",designation:"التسمية",site:"الموقع",chooseSite:"اختر موقعاً",unit:"الوحدة (اختياري)",noUnit:"بدون وحدة",service:"المصلحة (اختياري)",noService:"بدون مصلحة",address:"العنوان",manufacturer:"الشركة المصنعة",model:"الطراز",serial:"الرقم التسلسلي",location:"الموقع",save:"حفظ التعديلات",add:"إضافة",cancel:"إلغاء",codeTag:"الرمز / الوسم",attachment:"الارتباط",status:"الحالة",action:"الإجراء",active:"نشط",inactive:"غير نشط",edit:"تعديل",disable:"تعطيل",enable:"إعادة تفعيل",empty:"لا توجد عناصر مسجلة",emptyHint:"أضف أول عنصر باستعمال النموذج أعلاه.",rights:"النطاقات والصلاحيات",rightsIntro:"يمكن أن تشمل التعيينات عدة مواقع أو وحدات أو مصالح أو معدات.",multiScopeHint:"يمكنك اختيار وحدة واحدة أو عدة وحدات معاً.",multiScopeSaved:" تعيينات تم حفظها.",structure:"الهيكل",assignments:"التعيينات",user:"المستخدم",select:"اختر",job:"الوظيفة / المنصب",jobHint:"مدير، مسؤول، مشرف...",scopeType:"نوع النطاق",scope:"النطاق",rightsCount:"الصلاحيات",remove:"إزالة",unavailable:"عنصر غير متاح",saveAssignment:"حفظ التعيين",view:"عرض",create:"إنشاء",update:"تعديل",delete:"حذف",approve:"موافقة",issue:"صرف",receive:"استلام",transfer:"تحويل",inventory:"جرد"}
};


export default function OrganizationManagement({ companyId, members, currentUserId, onNotice, onRefreshMembers, lang="fr" }: { companyId:string; members:Member[]; currentUserId:string; onNotice:(type:"success"|"error",message:string)=>void; onRefreshMembers?:()=>void|Promise<void>; lang?:"fr"|"en"|"ar" }) {
  const t=words[lang];
  const scopeLabels:Record<ScopeType,string>={management:"Management",site:lang==="ar"?"الموقع":lang==="en"?"Site":"Site",unit:lang==="ar"?"الوحدة":lang==="en"?"Unit":"Unité",service:lang==="ar"?"المصلحة":"Service",department:lang==="ar"?"القسم":lang==="en"?"Department":"Département",equipment:lang==="ar"?"المعدة":lang==="en"?"Equipment":"Équipement",warehouse:lang==="ar"?"المخزن":lang==="en"?"Warehouse":"Entrepôt"};
  const [activeTab,setActiveTab] = useState<"structure"|"assignments">("structure");
  const [kind,setKind] = useState<ScopeType>("site");
  const [managements,setManagements] = useState<Row[]>([]);
  const [sites,setSites] = useState<Row[]>([]);
  const [units,setUnits] = useState<Row[]>([]);
  const [services,setServices] = useState<Row[]>([]);
  const [departments,setDepartments] = useState<Row[]>([]);
  const [equipment,setEquipment] = useState<Row[]>([]);
  const [warehouses,setWarehouses] = useState<Row[]>([]);
  const [assignments,setAssignments] = useState<any[]>([]);
  const [form,setForm] = useState<Record<string,string>>({});
  const [editingId,setEditingId] = useState<string|null>(null);
  const [assignment,setAssignment] = useState({user_id:"",job_title:"",scope_type:"unit" as ScopeType,scope_id:"",can_view:true,can_create:false,can_edit:false,can_delete:false,can_approve:false,can_issue:false,can_receive:false,can_transfer:false,can_inventory:false});
  const [selectedScopeIds,setSelectedScopeIds] = useState<string[]>([]);
  const [assignmentSearch,setAssignmentSearch]=useState("");
  const [busy,setBusy] = useState(false);
  const [managementUserId,setManagementUserId] = useState("");
  const [formOpen,setFormOpen]=useState(false);
  const [assignmentModalOpen,setAssignmentModalOpen]=useState(false);
  const [managementModalOpen,setManagementModalOpen]=useState(false);
  const refresh = useCallback(async () => {
    if(!supabase) return;
    const [a,b,c,d,e,f,g,h] = await Promise.all([
      supabase.from("org_managements").select("*").eq("company_id",companyId).order("name"),
      supabase.from("org_sites").select("*").eq("company_id",companyId).order("name"),
      supabase.from("org_units").select("*").eq("company_id",companyId).order("name"),
      supabase.from("org_services").select("*").eq("company_id",companyId).order("name"),
      supabase.from("org_departments").select("*").eq("company_id",companyId).order("name"),
      supabase.from("org_equipment").select("*").eq("company_id",companyId).order("name"),
      supabase.from("user_scope_assignments").select("*").eq("company_id",companyId).order("created_at",{ascending:false}),
      supabase.from("warehouses").select("id,code,name,is_active").eq("company_id",companyId).order("name")
    ]);
    const error=[a,b,c,d,e,f,g,h].find(x=>x.error)?.error;
    if(error) throw error;
    setManagements(a.data??[]);setSites(b.data??[]);setUnits(c.data??[]);setServices(d.data??[]);setDepartments(e.data??[]);setEquipment((f.data??[]).map(x=>({...x,is_active:x.status==="active"})));setAssignments(g.data??[]);setWarehouses(h.data??[]);
  },[companyId]);
  useEffect(()=>{void refresh().catch(e=>onNotice("error",e.message));},[refresh]);

  const scopeRows = useMemo(()=>({management:managements,site:sites,unit:units,service:services,department:departments,equipment,warehouse:warehouses}),[managements,sites,units,services,departments,equipment,warehouses]);
  const availableScopes = scopeRows[assignment.scope_type] ?? [];
  const filteredScopeOptions=availableScopes.filter((x:Row)=>[x.code,x.name,x.equipment_tag].filter(Boolean).join(" ").toLowerCase().includes(assignmentSearch.toLowerCase()));
  function scopeContext(row:Row){
    const site=sites.find(x=>x.id===row.site_id)?.name;
    const unit=units.find(x=>x.id===row.unit_id)?.name;
    const service=services.find(x=>x.id===row.service_id)?.name;
    const department=departments.find(x=>x.id===row.department_id)?.name;
    const management=managements.find(x=>x.id===row.management_id)?.name;
    return [management,service,site,unit,department].filter(Boolean).join(" › ")||(assignment.scope_type==="warehouse"?"Magasin":"");
  }
  function setField(key:string,value:string){setForm(old=>({...old,[key]:value}));}
  async function createStructure(event:FormEvent){
    event.preventDefault();if(!supabase)return;
    const payload:any={company_id:companyId,code:form.code?.trim(),name:form.name?.trim()};
    if(kind==="unit"||kind==="department"||kind==="equipment") payload.site_id=form.site_id;
    if(kind==="service"){payload.management_id=form.management_id;payload.site_id=form.site_id||null;}
    if(kind==="site")payload.service_id=form.service_id||null;
    if(kind==="unit")payload.service_id=form.service_id||null;
    if(kind==="department")payload.unit_id=form.unit_id||null;
    if(kind==="equipment") payload.unit_id=form.unit_id||null;
    if(kind==="department"||kind==="equipment") payload.service_id=form.service_id||null;
    if(kind==="equipment"){payload.equipment_tag=form.equipment_tag?.trim();payload.manufacturer=form.manufacturer?.trim()||null;payload.model=form.model?.trim()||null;payload.serial_number=form.serial_number?.trim()||null;payload.location=form.location?.trim()||null;}
    if(kind==="site")payload.address=form.address?.trim()||null;
    if(kind==="management")payload.description=form.description?.trim()||null;
    if(kind==="service"&&!payload.management_id){onNotice("error","Sélectionnez un Management.");return;}
    if(kind!=="equipment" && !payload.code){onNotice("error","Le code est obligatoire.");return;}
    if(kind==="equipment"){delete payload.code;if(!payload.equipment_tag){onNotice("error","Le tag équipement est obligatoire.");return;}}
    setBusy(true);
    try{const result=editingId?await supabase.from(tables[kind]).update(payload).eq("id",editingId).eq("company_id",companyId):await supabase.from(tables[kind]).insert(payload);if(result.error)throw result.error;setForm({});setEditingId(null);setFormOpen(false);await refresh();onNotice("success",labels[kind]+(editingId?" modifié(e).":" ajouté(e)."));}
    catch(e:any){onNotice("error",e.message)}finally{setBusy(false)}
  }
  function startEdit(type:ScopeType,row:Row){setKind(type);setEditingId(row.id);setForm({code:row.code||"",name:row.name||"",description:row.description||"",address:row.address||"",management_id:row.management_id||"",site_id:row.site_id||"",unit_id:row.unit_id||"",service_id:row.service_id||"",department_id:row.department_id||"",equipment_tag:row.equipment_tag||"",manufacturer:row.manufacturer||"",model:row.model||"",serial_number:row.serial_number||"",location:row.location||""});setActiveTab("structure");setFormOpen(true);}
  async function deleteStructure(type:ScopeType,row:Row){if(!supabase||!window.confirm("Supprimer définitivement "+(row.name||row.code||row.equipment_tag||"cet élément")+" ? Les éléments liés peuvent empêcher la suppression."))return;const {error}=await supabase.from(tables[type]).delete().eq("id",row.id).eq("company_id",companyId);if(error){onNotice("error","Suppression impossible : "+error.message);return;}if(editingId===row.id){setEditingId(null);setForm({});}await refresh();onNotice("success",lang==="ar"?"تم حذف العنصر.":lang==="en"?"Item deleted.":"Élément supprimé.");}
  async function toggleActive(type:ScopeType,row:Row){
    if(!supabase)return;
    const {error}=await supabase.from(tables[type]).update(type==="equipment"?{status:row.is_active?"inactive":"active"}:{is_active:!row.is_active}).eq("id",row.id).eq("company_id",companyId);
    if(error){onNotice("error",error.message);return;}await refresh();onNotice("success",row.is_active?"Élément désactivé.":"Élément réactivé.");
  }
  async function appointDirector(event:FormEvent){
    event.preventDefault();if(!supabase||!managementUserId)return;
    setBusy(true);
    try{
      const {error}=await supabase.from("company_members").update({role:"director"}).eq("company_id",companyId).eq("user_id",managementUserId).neq("role","owner");
      if(error)throw error;
      setManagementUserId("");setManagementModalOpen(false);
      await onRefreshMembers?.();
      onNotice("success",t.directorAssigned);
    }catch(e:any){onNotice("error",e.message)}finally{setBusy(false)}
  }
  async function removeDirector(userId:string){
    if(!supabase||!window.confirm(t.removeDirector+" ?"))return;
    setBusy(true);
    try{
      const {error}=await supabase.from("company_members").update({role:"viewer"}).eq("company_id",companyId).eq("user_id",userId).eq("role","director");
      if(error)throw error;
      await onRefreshMembers?.();
      onNotice("success",t.directorRemoved);
    }catch(e:any){onNotice("error",e.message)}finally{setBusy(false)}
  }
  async function saveAssignment(event:FormEvent){
    event.preventDefault();if(!supabase)return;
    const scopeIds=[...new Set(selectedScopeIds.length?selectedScopeIds:(assignment.scope_id?[assignment.scope_id]:[]))];
    if(!assignment.user_id||!scopeIds.length){onNotice("error","Sélectionnez un utilisateur et au moins un périmètre.");return;}
    const hasAction=assignment.can_create||assignment.can_edit||assignment.can_delete||assignment.can_approve||assignment.can_issue||assignment.can_receive||assignment.can_transfer||assignment.can_inventory;
    if(hasAction&&!assignment.can_view){onNotice("error","La permission Consulter est obligatoire avec les autres permissions.");return;}
    setBusy(true);
    try{
      const rows=scopeIds.map(scope_id=>({company_id:companyId,user_id:assignment.user_id,job_title:assignment.job_title,scope_type:assignment.scope_type,scope_id,can_view:assignment.can_view,can_create:assignment.can_create,can_edit:assignment.can_edit,can_delete:assignment.can_delete,can_approve:assignment.can_approve,can_issue:assignment.can_issue,can_receive:assignment.can_receive,can_transfer:assignment.can_transfer,can_inventory:assignment.can_inventory}));
      const {error}=await supabase.from("user_scope_assignments").upsert(rows,{onConflict:"company_id,user_id,scope_type,scope_id"});if(error)throw error;
      await refresh();setSelectedScopeIds([]);setAssignment(old=>({...old,scope_id:""}));setAssignmentModalOpen(false);onNotice("success",`${scopeIds.length} ${t.multiScopeSaved}`);
    }catch(e:any){onNotice("error",e.message)}finally{setBusy(false)}
  }
  async function removeAssignment(id:string){
    if(!supabase||!window.confirm("Retirer cette affectation ?"))return;
    const {error}=await supabase.from("user_scope_assignments").delete().eq("id",id).eq("company_id",companyId);
    if(error){onNotice("error",error.message);return;}await refresh();onNotice("success",lang==="ar"?"تم حذف التعيين.":lang==="en"?"Assignment removed.":"Affectation retirée.");
  }
  function editAssignment(row:any){
    setAssignment({user_id:row.user_id,job_title:row.job_title||"",scope_type:row.scope_type as ScopeType,scope_id:row.scope_id,can_view:!!row.can_view,can_create:!!row.can_create,can_edit:!!row.can_edit,can_delete:!!row.can_delete,can_approve:!!row.can_approve,can_issue:!!row.can_issue,can_receive:!!row.can_receive,can_transfer:!!row.can_transfer,can_inventory:!!row.can_inventory});
    setSelectedScopeIds([row.scope_id]);
    setAssignmentSearch("");
    setActiveTab("assignments");
    setAssignmentModalOpen(true);
  }
  const tabs:[ScopeType,string][]=[["management","Management"],["service",lang==="ar"?"المصالح":lang==="en"?"Services":"Services"],["site",lang==="ar"?"المواقع":lang==="en"?"Sites":"Sites"],["unit",lang==="ar"?"الوحدات":lang==="en"?"Units":"Unités"],["department",lang==="ar"?"الأقسام":lang==="en"?"Departments":"Départements"],["equipment",lang==="ar"?"المعدات":lang==="en"?"Equipment":"Équipements"]];
  const parentOptions = kind==="unit"||kind==="department"||kind==="equipment";
  return <div className="ops-wrap" dir={lang==="ar"?"rtl":"ltr"}>
    <section className="panel">
      <div className="panel-head"><div><h3>{t.title}</h3><p>{t.intro}</p></div><div className="row-actions"><button className="secondary-btn" type="button" onClick={()=>void refresh()}><RefreshCw size={14}/> {t.refresh}</button><button className="primary-btn" type="button" onClick={()=>{setEditingId(null);setForm({});setFormOpen(true);}}><Plus size={15}/>{t.add} {scopeLabels[kind].toLowerCase()}</button></div></div>
      <div className="org-tabs">{tabs.map(([id,label])=><button type="button" key={id} className={kind===id?"active":""} onClick={()=>{setKind(id);setForm({});setEditingId(null)}}>{label} <span>{scopeRows[id].length}</span></button>)}</div>
      {formOpen&&<ModalPortal><div className="modal-backdrop org-form-backdrop"><form className="modal-card form-grid org-form" onSubmit={createStructure}><div className="modal-head span-2"><div><span className="eyebrow">{editingId?t.edit:t.add}</span><h3>{editingId?scopeLabels[kind]+" · "+t.edit:scopeLabels[kind]+" · "+t.add}</h3></div><button type="button" className="ops-icon-btn" onClick={()=>{setFormOpen(false);setEditingId(null);setForm({});}}><X size={16}/></button></div>
        <label>{kind==="equipment"?t.tag:t.code}<input value={kind==="equipment"?(form.equipment_tag||""):(form.code||"")} onChange={e=>setField(kind==="equipment"?"equipment_tag":"code",e.target.value)} required/></label>
        <label>{kind==="equipment"?t.designation:t.name}<input value={form.name||""} onChange={e=>setField("name",e.target.value)} required/></label>
        {kind==="service"&&<label>Management<select required value={form.management_id||""} onChange={e=>setField("management_id",e.target.value)}><option value="">Choisir un Management</option>{managements.filter(x=>x.is_active).map(x=><option key={x.id} value={x.id}>{x.code} · {x.name}</option>)}</select></label>}
        {kind==="site"&&<label>Service parent<select required value={form.service_id||""} onChange={e=>setField("service_id",e.target.value)}><option value="">Choisir un service</option>{services.filter(x=>x.is_active).map(x=><option key={x.id} value={x.id}>{x.code} · {x.name}</option>)}</select></label>}
        {parentOptions&&<label>{t.site}<select required value={form.site_id||""} onChange={e=>setField("site_id",e.target.value)}><option value="">{t.chooseSite}</option>{sites.filter(x=>x.is_active).map(x=><option key={x.id} value={x.id}>{x.code} · {x.name}</option>)}</select></label>}
        {kind==="management"&&<label>Description<input value={form.description||""} onChange={e=>setField("description",e.target.value)}/></label>}
        {kind==="equipment"&&<label>{t.unit}<select value={form.unit_id||""} onChange={e=>setField("unit_id",e.target.value)}><option value="">{t.noUnit}</option>{units.filter(x=>x.is_active&&(!form.site_id||x.site_id===form.site_id)).map(x=><option key={x.id} value={x.id}>{x.code} · {x.name}</option>)}</select></label>}
        {(kind==="unit"||kind==="department"||kind==="equipment")&&<label>{kind==="unit"?(lang==="ar"?"المصلحة المرتبطة":lang==="en"?"Assigned service":"Service affecté"):t.service}<select required={kind==="unit"||kind==="department"} value={form.service_id||""} onChange={e=>{setField("service_id",e.target.value);if(kind==="unit")setField("department_id","");}}><option value="">{t.noService}</option>{services.filter(x=>x.is_active&&(!form.site_id||x.site_id===form.site_id)).map(x=><option key={x.id} value={x.id}>{x.code} · {x.name}</option>)}</select></label>}
        {kind==="department"&&<label>{lang==="ar"?"الوحدة التابعة":lang==="en"?"Parent unit":"Unité de rattachement"}<select value={form.unit_id||""} onChange={e=>{const unit=units.find(x=>x.id===e.target.value);setForm(old=>({...old,unit_id:e.target.value,site_id:unit?.site_id||old.site_id,service_id:unit?.service_id||old.service_id}));}}><option value="">{lang==="ar"?"بدون وحدة":lang==="en"?"No unit":"Aucune unité"}</option>{units.filter(x=>x.is_active&&(!form.site_id||x.site_id===form.site_id)&&(!form.service_id||x.service_id===form.service_id)).map(x=><option key={x.id} value={x.id}>{x.code} · {x.name}</option>)}</select></label>}
        {kind==="site"&&<label>{t.address}<input value={form.address||""} onChange={e=>setField("address",e.target.value)}/></label>}
        {kind==="equipment"&&<><label>{t.manufacturer}<input value={form.manufacturer||""} onChange={e=>setField("manufacturer",e.target.value)}/></label><label>{t.model}<input value={form.model||""} onChange={e=>setField("model",e.target.value)}/></label><label>{t.serial}<input value={form.serial_number||""} onChange={e=>setField("serial_number",e.target.value)}/></label><label>{t.location}<input value={form.location||""} onChange={e=>setField("location",e.target.value)}/></label></>}
        <div className="span-2 modal-actions"><button className="primary-btn" disabled={busy}>{editingId?<Pencil size={15}/>:<Plus size={15}/>} {editingId?t.save:t.add+" "+scopeLabels[kind].toLowerCase()}</button>{editingId&&<button type="button" className="secondary-btn" onClick={()=>{setEditingId(null);setForm({});setFormOpen(false)}}>{t.cancel}</button>}</div>
      </form></div></ModalPortal>}
      <div className="table-wrap"><table><thead><tr><th>{t.codeTag}</th><th>{t.name}</th><th>{t.attachment}</th><th>{t.status}</th><th>{t.action}</th></tr></thead><tbody>{scopeRows[kind].map(row=><tr key={row.id}><td><b>{row.code||row.equipment_tag}</b></td><td>{row.name}</td><td>{kind==="management"?"Entreprise":kind==="service"?(managements.find(x=>x.id===row.management_id)?.name||"—"):kind==="site"?(services.find(x=>x.id===row.service_id)?.name||"—"):(sites.find(x=>x.id===row.site_id)?.name||"—")}{row.unit_id?" · "+(units.find(x=>x.id===row.unit_id)?.name||""):""}{kind==="unit"&&row.service_id?" · "+(services.find(x=>x.id===row.service_id)?.name||""):""}{kind==="unit"&&row.department_id?" · "+(departments.find(x=>x.id===row.department_id)?.name||""):""}</td><td><span className={"status-pill "+(row.is_active?"positive":"warning")}>{row.is_active?t.active:t.inactive}</span></td><td><div className="row-actions"><button className="ops-icon-btn" type="button" title={t.edit} onClick={()=>startEdit(kind,row)}><Pencil size={14}/></button><button className="ops-icon-btn danger-action" type="button" title={t.delete} onClick={()=>void deleteStructure(kind,row)}><X size={14}/></button><button className="secondary-btn" type="button" onClick={()=>void toggleActive(kind,row)}>{row.is_active?t.disable:t.enable}</button></div></td></tr>)}</tbody></table></div>
      {!scopeRows[kind].length&&<div className="empty-state compact"><div className="empty-icon"><Building2 size={22}/></div><b>{t.empty}</b><span>{t.emptyHint}</span></div>}
    </section>
    <section className="panel">
      <div className="panel-head"><div><h3><ShieldCheck size={17}/> {t.rights}</h3><p>{t.rightsIntro}</p></div></div>
      <div className="org-tabs"><button type="button" className={activeTab==="structure"?"active":""} onClick={()=>setActiveTab("structure")}>{t.structure}</button><button type="button" className={activeTab==="assignments"?"active":""} onClick={()=>setActiveTab("assignments")}>{t.assignments}</button></div>
      {activeTab==="assignments"&&<><section className="org-management-card"><div className="org-management-heading"><div className="org-management-icon"><ShieldCheck size={21}/></div><div><span className="org-management-kicker">EXECUTIVE ACCESS</span><h3>{t.management}</h3><p>{t.managementIntro}</p></div><span className="org-management-badge">{t.director}</span></div><div className="org-management-actions"><button type="button" className="primary-btn" onClick={()=>setManagementModalOpen(true)}><ShieldCheck size={15}/>{t.assignDirector}</button></div>{managementModalOpen&&<ModalPortal><div className="modal-backdrop org-form-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)setManagementModalOpen(false);}}><form className="modal-card org-management-modal" onSubmit={appointDirector}><div className="modal-head"><div><span className="eyebrow">EXECUTIVE ACCESS</span><h3>{t.assignDirector}</h3><p>{t.managementIntro}</p></div><button type="button" className="icon-btn" aria-label="Fermer" onClick={()=>setManagementModalOpen(false)} disabled={busy}><X size={18}/></button></div><div className="form-grid"><label>{t.user}<select required value={managementUserId} onChange={e=>setManagementUserId(e.target.value)}><option value="">{t.selectMember}</option>{members.filter(m=>m.is_active!==false&&m.user_id!==currentUserId&&m.role!=="owner"&&m.role!=="director").map(m=><option key={m.user_id} value={m.user_id}>{m.email||m.user_id} · {m.role||"membre"}</option>)}</select></label></div><div className="modal-actions"><button type="button" className="secondary-btn" onClick={()=>setManagementModalOpen(false)} disabled={busy}>{t.cancel}</button><button className="primary-btn" disabled={busy||!managementUserId}><ShieldCheck size={15}/>{t.assignDirector}</button></div></form></div></ModalPortal>}<div className="org-directors-list"><b>{t.currentDirectors}</b>{members.filter(m=>m.is_active!==false&&m.role==="director").length?members.filter(m=>m.is_active!==false&&m.role==="director").map(m=><div className="org-director-row" key={m.user_id}><span className="org-director-avatar"><ShieldCheck size={15}/></span><span>{m.email||m.user_id}<small>{t.director}</small></span><button type="button" className="secondary-btn" disabled={busy} onClick={()=>void removeDirector(m.user_id)}>{t.removeDirector}</button></div>):<p className="org-directors-empty">{t.noDirectors}</p>}</div></section><div className="org-assignment-toolbar"><div><b>{t.assignments}</b><p>{t.rightsIntro}</p></div><button type="button" className="primary-btn" onClick={()=>setAssignmentModalOpen(true)}><Plus size={15}/>{t.saveAssignment}</button></div>
      {assignmentModalOpen&&<ModalPortal><div className="modal-backdrop org-form-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)setAssignmentModalOpen(false);}}><form className="modal-card org-assignment-modal" onSubmit={saveAssignment}><div className="modal-head"><div><span className="eyebrow">ORGANISATION · ACCÈS</span><h3>{t.saveAssignment}</h3><p>{t.rightsIntro}</p></div><button type="button" className="icon-btn" aria-label="Fermer" onClick={()=>setAssignmentModalOpen(false)} disabled={busy}><X size={18}/></button></div><div className="form-grid org-form">
        <label>{t.user}<select required value={assignment.user_id} onChange={e=>setAssignment(old=>({...old,user_id:e.target.value}))}><option value="">{t.select}</option>{members.filter(m=>m.is_active!==false&&m.user_id!==currentUserId).map(m=><option key={m.user_id} value={m.user_id}>{m.email||m.user_id} · {m.role||"membre"}</option>)}</select></label>
        <label>{t.job}<input value={assignment.job_title} onChange={e=>setAssignment(old=>({...old,job_title:e.target.value}))} placeholder={t.jobHint}/></label>
        <label>{t.scopeType}<select value={assignment.scope_type} onChange={e=>{setSelectedScopeIds([]);setAssignmentSearch("");setAssignment(old=>({...old,scope_type:e.target.value as ScopeType,scope_id:""}));}}><optgroup label={lang==="ar"?"الهيكل التنظيمي":lang==="en"?"Organization":"Structure organisation"}><option value="service">{scopeLabels.service}</option><option value="site">{scopeLabels.site}</option><option value="unit">{scopeLabels.unit}</option><option value="department">{scopeLabels.department}</option></optgroup><optgroup label={lang==="ar"?"الموارد":lang==="en"?"Resources":"Ressources"}><option value="warehouse">{scopeLabels.warehouse}</option><option value="equipment">{scopeLabels.equipment}</option></optgroup></select></label>
        <div className="org-multi-scope-field"><div className="org-scope-picker-head"><label>{t.scope}</label><span>{selectedScopeIds.length} sélectionné(s)</span></div><input className="org-scope-search" value={assignmentSearch} onChange={e=>setAssignmentSearch(e.target.value)} placeholder={lang==="ar"?"ابحث في النطاقات...":lang==="en"?"Search scopes...":"Rechercher un site, une unité, un service..."} /><div className="org-scope-picker-list">{filteredScopeOptions.filter(x=>x.is_active!==false).map(x=><label className="org-scope-choice" key={x.id}><input type="checkbox" checked={selectedScopeIds.includes(x.id)} onChange={e=>{const ids=e.target.checked?[...selectedScopeIds,x.id]:selectedScopeIds.filter(id=>id!==x.id);setSelectedScopeIds(ids);setAssignment(old=>({...old,scope_id:ids[0]||""}));}}/><span><b>{x.code||x.equipment_tag||"—"} · {x.name}</b><small>{scopeContext(x)}</small></span></label>)}{!filteredScopeOptions.length&&<small className="org-scope-empty">Aucun élément correspondant.</small>}</div><small>{lang==="ar"?"يمكن اختيار عدة عناصر دون استعمال Ctrl.":lang==="en"?"Select multiple items directly; no Ctrl key needed.":"Cochez un ou plusieurs éléments directement, sans utiliser Ctrl/Cmd."}</small></div>
        <div className="span-2 org-permissions">{(["can_view","can_create","can_edit","can_delete","can_approve","can_issue","can_receive","can_transfer","can_inventory"] as const).map((key)=><label key={key}><input type="checkbox" checked={assignment[key]} onChange={e=>setAssignment(old=>key==="can_view"&&!e.target.checked?({...old,can_view:false,can_create:false,can_edit:false,can_delete:false,can_approve:false,can_issue:false,can_receive:false,can_transfer:false,can_inventory:false}):({...old,[key]:e.target.checked,...(e.target.checked?{can_view:true}:{})}))}/><span>{{can_view:"Consulter",can_create:t.create,can_edit:t.update,can_delete:t.delete,can_approve:t.approve,can_issue:t.issue,can_receive:t.receive,can_transfer:t.transfer,can_inventory:t.inventory}[key]}</span></label>)}</div></div>
        <div className="modal-actions"><button type="button" className="secondary-btn" onClick={()=>setAssignmentModalOpen(false)} disabled={busy}>{t.cancel}</button><button className="primary-btn" disabled={busy}><Check size={15}/> Enregistrer l'affectation</button></div>
      </form></div></ModalPortal>}
      <div className="table-wrap"><table><thead><tr><th>{t.user}</th><th>{t.job}</th><th>{t.scope}</th><th>{t.rightsCount}</th><th></th></tr></thead><tbody>{assignments.map(a=>{const row=(scopeRows as any)[a.scope_type]?.find((x:Row)=>x.id===a.scope_id);const member=members.find(m=>m.user_id===a.user_id);const rights=["can_view","can_create","can_edit","can_delete","can_approve","can_issue","can_receive","can_transfer","can_inventory"].filter(k=>a[k]).length;return <tr key={a.id}><td>{member?.email||a.user_id}</td><td>{a.job_title||"—"}</td><td>{scopeLabels[a.scope_type as ScopeType]} · {row?.name||"Élément indisponible"}</td><td>{rights}/9</td><td><div className="row-actions"><button className="ops-icon-btn" type="button" title={t.edit} onClick={()=>editAssignment(a)}><Pencil size={14}/></button><button className="ops-icon-btn danger-action" type="button" title={t.remove} onClick={()=>void removeAssignment(a.id)}><X size={14}/></button></div></td></tr>})}</tbody></table></div></>}
    </section>
  </div>;
}
