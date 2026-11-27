import { useMemo } from "react";
import { Activity, ClipboardList, PackageCheck, Smartphone, Warehouse } from "lucide-react";
import SpareParts from "./SpareParts";
import "./MobileWarehouseAssistant.css";

type Props = {
  companyId:string; products:any[]; categories:any[]; warehouses:any[]; suppliers:any[];
  myScopes?:any[]; role:string; access:any; lang:"fr"|"en"|"ar"; searchTerm?:string;
  initialEquipmentId?:string|null; initialProductId?:string|null; onSaved:()=>Promise<void>;
};

export default function MobileWarehouseAssistant(props:Props) {
  const {lang,products,warehouses,access}=props;
  const ar=lang==="ar", en=lang==="en";
  const t=ar
    ? {eyebrow:"مساعد المخزن",title:"كل ما تحتاجه في يدك",sub:"ابحث عن قطعة، أرسل طلبك وتابع حالة التحضير والاستلام من الهاتف.",parts:"قطع الغيار",stores:"المخازن",access:"صلاحية الطلب",flow:"مسار بسيط",step1:"ابحث عن القطعة",step2:"أرسل الطلب",step3:"استلم بعد تأكيد المخزن",hint:"طلب القطعة لا يخصم من المخزون. الخصم يتم فقط عند تسجيل التسليم الفعلي من طرف أمين المخزن.",requests:"الطلبات والحجوزات"}
    : en
    ? {eyebrow:"MOBILE WAREHOUSE",title:"Your warehouse, in your pocket",sub:"Find a spare part, submit a request and follow preparation and handover from your phone.",parts:"Spare parts",stores:"Warehouses",access:"Request access",flow:"Simple workflow",step1:"Find the part",step2:"Send your request",step3:"Collect after warehouse confirmation",hint:"Submitting a request does not reduce stock. Stock is deducted only when the storekeeper records the actual handover.",requests:"Requests & reservations"}
    : {eyebrow:"ASSISTANT MAGASIN MOBILE",title:"Le magasin, simplement depuis votre téléphone",sub:"Recherchez une pièce, envoyez une demande et suivez sa préparation et sa délivrance depuis votre mobile.",parts:"Pièces référencées",stores:"Entrepôts",access:"Accès aux demandes",flow:"Un parcours simple",step1:"Rechercher la pièce",step2:"Envoyer la demande",step3:"Retirer après confirmation du magasin",hint:"Une demande ne diminue pas le stock. La sortie est enregistrée uniquement lors de la remise réelle par le magasinier.",requests:"Demandes & réservations"};
  const metrics=useMemo(()=>({parts:products.filter((p:any)=>p.is_active!==false).length,stores:warehouses.filter((w:any)=>w.is_active!==false).length}),[products,warehouses]);
  return <div className="mwa" dir={ar?"rtl":"ltr"}>
    <section className="mwa-hero">
      <div className="mwa-hero-copy"><span className="mwa-eyebrow"><Smartphone size={14}/>{t.eyebrow}</span><h2>{t.title}</h2><p>{t.sub}</p></div>
      <div className="mwa-hero-icon"><Warehouse size={42}/></div>
    </section>
    <section className="mwa-metrics">
      <article><span className="mwa-metric-icon"><PackageCheck size={18}/></span><div><strong>{metrics.parts}</strong><small>{t.parts}</small></div></article>
      <article><span className="mwa-metric-icon"><Warehouse size={18}/></span><div><strong>{metrics.stores}</strong><small>{t.stores}</small></div></article>
      <article><span className="mwa-metric-icon"><ClipboardList size={18}/></span><div><strong>{access?.canCreate?"✓":"—"}</strong><small>{t.access}</small></div></article>
    </section>
    <section className="mwa-flow">
      <div className="mwa-section-title"><Activity size={17}/><h3>{t.flow}</h3></div>
      <div className="mwa-steps"><div><b>01</b><span>{t.step1}</span></div><i/><div><b>02</b><span>{t.step2}</span></div><i/><div><b>03</b><span>{t.step3}</span></div></div>
      <p className="mwa-stock-note">{t.hint}</p>
    </section>
    <section className="mwa-request-area">
      <div className="mwa-section-title"><ClipboardList size={18}/><h3>{t.requests}</h3></div>
      <SpareParts {...props} view="requests"/>
    </section>
  </div>;
}
