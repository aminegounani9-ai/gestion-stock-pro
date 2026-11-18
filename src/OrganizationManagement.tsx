import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Plus, RefreshCw, ShieldCheck, Building2, X, Check, Pencil } from "lucide-react";
import { supabase } from "./lib/supabase";

type ScopeType = "site" | "unit" | "service" | "department" | "equipment" | "warehouse";
type Row = { id: string; code?: string; name?: string; site_id?: string; unit_id?: string | null; service_id?: string | null; equipment_tag?: string; is_active?: boolean; [key: string]: any };
type Member = { user_id: string; email?: string; role?: string; is_active?: boolean };
const tables: Record<ScopeType,string> = { site:"org_sites", unit:"org_units", service:"org_services", department:"org_departments", equipment:"org_equipment", warehouse:"warehouses" };
const labels: Record<ScopeType,string> = { site:"Site", unit:"Unité", service:"Service", department:"Département", equipment:"Équipement", warehouse:"Entrepôt" };
const words={
 fr:{title:"Organisation de l'entreprise",intro:"Configurez les sites, unités, services, départements, équipements et magasins.",refresh:"Actualiser",code:"Code",tag:"Tag équipement",name:"Nom",designation:"Désignation",site:"Site",chooseSite:"Choisir un site",unit:"Unité (facultatif)",noUnit:"Aucune unité",service:"Service (facultatif)",noService:"Aucun service",address:"Adresse",manufacturer:"Fabricant",model:"Modèle",serial:"N° série",location:"Emplacement",save:"Enregistrer les modifications",add:"Ajouter",cancel:"Annuler",codeTag:"Code / Tag",attachment:"Rattachement",status:"Statut",action:"Action",active:"Actif",inactive:"Inactif",edit:"Modifier",disable:"Désactiver",enable:"Réactiver",empty:"Aucun élément enregistré",emptyHint:"Ajoutez le premier élément avec le formulaire ci-dessus.",rights:"Périmètres & autorisations",rightsIntro:"Les affectations peuvent couvrir plusieurs sites, unités, services ou équipements.",structure:"Structure",assignments:"Affectations",user:"Utilisateur",select:"Sélectionner",job:"Fonction / Poste",jobHint:"Manager, Responsable, Superviseur...",scopeType:"Type de périmètre",scope:"Périmètre",rightsCount:"Droits",remove:"Retirer",unavailable:"Élément indisponible",saveAssignment:"Enregistrer l'affectation",view:"Consulter",create:"Créer",update:"Modifier",delete:"Supprimer",approve:"Approuver",issue:"Délivrer",receive:"Réceptionner",transfer:"Transférer",inventory:"Inventorier"},
 en:{title:"Company organization",intro:"Configure sites, units, services, departments, equipment and warehouses.",refresh:"Refresh",code:"Code",tag:"Equipment tag",name:"Name",designation:"Description",site:"Site",chooseSite:"Select a site",unit:"Unit (optional)",noUnit:"No unit",service:"Service (optional)",noService:"No service",address:"Address",manufacturer:"Manufacturer",model:"Model",serial:"Serial no.",location:"Location",save:"Save changes",add:"Add",cancel:"Cancel",codeTag:"Code / Tag",attachment:"Assignment",status:"Status",action:"Action",active:"Active",inactive:"Inactive",edit:"Edit",disable:"Deactivate",enable:"Reactivate",empty:"No records yet",emptyHint:"Add the first item using the form above.",rights:"Scopes & permissions",rightsIntro:"Assignments can cover multiple sites, units, services or equipment.",structure:"Structure",assignments:"Assignments",user:"User",select:"Select",job:"Job title / Role",jobHint:"Manager, Responsible, Supervisor...",scopeType:"Scope type",scope:"Scope",rightsCount:"Rights",remove:"Remove",unavailable:"Unavailable item",saveAssignment:"Save assignment",view:"View",create:"Create",update:"Edit",delete:"Delete",approve:"Approve",issue:"Issue",receive:"Receive",transfer:"Transfer",inventory:"Inventory"},
 ar:{title:"الهيكل التنظيمي للشركة",intro:"إعداد المواقع والوحدات والمصالح والأقسام والمعدات والمخازن.",refresh:"تحديث",code:"الرمز",tag:"رمز المعدة",name:"الاسم",designation:"التسمية",site:"الموقع",chooseSite:"اختر موقعاً",unit:"الوحدة (اختياري)",noUnit:"بدون وحدة",service:"المصلحة (اختياري)",noService:"بدون مصلحة",address:"العنوان",manufacturer:"الشركة المصنعة",model:"الطراز",serial:"الرقم التسلسلي",location:"الموقع",save:"حفظ التعديلات",add:"إضافة",cancel:"إلغاء",codeTag:"الرمز / الوسم",attachment:"الارتباط",status:"الحالة",action:"الإجراء",active:"نشط",inactive:"غير نشط",edit:"تعديل",disable:"تعطيل",enable:"إعادة تفعيل",empty:"لا توجد عناصر مسجلة",emptyHint:"أضف أول عنصر باستعمال النموذج أعلاه.",rights:"النطاقات والصلاحيات",rightsIntro:"يمكن أن تشمل التعيينات عدة مواقع أو وحدات أو مصالح أو معدات.",structure:"الهيكل",assignments:"التعيينات",user:"المستخدم",select:"اختر",job:"الوظيفة / المنصب",jobHint:"مدير، مسؤول، مشرف...",scopeType:"نوع النطاق",scope:"النطاق",rightsCount:"الصلاحيات",remove:"إزالة",unavailable:"عنصر غير متاح",saveAssignment:"حفظ التعيين",view:"عرض",create:"إنشاء",update:"تعديل",delete:"حذف",approve:"موافقة",issue:"صرف",receive:"استلام",transfer:"تحويل",inventory:"جرد"}
};


