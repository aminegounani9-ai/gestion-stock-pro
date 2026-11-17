import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  Activity, ArrowUpRight, Boxes, Building2, ChevronDown, CircleHelp,
  LayoutDashboard, LogOut, Package, Plus, Search, Settings,
  ShoppingBag, ShoppingCart, Truck, Users, Warehouse, X, Languages, ShieldCheck
} from "lucide-react";
import { isSupabaseConfigured, supabase } from "./lib/supabase";
import type { Company, Product } from "./lib/supabase";

type Page = "dashboard" | "products" | "stock" | "warehouses" | "suppliers" | "customers" | "purchases" | "sales";
type Lang = "fr" | "en" | "ar";
type Notice = { type: "success" | "error"; text: string } | null;

const copy = {
  fr: {
    dashboard:"Tableau de bord", products:"Articles", stock:"Mouvements de stock", warehouses:"Entrepôts",
    suppliers:"Fournisseurs", customers:"Clients", purchases:"Achats", sales:"Ventes",
    search:"Rechercher un article, un code...", welcome:"Vue d'ensemble", subtitle:"Suivez votre activité et votre stock en temps réel.",
    items:"Articles actifs", suppliersCount:"Fournisseurs", warehousesCount:"Entrepôts", movements:"Mouvements",
    recent:"Articles récemment ajoutés", all:"Voir tout", addProduct:"Nouvel article", sku:"Référence / SKU",
    name:"Nom de l'article", barcode:"Code-barres", unit:"Unité", purchasePrice:"Prix d'achat",
    salePrice:"Prix de vente", minStock:"Stock minimum", category:"Catégorie", save:"Enregistrer",
    cancel:"Annuler", noProducts:"Aucun article pour le moment", noProductsHint:"Ajoutez votre premier article pour commencer à gérer votre stock.",
    login:"Connexion", signup:"Créer un compte", email:"Adresse e-mail", password:"Mot de passe",
    company:"Nom de votre entreprise", companySetup:"Créer votre espace de travail", createCompany:"Créer l'entreprise",
    authSubtitle:"Connectez-vous à votre espace de gestion de stock.", noAccount:"Pas encore de compte ?", haveAccount:"Vous avez déjà un compte ?",
    logout:"Déconnexion", configError:"Configurez les variables Supabase dans .env.local pour démarrer.",
    loading:"Chargement...", noCompany:"Aucune entreprise liée à ce compte.", chooseCompany:"Espace de travail",
    addWarehouse:"Ajouter un entrepôt", warehouseName:"Nom de l'entrepôt", warehouseCode:"Code",
    addSupplier:"Ajouter un fournisseur", supplierName:"Nom du fournisseur", phone:"Téléphone",
    addCustomer:"Ajouter un client", customerName:"Nom du client", empty:"Aucune donnée à afficher",
    moduleSoon:"Ce module sera activé dans la prochaine étape.", lowStock:"Stock à surveiller",
    quantity:"Quantité", movementType:"Type de mouvement", opening:"Stock initial", adjustmentIn:"Entrée / Ajustement",
    adjustmentOut:"Sortie / Ajustement", warehouse:"Entrepôt", note:"Note", addMovement:"Ajouter un mouvement",
    currentStock:"Stock disponible", productSaved:"Article enregistré", companyCreated:"Espace créé avec succès",
    invalid:"Veuillez vérifier les champs obligatoires.", language:"Langue", profile:"Mon espace",
    margin:"Marge théorique", purchaseOrders:"Commandes d'achat", invoices:"Factures de vente",
  },
  en: {
    dashboard:"Dashboard", products:"Products", stock:"Stock movements", warehouses:"Warehouses", suppliers:"Suppliers",
    customers:"Customers", purchases:"Purchases", sales:"Sales", search:"Search products or SKU...", welcome:"Overview",
    subtitle:"Monitor your business and stock in real time.", items:"Active products", suppliersCount:"Suppliers",
    warehousesCount:"Warehouses", movements:"Movements", recent:"Recently added products", all:"View all",
    addProduct:"New product", sku:"SKU / Reference", name:"Product name", barcode:"Barcode", unit:"Unit",
    purchasePrice:"Purchase price", salePrice:"Sale price", minStock:"Minimum stock", category:"Category",
    save:"Save", cancel:"Cancel", noProducts:"No products yet", noProductsHint:"Add your first product to start managing stock.",
    login:"Sign in", signup:"Create account", email:"Email address", password:"Password", company:"Company name",
    companySetup:"Create your workspace", createCompany:"Create company", authSubtitle:"Sign in to your stock workspace.",
    noAccount:"Don't have an account?", haveAccount:"Already have an account?", logout:"Sign out",
    configError:"Configure Supabase variables in .env.local to get started.", loading:"Loading...",
    noCompany:"No company is linked to this account.", chooseCompany:"Workspace", addWarehouse:"Add warehouse",
    warehouseName:"Warehouse name", warehouseCode:"Code", addSupplier:"Add supplier", supplierName:"Supplier name",
    phone:"Phone", addCustomer:"Add customer", customerName:"Customer name", empty:"Nothing to display",
    moduleSoon:"This module will be enabled in the next stage.", lowStock:"Low stock alerts", quantity:"Quantity",
    movementType:"Movement type", opening:"Opening stock", adjustmentIn:"Stock in", adjustmentOut:"Stock out",
    warehouse:"Warehouse", note:"Note", addMovement:"Add movement", currentStock:"Available stock",
    productSaved:"Product saved", companyCreated:"Workspace created successfully", invalid:"Please check required fields.",
    language:"Language", profile:"My workspace", margin:"Estimated margin", purchaseOrders:"Purchase orders", invoices:"Sales invoices",
  },
  ar: {
    dashboard:"لوحة التحكم", products:"المنتجات", stock:"حركات المخزون", warehouses:"المخازن", suppliers:"الموردون",
    customers:"العملاء", purchases:"المشتريات", sales:"المبيعات", search:"ابحث عن منتج أو مرجع...",
    welcome:"نظرة عامة", subtitle:"تابع نشاطك ومخزونك في الوقت الفعلي.", items:"المنتجات النشطة",
    suppliersCount:"الموردون", warehousesCount:"المخازن", movements:"الحركات", recent:"آخر المنتجات المضافة",
    all:"عرض الكل", addProduct:"إضافة منتج", sku:"المرجع / SKU", name:"اسم المنتج", barcode:"الباركود",
    unit:"الوحدة", purchasePrice:"سعر الشراء", salePrice:"سعر البيع", minStock:"الحد الأدنى للمخزون",
    category:"الفئة", save:"حفظ", cancel:"إلغاء", noProducts:"لا توجد منتجات حاليا",
    noProductsHint:"أضف أول منتج للبدء في إدارة المخزون.", login:"تسجيل الدخول", signup:"إنشاء حساب",
    email:"البريد الإلكتروني", password:"كلمة المرور", company:"اسم الشركة", companySetup:"إنشاء مساحة العمل",
    createCompany:"إنشاء الشركة", authSubtitle:"سجل الدخول إلى مساحة إدارة المخزون الخاصة بك.",
    noAccount:"ليس لديك حساب؟", haveAccount:"لديك حساب بالفعل؟", logout:"تسجيل الخروج",
    configError:"قم بإعداد متغيرات Supabase في ملف .env.local للبدء.", loading:"جار التحميل...",
    noCompany:"لا توجد شركة مرتبطة بهذا الحساب.", chooseCompany:"مساحة العمل", addWarehouse:"إضافة مخزن",
    warehouseName:"اسم المخزن", warehouseCode:"الرمز", addSupplier:"إضافة مورد", supplierName:"اسم المورد",
    phone:"الهاتف", addCustomer:"إضافة عميل", customerName:"اسم العميل", empty:"لا توجد بيانات للعرض",
    moduleSoon:"سيتم تفعيل هذه الوحدة في المرحلة القادمة.", lowStock:"تنبيهات المخزون المنخفض",
    quantity:"الكمية", movementType:"نوع الحركة", opening:"رصيد افتتاحي", adjustmentIn:"إدخال مخزون",
    adjustmentOut:"إخراج مخزون", warehouse:"المخزن", note:"ملاحظة", addMovement:"إضافة حركة",
    currentStock:"المخزون المتاح", productSaved:"تم حفظ المنتج", companyCreated:"تم إنشاء مساحة العمل بنجاح",
    invalid:"يرجى التحقق من الحقول المطلوبة.", language:"اللغة", profile:"مساحة العمل",
    margin:"الهامش التقديري", purchaseOrders:"طلبات الشراء", invoices:"فواتير البيع",
  }
} as const;
type Labels = { [K in keyof typeof copy.fr]: string };

