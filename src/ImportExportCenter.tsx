import { useRef, useState } from "react";
import { Download, FileSpreadsheet, Upload, X, AlertCircle, CheckCircle2 } from "lucide-react";
import * as XLSX from "xlsx";
import { supabase } from "./lib/supabase";

type Lang = "fr" | "en" | "ar";
type Field = { key: string; required?: boolean };
type Dataset = { id: string; label: string; table: string; key: string; group: string; fields: Field[] };

const datasets: Dataset[] = [
  { id:"spare_parts", label:"Pièces de rechange", table:"products", key:"sku", group:"Catalogue", fields:[
    {key:"sku",required:true},{key:"name",required:true},{key:"unit"},{key:"category_name"},{key:"purchase_price"},{key:"manufacturer"},{key:"part_number"},{key:"criticality"},{key:"site_code"},{key:"unit_codes"},{key:"service_code"},{key:"department_code"},{key:"equipment_tag"},{key:"warehouse_code"},{key:"location_code"},{key:"initial_quantity"},{key:"min_stock"}
  ]},
  { id:"products", label:"Articles", table:"products", key:"sku", group:"Catalogue", fields:[
    {key:"sku",required:true},{key:"name",required:true},{key:"barcode"},{key:"description"},{key:"category_name"},{key:"unit"},{key:"purchase_price"},{key:"sale_price"},{key:"min_stock"},{key:"max_stock"},{key:"reorder_quantity"},{key:"lead_time_days"},{key:"track_lots"},{key:"track_serial_numbers"},{key:"weight"},{key:"volume"},{key:"is_active"}
  ]},
  { id:"categories", label:"Catégories", table:"product_categories", key:"name", group:"Catalogue", fields:[
    {key:"name",required:true},{key:"description"},{key:"parent_category"}
  ]},
  { id:"management", label:"Management", table:"org_managements", key:"code", group:"Organisation", fields:[
    {key:"code",required:true},{key:"name",required:true},{key:"description"},{key:"is_active"}
  ]},
  { id:"sites", label:"Sites", table:"org_sites", key:"code", group:"Organisation", fields:[
    {key:"code",required:true},{key:"name",required:true},{key:"management_code",required:true},{key:"address"},{key:"is_active"}
  ]},
  { id:"services", label:"Services", table:"org_services", key:"code", group:"Organisation", fields:[
    {key:"code",required:true},{key:"name",required:true},{key:"management_code",required:true},{key:"site_code"},{key:"description"},{key:"is_active"}
  ]},
  { id:"units", label:"Unités", table:"org_units", key:"code", group:"Organisation", fields:[
    {key:"code",required:true},{key:"name",required:true},{key:"site_code",required:true},{key:"service_code",required:true},{key:"description"},{key:"is_active"}
  ]},
  { id:"equipment", label:"Équipements", table:"org_equipment", key:"equipment_tag", group:"Organisation", fields:[
    {key:"equipment_tag",required:true},{key:"name",required:true},{key:"site_code",required:true},{key:"unit_code",required:true},{key:"service_code"},{key:"manufacturer"},{key:"model"},{key:"serial_number"},{key:"location"},{key:"status"},{key:"notes"},{key:"is_active"}
  ]},
  { id:"warehouses", label:"Entrepôts", table:"warehouses", key:"code", group:"Stock", fields:[
    {key:"code",required:true},{key:"name",required:true},{key:"address"},{key:"site_code"},{key:"unit_code"},{key:"service_code"},{key:"equipment_tag"},{key:"is_default"},{key:"is_active"}
  ]},
  { id:"locations", label:"Emplacements", table:"storage_locations", key:"code", group:"Stock", fields:[
    {key:"warehouse_code",required:true},{key:"code",required:true},{key:"name",required:true},{key:"parent_code"},{key:"location_type"},{key:"capacity"},{key:"capacity_unit"},{key:"note"},{key:"is_active"}
  ]}
];

