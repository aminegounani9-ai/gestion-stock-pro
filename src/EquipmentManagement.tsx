import { useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabase";
import { Search, Wrench, Package, History, Plus, X, Printer, RefreshCw } from "lucide-react";

type Props={companyId:string;lang:"fr"|"en"|"ar";equipmentSeed?:string|null};
type Equipment={id:string;equipment_tag:string;name:string;manufacturer?:string|null;model?:string|null;serial_number?:string|null;location?:string|null;site_id:string;unit_id?:string|null;service_id?:string|null;department_id?:string|null;status:string};
const labels={
 fr:{title:"Équipements",sub:"Parc équipements, pièces compatibles, disponibilité et consommation.",search:"Rechercher équipement / tag...",parts:"Pièces compatibles",stock:"Stock disponible",consumption:"Consommation enregistrée",history:"Historique des sorties",add:"Ajouter une pièce",part:"Pièce détachée",qty:"Qté par équipement",critical:"Critique",save:"Ajouter",cancel:"Annuler",scan:"Scanner le QR code",print:"Imprimer QR",noEquipment:"Aucun équipement accessible.",noParts:"Aucune pièce liée à cet équipement.",sku:"Référence",name:"Désignation",available:"Disponible",consumed:"Consommé",date:"Date",request:"Demande",workOrder:"OT / Intervention",status:"Statut",qrHint:"Scannez ce QR code avec le téléphone pour ouvrir directement la fiche de cet équipement.",select:"Sélectionner un équipement",all:"Tous les équipements",filter:"Filtrer les équipements",success:"Pièce associée à l’équipement.",error:"Impossible de charger les données.",remove:"Retirer"},
 en:{title:"Equipment",sub:"Equipment register, compatible parts, availability and consumption.",search:"Search equipment / tag...",parts:"Compatible spare parts",stock:"Available stock",consumption:"Recorded consumption",history:"Issue history",add:"Add a part",part:"Spare part",qty:"Qty per equipment",critical:"Critical",save:"Add",cancel:"Cancel",scan:"Scan QR code",print:"Print QR",noEquipment:"No accessible equipment.",noParts:"No spare part linked to this equipment.",sku:"Reference",name:"Description",available:"Available",consumed:"Consumed",date:"Date",request:"Request",workOrder:"WO / Intervention",status:"Status",qrHint:"Scan this QR code with a phone to open this equipment record directly.",select:"Select equipment",all:"All equipment",filter:"Filter equipment",success:"Part linked to equipment.",error:"Unable to load data.",remove:"Remove"},
 ar:{title:"المعدات",sub:"سجل المعدات وقطع الغيار المتوافقة والمخزون والاستهلاك.",search:"ابحث عن المعدة أو الرمز...",parts:"قطع الغيار المتوافقة",stock:"المخزون المتاح",consumption:"الاستهلاك المسجل",history:"سجل عمليات الصرف",add:"إضافة قطعة",part:"قطعة الغيار",qty:"الكمية لكل معدة",critical:"حرجة",save:"إضافة",cancel:"إلغاء",scan:"مسح رمز QR",print:"طباعة QR",noEquipment:"لا توجد معدات متاحة.",noParts:"لا توجد قطع مرتبطة بهذه المعدة.",sku:"المرجع",name:"الوصف",available:"المتاح",consumed:"المستهلك",date:"التاريخ",request:"الطلب",workOrder:"أمر العمل",status:"الحالة",qrHint:"امسح الرمز بالهاتف لفتح ملف هذه المعدة مباشرة.",select:"اختر معدة",all:"كل المعدات",filter:"تصفية المعدات",success:"تم ربط القطعة بالمعدة.",error:"تعذر تحميل البيانات.",remove:"إزالة"}
};
export default function EquipmentManagement({companyId,lang,equipmentSeed}:Props){
 const t=labels[lang];const [equipment,setEquipment]=useState<Equipment[]>([]);const [products,setProducts]=useState<any[]>([]);const [selected,setSelected]=useState<string>(equipmentSeed||"");const [parts,setParts]=useState<any[]>([]);const [history,setHistory]=useState<any[]>([]);const [search,setSearch]=useState("");const [modal,setModal]=useState(false);const [productId,setProductId]=useState("");const [qty,setQty]=useState("1");const [critical,setCritical]=useState(false);const [busy,setBusy]=useState(false);const [error,setError]=useState("");
 const current=equipment.find(e=>e.id===selected);
 const filtered=useMemo(()=>equipment.filter(e=>(e.name+" "+e.equipment_tag+" "+(e.model||"")).toLowerCase().includes(search.toLowerCase())),[equipment,search]);
 const load=async()=>{
  if(!supabase)return;
  setError("");
  const [eq,pr]=await Promise.all([
   supabase.from("org_equipment").select("id,equipment_tag,name,manufacturer,model,serial_number,location,site_id,unit_id,service_id,department_id,status").eq("company_id",companyId).eq("is_active",true).order("name"),
   supabase.from("products").select("id,sku,name,unit,is_active").eq("company_id",companyId).eq("is_active",true).order("name")
  ]);
  if(eq.error||pr.error){setError(eq.error?.message||pr.error?.message||t.error);return;}
  setEquipment((eq.data||[]) as Equipment[]);setProducts(pr.data||[]);
  const preferred=(equipmentSeed&&eq.data?.some((x:any)=>x.id===equipmentSeed)?equipmentSeed:"")||(selected&&eq.data?.some((x:any)=>x.id===selected)?selected:"")||eq.data?.[0]?.id||"";
  setSelected(preferred);
 };
 const loadDetail=async(id:string)=>{
  if(!supabase||!id)return;
  const e=equipment.find(x=>x.id===id);if(!e)return;
  const [links,req]=await Promise.all([
   supabase.from("spare_part_equipment_compatibility").select("id,product_id,quantity_per_equipment,is_critical,notes").eq("company_id",companyId).eq("equipment_tag",e.equipment_tag),
   supabase.from("spare_part_requests").select("id,request_number,work_order_reference,status,issued_at,created_at,spare_part_request_items(id,product_id,issued_quantity,products(name,sku,unit))").eq("company_id",companyId).eq("equipment_id",id).order("created_at",{ascending:false}).limit(100)
  ]);
  if(links.error||req.error){setError(links.error?.message||req.error?.message||t.error);return;}
  const ids=(links.data||[]).map((x:any)=>x.product_id);
  const stock=ids.length?await supabase.from("stock_balances").select("product_id,quantity_on_hand").eq("company_id",companyId).in("product_id",ids):{data:[],error:null};
  if(stock.error){setError(stock.error.message);return;}
  setParts((links.data||[]).map((x:any)=>({...x,product:products.find(p=>p.id===x.product_id),available:(stock.data||[]).filter((b:any)=>b.product_id===x.product_id).reduce((n:number,b:any)=>n+Number(b.quantity_on_hand||0),0)})));
  setHistory(req.data||[]);
 };
 useEffect(()=>{void load();},[companyId]);
 useEffect(()=>{if(selected&&equipment.length)void loadDetail(selected);},[selected,equipment,products]);
 const consumed=history.reduce((n:number,r:any)=>n+(r.spare_part_request_items||[]).reduce((s:number,i:any)=>s+Number(i.issued_quantity||0),0),0);
 const qrUrl=typeof window!=="undefined"?window.location.origin+"/?equipment="+encodeURIComponent(selected):"";
 const qrImage="https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=12&data="+encodeURIComponent(qrUrl);
 async function addPart(){
  if(!supabase||!current||!productId)return;setBusy(true);setError("");
  const {error:e}=await supabase.from("spare_part_equipment_compatibility").insert({company_id:companyId,product_id:productId,equipment_tag:current.equipment_tag,equipment_name:current.name,equipment_model:current.model||null,manufacturer:current.manufacturer||null,quantity_per_equipment:Number(qty||1),is_critical:critical});
  setBusy(false);if(e){setError(e.message);return;}setModal(false);setProductId("");setQty("1");setCritical(false);await loadDetail(current.id);
 }
 async function removePart(id:string){if(!supabase||!current||!window.confirm(t.remove+" ?"))return;const {error:e}=await supabase.from("spare_part_equipment_compatibility").delete().eq("id",id).eq("company_id",companyId);if(e)setError(e.message);else await loadDetail(current.id);}
 function printQr(){const w=window.open("","_blank","width=480,height=600");if(!w)return;w.document.write('<html><head><title>Equipment QR</title><style>body{font-family:Arial;text-align:center;padding:30px}img{width:240px;height:240px}h2{margin-bottom:5px}</style></head><body><h2>'+current?.name+'</h2><p>'+current?.equipment_tag+'</p><img src="'+qrImage+'"/><p>'+t.qrHint+'</p></body></html>');w.document.close();w.onload=()=>w.print();}
 return <div className="equipment-module" dir={lang==="ar"?"rtl":"ltr"}>
  <div className="page-heading"><div><h1>{t.title}</h1><p>{t.sub}</p></div><button className="secondary-btn" onClick={()=>void load()}><RefreshCw size={15}/></button></div>
  {error&&<div className="equipment-error">{error}</div>}
  <div className="equipment-layout">
   <aside className="panel equipment-list"><div className="equipment-list-head"><b>{t.all} ({filtered.length})</b><div className="equipment-search"><Search size={15}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder={t.search}/></div></div>
    {filtered.map(e=><button key={e.id} className={"equipment-list-item "+(selected===e.id?"active":"")} onClick={()=>setSelected(e.id)}><span className="equipment-icon"><Wrench size={17}/></span><span><b>{e.name}</b><small>{e.equipment_tag} · {e.model||"—"}</small></span></button>)}
    {!filtered.length&&<p className="equipment-empty">{t.noEquipment}</p>}
   </aside>
   {current?<main className="equipment-detail">
    <section className="panel equipment-hero"><div><span className="equipment-tag">{current.equipment_tag}</span><h2>{current.name}</h2><p>{[current.manufacturer,current.model,current.serial_number].filter(Boolean).join(" · ")}</p><small>{current.location||""}</small></div><div className="equipment-qr"><img src={qrImage} alt="QR"/><small>{t.qrHint}</small><button className="secondary-btn" onClick={printQr}><Printer size={14}/>{t.print}</button></div></section>
    <div className="equipment-kpis"><div className="equipment-kpi"><Package/><span>{t.parts}</span><b>{parts.length}</b></div><div className="equipment-kpi"><Wrench/><span>{t.stock}</span><b>{parts.reduce((n:number,p:any)=>n+p.available,0).toLocaleString()}</b></div><div className="equipment-kpi"><History/><span>{t.consumption}</span><b>{consumed.toLocaleString()}</b></div></div>
    <section className="panel"><div className="panel-head"><div><h3>{t.parts}</h3><p>{current.equipment_tag}</p></div><button className="primary-btn" onClick={()=>setModal(true)}><Plus size={15}/>{t.add}</button></div>
     {parts.length?<div className="table-wrap"><table><thead><tr><th>{t.sku}</th><th>{t.name}</th><th>{t.qty}</th><th>{t.available}</th><th>{t.critical}</th><th></th></tr></thead><tbody>{parts.map(p=><tr key={p.id}><td>{p.product?.sku||"—"}</td><td>{p.product?.name||"—"}</td><td>{p.quantity_per_equipment} {p.product?.unit||""}</td><td><b>{p.available}</b></td><td>{p.is_critical?"●":"—"}</td><td><button className="secondary-btn" onClick={()=>void removePart(p.id)}>{t.remove}</button></td></tr>)}</tbody></table></div>:<p className="equipment-empty">{t.noParts}</p>}
    </section>
    <section className="panel"><div className="panel-head"><div><h3>{t.history}</h3><p>{history.length} · {t.consumption}: {consumed}</p></div></div>
     {history.length?<div className="table-wrap"><table><thead><tr><th>{t.date}</th><th>{t.request}</th><th>{t.workOrder}</th><th>{t.name}</th><th>{t.consumed}</th><th>{t.status}</th></tr></thead><tbody>{history.flatMap((r:any)=> (r.spare_part_request_items||[]).filter((i:any)=>Number(i.issued_quantity)>0).map((i:any)=><tr key={i.id}><td>{new Date(r.issued_at||r.created_at).toLocaleDateString()}</td><td>{r.request_number}</td><td>{r.work_order_reference||"—"}</td><td>{i.products?.name||i.products?.sku||"—"}</td><td>{i.issued_quantity} {i.products?.unit||""}</td><td>{r.status}</td></tr>))}</tbody></table></div>:<p className="equipment-empty">—</p>}
    </section>
   </main>:<section className="panel equipment-empty">{t.noEquipment}</section>}
  </div>
  {modal&&<div className="modal-backdrop" onClick={()=>setModal(false)}><div className="modal-card" onClick={e=>e.stopPropagation()}><div className="modal-head"><h2>{t.add}</h2><button className="ops-icon-btn" onClick={()=>setModal(false)}><X/></button></div><div className="form-grid"><label>{t.part}<select value={productId} onChange={e=>setProductId(e.target.value)}><option value="">—</option>{products.filter(p=>!parts.some(x=>x.product_id===p.id)).map(p=><option key={p.id} value={p.id}>{p.sku} · {p.name}</option>)}</select></label><label>{t.qty}<input type="number" min="0.001" step="0.001" value={qty} onChange={e=>setQty(e.target.value)}/></label><label className="equipment-check"><input type="checkbox" checked={critical} onChange={e=>setCritical(e.target.checked)}/>{t.critical}</label></div><div className="modal-actions"><button className="secondary-btn" onClick={()=>setModal(false)}>{t.cancel}</button><button className="primary-btn" disabled={!productId||busy} onClick={()=>void addPart()}>{busy?t.save+"…":t.save}</button></div></div></div>}
 </div>;
}
