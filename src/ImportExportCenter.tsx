import { useRef, useState } from "react";
import { Download, FileSpreadsheet, Upload, X, AlertCircle, CheckCircle2 } from "lucide-react";
import * as XLSX from "xlsx";
import { supabase } from "./lib/supabase";
type Lang="fr"|"en"|"ar";
type Field={key:string;required?:boolean};
type Dataset={id:string;label:string;table:string;fields:Field[];unique:string;group:string};
const datasets:Dataset[]=[
{id:"spare_parts",label:"Pièces détachées",table:"products",unique:"company_id,sku",group:"Catalogue",fields:[{key:"sku",required:true},{key:"name",required:true},{key:"unit"},{key:"purchase_price"},{key:"manufacturer"},{key:"part_number"},{key:"criticality"},{key:"site_code"},{key:"unit_code"},{key:"service_code"},{key:"department_code"},{key:"equipment_tag"},{key:"warehouse_code"},{key:"location_code"},{key:"initial_quantity"},{key:"min_stock"}]},
{id:"requests",label:"Demandes de sortie",table:"spare_part_requests",unique:"",group:"Demandes",fields:[{key:"requester_email",required:true},{key:"site_code"},{key:"unit_code"},{key:"service_code"},{key:"department_code"},{key:"equipment_tag"},{key:"work_order_reference"},{key:"priority"},{key:"required_date"},{key:"justification"},{key:"product_sku",required:true},{key:"quantity",required:true}]},
{id:"warehouses",label:"Entrepôts",table:"warehouses",unique:"company_id,code",group:"Stock",fields:[{key:"code",required:true},{key:"name",required:true},{key:"address"},{key:"site_code"},{key:"unit_code"},{key:"service_code"},{key:"department_code"},{key:"equipment_tag"}]},
{id:"locations",label:"Emplacements",table:"storage_locations",unique:"company_id,code,warehouse_id",group:"Stock",fields:[{key:"warehouse_code",required:true},{key:"parent_code"},{key:"code",required:true},{key:"name",required:true},{key:"location_type"},{key:"capacity"},{key:"capacity_unit"},{key:"note"}]},
{id:"movements",label:"Mouvements de stock",table:"stock_movements",unique:"",group:"Stock",fields:[{key:"product_sku",required:true},{key:"warehouse_code",required:true},{key:"movement_type",required:true},{key:"quantity",required:true},{key:"note"}]},
{id:"transfers",label:"Transferts inter-magasins",table:"stock_transfers",unique:"",group:"Stock",fields:[{key:"number"},{key:"source_warehouse_code",required:true},{key:"destination_warehouse_code",required:true},{key:"product_sku",required:true},{key:"quantity",required:true},{key:"unit_cost"},{key:"note"}]},
{id:"inventory",label:"Inventaires",table:"inventory_counts",unique:"",group:"Stock",fields:[{key:"number"},{key:"warehouse_code",required:true},{key:"product_sku",required:true},{key:"counted_quantity",required:true},{key:"note"}]}
];
const words={fr:{title:"Import / Export Excel",intro:"Téléchargez un modèle avec les en-têtes exacts, remplissez les lignes puis importez le fichier.",dataset:"Module",template:"Télécharger le modèle",export:"Exporter les données",import:"Importer Excel",required:"Champs obligatoires",done:"Lignes traitées",failed:"Lignes rejetées",close:"Fermer",note:"Gardez les noms des colonnes inchangés. Site_Code, Unit_Code et autres codes servent aux rattachements. Les imports mettent à jour les références existantes et ne suppriment aucune donnée.",noAccess:"Vous n'avez pas l'autorisation d'importer.",downloaded:"Fichier téléchargé."},en:{title:"Excel Import / Export",intro:"Download a template with exact column headers, fill it in, then import the workbook.",dataset:"Module",template:"Download template",export:"Export data",import:"Import Excel",required:"Required fields",done:"Rows processed",failed:"Rejected rows",close:"Close",note:"Keep column names unchanged. Site_Code, Unit_Code and similar codes link records. Imports update matching records and never delete data.",noAccess:"You do not have import permission.",downloaded:"File downloaded."},ar:{title:"استيراد / تصدير Excel",intro:"حمّل نموذجاً بعناوين أعمدة جاهزة، املأ البيانات ثم استورد الملف.",dataset:"الوحدة",template:"تحميل النموذج",export:"تصدير البيانات",import:"استيراد Excel",required:"الحقول الإجبارية",done:"الأسطر المعالجة",failed:"الأسطر المرفوضة",close:"إغلاق",note:"لا تغيّر أسماء الأعمدة. تُستخدم الأكواد لربط السجلات. يتم تحديث السجلات المتطابقة دون حذف البيانات.",noAccess:"ليست لديك صلاحية الاستيراد.",downloaded:"تم تحميل الملف."}};
const datasetLabel=(lang:Lang,id:string)=>({spare_parts:lang==="ar"?"قطع الغيار":lang==="en"?"Spare parts":"Pièces de rechange",requests:lang==="ar"?"طلبات الصرف":lang==="en"?"Issue requests":"Demandes de sortie",warehouses:lang==="ar"?"المخازن":lang==="en"?"Warehouses":"Entrepôts",locations:lang==="ar"?"مواقع التخزين":lang==="en"?"Storage locations":"Emplacements",movements:lang==="ar"?"حركات المخزون":lang==="en"?"Stock movements":"Mouvements de stock",transfers:lang==="ar"?"التحويلات بين المخازن":lang==="en"?"Inter-warehouse transfers":"Transferts inter-magasins",inventory:lang==="ar"?"الجرد":lang==="en"?"Stock counts":"Inventaires"} as Record<string,string>)[id]||id;
const groupLabel=(lang:Lang,id:string)=>id==="Catalogue"?(lang==="ar"?"الكتالوج":lang==="en"?"Catalogue":"Catalogue"):id==="Demandes"?(lang==="ar"?"الطلبات":lang==="en"?"Requests":"Demandes"):(lang==="ar"?"المخزون":lang==="en"?"Stock":"Stock");
const clean=(v:any)=>v===undefined||v===null||String(v).trim()===""?null:v;
const filename=(s:string)=>s.toLowerCase().replace(/[^a-z0-9_-]+/g,"_");
export default function ImportExportCenter({companyId,lang,canImport,onClose,onDone}:{companyId:string;lang:Lang;canImport:boolean;onClose:()=>void;onDone:()=>Promise<void>}){
 const t=words[lang],rtl=lang==="ar",fileRef=useRef<HTMLInputElement>(null);const [selected,setSelected]=useState("spare_parts"),[busy,setBusy]=useState(false),[message,setMessage]=useState(""),[errors,setErrors]=useState<string[]>([]);const ds=datasets.find(x=>x.id===selected)!;
 function makeFile(rows:any[],name:string){const wb=XLSX.utils.book_new();const data=[ds.fields.map(f=>f.key),...rows.map(r=>ds.fields.map(f=>r[f.key]??""))];XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(data),"Data");XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([["Instructions"],[t.note],[ "Module: "+datasetLabel(lang,ds.id)],["Required: "+ds.fields.filter(f=>f.required).map(f=>f.key).join(", ")]]),"Instructions");XLSX.writeFile(wb,name)}
 async function exportData(){if(!supabase)return;setBusy(true);try{
  const q=await supabase.from(ds.table).select(ds.id==="spare_parts"?"*, spare_part_details(*)":"*").eq("company_id",companyId).limit(10000);
  if(q.error)throw q.error;
  let rows:any[]=q.data??[];
  if(ds.id==="requests"){
   const z=await supabase.from("spare_part_requests").select("*, spare_part_request_items!spare_part_request_items_company_request_fk(requested_quantity,warehouse_id,notes,products:products!spare_part_request_items_company_product_fk(sku))").eq("company_id",companyId).limit(10000);if(z.error)throw z.error;
   const requesterResult=await supabase.rpc("list_spare_part_requesters",{p_company_id:companyId});if(requesterResult.error)throw requesterResult.error;
   const requesterRows=requesterResult.data||[];
   rows=(z.data||[]).flatMap((d:any)=>(d.spare_part_request_items||[]).map((it:any)=>({requester_email:requesterRows.find((u:any)=>u.user_id===d.requested_for_user_id)?.email||"",site_id:d.site_id,unit_id:d.unit_id,service_id:d.service_id,department_id:d.department_id,equipment_tag:d.equipment_tag,work_order_reference:d.work_order_reference,priority:d.priority,required_date:d.required_date,justification:d.justification,product_sku:it.products?.sku||"",quantity:it.requested_quantity})));
  }else if(ds.id==="purchases"){
   const z=await supabase.from("purchase_orders").select("*, suppliers(name), purchase_order_items!purchase_order_items_company_id_purchase_order_id_fkey(quantity,unit_cost,products:products!purchase_order_items_company_id_product_id_fkey(sku))").eq("company_id",companyId).limit(10000);if(z.error)throw z.error;
   rows=(z.data||[]).flatMap((d:any)=>(d.purchase_order_items||[]).map((it:any)=>({order_number:d.order_number,supplier_name:d.suppliers?.name||"",warehouse_id:d.warehouse_id,product_sku:it.products?.sku||"",quantity:it.quantity,unit_cost:it.unit_cost,note:d.notes})));
  }else if(ds.id==="sales"){
   const z=await supabase.from("sales").select("*, customers(name), sale_items!sale_items_company_id_sale_id_fkey(quantity,unit_price,discount,products:products!sale_items_company_id_product_id_fkey(sku))").eq("company_id",companyId).limit(10000);if(z.error)throw z.error;
   rows=(z.data||[]).flatMap((d:any)=>(d.sale_items||[]).map((it:any)=>({invoice_number:d.invoice_number,customer_name:d.customers?.name||"",warehouse_id:d.warehouse_id,product_sku:it.products?.sku||"",quantity:it.quantity,unit_price:it.unit_price,discount:it.discount,invoice_discount:d.discount,note:d.notes})));
  }else if(ds.id==="transfers"){
   const z=await supabase.from("stock_transfers").select("*, source:warehouses!stock_transfers_source_warehouse_id_fkey(code), destination:warehouses!stock_transfers_destination_warehouse_id_fkey(code), stock_transfer_items(quantity,unit_cost,products:products!stock_transfer_items_company_product_fk(sku))").eq("company_id",companyId).limit(10000);if(z.error)throw z.error;
   rows=(z.data||[]).flatMap((d:any)=>(d.stock_transfer_items||[]).map((it:any)=>({number:d.transfer_number,source_warehouse_code:d.source?.code||"",destination_warehouse_code:d.destination?.code||"",product_sku:it.products?.sku||"",quantity:it.quantity,unit_cost:it.unit_cost,note:d.notes})));
  }else if(ds.id==="inventory"){
   const z=await supabase.from("inventory_counts").select("*, warehouses(code), inventory_count_items!inventory_count_items_company_count_fk(counted_quantity,products:products!inventory_count_items_company_product_fk(sku))").eq("company_id",companyId).limit(10000);if(z.error)throw z.error;
   rows=(z.data||[]).flatMap((d:any)=>(d.inventory_count_items||[]).map((it:any)=>({number:d.count_number,warehouse_code:d.warehouses?.code||"",product_sku:it.products?.sku||"",counted_quantity:it.counted_quantity,note:d.notes})));
  }else if(ds.id==="returns"){
   const z=await supabase.from("stock_returns").select("*, warehouses(code), customers(name), suppliers(name), stock_return_items(quantity,unit_price,products:products!stock_return_items_company_product_fk(sku))").eq("company_id",companyId).limit(10000);if(z.error)throw z.error;
   rows=(z.data||[]).flatMap((d:any)=>(d.stock_return_items||[]).map((it:any)=>({number:d.return_number,return_type:d.return_type,warehouse_code:d.warehouses?.code||"",partner_name:d.return_type==="supplier"?d.suppliers?.name||"":d.customers?.name||"",product_sku:it.products?.sku||"",quantity:it.quantity,unit_price:it.unit_price,reason:d.reason,note:d.notes})));
  }
  if(ds.id==="spare_parts")rows=rows.map((r:any)=>{const d=Array.isArray(r.spare_part_details)?r.spare_part_details[0]:(r.spare_part_details||{});return {...r,...d};});
  const refsByDataset:Record<string,string[]>={units:["org_sites"],services:["org_sites","org_units"],departments:["org_sites","org_units","org_services"],equipment:["org_sites","org_units","org_services"],warehouses:["org_sites","org_units","org_services","org_departments","org_equipment"],locations:["warehouses","storage_locations"],lots:["products","warehouses","storage_locations","suppliers"],movements:["products","warehouses"],products:["product_categories"],spare_parts:["org_sites","org_units","org_services","org_departments","org_equipment","warehouses","storage_locations"],payments:["sales","purchase_orders"],purchases:["warehouses"],sales:["warehouses"],requests:["org_sites","org_units","org_services","org_departments"]};const refTables=refsByDataset[ds.id]||[];
  const refs:any={};
  for(const table of refTables){const z=await supabase.from(table).select("*").eq("company_id",companyId);if(z.error)throw z.error;refs[table]=z.data??[];}
  const byId=(table:string,id:any,field:string)=>refs[table]?.find((x:any)=>x.id===id)?.[field]||"";
  rows=rows.map((r:any)=>{
   const out={...r};
   out.site_code=out.site_code||byId("org_sites",r.site_id,"code");
   out.unit_code=out.unit_code||byId("org_units",r.unit_id,"code");
   out.service_code=out.service_code||byId("org_services",r.service_id,"code");
   out.department_code=out.department_code||byId("org_departments",r.department_id,"code");
   out.equipment_tag=out.equipment_tag||byId("org_equipment",r.equipment_id,"equipment_tag");
   out.warehouse_code=out.warehouse_code||byId("warehouses",r.warehouse_id,"code");
   out.source_warehouse_code=out.source_warehouse_code||byId("warehouses",r.source_warehouse_id,"code");
   out.destination_warehouse_code=out.destination_warehouse_code||byId("warehouses",r.destination_warehouse_id,"code");
   out.location_code=out.location_code||byId("storage_locations",r.storage_location_id||r.location_id,"code");
   out.parent_code=out.parent_code||byId("storage_locations",r.parent_id,"code");
   out.category_name=out.category_name||byId("product_categories",r.category_id,"name");
   out.product_sku=out.product_sku||byId("products",r.product_id,"sku");
   out.supplier_name=out.supplier_name||byId("suppliers",r.supplier_id,"name");
   if(ds.id==="expenses"){out.number=r.expense_number;out.date=r.expense_date;out.method=r.payment_method;out.note=r.notes;}
   if(ds.id==="payments"){out.type=r.transaction_type;out.document_number=r.transaction_type==="customer_receipt"?byId("sales",r.sale_id,"invoice_number"):byId("purchase_orders",r.purchase_order_id,"order_number");out.date=r.transaction_date;out.method=r.payment_method;out.note=r.notes;}
   if(ds.id==="lots"){out.lot=r.lot_number;out.quantity=r.quantity_on_hand;out.manufacture=r.manufacture_date;out.expiry=r.expiry_date;out.note=r.notes;}
   if(ds.id==="movements"){out.quantity=r.quantity;out.note=r.note;}
   if(ds.id==="requests"){out.site_code=out.site_code||byId("org_sites",r.site_id,"code");out.unit_code=out.unit_code||byId("org_units",r.unit_id,"code");out.service_code=out.service_code||byId("org_services",r.service_id,"code");out.department_code=out.department_code||byId("org_departments",r.department_id,"code");out.warehouse_code=out.warehouse_code||byId("warehouses",r.warehouse_id,"code");}
   if(ds.id==="locations")out.note=r.notes;
   return out;
  });
  makeFile(rows,"Export_"+filename(ds.id)+".xlsx");setMessage(t.downloaded);
 }catch(e:any){setMessage(e.message)}finally{setBusy(false)}}
 async function importFile(file:File){if(!supabase||!canImport){setMessage(t.noAccess);return}setBusy(true);setMessage("");setErrors([]);const problems:string[]=[];let ok=0;try{
 const wb=XLSX.read(await file.arrayBuffer(),{type:"array"}),sheet=wb.Sheets.Data||wb.Sheets[wb.SheetNames[0]];if(!sheet)throw new Error("Worksheet Data introuvable");const raw=XLSX.utils.sheet_to_json<Record<string,any>>(sheet,{defval:"",raw:false});if(!raw.length)throw new Error("Aucune ligne à importer");const rows=raw.map(r=>{const normalized=Object.fromEntries(Object.entries(r).map(([k,v])=>[String(k).trim().toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g,"").replace(/[\\s-]+/g,"_"),v]));if(ds.id==="equipment"){normalized.equipment_tag=normalized.equipment_tag||normalized.tag_equipement||normalized.equipement_tag||normalized.asset_tag||normalized.code_equipement||normalized.code||"";normalized.name=normalized.name||normalized.designation||normalized.equipement||"";normalized.site_code=normalized.site_code||normalized.site||normalized.code_site||"";}return normalized;});
 const get=(r:any,k:string)=>clean(r[k.toLowerCase()]);
 const lookup=async(table:string,field:string,val:any,parentField?:string,parentValue?:any)=>{if(!val)return null;let query=supabase!.from(table).select("id").eq("company_id",companyId).eq(field,String(val));if(parentField&&parentValue)query=query.eq(parentField,parentValue);const q=await query.maybeSingle();if(q.error)throw q.error;return q.data?.id||null};
 if(["purchases","sales","transfers","inventory","returns","requests"].includes(ds.id)){
  const keyField=ds.id==="purchases"?"order_number":ds.id==="sales"?"invoice_number":ds.id==="requests"?"__each_row__":"number";
  const grouped=new Map<string,any[]>();
  rows.forEach((row:any,index:number)=>{const key=ds.id==="requests"?"__single_"+index:String(get(row,keyField)||"").trim()||"__single_"+index;grouped.set(key,[...(grouped.get(key)||[]),row]);});
  let processed=0,groupIndex=0;
  for(const [docKey,items] of grouped){groupIndex++;try{
   for(const row of items)for(const f of ds.fields)if(f.required&&!get(row,f.key))throw new Error("Colonne obligatoire: "+f.key);
   const productLines=[] as any[];
   for(const row of items){const productId=await lookup("products","sku",get(row,"product_sku"));if(!productId)throw new Error("Article introuvable: "+get(row,"product_sku"));productLines.push({product_id:productId,quantity:Number(get(row,"quantity")??get(row,"counted_quantity")),unit_cost:Number(get(row,"unit_cost")||0),unit_price:Number(get(row,"unit_price")||0),discount:Number(get(row,"discount")||0),counted_quantity:Number(get(row,"counted_quantity"))});}
   const documentNo=docKey.startsWith("__single_")?"":docKey;
   if(ds.id==="requests"){
    const users=await supabase.rpc("list_spare_part_requesters",{p_company_id:companyId});if(users.error)throw users.error;
    const requester= (users.data||[]).find((u:any)=>String(u.email||"").toLowerCase()===String(get(items[0],"requester_email")||"").toLowerCase()||String(u.display_name||"").toLowerCase()===String(get(items[0],"requester_email")||"").toLowerCase());
    if(!requester)throw new Error("Demandeur introuvable ou non autorisé: "+get(items[0],"requester_email"));
    const siteCode=get(items[0],"site_code"),unitCode=get(items[0],"unit_code"),serviceCode=get(items[0],"service_code"),departmentCode=get(items[0],"department_code"),equipmentTag=get(items[0],"equipment_tag");
    const siteId=siteCode?await lookup("org_sites","code",siteCode):null;
    const unitId=unitCode?await lookup("org_units","code",unitCode,"site_id",siteId):null;
    const serviceId=serviceCode?await lookup("org_services","code",serviceCode,"site_id",siteId):null;
    const departmentId=departmentCode?await lookup("org_departments","code",departmentCode,"site_id",siteId):null;
    const equipmentId=equipmentTag?await lookup("org_equipment","equipment_tag",equipmentTag):null;
    const departmentRow=departmentId?await supabase.from("org_departments").select("name").eq("company_id",companyId).eq("id",departmentId).maybeSingle():{data:null,error:null};if(departmentRow.error)throw departmentRow.error;
    const requestLines=[] as any[];
    for(const row of items){const productId=await lookup("products","sku",get(row,"product_sku"));if(!productId)throw new Error("Article introuvable: "+get(row,"product_sku"));requestLines.push({product_id:productId,warehouse_id:null,quantity:Number(get(row,"quantity")),notes:null});}
    const requestNo="DP-IMPORT-"+new Date().toISOString().slice(0,10).replace(/-/g,"")+"-"+String(groupIndex).padStart(4,"0");const result=await supabase.rpc("create_spare_part_issue_request",{p_company_id:companyId,p_request_number:requestNo,p_lines:requestLines,p_requested_for:requester.display_name||requester.email,p_requested_for_user_id:requester.user_id,p_department:departmentRow.data?.name||"",p_work_order_reference:get(items[0],"work_order_reference"),p_equipment_tag:equipmentTag,p_priority:get(items[0],"priority")||"normal",p_required_date:get(items[0],"required_date"),p_justification:get(items[0],"justification"),p_site_id:siteId,p_unit_id:unitId,p_service_id:serviceId,p_department_id:departmentId,p_equipment_id:equipmentId});if(result.error)throw result.error;
   }else if(ds.id==="purchases"){
    const warehouseId=await lookup("warehouses","code",get(items[0],"warehouse_code"));if(!warehouseId)throw new Error("Entrepôt introuvable");
    const supplierId=await lookup("suppliers","name",get(items[0],"supplier_name"));
    const result=await supabase.rpc("receive_purchase_order",{p_company_id:companyId,p_supplier_id:supplierId,p_warehouse_id:warehouseId,p_order_number:documentNo||("CA-IMPORT-"+Date.now()+"-"+groupIndex),p_lines:productLines.map(x=>({product_id:x.product_id,quantity:x.quantity,unit_cost:x.unit_cost})),p_notes:get(items[0],"note")});if(result.error)throw result.error;
   }else if(ds.id==="sales"){
    const warehouseId=await lookup("warehouses","code",get(items[0],"warehouse_code"));if(!warehouseId)throw new Error("Entrepôt introuvable");
    const customerId=await lookup("customers","name",get(items[0],"customer_name"));
    const result=await supabase.rpc("create_stock_sale",{p_company_id:companyId,p_customer_id:customerId,p_warehouse_id:warehouseId,p_invoice_number:documentNo||("VTE-IMPORT-"+Date.now()+"-"+groupIndex),p_lines:productLines.map(x=>({product_id:x.product_id,quantity:x.quantity,unit_price:x.unit_price,discount:x.discount})),p_discount:Number(get(items[0],"invoice_discount")||0),p_notes:get(items[0],"note")});if(result.error)throw result.error;
   }else if(ds.id==="transfers"){
    const source=await lookup("warehouses","code",get(items[0],"source_warehouse_code")),dest=await lookup("warehouses","code",get(items[0],"destination_warehouse_code"));if(!source||!dest)throw new Error("Entrepôt source ou destination introuvable");
    const result=await supabase.rpc("create_stock_transfer",{p_company_id:companyId,p_transfer_number:documentNo||("TRF-IMPORT-"+Date.now()+"-"+groupIndex),p_source_warehouse_id:source,p_destination_warehouse_id:dest,p_lines:productLines.map(x=>({product_id:x.product_id,quantity:x.quantity,unit_cost:x.unit_cost})),p_notes:get(items[0],"note")});if(result.error)throw result.error;
   }else if(ds.id==="inventory"){
    const warehouseId=await lookup("warehouses","code",get(items[0],"warehouse_code"));if(!warehouseId)throw new Error("Entrepôt introuvable");
    const result=await supabase.rpc("create_inventory_count_draft",{p_company_id:companyId,p_count_number:documentNo||("INV-IMPORT-"+Date.now()+"-"+groupIndex),p_warehouse_id:warehouseId,p_lines:productLines.map(x=>({product_id:x.product_id,counted_quantity:x.counted_quantity})),p_notes:get(items[0],"note")});if(result.error)throw result.error;
   }else{
    const warehouseId=await lookup("warehouses","code",get(items[0],"warehouse_code"));if(!warehouseId)throw new Error("Entrepôt introuvable");
    const type=String(get(items[0],"return_type")||"customer"),partner=String(get(items[0],"partner_name")||"");
    const partnerId=partner?await lookup(type==="supplier"?"suppliers":"customers","name",partner):null;
    const result=await supabase.rpc("create_stock_return",{p_company_id:companyId,p_return_number:documentNo||("RET-IMPORT-"+Date.now()+"-"+groupIndex),p_return_type:type,p_warehouse_id:warehouseId,p_customer_id:type==="customer"?partnerId:null,p_supplier_id:type==="supplier"?partnerId:null,p_lines:productLines.map(x=>({product_id:x.product_id,quantity:x.quantity,unit_price:x.unit_price})),p_reason:get(items[0],"reason"),p_notes:get(items[0],"note")});if(result.error)throw result.error;
   }
   processed+=items.length;
  }catch(e:any){problems.push("Document "+(docKey.startsWith("__single_")?groupIndex:docKey)+": "+e.message);}
  }
  setMessage(t.done+": "+processed+"/"+rows.length);setErrors(problems);await onDone();return;
 }
 for(let i=0;i<rows.length;i++){const r=rows[i],line=i+2;try{
 for(const f of ds.fields)if(f.required&&!get(r,f.key))throw new Error("Colonne obligatoire: "+f.key);
 const payload:any={company_id:companyId};
 const refs=["site_code","unit_code","service_code","department_code","category_name","warehouse_code","location_code","parent_code","equipment_tag","product_sku","supplier_name","initial_quantity","number","date","method","note","type","document_number","lot","quantity","manufacture","expiry"];
 for(const f of ds.fields){if(refs.includes(f.key))continue;if((ds.id==="spare_parts"&&!["sku","name","unit","purchase_price","min_stock"].includes(f.key)))continue;const v=get(r,f.key);if(v!==null)payload[f.key]=["is_active","is_default","is_repairable","shelf_life_control","track_lots","track_serial_numbers"].includes(f.key)?(["true","1","yes","oui"].includes(String(v).toLowerCase())):v}
 if(["units","services","departments","equipment","warehouses"].includes(ds.id)){const v=get(r,"site_code");if(v){payload.site_id=await lookup("org_sites","code",v);if(!payload.site_id)throw new Error("Site_Code introuvable: "+v)}}
 if(["services","departments","equipment","warehouses"].includes(ds.id)){const v=get(r,"unit_code");if(v){payload.unit_id=await lookup("org_units","code",v,"site_id",payload.site_id);if(!payload.unit_id)throw new Error("Unit_Code introuvable: "+v)}}
 if(["departments","equipment","warehouses"].includes(ds.id)){for(const [key,table,field,col] of [["service_code","org_services","code","service_id"],["department_code","org_departments","code","department_id"]] as string[][]){const v=get(r,key);if(v){payload[col]=await lookup(table,field,v,key==="service_code"?"site_id":key==="department_code"?"site_id":undefined,payload.site_id);if(!payload[col])throw new Error(key+" introuvable: "+v)}}}
 if(ds.id==="equipment"){payload.equipment_tag=String(get(r,"equipment_tag")??"").trim();if(!payload.equipment_tag)throw new Error("equipment_tag obligatoire");payload.status="active";}
 if(ds.id==="warehouses"){const tag=get(r,"equipment_tag");if(tag){payload.equipment_id=await lookup("org_equipment","equipment_tag",tag);if(!payload.equipment_id)throw new Error("Équipement introuvable: "+tag);}}
 if(ds.id==="movements"){
  const productId=await lookup("products","sku",get(r,"product_sku"));
  const warehouseId=await lookup("warehouses","code",get(r,"warehouse_code"));
  if(!productId)throw new Error("Pièce introuvable: "+get(r,"product_sku"));
  if(!warehouseId)throw new Error("Entrepôt introuvable: "+get(r,"warehouse_code"));
  const movementType=String(get(r,"movement_type")||"");
  if(!["opening","adjustment_in","adjustment_out"].includes(movementType))throw new Error("Type de mouvement invalide: "+movementType);
  const {data:{user}}=await supabase.auth.getUser();
  const saved=await supabase.from("stock_movements").insert({company_id:companyId,product_id:productId,warehouse_id:warehouseId,movement_type:movementType,quantity:Number(get(r,"quantity")),note:get(r,"note"),created_by:user?.id||null});
  if(saved.error)throw saved.error;
 }else if(ds.id==="locations"){const v=get(r,"warehouse_code");payload.warehouse_id=await lookup("warehouses","code",v);if(!payload.warehouse_id)throw new Error("Warehouse_Code introuvable");const parent=get(r,"parent_code");if(parent){payload.parent_id=await lookup("storage_locations","code",parent,"warehouse_id",payload.warehouse_id);if(!payload.parent_id)throw new Error("Parent_Code introuvable: "+parent);}payload.notes=get(r,"note");payload.location_type=payload.location_type||"bin";}
 if(ds.id==="products"){
  const cat=get(r,"category_name");if(cat){const found=await supabase.from("product_categories").select("id").eq("company_id",companyId).eq("name",String(cat)).maybeSingle();if(found.error)throw found.error;if(!found.data?.id)throw new Error("Catégorie introuvable: "+cat);payload.category_id=found.data.id;}
  const saved=await supabase.from("products").upsert(payload,{onConflict:"company_id,sku"});if(saved.error)throw saved.error;
 }else if(ds.id==="spare_parts"){
  const saved=await supabase.from("products").upsert(payload,{onConflict:"company_id,sku"}).select("id").single();if(saved.error)throw saved.error;
  const excluded=["sku","name","barcode","description","unit","purchase_price","min_stock","category_name","initial_quantity","site_code","unit_code","service_code","department_code","warehouse_code","location_code"];
  const detail:any={company_id:companyId,product_id:saved.data.id,equipment_tag:get(r,"equipment_tag"),notes:get(r,"technical_specifications"),safety_stock:Number(payload.min_stock||0),reorder_point:Number(payload.min_stock||0)};
  for(const f of ds.fields){if(excluded.includes(f.key))continue;const v=get(r,f.key);if(v!==null)detail[f.key]=v;}
  for(const [key,table,field,col] of [["site_code","org_sites","code","site_id"],["unit_code","org_units","code","unit_id"],["service_code","org_services","code","service_id"],["department_code","org_departments","code","department_id"],["equipment_tag","org_equipment","equipment_tag","equipment_id"],["warehouse_code","warehouses","code","warehouse_id"],["location_code","storage_locations","code","storage_location_id"]] as string[][]){
   const v=get(r,key);if(v){detail[col]=await lookup(table,field,v,key==="unit_code"||key==="service_code"||key==="department_code"?"site_id":key==="location_code"?"warehouse_id":undefined,key==="unit_code"||key==="service_code"||key==="department_code"?detail.site_id:key==="location_code"?detail.warehouse_id:undefined);if(!detail[col])throw new Error(key+" introuvable: "+v);}
  }
  const d=await supabase.from("spare_part_details").upsert(detail,{onConflict:"company_id,product_id"});if(d.error)throw d.error;
  const qty=Number(get(r,"initial_quantity")||0);if(qty>0){if(!detail.warehouse_id||!detail.storage_location_id)throw new Error("Initial_Quantity exige Warehouse_Code et Location_Code");const stock=await supabase.rpc("register_opening_stock",{p_company_id:companyId,p_product_id:saved.data.id,p_warehouse_id:detail.warehouse_id,p_location_id:detail.storage_location_id,p_quantity:qty,p_unit_cost:Number(payload.purchase_price||0),p_note:"Import Excel - stock initial"});if(stock.error)throw stock.error;}

 }else{
 if(["units","services","departments"].includes(ds.id)&&!payload.site_id)throw new Error("Site_Code obligatoire");
 if(ds.id==="suppliers"||ds.id==="customers"){const existing=await supabase.from(ds.table).select("id").eq("company_id",companyId).eq("name",payload.name).maybeSingle();if(existing.error)throw existing.error;const saved=existing.data?await supabase.from(ds.table).update(payload).eq("company_id",companyId).eq("id",existing.data.id):await supabase.from(ds.table).insert(payload);if(saved.error)throw saved.error;}else{const saved=await supabase.from(ds.table).upsert(payload,{onConflict:ds.unique});if(saved.error)throw saved.error;}
 }
 ok++;
 }catch(e:any){problems.push("Ligne "+line+": "+e.message)}
 }
 setMessage(t.done+": "+ok+"/"+rows.length);setErrors(problems);await onDone();
 }catch(e:any){setMessage(e.message||"Import impossible")}finally{setBusy(false);if(fileRef.current)fileRef.current.value=""}}
 return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><section className="modal-card excel-modal" dir={rtl?"rtl":"ltr"}><div className="modal-head"><div><span className="eyebrow">GESTION STOCK PRO</span><h2><FileSpreadsheet size={20}/> {t.title}</h2><p>{t.intro}</p></div><button className="icon-btn" onClick={onClose}><X size={18}/></button></div>
 <label className="excel-label">{t.dataset}<select value={selected} onChange={e=>{setSelected(e.target.value);setMessage("");setErrors([])}}>{["Catalogue","Demandes","Stock"].map(g=><optgroup key={g} label={groupLabel(lang,g)}>{datasets.filter(d=>d.group===g).map(d=><option key={d.id} value={d.id}>{datasetLabel(lang,d.id)}</option>)}</optgroup>)}</select></label>
 <div className="excel-fields"><b>{lang==="ar"?"أعمدة الملف":lang==="en"?"File columns":"Colonnes du fichier"}</b><div>{ds.fields.map(f=><span key={f.key} className={f.required?"required":""}>{f.key}{f.required?" *":""}</span>)}</div></div>
 <p className="excel-note">{t.note}<br/><small>{t.required}: {ds.fields.filter(f=>f.required).map(f=>f.key).join(", ")||"—"}</small></p>
 <div className="excel-actions"><button className="secondary-btn" onClick={()=>makeFile([],"Modele_"+filename(ds.id)+".xlsx")} disabled={busy}><Download size={16}/>{t.template}</button><button className="secondary-btn" onClick={()=>void exportData()} disabled={busy}><Download size={16}/>{t.export}</button><button className="primary-btn" onClick={()=>fileRef.current?.click()} disabled={busy||!canImport}><Upload size={16}/>{t.import}</button><input ref={fileRef} type="file" accept=".xlsx,.xls" hidden onChange={e=>{const f=e.target.files?.[0];if(f)void importFile(f)}}/></div>
 {message&&<div className="excel-result"><CheckCircle2 size={16}/>{message}</div>}{errors.length>0&&<div className="excel-errors"><b>{t.failed} ({errors.length})</b>{errors.slice(0,12).map((x,i)=><div key={i}><AlertCircle size={13}/>{x}</div>)}{errors.length>12&&<small>+ {errors.length-12} autres erreurs</small>}</div>}
 <div className="modal-actions"><button className="secondary-btn" onClick={onClose}>{t.close}</button></div></section></div>
}