const words = {
 fr:{title:"Import / Export Excel",intro:"Téléchargez le modèle exact du module, remplissez les colonnes puis importez votre fichier.",dataset:"Module",template:"Télécharger le modèle Excel",export:"Exporter les données",import:"Importer le fichier rempli",required:"Champs obligatoires",done:"Lignes importées",failed:"Erreurs détectées",close:"Fermer",note:"Ne modifiez pas les noms des colonnes. Les codes permettent de rattacher les enregistrements. Les lignes existantes sont mises à jour selon leur clé, sans suppression.",noAccess:"Vous n'avez pas l'autorisation d'importer.",downloaded:"Fichier téléchargé.",refs:"Références disponibles",empty:"Aucune donnée à exporter.",invalid:"Colonne inconnue ou fichier non conforme.",success:"Import terminé.",line:"Ligne",groupCatalogue:"Catalogue",groupOrganisation:"Organisation",groupStock:"Stock",help:"Les feuilles « Instructions » et « Références » expliquent les champs et donnent les codes existants."},
 en:{title:"Excel Import / Export",intro:"Download the exact module template, fill in the columns, then import your workbook.",dataset:"Module",template:"Download Excel template",export:"Export data",import:"Import completed file",required:"Required fields",done:"Imported rows",failed:"Detected errors",close:"Close",note:"Do not rename columns. Codes link related records. Existing rows are updated using their key; no data is deleted.",noAccess:"You do not have import permission.",downloaded:"File downloaded.",refs:"Available references",empty:"No data to export.",invalid:"Unknown column or invalid workbook.",success:"Import completed.",line:"Row",groupCatalogue:"Catalogue",groupOrganisation:"Organization",groupStock:"Stock",help:"The Instructions and References sheets explain fields and list existing codes."},
 ar:{title:"استيراد / تصدير Excel",intro:"حمّل نموذج الوحدة الصحيح، املأ الأعمدة ثم استورد الملف.",dataset:"الوحدة",template:"تحميل نموذج Excel",export:"تصدير البيانات",import:"استيراد الملف",required:"الحقول الإجبارية",done:"الأسطر المستوردة",failed:"الأخطاء",close:"إغلاق",note:"لا تغيّر أسماء الأعمدة. تُستخدم الرموز لربط البيانات. يتم تحديث السجلات الموجودة دون حذف أي بيانات.",noAccess:"ليست لديك صلاحية الاستيراد.",downloaded:"تم تحميل الملف.",refs:"المراجع المتاحة",empty:"لا توجد بيانات للتصدير.",invalid:"عمود غير معروف أو ملف غير صالح.",success:"اكتمل الاستيراد.",line:"السطر",groupCatalogue:"الكتالوج",groupOrganisation:"التنظيم",groupStock:"المخزون",help:"تشرح ورقتا التعليمات والمراجع الحقول وتعرضان الرموز الموجودة."}
};
const clean=(v:any)=>v===undefined||v===null||String(v).trim()===""?null:v;
const fileName=(s:string)=>s.toLowerCase().replace(/[^a-z0-9_-]+/g,"_");
const boolFields=new Set(["is_active","is_default","track_lots","track_serial_numbers","is_repairable","shelf_life_control"]);
const numericFields=new Set(["purchase_price","sale_price","min_stock","max_stock","reorder_quantity","lead_time_days","weight","volume","shelf_life_months","safety_stock","reorder_point","purchase_pack_quantity","warranty_months" ,"capacity"]);
const normalize=(v:any)=>String(v??"").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[\s-]+/g,"_");

