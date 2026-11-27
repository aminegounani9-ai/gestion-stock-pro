import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Boxes, Building2, ChevronDown, ChevronRight, Layers3, MapPin, Plus, RefreshCw, Search, Warehouse, X } from "lucide-react";
import { supabase } from "./lib/supabase";

type Props={companyId:string;warehouses:any[];lang:"fr"|"en"|"ar";access:any};
const tr=(lang:Props["lang"],fr:string,en:string,ar:string)=>lang==="ar"?ar:lang==="en"?en:fr;
const types=["zone","aisle","rack","shelf","bin","floor","room"];
const typeLabel=(v:string,lang:Props["lang"])=>({zone:tr(lang,"Zone","Zone","منطقة"),aisle:tr(lang,"Allée","Aisle","ممر"),rack:tr(lang,"Rayonnage","Rack","رف"),shelf:tr(lang,"Étagère","Shelf","طبقة"),bin:tr(lang,"Bac","Bin","صندوق"),floor:tr(lang,"Étage","Floor","طابق"),room:tr(lang,"Local","Room","غرفة")}[v]||v);
export default function WarehouseMap({companyId,warehouses,lang,access}:Props){
 const [warehouseId,setWarehouseId]=useState("");
 const [rows,setRows]=useState<any[]>([]);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [search,setSearch]=useState("");
 const [expanded,setExpanded]=useState<Record<string,boolean>>({});
 const [showForm,setShowForm]=useState(false);
 const [form,setForm]=useState({name:"",code:"",location_type:"zone",parent_id:"",capacity:"",capacity_unit:"",notes:""});
 const rtl=lang==="ar";
 const selected=warehouses.find(w=>w.id===warehouseId)||warehouses[0];
 useEffect(()=>{if(!warehouseId&&warehouses.length)setWarehouseId(warehouses[0].id)},[warehouseId,warehouses]);
 const load=useCallback(async()=>{
  if(!selected?.id){setRows([]);return}
  setBusy(true);setError("");
  const {data,error}=await supabase.from("storage_locations").select("id,warehouse_id,parent_id,code,name,location_type,capacity,capacity_unit,notes,is_active,created_at").eq("company_id",companyId).eq("warehouse_id",selected.id).order("code").limit(1500);
  if(error)setError(error.message);else{setRows(data||[]);setExpanded(Object.fromEntries((data||[]).map((x:any)=>[x.id,true])));}
  setBusy(false);
 },[companyId,selected?.id]);
 useEffect(()=>{void load()},[load]);
 const filtered=useMemo(()=>rows.filter(r=>(r.name+" "+r.code+" "+r.location_type).toLowerCase().includes(search.toLowerCase())),[rows,search]);
 const roots=filtered.filter(r=>!r.parent_id||!rows.some(p=>p.id===r.parent_id));
 const children=(id:string)=>filtered.filter(r=>r.parent_id===id);
 const capacityConfigured=rows.filter(r=>r.capacity!==null&&r.capacity!==undefined).length;
 const save=async(e:React.FormEvent)=>{
  e.preventDefault();if(!selected?.id)return;
  setBusy(true);setError("");
  const payload={company_id:companyId,warehouse_id:selected.id,parent_id:form.parent_id||null,code:form.code.trim(),name:form.name.trim(),location_type:form.location_type,capacity:form.capacity===""?null:Number(form.capacity),capacity_unit:form.capacity_unit.trim()||null,notes:form.notes.trim()||null,is_active:true};
  const {error}=await supabase.from("storage_locations").insert(payload);
  if(error)setError(error.message);else{setForm({name:"",code:"",location_type:"zone",parent_id:"",capacity:"",capacity_unit:"",notes:""});setShowForm(false);await load()}
  setBusy(false);
 };
 const tree=(r:any,depth=0):any=><div className={"wm-tree-node depth-"+Math.min(depth,4)} key={r.id}>
  <div className="wm-location-card">
   <button type="button" className="wm-expand" onClick={()=>setExpanded(v=>({...v,[r.id]:!v[r.id]}))} aria-label="Expand location">{children(r.id).length?(expanded[r.id]?<ChevronDown size={15}/>:<ChevronRight size={15}/>):<span className="wm-leaf-dot"/>}</button>
   <span className="wm-location-icon"><Layers3 size={17}/></span><span className="wm-location-copy"><b>{r.name}</b><small>{r.code} · {typeLabel(r.location_type,lang)}</small></span>
   {r.capacity!==null&&<span className="wm-capacity">{Number(r.capacity).toLocaleString()} {r.capacity_unit||""}</span>}
   <span className={"wm-state "+(r.is_active?"active":"inactive")}>{r.is_active?tr(lang,"Actif","Active","نشط"):tr(lang,"Inactif","Inactive","غير نشط")}</span>
  </div>
  {expanded[r.id]&&children(r.id).map((c:any)=>tree(c,depth+1))}
 </div>;
 return <div className="warehouse-map-module" dir={rtl?"rtl":"ltr"}>
  <section className="wm-hero"><div className="wm-hero-icon"><MapPin size={25}/></div><div><span>{tr(lang,"ORGANISATION PHYSIQUE","PHYSICAL STORAGE LAYOUT","التنظيم المكاني للمخزن")}</span><h2>{tr(lang,"Cartographie des magasins","Warehouse mapping","خريطة المخازن")}</h2><p>{tr(lang,"Visualisez la structure réelle de vos zones, allées, rayonnages et emplacements.","Visualize your zones, aisles, racks and storage locations.","شوف التنظيم تاع المناطق والممرات والرفوف ومواقع التخزين.")}</p></div><button className="wm-refresh" onClick={()=>void load()} disabled={busy}><RefreshCw size={16}/></button></section>
  <div className="wm-kpis"><div><Warehouse/><span>{tr(lang,"Entrepôts accessibles","Accessible warehouses","المخازن المتاحة")}<b>{warehouses.length}</b></span></div><div><Boxes/><span>{tr(lang,"Emplacements définis","Defined locations","مواقع التخزين")}<b>{rows.length}</b></span></div><div><Layers3/><span>{tr(lang,"Capacité configurée","Configured capacity","السعة المسجلة")}<b>{capacityConfigured.toLocaleString()}</b></span></div></div>
  <section className="panel wm-panel"><div className="panel-head wm-toolbar"><div><h3>{tr(lang,"Plan hiérarchique","Hierarchical layout","المخطط الهرمي")}</h3><p>{tr(lang,"Sélectionnez un entrepôt pour explorer ses emplacements.","Select a warehouse to explore its locations.","اختار المخزن باش تشوف مواقع التخزين.")}</p></div><div className="wm-actions"><select value={selected?.id||""} onChange={e=>setWarehouseId(e.target.value)}>{warehouses.map(w=><option key={w.id} value={w.id}>{w.code} · {w.name}</option>)}</select>{access?.canCreate&&<button className="primary-btn" onClick={()=>setShowForm(v=>!v)}><Plus size={16}/>{tr(lang,"Ajouter un emplacement","Add location","إضافة موقع")}</button>}</div></div>
   <div className="wm-search"><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder={tr(lang,"Rechercher code, zone ou emplacement...","Search code, zone or location...","ابحث عن رمز أو موقع...")}/></div>
   {error&&<div className="wm-error">{error}</div>}
   {showForm&&<form className="wm-form" onSubmit={save as (e:FormEvent<HTMLFormElement>)=>void}><div className="wm-form-head"><b>{tr(lang,"Nouvel emplacement","New location","موقع جديد")}</b><button type="button" onClick={()=>setShowForm(false)}><X size={16}/></button></div>
    <label>{tr(lang,"Nom","Name","الاسم")}<input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label>
    <label>{tr(lang,"Code unique","Unique code","رمز فريد")}<input required value={form.code} onChange={e=>setForm({...form,code:e.target.value})}/></label>
    <label>{tr(lang,"Type d'emplacement","Location type","نوع الموقع")}<select value={form.location_type} onChange={e=>setForm({...form,location_type:e.target.value})}>{types.map(t=><option key={t} value={t}>{typeLabel(t,lang)}</option>)}</select></label>
    <label>{tr(lang,"Emplacement parent","Parent location","الموقع الأب")}<select value={form.parent_id} onChange={e=>setForm({...form,parent_id:e.target.value})}><option value="">{tr(lang,"Aucun (racine)","None (root)","بدون (جذر)")}</option>{rows.map(r=><option key={r.id} value={r.id}>{r.code} · {r.name}</option>)}</select></label>
    <label>{tr(lang,"Capacité","Capacity","السعة")}<input type="number" min="0" step="any" value={form.capacity} onChange={e=>setForm({...form,capacity:e.target.value})}/></label>
    <label>{tr(lang,"Unité de capacité","Capacity unit","وحدة السعة")}<input value={form.capacity_unit} onChange={e=>setForm({...form,capacity_unit:e.target.value})} placeholder="m³, palettes, bacs..."/></label>
    <label className="wm-notes">{tr(lang,"Notes","Notes","ملاحظات")}<input value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></label>
    <div className="wm-form-actions"><button type="button" className="secondary-btn" onClick={()=>setShowForm(false)}>{tr(lang,"Annuler","Cancel","إلغاء")}</button><button className="primary-btn" disabled={busy}>{busy?tr(lang,"Enregistrement...","Saving...","جار الحفظ..."):tr(lang,"Enregistrer","Save","حفظ")}</button></div>
   </form>}
   {!selected?<div className="wm-empty"><Building2 size={30}/><b>{tr(lang,"Aucun entrepôt accessible","No accessible warehouse","لا يوجد مخزن متاح")}</b></div>:busy&&!rows.length?<div className="wm-empty">{tr(lang,"Chargement...","Loading...","جار التحميل...")}</div>:roots.length?<div className="wm-tree">{roots.map(r=>tree(r))}</div>:<div className="wm-empty"><Boxes size={30}/><b>{tr(lang,"Aucun emplacement défini","No locations configured","مازال ما كاين حتى موقع مسجل")}</b><small>{tr(lang,"Ajoutez une Zone, puis ses allées, rayonnages et bacs pour construire votre cartographie.","Add a zone, then aisles, racks and bins to build your warehouse map.","زيد Zone ومن بعدها الممرات والرفوف والصناديق باش تبني الخريطة.")}</small></div>}
  </section>
  <p className="wm-footnote">{tr(lang,"La cartographie utilise les emplacements existants dans votre base. Aucun stock ni emplacement existant n'est supprimé ou déplacé.","This map uses your existing storage-location records. No existing stock or location is deleted or moved.","الخريطة تستعمل مواقع التخزين الموجودة. ما نحذفوش وما ننقلوش حتى بيانات موجودة.")}</p>
 </div>;
}
