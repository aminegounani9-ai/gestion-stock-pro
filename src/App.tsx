import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import type { FormEvent } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import {
  Activity, Bell, Boxes, Building2, CheckCheck, ChevronDown, CircleHelp, FileSpreadsheet, Download,
  LayoutDashboard, LogOut, Package, Plus, Search, Settings,
  Truck, Users, Warehouse, X, Languages, ShieldCheck, ArrowLeftRight, ClipboardCheck, BarChart3, Printer, ScanBarcode, Wrench
} from "lucide-react";
import StockOperations from "./StockOperations";
import SpareParts from "./SpareParts";
import SparePartsDashboard from "./SparePartsDashboard";
import EquipmentManagement from "./EquipmentManagement";
import OrganizationManagement from "./OrganizationManagement";
import ImportExportCenter from "./ImportExportCenter";
import UserManagement from "./UserManagement";
import ModuleErrorBoundary from "./ModuleErrorBoundary";
import { isSupabaseConfigured, supabase } from "./lib/supabase";
import type { Company, Product } from "./lib/supabase";

type Page = "dashboard" | "requests" | "products" | "categories" | "stock" | "warehouses" | "suppliers" | "customers" | "purchases" | "sales" | "transfers" | "inventory" | "locations" | "lots" | "spareParts" | "returns" | "expenses" | "payments" | "reports" | "users" | "settings" | "organization" | "equipment";
type Lang = "fr" | "en" | "ar";
type Notice = { type: "success" | "error"; text: string } | null;
type AppNotification = { id:string; title:string; message:string; notification_type:string; entity_type:string|null; entity_id:string|null; is_read:boolean; created_at:string };

