import { useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabase";
import { Search, Wrench, Package, History, Plus, X, Printer, RefreshCw, ClipboardList, FileDown } from "lucide-react";

type Props={companyId:string;lang:"fr"|"en"|"ar";equipmentSeed?:string|null;onRequestParts?:(equipmentId:string)=>void};
type Equipment={id:string;equipment_tag:string;name:string;manufacturer?:string|null;model?:string|null;serial_number?:string|null;location?:string|null;notes?:string|null;site_id:string;unit_id?:string|null;service_id?:string|null;department_id?:string|null;status:string;created_at?:string};
const labels={
 fr:{title:"Équipements",sub:"Parc équipements, pièces compatibles, disponibilité et consommation.",search:"Rechercher équipement / tag...",parts:"Pièces compatibles",stock:"Stock disponible",consumption:"Consommation enregistrée",history:"Historique des sorties",add:"Ajouter une pièce",part:"Pièce détachée",qty:"Qté par équipement",critical:"Critique",save:"Ajouter",cancel:"Annuler",scan:"Scanner le QR code",print:"Imprimer QR",noEquipment:"Aucun équipement accessible.",noParts:"Aucune pièce liée à cet équipement.",sku:"Référence",name:"Désignation",warehouse:"Magasin / Entrepôt",location:"Emplacement précis",notLocated:"Emplacement non renseigné",available:"Disponible",consumed:"Consommé",date:"Date",request:"Demande",workOrder:"OT / Intervention",status:"Statut",qrHint:"Scannez ce QR code avec le téléphone pour ouvrir directement la fiche de cet équipement.",select:"Sélectionner un équipement",all:"Tous les équipements",filter:"Filtrer les équipements",success:"Pièce associée à l’équipement.",error:"Impossible de charger les données.",remove:"Retirer",technicalInfo:"Informations techniques",site:"Site",unit:"Unité",service:"Service",department:"Département",manufacturer:"Fabricant",model:"Modèle",serial:"N° de série",notes:"Notes",created:"Date de création",requested:"Demandé",priority:"Priorité",justification:"Justification"},
 en:{title:"Equipment",sub:"Equipment register, compatible parts, availability and consumption.",search:"Search equipment / tag...",parts:"Compatible spare parts",stock:"Available stock",consumption:"Recorded consumption",history:"Issue history",add:"Add a part",part:"Spare part",qty:"Qty per equipment",critical:"Critical",save:"Add",cancel:"Cancel",scan:"Scan QR code",print:"Print QR",noEquipment:"No accessible equipment.",noParts:"No spare part linked to this equipment.",sku:"Reference",name:"Description",warehouse:"Warehouse",location:"Storage location",notLocated:"Location not recorded",available:"Available",consumed:"Consumed",date:"Date",request:"Request",workOrder:"WO / Intervention",status:"Status",qrHint:"Scan this QR code with a phone to open this equipment record directly.",select:"Select equipment",all:"All equipment",filter:"Filter equipment",success:"Part linked to equipment.",error:"Unable to load data.",remove:"Remove",technicalInfo:"Technical information",site:"Site",unit:"Unit",service:"Service",department:"Department",manufacturer:"Manufacturer",model:"Model",serial:"Serial number",notes:"Notes",created:"Created on",requested:"Requested",priority:"Priority",justification:"Justification"},
 ar:{title:"المعدات",sub:"سجل المعدات وقطع الغيار المتوافقة والمخزون والاستهلاك.",search:"ابحث عن المعدة أو الرمز...",parts:"قطع الغيار المتوافقة",stock:"المخزون المتاح",consumption:"الاستهلاك المسجل",history:"سجل عمليات الصرف",add:"إضافة قطعة",part:"قطعة الغيار",qty:"الكمية لكل معدة",critical:"حرجة",save:"إضافة",cancel:"إلغاء",scan:"مسح رمز QR",print:"طباعة QR",noEquipment:"لا توجد معدات متاحة.",noParts:"لا توجد قطع مرتبطة بهذه المعدة.",sku:"المرجع",name:"الوصف",warehouse:"المخزن",location:"الموقع الدقيق",notLocated:"الموقع غير مسجل",available:"المتاح",consumed:"المستهلك",date:"التاريخ",request:"الطلب",workOrder:"أمر العمل",status:"الحالة",qrHint:"امسح الرمز بالهاتف لفتح ملف هذه المعدة مباشرة.",select:"اختر معدة",all:"كل المعدات",filter:"تصفية المعدات",success:"تم ربط القطعة بالمعدة.",error:"تعذر تحميل البيانات.",remove:"إزالة",technicalInfo:"المعلومات التقنية",site:"الموقع",unit:"الوحدة",service:"المصلحة",department:"القسم",manufacturer:"الشركة المصنعة",model:"الطراز",serial:"الرقم التسلسلي",notes:"ملاحظات",created:"تاريخ الإنشاء",requested:"الكمية المطلوبة",priority:"الأولوية",justification:"سبب الطلب"}
};
export default function EquipmentManagement({companyId,lang,equipmentSeed,onRequestParts}:Props){
 const t=labels[lang];const [equipment,setEquipment]=useState<Equipment[]>([]);const [products,setProducts]=useState<any[]>([]);const [orgNames,setOrgNames]=useState<Record<string,string>>({});const [selected,setSelected]=useState<string>(equipmentSeed||"");const [parts,setParts]=useState<any[]>([]);const [history,setHistory]=useState<any[]>([]);const [search,setSearch]=useState("");const [modal,setModal]=useState(false);const [productId,setProductId]=useState("");const [qty,setQty]=useState("1");const [critical,setCritical]=useState(false);const [busy,setBusy]=useState(false);const [error,setError]=useState("");
 const current=equipment.find(e=>e.id===selected);
 const filtered=useMemo(()=>equipment.filter(e=>(e.name+" "+e.equipment_tag+" "+(e.model||"")).toLowerCase().includes(search.toLowerCase())),[equipment,search]);
 const load=async()=>{
  if(!supabase)return;
  setError("");
  const [eq,pr,sites,units,services,departments]=await Promise.all([
   supabase.from("org_equipment").select("id,equipment_tag,name,manufacturer,model,serial_number,location,notes,site_id,unit_id,service_id,department_id,status,created_at").eq("company_id",companyId).eq("is_active",true).order("name"),
   supabase.from("products").select("id,sku,name,unit,is_active").eq("company_id",companyId).eq("is_active",true).order("name"),
   supabase.from("org_sites").select("id,code,name").eq("company_id",companyId),
   supabase.from("org_units").select("id,code,name").eq("company_id",companyId),
   supabase.from("org_services").select("id,code,name").eq("company_id",companyId),
   supabase.from("org_departments").select("id,code,name").eq("company_id",companyId)
  ]);
  const loadError=[eq,pr,sites,units,services,departments].find(x=>x.error)?.error;
  if(loadError){setError(loadError.message||t.error);return;}
  setEquipment((eq.data||[]) as Equipment[]);setProducts(pr.data||[]);
  setOrgNames(Object.fromEntries([...(sites.data||[]),...(units.data||[]),...(services.data||[]),...(departments.data||[])].map((x:any)=>[x.id,[x.code,x.name].filter(Boolean).join(" · ")])));
  const preferred=(equipmentSeed&&eq.data?.some((x:any)=>x.id===equipmentSeed)?equipmentSeed:"")||(selected&&eq.data?.some((x:any)=>x.id===selected)?selected:"")||eq.data?.[0]?.id||"";
  setSelected(preferred);
 };
 const loadDetail=async(id:string)=>{
  if(!supabase||!id)return;
  const e=equipment.find(x=>x.id===id);if(!e)return;
  const [links,requests]=await Promise.all([
   supabase.from("spare_part_equipment_compatibility").select("id,product_id,quantity_per_equipment,is_critical,notes").eq("company_id",companyId).eq("equipment_tag",e.equipment_tag),
   supabase.from("spare_part_requests").select("id,request_number,work_order_reference,status,priority,justification,department,issued_at,created_at,required_date").eq("company_id",companyId).or("equipment_id.eq."+id+",equipment_tag.eq."+e.equipment_tag).order("created_at",{ascending:false}).limit(100)
  ]);
  if(links.error||requests.error){setError(links.error?.message||requests.error?.message||t.error);return;}
  const requestRows=requests.data||[];
  const requestIds=requestRows.map((r:any)=>r.id);
  const itemResult=requestIds.length?await supabase.from("spare_part_request_items").select("id,request_id,product_id,requested_quantity,approved_quantity,issued_quantity,notes").eq("company_id",companyId).in("request_id",requestIds):{data:[],error:null};
  if(itemResult.error){setError(itemResult.error.message);return;}
  const itemRows=itemResult.data||[];
  const productIds=[...new Set(itemRows.map((i:any)=>i.product_id).filter(Boolean))];
  const productResult=productIds.length?await supabase.from("products").select("id,name,sku,unit").eq("company_id",companyId).in("id",productIds):{data:[],error:null};
  if(productResult.error){setError(productResult.error.message);return;}
  const productMap=new Map((productResult.data||[]).map((p:any)=>[p.id,p]));
  const historyRows=requestRows.map((r:any)=>({...r,spare_part_request_items:itemRows.filter((i:any)=>i.request_id===r.id).map((i:any)=>({...i,products:productMap.get(i.product_id)||null}))}));
  const ids=(links.data||[]).map((x:any)=>x.product_id);
  const [stock,lots,warehouseRows,locationRows]=await Promise.all([
   ids.length?supabase.from("stock_balances").select("product_id,warehouse_id,quantity_on_hand").eq("company_id",companyId).in("product_id",ids):Promise.resolve({data:[],error:null}),
   ids.length?supabase.from("stock_lots").select("product_id,warehouse_id,location_id,quantity_on_hand").eq("company_id",companyId).in("product_id",ids).gt("quantity_on_hand",0):Promise.resolve({data:[],error:null}),
   supabase.from("warehouses").select("id,name,code").eq("company_id",companyId),
   supabase.from("storage_locations").select("id,warehouse_id,parent_id,code,name,location_type").eq("company_id",companyId).eq("is_active",true)
  ]);
  if(stock.error||lots.error||warehouseRows.error||locationRows.error){setError(stock.error?.message||lots.error?.message||warehouseRows.error?.message||locationRows.error?.message||t.error);return;}
  const whMap=new Map((warehouseRows.data||[]).map((w:any)=>[w.id,w]));
  const locMap=new Map((locationRows.data||[]).map((l:any)=>[l.id,l]));
  const locationLabel=(id:string|null)=>{if(!id)return t.notLocated;const names:string[]=[];let node=locMap.get(id);let guard=0;while(node&&guard++<12){names.unshift([node.code,node.name].filter(Boolean).join(" · "));node=node.parent_id?locMap.get(node.parent_id):null;}return names.join(" / ")||t.notLocated;};
  setParts((links.data||[]).map((x:any)=>{
   const partLots=(lots.data||[]).filter((l:any)=>l.product_id===x.product_id);
   const balanceRows=(stock.data||[]).filter((b:any)=>b.product_id===x.product_id);
   const locations=[...new Set([...partLots.map((l:any)=>{const w=whMap.get(l.warehouse_id);return [w?.name,locationLabel(l.location_id)].filter(Boolean).join(" — ");}),...balanceRows.filter((b:any)=>b.quantity_on_hand>0).map((b:any)=>{const w=whMap.get(b.warehouse_id);return w?.name||"";})].filter(Boolean))];
   return {...x,product:products.find(p=>p.id===x.product_id),available:(stock.data||[]).filter((b:any)=>b.product_id===x.product_id).reduce((n:number,b:any)=>n+Number(b.quantity_on_hand||0),0),stockLocations:locations};
  }));
  setHistory(historyRows);
 };
 useEffect(()=>{void load();},[companyId]);
 useEffect(()=>{if(equipmentSeed&&equipment.some(e=>e.id===equipmentSeed))setSelected(equipmentSeed);},[equipmentSeed,equipment]);
 useEffect(()=>{if(selected&&equipment.length)void loadDetail(selected);},[selected,equipment,products]);
 const consumed=history.reduce((n:number,r:any)=>n+(r.spare_part_request_items||[]).reduce((s:number,i:any)=>s+Number(i.issued_quantity||0),0),0);
 const qrUrl=current?.equipment_tag||selected;
 const qrImage="https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=1&ecc=M&data="+encodeURIComponent(qrUrl);
 async function addPart(){
  if(!supabase||!current||!productId)return;setBusy(true);setError("");
  const {error:e}=await supabase.from("spare_part_equipment_compatibility").insert({company_id:companyId,product_id:productId,equipment_tag:current.equipment_tag,equipment_name:current.name,equipment_model:current.model||null,manufacturer:current.manufacturer||null,quantity_per_equipment:Number(qty||1),is_critical:critical});
  setBusy(false);if(e){setError(e.message);return;}setModal(false);setProductId("");setQty("1");setCritical(false);await loadDetail(current.id);
 }
 async function removePart(id:string){if(!supabase||!current||!window.confirm(t.remove+" ?"))return;const {error:e}=await supabase.from("spare_part_equipment_compatibility").delete().eq("id",id).eq("company_id",companyId);if(e)setError(e.message);else await loadDetail(current.id);}
  function printQr(){if(!current)return;const w=window.open("","_blank","width=420,height=520");if(!w)return;const esc=(v:any)=>String(v??"").replace(/[&<>"]/g,(m:string)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[m]));w.document.write("<!doctype html><html><head><meta charset='utf-8'><title>QR "+esc(current.equipment_tag)+"</title><style>@page{size:50mm 55mm;margin:2mm}body{font:9px Arial;text-align:center;margin:0;padding:2mm;color:#172033}img{width:24mm;height:24mm}h2{font-size:10px;margin:1mm 0}p{font-size:8px;margin:1mm}</style></head><body><h2>"+esc(current.name)+"</h2><p>"+esc(current.equipment_tag)+"</p><img src='"+qrImage+"'><p>Scanner pour ouvrir le dossier</p><script>window.onload=function(){setTimeout(function(){window.print()},500)}</script></body></html>");w.document.close();}

 function exportDossierPdf(){
  if(!current)return;
  const esc=(v:any)=>String(v??"—").replace(/[&<>"]/g,(m:string)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[m]));
  const partRows=parts.map((p:any)=>"<tr><td>"+esc(p.product?.sku)+"</td><td>"+esc(p.product?.name)+"</td><td>"+esc(p.quantity_per_equipment)+"</td><td>"+esc(p.available)+"</td><td>"+esc((p.stockLocations||[]).join(" | "))+"</td></tr>").join("");
  const historyRows=history.flatMap((r:any)=>(r.spare_part_request_items||[]).map((i:any)=>"<tr><td>"+esc(new Date(r.created_at).toLocaleDateString("fr-FR"))+"</td><td>"+esc(r.request_number)+"</td><td>"+esc(r.work_order_reference)+"</td><td>"+esc(i.products?.sku)+" · "+esc(i.products?.name)+"</td><td>"+esc(i.requested_quantity)+"</td><td>"+esc(i.issued_quantity)+"</td><td>"+esc(r.status)+"</td></tr>")).join("");
  const fields=[[t.site,orgNames[current.site_id]],[t.unit,orgNames[current.unit_id||""]],[t.service,orgNames[current.service_id||""]],[t.department,orgNames[current.department_id||""]],[t.manufacturer,current.manufacturer],[t.model,current.model],[t.serial,current.serial_number],[t.status,current.status],[t.location,current.location],[t.created,current.created_at?new Date(current.created_at).toLocaleDateString("fr-FR"):"—"],[t.notes,current.notes]];
  const fieldHtml=fields.map((f:any)=>"<div class='field'><small>"+esc(f[0])+"</small><b>"+esc(f[1])+"</b></div>").join("");
  const w=window.open("","_blank","width=1100,height=850");if(!w)return;
  const html="<!doctype html><html lang='fr'><head><meta charset='utf-8'><title>Dossier "+esc(current.equipment_tag)+"</title><style>body{font:11px Arial;color:#172033;margin:16mm}header{border-bottom:3px solid #203a68;padding-bottom:12px;display:flex;justify-content:space-between}h1{font-size:22px;margin:0 0 5px}h2{font-size:15px;color:#203a68;margin:22px 0 8px}.tag{font-weight:bold;color:#203a68}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.field{border:1px solid #d7deea;padding:8px;border-radius:5px}.field small{display:block;color:#667085;margin-bottom:3px}.field b{font-size:11px}table{width:100%;border-collapse:collapse;margin-top:8px}th,td{border:1px solid #d7deea;padding:6px;text-align:left}th{background:#eef2f7}.muted{color:#667085}.foot{margin-top:24px;border-top:1px solid #d7deea;padding-top:8px;font-size:9px}@media print{body{margin:12mm}}</style></head><body><header><div><h1>"+esc(current.name)+"</h1><div class='tag'>"+esc(current.equipment_tag)+"</div><div class='muted'>"+esc(current.manufacturer)+" · "+esc(current.model)+" · "+esc(current.serial_number)+"</div></div><div><b>DOSSIER ÉQUIPEMENT</b><br>"+new Date().toLocaleDateString("fr-FR")+"</div></header><h2>1. Informations techniques</h2><div class='grid'>"+fieldHtml+"</div><h2>2. Pièces détachées compatibles</h2><table><thead><tr><th>Référence</th><th>Désignation</th><th>Qté / machine</th><th>Stock disponible</th><th>Emplacements</th></tr></thead><tbody>"+(partRows||"<tr><td colspan='5'>Aucune pièce liée</td></tr>")+"</tbody></table><h2>3. Historique des demandes et consommations</h2><table><thead><tr><th>Date</th><th>Demande</th><th>OT</th><th>Pièce</th><th>Demandé</th><th>Sorti</th><th>Statut</th></tr></thead><tbody>"+(historyRows||"<tr><td colspan='7'>Aucun historique enregistré</td></tr>")+"</tbody></table><div class='foot'>Gestion Stock Pro · Dossier généré le "+new Date().toLocaleString("fr-FR")+" · Enregistrer en PDF depuis la boîte d’impression.</div><script>window.onload=function(){setTimeout(function(){window.print()},400)}</script></body></html>";
  w.document.write(html);w.document.close();
 }

 return <div className="equipment-module" dir={lang==="ar"?"rtl":"ltr"}>
  <div className="page-heading"><div><h1>{t.title}</h1><p>{t.sub}</p></div><button className="secondary-btn" onClick={()=>void load()}><RefreshCw size={15}/></button></div>
  {error&&<div className="equipment-error">{error}</div>}
  <div className="equipment-layout">
   <aside className="panel equipment-list"><div className="equipment-list-head"><b>{t.all} ({filtered.length})</b><div className="equipment-search"><Search size={15}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder={t.search}/></div></div>
    {filtered.map(e=><button key={e.id} className={"equipment-list-item "+(selected===e.id?"active":"")} onClick={()=>setSelected(e.id)}><span className="equipment-icon"><Wrench size={17}/></span><span><b>{e.name}</b><small>{e.equipment_tag} · {e.model||"—"}</small></span></button>)}
    {!filtered.length&&<p className="equipment-empty">{t.noEquipment}</p>}
   </aside>
   {current?<main className="equipment-detail">
    <section className="panel equipment-hero"><div><span className="equipment-tag">{current.equipment_tag}</span><h2>{current.name}</h2><p>{[current.manufacturer,current.model,current.serial_number].filter(Boolean).join(" · ")}</p><small>{current.location||""}</small></div><div className="equipment-qr"><img src={qrImage} alt="QR"/><small>QR compact · {current.equipment_tag}</small><button className="secondary-btn" onClick={printQr}><Printer size={14}/>{t.print}</button></div></section>
    <div className="equipment-dossier-actions"><button className="primary-btn" onClick={()=>onRequestParts?.(current.id)}><ClipboardList size={15}/>Demande de pièce</button><button className="secondary-btn" onClick={exportDossierPdf}><FileDown size={15}/>Dossier PDF</button></div>
    <section className="panel equipment-info-panel"><div className="panel-head"><div><h3>{t.technicalInfo}</h3><p>{current.equipment_tag}</p></div></div><div className="equipment-info-grid">
     <div><small>{t.site}</small><b>{orgNames[current.site_id]||"—"}</b></div><div><small>{t.unit}</small><b>{current.unit_id?orgNames[current.unit_id]||"—":"—"}</b></div><div><small>{t.service}</small><b>{current.service_id?orgNames[current.service_id]||"—":"—"}</b></div><div><small>{t.department}</small><b>{current.department_id?orgNames[current.department_id]||"—":"—"}</b></div>
     <div><small>{t.manufacturer}</small><b>{current.manufacturer||"—"}</b></div><div><small>{t.model}</small><b>{current.model||"—"}</b></div><div><small>{t.serial}</small><b>{current.serial_number||"—"}</b></div><div><small>{t.status}</small><b>{current.status||"—"}</b></div>
     <div><small>{t.location}</small><b>{current.location||"—"}</b></div><div><small>{t.created}</small><b>{current.created_at?new Date(current.created_at).toLocaleDateString():"—"}</b></div>
     <div className="equipment-info-notes"><small>{t.notes}</small><b>{current.notes||"—"}</b></div>
    </div></section>
    <div className="equipment-kpis"><div className="equipment-kpi"><Package/><span>{t.parts}</span><b>{parts.length}</b></div><div className="equipment-kpi"><Wrench/><span>{t.stock}</span><b>{parts.reduce((n:number,p:any)=>n+p.available,0).toLocaleString()}</b></div><div className="equipment-kpi"><History/><span>{t.consumption}</span><b>{consumed.toLocaleString()}</b></div></div>
    <section className="panel"><div className="panel-head"><div><h3>{t.parts}</h3><p>{current.equipment_tag}</p></div><button className="primary-btn" onClick={()=>setModal(true)}><Plus size={15}/>{t.add}</button></div>
     {parts.length?<><div className="table-wrap"><table><thead><tr><th>{t.sku}</th><th>{t.name}</th><th>{t.qty}</th><th>{t.warehouse}</th><th>{t.location}</th><th>{t.available}</th><th>{t.critical}</th><th></th></tr></thead><tbody>{parts.map(p=><tr key={p.id}><td>{p.product?.sku||"—"}</td><td>{p.product?.name||"—"}</td><td>{p.quantity_per_equipment} {p.product?.unit||""}</td><td>{[...new Set((p.stockLocations||[]).map((v:string)=>v.split(" — ")[0]))].filter(Boolean).join(", ")||"—"}</td><td>{(p.stockLocations||[]).map((v:string,i:number)=><div key={i}>{v.includes(" — ")?v.split(" — ")[1]:t.notLocated}</div>)}</td><td><b>{p.available}</b></td><td>{p.is_critical?"●":"—"}</td><td><button className="secondary-btn" onClick={()=>void removePart(p.id)}>{t.remove}</button></td></tr>)}</tbody></table></div><div className="equipment-part-cards">{parts.map(p=><article className="equipment-part-card" key={p.id}><div className="equipment-part-card-head"><div><b>{p.product?.name||"—"}</b><small>{p.product?.sku||"—"}</small></div>{p.is_critical&&<span className="equipment-critical-badge">{t.critical}</span>}</div><div className="equipment-part-card-grid"><div><small>{t.qty}</small><b>{p.quantity_per_equipment} {p.product?.unit||""}</b></div><div><small>{t.available}</small><b>{p.available}</b></div><div className="wide"><small>{t.warehouse}</small><b>{[...new Set((p.stockLocations||[]).map((v:string)=>v.split(" — ")[0]))].filter(Boolean).join(", ")||"—"}</b></div><div className="wide"><small>{t.location}</small><b>{(p.stockLocations||[]).map((v:string,i:number)=><span key={i}>{v.includes(" — ")?v.split(" — ")[1]:t.notLocated}</span>)}</b></div></div></article>)}</div></>:<p className="equipment-empty">{t.noParts}</p>}
    </section>
    <section className="panel"><div className="panel-head"><div><h3>{t.history}</h3><p>{history.length} · {t.consumption}: {consumed}</p></div></div>
     {history.length?<div className="table-wrap"><table><thead><tr><th>{t.date}</th><th>{t.request}</th><th>{t.workOrder}</th><th>{t.name}</th><th>{t.requested}</th><th>{t.consumed}</th><th>{t.priority}</th><th>{t.status}</th><th>{t.justification}</th></tr></thead><tbody>{history.flatMap((r:any)=> (r.spare_part_request_items||[]).map((i:any)=><tr key={i.id}><td>{new Date(r.issued_at||r.created_at).toLocaleDateString()}</td><td>{r.request_number}</td><td>{r.work_order_reference||"—"}</td><td>{i.products?.name||i.products?.sku||"—"}</td><td>{i.requested_quantity??"—"} {i.products?.unit||""}</td><td>{i.issued_quantity??0} {i.products?.unit||""}</td><td>{r.priority||"—"}</td><td>{r.status}</td><td>{r.justification||"—"}</td></tr>))}</tbody></table></div>:<p className="equipment-empty">—</p>}
    </section>
   </main>:<section className="panel equipment-empty">{t.noEquipment}</section>}
  </div>
  {modal&&<div className="modal-backdrop" onClick={()=>setModal(false)}><div className="modal-card" onClick={e=>e.stopPropagation()}><div className="modal-head"><h2>{t.add}</h2><button className="ops-icon-btn" onClick={()=>setModal(false)}><X/></button></div><div className="form-grid"><label>{t.part}<select value={productId} onChange={e=>setProductId(e.target.value)}><option value="">—</option>{products.filter(p=>!parts.some(x=>x.product_id===p.id)).map(p=><option key={p.id} value={p.id}>{p.sku} · {p.name}</option>)}</select></label><label>{t.qty}<input type="number" min="0.001" step="0.001" value={qty} onChange={e=>setQty(e.target.value)}/></label><label className="equipment-check"><input type="checkbox" checked={critical} onChange={e=>setCritical(e.target.checked)}/>{t.critical}</label></div><div className="modal-actions"><button className="secondary-btn" onClick={()=>setModal(false)}>{t.cancel}</button><button className="primary-btn" disabled={!productId||busy} onClick={()=>void addPart()}>{busy?t.save+"…":t.save}</button></div></div></div>}
 </div>;
}