export default function OrganizationManagement({ companyId, members, currentUserId, onNotice, lang="fr" }: { companyId:string; members:Member[]; currentUserId:string; onNotice:(type:"success"|"error",message:string)=>void; lang?:"fr"|"en"|"ar" }) {
  const t=words[lang];
  const scopeLabels:Record<ScopeType,string>={site:lang==="ar"?"الموقع":lang==="en"?"Site":"Site",unit:lang==="ar"?"الوحدة":lang==="en"?"Unit":"Unité",service:lang==="ar"?"المصلحة":"Service",department:lang==="ar"?"القسم":lang==="en"?"Department":"Département",equipment:lang==="ar"?"المعدة":lang==="en"?"Equipment":"Équipement",warehouse:lang==="ar"?"المخزن":lang==="en"?"Warehouse":"Entrepôt"};
  const [activeTab,setActiveTab] = useState<"structure"|"assignments">("structure");
  const [kind,setKind] = useState<ScopeType>("site");
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
  const [busy,setBusy] = useState(false);
  const refresh = useCallback(async () => {
    if(!supabase) return;
    const [a,b,c,d,e,f,g] = await Promise.all([
      supabase.from("org_sites").select("*").eq("company_id",companyId).order("name"),
      supabase.from("org_units").select("*").eq("company_id",companyId).order("name"),
      supabase.from("org_services").select("*").eq("company_id",companyId).order("name"),
      supabase.from("org_departments").select("*").eq("company_id",companyId).order("name"),
      supabase.from("org_equipment").select("*").eq("company_id",companyId).order("name"),
      supabase.from("user_scope_assignments").select("*").eq("company_id",companyId).order("created_at",{ascending:false}),
      supabase.from("warehouses").select("id,code,name,is_active").eq("company_id",companyId).order("name")
    ]);
    const error=[a,b,c,d,e,f,g].find(x=>x.error)?.error;
    if(error) throw error;
    setSites(a.data??[]);setUnits(b.data??[]);setServices(c.data??[]);setDepartments(d.data??[]);setEquipment((e.data??[]).map(x=>({...x,is_active:x.status==="active"})));setAssignments(f.data??[]);setWarehouses(g.data??[]);
  },[companyId]);
  useEffect(()=>{void refresh().catch(e=>onNotice("error",e.message));},[refresh]);

  const scopeRows = useMemo(()=>({site:sites,unit:units,service:services,department:departments,equipment,warehouse:warehouses}),[sites,units,services,departments,equipment,warehouses]);
  const availableScopes = scopeRows[assignment.scope_type] ?? [];
  function setField(key:string,value:string){setForm(old=>({...old,[key]:value}));}
  async function createStructure(event:FormEvent){
    event.preventDefault();if(!supabase)return;
    const payload:any={company_id:companyId,code:form.code?.trim(),name:form.name?.trim()};
    if(kind==="unit"||kind==="service"||kind==="department"||kind==="equipment") payload.site_id=form.site_id;
    if(kind==="service"||kind==="department"||kind==="equipment") payload.unit_id=form.unit_id||null;
    if(kind==="department"||kind==="equipment") payload.service_id=form.service_id||null;
    if(kind==="equipment"){payload.equipment_tag=form.equipment_tag?.trim();payload.manufacturer=form.manufacturer?.trim()||null;payload.model=form.model?.trim()||null;payload.serial_number=form.serial_number?.trim()||null;payload.location=form.location?.trim()||null;}
    if(kind==="site")payload.address=form.address?.trim()||null;
    if(kind!=="equipment" && !payload.code){onNotice("error","Le code est obligatoire.");return;}
    if(kind==="equipment"){delete payload.code;if(!payload.equipment_tag){onNotice("error","Le tag équipement est obligatoire.");return;}}
    setBusy(true);
    try{const result=editingId?await supabase.from(tables[kind]).update(payload).eq("id",editingId).eq("company_id",companyId):await supabase.from(tables[kind]).insert(payload);if(result.error)throw result.error;setForm({});setEditingId(null);await refresh();onNotice("success",labels[kind]+(editingId?" modifié(e).":" ajouté(e)."));}
    catch(e:any){onNotice("error",e.message)}finally{setBusy(false)}
  }
  function startEdit(type:ScopeType,row:Row){setKind(type);setEditingId(row.id);setForm({code:row.code||"",name:row.name||"",address:row.address||"",site_id:row.site_id||"",unit_id:row.unit_id||"",service_id:row.service_id||"",equipment_tag:row.equipment_tag||"",manufacturer:row.manufacturer||"",model:row.model||"",serial_number:row.serial_number||"",location:row.location||""});setActiveTab("structure");}
  async function toggleActive(type:ScopeType,row:Row){
    if(!supabase)return;
    const {error}=await supabase.from(tables[type]).update(type==="equipment"?{status:row.is_active?"inactive":"active"}:{is_active:!row.is_active}).eq("id",row.id).eq("company_id",companyId);
    if(error){onNotice("error",error.message);return;}await refresh();onNotice("success",row.is_active?"Élément désactivé.":"Élément réactivé.");
  }
  async function saveAssignment(event:FormEvent){
    event.preventDefault();if(!supabase)return;
    if(!assignment.user_id||!assignment.scope_id){onNotice("error","Sélectionnez un utilisateur et un périmètre.");return;}
    setBusy(true);
    try{const {error}=await supabase.from("user_scope_assignments").upsert({company_id:companyId,...assignment},{onConflict:"company_id,user_id,scope_type,scope_id"});if(error)throw error;await refresh();setAssignment(old=>({...old,scope_id:""}));onNotice("success","Affectation enregistrée.");}
    catch(e:any){onNotice("error",e.message)}finally{setBusy(false)}
  }
  async function removeAssignment(id:string){
    if(!supabase||!window.confirm("Retirer cette affectation ?"))return;
    const {error}=await supabase.from("user_scope_assignments").delete().eq("id",id).eq("company_id",companyId);
    if(error){onNotice("error",error.message);return;}await refresh();onNotice("success","Affectation retirée.");
  }
  const tabs:[ScopeType,string][]=[["site","Sites"],["unit","Unités"],["service","Services"],["department","Départements"],["equipment","Équipements"]];
  const parentOptions = kind==="unit"||kind==="service"||kind==="department"||kind==="equipment";
  return <div className="ops-wrap">
    <section className="panel">
      <div className="panel-head"><div><h3>{t.title}</h3><p>{t.intro}</p></div><button className="secondary-btn" type="button" onClick={()=>void refresh()}><RefreshCw size={14}/> {t.refresh}</button></div>
      <div className="org-tabs">{tabs.map(([id,label])=><button type="button" key={id} className={kind===id?"active":""} onClick={()=>{setKind(id);setForm({});setEditingId(null)}}>{label} <span>{scopeRows[id].length}</span></button>)}</div>
      <form className="form-grid org-form" onSubmit={createStructure}>
        <label>{kind==="equipment"?t.tag:t.code}<input value={kind==="equipment"?(form.equipment_tag||""):(form.code||"")} onChange={e=>setField(kind==="equipment"?"equipment_tag":"code",e.target.value)} required/></label>
        <label>{kind==="equipment"?t.designation:t.name}<input value={form.name||""} onChange={e=>setField("name",e.target.value)} required/></label>
        {parentOptions&&<label>{t.site}<select required value={form.site_id||""} onChange={e=>setField("site_id",e.target.value)}><option value="">{t.chooseSite}</option>{sites.filter(x=>x.is_active).map(x=><option key={x.id} value={x.id}>{x.code} · {x.name}</option>)}</select></label>}
        {(kind==="service"||kind==="department"||kind==="equipment")&&<label>{t.unit}<select value={form.unit_id||""} onChange={e=>setField("unit_id",e.target.value)}><option value="">{t.noUnit}</option>{units.filter(x=>x.is_active&&(!form.site_id||x.site_id===form.site_id)).map(x=><option key={x.id} value={x.id}>{x.code} · {x.name}</option>)}</select></label>}
        {(kind==="department"||kind==="equipment")&&<label>{t.service}<select value={form.service_id||""} onChange={e=>setField("service_id",e.target.value)}><option value="">{t.noService}</option>{services.filter(x=>x.is_active&&(!form.site_id||x.site_id===form.site_id)).map(x=><option key={x.id} value={x.id}>{x.code} · {x.name}</option>)}</select></label>}
        {kind==="site"&&<label>{t.address}<input value={form.address||""} onChange={e=>setField("address",e.target.value)}/></label>}
        {kind==="equipment"&&<><label>{t.manufacturer}<input value={form.manufacturer||""} onChange={e=>setField("manufacturer",e.target.value)}/></label><label>{t.model}<input value={form.model||""} onChange={e=>setField("model",e.target.value)}/></label><label>{t.serial}<input value={form.serial_number||""} onChange={e=>setField("serial_number",e.target.value)}/></label><label>{t.location}<input value={form.location||""} onChange={e=>setField("location",e.target.value)}/></label></>}
        <div className="span-2 modal-actions"><button className="primary-btn" disabled={busy}>{editingId?<Pencil size={15}/>:<Plus size={15}/>} {editingId?t.save:t.add+" "+scopeLabels[kind].toLowerCase()}</button>{editingId&&<button type="button" className="secondary-btn" onClick={()=>{setEditingId(null);setForm({})}}>{t.cancel}</button>}</div>
      </form>
      <div className="table-wrap"><table><thead><tr><th>{t.codeTag}</th><th>{t.name}</th><th>{t.attachment}</th><th>{t.status}</th><th>{t.action}</th></tr></thead><tbody>{scopeRows[kind].map(row=><tr key={row.id}><td><b>{row.code||row.equipment_tag}</b></td><td>{row.name}</td><td>{kind==="site"?"—":sites.find(x=>x.id===row.site_id)?.name||"—"}{row.unit_id?" · "+(units.find(x=>x.id===row.unit_id)?.name||""):""}</td><td><span className={"status-pill "+(row.is_active?"positive":"warning")}>{row.is_active?t.active:t.inactive}</span></td><td><div className="row-actions"><button className="ops-icon-btn" type="button" title={t.edit} onClick={()=>startEdit(kind,row)}><Pencil size={14}/></button><button className="secondary-btn" type="button" onClick={()=>void toggleActive(kind,row)}>{row.is_active?t.disable:t.enable}</button></div></td></tr>)}</tbody></table></div>
      {!scopeRows[kind].length&&<div className="empty-state compact"><div className="empty-icon"><Building2 size={22}/></div><b>{t.empty}</b><span>{t.emptyHint}</span></div>}
    </section>
    <section className="panel">
      <div className="panel-head"><div><h3><ShieldCheck size={17}/> {t.rights}</h3><p>{t.rightsIntro}</p></div></div>
      <div className="org-tabs"><button type="button" className={activeTab==="structure"?"active":""} onClick={()=>setActiveTab("structure")}>{t.structure}</button><button type="button" className={activeTab==="assignments"?"active":""} onClick={()=>setActiveTab("assignments")}>{t.assignments}</button></div>
      {activeTab==="assignments"&&<><form className="form-grid org-form" onSubmit={saveAssignment}>
        <label>{t.user}<select required value={assignment.user_id} onChange={e=>setAssignment(old=>({...old,user_id:e.target.value}))}><option value="">{t.select}</option>{members.filter(m=>m.is_active!==false&&m.user_id!==currentUserId).map(m=><option key={m.user_id} value={m.user_id}>{m.email||m.user_id} · {m.role||"membre"}</option>)}</select></label>
        <label>{t.job}<input value={assignment.job_title} onChange={e=>setAssignment(old=>({...old,job_title:e.target.value}))} placeholder={t.jobHint}/></label>
        <label>{t.scopeType}<select value={assignment.scope_type} onChange={e=>setAssignment(old=>({...old,scope_type:e.target.value as ScopeType,scope_id:""}))}>{Object.entries(labels).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
        <label>{t.scope}<select required value={assignment.scope_id} onChange={e=>setAssignment(old=>({...old,scope_id:e.target.value}))}><option value="">Sélectionner</option>{availableScopes.filter(x=>x.is_active).map(x=><option key={x.id} value={x.id}>{x.code||x.equipment_tag} · {x.name}</option>)}</select></label>
        <div className="span-2 org-permissions">{(["can_view","can_create","can_edit","can_delete","can_approve","can_issue","can_receive","can_transfer","can_inventory"] as const).map((key)=><label key={key}><input type="checkbox" checked={assignment[key]} onChange={e=>setAssignment(old=>({...old,[key]:e.target.checked}))}/><span>{{can_view:"Consulter",can_create:t.create,can_edit:t.update,can_delete:t.delete,can_approve:t.approve,can_issue:t.issue,can_receive:t.receive,can_transfer:t.transfer,can_inventory:t.inventory}[key]}</span></label>)}</div>
        <div className="span-2 modal-actions"><button className="primary-btn" disabled={busy}><Check size={15}/> Enregistrer l'affectation</button></div>
      </form>
      <div className="table-wrap"><table><thead><tr><th>{t.user}</th><th>{t.job}</th><th>{t.scope}</th><th>{t.rightsCount}</th><th></th></tr></thead><tbody>{assignments.map(a=>{const row=(scopeRows as any)[a.scope_type]?.find((x:Row)=>x.id===a.scope_id);const member=members.find(m=>m.user_id===a.user_id);const rights=["can_view","can_create","can_edit","can_delete","can_approve","can_issue","can_receive","can_transfer","can_inventory"].filter(k=>a[k]).length;return <tr key={a.id}><td>{member?.email||a.user_id}</td><td>{a.job_title||"—"}</td><td>{scopeLabels[a.scope_type as ScopeType]} · {row?.name||"Élément indisponible"}</td><td>{rights}/9</td><td><button className="ops-icon-btn" type="button" title={t.remove} onClick={()=>void removeAssignment(a.id)}><X size={14}/></button></td></tr>})}</tbody></table></div></>}
    </section>
  </div>;
}
