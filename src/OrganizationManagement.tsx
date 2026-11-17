import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Plus, RefreshCw, ShieldCheck, Building2, X, Check } from "lucide-react";
import { supabase } from "./lib/supabase";

type ScopeType = "site" | "unit" | "service" | "department" | "equipment" | "warehouse";
type Row = { id: string; code?: string; name?: string; site_id?: string; unit_id?: string | null; service_id?: string | null; equipment_tag?: string; is_active?: boolean; [key: string]: any };
type Member = { user_id: string; email?: string; role?: string; is_active?: boolean };
const tables: Record<ScopeType,string> = { site:"org_sites", unit:"org_units", service:"org_services", department:"org_departments", equipment:"org_equipment", warehouse:"warehouses" };
const labels: Record<ScopeType,string> = { site:"Site", unit:"Unité", service:"Service", department:"Département", equipment:"Équipement", warehouse:"Entrepôt" };

export default function OrganizationManagement({ companyId, members, currentUserId, onNotice }: { companyId:string; members:Member[]; currentUserId:string; onNotice:(type:"success"|"error",message:string)=>void }) {
  const [activeTab,setActiveTab] = useState<"structure"|"assignments">("structure");
  const [kind,setKind] = useState<ScopeType>("site");
  const [sites,setSites] = useState<Row[]>([]);
  const [units,setUnits] = useState<Row[]>([]);
  const [services,setServices] = useState<Row[]>([]);
  const [departments,setDepartments] = useState<Row[]>([]);
  const [equipment,setEquipment] = useState<Row[]>([]);\n  const [warehouses,setWarehouses] = useState<Row[]>([]);
  const [assignments,setAssignments] = useState<any[]>([]);
  const [form,setForm] = useState<Record<string,string>>({});
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
      supabase.from("user_scope_assignments").select("*").eq("company_id",companyId).order("created_at",{ascending:false})
    ]);
    const error=[a,b,c,d,e,f,g].find(x=>x.error)?.error;
    if(error) throw error;
    setSites(a.data??[]);setUnits(b.data??[]);setServices(c.data??[]);setDepartments(d.data??[]);setEquipment(e.data??[]);setAssignments(f.data??[]);setWarehouses(g.data??[]);
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
    try{const {error}=await supabase.from(tables[kind]).insert(payload);if(error)throw error;setForm({});await refresh();onNotice("success",labels[kind]+" ajouté(e).");}
    catch(e:any){onNotice("error",e.message)}finally{setBusy(false)}
  }
  async function toggleActive(type:ScopeType,row:Row){
    if(!supabase)return;
    const {error}=await supabase.from(tables[type]).update({is_active:!row.is_active}).eq("id",row.id).eq("company_id",companyId);
    if(error){onNotice("error",error.message);return;}await refresh();onNotice("success",row.is_active?"Élément désactivé.":"Élément réactivé.");
  }
  async function saveAssignment(event:React.FormEvent){
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
      <div className="panel-head"><div><h3>Organisation de l'entreprise</h3><p>Créez librement les sites, unités, services, départements et équipements. Aucun périmètre SOPHAL n'est préconfiguré.</p></div><button className="secondary-btn" type="button" onClick={()=>void refresh()}><RefreshCw size={14}/> Actualiser</button></div>
      <div className="org-tabs">{tabs.map(([id,label])=><button type="button" key={id} className={kind===id?"active":""} onClick={()=>{setKind(id);setForm({})}}>{label} <span>{scopeRows[id].length}</span></button>)}</div>
      <form className="form-grid org-form" onSubmit={createStructure}>
        <label>{kind==="equipment"?"Tag équipement":"Code"}<input value={kind==="equipment"?(form.equipment_tag||""):(form.code||"")} onChange={e=>setField(kind==="equipment"?"equipment_tag":"code",e.target.value)} required/></label>
        <label>{kind==="equipment"?"Désignation":"Nom"}<input value={form.name||""} onChange={e=>setField("name",e.target.value)} required/></label>
        {parentOptions&&<label>Site<select required value={form.site_id||""} onChange={e=>setField("site_id",e.target.value)}><option value="">Choisir un site</option>{sites.filter(x=>x.is_active).map(x=><option key={x.id} value={x.id}>{x.code} · {x.name}</option>)}</select></label>}
        {(kind==="service"||kind==="department"||kind==="equipment")&&<label>Unité (facultatif)<select value={form.unit_id||""} onChange={e=>setField("unit_id",e.target.value)}><option value="">Aucune unité</option>{units.filter(x=>x.is_active&&(!form.site_id||x.site_id===form.site_id)).map(x=><option key={x.id} value={x.id}>{x.code} · {x.name}</option>)}</select></label>}
        {(kind==="department"||kind==="equipment")&&<label>Service (facultatif)<select value={form.service_id||""} onChange={e=>setField("service_id",e.target.value)}><option value="">Aucun service</option>{services.filter(x=>x.is_active&&(!form.site_id||x.site_id===form.site_id)).map(x=><option key={x.id} value={x.id}>{x.code} · {x.name}</option>)}</select></label>}
        {kind==="site"&&<label>Adresse<input value={form.address||""} onChange={e=>setField("address",e.target.value)}/></label>}
        {kind==="equipment"&&<><label>Fabricant<input value={form.manufacturer||""} onChange={e=>setField("manufacturer",e.target.value)}/></label><label>Modèle<input value={form.model||""} onChange={e=>setField("model",e.target.value)}/></label><label>N° série<input value={form.serial_number||""} onChange={e=>setField("serial_number",e.target.value)}/></label><label>Emplacement<input value={form.location||""} onChange={e=>setField("location",e.target.value)}/></label></>}
        <div className="span-2 modal-actions"><button className="primary-btn" disabled={busy}><Plus size={15}/> Ajouter {labels[kind].toLowerCase()}</button></div>
      </form>
      <div className="table-wrap"><table><thead><tr><th>Code / Tag</th><th>Nom</th><th>Rattachement</th><th>Statut</th><th>Action</th></tr></thead><tbody>{scopeRows[kind].map(row=><tr key={row.id}><td><b>{row.code||row.equipment_tag}</b></td><td>{row.name}</td><td>{kind==="site"?"—":sites.find(x=>x.id===row.site_id)?.name||"—"}{row.unit_id?" · "+(units.find(x=>x.id===row.unit_id)?.name||""):""}</td><td><span className={"status-pill "+(row.is_active?"positive":"warning")}>{row.is_active?"Actif":"Inactif"}</span></td><td><button className="secondary-btn" type="button" onClick={()=>void toggleActive(kind,row)}>{row.is_active?"Désactiver":"Réactiver"}</button></td></tr>)}</tbody></table></div>
      {!scopeRows[kind].length&&<div className="empty-state compact"><div className="empty-icon"><Building2 size={22}/></div><b>Aucun élément enregistré</b><span>Ajoutez le premier élément avec le formulaire ci-dessus.</span></div>}
    </section>
    <section className="panel">
      <div className="panel-head"><div><h3><ShieldCheck size={17}/> Périmètres & autorisations</h3><p>Les affectations peuvent couvrir plusieurs sites, unités, services ou équipements.</p></div></div>
      <div className="org-tabs"><button type="button" className={activeTab==="structure"?"active":""} onClick={()=>setActiveTab("structure")}>Structure</button><button type="button" className={activeTab==="assignments"?"active":""} onClick={()=>setActiveTab("assignments")}>Affectations</button></div>
      {activeTab==="assignments"&&<><form className="form-grid org-form" onSubmit={saveAssignment}>
        <label>Utilisateur<select required value={assignment.user_id} onChange={e=>setAssignment(old=>({...old,user_id:e.target.value}))}><option value="">Sélectionner</option>{members.filter(m=>m.is_active!==false&&m.user_id!==currentUserId).map(m=><option key={m.user_id} value={m.user_id}>{m.email||m.user_id} · {m.role||"membre"}</option>)}</select></label>
        <label>Fonction / Poste<input value={assignment.job_title} onChange={e=>setAssignment(old=>({...old,job_title:e.target.value}))} placeholder="Manager, Responsable, Superviseur..."/></label>
        <label>Type de périmètre<select value={assignment.scope_type} onChange={e=>setAssignment(old=>({...old,scope_type:e.target.value as ScopeType,scope_id:""}))}>{Object.entries(labels).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
        <label>Périmètre<select required value={assignment.scope_id} onChange={e=>setAssignment(old=>({...old,scope_id:e.target.value}))}><option value="">Sélectionner</option>{availableScopes.filter(x=>x.is_active).map(x=><option key={x.id} value={x.id}>{x.code||x.equipment_tag} · {x.name}</option>)}</select></label>
        <div className="span-2 org-permissions">{(["can_view","can_create","can_edit","can_delete","can_approve","can_issue","can_receive","can_transfer","can_inventory"] as const).map((key)=><label key={key}><input type="checkbox" checked={assignment[key]} onChange={e=>setAssignment(old=>({...old,[key]:e.target.checked}))}/><span>{{can_view:"Consulter",can_create:"Créer",can_edit:"Modifier",can_delete:"Supprimer",can_approve:"Approuver",can_issue:"Délivrer",can_receive:"Réceptionner",can_transfer:"Transférer",can_inventory:"Inventorier"}[key]}</span></label>)}</div>
        <div className="span-2 modal-actions"><button className="primary-btn" disabled={busy}><Check size={15}/> Enregistrer l'affectation</button></div>
      </form>
      <div className="table-wrap"><table><thead><tr><th>Utilisateur</th><th>Fonction</th><th>Périmètre</th><th>Droits</th><th></th></tr></thead><tbody>{assignments.map(a=>{const row=(scopeRows as any)[a.scope_type]?.find((x:Row)=>x.id===a.scope_id);const member=members.find(m=>m.user_id===a.user_id);const rights=["can_view","can_create","can_edit","can_delete","can_approve","can_issue","can_receive","can_transfer","can_inventory"].filter(k=>a[k]).length;return <tr key={a.id}><td>{member?.email||a.user_id}</td><td>{a.job_title||"—"}</td><td>{labels[a.scope_type as ScopeType]} · {row?.name||"Élément indisponible"}</td><td>{rights}/9</td><td><button className="ops-icon-btn" type="button" title="Retirer" onClick={()=>void removeAssignment(a.id)}><X size={14}/></button></td></tr>})}</tbody></table></div></>}
    </section>
  </div>;
}