const copy = {
  fr: {
    dashboard:"Tableau de bord", requests:"Demande de pièces", organization:"Organisation & affectations", locations:"Emplacements de stockage", lots:"Lots & péremption", spareParts:"Pièces détachées", equipment:"Équipements", products:"Articles", categories:"Catégories", stock:"Mouvements de stock", warehouses:"Entrepôts", transfers:"Transferts", inventory:"Inventaires", returns:"Retours", expenses:"Dépenses", payments:"Paiements", reports:"Rapports", users:"Utilisateurs", settings:"Paramètres",
    suppliers:"Fournisseurs", customers:"Clients", purchases:"Achats", sales:"Ventes",
    search:"Rechercher un article, un code...", welcome:"Vue d'ensemble", subtitle:"Suivez votre activité et votre stock en temps réel.",
    items:"Articles actifs", suppliersCount:"Fournisseurs", warehousesCount:"Entrepôts", movements:"Mouvements", movementSearch:"Rechercher une opération...", exportMovements:"Exporter CSV",
    recent:"Articles récemment ajoutés", all:"Voir tout", addProduct:"Nouvel article", sku:"Référence / SKU",
    name:"Nom de l'article", barcode:"Code-barres", unit:"Unité", purchasePrice:"Prix d'achat",
    minStock:"Stock minimum", category:"Catégorie", save:"Enregistrer",
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
    dashboard:"Dashboard", requests:"Spare-part requests", organization:"Organization & assignments", locations:"Storage locations", lots:"Lots & expiry", spareParts:"Spare parts", equipment:"Equipment", products:"Products", categories:"Categories", stock:"Stock movements", warehouses:"Warehouses", transfers:"Transfers", inventory:"Stock counts", returns:"Returns", expenses:"Expenses", payments:"Payments", reports:"Reports", users:"Users", settings:"Settings", suppliers:"Suppliers",
    customers:"Customers", purchases:"Purchases", sales:"Sales", search:"Search products or SKU...", welcome:"Overview",
    subtitle:"Monitor your business and stock in real time.", items:"Active products", suppliersCount:"Suppliers",
    warehousesCount:"Warehouses", movements:"Movements", movementSearch:"Search movements...", exportMovements:"Export CSV", recent:"Recently added products", all:"View all",
    addProduct:"New product", sku:"SKU / Reference", name:"Product name", barcode:"Barcode", unit:"Unit",
    purchasePrice:"Purchase price", minStock:"Minimum stock", category:"Category",
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
    dashboard:"لوحة التحكم", requests:"طلبات قطع الغيار", organization:"الهيكل التنظيمي والتعيينات", locations:"مواقع التخزين", lots:"الدفعات والصلاحية", spareParts:"قطع الغيار", equipment:"المعدات", products:"المنتجات", categories:"الفئات", stock:"حركات المخزون", warehouses:"المخازن", transfers:"التحويلات", inventory:"الجرد", returns:"المرتجعات", expenses:"المصاريف", payments:"المدفوعات", reports:"التقارير", users:"المستخدمون", settings:"الإعدادات", suppliers:"الموردون",
    customers:"العملاء", purchases:"المشتريات", sales:"المبيعات", search:"ابحث عن منتج أو مرجع...",
    welcome:"نظرة عامة", subtitle:"تابع نشاطك ومخزونك في الوقت الفعلي.", items:"المنتجات النشطة",
    suppliersCount:"الموردون", warehousesCount:"المخازن", movements:"الحركات", movementSearch:"ابحث في الحركات...", exportMovements:"تصدير CSV", recent:"آخر المنتجات المضافة",
    all:"عرض الكل", addProduct:"إضافة منتج", sku:"المرجع / SKU", name:"اسم المنتج", barcode:"الباركود",
    unit:"الوحدة", purchasePrice:"سعر الشراء", minStock:"الحد الأدنى للمخزون",
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
  { id:"dashboard", icon:LayoutDashboard, group:"workspace" },
  { id:"spareParts", icon:Wrench, group:"workspace" },
  { id:"categories", icon:Boxes, group:"workspace" },
  { id:"requests", icon:ClipboardCheck, group:"workspace" },
  { id:"equipment", icon:ScanBarcode, group:"workspace" },
  { id:"stock", icon:Activity, group:"workspace" },
  { id:"warehouses", icon:Warehouse, group:"workspace" },
  { id:"locations", icon:Boxes, group:"workspace" },
  { id:"transfers", icon:ArrowLeftRight, group:"workspace" },
  { id:"inventory", icon:ClipboardCheck, group:"workspace" },
  { id:"reports", icon:BarChart3, group:"workspace" },
  { id:"users", icon:Users, group:"administration" },
  { id:"organization", icon:Building2, group:"administration" },
  { id:"settings", icon:Settings, group:"administration" }
];

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [page, setPage] = useState<Page>(() => new URLSearchParams(window.location.search).get("equipment") ? "equipment" : "dashboard");
  const [equipmentSeed,setEquipmentSeed] = useState<string|null>(() => new URLSearchParams(window.location.search).get("equipment"));
  const [requestEquipmentId,setRequestEquipmentId]=useState<string|null>(null);
  const [lang, setLang] = useState<Lang>(() => { const saved=localStorage.getItem("gsp_lang"); return saved==="en"||saved==="ar"||saved==="fr"?saved:"fr"; });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [notifications,setNotifications]=useState<AppNotification[]>([]);
  const [notificationsOpen,setNotificationsOpen]=useState(false);
  const [authMode, setAuthMode] = useState<"login"|"signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [company, setCompany] = useState<Company|null>(null);
  const [settingsForm,setSettingsForm] = useState<Record<string,string>>({});
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [productCategoryFilter,setProductCategoryFilter]=useState("all");
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [orgSites,setOrgSites]=useState<any[]>([]);
  const [orgUnits,setOrgUnits]=useState<any[]>([]);
  const [orgServices,setOrgServices]=useState<any[]>([]);
  const [orgDepartments,setOrgDepartments]=useState<any[]>([]);
  const [orgEquipment,setOrgEquipment]=useState<any[]>([]);
  const [scopePermissions,setScopePermissions]=useState({canView:false,canCreate:false,canEdit:false,canDelete:false,canApprove:false,canIssue:false,canReceive:false,canTransfer:false,canInventory:false});
  const [modulePermissions,setModulePermissions]=useState<Record<string,any>>({});
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [myScopeAssignments,setMyScopeAssignments]=useState<any[]>([]);
  const [companyRoles, setCompanyRoles] = useState<Record<string,string>>({});
  const [currentRole, setCurrentRole] = useState("viewer");
  const [isAdmin, setIsAdmin] = useState(false);
  const [inviteFlow] = useState(() => new URLSearchParams(window.location.search).get("invite") === "1");
  const [search, setSearch] = useState("");
  const [movementSearch,setMovementSearch]=useState("");
  const [scannerOpen,setScannerOpen]=useState(false);
  const [installPrompt,setInstallPrompt]=useState<any>(null);
  const [importExportOpen,setImportExportOpen]=useState(false);
  const [modal, setModal] = useState<"product"|"warehouse"|"supplier"|"customer"|"movement"|"purchase"|"sale"|null>(null);
  const [editingId,setEditingId]=useState<string|null>(null);
  const [form, setForm] = useState<Record<string,string>>({});
  const [documentLines,setDocumentLines] = useState<{product_id:string;quantity:string;unit_price:string;discount:string}[]>([{product_id:"",quantity:"",unit_price:"",discount:"0"}]);
  const t = copy[lang];
  const rtl = lang === "ar";
  useEffect(()=>{localStorage.setItem("gsp_lang",lang);document.documentElement.lang=lang;document.documentElement.dir=rtl?"rtl":"ltr";},[lang,rtl]);

  useEffect(()=>{
    const onBeforeInstall=(event:Event)=>{event.preventDefault();setInstallPrompt(event);};
    const onInstalled=()=>setInstallPrompt(null);
    window.addEventListener("beforeinstallprompt",onBeforeInstall);
    window.addEventListener("appinstalled",onInstalled);
    return()=>{window.removeEventListener("beforeinstallprompt",onBeforeInstall);window.removeEventListener("appinstalled",onInstalled);};
  },[]);

  async function installApp(){
    if(installPrompt){
      await installPrompt.prompt();
      const choice=await installPrompt.userChoice;
      if(choice?.outcome==="accepted")flash("success",lang==="ar"?"تم تثبيت التطبيق بنجاح.":lang==="en"?"App installed successfully.":"Application installe avec succès.");
      setInstallPrompt(null);
      return;
    }
    const help=lang==="ar"?"لفتح التطبيق كتطبيق مستقل: افتح قائمة Chrome ⋮ ثم اختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية». على iPhone: اضغط مشاركة ثم «إضافة إلى الشاشة الرئيسية».":lang==="en"?"To install: open Chrome ⋮ and choose “Install app” or “Add to Home screen”. On iPhone, tap Share, then “Add to Home Screen”.":"Pour installer : ouvrez le menu Chrome ⋮ puis choisissez « Installer l’application » ou « Ajouter à l’écran d’accueil ». Sur iPhone : Partager puis « Sur l’écran d’accueil ».";
    flash("success",help);
  }

  const flash = (type: "success"|"error", text: string) => {
    setNotice({type,text});
    window.setTimeout(() => setNotice(null), 4200);
  };

  const loadWorkspace = useCallback(async (companyId: string) => {
    if (!supabase) return;
    setProductCategoryFilter("all");
    const [p,w,s,c,m,b,po,sa] = await Promise.all([
      supabase.from("products").select("*").eq("company_id",companyId).order("created_at",{ascending:false}),
      supabase.from("warehouses").select("*").eq("company_id",companyId).order("created_at"),
      supabase.from("suppliers").select("*").eq("company_id",companyId).order("name"),
      supabase.from("customers").select("*").eq("company_id",companyId).order("name"),
      supabase.from("stock_movements").select("*, products(name,sku), warehouses(name)").eq("company_id",companyId).order("occurred_at",{ascending:false}).limit(30),
      supabase.from("stock_balances").select("product_id,warehouse_id,quantity_on_hand").eq("company_id",companyId),
      supabase.from("purchase_orders").select("*, suppliers(name)").eq("company_id",companyId).order("created_at",{ascending:false}).limit(50),
      supabase.from("sales").select("*, customers(name)").eq("company_id",companyId).order("sale_date",{ascending:false}).limit(50)
    ]);
    const queryError = [p,w,s,c,m,b,po,sa].find(result => result.error);
    if (queryError?.error) throw queryError.error;
    const categoryResult = await supabase.from("product_categories").select("id,name").eq("company_id",companyId).order("name");
    if (categoryResult.error) throw categoryResult.error;
    setCategories(categoryResult.data ?? []);
    const [os,ou,ov,od,oe]=await Promise.all([
      supabase.from("org_sites").select("id,code,name,is_active").eq("company_id",companyId).eq("is_active",true).order("name"),
      supabase.from("org_units").select("id,code,name,site_id,is_active").eq("company_id",companyId).eq("is_active",true).order("name"),
      supabase.from("org_services").select("id,code,name,site_id,unit_id,is_active").eq("company_id",companyId).eq("is_active",true).order("name"),
      supabase.from("org_departments").select("id,code,name,site_id,unit_id,service_id,is_active").eq("company_id",companyId).eq("is_active",true).order("name"),
      supabase.from("org_equipment").select("id,equipment_tag,name,site_id,unit_id,service_id,department_id,status").eq("company_id",companyId).eq("status","active").order("name")
    ]);
    const orgError=[os,ou,ov,od,oe].find(x=>x.error)?.error;if(orgError)throw orgError;
    setOrgSites(os.data??[]);setOrgUnits(ou.data??[]);setOrgServices(ov.data??[]);setOrgDepartments(od.data??[]);setOrgEquipment((oe.data??[]).map(x=>({...x,is_active:true})));
    const {data:{user:scopeUser}}=await supabase.auth.getUser();
    const scopeResult=scopeUser?await supabase.from("user_scope_assignments").select("scope_type,scope_id,job_title,can_view,can_create,can_edit,can_delete,can_approve,can_issue,can_receive,can_transfer,can_inventory").eq("company_id",companyId).eq("user_id",scopeUser.id):{data:[],error:null};
    if(scopeResult.error)throw scopeResult.error;
    const userScopes=scopeResult.data??[];
    setMyScopeAssignments(userScopes);
    setMyScopeAssignments(userScopes);
    setScopePermissions({canView:userScopes.some(x=>x.can_view),canCreate:userScopes.some(x=>x.can_create),canEdit:userScopes.some(x=>x.can_edit),canDelete:userScopes.some(x=>x.can_delete),canApprove:userScopes.some(x=>x.can_approve),canIssue:userScopes.some(x=>x.can_issue),canReceive:userScopes.some(x=>x.can_receive),canTransfer:userScopes.some(x=>x.can_transfer),canInventory:userScopes.some(x=>x.can_inventory)});
    setProducts((p.data ?? []) as Product[]);
    setWarehouses(w.data ?? []);
    setSuppliers(s.data ?? []);
    setCustomers(c.data ?? []);
    setMovements(m.data ?? []);
    setPurchases(po.data ?? []);
    setSales(sa.data ?? []);
  }, []);

  const loadNotifications = useCallback(async () => {
    if(!supabase||!company||!session?.user?.id)return;
    const {data,error}=await supabase.from("notifications").select("id,title,message,notification_type,entity_type,entity_id,is_read,created_at").eq("company_id",company.id).eq("recipient_user_id",session.user.id).order("created_at",{ascending:false}).limit(30);
    if(error){console.warn("Notifications unavailable:",error.message);return;}
    setNotifications((data??[]) as AppNotification[]);
  },[company?.id,session?.user?.id]);

  const loadCompanies = useCallback(async (userId: string) => {
    if (!supabase) return;
    const {data: memberships,error} = await supabase.from("company_members").select("company_id,role").eq("user_id",userId).eq("is_active",true);
    if (error) throw error;
    const ids = (memberships ?? []).map((m:any) => m.company_id);
    const roleMap = Object.fromEntries((memberships ?? []).map((m:any)=>[m.company_id,m.role]));
    setCompanyRoles(roleMap);
    if (!ids.length) { setCompanies([]); setCompany(null); setCurrentRole("viewer"); setIsAdmin(false); setScopePermissions({canView:false,canCreate:false,canEdit:false,canDelete:false,canApprove:false,canIssue:false,canReceive:false,canTransfer:false,canInventory:false}); return; }
    const {data,error: companyError} = await supabase.from("companies").select("id,name,currency_code,legal_name,tax_number,phone,email,address,city,country").in("id",ids).order("created_at");
    if (companyError) throw companyError;
    const list = (data ?? []) as Company[];
    setCompanies(list);
    const chosen = list[0] ?? null;
    setCompany(chosen);
    const chosenRole = chosen ? (roleMap[chosen.id]||"viewer") : "viewer";
    setCurrentRole(chosenRole);
    const chosenIsAdmin = ["owner","admin"].includes(chosenRole);
    setIsAdmin(chosenIsAdmin);
    if (chosen) {
      await loadWorkspace(chosen.id);
      const {data:moduleRows,error:moduleError}=await supabase.from("user_module_permissions").select("module_key,can_view,can_create,can_edit,can_delete,can_approve,can_issue,can_receive,can_transfer,can_inventory").eq("company_id",chosen.id).eq("user_id",userId);
      if(moduleError)throw moduleError;
      setModulePermissions(Object.fromEntries((moduleRows??[]).map((row:any)=>[row.module_key,row])));
      if (["owner","admin","manager","supervisor"].includes(chosenRole)) {
        const {data: memberRows,error: memberError} = await supabase.rpc("list_company_users",{p_company_id:chosen.id});
        if (memberError) throw memberError;
        setMembers(memberRows ?? []);
        } else { setMembers([]); }
    }  }, [loadWorkspace]);

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
      if (!next) { setCompanies([]); setCompany(null); setProducts([]); setScopePermissions({canView:false,canCreate:false,canEdit:false,canDelete:false,canApprove:false,canIssue:false,canReceive:false,canTransfer:false,canInventory:false}); }
    });
    return () => subscription.unsubscribe();
  }, [loadCompanies]);

  useEffect(()=>{if(!company||!session?.user?.id)return;void loadNotifications();const timer=window.setInterval(()=>void loadNotifications(),30000);return()=>window.clearInterval(timer)},[company?.id,session?.user?.id,loadNotifications]);

  async function markNotificationRead(item:AppNotification){
    if(!supabase||!session?.user?.id)return;
    if(!item.is_read){const {error}=await supabase.from("notifications").update({is_read:true}).eq("id",item.id).eq("recipient_user_id",session.user.id);if(error){flash("error",error.message);return;}setNotifications(list=>list.map(n=>n.id===item.id?{...n,is_read:true}:n));}
    if(item.entity_type==="spare_part_request")setPage("requests");setNotificationsOpen(false);
  }
  async function markAllNotificationsRead(){
    if(!supabase||!company||!session?.user?.id)return;
    const unread=notifications.filter(n=>!n.is_read);if(!unread.length)return;
    const {error}=await supabase.from("notifications").update({is_read:true}).eq("company_id",company.id).eq("recipient_user_id",session.user.id).eq("is_read",false);
    if(error){flash("error",error.message);return;}setNotifications(list=>list.map(n=>({...n,is_read:true})));
  }

  const filteredProducts = useMemo(() => products.filter(p => (productCategoryFilter==="all"||p.category_id===productCategoryFilter)&&[p.name,p.sku,p.barcode ?? "",categories.find(c=>c.id===p.category_id)?.name||""].some(v => v.toLowerCase().includes(search.toLowerCase()))), [products,search,productCategoryFilter,categories]);

  const filteredMovements = useMemo(() => movements.filter((m:any) =>
    [m.products?.name ?? "",m.products?.sku ?? "",m.movement_type ?? "",m.warehouses?.name ?? ""]
      .some((value:string) => value.toLowerCase().includes(movementSearch.trim().toLowerCase()))
  ), [movements,movementSearch]);

  function exportMovements(){
    const rows=[["Date","Article","SKU","Type","Quantité","Entrepôt","Référence"],...filteredMovements.map((m:any)=>[
      new Date(m.occurred_at).toISOString(),m.products?.name??"",m.products?.sku??"",m.movement_type??"",m.quantity??"",m.warehouses?.name??"",m.reference??""
    ])];
    const csv=rows.map(row=>row.map(value=>String.fromCharCode(34)+String(value??"").replace(/"/g,String.fromCharCode(34)+String.fromCharCode(34))+String.fromCharCode(34)).join(";")).join(String.fromCharCode(13,10));
    const blob=new Blob([String.fromCharCode(65279)+csv],{type:"text/csv;charset=utf-8"});
    const url=URL.createObjectURL(blob);const link=document.createElement("a");link.href=url;link.download="mouvements-stock-"+new Date().toISOString().slice(0,10)+".csv";link.click();URL.revokeObjectURL(url);
  }

  async function submitAuth(e: FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true);
    try {
      if (authMode === "signup" && !inviteFlow) throw new Error("Les inscriptions sont sur invitation uniquement.");
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
      setCurrentRole("owner");setIsAdmin(true);setCompanyRoles({[data.id]:"owner"});setSettingsForm({name:data.name,legal_name:"",tax_number:"",phone:"",email:"",address:"",city:"",country:"Algeria",currency_code:data.currency_code||"DZD"});
      await loadWorkspace(data.id);
      flash("success",t.companyCreated);
    } catch (e:any) { flash("error",e.message); }
    finally { setBusy(false); }
  }

  async function archiveProduct(product:Product) {
    if(!supabase||!company)return;
    const nextActive=!product.is_active;
    if(!window.confirm(nextActive?"Réactiver cet article ?":"Archiver cet article ?"))return;
    try{const {error}=await supabase.from("products").update({is_active:nextActive}).eq("id",product.id).eq("company_id",company.id);if(error)throw error;await loadWorkspace(company.id);flash("success",nextActive?"Article réactivé.":"Article archivé.");}catch(e:any){flash("error",e.message)}
  }

  function editRecord(kind:"product"|"warehouse"|"supplier"|"customer",row:any) {
    setEditingId(row.id);
    if(kind==="product")setForm({sku:row.sku||"",name:row.name||"",description:row.description||"",barcode:row.barcode||"",unit:row.unit||"piece",category_id:row.category_id||"",purchase_price:String(row.purchase_price??0),min_stock:String(row.min_stock??0),max_stock:String(row.max_stock??0),reorder_quantity:String(row.reorder_quantity??0),lead_time_days:String(row.lead_time_days??0),track_lots:String(row.track_lots??false),track_serial_numbers:String(row.track_serial_numbers??false),weight:String(row.weight??0),volume:String(row.volume??0)});
    else if(kind==="warehouse")setForm({code:row.code||"",name:row.name||"",address:row.address||"",site_id:row.site_id||"",unit_id:row.unit_id||"",service_id:row.service_id||"",department_id:row.department_id||"",equipment_id:row.equipment_id||""});
    else if(kind==="supplier")setForm({name:row.name||"",contact_name:row.contact_name||"",phone:row.phone||"",email:row.email||"",address:row.address||"",tax_number:row.tax_number||"",notes:row.notes||""});
    else setForm({name:row.name||"",phone:row.phone||"",email:row.email||"",address:row.address||"",tax_number:row.tax_number||"",notes:row.notes||""});
    setModal(kind);
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
        payload = {...payload,category_id:form.category_id||null,sku:form.sku?.trim(),name:form.name?.trim(),description:form.description?.trim()||null,barcode:form.barcode?.trim()||null,unit:form.unit||"piece",purchase_price:Number(form.purchase_price||0),min_stock:Number(form.min_stock||0),max_stock:Number(form.max_stock||0),reorder_quantity:Number(form.reorder_quantity||0),lead_time_days:Number(form.lead_time_days||0),track_lots:form.track_lots==="true",track_serial_numbers:form.track_serial_numbers==="true",weight:Number(form.weight||0),volume:Number(form.volume||0)};
      } else if (modal === "warehouse") {
        table = "warehouses"; payload = {...payload,code:form.code?.trim().toUpperCase(),name:form.name?.trim(),address:form.address?.trim()||null,site_id:form.site_id||null,unit_id:form.unit_id||null,service_id:form.service_id||null,department_id:form.department_id||null,equipment_id:form.equipment_id||null};
      } else if (modal === "supplier") {
        table = "suppliers"; payload = {...payload,name:form.name?.trim(),contact_name:form.contact_name?.trim()||null,phone:form.phone?.trim()||null,email:form.email?.trim()||null,address:form.address?.trim()||null,tax_number:form.tax_number?.trim()||null,notes:form.notes?.trim()||null};
      } else if (modal === "customer") {
        table = "customers"; payload = {...payload,name:form.name?.trim(),phone:form.phone?.trim()||null,email:form.email?.trim()||null,address:form.address?.trim()||null,tax_number:form.tax_number?.trim()||null,notes:form.notes?.trim()||null};
      } else if (modal === "movement") {
        table = "stock_movements"; payload = {...payload,product_id:form.product_id,warehouse_id:form.warehouse_id,movement_type:form.movement_type,quantity:Number(form.quantity),note:form.note||null,created_by:session?.user?.id};
      } else if (modal === "purchase") {
        const {error}=await supabase.rpc("receive_purchase_order",{p_company_id:company.id,p_supplier_id:form.supplier_id||null,p_warehouse_id:form.warehouse_id,p_order_number:form.order_number||`CA-${new Date().getFullYear()}${String(new Date().getMonth()+1).padStart(2,"0")}${String(new Date().getDate()).padStart(2,"0")}-${String(Date.now()).slice(-5)}`,p_lines:documentLines.filter(line=>line.product_id&&Number(line.quantity)>0).map(line=>({product_id:line.product_id,quantity:Number(line.quantity),unit_cost:Number(line.unit_price)})),p_notes:form.note||null});
        if(error) throw error;
      } else if (modal === "sale") {
        const {error}=await supabase.rpc("create_stock_sale",{p_company_id:company.id,p_customer_id:form.customer_id||null,p_warehouse_id:form.warehouse_id,p_invoice_number:form.order_number||`VTE-${Date.now()}`,p_lines:documentLines.filter(line=>line.product_id&&Number(line.quantity)>0).map(line=>({product_id:line.product_id,quantity:Number(line.quantity),unit_price:Number(line.unit_price),discount:Number(line.discount||0)})),p_discount:Number(form.discount||0),p_notes:form.note||null});
        if(error) throw error;
      }
      if (table) { const query=editingId?supabase.from(table).update(payload).eq("id",editingId).eq("company_id",company.id):supabase.from(table).insert(payload);const {error}=await query;if(error)throw error; }
      await loadWorkspace(company.id);
      setModal(null); setForm({}); setEditingId(null);
      flash("success",modal==="product"?t.productSaved:t.save+" ✓");
    } catch (e:any) { flash("error",e.message); }
    finally { setBusy(false); }
  }

  async function printDocument(kind:"sale"|"purchase",id:string) {
    if(!supabase||!company)return;
    const printWindow=window.open("","_blank","width=960,height=720");
    if(!printWindow){flash("error","Autorisez les fenêtres pop-up pour imprimer le document.");return;}
    try{
      const [companyResult,documentResult]=await Promise.all([
        supabase.from("companies").select("name,legal_name,tax_number,phone,email,address,city,country,currency_code").eq("id",company.id).single(),
        kind==="sale"
          ? supabase.from("sales").select("*, customers(name,phone,address), sale_items(quantity,unit_price,discount,line_total,products(name,sku,unit))").eq("id",id).eq("company_id",company.id).single()
          : supabase.from("purchase_orders").select("*, suppliers(name,phone,address), purchase_order_items(quantity,unit_cost,products(name,sku,unit))").eq("id",id).eq("company_id",company.id).single()
      ]);
      if(companyResult.error)throw companyResult.error;if(documentResult.error)throw documentResult.error;
      const c=companyResult.data as any;const d=documentResult.data as any;
      const esc=(v:any)=>String(v??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]||ch));
      const currency=c.currency_code||"DZD";
      const fmt=(v:number)=>new Intl.NumberFormat("fr-DZ",{style:"currency",currency,maximumFractionDigits:2}).format(Number(v)||0);
      const items=kind==="sale"?(d.sale_items||[]):(d.purchase_order_items||[]);
      const lines=items.map((line:any)=>{const product=line.products||{};const qty=Number(line.quantity||0);const price=Number(kind==="sale"?line.unit_price:line.unit_cost)||0;const discount=Number(line.discount||0);const total=kind==="sale"?Number(line.line_total||0):qty*price;return "<tr><td>"+esc(product.sku)+"</td><td>"+esc(product.name)+"</td><td>"+esc(product.unit)+"</td><td class='num'>"+qty+"</td><td class='num'>"+fmt(price)+"</td><td class='num'>"+fmt(discount)+"</td><td class='num'>"+fmt(total)+"</td></tr>";}).join("");
      const number=kind==="sale"?d.invoice_number:d.order_number;
      const date=kind==="sale"?d.sale_date:d.order_date;
      const partner=kind==="sale"?d.customers:d.suppliers;
      const subtotal=Number(d.subtotal||0);const discount=Number(d.discount||0);const total=kind==="sale"?Number(d.total||0):subtotal;
      printWindow.document.write("<!doctype html><html lang='fr'><head><meta charset='utf-8'><title>"+esc(number)+"</title><style>body{font:13px Arial,sans-serif;color:#1d2939;margin:36px}header{display:flex;justify-content:space-between;border-bottom:2px solid #243b73;padding-bottom:18px}h1{font-size:22px;margin:0 0 8px}h2{font-size:18px;color:#243b73;margin:28px 0 12px}.muted{color:#667085;line-height:1.6}.meta{margin:22px 0;display:flex;justify-content:space-between}.box{background:#f6f8fb;padding:14px;border-radius:8px;min-width:220px}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{padding:10px 8px;border-bottom:1px solid #e4e7ec;text-align:left}th{background:#f6f8fb;font-size:11px}.num{text-align:right;white-space:nowrap}.totals{margin:22px 0 0 auto;width:300px}.totals div{display:flex;justify-content:space-between;padding:7px}.grand{font-size:18px;font-weight:bold;border-top:2px solid #243b73;margin-top:8px}.foot{margin-top:50px;text-align:center;color:#667085;font-size:10px}@media print{body{margin:16mm}}</style></head><body><header><div><h1>"+esc(c.legal_name||c.name)+"</h1><div class='muted'>"+esc(c.address||"")+" "+esc(c.city||"")+" "+esc(c.country||"")+"</div><div class='muted'>"+esc(c.phone||"")+" · "+esc(c.email||"")+"</div><div class='muted'>NIF / Identifiant: "+esc(c.tax_number||"—")+"</div></div><div style='text-align:right'><h1>"+(kind==="sale"?"FACTURE DE VENTE":"BON D’ACHAT")+"</h1><b>"+esc(number)+"</b><div class='muted'>Date: "+esc(new Date(date).toLocaleDateString("fr-FR"))+"</div></div></header><div class='meta'><div class='box'><b>"+(kind==="sale"?"Client":"Fournisseur")+"</b><div>"+esc(partner?.name||"—")+"</div><div class='muted'>"+esc(partner?.phone||"")+"</div><div class='muted'>"+esc(partner?.address||"")+"</div></div><div class='box'><b>Statut</b><div>"+esc(d.status||"—")+"</div></div></div><h2>Détail des articles</h2><table><thead><tr><th>Référence</th><th>Article</th><th>Unité</th><th class='num'>Qté</th><th class='num'>Prix unitaire</th><th class='num'>Remise</th><th class='num'>Total</th></tr></thead><tbody>"+lines+"</tbody></table><div class='totals'><div><span>Sous-total</span><b>"+fmt(subtotal)+"</b></div>"+(kind==="sale"?"<div><span>Remise facture</span><b>"+fmt(discount)+"</b></div>":"")+"<div class='grand'><span>Total</span><b>"+fmt(total)+"</b></div></div><div class='foot'>Document généré par Gestion Stock Pro · Merci pour votre confiance.</div><script>window.onload=()=>{window.focus();window.print()}</script></body></html>");
      printWindow.document.close();
    }catch(e:any){printWindow.close();flash("error",e.message);}
  }

  async function saveCompanySettings(e:FormEvent) {
    e.preventDefault();if(!supabase||!company||!isAdmin)return;setBusy(true);
    try{
      const payload={name:settingsForm.name?.trim(),legal_name:settingsForm.legal_name?.trim()||null,tax_number:settingsForm.tax_number?.trim()||null,phone:settingsForm.phone?.trim()||null,email:settingsForm.email?.trim()||null,address:settingsForm.address?.trim()||null,city:settingsForm.city?.trim()||null,country:settingsForm.country?.trim()||"Algeria",currency_code:settingsForm.currency_code||"DZD"};
      const {data,error}=await supabase.from("companies").update(payload).eq("id",company.id).select("id,name,currency_code,legal_name,tax_number,phone,email,address,city,country").single();
      if(error)throw error;setCompany(data as Company);setCompanies(list=>list.map(x=>x.id===company.id?data as Company:x));flash("success","Paramètres de l'entreprise enregistrés.");
    }catch(e:any){flash("error",e.message)}finally{setBusy(false)}
  }

  async function signOut() {
    if (supabase) await supabase.auth.signOut();
    setSession(null); setCompany(null); setCompanies([]); setProducts([]); setMembers([]); setCompanyRoles({}); setCurrentRole("viewer"); setIsAdmin(false);
  }

  async function refreshTeam(){if(!supabase||!company)return;const team=await supabase.rpc("list_company_users",{p_company_id:company.id});if(team.error)flash("error",team.error.message);else setMembers(team.data??[]);}

  const accessFor = (key:string) => {const p=modulePermissions[key]||{};return {canView:p.can_view??scopePermissions.canView,canCreate:p.can_create??scopePermissions.canCreate,canEdit:p.can_edit??scopePermissions.canEdit,canDelete:p.can_delete??scopePermissions.canDelete,canApprove:p.can_approve??scopePermissions.canApprove,canIssue:p.can_issue??scopePermissions.canIssue,canReceive:p.can_receive??scopePermissions.canReceive,canTransfer:p.can_transfer??scopePermissions.canTransfer,canInventory:p.can_inventory??scopePermissions.canInventory,isAdmin};};
  const canManageUsers = ["owner","admin","manager","supervisor"].includes(currentRole);
  const visibleNav = nav.filter(item=>{if(item.id==="users")return canManageUsers;if(isAdmin)return true;if(item.id==="settings"||item.id==="organization")return false;if(item.id==="dashboard")return true;if(modulePermissions[item.id])return modulePermissions[item.id].can_view;return scopePermissions.canView||Object.values(scopePermissions).some(Boolean) ? ["spareParts","requests","stock","transfers","inventory","warehouses","locations","reports","equipment","products","categories","suppliers"].includes(item.id) : false;});
  const title = t[page];
  const money = (value:number) => new Intl.NumberFormat(lang==="en"?"en-US":lang==="ar"?"ar-DZ":"fr-DZ",{style:"currency",currency:company?.currency_code||"DZD",maximumFractionDigits:0}).format(value||0);
  const documentGross=documentLines.reduce((sum,line)=>sum+Math.max(0,Number(line.quantity||0))*Math.max(0,Number(line.unit_price||0)),0);
  const documentLineDiscount=documentLines.reduce((sum,line)=>sum+Math.max(0,Number(line.discount||0)),0);
  const documentNet=Math.max(0,documentGross-documentLineDiscount);
  const documentTotal=Math.max(0,documentNet-(modal==="sale"?Math.max(0,Number(form.discount||0)):0));
  if (!isSupabaseConfigured) return <div className="config-screen"><div className="auth-card"><div className="brand-mark"><Boxes size={26}/></div><h1>Gestion Stock Pro</h1><p>{t.configError}</p><code>VITE_SUPABASE_URL<br/>VITE_SUPABASE_PUBLISHABLE_KEY</code></div></div>;
  if (loading) return <div className="loading-screen"><div className="spinner"/><span>{t.loading}</span></div>;

  if (!session) return <div className="auth-screen" dir={rtl?"rtl":"ltr"}>
    <div className="auth-visual"><div className="auth-brand"><span className="brand-mark sophal-brand-mark"><img className="sophal-brand-image" src="/sophal-mark.svg" alt="SOPHAL" /></span><b>Gestion Stock Pro</b></div><div className="visual-copy"><span className="eyebrow">{lang==="ar"?"الصيانة · قطع الغيار · مراقبة المخزون":"MAINTENANCE · SPARE PARTS · STOCK CONTROL"}</span><h1>{lang==="ar"?"تحكم أفضل في مخزونك.":"Votre stock, enfin sous contrôle."}</h1><p>{lang==="ar"?"منصة لإدارة مخزون قطع غيار الصيانة والمعدات.":"Une plateforme dédiée au stock des pièces de rechange de maintenance."}</p><div className="visual-stats"><div><b>01</b><span>{lang==="ar"?"مساحة العمل":lang==="en"?"Workspace":"Espace"}</span></div><div><b>02</b><span>{lang==="ar"?"المخزون":lang==="en"?"Inventory":"Stock"}</span></div><div><b>03</b><span>{lang==="ar"?"التحليلات":lang==="en"?"Insights":"Analyses"}</span></div></div></div><div className="visual-footer">Gestion Stock Pro · {new Date().getFullYear()}</div></div>
    <div className="auth-panel"><div className="lang-switch"><Languages size={16}/><select value={lang} onChange={e=>setLang(e.target.value as Lang)}><option value="fr">Français</option><option value="en">English</option><option value="ar">العربية</option></select></div><form className="auth-form" onSubmit={submitAuth}><span className="eyebrow">{authMode==="login"?"ESPACE SÉCURISÉ":"NOUVEAU COMPTE"}</span><h2>{authMode==="login"?t.login:t.signup}</h2><p>{t.authSubtitle}</p><label>{t.email}<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required autoComplete="email"/></label><label>{t.password}<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required minLength={8} autoComplete={authMode==="login"?"current-password":"new-password"}/></label><button className="primary-btn full" disabled={busy}>{busy?t.loading:authMode==="login"?t.login:t.signup}</button>{inviteFlow&&<div className="auth-toggle">{authMode==="login"?t.haveAccount:t.login} <button type="button" onClick={()=>setAuthMode(authMode==="login"?"signup":"login")}>{authMode==="login"?t.signup:t.login}</button></div>}
      {!inviteFlow&&<div className="auth-toggle">Accès réservé aux utilisateurs invités par l’administrateur.</div>}<div className="secure-note"><ShieldCheck size={15}/> Connexion sécurisée · Supabase Auth</div></form></div>
    {notice&&<div className={"toast "+notice.type}>{notice.text}</div>}
  </div>;

  if (!company) return <div className="setup-screen" dir={rtl?"rtl":"ltr"}><div className="setup-card"><span className="brand-mark"><Building2/></span><h1>{t.companySetup}</h1><p>{t.noCompany}</p><form onSubmit={createCompany}><label>{t.company}<input value={companyName} onChange={e=>setCompanyName(e.target.value)} required minLength={2}/></label><button className="primary-btn full" disabled={busy}>{busy?t.loading:t.createCompany}</button></form><button className="text-btn" onClick={signOut}>{t.logout}</button></div>{notice&&<div className={"toast "+notice.type}>{notice.text}</div>}</div>;

  return <div className="app-shell" dir={rtl?"rtl":"ltr"}>
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark sophal-brand-mark"><img className="sophal-brand-image" src="/sophal-mark.svg" alt="SOPHAL" /></span><div><b>Gestion Stock</b><small>PRO MANAGEMENT</small></div></div>
      <div className="workspace-switch"><span className="workspace-icon"><Building2 size={17}/></span><div><small>{t.chooseCompany}</small><select className="workspace-select" value={company.id} onChange={async e=>{const selected=companies.find(c=>c.id===e.target.value);if(selected){const role=companyRoles[selected.id]||"viewer";setCompany(selected);setSettingsForm({name:selected.name,legal_name:selected.legal_name||"",tax_number:selected.tax_number||"",phone:selected.phone||"",email:selected.email||"",address:selected.address||"",city:selected.city||"",country:selected.country||"Algeria",currency_code:selected.currency_code||"DZD"});setCurrentRole(role);const admin=["owner","admin"].includes(role);const canManage=["owner","admin","manager","supervisor"].includes(role);setIsAdmin(admin);await loadWorkspace(selected.id);const moduleRows=await supabase?.from("user_module_permissions").select("module_key,can_view,can_create,can_edit,can_delete,can_approve,can_issue,can_receive,can_transfer,can_inventory").eq("company_id",selected.id).eq("user_id",session.user.id);if(moduleRows?.error)flash("error",moduleRows.error.message);else setModulePermissions(Object.fromEntries((moduleRows?.data??[]).map((row:any)=>[row.module_key,{can_view:row.can_view,can_create:row.can_create,can_edit:row.can_edit,can_delete:row.can_delete,can_approve:row.can_approve,can_issue:row.can_issue,can_receive:row.can_receive,can_transfer:row.can_transfer,can_inventory:row.can_inventory}])));if(canManage){const result=await supabase?.rpc("list_company_users",{p_company_id:selected.id});if(result?.error)flash("error",result.error.message);else setMembers(result?.data??[]);}else{setMembers([])}}}}>{companies.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div><ChevronDown size={15}/></div>
      <nav className="sidebar-navigation">{(["workspace","administration"] as const).map(group=>{const items=visibleNav.filter(item=>item.group===group);if(!items.length)return null;const groupLabel=group==="workspace"?(lang==="ar"?"مساحة العمل":lang==="en"?"WORKSPACE":"ESPACE DE TRAVAIL"):(lang==="ar"?"إدارة النظام":lang==="en"?"ADMINISTRATION":"ADMINISTRATION");return <div className="nav-group" key={group}><div className="nav-group-title">{groupLabel}</div>{items.map(item=>{const Icon=item.icon;const label=t[item.id];return <button key={item.id} type="button" title={label} aria-label={label} aria-current={page===item.id?"page":undefined} className={"nav-item "+(page===item.id?"active":"")} onClick={()=>setPage(item.id)}><Icon size={18}/><span>{label}</span>{item.id==="stock"&&<i className="nav-dot"/>}</button>})}</div>})}</nav>
      <div className="sidebar-bottom"><div className="help-card"><CircleHelp size={18}/><b>Besoin d'aide ?</b><span>Votre gestion, simplifiée.</span></div><button className="nav-item" onClick={()=>setLang(lang==="fr"?"en":lang==="en"?"ar":"fr")}><Languages size={18}/><span>{t.language}: {lang.toUpperCase()}</span></button><button className="nav-item" onClick={signOut}><LogOut size={18}/><span>{t.logout}</span></button><div className="user-mini"><div className="avatar">{session.user.email?.slice(0,1).toUpperCase()}</div><div><b>{session.user.email?.split("@")[0]}</b><small>{session.user.email}</small></div><Settings size={16}/></div></div>
    </aside>
    <main className="main-area">
      <header className="topbar"><div className="mobile-brand"><span className="brand-mark sophal-brand-mark"><img className="sophal-brand-image" src="/sophal-mark.svg" alt="SOPHAL" /></span><b>Gestion Stock Pro</b></div><div className="breadcrumbs">{lang==="ar"?"مساحة العمل":lang==="en"?"Workspace":"Espace de travail"} <span>/</span> <b>{title}</b></div><div className="top-actions"><div className="global-search"><Search size={16}/><input placeholder={t.search} value={search} onChange={e=>setSearch(e.target.value)}/><kbd>⌘ K</kbd></div><button type="button" className="icon-btn install-trigger" title={lang==="ar"?"تثبيت التطبيق":lang==="en"?"Install app":"Installer l’application"} aria-label={lang==="ar"?"تثبيت التطبيق":lang==="en"?"Install app":"Installer l’application"} onClick={()=>void installApp()}><Download size={17}/><span>{lang==="ar"?"تثبيت":lang==="en"?"Install":"Installer"}</span></button><button type="button" className="icon-btn language-trigger" title={lang==="ar"?"تغيير اللغة":lang==="en"?"Change language":"Changer la langue"} aria-label={lang==="ar"?"تغيير اللغة":lang==="en"?"Change language":"Changer la langue"} onClick={()=>setLang(v=>v==="fr"?"en":v==="en"?"ar":"fr")}><Languages size={17}/><span>{lang.toUpperCase()}</span></button><button className="icon-btn" title="Import / Export Excel" aria-label="Import / Export Excel" onClick={()=>setImportExportOpen(true)}><FileSpreadsheet size={18}/></button><button type="button" className="icon-btn scanner-trigger" title={lang==="ar"?"مسح الباركود":lang==="en"?"Scan barcode":"Scanner code-barres"} aria-label={lang==="ar"?"مسح الباركود":lang==="en"?"Scan barcode":"Scanner code-barres"} onClick={()=>setScannerOpen(true)}><ScanBarcode size={18}/><span>{lang==="ar"?"مسح":lang==="en"?"Scan":"Scanner"}</span></button><div className="notification-wrap"><button className={"icon-btn notification-trigger "+(notificationsOpen?"is-open":"")} title={lang==="ar"?"الإشعارات":lang==="en"?"Notifications":"Notifications"} aria-label={lang==="ar"?"الإشعارات":lang==="en"?"Notifications":"Notifications"} aria-expanded={notificationsOpen} onClick={()=>setNotificationsOpen(v=>!v)}><Bell size={18}/>{notifications.some(n=>!n.is_read)&&<i className="notification-badge">{notifications.filter(n=>!n.is_read).length>99?"99+":notifications.filter(n=>!n.is_read).length}</i>}</button>{notificationsOpen&&<><button className="notification-dismiss" aria-label="Close notifications" onClick={()=>setNotificationsOpen(false)}/><section className="notification-popover"><div className="notification-popover-head"><div><b>{lang==="ar"?"الإشعارات":lang==="en"?"Notifications":"Notifications"}</b><small>{notifications.filter(n=>!n.is_read).length} {lang==="ar"?"غير مقروء":lang==="en"?"unread":"non lues"}</small></div><button type="button" onClick={()=>void markAllNotificationsRead()} disabled={!notifications.some(n=>!n.is_read)}><CheckCheck size={14}/>{lang==="ar"?"قراءة الكل":lang==="en"?"Mark all read":"Tout lire"}</button></div><div className="notification-list">{notifications.length?notifications.map(item=><button type="button" key={item.id} className={"notification-item "+(!item.is_read?"unread":"")} onClick={()=>void markNotificationRead(item)}><span className="notification-item-icon"><Bell size={15}/></span><span className="notification-item-copy"><b>{item.title}</b><small>{item.message}</small><time>{new Date(item.created_at).toLocaleString(lang==="ar"?"ar-DZ":lang==="en"?"en-US":"fr-FR",{dateStyle:"short",timeStyle:"short"})}</time></span>{!item.is_read&&<i className="notification-unread-dot"/>}</button>):<div className="notification-empty"><Bell size={22}/><b>{lang==="ar"?"لا توجد إشعارات":lang==="en"?"You’re all caught up":"Aucune notification"}</b><small>{lang==="ar"?"ستظهر هنا آخر التحديثات":lang==="en"?"New updates will appear here":"Les nouvelles activités apparaîtront ici"}</small></div>}</div></section></>}</div><button className="icon-btn mobile-logout" type="button" title={t.logout} aria-label={t.logout} onClick={signOut}><LogOut size={18}/></button><div className="top-avatar">{session.user.email?.slice(0,1).toUpperCase()}</div></div></header>
      <div className="page-content">
        <div className="page-heading"><div><span className="eyebrow">{company.name.toUpperCase()} · {new Date().toLocaleDateString(lang==="ar"?"ar-DZ":lang==="en"?"en-US":"fr-FR",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</span><h1>{page==="dashboard"?t.welcome:title}</h1><p>{page==="requests"?(lang==="ar"?"إنشاء ومتابعة طلبات قطع الغيار قبل صرفها من المخزن":lang==="en"?"Create and track spare-part requests before warehouse issue":"Créer et suivre les demandes de pièces avant leur délivrance par le magasin"):page==="spareParts"?(lang==="ar"?"المرجع التقني والتوافق مع المعدات والمخزون":lang==="en"?"Technical catalogue, equipment compatibility and stock":"Référentiel technique, compatibilité équipements et disponibilité du stock"):t.subtitle}</p></div>{page==="products"&&["owner","admin","manager"].includes(currentRole)&&<button className="primary-btn" onClick={()=>{setEditingId(null);setForm({unit:"piece"});setModal("product")}}><Plus size={17}/>{t.addProduct}</button>}{page==="warehouses"&&["owner","admin","manager"].includes(currentRole)&&<button className="primary-btn" onClick={()=>{setEditingId(null);setForm({});setModal("warehouse")}}><Plus size={17}/>{t.addWarehouse}</button>}{page==="suppliers"&&["owner","admin","manager","warehouse"].includes(currentRole)&&<button className="primary-btn" onClick={()=>{setEditingId(null);setForm({});setModal("supplier")}}><Plus size={17}/>{t.addSupplier}</button>}{page==="customers"&&["owner","admin","manager","sales"].includes(currentRole)&&<button className="primary-btn" onClick={()=>{setEditingId(null);setForm({});setModal("customer")}}><Plus size={17}/>{t.addCustomer}</button>}{page==="stock"&&["owner","admin","manager","warehouse"].includes(currentRole)&&<button className="primary-btn" onClick={()=>setModal("movement")}><Plus size={17}/>{t.addMovement}</button>}</div>

        <ModuleErrorBoundary resetKey={page} lang={lang}>
        {page==="dashboard"&&<SparePartsDashboard companyId={company.id} currency={company.currency_code||"DZD"} lang={lang} onNavigate={setPage}/>}

        {page==="products"&&<section className="panel"><div className="panel-head"><div><h3>{t.products}</h3><p>{filteredProducts.length} / {products.length} {t.items.toLowerCase()}</p></div><div className="product-filters"><select value={productCategoryFilter} onChange={e=>setProductCategoryFilter(e.target.value)}><option value="all">{lang==="ar"?"كل الفئات":lang==="en"?"All categories":"Toutes les catégories"}</option>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select><div className="table-search"><Search size={15}/><input placeholder={t.search} value={search} onChange={e=>setSearch(e.target.value)}/></div></div></div><ProductTable products={filteredProducts} categories={categories} money={money} t={t} onEdit={["owner","admin","manager"].includes(currentRole)?p=>editRecord("product",p):undefined} onArchive={["owner","admin","manager"].includes(currentRole)?p=>void archiveProduct(p):undefined}/></section>}
        {page==="warehouses"&&<section className="panel"><div className="panel-head"><div><h3>{t.warehouses}</h3><p>{warehouses.length} {t.warehouses.toLowerCase()}</p></div></div>{warehouses.length? <div className="simple-list">{warehouses.map(w=><div className="simple-row" key={w.id}><span className="list-icon"><Warehouse size={18}/></span><div><b>{w.name}</b><small>{w.code}</small></div><span className="status-pill">{w.is_active?(lang==="ar"?"نشط":lang==="en"?"Active":"Actif"):(lang==="ar"?"غير نشط":lang==="en"?"Inactive":"Inactif")}</span>{["owner","admin","manager"].includes(currentRole)&&<button className="ops-icon-btn" onClick={()=>editRecord("warehouse",w)}><Settings size={14}/></button>}</div>)}</div>:<Empty t={t}/>}</section>}
        {page==="suppliers"&&<SimpleDirectory title={t.suppliers} rows={suppliers} icon="supplier" empty={t.empty} onEdit={["owner","admin","manager"].includes(currentRole)?r=>editRecord("supplier",r):undefined}/>}
        {page==="customers"&&<SimpleDirectory title={t.customers} rows={customers} icon="customer" empty={t.empty} onEdit={["owner","admin","manager","sales"].includes(currentRole)?r=>editRecord("customer",r):undefined}/>}
        {page==="stock"&&<section className="panel"><div className="panel-head"><div><h3>{t.stock}</h3><p>{filteredMovements.length} / {movements.length} {t.movements.toLowerCase()}</p></div><div className="table-search"><Search size={15}/><input aria-label={t.movementSearch} placeholder={t.movementSearch} value={movementSearch} onChange={e=>setMovementSearch(e.target.value)}/><button type="button" className="secondary-btn" onClick={exportMovements} disabled={!filteredMovements.length}>{t.exportMovements}</button></div></div>{filteredMovements.length?<div className="table-wrap"><table><thead><tr><th>{t.name}</th><th>{t.movementType}</th><th>{t.quantity}</th><th>{t.warehouse}</th><th>Date</th></tr></thead><tbody>{filteredMovements.map((m:any)=><tr key={m.id}><td><b>{m.products?.name||"—"}</b><small className="cell-sub">{m.products?.sku}</small></td><td><span className="status-pill">{m.movement_type}</span></td><td>{m.quantity}</td><td>{m.warehouses?.name||"—"}</td><td>{new Date(m.occurred_at).toLocaleDateString()}</td></tr>)}</tbody></table></div>:<Empty t={t}/>}</section>}
        {page==="purchases"&&<section className="panel"><div className="panel-head"><div><h3>{t.purchases}</h3><p>{purchases.length} commande(s) · réception automatique en stock</p></div><button className="primary-btn" disabled={currentRole==="viewer"} onClick={()=>{setForm({});setDocumentLines([{product_id:"",quantity:"",unit_price:"",discount:"0"}]);setModal("purchase")}}><Plus size={16}/>Nouvel achat</button></div>{purchases.length?<div className="table-wrap"><table><thead><tr><th>N° CA</th><th>{t.suppliers}</th><th>Date</th><th>Statut</th><th>Total</th><th>Document</th></tr></thead><tbody>{purchases.map(x=><tr key={x.id}><td><b>{x.order_number}</b></td><td>{x.suppliers?.name||"—"}</td><td>{new Date(x.order_date).toLocaleDateString()}</td><td><span className="status-pill positive">{x.status}</span></td><td>{money(Number(x.subtotal))}</td><td><button className="ops-icon-btn" title="Imprimer le bon" onClick={()=>void printDocument("purchase",x.id)}><Printer size={15}/></button></td></tr>)}</tbody></table></div>:<Empty t={t}/>}</section>}
        {page==="settings"&&isAdmin&&<section className="panel"><div className="panel-head"><div><h3>{lang==="ar"?"إعدادات الشركة":lang==="en"?"Company settings":"Paramètres de l'entreprise"}</h3><p>{lang==="ar"?"المعلومات القانونية وبيانات الاتصال المستخدمة في الوثائق المطبوعة":lang==="en"?"Legal details and contact information used on printed documents":"Informations légales et coordonnées utilisées sur les documents imprimés"}</p></div></div><form className="form-grid" onSubmit={saveCompanySettings}><label>{lang==="ar"?"الاسم التجاري":lang==="en"?"Company name":"Nom commercial"}<input value={settingsForm.name||""} onChange={e=>setSettingsForm({...settingsForm,name:e.target.value})} required/></label><label>{lang==="ar"?"الاسم القانوني":lang==="en"?"Legal name":"Raison sociale"}<input value={settingsForm.legal_name||""} onChange={e=>setSettingsForm({...settingsForm,legal_name:e.target.value})}/></label><label>{lang==="ar"?"الرقم الجبائي":lang==="en"?"Tax ID":"NIF / Identifiant fiscal"}<input value={settingsForm.tax_number||""} onChange={e=>setSettingsForm({...settingsForm,tax_number:e.target.value})}/></label><label>{lang==="ar"?"الهاتف":lang==="en"?"Phone":"Téléphone"}<input value={settingsForm.phone||""} onChange={e=>setSettingsForm({...settingsForm,phone:e.target.value})}/></label><label>{lang==="ar"?"البريد الإلكتروني":lang==="en"?"Email":"E-mail"}<input type="email" value={settingsForm.email||""} onChange={e=>setSettingsForm({...settingsForm,email:e.target.value})}/></label><label>{lang==="ar"?"المدينة":lang==="en"?"City":"Ville"}<input value={settingsForm.city||""} onChange={e=>setSettingsForm({...settingsForm,city:e.target.value})}/></label><label className="span-2">{lang==="ar"?"العنوان":lang==="en"?"Address":"Adresse"}<input value={settingsForm.address||""} onChange={e=>setSettingsForm({...settingsForm,address:e.target.value})}/></label><label>{lang==="ar"?"البلد":lang==="en"?"Country":"Pays"}<input value={settingsForm.country||"Algeria"} onChange={e=>setSettingsForm({...settingsForm,country:e.target.value})}/></label><label>{lang==="ar"?"العملة":lang==="en"?"Currency":"Devise"}<select value={settingsForm.currency_code||"DZD"} onChange={e=>setSettingsForm({...settingsForm,currency_code:e.target.value})}><option value="DZD">DZD · Dinar algérien</option><option value="EUR">EUR · Euro</option><option value="USD">USD · Dollar américain</option></select></label><div className="span-2 modal-actions"><button className="primary-btn" disabled={busy}>{busy?t.loading:t.save}</button></div></form></section>}
        {page==="users"&&canManageUsers&&<UserManagement companyId={company.id} currentUserId={session.user.id} currentRole={currentRole} members={members} myScopes={myScopeAssignments} sites={orgSites} units={orgUnits} services={orgServices} departments={orgDepartments} warehouses={warehouses} equipment={orgEquipment} onRefresh={()=>void refreshTeam()} onNotice={flash} lang={lang}/>}
        {page==="organization"&&isAdmin&&<OrganizationManagement companyId={company.id} members={members} currentUserId={session.user.id} onNotice={flash} lang={lang}/>}
        
        {page==="sales"&&<section className="panel"><div className="panel-head"><div><h3>{t.sales}</h3><p>{sales.length} facture(s) · sortie de stock automatique</p></div><button className="primary-btn" disabled={currentRole==="viewer"} onClick={()=>{setForm({});setDocumentLines([{product_id:"",quantity:"",unit_price:"",discount:"0"}]);setModal("sale")}}><Plus size={16}/>Nouvelle vente</button></div>{sales.length?<div className="table-wrap"><table><thead><tr><th>N° facture</th><th>{t.customers}</th><th>Date</th><th>Statut</th><th>Total</th><th>Document</th></tr></thead><tbody>{sales.map(x=><tr key={x.id}><td><b>{x.invoice_number}</b></td><td>{x.customers?.name||"—"}</td><td>{new Date(x.sale_date).toLocaleDateString()}</td><td><span className="status-pill positive">{x.status}</span></td><td>{money(Number(x.total))}</td><td><button className="ops-icon-btn" title="Imprimer la facture" onClick={()=>void printDocument("sale",x.id)}><Printer size={15}/></button></td></tr>)}</tbody></table></div>:<Empty t={t}/>}</section>}
        {page==="equipment"&&<EquipmentManagement companyId={company.id} lang={lang} equipmentSeed={equipmentSeed} access={accessFor("equipment")} onRequestParts={id=>{setRequestEquipmentId(id);setPage("requests");}}/>}
        {page==="spareParts"&&<SpareParts companyId={company.id} products={products} categories={categories} warehouses={warehouses} suppliers={suppliers} role={currentRole} access={accessFor("spareParts")} lang={lang} searchTerm={search} view="parts" onSaved={()=>loadWorkspace(company.id)}/>}
        {page==="requests"&&<SpareParts companyId={company.id} products={products} categories={categories} warehouses={warehouses} suppliers={suppliers} role={currentRole} access={accessFor("requests")} lang={lang} searchTerm={search} view="requests" initialEquipmentId={requestEquipmentId} onSaved={()=>loadWorkspace(company.id)}/>}
        {(page==="categories"||page==="transfers"||page==="inventory"||page==="locations"||page==="lots"||page==="returns"||page==="expenses"||page==="payments"||page==="reports")&&<StockOperations page={page} companyId={company.id} products={products} categories={categories} warehouses={warehouses} suppliers={suppliers} customers={customers} purchases={purchases} sales={sales} role={currentRole} access={accessFor(page)} money={money} lang={lang} onSaved={()=>loadWorkspace(company.id)}/>}
        </ModuleErrorBoundary>
      </div>
      <footer className="app-footer"><span>© {new Date().getFullYear()} Gestion Stock Pro</span><span><ShieldCheck size={14}/> {lang==="ar"?"البيانات محمية بسياسات RLS":lang==="en"?"Data protected by RLS":"Données protégées par RLS"}</span></footer>
    </main>
    {importExportOpen&&company&&<ImportExportCenter companyId={company.id} lang={lang} canImport={isAdmin||scopePermissions.canCreate} onClose={()=>setImportExportOpen(false)} onDone={()=>loadWorkspace(company.id)}/>}{scannerOpen&&<BarcodeScanner onDetected={async code=>{let scanned=code.trim();try{const url=new URL(scanned,window.location.origin);scanned=url.searchParams.get("equipment")||url.searchParams.get("equipment_tag")||url.pathname.match(/\/equipment\/([^/]+)/)?.[1]||scanned;}catch{}try{const parsed=JSON.parse(scanned);scanned=String(parsed.equipment_id||parsed.equipmentId||parsed.equipment_tag||parsed.equipment||parsed.sku||parsed.product_id||scanned);}catch{}if(company&&supabase){let match:any=null;const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;if(uuid.test(scanned)){const result=await supabase.from("org_equipment").select("id").eq("company_id",company.id).eq("id",scanned).maybeSingle();match=result.data;}if(!match){const result=await supabase.from("org_equipment").select("id").eq("company_id",company.id).eq("equipment_tag",scanned).maybeSingle();match=result.data;}if(match?.id){setEquipmentSeed(match.id);setRequestEquipmentId(match.id);setPage("requests");setScannerOpen(false);return;}}setSearch(scanned);setPage("spareParts");setScannerOpen(false)}} onClose={()=>setScannerOpen(false)}/> }
    {modal&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setModal(null)}}><form className="modal-card" onSubmit={saveRecord}><div className="modal-head"><div><span className="eyebrow">NOUVEL ENREGISTREMENT</span><h2>{modal==="product"?t.addProduct:modal==="warehouse"?t.addWarehouse:modal==="supplier"?t.addSupplier:modal==="customer"?t.addCustomer:modal==="purchase"?"Nouvelle commande d’achat (CA)":modal==="sale"?"Nouvelle vente":t.addMovement}</h2></div><button type="button" className="icon-btn" onClick={()=>{setModal(null);setEditingId(null);setForm({})}}><X size={19}/></button></div>
      {modal==="product"&&<div className="form-grid"><label>{t.sku}<input value={form.sku||""} onChange={e=>setForm({...form,sku:e.target.value})} required/></label><label>{t.name}<input value={form.name||""} onChange={e=>setForm({...form,name:e.target.value})} required/></label><label className="span-2">Description<input value={form.description||""} onChange={e=>setForm({...form,description:e.target.value})}/></label><label>{t.barcode}<input value={form.barcode||""} onChange={e=>setForm({...form,barcode:e.target.value})}/></label><label>{t.unit}<select value={form.unit||"piece"} onChange={e=>setForm({...form,unit:e.target.value})}><option value="piece">Pièce</option><option value="kg">Kg</option><option value="g">g</option><option value="l">Litre</option><option value="m">Mètre</option><option value="box">Carton</option></select></label><label>{t.category}<select value={form.category_id||""} onChange={e=>setForm({...form,category_id:e.target.value})}><option value="">—</option>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label>{t.purchasePrice}<input type="number" min="0" step="0.01" value={form.purchase_price||""} onChange={e=>setForm({...form,purchase_price:e.target.value})}/></label><label>{t.minStock}<input type="number" min="0" step="0.001" value={form.min_stock||""} onChange={e=>setForm({...form,min_stock:e.target.value})}/></label><label>{lang==="ar"?"الحد الأقصى للمخزون":lang==="en"?"Maximum stock":"Stock maximum"}<input type="number" min="0" step="0.001" value={form.max_stock||"0"} onChange={e=>setForm({...form,max_stock:e.target.value})}/></label><label>{lang==="ar"?"كمية إعادة الطلب":lang==="en"?"Reorder quantity":"Quantité de réapprovisionnement"}<input type="number" min="0" step="0.001" value={form.reorder_quantity||"0"} onChange={e=>setForm({...form,reorder_quantity:e.target.value})}/></label><label>{lang==="ar"?"مهلة التوريد (أيام)":lang==="en"?"Lead time (days)":"Délai d’approvisionnement (jours)"}<input type="number" min="0" step="1" value={form.lead_time_days||"0"} onChange={e=>setForm({...form,lead_time_days:e.target.value})}/></label><label>{lang==="ar"?"الوزن":lang==="en"?"Weight":"Poids"}<input type="number" min="0" step="0.001" value={form.weight||"0"} onChange={e=>setForm({...form,weight:e.target.value})}/></label><label>{lang==="ar"?"الحجم":lang==="en"?"Volume":"Volume"}<input type="number" min="0" step="0.001" value={form.volume||"0"} onChange={e=>setForm({...form,volume:e.target.value})}/></label><label className="check-field"><span>{lang==="ar"?"تتبع الدفعات وتواريخ الصلاحية":lang==="en"?"Track lots and expiry dates":"Suivi des lots et dates d’expiration"}</span><input type="checkbox" checked={form.track_lots==="true"} onChange={e=>setForm({...form,track_lots:String(e.target.checked)})}/></label><label className="check-field"><span>{lang==="ar"?"تتبع الأرقام التسلسلية":lang==="en"?"Track serial numbers":"Suivi des numéros de série"}</span><input type="checkbox" checked={form.track_serial_numbers==="true"} onChange={e=>setForm({...form,track_serial_numbers:String(e.target.checked)})}/></label></div>}
      {modal==="warehouse"&&<div className="form-grid"><label>{t.warehouseCode}<input value={form.code||""} onChange={e=>setForm({...form,code:e.target.value})} required/></label><label>{t.warehouseName}<input value={form.name||""} onChange={e=>setForm({...form,name:e.target.value})} required/></label><label>Site<select value={form.site_id||""} onChange={e=>setForm({...form,site_id:e.target.value,unit_id:"",service_id:"",department_id:"",equipment_id:""})}><option value="">— Non affecté —</option>{orgSites.map(x=><option key={x.id} value={x.id}>{x.code} · {x.name}</option>)}</select></label><label>Unité<select value={form.unit_id||""} onChange={e=>setForm({...form,unit_id:e.target.value,service_id:"",department_id:"",equipment_id:""})}><option value="">— Non affectée —</option>{orgUnits.filter(x=>!form.site_id||x.site_id===form.site_id).map(x=><option key={x.id} value={x.id}>{x.code} · {x.name}</option>)}</select></label><label>Service<select value={form.service_id||""} onChange={e=>setForm({...form,service_id:e.target.value,department_id:"",equipment_id:""})}><option value="">— Non affecté —</option>{orgServices.filter(x=>(!form.site_id||x.site_id===form.site_id)&&(!form.unit_id||!x.unit_id||x.unit_id===form.unit_id)).map(x=><option key={x.id} value={x.id}>{x.code} · {x.name}</option>)}</select></label><label>Département<select value={form.department_id||""} onChange={e=>setForm({...form,department_id:e.target.value,equipment_id:""})}><option value="">— Non affecté —</option>{orgDepartments.filter(x=>(!form.site_id||x.site_id===form.site_id)&&(!form.unit_id||!x.unit_id||x.unit_id===form.unit_id)&&(!form.service_id||!x.service_id||x.service_id===form.service_id)).map(x=><option key={x.id} value={x.id}>{x.code} · {x.name}</option>)}</select></label><label>Équipement<select value={form.equipment_id||""} onChange={e=>setForm({...form,equipment_id:e.target.value})}><option value="">— Non affecté —</option>{orgEquipment.filter(x=>(!form.site_id||x.site_id===form.site_id)&&(!form.unit_id||!x.unit_id||x.unit_id===form.unit_id)).map(x=><option key={x.id} value={x.id}>{x.equipment_tag} · {x.name}</option>)}</select></label><label className="span-2">Adresse<input value={form.address||""} onChange={e=>setForm({...form,address:e.target.value})}/></label></div>}
      {(modal==="supplier"||modal==="customer")&&<div className="form-grid"><label>{modal==="supplier"?t.supplierName:t.customerName}<input value={form.name||""} onChange={e=>setForm({...form,name:e.target.value})} required/></label>{modal==="supplier"&&<label>Contact<input value={form.contact_name||""} onChange={e=>setForm({...form,contact_name:e.target.value})}/></label>}<label>{t.phone}<input value={form.phone||""} onChange={e=>setForm({...form,phone:e.target.value})}/></label><label>E-mail<input type="email" value={form.email||""} onChange={e=>setForm({...form,email:e.target.value})}/></label><label>Identifiant fiscal<input value={form.tax_number||""} onChange={e=>setForm({...form,tax_number:e.target.value})}/></label><label className="span-2">Adresse<input value={form.address||""} onChange={e=>setForm({...form,address:e.target.value})}/></label><label className="span-2">Notes<input value={form.notes||""} onChange={e=>setForm({...form,notes:e.target.value})}/></label></div>}
      {(modal==="purchase"||modal==="sale")&&<div className="form-grid">
        <label>{modal==="purchase"?t.suppliers:t.customers}<select value={modal==="purchase"?(form.supplier_id||""):(form.customer_id||"")} onChange={e=>setForm({...form,[modal==="purchase"?"supplier_id":"customer_id"]:e.target.value})}><option value="">—</option>{(modal==="purchase"?suppliers:customers).map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
        <label>{t.warehouse}<select value={form.warehouse_id||""} onChange={e=>setForm({...form,warehouse_id:e.target.value})} required><option value="">—</option>{warehouses.map(w=><option key={w.id} value={w.id}>{w.name}</option>)}</select></label>
        <div className="document-lines span-2"><div className="document-lines-title"><b>Lignes du document</b><button type="button" className="link-btn" onClick={()=>setDocumentLines(lines=>[...lines,{product_id:"",quantity:"",unit_price:"",discount:"0"}])}><Plus size={14}/> Ajouter un article</button></div>{documentLines.map((line,index)=><div className="document-line" key={index}><select value={line.product_id} onChange={e=>setDocumentLines(lines=>lines.map((x,i)=>i===index?{...x,product_id:e.target.value}:x))} required><option value="">Article</option>{products.filter(p=>p.is_active).map(p=><option key={p.id} value={p.id}>{p.name} ({p.sku}) · {categories.find(c=>c.id===p.category_id)?.name||"Sans catégorie"}</option>)}</select><input type="number" min="0.001" step="0.001" placeholder="Qté" value={line.quantity} onChange={e=>setDocumentLines(lines=>lines.map((x,i)=>i===index?{...x,quantity:e.target.value}:x))} required/><input type="number" min="0" step="0.01" placeholder="Prix" value={line.unit_price} onChange={e=>setDocumentLines(lines=>lines.map((x,i)=>i===index?{...x,unit_price:e.target.value}:x))} required/>{modal==="sale"&&<input type="number" min="0" step="0.01" placeholder="Remise" value={line.discount} onChange={e=>setDocumentLines(lines=>lines.map((x,i)=>i===index?{...x,discount:e.target.value}:x))}/>}<button type="button" className="ops-icon-btn" disabled={documentLines.length===1} onClick={()=>setDocumentLines(lines=>lines.filter((_,i)=>i!==index))}><X size={14}/></button></div>)}</div>
        {modal==="sale"&&<label>{lang==="ar"?"خصم الفاتورة":"Remise facture"}<input type="number" min="0" step="0.01" value={form.discount||"0"} onChange={e=>setForm({...form,discount:e.target.value})}/></label>}
<div className="document-summary span-2"><div><span>Sous-total</span><b>{money(documentGross)}</b></div>{modal==="sale"&&<div><span>Remises lignes</span><b>− {money(documentLineDiscount)}</b></div>}{modal==="sale"&&<div><span>Remise facture</span><b>− {money(Number(form.discount||0))}</b></div>}<div className="document-grand-total"><span>Total estimé</span><b>{money(documentTotal)}</b></div></div>
                <label>{modal==="purchase"?"N° CA":"N° facture"}<input value={form.order_number||""} onChange={e=>setForm({...form,order_number:e.target.value})} placeholder={modal==="purchase"?"CA-AAAA-MMJJ-00001 · généré automatiquement":"Généré automatiquement si vide"}/></label>
        <label className="span-2">{t.note}<input value={form.note||""} onChange={e=>setForm({...form,note:e.target.value})}/></label>
      </div>}
      {modal==="movement"&&<div className="form-grid"><label>{t.name}<select value={form.product_id||""} onChange={e=>setForm({...form,product_id:e.target.value})} required><option value="">—</option>{products.map(p=><option key={p.id} value={p.id}>{p.name} ({p.sku}) · {categories.find(c=>c.id===p.category_id)?.name||"Sans catégorie"}</option>)}</select></label><label>{t.warehouse}<select value={form.warehouse_id||""} onChange={e=>setForm({...form,warehouse_id:e.target.value})} required><option value="">—</option>{warehouses.map(w=><option key={w.id} value={w.id}>{w.name}</option>)}</select></label><label>{t.movementType}<select value={form.movement_type||"opening"} onChange={e=>setForm({...form,movement_type:e.target.value})}><option value="opening">{t.opening}</option><option value="adjustment_in">{t.adjustmentIn}</option><option value="adjustment_out">{t.adjustmentOut}</option></select></label><label>{t.quantity}<input type="number" min="0.001" step="0.001" value={form.quantity||""} onChange={e=>setForm({...form,quantity:e.target.value})} required/></label><label className="span-2">{t.note}<input value={form.note||""} onChange={e=>setForm({...form,note:e.target.value})}/></label></div>}
      <div className="modal-actions"><button type="button" className="secondary-btn" onClick={()=>{setModal(null);setEditingId(null);setForm({})}}>{t.cancel}</button><button className="primary-btn" disabled={busy}>{busy?t.loading:t.save}</button></div>
    </form></div>}
    {notice&&<div className={"toast "+notice.type}>{notice.text}</div>}
  </div>;
}

function ProductTable({products,categories,money,t,onEdit,onArchive}:{products:Product[];categories:any[];money:(n:number)=>string;t:Labels;onEdit?:(p:Product)=>void;onArchive?:(p:Product)=>void}) {
  if (!products.length) return <Empty t={t}/>;
  return <div className="table-wrap"><table><thead><tr><th>{t.name}</th><th>{t.sku}</th><th>{t.category}</th><th>{t.purchasePrice}</th><th>{t.minStock}</th><th>Statut</th>{(onEdit||onArchive)&&<th>Actions</th>}</tr></thead><tbody>{products.map(p=><tr key={p.id}><td><div className="product-cell"><span className="product-thumb"><Package size={17}/></span><div><b>{p.name}</b><small>{p.barcode||"—"}</small></div></div></td><td><span className="sku">{p.sku}</span></td><td>{categories.find(c=>c.id===p.category_id)?.name||"—"}</td><td>{money(Number(p.purchase_price))}</td><td>{p.min_stock} {p.unit}</td><td><span className={"status-pill "+(p.is_active?"positive":"warning")}>{p.is_active?"Actif":"Archivé"}</span></td>{(onEdit||onArchive)&&<td><div className="member-actions">{onEdit&&<button className="ops-icon-btn" onClick={()=>onEdit(p)} title="Modifier"><Settings size={14}/></button>}{onArchive&&<button className="ops-icon-btn" onClick={()=>onArchive(p)} title={p.is_active?"Archiver":"Réactiver"}><X size={14}/></button>}</div></td>}</tr>)}</tbody></table></div>;
}
function Empty({t}:{t:Labels}) { return <div className="empty-state"><div className="empty-icon"><Package size={24}/></div><b>{t.noProducts}</b><span>{t.noProductsHint}</span></div>; }
function SimpleDirectory({title,rows,icon,empty,onEdit}:{title:string;rows:any[];icon:string;empty:string;onEdit?:(row:any)=>void}) {
  const Icon=icon==="supplier"?Truck:Users;
  return <section className="panel"><div className="panel-head"><div><h3>{title}</h3><p>{rows.length} enregistrement(s)</p></div></div>{rows.length?<div className="simple-list">{rows.map(r=><div className="simple-row" key={r.id}><span className="list-icon"><Icon size={18}/></span><div><b>{r.name}</b><small>{r.phone||r.email||"—"}</small></div><span className="status-pill positive">Actif</span>{onEdit&&<button className="ops-icon-btn" onClick={()=>onEdit(r)}><Settings size={14}/></button>}</div>)}</div>:<div className="empty-state"><div className="empty-icon"><Icon size={24}/></div><b>{empty}</b></div>}</section>;
}
function BarcodeScanner({onDetected,onClose}:{onDetected:(code:string)=>void|Promise<void>;onClose:()=>void}) {
  const videoRef=useRef<HTMLVideoElement>(null);
  const callbackRef=useRef(onDetected);callbackRef.current=onDetected;
  const [error,setError]=useState("");
  const [manualCode,setManualCode]=useState("");
  useEffect(()=>{
    let stopped=false;
    let controls:{stop:()=>void}|undefined;
    const reader=new BrowserMultiFormatReader();
    const start=async()=>{
      if(!navigator.mediaDevices?.getUserMedia){setError("Caméra indisponible. Ouvrez le site en HTTPS et autorisez la caméra.");return;}
      if(!videoRef.current)return;
      try{
        controls=await reader.decodeFromVideoDevice(undefined,videoRef.current,(result)=>{
          if(result&&!stopped){stopped=true;controls?.stop();void callbackRef.current(result.getText());}
        });
      }catch(e:any){
        setError(e?.name==="NotAllowedError"?"Autorisez l’accès à la caméra pour ce site.":e?.name==="NotFoundError"?"Aucune caméra détectée sur cet appareil.":e?.message||"Impossible d'ouvrir la caméra.");
      }
    };
    void start();
    return()=>{stopped=true;controls?.stop();};
  },[]);
  return <div className="modal-backdrop scanner-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><section className="modal-card scanner-card"><div className="modal-head"><div><span className="eyebrow">SCAN QR / CODE-BARRES</span><h2>Scanner un équipement ou un article</h2></div><button className="icon-btn" onClick={onClose}><X size={18}/></button></div><video ref={videoRef} autoPlay muted playsInline className="scanner-video"/>{error&&<p className="scanner-error">{error}</p>}<p className="scanner-hint">Placez le QR de l’équipement ou le code-barres de l’article devant la caméra arrière. Vérifiez l’autorisation du navigateur et l’accès HTTPS.</p><form className="scanner-manual" onSubmit={e=>{e.preventDefault();if(manualCode.trim())void callbackRef.current(manualCode.trim())}}><label>Ou saisir le code / tag équipement<input autoFocus value={manualCode} onChange={e=>setManualCode(e.target.value)} placeholder="Tag équipement, QR ou code-barres"/></label><button className="primary-btn" type="submit" disabled={!manualCode.trim()}>Ouvrir / rechercher</button></form><div className="modal-actions"><button className="secondary-btn" onClick={onClose}>Fermer</button></div></section></div>;
}