export default function ImportExportCenter({companyId,lang,canImport,onClose,onDone}:{companyId:string;lang:Lang;canImport:boolean;onClose:()=>void;onDone:()=>Promise<void>}){
 const t=words[lang],rtl=lang==="ar",fileRef=useRef<HTMLInputElement>(null);
 const [selected,setSelected]=useState("spare_parts"),[busy,setBusy]=useState(false),[message,setMessage]=useState(""),[errors,setErrors]=useState<string[]>([]);
 const ds=datasets.find(x=>x.id===selected)!;
 const groups=[{id:"Catalogue",label:t.groupCatalogue},{id:"Organisation",label:t.groupOrganisation},{id:"Stock",label:t.groupStock}];
 const getRows=async(table:string)=>{const q=await supabase!.from(table).select("*").eq("company_id",companyId).limit(10000);if(q.error)throw q.error;return q.data||[]};
 const refsFor=async()=>{
   const required:Record<string,string[]>={spare_parts:["product_categories","org_sites","org_units","org_services","org_equipment","warehouses","storage_locations"],products:["product_categories"],categories:["product_categories"],management:[],sites:["org_managements"],services:["org_managements","org_sites"],units:["org_sites","org_services"],equipment:["org_sites","org_units","org_services"],warehouses:["org_sites","org_units","org_services","org_equipment"],locations:["warehouses","storage_locations"]};
   const tables=required[selected]||[];
   const out:any={};for(const table of tables)out[table]=await getRows(table);return out;
 };
 const refSheets=(refs:any)=>{
   const rows:any[][]=[["Type","Code / Nom","Désignation","Parent"]];
   const add=(type:string,items:any[],code:string,parent="")=>(items||[]).forEach(x=>rows.push([type,x[code]||x.name||"",x.name||"",parent?x[parent]||"": ""]));
   add("Management",refs.org_managements,"code");add("Site",refs.org_sites,"code");add("Service",refs.org_services,"code");add("Unité",refs.org_units,"code");add("Équipement",refs.org_equipment,"equipment_tag");add("Entrepôt",refs.warehouses,"code");add("Emplacement",refs.storage_locations,"code");add("Catégorie",refs.product_categories,"name");
   return rows;
 };
 const template=async()=>{
  if(!supabase)return;setBusy(true);setMessage("");try{
   const refs=await refsFor(),wb=XLSX.utils.book_new();
   const sample=[ds.fields.map(f=>f.key),ds.fields.map(()=> "")];
   XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(sample),"Data");
   const instructions=[["INSTRUCTIONS / INSTRUCTIONS"],["Module",ds.label],["Table",ds.table],["Clé de mise à jour",ds.key],["Champs obligatoires",ds.fields.filter(f=>f.required).map(f=>f.key).join(", ")||"Aucun"],["Règles","Ne pas modifier les en-têtes. Une ligne = un enregistrement."],["Relations","Utiliser les codes exacts affichés dans la feuille Références."],["Import","Les lignes sont traitées séparément. Les lignes existantes sont mises à jour. Aucune suppression."],["Valeurs booléennes","true / false"],["Nombres","Utiliser des nombres, sans unité ni séparateur de milliers."],["Date","Format YYYY-MM-DD si un champ date est proposé."]];
   XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(instructions),"Instructions");
   XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(refSheets(refs)),"Références");
   XLSX.writeFile(wb,"Modele_"+fileName(ds.id)+".xlsx");setMessage(t.downloaded);
  }catch(e:any){setMessage(e.message||"Erreur")}finally{setBusy(false)}
 };
 const exportData=async()=>{
  if(!supabase)return;setBusy(true);setMessage("");try{
   const rows=await getRows(ds.table);let out:any[]=[];
   const refs=await refsFor();
   const name=(table:string,id:any,field="code")=>refs[table]?.find((x:any)=>x.id===id)?.[field]||"";
   if(ds.id==="spare_parts"){
    const detail=await getRows("spare_part_details"),map=new Map(detail.map((x:any)=>[x.product_id,x]));
    const assignments=await getRows("spare_part_unit_assignments");
    const spareProductIds=new Set(detail.map((x:any)=>x.product_id));
    out=rows.filter((p:any)=>spareProductIds.has(p.id)).map((p:any)=>{const d:any=map.get(p.id)||{};const unitIds=assignments.filter((a:any)=>a.product_id===p.id).map((a:any)=>a.unit_id);const unitCodes=unitIds.map((id:any)=>name("org_units",id)).filter(Boolean);return {sku:p.sku,name:p.name,unit:p.unit,category_name:name("product_categories",p.category_id,"name"),purchase_price:p.purchase_price,manufacturer:d.manufacturer||"",part_number:d.part_number||d.manufacturer_reference||"",criticality:d.criticality||"medium",site_code:name("org_sites",d.site_id),unit_codes:unitCodes.join("; "),service_code:name("org_services",d.service_id),equipment_tag:d.equipment_tag||"",warehouse_code:name("warehouses",d.warehouse_id),location_code:name("storage_locations",d.storage_location_id),initial_quantity:"",min_stock:p.min_stock??0};});
   }else if(ds.id==="management")out=rows;
   else if(ds.id==="products")out=rows.map((p:any)=>({...p,category_name:name("product_categories",p.category_id,"name")}));
   else if(ds.id==="categories")out=rows.map((x:any)=>({...x,parent_category:name("product_categories",x.parent_id,"name")}));
   else if(ds.id==="services")out=rows.map((x:any)=>({...x,management_code:name("org_managements",x.management_id)}));
   else if(ds.id==="sites")out=rows.map((x:any)=>({...x,service_code:name("org_services",x.service_id)}));
   else if(["sites","services","units","equipment","warehouses"].includes(ds.id))out=rows.map((x:any)=>({...x,site_code:name("org_sites",x.site_id),unit_code:name("org_units",x.unit_id),service_code:name("org_services",x.service_id),department_code:name("org_departments",x.department_id),equipment_tag:x.equipment_tag||name("org_equipment",x.equipment_id,"equipment_tag")}));
   else if(ds.id==="locations")out=rows.map((x:any)=>({...x,warehouse_code:name("warehouses",x.warehouse_id),parent_code:name("storage_locations",x.parent_id),note:x.notes}));
   const data=[ds.fields.map(f=>f.key),...out.map(r=>ds.fields.map(f=>r[f.key]??""))];
   const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(data),"Data");XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([["Export"],["Module",ds.label],["Rows",out.length],["Exported at",new Date().toISOString()]]),"Instructions");
   XLSX.writeFile(wb,"Export_"+fileName(ds.id)+".xlsx");setMessage(out.length?t.done+": "+out.length:t.empty);
  }catch(e:any){setMessage(e.message||"Export impossible")}finally{setBusy(false)}
 };
 const importFile=async(file:File)=>{
  if(!supabase||!canImport){setMessage(t.noAccess);return}setBusy(true);setMessage("");setErrors([]);
  const issues:string[]=[];let success=0;
  try{
   const wb=XLSX.read(await file.arrayBuffer(),{type:"array"}),sheet=wb.Sheets.Data||wb.Sheets[wb.SheetNames[0]];if(!sheet)throw new Error("Feuille Data introuvable");
   const raw=XLSX.utils.sheet_to_json<Record<string,any>>(sheet,{defval:"",raw:false});if(!raw.length)throw new Error("Aucune ligne à importer");
   const rows=raw.map(row=>Object.fromEntries(Object.entries(row).map(([k,v])=>[normalize(k),v])));
   const allowed=new Set(ds.fields.map(f=>f.key));const headers=Object.keys(rows[0]||{});const unknown=headers.filter(h=>!allowed.has(h));if(unknown.length)throw new Error(t.invalid+" : "+unknown.join(", "));
   const refs=await refsFor();
   const lookup=(table:string,field:string,value:any,parentField?:string,parentValue?:any)=>{
    if(!value)return null;const matches=(refs[table]||[]).filter((x:any)=>String(x[field]??"").trim().toLowerCase()===String(value).trim().toLowerCase()&&(!parentField||!parentValue||x[parentField]===parentValue));
    if(matches.length>1)throw new Error("Référence ambiguë : "+value);return matches[0]?.id||null;
   };
   const value=(r:any,k:string)=>clean(r[k]);
   const resolveScope=(r:any,p:any)=>{
    const management=value(r,"management_code"),site=value(r,"site_code"),unit=value(r,"unit_code"),service=value(r,"service_code"),tag=value(r,"equipment_tag");
    if(site){p.site_id=lookup("org_sites","code",site);if(!p.site_id)throw new Error("Site_Code introuvable: "+site);}
    if(unit){p.unit_id=lookup("org_units","code",unit,"site_id",p.site_id);if(!p.unit_id)throw new Error("Unit_Code introuvable ou hors site: "+unit);}
    if(service){p.service_id=lookup("org_services","code",service);if(!p.service_id)throw new Error("Service_Code introuvable: "+service);}
    if(department){p.department_id=lookup("org_departments","code",department,"site_id",p.site_id);if(!p.department_id)throw new Error("Department_Code introuvable ou hors site: "+department);}
    if(tag){p.equipment_id=lookup("org_equipment","equipment_tag",tag);if(!p.equipment_id)throw new Error("Equipment_Tag introuvable: "+tag);p.equipment_tag=tag;}
   };
   const saveByKey=async(table:string,key:string,payload:any,extra?:{field?:string;value?:any})=>{
    let q=supabase!.from(table).select("id").eq("company_id",companyId).eq(key,payload[key]);if(extra?.field&&extra.value)q=q.eq(extra.field,extra.value);
    const found=await q.maybeSingle();if(found.error)throw found.error;
    const saved=found.data?await supabase!.from(table).update(payload).eq("company_id",companyId).eq("id",found.data.id):await supabase!.from(table).insert(payload);
    if(saved.error)throw saved.error;return found.data?.id||null;
   };
   for(let i=0;i<rows.length;i++){
    const r=rows[i],line=i+2;try{
     for(const f of ds.fields)if(f.required&&!value(r,f.key))throw new Error("Champ obligatoire: "+f.key);
     const p:any={company_id:companyId};
     for(const f of ds.fields){if(["category_name","parent_category","management_code","service_code","site_code","unit_code","unit_codes","equipment_tag","warehouse_code","location_code","parent_code","initial_quantity"].includes(f.key))continue;if(ds.id==="spare_parts"&&!["sku","name","unit","purchase_price","min_stock"].includes(f.key))continue;const v=value(r,f.key);if(v!==null){if(boolFields.has(f.key))p[f.key]=["true","1","yes","oui","vrai"].includes(String(v).toLowerCase());else if(numericFields.has(f.key)){const n=Number(String(v).replace(",","."));if(!Number.isFinite(n))throw new Error("Valeur numérique invalide: "+f.key);p[f.key]=n;}else p[f.key]=v;}}
     let id:string|null=null;
     if(ds.id==="categories"){
      const parent=value(r,"parent_category");if(parent){p.parent_id=lookup("product_categories","name",parent);if(!p.parent_id)throw new Error("Catégorie parente introuvable: "+parent);}
      id=await saveByKey(ds.table,ds.key,p);
     }else if(ds.id==="products"||ds.id==="spare_parts"){
      const cat=value(r,"category_name");if(cat){p.category_id=lookup("product_categories","name",cat);if(!p.category_id)throw new Error("Catégorie introuvable: "+cat);}
      const product=await supabase!.from("products").select("id").eq("company_id",companyId).eq("sku",p.sku).maybeSingle();if(product.error)throw product.error;
      const saved=product.data?await supabase!.from("products").update(p).eq("company_id",companyId).eq("id",product.data.id).select("id").single():await supabase!.from("products").insert(p).select("id").single();if(saved.error)throw saved.error;id=saved.data.id;
      if(ds.id==="spare_parts"){
       const d:any={company_id:companyId,product_id:id};
       const detailFields=ds.fields.filter(f=>!["sku","name","unit","purchase_price","min_stock","category_name","site_code","unit_code","unit_codes","service_code","department_code","equipment_tag","warehouse_code","location_code","initial_quantity"].includes(f.key));
       for(const f of detailFields){const v=value(r,f.key);if(v!==null){if(f.key==="criticality"){const raw=String(v).trim().toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g,"");const criticalityMap:Record<string,string>={low:"low",faible:"low",basse:"low",moyenne:"medium",medium:"medium",moderee:"medium",moderate:"medium",high:"high",haute:"high",elevee:"high",elevée:"high",critical:"critical",critique:"critical",trescritique:"critical","très critique":"critical"};const mapped=criticalityMap[raw];if(!mapped)throw new Error("Criticité invalide: "+v+". Valeurs acceptées: Faible, Moyenne, Haute, Critique.");d.criticality=mapped;}else if(boolFields.has(f.key))d[f.key]=["true","1","yes","oui","vrai"].includes(String(v).toLowerCase());else if(numericFields.has(f.key)){const n=Number(String(v).replace(",","."));if(!Number.isFinite(n))throw new Error("Valeur numérique invalide: "+f.key);d[f.key]=n;}else d[f.key]=v;}}
       if(!d.criticality)d.criticality="medium";
       resolveScope(r,d);
       const unitCodes=String(value(r,"unit_codes")||"").split(/[;,]/).map((x:string)=>x.trim()).filter(Boolean);
       const unitIds=[...new Set(unitCodes.map((code:string)=>{const found=lookup("org_units","code",code,"site_id",d.site_id);if(!found)throw new Error("Unité introuvable ou hors site: "+code);return found;}))];
       if(unitIds.length)d.unit_id=unitIds[0];
       const warehouse=value(r,"warehouse_code");if(warehouse){d.warehouse_id=lookup("warehouses","code",warehouse);if(!d.warehouse_id)throw new Error("Warehouse_Code introuvable: "+warehouse);}
       const loc=value(r,"location_code");if(loc){d.storage_location_id=lookup("storage_locations","code",loc,"warehouse_id",d.warehouse_id);if(!d.storage_location_id)throw new Error("Location_Code introuvable: "+loc);}
       const currentDetail=await supabase!.from("spare_part_details").select("id").eq("company_id",companyId).eq("product_id",id).maybeSingle();if(currentDetail.error)throw currentDetail.error;
       const det=currentDetail.data?await supabase!.from("spare_part_details").update(d).eq("company_id",companyId).eq("product_id",id):await supabase!.from("spare_part_details").insert(d);if(det.error)throw det.error;
       if(unitCodes.length){const desired=[...unitIds];let remove=supabase!.from("spare_part_unit_assignments").delete().eq("company_id",companyId).eq("product_id",id);if(desired.length)remove=remove.not("unit_id","in",`(${desired.join(",")})`);const removed=await remove;if(removed.error)throw removed.error;const assigned=await supabase!.from("spare_part_unit_assignments").upsert(desired.map((unit_id:string)=>({company_id:companyId,product_id:id,unit_id})),{onConflict:"company_id,product_id,unit_id"});if(assigned.error)throw assigned.error;}
       const initialQuantity=Number(value(r,"initial_quantity")||0);if(initialQuantity>0&&!product.data){if(!d.warehouse_id||!d.storage_location_id)throw new Error("Entrepôt et emplacement précis obligatoires pour la quantité initiale.");const opening=await supabase!.rpc("register_opening_stock",{p_company_id:companyId,p_product_id:id,p_warehouse_id:d.warehouse_id,p_location_id:d.storage_location_id,p_quantity:initialQuantity,p_unit_cost:Number(p.purchase_price||0),p_note:"Stock initial importé avec la fiche pièce"});if(opening.error)throw opening.error;}
      }
     }else if(ds.id==="management"){
      id=await saveByKey(ds.table,ds.key,p);
     }else if(ds.id==="services"){
      const m=value(r,"management_code");const managementId=lookup("org_managements","code",m);if(!managementId)throw new Error("Management_Code introuvable: "+m);p.management_id=managementId;id=await saveByKey(ds.table,ds.key,p);
     }else if(ds.id==="sites"){
      const service=value(r,"service_code");if(service){p.service_id=lookup("org_services","code",service);if(!p.service_id)throw new Error("Service_Code introuvable: "+service);}id=await saveByKey(ds.table,ds.key,p);
     }else if(["sites","services","units","equipment","warehouses"].includes(ds.id)){
      resolveScope(r,p);
      if(["units","equipment"].includes(ds.id)&&!p.site_id)throw new Error("Site_Code obligatoire.");
      if(ds.id==="equipment"){p.status=p.status||"active";p.is_active=p.is_active??true;}
      id=await saveByKey(ds.table,ds.key,p);
     }else if(ds.id==="locations"){
      const wh=value(r,"warehouse_code");p.warehouse_id=lookup("warehouses","code",wh);if(!p.warehouse_id)throw new Error("Warehouse_Code introuvable: "+wh);
      const parent=value(r,"parent_code");if(parent){p.parent_id=lookup("storage_locations","code",parent,"warehouse_id",p.warehouse_id);if(!p.parent_id)throw new Error("Parent_Code introuvable: "+parent);}
      p.notes=p.note??null;delete p.note;id=await saveByKey(ds.table,ds.key,p,{field:"warehouse_id",value:p.warehouse_id});
     }
     success++;
    }catch(e:any){issues.push(t.line+" "+line+" : "+(e.message||"Erreur inconnue"));}
   }
   setMessage(t.success+" "+t.done+": "+success+"/"+rows.length);setErrors(issues);await onDone();
  }catch(e:any){setMessage(e.message||"Import impossible");}
  finally{setBusy(false);if(fileRef.current)fileRef.current.value="";}
 };
 return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><section className="modal-card excel-modal" dir={rtl?"rtl":"ltr"}>
  <div className="modal-head"><div><span className="eyebrow">GESTION STOCK PRO</span><h2><FileSpreadsheet size={20}/> {t.title}</h2><p>{t.intro}</p></div><button className="icon-btn" onClick={onClose}><X size={18}/></button></div>
  <label className="excel-label">{t.dataset}<select value={selected} onChange={e=>{setSelected(e.target.value);setMessage("");setErrors([])}}>{groups.map(g=><optgroup key={g.id} label={g.label}>{datasets.filter(d=>d.group===g.id).map(d=><option key={d.id} value={d.id}>{d.label}</option>)}</optgroup>)}</select></label>
  <div className="excel-fields"><b>{lang==="ar"?"أعمدة الملف":lang==="en"?"File columns":"Colonnes du fichier"}</b><div>{ds.fields.map(f=><span key={f.key} className={f.required?"required":""}>{f.key}{f.required?" *":""}</span>)}</div></div>
  <p className="excel-note">{t.note}<br/><small>{t.required}: {ds.fields.filter(f=>f.required).map(f=>f.key).join(", ")||"—"}</small><br/><small>{t.help}</small></p>
  <div className="excel-actions"><button className="excel-action-btn excel-template-btn" disabled={busy} onClick={template}><Download size={18}/><span>{t.template}</span></button><button className="excel-action-btn excel-export-btn" disabled={busy} onClick={exportData}><FileSpreadsheet size={18}/><span>{t.export}</span></button>{canImport&&<><input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" hidden onChange={e=>{const f=e.target.files?.[0];if(f)void importFile(f)}}/><button className="excel-action-btn excel-import-btn" disabled={busy} onClick={()=>fileRef.current?.click()}><Upload size={18}/><span>{t.import}</span></button></>}</div>
  {message&&<div className="excel-result"><CheckCircle2 size={17}/><span>{message}</span></div>}
  {errors.length>0&&<div className="excel-errors"><div><AlertCircle size={17}/>{t.failed}: {errors.length}</div><ul>{errors.slice(0,100).map((e,i)=><li key={i}>{e}</li>)}</ul></div>}
  <div className="modal-foot"><button className="btn-secondary" onClick={onClose}>{t.close}</button></div>
 </section></div>;
}
