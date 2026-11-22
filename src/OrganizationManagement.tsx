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
 fr:{management:"Management / Direction générale",managementIntro:"Affectation hiérarchique au niveau de toute l’entreprise : accès transversal aux modules, sites, unités, services, départements et données.",director:"Directeur",assignDirector:"Nommer Directeur",currentDirectors:"Membres du Management",noDirectors:"Aucun directeur n’est encore affecté.",removeDirector:"Retirer du Management",selectMember:"Sélectionner un collaborateur",directorAssigned:"Accès Management accordé. Actualisez la session du collaborateur pour appliquer ses droits.",directorRemoved:"Accès Management retiré. Le rôle du collaborateur est repassé à Lecteur.",title:"Organisation de l'entreprise",intro:"Configurez les sites, unités, services, départements, équipements et magasins.",refresh:"Actualiser",code:"Code",tag:"Tag équipement",name:"Nom",designation:"Désignation",site:"Site",chooseSite:"Choisir un site",unit:"Unité (facultatif)",noUnit:"Aucune unité",service:"Service (facultatif)",noService:"Aucun service",address:"Adresse",manufacturer:"Fabricant",model:"Modèle",serial:"N° série",location:"Emplacement",save:"Enregistrer les modifications",add:"Ajouter",cancel:"Annuler",codeTag:"Code / Tag",attachment:"Rattachement",status:"Statut",action:"Action",active:"Actif",inactive:"Inactif",edit:"Modifier",disable:"Désactiver",enable:"Réactiver",empty:"Aucun élément enregistré",emptyHint:"Ajoutez le premier élément avec le formulaire ci-dessus.",rights:"Périmètres & autorisations",rightsIntro:"Définissez les périmètres de données et les opérations autorisées. Les accès aux modules et leurs actions se règlent dans Utilisateurs > Matrice des permissions.",multiScopeHint:"Cochez directement un ou plusieurs périmètres. Les droits par module se règlent dans Utilisateurs.",multiScopeSaved:"affectation(s) enregistrée(s).",structure:"Structure",assignments:"Affectations",user:"Utilisateur",select:"Sélectionner",job:"Fonction / Poste",jobHint:"Manager, Responsable, Superviseur...",scopeType:"Type de périmètre",scope:"Périmètre",rightsCount:"Droits",remove:"Retirer",unavailable:"Élément indisponible",saveAssignment:"Enregistrer l'affectation",view:"Consulter",create:"Créer",update:"Modifier",delete:"Supprimer",approve:"Approuver",issue:"Délivrer",receive:"Réceptionner",transfer:"Transférer",inventory:"Inventorier"},
 en:{management:"Management / Executive direction",managementIntro:"Company-wide hierarchical assignment with cross-department access to all modules, sites, units, services, departments and records.",director:"Director",assignDirector:"Appoint director",currentDirectors:"Management members",noDirectors:"No director has been assigned yet.",removeDirector:"Remove from Management",selectMember:"Select a team member",directorAssigned:"Management access granted. The member should refresh their session to apply permissions.",directorRemoved:"Management access removed. The member role has been reset to Viewer.",title:"Company organization",intro:"Configure sites, units, services, departments, equipment and warehouses.",refresh:"Refresh",code:"Code",tag:"Equipment tag",name:"Name",designation:"Description",site:"Site",chooseSite:"Select a site",unit:"Unit (optional)",noUnit:"No unit",service:"Service (optional)",noService:"No service",address:"Address",manufacturer:"Manufacturer",model:"Model",serial:"Serial no.",location:"Location",save:"Save changes",add:"Add",cancel:"Cancel",codeTag:"Code / Tag",attachment:"Assignment",status:"Status",action:"Action",active:"Active",inactive:"Inactive",edit:"Edit",disable:"Deactivate",enable:"Reactivate",empty:"No records yet",emptyHint:"Add the first item using the form above.",rights:"Scopes & permissions",rightsIntro:"Define the data scope and allowed operations here. Module access and module actions are configured in Users > Permission matrix.",multiScopeHint:"Select one or more units (Ctrl/Cmd + click for multiple selections).",multiScopeSaved:"assignment(s) saved.",structure:"Structure",assignments:"Assignments",user:"User",select:"Select",job:"Job title / Role",jobHint:"Manager, Responsible, Supervisor...",scopeType:"Scope type",scope:"Scope",rightsCount:"Rights",remove:"Remove",unavailable:"Unavailable item",saveAssignment:"Save assignment",view:"View",create:"Create",update:"Edit",delete:"Delete",approve:"Approve",issue:"Issue",receive:"Receive",transfer:"Transfer",inventory:"Inventory"},
 ar:{management:"الإدارة العليا / الإدارة العامة",managementIntro:"تعيين هرمي على مستوى الشركة كاملة، مع صلاحية الاطلاع على جميع الوحدات والمواقع والمصالح والأقسام والبيانات.",director:"مدير عام",assignDirector:"تعيين مدير عام",currentDirectors:"أعضاء الإدارة العليا",noDirectors:"لم يتم تعيين مدير بعد.",removeDirector:"إزالة من الإدارة العليا",selectMember:"اختر موظفاً",directorAssigned:"تم منح صلاحية الإدارة العليا. يجب على المستخدم تحديث الجلسة لتطبيق الصلاحيات.",directorRemoved:"تمت إزالة صلاحية الإدارة العليا وإرجاع دور المستخدم إلى قارئ.",title:"الهيكل التنظيمي للشركة",intro:"إعداد المواقع والوحدات والمصالح والأقسام والمعدات والمخازن.",refresh:"تحديث",code:"الرمز",tag:"رمز المعدة",name:"الاسم",designation:"التسمية",site:"الموقع",chooseSite:"اختر موقعاً",unit:"الوحدة (اختياري)",noUnit:"بدون وحدة",service:"المصلحة (اختياري)",noService:"بدون مصلحة",address:"العنوان",manufacturer:"الشركة المصنعة",model:"الطراز",serial:"الرقم التسلسلي",location:"الموقع",save:"حفظ التعديلات",add:"إضافة",cancel:"إلغاء",codeTag:"الرمز / الوسم",attachment:"الارتباط",status:"الحالة",action:"الإجراء",active:"نشط",inactive:"غير نشط",edit:"تعديل",disable:"تعطيل",enable:"إعادة تفعيل",empty:"لا توجد عناصر مسجلة",emptyHint:"أضف أول عنصر باستعمال النموذج أعلاه.",rights:"النطاقات والصلاحيات",rightsIntro:"حدد نطاق البيانات والعمليات المسموح بها هنا. يتم ضبط الوصول إلى الوحدات وإجراءاتها من المستخدمين > مصفوفة الصلاحيات.",multiScopeHint:"يمكنك اختيار وحدة واحدة أو عدة وحدات معاً.",multiScopeSaved:" تعيينات تم حفظها.",structure:"الهيكل",assignments:"التعيينات",user:"المستخدم",select:"اختر",job:"الوظيفة / المنصب",jobHint:"مدير، مسؤول، مشرف...",scopeType:"نوع النطاق",scope:"النطاق",rightsCount:"الصلاحيات",remove:"إزالة",unavailable:"عنصر غير متاح",saveAssignment:"حفظ التعيين",view:"عرض",create:"إنشاء",update:"تعديل",delete:"حذف",approve:"موافقة",issue:"صرف",receive:"استلام",transfer:"تحويل",inventory:"جرد"}
};