const nav: { id: Page; icon: typeof LayoutDashboard; group: string }[] = [
  { id:"dashboard", icon:LayoutDashboard, group:"main" },
  { id:"products", icon:Package, group:"main" },
  { id:"stock", icon:Activity, group:"main" },
  { id:"warehouses", icon:Warehouse, group:"main" },
  { id:"suppliers", icon:Truck, group:"partners" },
  { id:"customers", icon:Users, group:"partners" },
  { id:"purchases", icon:ShoppingCart, group:"operations" },
  { id:"sales", icon:ShoppingBag, group:"operations" },
];

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [page, setPage] = useState<Page>("dashboard");
  const [lang, setLang] = useState<Lang>("fr");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [authMode, setAuthMode] = useState<"login"|"signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [company, setCompany] = useState<Company|null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<"product"|"warehouse"|"supplier"|"customer"|"movement"|null>(null);
  const [form, setForm] = useState<Record<string,string>>({});
  const t = copy[lang];
  const rtl = lang === "ar";

  const flash = (type: "success"|"error", text: string) => {
    setNotice({type,text});
    window.setTimeout(() => setNotice(null), 4200);
  };

  const loadWorkspace = useCallback(async (companyId: string) => {
    if (!supabase) return;
    const [p,w,s,c,m] = await Promise.all([
      supabase.from("products").select("*").eq("company_id",companyId).order("created_at",{ascending:false}),
      supabase.from("warehouses").select("*").eq("company_id",companyId).order("created_at"),
      supabase.from("suppliers").select("*").eq("company_id",companyId).order("name"),
      supabase.from("customers").select("*").eq("company_id",companyId).order("name"),
      supabase.from("stock_movements").select("*, products(name,sku), warehouses(name)").eq("company_id",companyId).order("occurred_at",{ascending:false}).limit(30)
    ]);
    if (p.error) throw p.error;
    setProducts((p.data ?? []) as Product[]);
    setWarehouses(w.data ?? []);
    setSuppliers(s.data ?? []);
    setCustomers(c.data ?? []);
    setMovements(m.data ?? []);
  }, []);

  const loadCompanies = useCallback(async (userId: string) => {
    if (!supabase) return;
    const {data: memberships,error} = await supabase.from("company_members").select("company_id").eq("user_id",userId).eq("is_active",true);
    if (error) throw error;
    const ids = (memberships ?? []).map((m:any) => m.company_id);
    if (!ids.length) { setCompanies([]); setCompany(null); return; }
    const {data,error: companyError} = await supabase.from("companies").select("id,name,currency_code").in("id",ids).order("created_at");
    if (companyError) throw companyError;
    const list = (data ?? []) as Company[];
    setCompanies(list);
    const chosen = list[0] ?? null;
    setCompany(chosen);
    if (chosen) await loadWorkspace(chosen.id);
  }, [loadWorkspace]);

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    supabase.auth.getSession().then(async ({data}) => {
      setSession(data.session);
      if (data.session?.user) {
        try { await loadCompanies(data.session.user.id); } catch (e:any) { flash("error",e.message); }
      }
      setLoading(false);
    });
    const {data:{subscription}} = supabase.auth.onAuthStateChange((_event,next) => {
      setSession(next);
      if (!next) { setCompanies([]); setCompany(null); setProducts([]); }
    });
    return () => subscription.unsubscribe();
  }, [loadCompanies]);

  const filteredProducts = useMemo(() => products.filter(p =>
    [p.name,p.sku,p.barcode ?? ""].some(v => v.toLowerCase().includes(search.toLowerCase()))
  ), [products,search]);

  async function submitAuth(e: FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true);
    try {
      const result = authMode === "login"
        ? await supabase.auth.signInWithPassword({email,password})
        : await supabase.auth.signUp({email,password});
      if (result.error) throw result.error;
      if (authMode === "signup" && !result.data.session) {
        flash("success", lang==="ar" ? "تحقق من بريدك الإلكتروني لتفعيل الحساب." : "Vérifiez votre e-mail pour confirmer votre compte.");
      } else if (result.data.user) {
        await loadCompanies(result.data.user.id);
      }
    } catch (e:any) { flash("error",e.message); }
    finally { setBusy(false); }
  }

  async function createCompany(e: FormEvent) {
    e.preventDefault();
    if (!supabase || !session?.user || !companyName.trim()) return;
    setBusy(true);
    try {
      const slug = companyName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"") + "-" + Math.random().toString(36).slice(2,6);
      const {data,error} = await supabase.from("companies").insert({name:companyName.trim(),slug,created_by:session.user.id}).select("id,name,currency_code").single();
      if (error) throw error;
      const {error:memberError} = await supabase.from("company_members").insert({company_id:data.id,user_id:session.user.id,role:"owner"});
      if (memberError) throw memberError;
      await supabase.from("warehouses").insert({company_id:data.id,code:"MAIN",name:lang==="ar"?"المخزن الرئيسي":"Entrepôt principal",is_default:true});
      setCompany(data as Company);
      setCompanies([data as Company]);
      await loadWorkspace(data.id);
      flash("success",t.companyCreated);
    } catch (e:any) { flash("error",e.message); }
    finally { setBusy(false); }
  }

  async function saveRecord(e: FormEvent) {
    e.preventDefault();
    if (!supabase || !company) return;
    setBusy(true);
    try {
      let table = "";
      let payload: Record<string,any> = {company_id:company.id};
      if (modal === "product") {
        table = "products";
        payload = {...payload,sku:form.sku?.trim(),name:form.name?.trim(),barcode:form.barcode?.trim()||null,unit:form.unit||"piece",purchase_price:Number(form.purchase_price||0),sale_price:Number(form.sale_price||0),min_stock:Number(form.min_stock||0)};
      } else if (modal === "warehouse") {
        table = "warehouses"; payload = {...payload,code:form.code?.trim().toUpperCase(),name:form.name?.trim()};
      } else if (modal === "supplier") {
        table = "suppliers"; payload = {...payload,name:form.name?.trim(),phone:form.phone?.trim()||null};
      } else if (modal === "customer") {
        table = "customers"; payload = {...payload,name:form.name?.trim(),phone:form.phone?.trim()||null};
      } else if (modal === "movement") {
        table = "stock_movements"; payload = {...payload,product_id:form.product_id,warehouse_id:form.warehouse_id,movement_type:form.movement_type,quantity:Number(form.quantity),note:form.note||null,created_by:session?.user?.id};
      }
      const {error} = await supabase.from(table).insert(payload);
      if (error) throw error;
      await loadWorkspace(company.id);
      setModal(null); setForm({});
      flash("success",modal==="product"?t.productSaved:t.save+" ✓");
    } catch (e:any) { flash("error",e.message); }
    finally { setBusy(false); }
  }

  async function signOut() {
    if (supabase) await supabase.auth.signOut();
    setSession(null); setCompany(null); setCompanies([]); setProducts([]);
  }

  const title = t[page];
  const money = (value:number) => new Intl.NumberFormat(lang==="en"?"en-US":lang==="ar"?"ar-DZ":"fr-DZ",{style:"currency",currency:company?.currency_code||"DZD",maximumFractionDigits:0}).format(value||0);
  const stats = [
    {label:t.items,value:products.length,icon:Package,accent:"blue",detail:lang==="ar"?"في الكتالوج":"Dans le catalogue"},
    {label:t.suppliersCount,value:suppliers.length,icon:Truck,accent:"violet",detail:lang==="ar"?"شريك تجاري":"Partenaires"},
    {label:t.warehousesCount,value:warehouses.length,icon:Warehouse,accent:"amber",detail:lang==="ar"?"مواقع التخزين":"Sites de stockage"},
    {label:t.movements,value:movements.length,icon:Activity,accent:"green",detail:lang==="ar"?"آخر الحركات":"Dernières opérations"},
  ];

  if (!isSupabaseConfigured) return <div className="config-screen"><div className="auth-card"><div className="brand-mark"><Boxes size={26}/></div><h1>Gestion Stock Pro</h1><p>{t.configError}</p><code>VITE_SUPABASE_URL<br/>VITE_SUPABASE_PUBLISHABLE_KEY</code></div></div>;
  if (loading) return <div className="loading-screen"><div className="spinner"/><span>{t.loading}</span></div>;

  if (!session) return <div className="auth-screen" dir={rtl?"rtl":"ltr"}>
    <div className="auth-visual"><div className="auth-brand"><span className="brand-mark"><Boxes size={24}/></span><b>Gestion Stock Pro</b></div><div className="visual-copy"><span className="eyebrow">INVENTORY · OPERATIONS · CONTROL</span><h1>{lang==="ar"?"تحكم أفضل في مخزونك.":"Votre stock, enfin sous contrôle."}</h1><p>{lang==="ar"?"منصة واحدة لإدارة المنتجات والمخازن والمشتريات والمبيعات.":"Une plateforme claire pour piloter vos articles, entrepôts, achats et ventes."}</p><div className="visual-stats"><div><b>01</b><span>Workspace</span></div><div><b>02</b><span>Inventory</span></div><div><b>03</b><span>Insights</span></div></div></div><div className="visual-footer">Gestion Stock Pro · {new Date().getFullYear()}</div></div>
    <div className="auth-panel"><div className="lang-switch"><Languages size={16}/><select value={lang} onChange={e=>setLang(e.target.value as Lang)}><option value="fr">Français</option><option value="en">English</option><option value="ar">العربية</option></select></div><form className="auth-form" onSubmit={submitAuth}><span className="eyebrow">{authMode==="login"?"ESPACE SÉCURISÉ":"NOUVEAU COMPTE"}</span><h2>{authMode==="login"?t.login:t.signup}</h2><p>{t.authSubtitle}</p><label>{t.email}<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required autoComplete="email"/></label><label>{t.password}<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required minLength={8} autoComplete={authMode==="login"?"current-password":"new-password"}/></label><button className="primary-btn full" disabled={busy}>{busy?t.loading:authMode==="login"?t.login:t.signup}</button><div className="auth-toggle">{authMode==="login"?t.noAccount:t.haveAccount} <button type="button" onClick={()=>setAuthMode(authMode==="login"?"signup":"login")}>{authMode==="login"?t.signup:t.login}</button></div><div className="secure-note"><ShieldCheck size={15}/> Connexion sécurisée · Supabase Auth</div></form></div>
    {notice&&<div className={"toast "+notice.type}>{notice.text}</div>}
  </div>;

  if (!company) return <div className="setup-screen" dir={rtl?"rtl":"ltr"}><div className="setup-card"><span className="brand-mark"><Building2/></span><h1>{t.companySetup}</h1><p>{t.noCompany}</p><form onSubmit={createCompany}><label>{t.company}<input value={companyName} onChange={e=>setCompanyName(e.target.value)} required minLength={2}/></label><button className="primary-btn full" disabled={busy}>{busy?t.loading:t.createCompany}</button></form><button className="text-btn" onClick={signOut}>{t.logout}</button></div>{notice&&<div className={"toast "+notice.type}>{notice.text}</div>}</div>;

  return <div className="app-shell" dir={rtl?"rtl":"ltr"}>
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark"><Boxes size={22}/></span><div><b>Gestion Stock</b><small>PRO MANAGEMENT</small></div></div>
      <div className="workspace-switch"><span className="workspace-icon"><Building2 size={17}/></span><div><small>{t.chooseCompany}</small><select className="workspace-select" value={company.id} onChange={async e=>{const selected=companies.find(c=>c.id===e.target.value);if(selected){setCompany(selected);await loadWorkspace(selected.id)}}}>{companies.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div><ChevronDown size={15}/></div>
      <div className="nav-label">{lang==="ar"?"القائمة الرئيسية":"MENU PRINCIPAL"}</div>
      <nav>{nav.map((item,i)=>{const Icon=item.icon;const label=t[item.id];return <button key={item.id} className={"nav-item "+(page===item.id?"active":"")} onClick={()=>setPage(item.id)}><Icon size={18}/><span>{label}</span>{item.id==="stock"&&<i className="nav-dot"/>}</button>})}</nav>
      <div className="sidebar-bottom"><div className="help-card"><CircleHelp size={18}/><b>Besoin d'aide ?</b><span>Votre gestion, simplifiée.</span></div><button className="nav-item" onClick={()=>setLang(lang==="fr"?"en":lang==="en"?"ar":"fr")}><Languages size={18}/><span>{t.language}: {lang.toUpperCase()}</span></button><button className="nav-item" onClick={signOut}><LogOut size={18}/><span>{t.logout}</span></button><div className="user-mini"><div className="avatar">{session.user.email?.slice(0,1).toUpperCase()}</div><div><b>{session.user.email?.split("@")[0]}</b><small>{session.user.email}</small></div><Settings size={16}/></div></div>
    </aside>
    <main className="main-area">
      <header className="topbar"><div className="mobile-brand"><span className="brand-mark"><Boxes size={20}/></span><b>Gestion Stock Pro</b></div><div className="breadcrumbs">Workspace <span>/</span> <b>{title}</b></div><div className="top-actions"><div className="global-search"><Search size={16}/><input placeholder={t.search} value={search} onChange={e=>setSearch(e.target.value)}/><kbd>⌘ K</kbd></div><button className="icon-btn" title={t.language} onClick={()=>setLang(lang==="fr"?"en":lang==="en"?"ar":"fr")}><Languages size={18}/></button><div className="top-avatar">{session.user.email?.slice(0,1).toUpperCase()}</div></div></header>
      <div className="page-content">
        <div className="page-heading"><div><span className="eyebrow">{company.name.toUpperCase()} · {new Date().toLocaleDateString(lang==="ar"?"ar-DZ":lang==="en"?"en-US":"fr-FR",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</span><h1>{page==="dashboard"?t.welcome:title}</h1><p>{t.subtitle}</p></div>{page==="products"&&<button className="primary-btn" onClick={()=>{setForm({unit:"piece"});setModal("product")}}><Plus size={17}/>{t.addProduct}</button>}{page==="warehouses"&&<button className="primary-btn" onClick={()=>setModal("warehouse")}><Plus size={17}/>{t.addWarehouse}</button>}{page==="suppliers"&&<button className="primary-btn" onClick={()=>setModal("supplier")}><Plus size={17}/>{t.addSupplier}</button>}{page==="customers"&&<button className="primary-btn" onClick={()=>setModal("customer")}><Plus size={17}/>{t.addCustomer}</button>}{page==="stock"&&<button className="primary-btn" onClick={()=>setModal("movement")}><Plus size={17}/>{t.addMovement}</button>}</div>

        {page==="dashboard"&&<><section className="stat-grid">{stats.map((s)=>{const Icon=s.icon;return <div className="stat-card" key={s.label}><div className={"stat-icon "+s.accent}><Icon size={20}/></div><span>{s.label}</span><div className="stat-value">{s.value.toLocaleString()}</div><small>{s.detail}</small></div>})}</section><section className="dashboard-grid"><div className="panel wide-panel"><div className="panel-head"><div><h3>{t.recent}</h3><p>{lang==="ar"?"آخر العناصر المسجلة في النظام":"Dernières références enregistrées"}</p></div><button className="link-btn" onClick={()=>setPage("products")}>{t.all}<ArrowUpRight size={15}/></button></div><ProductTable products={products.slice(0,6)} money={money} t={t}/></div><div className="panel"><div className="panel-head"><div><h3>{t.lowStock}</h3><p>{lang==="ar"?"مراقبة مستويات المخزون":"Surveillance des seuils"}</p></div><Activity size={18} className="muted"/></div><div className="empty-state compact"><div className="empty-icon"><ShieldCheck size={22}/></div><b>{lang==="ar"?"لا توجد تنبيهات بعد":"Aucune alerte calculée"}</b><span>{lang==="ar"?"ستظهر التنبيهات عند تسجيل حركات المخزون.":"Les alertes seront calculées après l'activation du suivi des stocks."}</span></div></div></section></>}

        {page==="products"&&<section className="panel"><div className="panel-head"><div><h3>{t.products}</h3><p>{products.length} {t.items.toLowerCase()}</p></div><div className="table-search"><Search size={15}/><input placeholder={t.search} value={search} onChange={e=>setSearch(e.target.value)}/></div></div><ProductTable products={filteredProducts} money={money} t={t}/></section>}
        {page==="warehouses"&&<section className="panel"><div className="panel-head"><div><h3>{t.warehouses}</h3><p>{warehouses.length} {t.warehouses.toLowerCase()}</p></div></div>{warehouses.length? <div className="simple-list">{warehouses.map(w=><div className="simple-row" key={w.id}><span className="list-icon"><Warehouse size={18}/></span><div><b>{w.name}</b><small>{w.code}</small></div><span className="status-pill">{w.is_active?"Actif":"Inactif"}</span></div>)}</div>:<Empty t={t}/>}</section>}
        {page==="suppliers"&&<SimpleDirectory title={t.suppliers} rows={suppliers} icon="supplier" empty={t.empty}/>}
        {page==="customers"&&<SimpleDirectory title={t.customers} rows={customers} icon="customer" empty={t.empty}/>}
        {page==="stock"&&<section className="panel"><div className="panel-head"><div><h3>{t.stock}</h3><p>{movements.length} {t.movements.toLowerCase()}</p></div></div>{movements.length?<div className="table-wrap"><table><thead><tr><th>{t.name}</th><th>{t.movementType}</th><th>{t.quantity}</th><th>{t.warehouse}</th><th>Date</th></tr></thead><tbody>{movements.map(m=><tr key={m.id}><td><b>{m.products?.name||"—"}</b><small className="cell-sub">{m.products?.sku}</small></td><td><span className="status-pill">{m.movement_type}</span></td><td>{m.quantity}</td><td>{m.warehouses?.name||"—"}</td><td>{new Date(m.occurred_at).toLocaleDateString()}</td></tr>)}</tbody></table></div>:<Empty t={t}/>}</section>}
        {(page==="purchases"||page==="sales")&&<section className="panel module-placeholder"><div className="placeholder-icon">{page==="purchases"?<ShoppingCart size={28}/>:<ShoppingBag size={28}/>}</div><h3>{title}</h3><p>{t.moduleSoon}</p><span className="status-pill">EN PRÉPARATION</span></section>}
      </div>
      <footer className="app-footer"><span>© {new Date().getFullYear()} Gestion Stock Pro</span><span><ShieldCheck size={14}/> Données protégées par RLS</span></footer>
    </main>
    {modal&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setModal(null)}}><form className="modal-card" onSubmit={saveRecord}><div className="modal-head"><div><span className="eyebrow">NOUVEL ENREGISTREMENT</span><h2>{modal==="product"?t.addProduct:modal==="warehouse"?t.addWarehouse:modal==="supplier"?t.addSupplier:modal==="customer"?t.addCustomer:t.addMovement}</h2></div><button type="button" className="icon-btn" onClick={()=>setModal(null)}><X size={19}/></button></div>
      {modal==="product"&&<div className="form-grid"><label>{t.sku}<input value={form.sku||""} onChange={e=>setForm({...form,sku:e.target.value})} required/></label><label>{t.name}<input value={form.name||""} onChange={e=>setForm({...form,name:e.target.value})} required/></label><label>{t.barcode}<input value={form.barcode||""} onChange={e=>setForm({...form,barcode:e.target.value})}/></label><label>{t.unit}<select value={form.unit||"piece"} onChange={e=>setForm({...form,unit:e.target.value})}><option value="piece">Pièce</option><option value="kg">Kg</option><option value="g">g</option><option value="l">Litre</option><option value="m">Mètre</option><option value="box">Carton</option></select></label><label>{t.purchasePrice}<input type="number" min="0" step="0.01" value={form.purchase_price||""} onChange={e=>setForm({...form,purchase_price:e.target.value})}/></label><label>{t.salePrice}<input type="number" min="0" step="0.01" value={form.sale_price||""} onChange={e=>setForm({...form,sale_price:e.target.value})}/></label><label>{t.minStock}<input type="number" min="0" step="0.001" value={form.min_stock||""} onChange={e=>setForm({...form,min_stock:e.target.value})}/></label></div>}
      {modal==="warehouse"&&<div className="form-grid"><label>{t.warehouseCode}<input value={form.code||""} onChange={e=>setForm({...form,code:e.target.value})} required/></label><label>{t.warehouseName}<input value={form.name||""} onChange={e=>setForm({...form,name:e.target.value})} required/></label></div>}
      {(modal==="supplier"||modal==="customer")&&<div className="form-grid"><label>{modal==="supplier"?t.supplierName:t.customerName}<input value={form.name||""} onChange={e=>setForm({...form,name:e.target.value})} required/></label><label>{t.phone}<input value={form.phone||""} onChange={e=>setForm({...form,phone:e.target.value})}/></label></div>}
      {modal==="movement"&&<div className="form-grid"><label>{t.name}<select value={form.product_id||""} onChange={e=>setForm({...form,product_id:e.target.value})} required><option value="">—</option>{products.map(p=><option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}</select></label><label>{t.warehouse}<select value={form.warehouse_id||""} onChange={e=>setForm({...form,warehouse_id:e.target.value})} required><option value="">—</option>{warehouses.map(w=><option key={w.id} value={w.id}>{w.name}</option>)}</select></label><label>{t.movementType}<select value={form.movement_type||"opening"} onChange={e=>setForm({...form,movement_type:e.target.value})}><option value="opening">{t.opening}</option><option value="adjustment_in">{t.adjustmentIn}</option><option value="adjustment_out">{t.adjustmentOut}</option></select></label><label>{t.quantity}<input type="number" min="0.001" step="0.001" value={form.quantity||""} onChange={e=>setForm({...form,quantity:e.target.value})} required/></label><label className="span-2">{t.note}<input value={form.note||""} onChange={e=>setForm({...form,note:e.target.value})}/></label></div>}
      <div className="modal-actions"><button type="button" className="secondary-btn" onClick={()=>setModal(null)}>{t.cancel}</button><button className="primary-btn" disabled={busy}>{busy?t.loading:t.save}</button></div>
    </form></div>}
    {notice&&<div className={"toast "+notice.type}>{notice.text}</div>}
  </div>;
}

function ProductTable({products,money,t}:{products:Product[];money:(n:number)=>string;t:Labels}) {
  if (!products.length) return <Empty t={t}/>;
  return <div className="table-wrap"><table><thead><tr><th>{t.name}</th><th>{t.sku}</th><th>{t.purchasePrice}</th><th>{t.salePrice}</th><th>{t.minStock}</th><th>Statut</th></tr></thead><tbody>{products.map(p=><tr key={p.id}><td><div className="product-cell"><span className="product-thumb"><Package size={17}/></span><div><b>{p.name}</b><small>{p.barcode||"—"}</small></div></div></td><td><span className="sku">{p.sku}</span></td><td>{money(Number(p.purchase_price))}</td><td className="price-cell">{money(Number(p.sale_price))}</td><td>{p.min_stock} {p.unit}</td><td><span className="status-pill positive">Actif</span></td></tr>)}</tbody></table></div>;
}
function Empty({t}:{t:typeof copy.fr}) { return <div className="empty-state"><div className="empty-icon"><Package size={24}/></div><b>{t.noProducts}</b><span>{t.noProductsHint}</span></div>; }
function SimpleDirectory({title,rows,icon,empty}:{title:string;rows:any[];icon:string;empty:string}) {
  const Icon=icon==="supplier"?Truck:Users;
  return <section className="panel"><div className="panel-head"><div><h3>{title}</h3><p>{rows.length} enregistrement(s)</p></div></div>{rows.length?<div className="simple-list">{rows.map(r=><div className="simple-row" key={r.id}><span className="list-icon"><Icon size={18}/></span><div><b>{r.name}</b><small>{r.phone||r.email||"—"}</small></div><span className="status-pill positive">Actif</span></div>)}</div>:<div className="empty-state"><div className="empty-icon"><Icon size={24}/></div><b>{empty}</b></div>}</section>;
}