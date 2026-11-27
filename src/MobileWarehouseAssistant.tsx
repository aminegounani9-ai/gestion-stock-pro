import { useEffect, useMemo, useRef, useState } from "react";
import { Activity, Camera, CheckCircle2, ClipboardList, PackageCheck, Search, Smartphone, Warehouse, X } from "lucide-react";
import SpareParts from "./SpareParts";
import ModalPortal from "./ModalPortal";
import { BrowserMultiFormatReader } from "@zxing/browser";
import "./MobileWarehouseAssistant.css";

type Props = {
  companyId:string; products:any[]; categories:any[]; warehouses:any[]; suppliers:any[];
  myScopes?:any[]; role:string; access:any; lang:"fr"|"en"|"ar"; searchTerm?:string;
  initialEquipmentId?:string|null; initialProductId?:string|null; onSaved:()=>Promise<void>;
};

export default function MobileWarehouseAssistant(props:Props) {
  const {lang,products,warehouses,access}=props;
  const [scanOpen,setScanOpen]=useState(false);
  const [scanError,setScanError]=useState("");
  const [scanValue,setScanValue]=useState("");
  const [manualSearch,setManualSearch]=useState("");
  const [selectedProductId,setSelectedProductId]=useState<string|null>(props.initialProductId||null);
  const videoRef=useRef<HTMLVideoElement|null>(null);
  const streamRef=useRef<MediaStream|null>(null);
  const zxingRef=useRef<BrowserMultiFormatReader|null>(null);
  const [scanKey,setScanKey]=useState(0);
  const ar=lang==="ar", en=lang==="en";
  const t=ar
    ? {eyebrow:"مساعد المخزن",title:"كل ما تحتاجه في يدك",sub:"ابحث عن قطعة، أرسل طلبك وتابع حالة التحضير والاستلام من الهاتف.",parts:"قطع الغيار",stores:"المخازن",access:"صلاحية الطلب",flow:"مسار بسيط",step1:"ابحث عن القطعة",step2:"أرسل الطلب",step3:"استلم بعد تأكيد المخزن",hint:"طلب القطعة لا يخصم من المخزون. الخصم يتم فقط عند تسجيل التسليم الفعلي من طرف أمين المخزن.",requests:"الطلبات والحجوزات",scan:"مسح القطعة",manual:"بحث يدوي",searchPlaceholder:"اكتب المرجع أو اسم القطعة",notFound:"لم يتم العثور على قطعة بهذا الرمز",cameraError:"تعذر تشغيل الكاميرا. تحقق من صلاحية الكاميرا أو استخدم البحث اليدوي.",choose:"اختيار",selected:"القطعة المختارة",close:"إغلاق"}
    : en
    ? {eyebrow:"MOBILE WAREHOUSE",title:"Your warehouse, in your pocket",sub:"Find a spare part, submit a request and follow preparation and handover from your phone.",parts:"Spare parts",stores:"Warehouses",access:"Request access",flow:"Simple workflow",step1:"Find the part",step2:"Send your request",step3:"Collect after warehouse confirmation",hint:"Submitting a request does not reduce stock. Stock is deducted only when the storekeeper records the actual handover.",requests:"Requests & reservations",scan:"Scan a part",manual:"Manual search",searchPlaceholder:"Enter part number or name",notFound:"No part matches this code",cameraError:"Camera unavailable. Check permission or use manual search.",choose:"Select",selected:"Selected part",close:"Close"}
    : {eyebrow:"ASSISTANT MAGASIN MOBILE",title:"Le magasin, simplement depuis votre téléphone",sub:"Recherchez une pièce, envoyez une demande et suivez sa préparation et sa délivrance depuis votre mobile.",parts:"Pièces référencées",stores:"Entrepôts",access:"Accès aux demandes",flow:"Un parcours simple",step1:"Rechercher la pièce",step2:"Envoyer la demande",step3:"Retirer après confirmation du magasin",hint:"Une demande ne diminue pas le stock. La sortie est enregistrée uniquement lors de la remise réelle par le magasinier.",requests:"Demandes & réservations",scan:"Scanner une pièce",manual:"Recherche manuelle",searchPlaceholder:"Saisir la référence ou le nom",notFound:"Aucune pièce ne correspond à ce code",cameraError:"Caméra indisponible. Vérifiez l’autorisation ou utilisez la recherche manuelle.",choose:"Choisir",selected:"Pièce sélectionnée",close:"Fermer"};

  const [cameraStarting,setCameraStarting]=useState(false);
  const [cameraReady,setCameraReady]=useState(false);
  const activateCamera=async()=>{
    if(cameraStarting||streamRef.current)return;
    setCameraStarting(true);setScanError("");
    try{
      if(!window.isSecureContext)throw new Error("https-required");
      if(!navigator.mediaDevices?.getUserMedia)throw new Error("camera-api-unavailable");
      const stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:"environment"},width:{ideal:1280},height:{ideal:720}}});
      streamRef.current=stream;
      const video=videoRef.current;
      if(!video)throw new Error("video-not-mounted");
      video.setAttribute("playsinline","true");video.setAttribute("webkit-playsinline","true");
      video.muted=true;video.autoplay=true;video.srcObject=stream;
      // Android Chrome/WebView needs a rendered video box before playback.
      await new Promise<void>((resolve,reject)=>{
        if(video.readyState>=1){resolve();return;}
        const cleanup=()=>{video.removeEventListener("loadedmetadata",onReady);video.removeEventListener("error",onError);};
        const onReady=()=>{cleanup();resolve();};
        const onError=()=>{cleanup();reject(new Error("video-metadata-error"));};
        video.addEventListener("loadedmetadata",onReady,{once:true});
        video.addEventListener("error",onError,{once:true});
        window.setTimeout(()=>{cleanup();reject(new Error("video-metadata-timeout"));},8000);
      });
      await video.play();
      setCameraReady(true);
      const reader=new BrowserMultiFormatReader();zxingRef.current=reader;
      reader.decodeFromVideoElement(video,(result)=>{if(result?.getText())selectScannedCode(result.getText());});
    }catch(error){
      streamRef.current?.getTracks().forEach(track=>track.stop());streamRef.current=null;
      setCameraReady(false);
      const name=(error as any)?.name||"";
      setScanError(name==="NotAllowedError"?"Autorisation caméra refusée. Autorisez la caméra pour ce site dans les paramètres du navigateur.":name==="NotFoundError"?"Aucune caméra détectée sur cet appareil.":name==="NotReadableError"?"La caméra est déjà utilisée par une autre application.":!window.isSecureContext?"La caméra nécessite une connexion HTTPS.":"Impossible d’ouvrir la caméra. Vérifiez les autorisations du navigateur.");
      console.error("GSP camera activation failed",error);
    }finally{setCameraStarting(false);}
  };
  const scanTimerRef=useRef<number|undefined>(undefined);
  // Open the camera automatically when the scanner dialog is mounted.
  // Chrome remembers the site's permission; users should not need a second
  // in-app activation tap on every scan.
  useEffect(()=>{
    if(!scanOpen)return;
    const timer=window.setTimeout(()=>{if(!streamRef.current)void activateCamera();},120);
    return()=>{
      window.clearTimeout(timer);
      if(scanTimerRef.current)window.clearTimeout(scanTimerRef.current);
      (zxingRef.current as any)?.reset();zxingRef.current=null;
      streamRef.current?.getTracks().forEach(track=>track.stop());streamRef.current=null;
      setCameraReady(false);
    };
  },[scanOpen]);
  useEffect(()=>()=>{(zxingRef.current as any)?.reset();streamRef.current?.getTracks().forEach(track=>track.stop());streamRef.current=null;},[]);
  const stopScanner=()=>{
    // Stop decoding first, then release every camera track before hiding the
    // dialog. This is important on Android, where hiding the preview alone
    // can leave the camera indicator active.
    if(scanTimerRef.current)window.clearTimeout(scanTimerRef.current);
    scanTimerRef.current=undefined;
    try{(zxingRef.current as any)?.reset();}catch(error){console.warn("Scanner reset failed",error);}
    zxingRef.current=null;
    const video=videoRef.current;
    const activeStream=streamRef.current || (video?.srcObject instanceof MediaStream ? video.srcObject : null);
    activeStream?.getTracks().forEach(track=>{try{track.stop();}catch{}});
    streamRef.current=null;
    if(video){try{video.pause();}catch{};video.srcObject=null;video.removeAttribute("src");}
    setCameraReady(false);
    setCameraStarting(false);
    setScanOpen(false);
  };
  useEffect(()=>{
    if(!scanOpen)return;
    const closeOnEscape=(event:KeyboardEvent)=>{if(event.key==="Escape"){event.preventDefault();stopScanner();}};
    document.addEventListener("keydown",closeOnEscape);
    return()=>document.removeEventListener("keydown",closeOnEscape);
  },[scanOpen]);
  const selectScannedCode=(code:string)=>{const raw=code.trim();let candidates=[raw];try{const parsed=new URL(raw);candidates.push(parsed.searchParams.get("sku")||"",parsed.searchParams.get("id")||"",decodeURIComponent(parsed.pathname.split("/").filter(Boolean).pop()||""));}catch{}try{const parsed=JSON.parse(raw);candidates.push(parsed.sku||"",parsed.barcode||"",parsed.product_id||parsed.productId||parsed.id||"");}catch{}const normalized=candidates.map(v=>String(v||"").trim().toLowerCase()).filter(Boolean);const match=products.find((p:any)=>[p.id,p.sku,p.barcode,p.part_number,p.manufacturer_reference].some((v:any)=>normalized.includes(String(v||"").trim().toLowerCase())));if(match){setSelectedProductId(match.id);setScanError("");stopScanner();setScanKey(v=>v+1);}else setScanError(t.notFound);};
  const startScanner=()=>{setScanError("");setScanValue("");setScanOpen(true);};
  const matches=products.filter((p:any)=>!manualSearch||[p.sku,p.name,p.barcode,p.part_number].some((v:any)=>String(v||"").toLowerCase().includes(manualSearch.toLowerCase()))).slice(0,8);
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
    <section className="mwa-quick-actions"><button type="button" className="mwa-scan-btn" onClick={()=>void startScanner()}><Camera size={19}/><span>{t.scan}</span></button><label className="mwa-manual-search"><Search size={18}/><input value={manualSearch} onChange={e=>setManualSearch(e.target.value)} placeholder={t.searchPlaceholder}/></label></section>
    {manualSearch&&<section className="mwa-search-results">{matches.map((p:any)=><button type="button" key={p.id} onClick={()=>{setSelectedProductId(p.id);setManualSearch("");setScanKey(v=>v+1);}}><span><b>{p.sku||"—"}</b><small>{p.name}</small></span><CheckCircle2 size={17}/></button>)}{!matches.length&&<p>{t.notFound}</p>}</section>}
    {selectedProductId&&<div className="mwa-selected"><CheckCircle2 size={17}/>{t.selected}: {products.find((p:any)=>p.id===selectedProductId)?.name||"—"}<button type="button" onClick={()=>setSelectedProductId(null)}><X size={16}/></button></div>}
    {scanOpen&&<ModalPortal><div className="mwa-scanner-backdrop" onClick={stopScanner}><section className="mwa-scanner" role="dialog" aria-modal="true" onClick={e=>e.stopPropagation()}><header><b>{t.scan}</b><button type="button" className="icon-btn mwa-scanner-close" aria-label={t.close} title={t.close} onClick={e=>{e.preventDefault();e.stopPropagation();stopScanner();}}><X size={20}/></button></header><div className="mwa-video-stage"><video ref={videoRef} playsInline muted autoPlay/><div className="mwa-camera-start" hidden={cameraReady}><Camera size={34}/><b>{cameraStarting?"Ouverture de la caméra…":"Activer la caméra"}</b><button type="button" disabled={cameraStarting} onClick={()=>void activateCamera()}>{cameraStarting?"Patientez…":"Autoriser et ouvrir la caméra"}</button></div></div><p role="status">{scanError|| (cameraReady?"Placez le code-barres ou QR devant la caméra.":"Appuyez sur le bouton pour autoriser l’accès à la caméra.")}</p><label><Search size={16}/><input value={scanValue} onChange={e=>setScanValue(e.target.value)} placeholder={t.searchPlaceholder}/><button type="button" onClick={()=>selectScannedCode(scanValue)}>{t.choose}</button></label><div className="mwa-scanner-actions"><button type="button" className="secondary-btn" onClick={e=>{e.preventDefault();e.stopPropagation();stopScanner();}}><X size={16}/>{t.close}</button></div></section></div></ModalPortal>}
    <section className="mwa-flow">
      <div className="mwa-section-title"><Activity size={17}/><h3>{t.flow}</h3></div>
      <div className="mwa-steps"><div><b>01</b><span>{t.step1}</span></div><i/><div><b>02</b><span>{t.step2}</span></div><i/><div><b>03</b><span>{t.step3}</span></div></div>
      <p className="mwa-stock-note">{t.hint}</p>
    </section>
    <section className="mwa-request-area">
      <div className="mwa-section-title"><ClipboardList size={18}/><h3>{t.requests}</h3></div>
      <SpareParts key={scanKey} {...props} view="requests" initialProductId={selectedProductId||props.initialProductId}/>
    </section>
  </div>;
}