export default function OrganizationManagement({ companyId, members, currentUserId, onNotice, lang="fr" }: { companyId:string; members:Member[]; currentUserId:string; onNotice:(type:"success"|"error",message:string)=>void; lang?:"fr"|"en"|"ar" }) {
  const t=words[lang];
  const scopeLabels:Record<ScopeType,string>={management:"Management",site:lang==="ar"?"الموقع":lang==="en"?"Site":"Site",unit:lang==="ar"?"الوحدة":lang==="en"?"Unit":"Unité",service:lang==="ar"?"المصلحة":"Service",department:lang==="ar"?"القسم":lang==="en"?"Department":"Département",equipment:lang==="ar"?"المعدة":lang==="en"?"Equipment":"Équipement",warehouse:lang==="ar"?"المخزن":lang==="en"?"Warehouse":"Entrepôt"};
  const [activeTab,setActiveTab] = useState<"structure"|"assignments"|"projects">("structure");
  const [kind,setKind] = useState<ScopeType>("site");
  const [managements,setManagements] = useState<Row[]>([]);
  const [sites,setSites] = useState<Row[]>([]);
  const [units,setUnits] = useState<Row[]>([]);
  const [services,setServices] = useState<Row[]>([]);
  const [departments,setDepartments] = useState<Row[]>([]);
  const [equipment,setEquipment] = useState<Row[]>([]);
  const [warehouses,setWarehouses] = useState<Row[]>([]);
  const [projects,setProjects] = useState<Row[]>([]);
  const [projectTeamRows,setProjectTeamRows] = useState<any[]>([]);
  const [projectId,setProjectId] = useState("");
  const [projectManagerId,setProjectManagerId] = useState("");
  const [projectResponsibleId,setProjectResponsibleId] = useState("");
  const [projectTeamIds,setProjectTeamIds] = useState<string[]>([]);
  const [assignments,setAssignments] = useState<any[]>([]);
  const [form,setForm] = useState<Record<string,string>>({});
  const [editingId,setEditingId] = useState<string|null>(null);
  const [assignment,setAssignment] = useState({user_id:"",job_title:"",scope_type:"unit" as ScopeType,scope_id:"",can_view:true,can_create:false,can_edit:false,can_delete:false,can_approve:false,can_issue:false,can_receive:false,can_transfer:false,can_inventory:false});
  const [selectedScopeIds,setSelectedScopeIds] = useState<string[]>([]);
  const [selectedChildIds,setSelectedChildIds] = useState<string[]>([]);
  const [selectedManagementIds,setSelectedManagementIds] = useState<string[]>([]);
  const [selectedManagementSiteIds,setSelectedManagementSiteIds] = useState<string[]>([]);
  const [selectedManagementServiceIds,setSelectedManagementServiceIds] = useState<string[]>([]);
  const [editingManagementAssignmentIds,setEditingManagementAssignmentIds] = useState<string[]>([]);
  const [assignmentSearch,setAssignmentSearch]=useState("");
  const [busy,setBusy] = useState(false);
  const [formOpen,setFormOpen]=useState(false);
  const [assignmentModalOpen,setAssignmentModalOpen]=useState(false);
  const refresh = useCallback(async () => {
    if(!supabase) return;
    const [a,b,c,d,e,f,g,h,p,pt] = await Promise.all([
      supabase.from("org_managements").select("*").eq("company_id",companyId).order("name"),
      supabase.from("org_sites").select("*").eq("company_id",companyId).order("name"),
      supabase.from("org_units").select("*").eq("company_id",companyId).order("name"),
      supabase.from("org_services").select("*").eq("company_id",companyId).order("name"),
      supabase.from("org_departments").select("*").eq("company_id",companyId).order("name"),
      supabase.from("org_equipment").select("*").eq("company_id",companyId).order("name"),
      supabase.from("user_scope_assignments").select("*").eq("company_id",companyId).order("created_at",{ascending:false}),
      supabase.from("warehouses").select("id,code,name,is_active").eq("company_id",companyId).order("name"),
      supabase.from("projects").select("id,project_code,name,project_manager_id,responsible_user_id").eq("company_id",companyId).order("name"),
      supabase.from("project_team_members").select("*").eq("company_id",companyId)
    ]);
    const error=[a,b,c,d,e,f,g,h,p,pt].find(x=>x.error)?.error;
    if(error) throw error;
    setManagements(a.data??[]);setSites(b.data??[]);setUnits(c.data??[]);setServices(d.data??[]);setDepartments(e.data??[]);setEquipment((f.data??[]).map(x=>({...x,is_active:x.status==="active"})));setAssignments(g.data??[]);setWarehouses(h.data??[]);setProjects(p.data??[]);setProjectTeamRows(pt.data??[]);
  },[companyId]);
  useEffect(()=>{void refresh().catch(e=>onNotice("error",e.message));},[refresh]);

  const scopeRows = useMemo(()=>({management:managements,site:sites,unit:units,service:services,department:departments,equipment,warehouse:warehouses}),[managements,sites,units,services,departments,equipment,warehouses]);
  const availableScopes = scopeRows[assignment.scope_type] ?? [];
  const filteredScopeOptions=availableScopes.filter((x:Row)=>[x.code,x.name,x.equipment_tag].filter(Boolean).join(" ").toLowerCase().includes(assignmentSearch.toLowerCase()));
  function scopeContext(row:Row){
    const unit=units.find(x=>x.id===row.unit_id);
    const department=departments.find(x=>x.id===(row.department_id||unit?.department_id));
    const service=services.find(x=>x.id===(row.service_id||department?.service_id));
    const site=sites.find(x=>x.id===(row.site_id||service?.site_id));
    const management=managements.find(x=>x.id===(row.management_id||site?.management_id));
    return [management?.name,site?.name,service?.name,department?.name,unit?.name].filter(Boolean).join(" › ")||(assignment.scope_type==="warehouse"?"Magasin":"");
  }
  function setField(key:string,value:string){setForm(old=>({...old,[key]:value}));}
  async function createStructure(event:FormEvent){
    event.preventDefault();if(!supabase)return;
    const payload:any={company_id:companyId,code:form.code?.trim(),name:form.name?.trim()};
    if(kind==="unit"||kind==="department"||kind==="equipment") payload.site_id=form.site_id;
    if(kind==="service") payload.site_id=form.site_id||null;
    if(kind==="equipment") payload.unit_id=form.unit_id||null;
    if(kind==="department") payload.service_id=null;
    if(kind==="unit") payload.service_id=null;
    if(kind==="equipment"){payload.equipment_tag=form.equipment_tag?.trim();payload.manufacturer=form.manufacturer?.trim()||null;payload.model=form.model?.trim()||null;payload.serial_number=form.serial_number?.trim()||null;payload.location=form.location?.trim()||null;}
    if(kind==="site")payload.address=form.address?.trim()||null;
    if(kind==="management")payload.description=form.description?.trim()||null;
    if(kind!=="equipment" && !payload.code){onNotice("error","Le code est obligatoire.");return;}
    if(kind==="equipment"){delete payload.code;if(!payload.equipment_tag){onNotice("error","Le tag équipement est obligatoire.");return;}}
    setBusy(true);
    try{
      const result=editingId?await supabase.from(tables[kind]).update(payload).eq("id",editingId).eq("company_id",companyId).select("id").single():await supabase.from(tables[kind]).insert(payload).select("id").single();
      if(result.error)throw result.error;
      const parentId=result.data.id;
      const relationConfig:any={management:{table:"org_sites",column:"management_id"},site:{table:"org_services",column:"site_id"},service:{table:"org_departments",column:"service_id"},department:{table:"org_units",column:"department_id"}};
      const relation=relationConfig[kind];
      const db:any=supabase;
      if(relation){
        const clear=await db.from(relation.table).update({[relation.column]:null}).eq("company_id",companyId).eq(relation.column,parentId);
        if(clear.error)throw clear.error;
        if(selectedChildIds.length){
          const attach=await db.from(relation.table).update({[relation.column]:parentId}).eq("company_id",companyId).in("id",selectedChildIds);
          if(attach.error)throw attach.error;
          if(kind==="site"){
            const childDepartments=await supabase.from("org_departments").select("id").eq("company_id",companyId).in("service_id",selectedChildIds);
            if(childDepartments.error)throw childDepartments.error;
            if(childDepartments.data?.length){
              const syncDepartments=await supabase.from("org_departments").update({site_id:parentId}).eq("company_id",companyId).in("id",childDepartments.data.map(x=>x.id));
              if(syncDepartments.error)throw syncDepartments.error;
              const syncUnits=await supabase.from("org_units").update({site_id:parentId}).eq("company_id",companyId).in("department_id",childDepartments.data.map(x=>x.id));
              if(syncUnits.error)throw syncUnits.error;
            }
          }
          if(kind==="service"){
            const service=services.find(x=>x.id===parentId);
            if(service?.site_id){
              const syncDepartments=await supabase.from("org_departments").update({site_id:service.site_id}).eq("company_id",companyId).in("id",selectedChildIds);
              if(syncDepartments.error)throw syncDepartments.error;
              const syncUnits=await supabase.from("org_units").update({site_id:service.site_id}).eq("company_id",companyId).in("department_id",selectedChildIds);
              if(syncUnits.error)throw syncUnits.error;
            }
          }
          if(kind==="department"){
            const department=departments.find(x=>x.id===parentId);
            const siteId=department?.site_id||form.site_id;
            if(siteId){
              const syncUnits=await supabase.from("org_units").update({site_id:siteId}).eq("company_id",companyId).in("id",selectedChildIds);
              if(syncUnits.error)throw syncUnits.error;
            }
          }
        }
      }
      setForm({});setEditingId(null);setFormOpen(false);setSelectedChildIds([]);await refresh();onNotice("success",labels[kind]+(editingId?" modifié(e).":" ajouté(e)."));
    }
    catch(e:any){onNotice("error",e.message)}finally{setBusy(false)}
  }
  function startEdit(type:ScopeType,row:Row){
    setKind(type);setEditingId(row.id);
    setForm({code:row.code||"",name:row.name||"",description:row.description||"",address:row.address||"",site_id:row.site_id||"",unit_id:row.unit_id||"",service_id:row.service_id||"",department_id:row.department_id||"",equipment_tag:row.equipment_tag||"",manufacturer:row.manufacturer||"",model:row.model||"",serial_number:row.serial_number||"",location:row.location||""});
    const childRows:any={management:sites.filter(x=>x.management_id===row.id),site:services.filter(x=>x.site_id===row.id),service:departments.filter(x=>x.service_id===row.id),department:units.filter(x=>x.department_id===row.id)};
    setSelectedChildIds((childRows[type]||[]).map((x:Row)=>x.id));
    setActiveTab("structure");setFormOpen(true);
  }
  async function deleteStructure(type:ScopeType,row:Row){if(!supabase||!window.confirm("Supprimer définitivement "+(row.name||row.code||row.equipment_tag||"cet élément")+" ? Les éléments liés peuvent empêcher la suppression."))return;const {error}=await supabase.from(tables[type]).delete().eq("id",row.id).eq("company_id",companyId);if(error){onNotice("error","Suppression impossible : "+error.message);return;}if(editingId===row.id){setEditingId(null);setForm({});}await refresh();onNotice("success",lang==="ar"?"تم حذف العنصر.":lang==="en"?"Item deleted.":"Élément supprimé.");}
  async function toggleActive(type:ScopeType,row:Row){
    if(!supabase)return;
    const {error}=await supabase.from(tables[type]).update(type==="equipment"?{status:row.is_active?"inactive":"active"}:{is_active:!row.is_active}).eq("id",row.id).eq("company_id",companyId);
    if(error){onNotice("error",error.message);return;}await refresh();onNotice("success",row.is_active?"Élément désactivé.":"Élément réactivé.");
  }
  async function saveAssignment(event:FormEvent){
    event.preventDefault();if(!supabase)return;
    const managementMode=assignment.scope_type==="management";
    const scopeRowsToSave=managementMode
      ? [
          ...selectedManagementSiteIds.map(scope_id=>({scope_type:"site",scope_id})),
          ...selectedManagementServiceIds.map(scope_id=>({scope_type:"service",scope_id}))
        ]
      : [...new Set(selectedScopeIds.length?selectedScopeIds:(assignment.scope_id?[assignment.scope_id]:[]))]
          .map(scope_id=>({scope_type:assignment.scope_type,scope_id}));
    if(!assignment.user_id||!scopeRowsToSave.length||(managementMode&&!selectedManagementIds.length)){onNotice("error","Sélectionnez un utilisateur, un Management et au moins un site ou service.");return;}
    const hasAction=assignment.can_create||assignment.can_edit||assignment.can_delete||assignment.can_approve||assignment.can_issue||assignment.can_receive||assignment.can_transfer||assignment.can_inventory;
    if(hasAction&&!assignment.can_view){onNotice("error","La permission Consulter est obligatoire avec les autres permissions.");return;}
    setBusy(true);
    try{
      const rows=scopeRowsToSave.map(scope=>({company_id:companyId,user_id:assignment.user_id,job_title:assignment.job_title,scope_type:scope.scope_type,scope_id:scope.scope_id,can_view:assignment.can_view,can_create:assignment.can_create,can_edit:assignment.can_edit,can_delete:assignment.can_delete,can_approve:assignment.can_approve,can_issue:assignment.can_issue,can_receive:assignment.can_receive,can_transfer:assignment.can_transfer,can_inventory:assignment.can_inventory}));
      const {error}=await supabase.from("user_scope_assignments").upsert(rows,{onConflict:"company_id,user_id,scope_type,scope_id"});if(error)throw error;
      if(managementMode&&editingManagementAssignmentIds.length){
        const keep=new Set(scopeRowsToSave.map(x=>x.scope_type+":"+x.scope_id));
        const removed=assignments.filter(a=>editingManagementAssignmentIds.includes(a.id)&&!keep.has(a.scope_type+":"+a.scope_id)).map(a=>a.id);
        if(removed.length){
          const deletion=await supabase.from("user_scope_assignments").delete().eq("company_id",companyId).in("id",removed);
          if(deletion.error)throw deletion.error;
        }
      }
      await refresh();setSelectedScopeIds([]);setSelectedManagementSiteIds([]);setSelectedManagementServiceIds([]);setSelectedManagementIds([]);setEditingManagementAssignmentIds([]);setAssignment(old=>({...old,scope_id:""}));setAssignmentModalOpen(false);onNotice("success",`${rows.length} ${t.multiScopeSaved}`);
    }catch(e:any){onNotice("error",e.message)}finally{setBusy(false)}
  }
  async function removeAssignment(id:string){
    if(!supabase||!window.confirm("Retirer cette affectation ?"))return;
    const {error}=await supabase.from("user_scope_assignments").delete().eq("id",id).eq("company_id",companyId);
    if(error){onNotice("error",error.message);return;}await refresh();onNotice("success",lang==="ar"?"تم حذف التعيين.":lang==="en"?"Assignment removed.":"Affectation retirée.");
  }
  function editAssignment(row:any){
    const sameRights=(a:any)=>a.user_id===row.user_id&&a.job_title===row.job_title&&
      ["can_view","can_create","can_edit","can_delete","can_approve","can_issue","can_receive","can_transfer","can_inventory"].every(k=>!!a[k]===!!row[k]);
    const managementFor=(a:any)=>{
      if(a.scope_type==="site")return sites.find(x=>x.id===a.scope_id)?.management_id||"";
      if(a.scope_type==="service"){
        const service=services.find(x=>x.id===a.scope_id);
        return sites.find(x=>x.id===service?.site_id)?.management_id||"";
      }
      return "";
    };
    const managementId=managementFor(row);
    if(managementId){
      const group=assignments.filter(a=>sameRights(a)&&["site","service"].includes(a.scope_type)&&!!managementFor(a));
      setAssignment({user_id:row.user_id,job_title:row.job_title||"",scope_type:"management",scope_id:"",can_view:!!row.can_view,can_create:!!row.can_create,can_edit:!!row.can_edit,can_delete:!!row.can_delete,can_approve:!!row.can_approve,can_issue:!!row.can_issue,can_receive:!!row.can_receive,can_transfer:!!row.can_transfer,can_inventory:!!row.can_inventory});
      setSelectedManagementIds([...new Set(group.map(managementFor))]);
      setSelectedManagementSiteIds(group.filter(a=>a.scope_type==="site").map(a=>a.scope_id));
      setSelectedManagementServiceIds(group.filter(a=>a.scope_type==="service").map(a=>a.scope_id));
      setEditingManagementAssignmentIds(group.map(a=>a.id));
      setSelectedScopeIds([]);
    }else{
      setAssignment({user_id:row.user_id,job_title:row.job_title||"",scope_type:row.scope_type as ScopeType,scope_id:row.scope_id,can_view:!!row.can_view,can_create:!!row.can_create,can_edit:!!row.can_edit,can_delete:!!row.can_delete,can_approve:!!row.can_approve,can_issue:!!row.can_issue,can_receive:!!row.can_receive,can_transfer:!!row.can_transfer,can_inventory:!!row.can_inventory});
      setSelectedScopeIds([row.scope_id]);
      setSelectedManagementIds([]);setSelectedManagementSiteIds([]);setSelectedManagementServiceIds([]);setEditingManagementAssignmentIds([]);
    }
    setAssignmentSearch("");
    setActiveTab("assignments");
    setAssignmentModalOpen(true);
  }
  async function saveProjectTeam(){
    if(!supabase||!projectId){onNotice("error","Sélectionnez un projet.");return;}
    setBusy(true);
    try{
      const update=await supabase.from("projects").update({project_manager_id:projectManagerId||null,responsible_user_id:projectResponsibleId||null}).eq("company_id",companyId).eq("id",projectId);
      if(update.error)throw update.error;
      const remove=await supabase.from("project_team_members").delete().eq("company_id",companyId).eq("project_id",projectId);
      if(remove.error)throw remove.error;
      const rows=[
        ...(projectManagerId?[{company_id:companyId,project_id:projectId,user_id:projectManagerId,assignment_role:"project_manager",assigned_by:currentUserId}]:[]),
        ...(projectResponsibleId?[{company_id:companyId,project_id:projectId,user_id:projectResponsibleId,assignment_role:"responsible",assigned_by:currentUserId}]:[]),
        ...projectTeamIds.filter(id=>id!==projectManagerId&&id!==projectResponsibleId).map(user_id=>({company_id:companyId,project_id:projectId,user_id,assignment_role:"team_member",assigned_by:currentUserId}))
      ];
      if(rows.length){const insert=await supabase.from("project_team_members").insert(rows);if(insert.error)throw insert.error;}
      await refresh();onNotice("success","Affectation du projet enregistrée.");
    }catch(e:any){onNotice("error",e.message)}finally{setBusy(false)}
  }
  function selectProject(id:string){
    setProjectId(id);
    const p=projects.find(x=>x.id===id);
    setProjectManagerId(p?.project_manager_id||"");
    setProjectResponsibleId(p?.responsible_user_id||"");
    setProjectTeamIds(projectTeamRows.filter(x=>x.project_id===id&&x.assignment_role==="team_member").map(x=>x.user_id));
  }
  const tabs:[ScopeType,string][]=[["management","Management"],["site",lang==="ar"?"المواقع":lang==="en"?"Sites":"Sites"],["service",lang==="ar"?"المصالح":lang==="en"?"Services":"Services"],["department",lang==="ar"?"الأقسام":lang==="en"?"Departments":"Départements"],["unit",lang==="ar"?"الوحدات":lang==="en"?"Units":"Unités"],["equipment",lang==="ar"?"المعدات":lang==="en"?"Equipment":"Équipements"]];
  const parentOptions = kind==="equipment"||kind==="unit"||kind==="department";
  const childType=kind==="management"?"site":kind==="site"?"service":kind==="service"?"department":kind==="department"?"unit":null;
  const childOptions:Row[]=childType==="site"?sites:childType==="service"?services:childType==="department"?departments.filter(x=>!form.site_id||x.site_id===form.site_id):childType==="unit"?units.filter(x=>!form.site_id||x.site_id===form.site_id):[];
  const childTitle=childType==="site"?"Sites à rattacher":childType==="service"?"Services à rattacher":childType==="department"?"Départements à rattacher":"Unités à rattacher";
  return <div className="ops-wrap" dir={lang==="ar"?"rtl":"ltr"}>
    <section className="panel">
      <div className="panel-head"><div><h3>{t.title}</h3><p>{t.intro}</p></div><div className="row-actions"><button className="secondary-btn" type="button" onClick={()=>void refresh()}><RefreshCw size={14}/> {t.refresh}</button><button className="primary-btn" type="button" onClick={()=>{setEditingId(null);setForm({});setSelectedChildIds([]);setFormOpen(true);}}><Plus size={15}/>{t.add} {scopeLabels[kind].toLowerCase()}</button></div></div>
      <div className="org-tabs">{tabs.map(([id,label])=><button type="button" key={id} className={kind===id?"active":""} onClick={()=>{setKind(id);setForm({});setEditingId(null);setSelectedChildIds([])}}>{label} <span>{scopeRows[id].length}</span></button>)}</div>
      {formOpen&&<ModalPortal><div className="modal-backdrop org-form-backdrop"><form className="modal-card form-grid org-form" onSubmit={createStructure}><div className="modal-head span-2"><div><span className="eyebrow">{editingId?t.edit:t.add}</span><h3>{editingId?scopeLabels[kind]+" · "+t.edit:scopeLabels[kind]+" · "+t.add}</h3></div><button type="button" className="ops-icon-btn" onClick={()=>{setFormOpen(false);setEditingId(null);setForm({});setSelectedChildIds([]);}}><X size={16}/></button></div>
        <label>{kind==="equipment"?t.tag:t.code}<input value={kind==="equipment"?(form.equipment_tag||""):(form.code||"")} onChange={e=>setField(kind==="equipment"?"equipment_tag":"code",e.target.value)} required/></label>
        <label>{kind==="equipment"?t.designation:t.name}<input value={form.name||""} onChange={e=>setField("name",e.target.value)} required/></label>
        {parentOptions&&<label>{t.site}<select required value={form.site_id||""} onChange={e=>setField("site_id",e.target.value)}><option value="">{t.chooseSite}</option>{sites.filter(x=>x.is_active).map(x=><option key={x.id} value={x.id}>{x.code} · {x.name}</option>)}</select></label>}
        {kind==="management"&&<label>Description<input value={form.description||""} onChange={e=>setField("description",e.target.value)}/></label>}
        {childType&&<div className="span-2 org-multi-scope-field"><div className="org-scope-picker-head"><label>{childTitle}</label><span>{selectedChildIds.length} sélectionné(s)</span></div><div className="org-scope-picker-list">{childOptions.filter(x=>x.is_active!==false).map(x=><label className="org-scope-choice" key={x.id}><input type="checkbox" checked={selectedChildIds.includes(x.id)} onChange={e=>setSelectedChildIds(old=>e.target.checked?[...old,x.id]:old.filter(id=>id!==x.id))}/><span><b>{x.code||x.equipment_tag||"—"} · {x.name}</b></span></label>)}</div><small>Vous pouvez rattacher plusieurs éléments à ce niveau.</small></div>}
        {kind==="equipment"&&<label>{t.unit}<select value={form.unit_id||""} onChange={e=>setField("unit_id",e.target.value)}><option value="">{t.noUnit}</option>{units.filter(x=>x.is_active&&(!form.site_id||x.site_id===form.site_id)).map(x=><option key={x.id} value={x.id}>{x.code} · {x.name}</option>)}</select></label>}

        {kind==="site"&&<label>{t.address}<input value={form.address||""} onChange={e=>setField("address",e.target.value)}/></label>}
        {kind==="equipment"&&<><label>{t.manufacturer}<input value={form.manufacturer||""} onChange={e=>setField("manufacturer",e.target.value)}/></label><label>{t.model}<input value={form.model||""} onChange={e=>setField("model",e.target.value)}/></label><label>{t.serial}<input value={form.serial_number||""} onChange={e=>setField("serial_number",e.target.value)}/></label><label>{t.location}<input value={form.location||""} onChange={e=>setField("location",e.target.value)}/></label></>}
        <div className="span-2 modal-actions"><button className="primary-btn" disabled={busy}>{editingId?<Pencil size={15}/>:<Plus size={15}/>} {editingId?t.save:t.add+" "+scopeLabels[kind].toLowerCase()}</button>{editingId&&<button type="button" className="secondary-btn" onClick={()=>{setEditingId(null);setForm({});setFormOpen(false)}}>{t.cancel}</button>}</div>
      </form></div></ModalPortal>}
      <div className="table-wrap"><table><thead><tr><th>{t.codeTag}</th><th>{t.name}</th><th>{t.attachment}</th><th>{t.status}</th><th>{t.action}</th></tr></thead><tbody>{scopeRows[kind].map(row=><tr key={row.id}><td><b>{row.code||row.equipment_tag}</b></td><td>{row.name}</td><td>{kind==="management"?"Entreprise":scopeContext(row)||"—"}</td><td><span className={"status-pill "+(row.is_active?"positive":"warning")}>{row.is_active?t.active:t.inactive}</span></td><td><div className="row-actions"><button className="ops-icon-btn" type="button" title={t.edit} onClick={()=>startEdit(kind,row)}><Pencil size={14}/></button><button className="ops-icon-btn danger-action" type="button" title={t.delete} onClick={()=>void deleteStructure(kind,row)}><X size={14}/></button><button className="secondary-btn" type="button" onClick={()=>void toggleActive(kind,row)}>{row.is_active?t.disable:t.enable}</button></div></td></tr>)}</tbody></table></div>
      {!scopeRows[kind].length&&<div className="empty-state compact"><div className="empty-icon"><Building2 size={22}/></div><b>{t.empty}</b><span>{t.emptyHint}</span></div>}
    </section>
    <section className="panel">
      <div className="panel-head"><div><h3><ShieldCheck size={17}/> {t.rights}</h3><p>{t.rightsIntro}</p></div></div>
      <div className="org-tabs"><button type="button" className={activeTab==="structure"?"active":""} onClick={()=>setActiveTab("structure")}>{t.structure}</button><button type="button" className={activeTab==="assignments"?"active":""} onClick={()=>setActiveTab("assignments")}>{t.assignments}</button><button type="button" className={activeTab==="projects"?"active":""} onClick={()=>setActiveTab("projects")}>{lang==="ar"?"المشاريع":lang==="en"?"Projects":"Projets"}</button></div>
      {activeTab==="assignments"&&<><div className="org-assignment-toolbar"><div><b>{t.assignments}</b><p>{t.rightsIntro}</p></div><button type="button" className="primary-btn" onClick={()=>{setSelectedScopeIds([]);setSelectedManagementIds([]);setSelectedManagementSiteIds([]);setSelectedManagementServiceIds([]);setEditingManagementAssignmentIds([]);setAssignmentSearch("");setAssignmentModalOpen(true);}}><Plus size={15}/>{t.saveAssignment}</button></div>
      {assignmentModalOpen&&<ModalPortal><div className="modal-backdrop org-form-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)setAssignmentModalOpen(false);}}><form className="modal-card org-assignment-modal" onSubmit={saveAssignment}><div className="modal-head"><div><span className="eyebrow">ORGANISATION · ACCÈS</span><h3>{t.saveAssignment}</h3><p>{t.rightsIntro}</p></div><button type="button" className="icon-btn" aria-label="Fermer" onClick={()=>setAssignmentModalOpen(false)} disabled={busy}><X size={18}/></button></div><div className="form-grid org-form">
        <label>{t.user}<select required value={assignment.user_id} onChange={e=>setAssignment(old=>({...old,user_id:e.target.value}))}><option value="">{t.select}</option>{members.filter(m=>m.is_active!==false&&m.user_id!==currentUserId).map(m=><option key={m.user_id} value={m.user_id}>{m.email||m.user_id} · {m.role||"membre"}</option>)}</select></label>
        <label>{t.job}<input value={assignment.job_title} onChange={e=>setAssignment(old=>({...old,job_title:e.target.value}))} placeholder={t.jobHint}/></label>
        <label>{t.scopeType}<select value={assignment.scope_type} onChange={e=>{setSelectedScopeIds([]);setSelectedManagementIds([]);setSelectedManagementSiteIds([]);setSelectedManagementServiceIds([]);setEditingManagementAssignmentIds([]);setAssignmentSearch("");setAssignment(old=>({...old,scope_type:e.target.value as ScopeType,scope_id:""}));}}><optgroup label={lang==="ar"?"الهيكل التنظيمي":lang==="en"?"Organization":"Structure organisation"}><option value="management">Management</option><option value="service">{scopeLabels.service}</option><option value="site">{scopeLabels.site}</option><option value="unit">{scopeLabels.unit}</option><option value="department">{scopeLabels.department}</option></optgroup><optgroup label={lang==="ar"?"الموارد":lang==="en"?"Resources":"Ressources"}><option value="warehouse">{scopeLabels.warehouse}</option><option value="equipment">{scopeLabels.equipment}</option></optgroup></select></label>
        {assignment.scope_type==="management"?<div className="span-2 org-management-scope-picker">
          <div className="org-multi-scope-field"><div className="org-scope-picker-head"><label>{lang==="ar"?"الإدارات المسموح بها":lang==="en"?"Managements to assign":"Managements à affecter"}</label><span>{selectedManagementIds.length} sélectionné(s)</span></div><div className="org-scope-picker-list">{managements.filter(x=>x.is_active!==false).map(x=><label className="org-scope-choice" key={x.id}><input type="checkbox" checked={selectedManagementIds.includes(x.id)} onChange={e=>{const ids=e.target.checked?[...selectedManagementIds,x.id]:selectedManagementIds.filter(id=>id!==x.id);setSelectedManagementIds(ids);const validSiteIds=sites.filter(st=>ids.includes(st.management_id)).map(st=>st.id);setSelectedManagementSiteIds(old=>old.filter(id=>validSiteIds.includes(id)));setSelectedManagementServiceIds(old=>old.filter(id=>{const service=services.find(sv=>sv.id===id);return !!service&&!!service.site_id&&validSiteIds.includes(service.site_id);}));}}/><span><b>{x.code?x.code+" · ":""}{x.name}</b></span></label>)}</div></div>
          {selectedManagementIds.length>0&&<><div className="org-multi-scope-field"><div className="org-scope-picker-head"><label>{lang==="ar"?"المواقع التابعة للإدارات المختارة":lang==="en"?"Sites under selected managements":"Sites des Managements sélectionnés"}</label><span>{selectedManagementSiteIds.length} sélectionné(s)</span></div><div className="org-scope-picker-list">{sites.filter(x=>x.is_active!==false&&selectedManagementIds.includes(x.management_id)).map(x=><label className="org-scope-choice" key={x.id}><input type="checkbox" checked={selectedManagementSiteIds.includes(x.id)} onChange={e=>setSelectedManagementSiteIds(old=>e.target.checked?[...old,x.id]:old.filter(id=>id!==x.id))}/><span><b>{x.code||"—"} · {x.name}</b><small>{managements.find(m=>m.id===x.management_id)?.name||""}</small></span></label>)}</div></div>
          <div className="org-multi-scope-field"><div className="org-scope-picker-head"><label>{lang==="ar"?"المصالح التابعة للإدارات المختارة":lang==="en"?"Services under selected managements":"Services des Managements sélectionnés"}</label><span>{selectedManagementServiceIds.length} sélectionné(s)</span></div><div className="org-scope-picker-list">{services.filter(x=>x.is_active!==false&&sites.some(st=>st.id===x.site_id&&selectedManagementIds.includes(st.management_id))).map(x=><label className="org-scope-choice" key={x.id}><input type="checkbox" checked={selectedManagementServiceIds.includes(x.id)} onChange={e=>setSelectedManagementServiceIds(old=>e.target.checked?[...old,x.id]:old.filter(id=>id!==x.id))}/><span><b>{x.code||"—"} · {x.name}</b><small>{sites.find(st=>st.id===x.site_id)?.name||""} · {managements.find(m=>m.id===sites.find(st=>st.id===x.site_id)?.management_id)?.name||""}</small></span></label>)}</div></div><small>{lang==="ar"?"تقدر تعيّن لنفس المستخدم عدة إدارات، وتختار المواقع والمصالح من كل إدارة.":lang==="en"?"Assign multiple managements to one user and select sites and services from each.":"Vous pouvez affecter plusieurs Managements au même utilisateur, puis choisir les sites et services de chacun."}</small></>}
        </div>:<div className="org-multi-scope-field"><div className="org-scope-picker-head"><label>{t.scope}</label><span>{selectedScopeIds.length} sélectionné(s)</span></div><input className="org-scope-search" value={assignmentSearch} onChange={e=>setAssignmentSearch(e.target.value)} placeholder={lang==="ar"?"ابحث في النطاقات...":lang==="en"?"Search scopes...":"Rechercher un site, une unité, un service..."} /><div className="org-scope-picker-list">{filteredScopeOptions.filter(x=>x.is_active!==false).map(x=><label className="org-scope-choice" key={x.id}><input type="checkbox" checked={selectedScopeIds.includes(x.id)} onChange={e=>{const ids=e.target.checked?[...selectedScopeIds,x.id]:selectedScopeIds.filter(id=>id!==x.id);setSelectedScopeIds(ids);setAssignment(old=>({...old,scope_id:ids[0]||""}));}}/><span><b>{x.code||x.equipment_tag||"—"} · {x.name}</b><small>{scopeContext(x)}</small></span></label>)}{!filteredScopeOptions.length&&<small className="org-scope-empty">Aucun élément correspondant.</small>}</div><small>{lang==="ar"?"يمكن اختيار عدة عناصر دون استعمال Ctrl.":lang==="en"?"Select multiple items directly; no Ctrl key needed.":"Cochez un ou plusieurs éléments directement, sans utiliser Ctrl/Cmd."}</small></div>}
        <div className="span-2 org-permissions">{(["can_view","can_create","can_edit","can_delete","can_approve","can_issue","can_receive","can_transfer","can_inventory"] as const).map((key)=><label key={key}><input type="checkbox" checked={assignment[key]} onChange={e=>setAssignment(old=>key==="can_view"&&!e.target.checked?({...old,can_view:false,can_create:false,can_edit:false,can_delete:false,can_approve:false,can_issue:false,can_receive:false,can_transfer:false,can_inventory:false}):({...old,[key]:e.target.checked,...(e.target.checked?{can_view:true}:{})}))}/><span>{{can_view:"Consulter",can_create:t.create,can_edit:t.update,can_delete:t.delete,can_approve:t.approve,can_issue:t.issue,can_receive:t.receive,can_transfer:t.transfer,can_inventory:t.inventory}[key]}</span></label>)}</div></div>
        <div className="modal-actions"><button type="button" className="secondary-btn" onClick={()=>setAssignmentModalOpen(false)} disabled={busy}>{t.cancel}</button><button className="primary-btn" disabled={busy}><Check size={15}/> Enregistrer l'affectation</button></div>
      </form></div></ModalPortal>}
      <div className="table-wrap"><table><thead><tr><th>{t.user}</th><th>{t.job}</th><th>{t.scope}</th><th>{t.rightsCount}</th><th></th></tr></thead><tbody>{assignments.map(a=>{const row=(scopeRows as any)[a.scope_type]?.find((x:Row)=>x.id===a.scope_id);const member=members.find(m=>m.user_id===a.user_id);const rights=["can_view","can_create","can_edit","can_delete","can_approve","can_issue","can_receive","can_transfer","can_inventory"].filter(k=>a[k]).length;return <tr key={a.id}><td>{member?.email||a.user_id}</td><td>{a.job_title||"—"}</td><td>{scopeLabels[a.scope_type as ScopeType]} · {row?.name||"Élément indisponible"}</td><td>{rights}/9</td><td><div className="row-actions"><button className="ops-icon-btn" type="button" title={t.edit} onClick={()=>editAssignment(a)}><Pencil size={14}/></button><button className="ops-icon-btn danger-action" type="button" title={t.remove} onClick={()=>void removeAssignment(a.id)}><X size={14}/></button></div></td></tr>})}</tbody></table></div></>}
      {activeTab==="projects"&&<section className="panel org-project-assignment"><div className="panel-head"><div><h3>Projects · Équipes & responsables</h3><p>Définissez séparément le Chef de projet, le Responsable et les membres de l’équipe pour chaque projet.</p></div></div><div className="form-grid"><label>Projet<select value={projectId} onChange={e=>selectProject(e.target.value)}><option value="">Sélectionner un projet</option>{projects.map(p=><option key={p.id} value={p.id}>{p.project_code} · {p.name}</option>)}</select></label><label>Chef de projet<select value={projectManagerId} onChange={e=>setProjectManagerId(e.target.value)}><option value="">Non affecté</option>{members.filter(m=>m.is_active!==false).map(m=><option key={m.user_id} value={m.user_id}>{m.email} · {m.role}</option>)}</select></label><label>Responsable projet<select value={projectResponsibleId} onChange={e=>setProjectResponsibleId(e.target.value)}><option value="">Non affecté</option>{members.filter(m=>m.is_active!==false).map(m=><option key={m.user_id} value={m.user_id}>{m.email} · {m.role}</option>)}</select></label><div className="span-2 org-multi-scope-field"><div className="org-scope-picker-head"><label>Équipe du projet</label><span>{projectTeamIds.length} membre(s)</span></div><div className="org-scope-picker-list">{members.filter(m=>m.is_active!==false&&m.user_id!==projectManagerId&&m.user_id!==projectResponsibleId).map(m=><label className="org-scope-choice" key={m.user_id}><input type="checkbox" checked={projectTeamIds.includes(m.user_id)} onChange={e=>setProjectTeamIds(old=>e.target.checked?[...old,m.user_id]:old.filter(id=>id!==m.user_id))}/><span><b>{m.email}</b><small>{m.role}</small></span></label>)}</div></div><div className="span-2 modal-actions"><button type="button" className="primary-btn" disabled={busy||!projectId} onClick={()=>void saveProjectTeam()}><Check size={15}/> Enregistrer l’équipe du projet</button></div></div></section>}

    </section>
  </div>;
}
