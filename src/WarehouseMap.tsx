import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Boxes, Building2, ChevronDown, ChevronRight, Layers3, MapPin, Plus, RefreshCw, RotateCw, Search, Warehouse, X } from "lucide-react";
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
 const [viewMode,setViewMode]=useState<"tree"|"floor">("tree");
 const [layout,setLayout]=useState<Record<string,{x:number;y:number;width:number;height:number;rotation:number}>>({});
 const [drag,setDrag]=useState<{id:string;offsetX:number;offsetY:number}|null>(null);
 const [savingPosition,setSavingPosition]=useState(false);
 const [showForm,setShowForm]=useState(false);
 const [form,setForm]=useState({name:"",code:"",location_type:"zone",parent_id:"",capacity:"",capacity_unit:"",notes:""});
 const rtl=lang==="ar";
 const selected=warehouses.find(w=>w.id===warehouseId)||warehouses[0];
 useEffect(()=>{if(!warehouseId&&warehouses.length)setWarehouseId(warehouses[0].id)},[warehouseId,warehouses]);
 const load=useCallback(async()=>{
  if(!selected?.id){setRows([]);return}
  setBusy(true);setError("");
  const client=supabase;
  if(!client){setError("Supabase is not configured.");setBusy(false);return;}
  const {data,error}=await client.from("storage_locations").select("id,warehouse_id,parent_id,code,name,location_type,capacity,capacity_unit,notes,is_active,created_at,floorplan_x,floorplan_y,floorplan_width,floorplan_height,floorplan_rotation").eq("company_id",companyId).eq("warehouse_id",selected.id).order("code").limit(1500);
  if(error)setError(error.message);else{const loaded=data||[];setRows(loaded);setExpanded(Object.fromEntries(loaded.map((x:any)=>[x.id,true])));setLayout(Object.fromEntries(loaded.map((x:any,i:number)=>[x.id,{x:Number(x.floorplan_x??(3+(i%4)*24)),y:Number(x.floorplan_y??(4+Math.floor(i/4)*20)),width:Number(x.floorplan_width??20),height:Number(x.floorplan_height??13),rotation:Number(x.floorplan_rotation??0)}])));}
  setBusy(false);
 },[companyId,selected?.id]);
 useEffect(()=>{void load()},[load]);
 const filtered=useMemo(()=>rows.filter(r=>(r.name+" "+r.code+" "+r.location_type).toLowerCase().includes(search.toLowerCase())),[rows,search]);
 const roots=filtered.filter(r=>!r.parent_id||!rows.some(p=>p.id===r.parent_id));
 const children=(id:string)=>filtered.filter(r=>r.parent_id===id);
 const capacityConfigured=rows.filter(r=>r.capacity!==null&&r.capacity!==undefined).length;
 const beginFloorDrag=(e:React.PointerEvent<HTMLDivElement>,row:any)=>{if(!access?.canEdit||savingPosition)return;const card=e.currentTarget;const rect=card.getBoundingClientRect();setDrag({id:row.id,offsetX:e.clientX-rect.left,offsetY:e.clientY-rect.top});card.setPointerCapture(e.pointerId);e.preventDefault();};
 const moveFloorDrag=(e:React.PointerEvent<HTMLDivElement>)=>{if(!drag)return;const rect=e.currentTarget.getBoundingClientRect();const current=layout[drag.id];if(!current)return;const x=Math.max(0,Math.min(100-current.width,((e.clientX-rect.left-drag.offsetX)/rect.width)*100));const y=Math.max(0,Math.min(100-current.height,((e.clientY-rect.top-drag.offsetY)/rect.height)*100));setLayout(v=>({...v,[drag.id]:{...v[drag.id],x,y}}));};
 const rotateFloorItem=async(e:React.MouseEvent<HTMLButtonElement>,row:any)=>{e.stopPropagation();if(!access?.canEdit||savingPosition)return;const current=layout[row.id]||{x:3,y:4,width:20,height:13,rotation:0};const rotation=(Number(current.rotation||0)+90)%360;setSavingPosition(true);setError("");const client=supabase;if(!client){setError("Supabase is not configured.");setSavingPosition(false);return;}const {error}=await client.from("storage_locations").update({floorplan_rotation:rotation}).eq("id",row.id).eq("company_id",companyId).eq("warehouse_id",selected.id).select("id").maybeSingle();if(error)setError(error.message);else{setLayout(v=>({...v,[row.id]:{...current,rotation}}));setRows(v=>v.map(r=>r.id===row.id?{...r,floorplan_rotation:rotation}:r));}setSavingPosition(false);};
 const finishFloorDrag=async()=>{if(!drag)return;const id=drag.id;const pos=layout[id];setDrag(null);if(!pos||!access?.canEdit)return;setSavingPosition(true);setError("");const client=supabase;if(!client){setError("Supabase is not configured.");setSavingPosition(false);return;}const {error}=await client.from("storage_locations").update({floorplan_x:Number(pos.x.toFixed(2)),floorplan_y:Number(pos.y.toFixed(2)),floorplan_width:Number(pos.width.toFixed(2)),floorplan_height:Number(pos.height.toFixed(2))}).eq("id",id).eq("company_id",companyId).eq("warehouse_id",selected.id).select("id").maybeSingle();if(error)setError(error.message);else setRows(v=>v.map(r=>r.id===id?{...r,floorplan_x:pos.x,floorplan_y:pos.y,floorplan_width:pos.width,floorplan_height:pos.height}:r));setSavingPosition(false);};
 const save=async(e:React.FormEvent)=>{
  e.preventDefault();if(!selected?.id)return;
  setBusy(true);setError("");
  const payload={company_id:companyId,warehouse_id:selected.id,parent_id:form.parent_id||null,code:form.code.trim(),name:form.name.trim(),location_type:form.location_type,capacity:form.capacity===""?null:Number(form.capacity),capacity_unit:form.capacity_unit.trim()||null,notes:form.notes.trim()||null,is_active:true};
  const client=supabase;
  if(!client){setError("Supabase is not configured.");setBusy(false);return;}
  const {error}=await client.from("storage_locations").insert(payload);
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
  <section className="panel wm-panel"><div className="panel-head wm-toolbar"><div><h3>{viewMode==="floor"?tr(lang,"Floor Plan interactif","Interactive floor plan","مخطط أرضي تفاعلي"):tr(lang,"Plan hiérarchique","Hierarchical layout","المخطط الهرمي")}</h3><p>{viewMode==="floor"?tr(lang,"Glissez les emplacements pour organiser le plan. Les positions sont sauvegardées automatiquement.","Drag locations to arrange the floor plan. Positions save automatically.","اسحب المواقع ونظم المخطط. المواضع تتحفظ تلقائياً."):tr(lang,"Sélectionnez un entrepôt pour explorer ses emplacements.","Select a warehouse to explore its locations.","اختار المخزن باش تشوف مواقع التخزين.")}</p></div><div className="wm-actions"><div className="wm-view-switch"><button type="button" className={viewMode==="tree"?"active":""} onClick={()=>setViewMode("tree")}>{tr(lang,"Arborescence","Tree","شجرة")}</button><button type="button" className={viewMode==="floor"?"active":""} onClick={()=>setViewMode("floor")}>{tr(lang,"Floor Plan 2D","2D Floor Plan","مخطط 2D")}</button></div><select value={selected?.id||""} onChange={e=>setWarehouseId(e.target.value)}>{warehouses.map(w=><option key={w.id} value={w.id}>{w.code} · {w.name}</option>)}</select>{access?.canCreate&&<button className="primary-btn" onClick={()=>setShowForm(v=>!v)}><Plus size={16}/>{tr(lang,"Ajouter un emplacement","Add location","إضافة موقع")}</button>}</div></div>
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
   {!selected?<div className="wm-empty"><Building2 size={30}/><b>{tr(lang,"Aucun entrepôt accessible","No accessible warehouse","لا يوجد مخزن متاح")}</b></div>:busy&&!rows.length?<div className="wm-empty">{tr(lang,"Chargement...","Loading...","جار التحميل...")}</div>:!rows.length?<div className="wm-empty"><Boxes size={30}/><b>{tr(lang,"Aucun emplacement défini","No locations configured","مازال ما كاين حتى موقع مسجل")}</b><small>{tr(lang,"Ajoutez une Zone, puis ses allées, rayonnages et bacs pour construire votre cartographie.","Add a zone, then aisles, racks and bins to build your warehouse map.","زيد Zone ومن بعدها الممرات والرفوف والصناديق باش تبني الخريطة.")}</small></div>:viewMode==="tree"?<div className="wm-tree">{roots.map(r=>tree(r))}</div>:<><div className="wm-floor-legend"><span><i className="zone"/>Zone</span><span><i className="aisle"/>Allée</span><span><i className="rack"/>Rayonnage</span><span><i className="other"/>Autre emplacement</span><small>{access?.canEdit?tr(lang,"Glisser-déposer activé","Drag and drop enabled","السحب والإفلات مفعل"):tr(lang,"Mode consultation","View only","وضع المشاهدة فقط")}</small></div><div className="wm-floor-canvas" onPointerMove={moveFloorDrag} onPointerUp={()=>void finishFloorDrag()} onPointerCancel={()=>void finishFloorDrag()}><div className="wm-floor-grid"/><div className="wm-floor-label">{selected?.name||"WAREHOUSE"} · FLOOR PLAN</div>{filtered.map((r:any,i:number)=>{const p=layout[r.id]||{x:3+(i%4)*24,y:4+Math.floor(i/4)*20,width:20,height:13,rotation:Number(r.floorplan_rotation||0)};return <div key={r.id} className={"wm-floor-item type-"+r.location_type+(drag?.id===r.id?" is-dragging":"")+(r.is_active?"":" is-inactive")} style={{left:p.x+"%",top:p.y+"%",width:p.width+"%",height:p.height+"%",transform:"rotate("+Number(p.rotation||0)+"deg)"}} onPointerDown={e=>beginFloorDrag(e,r)} title={access?.canEdit?tr(lang,"Maintenez et déplacez pour repositionner","Drag to reposition","اضغط واسحب لتغيير المكان"):r.name}><span className="wm-floor-item-icon"><Layers3 size={15}/></span>{access?.canEdit&&<button type="button" className="wm-floor-rotate" title={tr(lang,"Tourner de 90°","Rotate 90°","تدوير 90°")} aria-label={tr(lang,"Tourner de 90°","Rotate 90°","تدوير 90°")} onPointerDown={e=>e.stopPropagation()} onClick={e=>void rotateFloorItem(e,r)}><RotateCw size={13}/></button>}<b>{r.name}</b><small>{r.code} · {typeLabel(r.location_type,lang)}</small>{r.capacity!==null&&<em>{r.capacity} {r.capacity_unit||""}</em>}</div>})}</div>{savingPosition&&<small className="wm-saving">{tr(lang,"Enregistrement de la position...","Saving position...","جار حفظ الموضع...")}</small>}</>}
  </section>
  <p className="wm-footnote">{tr(lang,"La cartographie utilise les emplacements existants dans votre base. Aucun stock ni emplacement existant n'est supprimé ou déplacé.","This map uses your existing storage-location records. No existing stock or location is deleted or moved.","الخريطة تستعمل مواقع التخزين الموجودة. ما نحذفوش وما ننقلوش حتى بيانات موجودة.")}</p>
 </div>;
}
