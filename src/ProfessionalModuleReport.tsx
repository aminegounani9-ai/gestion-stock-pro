import { useMemo, useState } from "react";
import { BarChart3, FileSpreadsheet, Printer, X, Loader2 } from "lucide-react";
import { supabase } from "./lib/supabase";
import { openProfessionalPdfReport, type ReportSection } from "./lib/professionalReport";
type Lang="fr"|"en"|"ar";
type Props={companyId:string;company:any;page:string;title:string;lang:Lang};
const configs:Record<string,{tables:{name:string;label:string;date?:string}[];subtitle:string}>={
 products:{tables:[{name:"products",label:"Catalogue articles"},{name:"product_categories",label:"Catégories"}],subtitle:"Catalogue, prix, seuils de réapprovisionnement et état des articles."},
 categories:{tables:[{name:"product_categories",label:"Catégories articles"}],subtitle:"Structure et répartition des catégories."},
 warehouses:{tables:[{name:"warehouses",label:"Entrepôts"},{name:"storage_locations",label:"Emplacements"}],subtitle:"Capacités, rattachements et emplacements de stockage."},
 suppliers:{tables:[{name:"suppliers",label:"Fournisseurs"},{name:"purchase_orders",label:"Commandes fournisseurs",date:"order_date"}],subtitle:"Répertoire fournisseurs et historique des commandes."},
 customers:{tables:[{name:"customers",label:"Clients"},{name:"sales",label:"Historique des ventes",date:"sale_date"}],subtitle:"Répertoire clients et activité commerciale."},
 purchases:{tables:[{name:"purchase_orders",label:"Commandes d'achat",date:"order_date"},{name:"purchase_order_items",label:"Lignes des commandes"}],subtitle:"Commandes, réceptions, fournisseurs et détail des articles."},
 sales:{tables:[{name:"sales",label:"Factures de vente",date:"sale_date"},{name:"sale_items",label:"Lignes des ventes"}],subtitle:"Chiffre d'affaires, factures et détail des ventes."},
 stock:{tables:[{name:"stock_movements",label:"Mouvements de stock",date:"occurred_at"}],subtitle:"Entrées, sorties, ajustements et traçabilité des mouvements."},
 transfers:{tables:[{name:"stock_transfers",label:"Transferts",date:"transfer_date"},{name:"stock_transfer_items",label:"Articles transférés"}],subtitle:"Transferts inter-entrepôts, statuts et quantités."},
 inventory:{tables:[{name:"inventory_counts",label:"Sessions d'inventaire",date:"count_date"},{name:"inventory_count_items",label:"Écarts d'inventaire"}],subtitle:"Comptages, quantités théoriques, quantités réelles et écarts."},
 locations:{tables:[{name:"storage_locations",label:"Emplacements de stockage"}],subtitle:"Organisation et capacité des emplacements."},
 lots:{tables:[{name:"stock_lots",label:"Lots et péremption"},{name:"stock_serial_numbers",label:"Numéros de série"}],subtitle:"Traçabilité des lots, quantités disponibles et dates d'expiration."},
 returns:{tables:[{name:"stock_returns",label:"Retours",date:"return_date"},{name:"stock_return_items",label:"Articles retournés"}],subtitle:"Retours clients et fournisseurs et quantités concernées."},
 expenses:{tables:[{name:"expenses",label:"Dépenses",date:"expense_date"}],subtitle:"Suivi des dépenses, catégories et moyens de paiement."},
 payments:{tables:[{name:"payment_transactions",label:"Transactions financières",date:"transaction_date"}],subtitle:"Encaissements, règlements et références de paiement."},
 spareParts:{tables:[{name:"spare_part_details",label:"Fiches techniques des pièces"},{name:"spare_part_reservations",label:"Réservations"},{name:"spare_part_supplier_quotes",label:"Offres fournisseurs"},{name:"spare_part_repair_cycles",label:"Cycles de réparation"}],subtitle:"Catalogue technique, criticité, disponibilité, réservations et réparabilité."},
 requests:{tables:[{name:"spare_part_requests",label:"Demandes de pièces",date:"created_at"},{name:"spare_part_request_items",label:"Articles demandés"}],subtitle:"Demandes, priorités, validations et quantités servies."},
 equipment:{tables:[{name:"org_equipment",label:"Parc équipements"}],subtitle:"Registre des équipements, affectations et états."},
 reports:{tables:[{name:"stock_movements",label:"Mouvements",date:"occurred_at"},{name:"sales",label:"Ventes",date:"sale_date"},{name:"purchase_orders",label:"Achats",date:"order_date"},{name:"expenses",label:"Dépenses",date:"expense_date"}],subtitle:"Vue consolidée des opérations de stock, ventes, achats et dépenses."}
};
const label=(key:string)=>key.replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase());
const value=(v:any)=>v===null||v===undefined||v===""?"—":typeof v==="object"?JSON.stringify(v):String(v);
const skip=new Set(["id","company_id","created_by","updated_by","approved_by","received_by","dispatched_by","prepared_by","reviewer_id","requested_by","issued_by","uploaded_by","user_id","recipient_user_id","actor_user_id"]);
export default function ProfessionalModuleReport({companyId,company,page,title,lang}:Props){
 const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[sections,setSections]=useState<ReportSection[]>([]),[from,setFrom]=useState(""),[to,setTo]=useState(""),[error,setError]=useState("");
 const cfg=configs[page];
 const words=useMemo(()=>({fr:{button:"Rapport professionnel",from:"Du",to:"Au",generate:"Préparer le rapport",pdf:"Imprimer / PDF",excel:"Exporter Excel",close:"Fermer",loading:"Chargement des données...",no:"Aucune donnée enregistrée pour cette rubrique.",filter:"Période du rapport"},en:{button:"Professional report",from:"From",to:"To",generate:"Prepare report",pdf:"Print / PDF",excel:"Export Excel",close:"Close",loading:"Loading data...",no:"No data recorded for this section.",filter:"Report period"},ar:{button:"تقرير احترافي",from:"من",to:"إلى",generate:"إعداد التقرير",pdf:"طباعة / PDF",excel:"تصدير Excel",close:"إغلاق",loading:"جار تحميل البيانات...",no:"لا توجد بيانات مسجلة لهذا القسم.",filter:"فترة التقرير"}}[lang]),[lang]);
 const load=async()=>{
  if(!supabase)return;setBusy(true);setError("");
  try{
   const results=await Promise.all(cfg.tables.map(async item=>{
    const {data,error}=await supabase!.from(item.name).select("*").eq("company_id",companyId).order("created_at",{ascending:false}).limit(5000);
    if(error)throw new Error(item.label+": "+error.message);
    let rows=(data||[]) as Record<string,any>[];
    if(item.date&& (from||to)){rows=rows.filter(r=>{const d=String(r[item.date!]||"").slice(0,10);return (!from||d>=from)&&(!to||d<=to);});}
    const cols=rows.length?Object.keys(rows[0]).filter(k=>!skip.has(k)):item.name==="products"?["sku","name","unit","purchase_price","sale_price","min_stock","max_stock","is_active"]:["name","status","created_at"];
    return {title:item.label,columns:cols.map(label),rows:rows.map(r=>cols.map(k=>value(r[k])))};
   }));
   setSections(results);
  }catch(e:any){setError(e.message||"Erreur de chargement.");setSections([]);}finally{setBusy(false);}
 };
 const total=sections.reduce((n,s)=>n+s.rows.length,0);
 const numeric=(keys:string[])=>sections.flatMap(s=>s.rows).reduce((sum,row)=>sum+row.reduce((n,v,i)=>n+(keys.some(k=>s.columns[i]?.toLowerCase().includes(k))?Number(String(v).replace(/[^0-9.-]/g,""))||0:0),0),0);
 const kpis=[{label:lang==="ar"?"عدد السجلات":lang==="en"?"Records":"Enregistrements",value:total},{label:lang==="ar"?"عدد الأقسام":lang==="en"?"Sections":"Rubriques",value:sections.length},{label:lang==="ar"?"قيمة المبالغ":lang==="en"?"Financial total":"Total des montants",value:numeric(["total","amount","subtotal"]).toLocaleString("fr-FR")+" "+(company?.currency_code||"DZD")},{label:lang==="ar"?"تاريخ الإصدار":lang==="en"?"Issue date":"Date d'édition",value:new Date().toLocaleDateString()}];
 const exportExcel=async()=>{const XLSX=await import("xlsx");const wb=XLSX.utils.book_new();sections.forEach((s,i)=>XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([[s.title],s.columns,...s.rows]),(s.title||"Données").slice(0,31)));XLSX.writeFile(wb,"Rapport_"+page+"_"+new Date().toISOString().slice(0,10)+".xlsx");};
 const pdf=()=>openProfessionalPdfReport({title,company:company?.name||"Entreprise",subtitle:cfg.subtitle+(from||to?" · Période : "+(from||"—")+" → "+(to||"—"):""),kpis,sections,currency:company?.currency_code});
 return <><div className="module-report-toolbar"><button type="button" className="primary-btn" onClick={()=>{setOpen(true);if(!sections.length)void load();}}><BarChart3 size={16}/>{words.button}</button></div>{open&&<div className="professional-report-backdrop"><section className="professional-module-report"><header className="professional-report-head"><div><b>{company?.name}</b><small>{title} · {words.filter}</small></div><button className="icon-btn" onClick={()=>setOpen(false)}><X size={18}/></button></header><div className="form-grid"><label>{words.from}<input type="date" value={from} onChange={e=>setFrom(e.target.value)}/></label><label>{words.to}<input type="date" value={to} onChange={e=>setTo(e.target.value)}/></label><button className="primary-btn" disabled={busy} onClick={()=>void load()}>{busy?<Loader2 size={15} className="spin"/>:<BarChart3 size={15}/ >}{words.generate}</button></div>{error&&<p className="report-error">{error}</p>}{busy?<p>{words.loading}</p>:<><div className="professional-report-kpis"><article><small>{words.generate}</small><b>{total}</b></article><article><small>{lang==="ar"?"الأقسام":lang==="en"?"Sections":"Rubriques"}</small><b>{sections.length}</b></article><article><small>{lang==="ar"?"الشركة":lang==="en"?"Company":"Entreprise"}</small><b>{company?.name}</b></article></div>{sections.map((s,i)=><section className="professional-report-table-section" key={i}><h3>{s.title} · {s.rows.length}</h3><div className="professional-report-table-wrap"><table><thead><tr>{s.columns.map((c,j)=><th key={j}>{c}</th>)}</tr></thead><tbody>{s.rows.slice(0,30).map((row,j)=><tr key={j}>{row.map((v,k)=><td key={k}>{v}</td>)}</tr>)}</tbody></table>{s.rows.length>30&&<small>+ {s.rows.length-30} lignes supplémentaires incluses dans le PDF/Excel.</small>}</div></section>)}</>}{!busy&&sections.length>0&&<div className="professional-report-actions"><button className="secondary-btn" onClick={pdf}><Printer size={15}/>{words.pdf}</button><button className="secondary-btn" onClick={()=>void exportExcel()}><FileSpreadsheet size={15}/>{words.excel}</button></div>}<div className="modal-actions"><button className="secondary-btn" onClick={()=>setOpen(false)}>{words.close}</button></div></section></div>}</>;
}
