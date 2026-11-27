import { useCallback, useEffect, useState } from "react";
import { Activity, AlertTriangle, Bell, CheckCircle2, Clock3, ClipboardList, Package, RefreshCw, ShoppingCart } from "lucide-react";
import { supabase } from "./lib/supabase";
type Props={companyId:string;lang:"fr"|"en"|"ar";onNavigate:(page:any)=>void};
const tr=(l:Props["lang"],fr:string,en:string,ar:string)=>l==="ar"?ar:l==="en"?en:fr;
export default function ControlCenter({companyId,lang,onNavigate}:Props){
 const [data,setData]=useState({notifications:[] as any[],requests:[] as any[],purchases:[] as any[],balances:[] as any[]});
 const [busy,setBusy]=useState(false);const [error,setError]=useState("");
 const load=useCallback(async()=>{
  setBusy(true);setError("");
  const [n,r,p,b]=await Promise.all([
   supabase.from("notifications").select("id,title,message,notification_type,entity_type,entity_id,is_read,created_at").eq("company_id",companyId).order("created_at",{ascending:false}).limit(30),
   supabase.from("spare_part_requests").select("id,request_number,status,priority,required_date,equipment_tag,created_at").eq("company_id",companyId).order("created_at",{ascending:false}).limit(100),
   supabase.from("purchase_orders").select("id,order_number,status,expected_date,created_at,suppliers(name)").eq("company_id",companyId).order("created_at",{ascending:false}).limit(100),
   supabase.from("stock_balances").select("product_id,warehouse_id,quantity_on_hand").eq("company_id",companyId).limit(2000)
  ]);
  const err=[n,r,p,b].find(x=>x.error)?.error;if(err)setError(err.message);
  setData({notifications:n.data||[],requests:r.data||[],purchases:p.data||[],balances:b.data||[]});setBusy(false);
 },[companyId]);
 useEffect(()=>{void load()},[load]);
 const pendingRequests=data.requests.filter(x=>!["issued","completed","rejected","cancelled","closed"].includes(String(x.status||"").toLowerCase()));
 const pendingPurchases=data.purchases.filter(x=>!["received","completed","cancelled","closed"].includes(String(x.status||"").toLowerCase()));
 const overdue=pendingPurchases.filter(x=>x.expected_date&&new Date(x.expected_date+"T23:59:59")<new Date());
 const unread=data.notifications.filter(x=>!x.is_read);
 const lowStock=data.balances.filter(x=>Number(x.quantity_on_hand)<=0).length;
 const markRead=async(id:string)=>{const {error}=await supabase.from("notifications").update({is_read:true,read_at:new Date().toISOString()}).eq("id",id);if(!error)setData(v=>({...v,notifications:v.notifications.map(n=>n.id===id?{...n,is_read:true}:n)}));else setError(error.message)};
 const openNotice=(n:any)=>{if(n.entity_type?.includes("request"))onNavigate("requests");else if(n.entity_type?.includes("purchase"))onNavigate("purchases");else if(n.entity_type?.includes("stock")||n.entity_type?.includes("product"))onNavigate("stock");else onNavigate("reports");if(!n.is_read)void markRead(n.id)};
 const stat=(icon:any,label:string,value:number,tone:string,action:string)=>{const I=icon;return <button className={"cc-stat "+tone} onClick={()=>onNavigate(action)}><span><I size={19}/></span><small>{label}</small><b>{value}</b></button>};
 return <div className="control-center-module" dir={lang==="ar"?"rtl":"ltr"}>
  <section className="cc-hero"><div className="cc-hero-icon"><Activity size={26}/></div><div><span>{tr(lang,"SUPERVISION & PILOTAGE","OPERATIONS COMMAND","المراقبة والتحكم")}</span><h2>{tr(lang,"Centre de contrôle","Control Center","مركز التحكم")}</h2><p>{tr(lang,"Une vue centralisée des alertes, validations et opérations à surveiller.","A centralized view of alerts, approvals and operations that need attention.","نظرة موحدة على التنبيهات والموافقات والعمليات التي تحتاج متابعة.")}</p></div><button className="cc-refresh" onClick={()=>void load()} disabled={busy}><RefreshCw size={16}/></button></section>
  <div className="cc-stats">{stat(AlertTriangle,tr(lang,"Demandes à traiter","Requests to review","طلبات قيد المعالجة"),pendingRequests.length,"warning","requests")}{stat(ShoppingCart,tr(lang,"Commandes ouvertes","Open purchase orders","طلبات شراء مفتوحة"),pendingPurchases.length,"blue","purchases")}{stat(Clock3,tr(lang,"Commandes en retard","Overdue orders","طلبات متأخرة"),overdue.length,"danger","purchases")}{stat(Bell,tr(lang,"Notifications non lues","Unread notifications","إشعارات غير مقروءة"),unread.length,"violet","reports")}{stat(Package,tr(lang,"Lignes de stock à zéro","Zero-stock balances","أرصدة منعدمة"),lowStock.length,"neutral","stock")}</div>
  {error&&<div className="cc-error">{error}</div>}
  <div className="cc-grid">
   <section className="panel cc-panel"><div className="panel-head"><div><h3><Bell size={17}/> {tr(lang,"Centre des notifications","Notification center","مركز الإشعارات")}</h3><p>{unread.length} {tr(lang,"non lues","unread","غير مقروءة")}</p></div><button className="secondary-btn" onClick={()=>onNavigate("reports")}>{tr(lang,"Voir rapports","View reports","عرض التقارير")}</button></div>
    {data.notifications.length?data.notifications.map(n=><div className={"cc-notice "+(!n.is_read?"unread":"")} key={n.id}><span className="cc-notice-icon"><Bell size={16}/></span><button className="cc-notice-copy" onClick={()=>openNotice(n)}><b>{n.title}</b><small>{n.message}</small><time>{new Date(n.created_at).toLocaleString(lang==="ar"?"ar-DZ":lang==="en"?"en-US":"fr-FR",{dateStyle:"short",timeStyle:"short"})}</time></button>{!n.is_read&&<button className="cc-read" onClick={()=>void markRead(n.id)} title={tr(lang,"Marquer comme lue","Mark as read","تعليم كمقروءة")}><CheckCircle2 size={17}/></button>}</div>):<div className="cc-empty">{tr(lang,"Aucune notification pour le moment.","No notifications yet.","لا توجد إشعارات حاليا.")}</div>}
   </section>
   <section className="panel cc-panel"><div className="panel-head"><div><h3><ClipboardList size={17}/> {tr(lang,"File des demandes","Request queue","قائمة الطلبات")}</h3><p>{pendingRequests.length} {tr(lang,"en attente / traitement","pending / in progress","قيد الانتظار أو المعالجة")}</p></div><button className="secondary-btn" onClick={()=>onNavigate("requests")}>{tr(lang,"Ouvrir","Open","فتح")}</button></div>
    {pendingRequests.slice(0,8).map(r=><button className="cc-queue-row" key={r.id} onClick={()=>onNavigate("requests")}><span className={"cc-priority "+String(r.priority||"normal").toLowerCase()}>{r.priority||"—"}</span><span><b>{r.request_number||"—"}</b><small>{r.equipment_tag||tr(lang,"Sans équipement","No equipment","بدون معدة")} · {r.status}</small></span><time>{r.required_date||"—"}</time></button>)}
    {!pendingRequests.length&&<div className="cc-empty">{tr(lang,"Aucune demande en attente.","No pending requests.","لا توجد طلبات معلقة.")}</div>}
   </section>
   <section className="panel cc-panel cc-wide"><div className="panel-head"><div><h3><ShoppingCart size={17}/> {tr(lang,"Suivi des approvisionnements","Procurement follow-up","متابعة التموين")}</h3><p>{tr(lang,"Commandes ouvertes et retards de livraison.","Open orders and late deliveries.","الطلبات المفتوحة والتسليمات المتأخرة.")}</p></div><button className="secondary-btn" onClick={()=>onNavigate("purchases")}>{tr(lang,"Toutes les commandes","All orders","كل الطلبات")}</button></div>
    {pendingPurchases.slice(0,8).map(p=><div className="cc-queue-row" key={p.id}><span className={"cc-priority "+(overdue.some(x=>x.id===p.id)?"high":"normal")}>{overdue.some(x=>x.id===p.id)?tr(lang,"RETARD","LATE","متأخر"):p.status}</span><span><b>{p.order_number||"—"}</b><small>{p.suppliers?.name||"—"}</small></span><time>{p.expected_date||"—"}</time></div>)}
    {!pendingPurchases.length&&<div className="cc-empty">{tr(lang,"Aucune commande ouverte.","No open purchase orders.","لا توجد طلبات شراء مفتوحة.")}</div>}
   </section>
  </div>
  <p className="cc-footnote">{tr(lang,"Les données affichées respectent les droits d'accès et les périmètres définis dans votre entreprise.","Displayed data follows the access rights and scopes configured for your company.","البيانات المعروضة تخضع لصلاحيات ونطاقات الوصول المحددة في شركتك.")}</p>
 </div>;
}
