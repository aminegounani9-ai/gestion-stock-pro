import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Plus, Trash2, BarChart3, Pencil, X } from "lucide-react";
import { supabase } from "./lib/supabase";

type Line = { product_id: string; quantity: string; unit_price: string };
type Props = {
  page: "categories" | "transfers" | "inventory" | "locations" | "lots" | "returns" | "expenses" | "reports" | "payments";
  companyId: string;
  products: any[];
  warehouses: any[];
  suppliers: any[];
  customers: any[];
  purchases: any[];
  sales: any[];
  role: string;
  access?: {isAdmin:boolean;canView:boolean;canCreate:boolean;canEdit:boolean;canDelete:boolean;canApprove:boolean;canIssue:boolean;canReceive:boolean;canTransfer:boolean;canInventory:boolean};
  money: (value: number) => string;
  lang: "fr" | "en" | "ar";
  onSaved: () => Promise<void>;
};
const words = {
  fr: { add:"Nouveau", save:"Enregistrer", cancel:"Annuler", empty:"Aucun enregistrement", product:"Article", qty:"Quantité", price:"Prix unitaire", source:"Entrepôt source", dest:"Entrepôt destination", warehouse:"Entrepôt", location:"Emplacement", locationCode:"Code emplacement", locationType:"Type emplacement", parent:"Emplacement parent", lot:"N° de lot", manufacture:"Date fabrication", expiry:"Date péremption", onHand:"Quantité disponible", capacity:"Capacité", number:"N° document", note:"Notes", date:"Date", status:"Statut", category:"Catégorie", name:"Nom", desc:"Description", amount:"Montant", method:"Mode de paiement", type:"Type de retour", customer:"Client", supplier:"Fournisseur", reason:"Motif", count:"Quantité comptée", expected:"Théorique", diff:"Écart", action:"Action", addLine:"Ajouter une ligne", transfer:"Transfert", inventory:"Inventaire", customerReturn:"Retour client", supplierReturn:"Retour fournisseur", expense:"Dépense", total:"Total", products:"Articles", stockValue:"Valeur du stock (achat)", low:"Articles sous seuil", sales:"Ventes", purchases:"Achats", expenses:"Dépenses", margin:"Marge brute estimée", period:"Période", from:"Du", to:"Au", noStock:"Stock nul", reportHint:"Les indicateurs sont calculés à partir des opérations enregistrées.", reports:"Rapports & analyses", payments:"Paiements & règlements", transactionType:"Type de règlement", linkedDocument:"Document lié", reference:"Référence", cash:"Espèces", bankTransfer:"Virement bancaire", card:"Carte", cheque:"Chèque", other:"Autre", customerReceipt:"Encaissement client", supplierPayment:"Paiement fournisseur", categoryName:"Nom de la catégorie", choose:"Sélectionner", loading:"Chargement..." },
  en: { add:"New", save:"Save", cancel:"Cancel", empty:"No records", product:"Product", qty:"Quantity", price:"Unit price", source:"Source warehouse", dest:"Destination warehouse", warehouse:"Warehouse", location:"Location", locationCode:"Location code", locationType:"Location type", parent:"Parent location", lot:"Lot number", manufacture:"Manufacturing date", expiry:"Expiry date", onHand:"Available quantity", capacity:"Capacity", number:"Document no.", note:"Notes", date:"Date", status:"Status", category:"Category", name:"Name", desc:"Description", amount:"Amount", method:"Payment method", type:"Return type", customer:"Customer", supplier:"Supplier", reason:"Reason", count:"Counted quantity", expected:"Expected", diff:"Difference", action:"Action", addLine:"Add line", transfer:"Transfer", inventory:"Stock count", customerReturn:"Customer return", supplierReturn:"Supplier return", expense:"Expense", total:"Total", products:"Products", stockValue:"Stock value (cost)", low:"Low stock items", sales:"Sales", purchases:"Purchases", expenses:"Expenses", margin:"Estimated gross margin", period:"Period", from:"From", to:"To", noStock:"Out of stock", reportHint:"Indicators are calculated from recorded operations.", reports:"Reports & analytics", payments:"Payments & settlements", transactionType:"Transaction type", linkedDocument:"Linked document", reference:"Reference", cash:"Cash", bankTransfer:"Bank transfer", card:"Card", cheque:"Cheque", other:"Other", customerReceipt:"Customer receipt", supplierPayment:"Supplier payment", categoryName:"Category name", choose:"Select", loading:"Loading..." },
  ar: { add:"جديد", save:"حفظ", cancel:"إلغاء", empty:"لا توجد سجلات", product:"المنتج", qty:"الكمية", price:"سعر الوحدة", source:"المخزن المصدر", dest:"المخزن الوجهة", warehouse:"المخزن", location:"الموقع", locationCode:"رمز الموقع", locationType:"نوع الموقع", parent:"الموقع الأب", lot:"رقم الدفعة", manufacture:"تاريخ التصنيع", expiry:"تاريخ الصلاحية", onHand:"الكمية المتاحة", capacity:"السعة", number:"رقم الوثيقة", note:"ملاحظات", date:"التاريخ", status:"الحالة", category:"الفئة", name:"الاسم", desc:"الوصف", amount:"المبلغ", method:"طريقة الدفع", type:"نوع الإرجاع", customer:"العميل", supplier:"المورد", reason:"السبب", count:"الكمية الفعلية", expected:"النظري", diff:"الفرق", action:"إجراء", addLine:"إضافة سطر", transfer:"تحويل", inventory:"جرد المخزون", customerReturn:"إرجاع من عميل", supplierReturn:"إرجاع إلى مورد", expense:"مصروف", total:"الإجمالي", products:"المنتجات", stockValue:"قيمة المخزون (شراء)", low:"منتجات تحت الحد", sales:"المبيعات", purchases:"المشتريات", expenses:"المصاريف", margin:"الهامش الإجمالي التقديري", period:"الفترة", from:"من", to:"إلى", noStock:"نفد المخزون", reportHint:"المؤشرات محسوبة من العمليات المسجلة.", reports:"التقارير والتحليلات", payments:"المدفوعات والتسويات", transactionType:"نوع العملية", linkedDocument:"الوثيقة المرتبطة", reference:"المرجع", cash:"نقداً", bankTransfer:"تحويل بنكي", card:"بطاقة", cheque:"صك", other:"أخرى", customerReceipt:"تحصيل من عميل", supplierPayment:"دفع لمورد", categoryName:"اسم الفئة", choose:"اختر", loading:"جار التحميل..." }
};
export default function StockOperations({page,companyId,products,warehouses,suppliers,customers,purchases,sales,role,access,money,lang,onSaved}:Props) {
  const t=words[lang]; const rtl=lang==="ar";
  const canApprove=access?access.isAdmin||access.canApprove:["owner","admin","manager"].includes(role);
  const canTransfer=access?access.isAdmin||access.canTransfer:["owner","admin","manager","warehouse"].includes(role);
  const canReceive=access?access.isAdmin||access.canReceive:["owner","admin","manager","warehouse"].includes(role);
  const canWrite=access?(access.isAdmin||(page==="transfers"?access.canTransfer:page==="inventory"?access.canInventory:page==="locations"?(access.canCreate||access.canEdit||access.canDelete):page==="lots"?access.canReceive||access.canEdit:page==="returns"?access.canCreate||access.canIssue||access.canReceive:page==="payments"||page==="expenses"?["owner","admin","manager","sales"].includes(role):access.canCreate||access.canEdit)):((["owner","admin","manager"].includes(role))||(role==="warehouse"&&["transfers","inventory","returns","locations","lots"].includes(page))||(role==="sales"&&["returns","payments"].includes(page)));
  const [rows,setRows]=useState<any[]>([]); const [locationRows,setLocationRows]=useState<any[]>([]); const [busy,setBusy]=useState(false); const [loading,setLoading]=useState(true);
  const [form,setForm]=useState<Record<string,string>>({}); const [editingId,setEditingId]=useState<string|null>(null); const [lines,setLines]=useState<Line[]>([{product_id:"",quantity:"",unit_price:""}]);
  const [start,setStart]=useState(new Date(new Date().getFullYear(),new Date().getMonth(),1).toISOString().slice(0,10));
  const [end,setEnd]=useState(new Date().toISOString().slice(0,10));
  const [report,setReport]=useState<any>({sales:[],purchases:[],expenses:[],balances:[],customerBalance:0,supplierBalance:0});
  const label = page==="locations"?(lang==="ar"?"مواقع التخزين":lang==="en"?"Storage locations":"Emplacements de stockage"):page==="lots"?(lang==="ar"?"الدفعات والصلاحية":lang==="en"?"Lots & expiry":"Lots & péremption"):page==="transfers"?t.transfer:page==="inventory"?t.inventory:page==="returns"?t.type:page==="expenses"?t.expense:page==="payments"?t.payments:page==="categories"?t.category:t.reports;
  const load=useCallback(async()=>{
    if(!supabase)return;setLoading(true);
    try {
      if(page==="locations"){
        const r=await supabase.from("storage_locations").select("*, warehouses(name), parent:storage_locations!storage_locations_parent_id_fkey(name)").eq("company_id",companyId).order("warehouse_id").order("code");if(r.error)throw r.error;setRows(r.data??[]);
      } else if(page==="lots"){
        const [r,loc]=await Promise.all([supabase.from("stock_lots").select("*, products(name,sku), warehouses(name), storage_locations(name,code), suppliers(name)").eq("company_id",companyId).order("expiry_date",{ascending:true,nullsFirst:false}).limit(300),supabase.from("storage_locations").select("id,warehouse_id,code,name").eq("company_id",companyId).eq("is_active",true).order("code")]);if(r.error)throw r.error;if(loc.error)throw loc.error;setRows(r.data??[]);setLocationRows(loc.data??[]);
      } else if(page==="categories"){
        const r=await supabase.from("product_categories").select("*").eq("company_id",companyId).order("name");if(r.error)throw r.error;setRows(r.data??[]);
      } else if(page==="transfers"){
        const r=await supabase.from("stock_transfers").select("*, source:warehouses!stock_transfers_source_warehouse_id_fkey(name), destination:warehouses!stock_transfers_destination_warehouse_id_fkey(name), stock_transfer_items(id,product_id,quantity,received_quantity,products(name,sku))").eq("company_id",companyId).order("created_at",{ascending:false}).limit(100);if(r.error)throw r.error;setRows(r.data??[]);
      } else if(page==="inventory"){
        const r=await supabase.from("inventory_counts").select("*, warehouses(name), inventory_count_items(count_id,product_id,expected_quantity,counted_quantity,difference,products(name,sku))").eq("company_id",companyId).order("created_at",{ascending:false}).limit(100);if(r.error)throw r.error;setRows(r.data??[]);
      } else if(page==="returns"){
        const r=await supabase.from("stock_returns").select("*, warehouses(name), customers(name), suppliers(name)").eq("company_id",companyId).order("created_at",{ascending:false}).limit(100);if(r.error)throw r.error;setRows(r.data??[]);
      } else if(page==="payments"){
        const r=await supabase.from("payment_transactions").select("*, sales(invoice_number), purchase_orders(order_number)").eq("company_id",companyId).order("transaction_date",{ascending:false}).limit(200);if(r.error)throw r.error;setRows(r.data??[]);
      } else if(page==="expenses"){
        const r=await supabase.from("expenses").select("*").eq("company_id",companyId).order("expense_date",{ascending:false}).limit(200);if(r.error)throw r.error;setRows(r.data??[]);
      } else {
        const [s,p,e,b,allSales,allPurchases,payments]=await Promise.all([
          supabase.from("sales").select("sale_date,total,sale_items(quantity,line_total,products(purchase_price))").eq("company_id",companyId).gte("sale_date",start+"T00:00:00").lte("sale_date",end+"T23:59:59"),
          supabase.from("purchase_orders").select("order_date,subtotal").eq("company_id",companyId).gte("order_date",start).lte("order_date",end),
          supabase.from("expenses").select("amount,expense_date").eq("company_id",companyId).gte("expense_date",start).lte("expense_date",end),
          supabase.from("stock_balances").select("product_id,quantity_on_hand").eq("company_id",companyId),
          supabase.from("sales").select("total").eq("company_id",companyId),
          supabase.from("purchase_orders").select("subtotal").eq("company_id",companyId),
          supabase.from("payment_transactions").select("transaction_type,amount").eq("company_id",companyId)
        ]);for(const x of [s,p,e,b,allSales,allPurchases,payments])if(x.error)throw x.error;const customerBalance=(allSales.data??[]).reduce((n:number,x:any)=>n+Number(x.total||0),0)-(payments.data??[]).filter((x:any)=>x.transaction_type==="customer_receipt").reduce((n:number,x:any)=>n+Number(x.amount||0),0);const supplierBalance=(allPurchases.data??[]).reduce((n:number,x:any)=>n+Number(x.subtotal||0),0)-(payments.data??[]).filter((x:any)=>x.transaction_type==="supplier_payment").reduce((n:number,x:any)=>n+Number(x.amount||0),0);setReport({sales:s.data??[],purchases:p.data??[],expenses:e.data??[],balances:b.data??[],customerBalance,supplierBalance});
      }
    } catch(e:any){window.alert(e.message)} finally{setLoading(false)}
  },[page,companyId,start,end]);
  useEffect(()=>{void load()},[load]);
  const addLine=()=>setLines(v=>[...v,{product_id:"",quantity:"",unit_price:""}]);
  async function approveTransfer(id:string){
    if(!canApprove)return;
    if(!window.confirm("Approuver ce transfert ? Aucun stock ne bouge avant expedition."))return;
    setBusy(true);
    try{
      const {error}=await supabase!.rpc("approve_stock_transfer",{p_company_id:companyId,p_transfer_id:id});
      if(error)throw error;
      await load();
    }catch(e:any){window.alert(e.message)}
    finally{setBusy(false)}
  }
  async function dispatchTransfer(id:string){
    if(!canTransfer)return;
    if(!window.confirm("Confirmer l'expedition ? Le stock source sera decremente."))return;
    setBusy(true);
    try{
      const {error}=await supabase!.rpc("dispatch_stock_transfer",{p_company_id:companyId,p_transfer_id:id});
      if(error)throw error;
      await load();
      await onSaved();
    }catch(e:any){window.alert(e.message)}
    finally{setBusy(false)}
  }
  async function receiveTransfer(row:any){
    if(!canReceive)return;
    const items=(row.stock_transfer_items||[]).map((it:any)=>{
      const remaining=Number(it.quantity)-Number(it.received_quantity||0);
      if(remaining<=0)return null;
      const raw=window.prompt("Quantite recue pour "+(it.products?.sku||it.products?.name||"article")+" (reste "+remaining+")",String(remaining));
      if(raw===null)return null;
      return {item_id:it.id,quantity:Number(raw)};
    }).filter((x:any)=>x&&Number.isFinite(x.quantity)&&x.quantity>0);
    if(!items.length)return;
    setBusy(true);
    try{
      const {error}=await supabase!.rpc("receive_stock_transfer",{p_company_id:companyId,p_transfer_id:row.id,p_lines:items});
      if(error)throw error;
      await load();
      await onSaved();
    }catch(e:any){window.alert(e.message)}
    finally{setBusy(false)}
  }
  async function approveCount(id:string){if(!canApprove)return;if(!window.confirm("Valider cet inventaire ? Les écarts seront enregistrés dans les mouvements de stock."))return;setBusy(true);try{const {error}=await supabase!.rpc("approve_inventory_count",{p_company_id:companyId,p_count_id:id});if(error)throw error;await load();await onSaved();}catch(e:any){window.alert(e.message)}finally{setBusy(false)}}
  async function loadWarehouseCountItems(){if(!form.warehouse||!supabase)return;setBusy(true);try{const {data,error}=await supabase.from("stock_balances").select("product_id").eq("company_id",companyId).eq("warehouse_id",form.warehouse);if(error)throw error;const ids=[...new Set((data||[]).map((x:any)=>x.product_id))];const existing=new Set(lines.map(x=>x.product_id));const newLines=ids.filter(id=>!existing.has(id)).map(product_id=>({product_id,quantity:"",unit_price:""}));setLines(v=>[...v,...newLines]);if(!newLines.length)window.alert("Tous les articles avec stock sont déjà dans la liste.");}catch(e:any){window.alert(e.message)}finally{setBusy(false)}}
  const updateLine=(i:number,k:keyof Line,v:string)=>setLines(a=>a.map((x,n)=>n===i?{...x,[k]:v}:x));
  const removeLine=(i:number)=>setLines(a=>a.filter((_,n)=>n!==i));
  const reset=()=>{setForm({});setLines([{product_id:"",quantity:"",unit_price:""}])};
  async function submit(e:FormEvent){
    e.preventDefault();if(!supabase)return;setBusy(true);
    try{
      if(page==="locations"){
        const payload={warehouse_id:form.warehouse,parent_id:form.parent||null,code:form.code.trim(),name:form.name.trim(),location_type:form.location_type||"bin",capacity:form.capacity?Number(form.capacity):null,capacity_unit:form.capacity_unit||null,notes:form.note||null};
        const r=await supabase.from("storage_locations").insert({company_id:companyId,...payload});if(r.error)throw r.error;
      } else if(page==="lots"){
        const qty=Number(form.quantity);if(!Number.isFinite(qty)||qty<=0)throw new Error("Quantité invalide");
        const {error}=await supabase.rpc("register_stock_lot",{p_company_id:companyId,p_product_id:form.product_id,p_warehouse_id:form.warehouse,p_location_id:form.location||null,p_lot_number:form.lot.trim(),p_quantity:qty,p_unit_cost:Number(form.unit_cost||0),p_manufacture_date:form.manufacture||null,p_expiry_date:form.expiry||null,p_supplier_id:form.supplier_id||null,p_notes:form.note||null});if(error)throw error;
      } else if(page==="categories"){
        const payload={name:form.name?.trim(),description:form.description?.trim()||null};
        const query=editingId
          ? supabase.from("product_categories").update(payload).eq("id",editingId).eq("company_id",companyId)
          : supabase.from("product_categories").insert({company_id:companyId,...payload});
        const r=await query;if(r.error)throw r.error;
      } else if(page==="payments"){
        const isReceipt=form.type!=="supplier_payment";
        const r=await supabase.from("payment_transactions").insert({company_id:companyId,transaction_type:isReceipt?"customer_receipt":"supplier_payment",sale_id:isReceipt?form.document_id:null,purchase_order_id:isReceipt?null:form.document_id,amount:Number(form.amount),payment_method:form.method||"cash",transaction_date:form.date||new Date().toISOString().slice(0,10),reference:form.reference||null,notes:form.note||null});if(r.error)throw r.error;
      } else if(page==="expenses"){
        const r=await supabase.from("expenses").insert({company_id:companyId,expense_number:form.number||"EXP-"+Date.now(),category:form.category,description:form.description,amount:Number(form.amount),expense_date:form.date||new Date().toISOString().slice(0,10),payment_method:form.method||null,notes:form.note||null});if(r.error)throw r.error;
      } else {
        const clean=lines.filter(x=>x.product_id&&(page==="inventory"?x.quantity!==""&&Number(x.quantity)>=0:Number(x.quantity)>0));
        if(!clean.length)throw new Error("Ajoutez au moins une ligne valide.");
        if(page==="transfers"){
          const r=await supabase.rpc("create_stock_transfer",{p_company_id:companyId,p_transfer_number:form.number||"TRF-"+Date.now(),p_source_warehouse_id:form.source,p_destination_warehouse_id:form.dest,p_lines:clean.map(x=>({product_id:x.product_id,quantity:Number(x.quantity),unit_cost:Number(x.unit_price||0)})),p_notes:form.note||null});if(r.error)throw r.error;
        } else if(page==="inventory"){
          const r=await supabase.rpc("create_inventory_count_draft",{p_company_id:companyId,p_count_number:form.number||"INV-"+Date.now(),p_warehouse_id:form.warehouse,p_lines:clean.map(x=>({product_id:x.product_id,counted_quantity:Number(x.quantity)})),p_notes:form.note||null});if(r.error)throw r.error;
        } else {
          const type=form.type||"customer";
          const r=await supabase.rpc("create_stock_return",{p_company_id:companyId,p_return_number:form.number||"RET-"+Date.now(),p_return_type:type,p_warehouse_id:form.warehouse,p_customer_id:type==="customer"?(form.partner||null):null,p_supplier_id:type==="supplier"?(form.partner||null):null,p_lines:clean.map(x=>({product_id:x.product_id,quantity:Number(x.quantity),unit_price:Number(x.unit_price||0)})),p_reason:form.reason||null,p_notes:form.note||null});if(r.error)throw r.error;
        }
      }
      reset();setEditingId(null);await load();await onSaved();
    }catch(e:any){window.alert(e.message)}finally{setBusy(false)}
  }
  const productCost=products.reduce((n,p)=>n+Number(p.purchase_price||0)*Number(report.balances.filter((b:any)=>b.product_id===p.id).reduce((q:number,b:any)=>q+Number(b.quantity_on_hand||0),0)),0);
  const low=products.filter(p=>p.is_active).filter(p=>Number(report.balances.filter((b:any)=>b.product_id===p.id).reduce((q:number,b:any)=>q+Number(b.quantity_on_hand||0),0))<=Number(p.min_stock||0)).length;
  const salesTotal=report.sales.reduce((n:number,x:any)=>n+Number(x.total||0),0);
  const purchaseTotal=report.purchases.reduce((n:number,x:any)=>n+Number(x.subtotal||0),0);
  const expenseTotal=report.expenses.reduce((n:number,x:any)=>n+Number(x.amount||0),0);
  const grossMargin=report.sales.reduce((sum:number,sale:any)=>sum+(sale.sale_items||[]).reduce((lineSum:number,line:any)=>lineSum+Number(line.line_total||0)-Number(line.quantity||0)*Number(line.products?.purchase_price||0),0),0);
  const reportCards=[{title:t.sales,value:money(salesTotal)},{title:t.purchases,value:money(purchaseTotal)},{title:t.expenses,value:money(expenseTotal)},{title:t.margin,value:money(grossMargin)},{title:t.stockValue,value:money(productCost)},{title:t.low,value:String(low)},{title:t.customerReceipt,value:money(report.customerBalance)},{title:t.supplierPayment,value:money(report.supplierBalance)}];
  const reportBars=[{label:t.sales,value:salesTotal},{label:t.purchases,value:purchaseTotal},{label:t.expenses,value:expenseTotal}];
  function exportReport(){
    const csv=[["Indicateur","Valeur"],["Ventes",salesTotal],["Achats",purchaseTotal],["Dépenses",expenseTotal],["Marge brute estimée",grossMargin],["Valeur du stock",productCost],["Articles sous seuil",low],["Créances clients",report.customerBalance],["Dettes fournisseurs",report.supplierBalance]].map(row=>row.map(v=>'"'+String(v??"").replace(/"/g,'""')+'"').join(";")).join("\\r\\n");
    const blob=new Blob(["\\ufeff"+csv],{type:"text/csv;charset=utf-8"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="rapport-stock-"+start+"-"+end+".csv";a.click();URL.revokeObjectURL(url);
  }
  const locationsForWarehouse=locationRows.filter(x=>x.warehouse_id===form.warehouse);
  const lineEditor=<div className="ops-lines"><div className="ops-lines-head"><b>{t.product}</b><b>{t.qty}</b>{page!=="inventory"&&<b>{t.price}</b>}<span/></div>{lines.map((line,i)=><div className="ops-line" key={i}><select value={line.product_id} onChange={e=>updateLine(i,"product_id",e.target.value)} required><option value="">{t.choose} {t.product}</option>{products.filter(p=>p.is_active).map(p=><option key={p.id} value={p.id}>{p.name} · {p.sku}</option>)}</select><input type="number" min={page==="inventory"?"0":"0.001"} step="0.001" placeholder={t.qty} value={line.quantity} onChange={e=>updateLine(i,"quantity",e.target.value)} required/>{page!=="inventory"&&<input type="number" min="0" step="0.01" placeholder={t.price} value={line.unit_price} onChange={e=>updateLine(i,"unit_price",e.target.value)}/>}<button type="button" className="ops-icon-btn" onClick={()=>removeLine(i)} disabled={lines.length===1}><Trash2 size={15}/></button></div>)}<button type="button" className="ops-add-line" onClick={addLine}><Plus size={14}/>{t.addLine}</button></div>;
  if(page==="reports")return <section className="ops-wrap" dir={rtl?"rtl":"ltr"}><div className="panel"><div className="panel-head"><div><h3>{label||"Rapports & analyses"}</h3><p>{t.reportHint}</p></div><button type="button" className="secondary-btn" onClick={exportReport}>Exporter CSV</button></div><div className="ops-period"><label>{t.from}<input type="date" value={start} onChange={e=>setStart(e.target.value)}/></label><label>{t.to}<input type="date" value={end} onChange={e=>setEnd(e.target.value)}/></label></div><div className="ops-kpis">{reportCards.map(x=><div className="ops-kpi" key={x.title}><span>{x.title}</span><b>{x.value}</b></div>)}</div><div className="ops-comparison"><h4>Comparatif des opérations</h4>{reportBars.map(bar=><div className="ops-comparison-row" key={bar.label}><div><span>{bar.label}</span><b>{money(bar.value)}</b></div><div className="ops-comparison-track"><i style={{width:(Math.max(0,bar.value)/Math.max(1,...reportBars.map(x=>x.value))*100)+"%"}}/></div></div>)}</div><div className="ops-report-note"><BarChart3 size={18}/>{t.reportHint}</div></div></section>;
  return <section className="ops-wrap" dir={rtl?"rtl":"ltr"}>
    <div className="panel">
      <div className="panel-head"><div><h3>{label}</h3><p>{rows.length} enregistrement(s)</p></div>{page==="categories"&&canWrite&&<span className="status-pill">{editingId?"Modification":"Nouvelle catégorie"}</span>}</div>
      <form className="ops-form" onSubmit={submit}><fieldset className="ops-fieldset" disabled={!canWrite}>
        {page==="locations"&&<div className="ops-fields">
          <label>{t.warehouse}<select value={form.warehouse||""} onChange={e=>setForm({...form,warehouse:e.target.value})} required><option value="">—</option>{warehouses.map(w=><option key={w.id} value={w.id}>{w.name}</option>)}</select></label>
          <label>{t.locationCode}<input value={form.code||""} onChange={e=>setForm({...form,code:e.target.value.toUpperCase()})} required placeholder="A-01-02"/></label>
          <label>{t.name}<input value={form.name||""} onChange={e=>setForm({...form,name:e.target.value})} required/></label>
          <label>{t.locationType}<select value={form.location_type||"bin"} onChange={e=>setForm({...form,location_type:e.target.value})}><option value="zone">Zone</option><option value="aisle">Allée</option><option value="rack">Rack</option><option value="shelf">Étagère</option><option value="bin">Bac / Case</option><option value="receiving">Réception</option><option value="shipping">Expédition</option><option value="quarantine">Quarantaine</option><option value="returns">Retours</option></select></label>
          <label>{t.parent}<select value={form.parent||""} onChange={e=>setForm({...form,parent:e.target.value})}><option value="">— Racine —</option>{rows.filter(x=>x.warehouse_id===form.warehouse).map(x=><option key={x.id} value={x.id}>{x.code} · {x.name}</option>)}</select></label>
          <label>{t.capacity}<input type="number" min="0" step="0.01" value={form.capacity||""} onChange={e=>setForm({...form,capacity:e.target.value})}/></label>
          <label>Unité capacité<input value={form.capacity_unit||""} onChange={e=>setForm({...form,capacity_unit:e.target.value})} placeholder="Palette, m³, kg..."/></label>
          <label className="ops-wide">{t.note}<input value={form.note||""} onChange={e=>setForm({...form,note:e.target.value})}/></label>
        </div>}
        {page==="lots"&&<div className="ops-fields">
          <label>{t.product}<select value={form.product_id||""} onChange={e=>setForm({...form,product_id:e.target.value})} required><option value="">—</option>{products.map(p=><option key={p.id} value={p.id}>{p.sku} · {p.name}</option>)}</select></label>
          <label>{t.warehouse}<select value={form.warehouse||""} onChange={e=>setForm({...form,warehouse:e.target.value,location:""})} required><option value="">—</option>{warehouses.map(w=><option key={w.id} value={w.id}>{w.name}</option>)}</select></label>
          <label>{t.location}<select value={form.location||""} onChange={e=>setForm({...form,location:e.target.value})}><option value="">—</option>{locationsForWarehouse.map(x=><option key={x.id} value={x.id}>{x.code} · {x.name}</option>)}</select></label>
          <label>{t.lot}<input value={form.lot||""} onChange={e=>setForm({...form,lot:e.target.value})} required/></label>
          <label>{t.qty}<input type="number" min="0.001" step="0.001" value={form.quantity||""} onChange={e=>setForm({...form,quantity:e.target.value})} required/></label>
          <label>{t.price}<input type="number" min="0" step="0.01" value={form.unit_cost||"0"} onChange={e=>setForm({...form,unit_cost:e.target.value})}/></label>
          <label>{t.manufacture}<input type="date" value={form.manufacture||""} onChange={e=>setForm({...form,manufacture:e.target.value})}/></label>
          <label>{t.expiry}<input type="date" value={form.expiry||""} onChange={e=>setForm({...form,expiry:e.target.value})}/></label>
          <label>{t.supplier}<select value={form.supplier_id||""} onChange={e=>setForm({...form,supplier_id:e.target.value})}><option value="">—</option>{suppliers.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
          <label className="ops-wide">{t.note}<input value={form.note||""} onChange={e=>setForm({...form,note:e.target.value})}/></label>
        </div>}
        {page==="categories"&&<div className="ops-fields">
          <label>{t.categoryName}<input value={form.name||""} onChange={e=>setForm({...form,name:e.target.value})} required/></label>
          <label>{t.desc}<input value={form.description||""} onChange={e=>setForm({...form,description:e.target.value})}/></label>
          {editingId&&<button type="button" className="secondary-btn ops-wide" onClick={()=>{setEditingId(null);reset()}}><X size={14}/> {t.cancel}</button>}
        </div>}
        {page==="payments"&&<div className="ops-fields">
          <label>{t.transactionType}<select value={form.type||"customer_receipt"} onChange={e=>setForm({...form,type:e.target.value,document_id:""})}><option value="customer_receipt">{t.customerReceipt}</option>{["owner","admin","manager"].includes(role)&&<option value="supplier_payment">{t.supplierPayment}</option>}</select></label>
          <label>{t.linkedDocument}<select value={form.document_id||""} onChange={e=>setForm({...form,document_id:e.target.value})} required><option value="">{t.choose}</option>{(form.type==="supplier_payment"?purchases:sales).map((x:any)=><option key={x.id} value={x.id}>{form.type==="supplier_payment"?x.order_number:x.invoice_number} · {money(Number(form.type==="supplier_payment"?x.subtotal:x.total))}</option>)}</select></label>
          <label>{t.amount}<input type="number" min="0.01" step="0.01" value={form.amount||""} onChange={e=>setForm({...form,amount:e.target.value})} required/></label>
          <label>{t.method}<select value={form.method||"cash"} onChange={e=>setForm({...form,method:e.target.value})}><option value="cash">{t.cash}</option><option value="bank_transfer">{t.bankTransfer}</option><option value="card">{t.card}</option><option value="cheque">{t.cheque}</option><option value="other">{t.other}</option></select></label>
          <label>{t.date}<input type="date" value={form.date||new Date().toISOString().slice(0,10)} onChange={e=>setForm({...form,date:e.target.value})}/></label>
          <label>{t.reference}<input value={form.reference||""} onChange={e=>setForm({...form,reference:e.target.value})}/></label>
          <label className="ops-wide">{t.note}<input value={form.note||""} onChange={e=>setForm({...form,note:e.target.value})}/></label>
        </div>}
        {page==="expenses"&&<div className="ops-fields">
          <label>{t.number}<input value={form.number||""} onChange={e=>setForm({...form,number:e.target.value})} placeholder="EXP-0001"/></label>
          <label>{t.category}<select value={form.category||"General"} onChange={e=>setForm({...form,category:e.target.value})}><option>General</option><option>Transport</option><option>Maintenance</option><option>Rent</option><option>Utilities</option><option>Other</option></select></label>
          <label className="ops-wide">{t.desc}<input value={form.description||""} onChange={e=>setForm({...form,description:e.target.value})} required/></label>
          <label>{t.amount}<input type="number" min="0.01" step="0.01" value={form.amount||""} onChange={e=>setForm({...form,amount:e.target.value})} required/></label>
          <label>{t.date}<input type="date" value={form.date||new Date().toISOString().slice(0,10)} onChange={e=>setForm({...form,date:e.target.value})}/></label>
          <label>{t.method}<select value={form.method||""} onChange={e=>setForm({...form,method:e.target.value})}><option value="">—</option><option>Cash</option><option>Bank transfer</option><option>Card</option><option>Cheque</option></select></label>
          <label>{t.note}<input value={form.note||""} onChange={e=>setForm({...form,note:e.target.value})}/></label>
        </div>}
        {page==="transfers"&&<><div className="ops-fields">
          <label>{t.number}<input value={form.number||""} onChange={e=>setForm({...form,number:e.target.value})} placeholder="TRF-0001"/></label>
          <label>{t.source}<select value={form.source||""} onChange={e=>setForm({...form,source:e.target.value})} required><option value="">—</option>{warehouses.map(w=><option key={w.id} value={w.id}>{w.name}</option>)}</select></label>
          <label>{t.dest}<select value={form.dest||""} onChange={e=>setForm({...form,dest:e.target.value})} required><option value="">—</option>{warehouses.map(w=><option key={w.id} value={w.id}>{w.name}</option>)}</select></label>
          <label>{t.note}<input value={form.note||""} onChange={e=>setForm({...form,note:e.target.value})}/></label>
        </div>{lineEditor}</>}
        {page==="inventory"&&<><div className="ops-fields">
          <label>{t.number}<input value={form.number||""} onChange={e=>setForm({...form,number:e.target.value})} placeholder="INV-0001"/></label>
          <label>{t.warehouse}<select value={form.warehouse||""} onChange={e=>setForm({...form,warehouse:e.target.value})} required><option value="">—</option>{warehouses.map(w=><option key={w.id} value={w.id}>{w.name}</option>)}</select></label>
          <label className="ops-wide">{t.note}<input value={form.note||""} onChange={e=>setForm({...form,note:e.target.value})}/></label>
        </div><div className="ops-actions"><button type="button" className="secondary-btn" disabled={!form.warehouse||busy} onClick={()=>void loadWarehouseCountItems()}>Charger les articles du stock</button></div>{lineEditor}</>}
        {page==="returns"&&<><div className="ops-fields"><label>{t.number}<input value={form.number||""} onChange={e=>setForm({...form,number:e.target.value})} placeholder="RET-0001"/></label><label>{t.type}<select value={form.type||"customer"} onChange={e=>setForm({...form,type:e.target.value,partner:""})}><option value="customer">{t.customerReturn}</option><option value="supplier">{t.supplierReturn}</option></select></label><label>{t.warehouse}<select value={form.warehouse||""} onChange={e=>setForm({...form,warehouse:e.target.value})} required><option value="">—</option>{warehouses.map(w=><option key={w.id} value={w.id}>{w.name}</option>)}</select></label><label>{form.type==="supplier"?t.supplier:t.customer}<select value={form.partner||""} onChange={e=>setForm({...form,partner:e.target.value})}><option value="">—</option>{(form.type==="supplier"?suppliers:customers).map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label><label>{t.reason}<input value={form.reason||""} onChange={e=>setForm({...form,reason:e.target.value})}/></label><label>{t.note}<input value={form.note||""} onChange={e=>setForm({...form,note:e.target.value})}/></label></div>{lineEditor}</>}
        <div className="ops-actions"><button className="primary-btn" disabled={busy||loading||!canWrite}><Plus size={15}/>{busy?t.loading:t.save}</button></div>
      </fieldset>{!canWrite&&<p className="ops-readonly">Mode consultation · les modifications sont désactivées.</p>}</form>
    </div>
    <div className="panel"><div className="panel-head"><div><h3>{label} · Historique</h3><p>{rows.length} enregistrement(s)</p></div></div>{loading?<div className="ops-empty">{t.loading}</div>:rows.length===0?<div className="ops-empty">{t.empty}</div>:<div className="table-wrap"><table><thead><tr>{page==="locations"?<><th>{t.warehouse}</th><th>{t.locationCode}</th><th>{t.name}</th><th>{t.locationType}</th><th>{t.parent}</th><th>{t.capacity}</th></>:page==="lots"?<><th>{t.product}</th><th>{t.lot}</th><th>{t.warehouse}</th><th>{t.location}</th><th>{t.onHand}</th><th>{t.expiry}</th><th>Statut</th></>:page==="categories"?<><th>{t.name}</th><th>{t.desc}</th>{canWrite&&<th>{t.action}</th>}</>:page==="payments"?<><th>{t.date}</th><th>{t.transactionType}</th><th>{t.linkedDocument}</th><th>{t.method}</th><th>{t.amount}</th><th>{t.reference}</th></>:page==="expenses"?<><th>{t.number}</th><th>{t.category}</th><th>{t.desc}</th><th>{t.date}</th><th>{t.amount}</th></>:page==="transfers"?<><th>{t.number}</th><th>{t.source}</th><th>{t.dest}</th><th>{t.date}</th><th>{t.status}</th></>:page==="inventory"?<><th>{t.number}</th><th>{t.warehouse}</th><th>{t.date}</th><th>{t.status}</th><th>{t.diff}</th>{canWrite&&<th>Validation</th>}</>:<><th>{t.number}</th><th>{t.type}</th><th>{t.warehouse}</th><th>{t.date}</th><th>{t.status}</th></>}</tr></thead><tbody>{rows.map(r=><tr key={r.id}>{page==="locations"?<><td>{r.warehouses?.name||"—"}</td><td>{r.code}</td><td>{r.name}</td><td>{r.location_type}</td><td>{r.parent?.name||"—"}</td><td>{r.capacity??"—"} {r.capacity_unit||""}</td></>:page==="lots"?<><td>{r.products?.sku} · {r.products?.name}</td><td>{r.lot_number}</td><td>{r.warehouses?.name||"—"}</td><td>{r.storage_locations?`${r.storage_locations.code} · ${r.storage_locations.name}`:"—"}</td><td>{r.quantity_on_hand}</td><td>{r.expiry_date||"—"}</td><td><span className={"status-pill "+(r.status==="available"?"positive":"")}>{r.status}</span></td></>:page==="categories"?<><td>{r.name}</td><td>{r.description||"—"}</td>{canWrite&&<td><button type="button" className="ops-icon-btn" title="Modifier" onClick={()=>{setEditingId(r.id);setForm({name:r.name||"",description:r.description||""});window.scrollTo({top:0,behavior:"smooth"})}}><Pencil size={14}/></button></td>}</>:page==="payments"?<><td>{r.transaction_date}</td><td>{r.transaction_type==="customer_receipt"?t.customerReceipt:t.supplierPayment}</td><td>{r.sales?.invoice_number||r.purchase_orders?.order_number||"—"}</td><td>{r.payment_method}</td><td>{money(Number(r.amount))}</td><td>{r.reference||"—"}</td></>:page==="expenses"?<><td>{r.expense_number}</td><td>{r.category}</td><td>{r.description}</td><td>{r.expense_date}</td><td>{money(Number(r.amount))}</td></>:page==="transfers"?<><td>{r.transfer_number}</td><td>{r.source?.name||"—"}</td><td>{r.destination?.name||"—"}</td><td>{new Date(r.transfer_date).toLocaleDateString()}</td><td><span className={"status-pill "+(r.status==="completed"?"positive":r.status==="rejected"?"negative":"warning")}>{r.status}</span><small>{(r.stock_transfer_items||[]).map((it:any)=>`${it.products?.sku||it.products?.name}: ${it.received_quantity||0}/${it.quantity}`).join(" · ")}</small>{canApprove&&r.status==="draft"&&<button type="button" className="ops-icon-btn" disabled={busy} onClick={()=>void approveTransfer(r.id)}>Approuver</button>}{canTransfer&&r.status==="approved"&&<button type="button" className="ops-icon-btn" disabled={busy} onClick={()=>void dispatchTransfer(r.id)}>Expédier</button>}{canReceive&&["in_transit","partially_received"].includes(r.status)&&<button type="button" className="primary-btn" disabled={busy} onClick={()=>void receiveTransfer(r)}>Réceptionner</button>}</td></>:page==="inventory"?<><td>{r.count_number}</td><td>{r.warehouses?.name||"—"}</td><td>{new Date(r.count_date).toLocaleDateString()}</td><td>{r.status}</td><td>{(r.inventory_count_items||[]).reduce((n:number,x:any)=>n+Math.abs(Number(x.difference||0)),0)}</td>{canWrite&&<td>{r.status==="draft"&&canApprove?<button type="button" className="primary-btn" disabled={busy} onClick={()=>void approveCount(r.id)}>Valider & appliquer</button>:r.status==="draft"?"En attente de validation":"—"}</td>}</>:<><td>{r.return_number}</td><td>{r.return_type}</td><td>{r.warehouses?.name||"—"}</td><td>{new Date(r.return_date).toLocaleDateString()}</td><td>{r.status}</td></>}</tr>)}</tbody></table></div>}</div>
  </section>;
}
