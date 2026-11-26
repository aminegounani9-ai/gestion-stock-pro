import { lazy, Suspense, useCallback, useEffect, useMemo, useState, useRef } from "react";
import ModalPortal from "./ModalPortal";
import type { FormEvent } from "react";
import {
  Activity, Bell, Boxes, Building2, CheckCheck, ChevronDown, CircleHelp, FileSpreadsheet, Download, FolderKanban,
  LayoutDashboard, LogOut, Package, Plus, Search, Settings,
  Truck, Users, Warehouse, X, Languages, ShieldCheck, ArrowLeftRight, ClipboardCheck, BarChart3, Printer, ScanBarcode, Wrench, Trash2, PlayCircle
} from "lucide-react";
import ModuleErrorBoundary from "./ModuleErrorBoundary";
import { isSupabaseConfigured, supabase } from "./lib/supabase";
import { resolveAssignedContext, applyAssignedScopeFilter } from "./lib/assignmentScope";
import type { Company, Product } from "./lib/supabase";

type Page = "dashboard" | "projects" | "requests" | "products" | "categories" | "stock" | "warehouses" | "suppliers" | "customers" | "purchases" | "sales" | "transfers" | "inventory" | "locations" | "lots" | "spareParts" | "returns" | "expenses" | "payments" | "reports" | "users" | "settings" | "organization" | "equipment";
type Lang = "fr" | "en" | "ar";
const tr=(lang:Lang,fr:string,en:string,ar:string)=>lang==="ar"?ar:lang==="en"?en:fr;
type Notice = { type: "success" | "error"; text: string } | null;
type AppNotification = { id:string; title:string; message:string; notification_type:string; entity_type:string|null; entity_id:string|null; is_read:boolean; created_at:string };

const copy = {
  fr: {
    dashboard:"Tableau de bord", projects:"Gestion des projets", requests:"Demande de pièces", organization:"Organisation & affectations", locations:"Emplacements de stockage", lots:"Lots & péremption", spareParts:"Pièces de rechange", equipment:"Équipements", products:"Articles", categories:"Catégories", stock:"Mouvements de stock", warehouses:"Entrepôts", transfers:"Transferts", inventory:"Inventaires", returns:"Retours", expenses:"Dépenses", payments:"Paiements", reports:"Rapports", users:"Utilisateurs", settings:"Paramètres",
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
    actions:"Actions",archived:"Archivé",reactivate:"Réactiver",activeStatus:"Actif",records:"enregistrement(s)",scanEyebrow:"SCAN QR / CODE-BARRES",scanTitle:"Scanner un équipement ou un article",cameraUnavailable:"Caméra indisponible. Ouvrez le site en HTTPS et autorisez la caméra.",allowCamera:"Autorisez l’accès à la caméra pour ce site.",noCamera:"Aucune caméra détectée sur cet appareil.",scannerHint:"Placez le QR de l’équipement ou le code-barres de l’article devant la caméra arrière.",enterCode:"Ou saisir le code / tag équipement",tagPlaceholder:"Tag équipement, QR ou code-barres",openSearch:"Ouvrir / rechercher",close:"Fermer",dateLabel:"Date",statusLabel:"Statut",totalLabel:"Total",documentLabel:"Document",invoiceNumber:"N° facture",purchaseNumber:"N° commande",newPurchase:"Nouvel achat",newSale:"Nouvelle vente",purchaseReceipt:"réception automatique en stock",automaticIssue:"sortie de stock automatique",printInvoice:"Imprimer la facture",printOrder:"Imprimer le bon",newRecord:"NOUVEL ENREGISTREMENT",description:"Description",piece:"Pièce",kg:"Kg",gram:"g",liter:"Litre",meter:"Mètre",carton:"Carton",maxStock:"Stock maximum",reorderQty:"Quantité de réapprovisionnement",leadTime:"Délai d’approvisionnement (jours)",weight:"Poids",volume:"Volume",trackLots:"Suivi des lots et dates d’expiration",trackSerials:"Suivi des numéros de série",allCategories:"Toutes les catégories",edit:"Modifier",delete:"Supprimer",print:"Imprimer",purchaseOrder:"Nouvelle commande d’achat (CA)",margin:"Marge théorique", purchaseOrders:"Commandes d'achat", invoices:"Factures de vente",
  },
  en: {
    dashboard:"Dashboard", projects:"Project management", requests:"Spare-part requests", organization:"Organization & assignments", locations:"Storage locations", lots:"Lots & expiry", spareParts:"Spare parts", equipment:"Equipment", products:"Products", categories:"Categories", stock:"Stock movements", warehouses:"Warehouses", transfers:"Transfers", inventory:"Stock counts", returns:"Returns", expenses:"Expenses", payments:"Payments", reports:"Reports", users:"Users", settings:"Settings", suppliers:"Suppliers",
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
    language:"Language", profile:"My workspace", actions:"Actions",archived:"Archived",reactivate:"Reactivate",activeStatus:"Active",records:"record(s)",scanEyebrow:"QR / BARCODE SCAN",scanTitle:"Scan equipment or an item",cameraUnavailable:"Camera unavailable. Open the site over HTTPS and allow camera access.",allowCamera:"Allow camera access for this site.",noCamera:"No camera detected on this device.",scannerHint:"Place the equipment QR code or item barcode in front of the rear camera.",enterCode:"Or enter an equipment code / tag",tagPlaceholder:"Equipment tag, QR or barcode",openSearch:"Open / search",close:"Close", dateLabel:"Date",statusLabel:"Status",totalLabel:"Total",documentLabel:"Document",invoiceNumber:"Invoice no.",purchaseNumber:"Purchase order no.",newPurchase:"New purchase",newSale:"New sale",purchaseReceipt:"automatic stock receipt",automaticIssue:"automatic stock issue",printInvoice:"Print invoice",printOrder:"Print order",newRecord:"NEW RECORD",description:"Description",piece:"Piece",kg:"Kg",gram:"g",liter:"Litre",meter:"Meter",carton:"Carton",maxStock:"Maximum stock",reorderQty:"Reorder quantity",leadTime:"Lead time (days)",weight:"Weight",volume:"Volume",trackLots:"Track lots and expiry dates",trackSerials:"Track serial numbers",allCategories:"All categories",edit:"Edit",delete:"Delete",print:"Print",purchaseOrder:"New purchase order",margin:"Estimated margin", purchaseOrders:"Purchase orders", invoices:"Sales invoices",
  },
  ar: {
    dashboard:"لوحة التحكم", projects:"إدارة المشاريع", requests:"طلبات قطع الغيار", organization:"الهيكل التنظيمي والتعيينات", locations:"مواقع التخزين", lots:"الدفعات والصلاحية", spareParts:"قطع الغيار", equipment:"المعدات", products:"المنتجات", categories:"الفئات", stock:"حركات المخزون", warehouses:"المخازن", transfers:"التحويلات", inventory:"الجرد", returns:"المرتجعات", expenses:"المصاريف", payments:"المدفوعات", reports:"التقارير", users:"المستخدمون", settings:"الإعدادات", suppliers:"الموردون",
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
    actions:"الإجراءات",archived:"مؤرشف",reactivate:"إعادة التفعيل",activeStatus:"نشط",records:"سجل",scanEyebrow:"مسح QR / الباركود",scanTitle:"مسح معدة أو منتج",cameraUnavailable:"الكاميرا غير متاحة. افتح الموقع عبر HTTPS واسمح باستخدام الكاميرا.",allowCamera:"اسمح بالوصول إلى الكاميرا لهذا الموقع.",noCamera:"لم يتم العثور على كاميرا في هذا الجهاز.",scannerHint:"ضع رمز QR للمعدة أو الباركود أمام الكاميرا الخلفية.",enterCode:"أو أدخل رمز / معرف المعدة",tagPlaceholder:"معرف المعدة أو QR أو الباركود",openSearch:"فتح / بحث",close:"إغلاق",dateLabel:"التاريخ",statusLabel:"الحالة",totalLabel:"الإجمالي",documentLabel:"الوثيقة",invoiceNumber:"رقم الفاتورة",purchaseNumber:"رقم الطلب",newPurchase:"شراء جديد",newSale:"عملية بيع جديدة",purchaseReceipt:"استلام تلقائي في المخزون",automaticIssue:"صرف تلقائي من المخزون",printInvoice:"طباعة الفاتورة",printOrder:"طباعة الطلب",newRecord:"تسجيل جديد",description:"الوصف",piece:"قطعة",kg:"كغ",gram:"غ",liter:"لتر",meter:"متر",carton:"صندوق",maxStock:"الحد الأقصى للمخزون",reorderQty:"كمية إعادة الطلب",leadTime:"مهلة التوريد (أيام)",weight:"الوزن",volume:"الحجم",trackLots:"تتبع الدفعات وتواريخ الصلاحية",trackSerials:"تتبع الأرقام التسلسلية",allCategories:"كل الفئات",edit:"تعديل",delete:"حذف",print:"طباعة",purchaseOrder:"طلب شراء جديد",margin:"الهامش التقديري", purchaseOrders:"طلبات الشراء", invoices:"فواتير البيع",
  }
} as const;
type Labels = { [K in keyof typeof copy.fr]: string };
// Load large business modules only when the user opens them.
const StockOperations = lazy(() => import("./StockOperations"));
const ProjectManagement = lazy(() => import("./ProjectManagement"));
const SpareParts = lazy(() => import("./SpareParts"));
const SparePartsDashboard = lazy(() => import("./SparePartsDashboard"));
const EquipmentManagement = lazy(() => import("./EquipmentManagement"));
const OrganizationManagement = lazy(() => import("./OrganizationManagement"));
const ImportExportCenter = lazy(() => import("./ImportExportCenter"));
const UserManagement = lazy(() => import("./UserManagement"));
const ProfessionalModuleReport = lazy(() => import("./ProfessionalModuleReport"));
const StockAIAssistant = lazy(() => import("./StockAIAssistant"));
const ModuleLoading = () => <div className="panel module-loading" role="status">Chargement du module…</div>;


const nav: { id: Page; icon: typeof LayoutDashboard; group: string }[] = [
  { id:"dashboard", icon:LayoutDashboard, group:"workspace" },
  { id:"projects", icon:FolderKanban, group:"workspace" },
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
  const [notificationsMinimized,setNotificationsMinimized]=useState(false);
  const [soundEnabled,setSoundEnabled]=useState(()=>localStorage.getItem("gsp_notification_sound")!=="off");
  const [desktopNotificationsEnabled,setDesktopNotificationsEnabled]=useState(()=>localStorage.getItem("gsp_desktop_notifications")!=="off");
  const [pushEnabled,setPushEnabled]=useState(false);
  const [pushBusy,setPushBusy]=useState(false);
  const seenNotificationIdsRef=useRef<Set<string>|null>(null);
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
  const [orgEquipment,setOrgEquipment]=useState<any[]>([]);
  const [modulePermissions,setModulePermissions]=useState<Record<string,any>>({});
  const [hasProjectAccess,setHasProjectAccess]=useState(false);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [onlineTeamUsers,setOnlineTeamUsers]=useState<Record<string,{name:string;since:string}>>({});
  const [myScopeAssignments,setMyScopeAssignments]=useState<any[]>([]);
  const [companyRoles, setCompanyRoles] = useState<Record<string,string>>({});
  const [currentRole, setCurrentRole] = useState("viewer");
  useEffect(()=>{
    if(!supabase||!session?.user?.id||!company?.id){setOnlineTeamUsers({});return;}
    const client=supabase;
    const channel=client.channel("team-presence:"+company.id);
    channel.on("presence",{event:"sync"},()=>{
      const state=channel.presenceState<any>();
      const next:Record<string,{name:string;since:string}>={};
      for(const entries of Object.values(state)){
        for(const entry of (entries as any[])){
          if(entry?.user_id)next[entry.user_id]={name:entry.full_name||"Utilisateur",since:entry.online_at||new Date().toISOString()};
        }
      }
      setOnlineTeamUsers(next);
    });
    channel.subscribe(async status=>{
      if(status==="SUBSCRIBED"){
        await channel.track({
          user_id:session.user.id,
          full_name:session.user.user_metadata?.full_name||session.user.email||"Utilisateur",
          online_at:new Date().toISOString()
        });
      }
    });
    return()=>{setOnlineTeamUsers({});void client.removeChannel(channel);};
  },[session?.user?.id,session?.user?.email,company?.id]);

  const [isAdmin, setIsAdmin] = useState(false);
  const [inviteFlow] = useState(() => new URLSearchParams(window.location.search).get("invite") === "1");
  const [search, setSearch] = useState("");
  const [spareFocusId,setSpareFocusId]=useState<string|null>(null);
  useEffect(()=>{
    const query=search.trim().toLocaleLowerCase();
    if(query.length<2||!company?.id)return;
    const timer=window.setTimeout(()=>{
      const contains=(value:any)=>String(value??"").toLocaleLowerCase().includes(query);
      const product=(products||[]).find((x:any)=>contains(x.sku)||contains(x.name)||contains(x.barcode)||contains(x.description));
      if(product){
        if(page!=="spareParts"||spareFocusId!==product.id){
          setSpareFocusId(product.id);
          setPage("spareParts");
        }
        return;
      }
      const equipment=(orgEquipment||[]).find((x:any)=>contains(x.equipment_tag)||contains(x.name)||contains(x.model)||contains(x.serial_number));
      if(equipment){
        if(page!=="equipment"||equipmentSeed!==equipment.id){
          setEquipmentSeed(equipment.id);
          setPage("equipment");
        }
        return;
      }
      const movement=(movements||[]).find((x:any)=>contains(x.reference)||contains(x.document_number)||contains(x.products?.sku)||contains(x.products?.name)||contains(x.notes));
      if(movement&&page!=="stock")setPage("stock");
    },650);
    return()=>window.clearTimeout(timer);
  },[search,page,company?.id,products,orgEquipment,movements,spareFocusId,equipmentSeed]);

  const [movementSearch,setMovementSearch]=useState("");
  const [scannerOpen,setScannerOpen]=useState(false);
  const [scanChoice,setScanChoice]=useState<any>(null);
  const [scanProductId,setScanProductId]=useState<string|null>(null);
  const [autoPrintEquipmentReport,setAutoPrintEquipmentReport]=useState(false);
  const [equipmentReportWindow,setEquipmentReportWindow]=useState<Window|null>(null);
  const [installPrompt,setInstallPrompt]=useState<any>(null);
  const [importExportOpen,setImportExportOpen]=useState(false);
  const [modal, setModal] = useState<"product"|"warehouse"|"supplier"|"customer"|"movement"|"purchase"|"sale"|null>(null);
  const [editingId,setEditingId]=useState<string|null>(null);
  const [form, setForm] = useState<Record<string,string>>({});
  const [warehouseServiceIds,setWarehouseServiceIds]=useState<string[]>([]);
  const [warehouseUnitIds,setWarehouseUnitIds]=useState<string[]>([]);
  const [warehouseUserIds,setWarehouseUserIds]=useState<string[]>([]);
  const [warehouseMembers,setWarehouseMembers]=useState<any[]>([]);
  const [documentLines,setDocumentLines] = useState<{product_id:string;quantity:string;unit_price:string;discount:string}[]>([{product_id:"",quantity:"",unit_price:"",discount:"0"}]);
  const t = copy[lang];
  const rtl = lang === "ar";

  useEffect(()=>{localStorage.setItem("gsp_notification_sound",soundEnabled?"on":"off");},[soundEnabled]);
  useEffect(()=>{localStorage.setItem("gsp_desktop_notifications",desktopNotificationsEnabled?"on":"off");},[desktopNotificationsEnabled]);

  useEffect(()=>{
    let active=true;
    async function checkPushSubscription(){
      if(!supabase||!company?.id||!session?.user?.id){if(active)setPushEnabled(false);return;}
      const {data,error}=await supabase.from("push_subscriptions").select("id").eq("company_id",company.id).eq("user_id",session.user.id).limit(1);
      if(active)setPushEnabled(!error&&Boolean(data?.length));
    }
    void checkPushSubscription();
    return()=>{active=false;};
  },[company?.id,session?.user?.id]);

  async function enablePushNotifications(){
    if(!supabase||!company?.id||!session?.user?.id)return;
    if(!("serviceWorker" in navigator)||!("PushManager" in window)||!("Notification" in window)){
      flash("error",lang==="ar"?"هذا المتصفح لا يدعم الإشعارات في الخلفية. ثبّت التطبيق وافتحه في Chrome.":"Ce navigateur ne prend pas en charge le Push. Installez l'application et ouvrez-la dans Chrome.");
      return;
    }
    setPushBusy(true);
    try{
      const permission=await Notification.requestPermission();
      if(permission!=="granted")throw new Error(lang==="ar"?"يجب السماح بالإشعارات":"Autorisation des notifications refusée");
      const registration=await navigator.serviceWorker.ready;
      const applicationServerKey=Uint8Array.from(atob("BC7tugOq3iY4skPRwl24BEUYJlSxcjcYqu5XdanKtG3A6sF5Ifzp07mqebvyUkxfw8fyuQ9Lv_8UYSbFM2vvOkE".replace(/-/g,"+").replace(/_/g,"/")),c=>c.charCodeAt(0));
      let subscription=await registration.pushManager.getSubscription();
      if(!subscription)subscription=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey});
      const json=subscription.toJSON();
      if(!json.endpoint||!json.keys?.p256dh||!json.keys?.auth)throw new Error("Invalid push subscription");
      const {error}=await supabase.from("push_subscriptions").upsert({
        company_id:company.id,user_id:session.user.id,endpoint:json.endpoint,
        p256dh:json.keys.p256dh,auth:json.keys.auth,user_agent:navigator.userAgent,updated_at:new Date().toISOString()
      },{onConflict:"company_id,endpoint"});
      if(error)throw error;
      setPushEnabled(true);
      setDesktopNotificationsEnabled(true);
      flash("success",lang==="ar"?"تم تفعيل الإشعارات حتى عند إغلاق التطبيق":"Notifications en arrière-plan activées avec succès");
    }catch(error:any){
      console.error("Push subscription failed:",error);
      flash("error",error?.message||"Impossible d'activer les notifications Push");
    }finally{setPushBusy(false);}
  }

  async function disablePushNotifications(){
    if(!supabase||!company?.id||!session?.user?.id)return;
    setPushBusy(true);
    try{
      const registration=await navigator.serviceWorker.ready;
      const subscription=await registration.pushManager.getSubscription();
      if(subscription){
        const endpoint=subscription.endpoint;
        await subscription.unsubscribe();
        const {error}=await supabase.from("push_subscriptions").delete().eq("company_id",company.id).eq("user_id",session.user.id).eq("endpoint",endpoint);
        if(error)throw error;
      }
      setPushEnabled(false);
      flash("success",lang==="ar"?"تم إيقاف إشعارات الخلفية":"Notifications en arrière-plan désactivées");
    }catch(error:any){flash("error",error?.message||"Impossible de désactiver les notifications");}
    finally{setPushBusy(false);}
  }

  async function enableDesktopNotifications(){
    if(!("Notification" in window)){flash("error",lang==="ar"?"هذا المتصفح لا يدعم إشعارات النظام":"Ce navigateur ne prend pas en charge les notifications système");return;}
    const permission=await Notification.requestPermission();
    if(permission==="granted"){
      setDesktopNotificationsEnabled(true);
      if("serviceWorker" in navigator){const registration=await navigator.serviceWorker.ready;await registration.showNotification("Stock & Project Management",{body:lang==="ar"?"تم تفعيل الإشعارات بنجاح":"Notifications activées avec succès",icon:"/icon-192.svg"});}
    } else {
      setDesktopNotificationsEnabled(false);
      flash("error",lang==="ar"?"يرجى السماح بالإشعارات من إعدادات المتصفح":"Autorisez les notifications dans les paramètres du navigateur");
    }
  }
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

  const loadWorkspace = useCallback(async (companyId: string, mode:"full"|"scopes"="full") => {
    if (!supabase) return;
    const {data:{user:scopeUser}}=await supabase.auth.getUser();
    const {data:membership}=scopeUser?await supabase.from("company_members").select("role").eq("company_id",companyId).eq("user_id",scopeUser.id).maybeSingle():{data:null};
    const forceScoped=mode==="scopes"||!["owner","admin"].includes(membership?.role||"");
    if(forceScoped){
      const empty:any={data:[],error:null,count:0};
      if(!scopeUser){
        setProducts([]);setWarehouses([]);setSuppliers([]);setCustomers([]);setMovements([]);setPurchases([]);setSales([]);setCategories([]);
        setOrgSites([]);setOrgUnits([]);setOrgServices([]);setOrgEquipment([]);setMyScopeAssignments([]);
        return;
      }
      const [permissions,os,ou,ov,oe,wh,scopeResult,categoriesResult]=await Promise.all([
        supabase.from("user_module_permissions").select("module_key,can_view,can_create,can_edit,can_delete,can_approve,can_issue,can_receive,can_transfer,can_inventory").eq("company_id",companyId).eq("user_id",scopeUser.id),
        supabase.from("org_sites").select("id,code,name,management_id,is_active").eq("company_id",companyId).eq("is_active",true).order("name").limit(300),
        supabase.from("org_units").select("id,code,name,site_id,service_id,is_active").eq("company_id",companyId).eq("is_active",true).order("name").limit(500),
        supabase.from("org_services").select("id,code,name,site_id,unit_id,is_active").eq("company_id",companyId).eq("is_active",true).order("name").limit(300),
        
        supabase.from("org_equipment").select("id,equipment_tag,name,site_id,unit_id,service_id,status").eq("company_id",companyId).eq("status","active").order("name").limit(1000),
        supabase.from("warehouses").select("id,code,name,site_id,unit_id,service_id,equipment_id,is_active").eq("company_id",companyId).order("name").limit(300),
        supabase.from("user_scope_assignments").select("scope_type,scope_id,job_title,can_view,can_create,can_edit,can_delete,can_approve,can_issue,can_receive,can_transfer,can_inventory,projects_can_view,projects_can_create,projects_can_edit,projects_can_delete,projects_can_approve").eq("company_id",companyId).eq("user_id",scopeUser.id),
        supabase.from("product_categories").select("id,name").eq("company_id",companyId).order("name").limit(200)
      ]);
      const firstError=[permissions,os,ou,ov,oe,wh,scopeResult,categoriesResult].find(x=>x.error)?.error;
      if(firstError)throw firstError;
      const moduleKeys=new Set((permissions.data||[]).filter((x:any)=>x.can_view).map((x:any)=>x.module_key));
      let partScopeResult:any=empty;
      if(moduleKeys.has("spareParts")||moduleKeys.has("products")||moduleKeys.has("requests")||moduleKeys.has("equipment")||moduleKeys.has("reports")){
        const scopeRows=scopeResult.data||[];
        
        const warehouseOnly=scopeRows.length>0&&scopeRows.every((x:any)=>x.scope_type==="warehouse");
        if(!warehouseOnly){
          let partScopeQuery:any=supabase.from("spare_part_details").select("product_id").eq("company_id",companyId).limit(1000);
          partScopeQuery=applyAssignedScopeFilter(partScopeQuery,scopeRows,{site:"site_id",service:"service_id",unit:"unit_id",equipment:"equipment_id"},"product_id");
          partScopeResult=await partScopeQuery;
        }
      }
      if(partScopeResult.error)throw partScopeResult.error;
      const warehouseIds=(wh.data||[]).map((x:any)=>x.id);
      const [movementsResult,balancesResult,purchasesResult,suppliersResult]=warehouseIds.length?await Promise.all([
        supabase.from("stock_movements").select("*, products(name,sku), warehouses(name)").eq("company_id",companyId).in("warehouse_id",warehouseIds).order("occurred_at",{ascending:false}).limit(100),
        supabase.from("stock_balances").select("product_id,warehouse_id,quantity_on_hand").eq("company_id",companyId).in("warehouse_id",warehouseIds).limit(1000),
        supabase.from("purchase_orders").select("*, suppliers(name)").eq("company_id",companyId).in("warehouse_id",warehouseIds).order("created_at",{ascending:false}).limit(50),
        (moduleKeys.has("suppliers")||moduleKeys.has("stock")||moduleKeys.has("lots")||moduleKeys.has("reports"))?supabase.from("suppliers").select("*").eq("company_id",companyId).order("name").limit(200):Promise.resolve(empty)
      ]):[empty,empty,empty,(moduleKeys.has("suppliers")||moduleKeys.has("stock")||moduleKeys.has("lots")||moduleKeys.has("reports"))?await supabase.from("suppliers").select("*").eq("company_id",companyId).order("name").limit(200):empty];
      const secondError=[movementsResult,balancesResult,purchasesResult,suppliersResult].find(x=>x.error)?.error;
      if(secondError)throw secondError;
      const productIds=[...new Set([
        ...(partScopeResult.data||[]).map((x:any)=>x.product_id),
        ...(movementsResult.data||[]).map((x:any)=>x.product_id),
        ...(balancesResult.data||[]).map((x:any)=>x.product_id)
      ].filter(Boolean))];
      const productsResult=productIds.length?await supabase.from("products").select("*").eq("company_id",companyId).in("id",productIds).order("created_at",{ascending:false}).limit(500):empty;
      if(productsResult.error)throw productsResult.error;
      let salesResult:any=empty,customersResult:any=empty;
      if(moduleKeys.has("reports")){
        const [ownSalesResult,saleItemsResult]=await Promise.all([
          supabase.from("sales").select("id").eq("company_id",companyId).eq("created_by",scopeUser.id).limit(200),
          productIds.length?supabase.from("sale_items").select("sale_id").eq("company_id",companyId).in("product_id",productIds).limit(500):Promise.resolve(empty)
        ]);
        if(ownSalesResult.error)throw ownSalesResult.error;
        if(saleItemsResult.error)throw saleItemsResult.error;
        const saleIds=[...new Set([...(ownSalesResult.data||[]).map((x:any)=>x.id),...(saleItemsResult.data||[]).map((x:any)=>x.sale_id)].filter(Boolean))];
        if(saleIds.length){
          salesResult=await supabase.from("sales").select("*, customers(name)").eq("company_id",companyId).in("id",saleIds).order("sale_date",{ascending:false}).limit(100);
          if(salesResult.error)throw salesResult.error;
        }
        const customerIds=[...new Set((salesResult.data||[]).map((x:any)=>x.customer_id).filter(Boolean))];
        const [linkedCustomers,ownCustomers]=await Promise.all([
          customerIds.length?supabase.from("customers").select("*").eq("company_id",companyId).in("id",customerIds).limit(200):Promise.resolve(empty),
          supabase.from("customers").select("*").eq("company_id",companyId).eq("created_by",scopeUser.id).limit(100)
        ]);
        if(linkedCustomers.error)throw linkedCustomers.error;
        if(ownCustomers.error)throw ownCustomers.error;
        customersResult={data:[...new Map([...(linkedCustomers.data||[]),...(ownCustomers.data||[])].map((x:any)=>[x.id,x])).values()],error:null};
      }
      setOrgSites(os.data??[]);setOrgUnits(ou.data??[]);setOrgServices(ov.data??[]);setOrgEquipment((oe.data??[]).map((x:any)=>({...x,is_active:true})));setWarehouses(wh.data??[]);setMyScopeAssignments(scopeResult.data??[]);
      setProducts((productsResult.data??[]) as Product[]);setCategories(categoriesResult.data??[]);setMovements(movementsResult.data??[]);setPurchases(purchasesResult.data??[]);setSuppliers(suppliersResult.data??[]);
      setCustomers(customersResult.data??[]);setSales(salesResult.data??[]);
      return;
    }
    setProductCategoryFilter("all");
    const [workspaceResults, categoryResult, orgResults, authResult] = await Promise.all([
      Promise.all([
        supabase.from("products").select("*").eq("company_id",companyId).order("created_at",{ascending:false}),
        supabase.from("warehouses").select("*").eq("company_id",companyId).order("created_at"),
        supabase.from("suppliers").select("*").eq("company_id",companyId).order("name"),
        supabase.from("customers").select("*").eq("company_id",companyId).order("name"),
        supabase.from("stock_movements").select("*, products(name,sku), warehouses(name)").eq("company_id",companyId).order("occurred_at",{ascending:false}).limit(30),
        supabase.from("stock_balances").select("product_id,warehouse_id,quantity_on_hand").eq("company_id",companyId),
        supabase.from("purchase_orders").select("*, suppliers(name)").eq("company_id",companyId).order("created_at",{ascending:false}).limit(50),
        supabase.from("sales").select("*, customers(name)").eq("company_id",companyId).order("sale_date",{ascending:false}).limit(50)
      ]),
      supabase.from("product_categories").select("id,name").eq("company_id",companyId).order("name"),
      Promise.all([
        supabase.from("org_sites").select("id,code,name,management_id,is_active").eq("company_id",companyId).eq("is_active",true).order("name"),
        supabase.from("org_units").select("id,code,name,site_id,service_id,is_active").eq("company_id",companyId).eq("is_active",true).order("name"),
        supabase.from("org_services").select("id,code,name,site_id,unit_id,is_active").eq("company_id",companyId).eq("is_active",true).order("name"),
        
        supabase.from("org_equipment").select("id,equipment_tag,name,site_id,unit_id,service_id,status").eq("company_id",companyId).eq("status","active").order("name")
      ]),
      supabase.auth.getUser()
    ]);
    const [p,w,s,c,m,b,po,sa] = workspaceResults;
    const [os,ou,ov,oe] = orgResults;
    const queryError = [p,w,s,c,m,b,po,sa].find(result => result.error);
    if (queryError?.error) throw queryError.error;
    if (categoryResult.error) throw categoryResult.error;
    const orgError=[os,ou,ov,oe].find(x=>x.error)?.error;
    if(orgError)throw orgError;
    setCategories(categoryResult.data ?? []);
    setOrgSites(os.data??[]);setOrgUnits(ou.data??[]);setOrgServices(ov.data??[]);setOrgEquipment((oe.data??[]).map(x=>({...x,is_active:true})));
    const {data:{user:fullUser}}=authResult;
    const scopeResult=fullUser?await supabase.from("user_scope_assignments").select("scope_type,scope_id,job_title,can_view,can_create,can_edit,can_delete,can_approve,can_issue,can_receive,can_transfer,can_inventory").eq("company_id",companyId).eq("user_id",fullUser.id):{data:[],error:null};
    if(scopeResult.error)throw scopeResult.error;
    const userScopes=scopeResult.data??[];
    setMyScopeAssignments(userScopes);
    setProducts((p.data ?? []) as Product[]);
    setWarehouses(w.data ?? []);
    setSuppliers(s.data ?? []);
    setCustomers(c.data ?? []);
    setMovements(m.data ?? []);
    setPurchases(po.data ?? []);
    setSales(sa.data ?? []);
  }, []);

  const playNotificationSound = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const AudioContextClass = window.AudioContext;
      if (!AudioContextClass) return;
      const context = new AudioContextClass();
      const playTone = (frequency:number, start:number) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = "sine";
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(0.16, start + 0.025);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.22);
        oscillator.connect(gain); gain.connect(context.destination);
        oscillator.start(start); oscillator.stop(start + 0.23);
      };
      const now = context.currentTime;
      playTone(880, now); playTone(1175, now + 0.16);
      window.setTimeout(() => void context.close(), 650);
    } catch (error) { console.warn("Notification sound unavailable:", error); }
  },[soundEnabled]);

  useEffect(()=>{
    if(!("serviceWorker" in navigator))return;
    const onWorkerMessage=(event:MessageEvent)=>{
      if(event.data?.type==="APP_NOTIFICATION_PUSH")playNotificationSound();
    };
    navigator.serviceWorker.addEventListener("message",onWorkerMessage);
    return()=>navigator.serviceWorker.removeEventListener("message",onWorkerMessage);
  },[playNotificationSound]);

  const loadNotifications = useCallback(async () => {
    if(!supabase||!company||!session?.user?.id)return;
    const {data,error}=await supabase.from("notifications").select("id,title,message,notification_type,entity_type,entity_id,is_read,created_at").eq("company_id",company.id).eq("recipient_user_id",session.user.id).neq("notification_type","project_update").neq("notification_type","project_task").order("created_at",{ascending:false}).limit(30);
    if(error){console.warn("Notifications unavailable:",error.message);return;}
    const rows=(data??[]) as AppNotification[];
    const previous=seenNotificationIdsRef.current;
    if(previous){
      const fresh=rows.filter(item=>!previous.has(item.id));
      if(fresh.length){
        playNotificationSound();
        if(desktopNotificationsEnabled && "Notification" in window && Notification.permission==="granted"){
          const latest=fresh[0];
          if("serviceWorker" in navigator){
            void navigator.serviceWorker.ready.then(reg=>reg.showNotification(latest.title,{body:latest.message,icon:"/icon-192.svg",badge:"/icon-192.svg",tag:latest.id,data:{url:"/"} })).catch(()=>{});
          } else {
            new Notification(latest.title,{body:latest.message,icon:"/icon-192.svg"});
          }
        }
      }
    }
    seenNotificationIdsRef.current=new Set(rows.map(item=>item.id));
    setNotifications(rows);
  },[company?.id,session?.user?.id,soundEnabled,desktopNotificationsEnabled,playNotificationSound]);

  const loadCompanies = useCallback(async (userId: string, preferredCompanyId?: string) => {
    if (!supabase) return;
    const {data: memberships,error} = await supabase.from("company_members").select("company_id,role").eq("user_id",userId).eq("is_active",true);
    if (error) throw error;
    const ids = (memberships ?? []).map((m:any) => m.company_id);
    const roleMap = Object.fromEntries((memberships ?? []).map((m:any)=>[m.company_id,m.role]));
    setCompanyRoles(roleMap);
    if (!ids.length) { setCompanies([]); setCompany(null); setCurrentRole("viewer"); setIsAdmin(false); setModulePermissions({}); return; }
    const {data,error: companyError} = await supabase.from("companies").select("id,name,currency_code,legal_name,tax_number,phone,email,address,city,country").in("id",ids).order("created_at");
    if (companyError) throw companyError;
    const list = (data ?? []) as Company[];
    setCompanies(list);
    const chosen = (preferredCompanyId ? list.find(item=>item.id===preferredCompanyId) : null) ?? list[0] ?? null;
    setCompany(chosen);
    const chosenRole = chosen ? (roleMap[chosen.id]||"viewer") : "viewer";
    setCurrentRole(chosenRole);
    const chosenIsAdmin = ["owner","admin"].includes(chosenRole);
    setIsAdmin(chosenIsAdmin);
    if (chosen) {
      setModulePermissions({});
      const {data:moduleRows,error:moduleError}=await supabase.from("user_module_permissions").select("module_key,can_view,can_create,can_edit,can_delete,can_approve,can_issue,can_receive,can_transfer,can_inventory").eq("company_id",chosen.id).eq("user_id",userId);
      if(moduleError)throw moduleError;
      const permissionMap=Object.fromEntries((moduleRows??[]).map((row:any)=>[row.module_key,row]));
      setModulePermissions(permissionMap);
      const [teamProjectResult,leadProjectResult]=await Promise.all([
        supabase.from("project_team_members").select("id").eq("company_id",chosen.id).eq("user_id",userId).limit(1),
        supabase.from("projects").select("id").eq("company_id",chosen.id).or("project_manager_id.eq."+userId+",responsible_user_id.eq."+userId).limit(1)
      ]);
      if(teamProjectResult.error)throw teamProjectResult.error;
      if(leadProjectResult.error)throw leadProjectResult.error;
      const canListProjectTeam=!!teamProjectResult.data?.length||!!leadProjectResult.data?.length;
      setHasProjectAccess(canListProjectTeam);
      if(chosenIsAdmin){
        await loadWorkspace(chosen.id);
      }else{
        // Non-admin users always load only their assigned organizational scope.
        // Module visibility must never trigger a company-wide workspace query.
        await loadWorkspace(chosen.id,"scopes");
      }
      if (["owner","admin","director","manager","supervisor"].includes(chosenRole)||(["project_responsible"].includes(chosenRole)&&canListProjectTeam)) {
        const {data: memberRows,error: memberError} = await supabase.rpc("list_company_users_with_names",{p_company_id:chosen.id});
        if (memberError) throw memberError;
        setMembers((memberRows ?? []).filter((m:any)=>String(m.email||"").toLowerCase()!=="gnnamine@gmail.com"));
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
      if (!next) { setCompanies([]); setCompany(null); setProducts([]); setModulePermissions({});setHasProjectAccess(false); }
    });
    return () => subscription.unsubscribe();
  }, [loadCompanies]);

  useEffect(()=>{if(!company||!session?.user?.id)return;void loadNotifications();const timer=window.setInterval(()=>void loadNotifications(),30000);return()=>window.clearInterval(timer)},[company?.id,session?.user?.id,loadNotifications]);

  async function markNotificationRead(item:AppNotification){
    if(!supabase||!session?.user?.id)return;
    if(!item.is_read){const {error}=await supabase.from("notifications").update({is_read:true}).eq("id",item.id).eq("recipient_user_id",session.user.id);if(error){flash("error",error.message);return;}setNotifications(list=>list.map(n=>n.id===item.id?{...n,is_read:true}:n));}
    if(item.entity_type==="spare_part_request")setPage("requests");if(item.entity_type==="project"||item.entity_type==="project_task")setPage("projects");if(item.entity_type==="team_user")setPage("users");setNotificationsOpen(false);
  }
  async function markAllNotificationsRead(){
    if(!supabase||!company||!session?.user?.id)return;
    const unread=notifications.filter(n=>!n.is_read);if(!unread.length)return;
    const {error}=await supabase.from("notifications").update({is_read:true}).eq("company_id",company.id).eq("recipient_user_id",session.user.id).eq("is_read",false).neq("notification_type","project_update").neq("notification_type","project_task");
    if(error){flash("error",error.message);return;}setNotifications(list=>list.map(n=>({...n,is_read:true})));
  }

  async function deleteAllNotifications(){
    if(!supabase||!company||!session?.user?.id||!notifications.length)return;
    const confirmed=window.confirm(lang==="ar"?"هل تريد حذف جميع الإشعارات نهائياً؟":lang==="en"?"Delete all notifications permanently?":"Voulez-vous supprimer définitivement toutes les notifications ?");
    if(!confirmed)return;
    const {error}=await supabase.from("notifications").delete().eq("company_id",company.id).eq("recipient_user_id",session.user.id).neq("notification_type","project_update").neq("notification_type","project_task");
    if(error){flash("error",error.message);return;}
    setNotifications([]);
    flash("success",lang==="ar"?"تم حذف جميع الإشعارات":lang==="en"?"All notifications deleted":"Toutes les notifications ont été supprimées");
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

  async function startDemoAccess() {
    if (!supabase) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.signInAnonymously();
      if (error) {
        if (/anonymous.*disabled|anonymous sign.?ins.*disabled/i.test(error.message)) {
          throw new Error("L’accès Démo doit être activé dans Supabase : Authentication → Sign In / Providers → Allow anonymous sign-ins.");
        }
        throw error;
      }
      const user = data.user;
      if (!user) throw new Error("La session de démonstration n’a pas pu être créée.");
      const { data: demoCompanyId, error: demoError } = await supabase.rpc("start_demo_workspace");
      if (demoError) {
        await supabase.auth.signOut();
        throw demoError;
      }
      await loadCompanies(user.id, demoCompanyId as string);
      setPage("dashboard");
      flash("success", "Bienvenue dans l’espace de démonstration. Toutes les données sont fictives.");
    } catch (e: any) {
      flash("error", e.message || "Impossible de démarrer la démonstration.");
    } finally {
      setBusy(false);
    }
  }

  async function switchCompany(companyId: string) {
    if (!session?.user?.id) return;
    const selected = companies.find(item=>item.id===companyId);
    if (!selected || selected.id===company?.id) return;
    setSettingsForm({name:selected.name,legal_name:selected.legal_name||"",tax_number:selected.tax_number||"",phone:selected.phone||"",email:selected.email||"",address:selected.address||"",city:selected.city||"",country:selected.country||"Algeria",currency_code:selected.currency_code||"DZD"});
    try { await loadCompanies(session.user.id,selected.id); setPage("dashboard"); }
    catch (error:any) { flash("error",error.message||"Impossible de changer de société."); }
  }

  async function createCompany(e: FormEvent) {
    e.preventDefault();
    if (!supabase || !session?.user || !isPlatformOwner || !companyName.trim()) return;
    setBusy(true);
    try {
      const slug = companyName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,55) + "-" + crypto.randomUUID().slice(0,6);
      const {data,error} = await supabase.rpc("create_company_for_platform_owner",{p_name:companyName.trim(),p_slug:slug});
      if (error) throw error;
      const created = (Array.isArray(data) ? data[0] : data) as Company | null;
      if (!created?.id) throw new Error("La société a été créée mais sa confirmation est introuvable. Actualisez la page.");
      setCompanyName("");
      setSettingsForm({name:created.name,legal_name:"",tax_number:"",phone:"",email:"",address:"",city:"",country:"Algeria",currency_code:created.currency_code||"DZD"});
      await loadCompanies(session.user.id,created.id);
      flash("success",t.companyCreated);
    } catch (e:any) { flash("error",e.message); }
    finally { setBusy(false); }
  }

  async function deleteRecord(kind:"products"|"warehouses"|"suppliers"|"customers",row:any){if(!supabase||!company)return;const label=row.name||row.sku||"cet enregistrement";if(!window.confirm("Supprimer définitivement « "+label+" » ? Si des opérations y sont liées, la base refusera la suppression."))return;try{const {error}=await supabase.from(kind).delete().eq("id",row.id).eq("company_id",company.id);if(error)throw error;await loadWorkspace(company.id);flash("success","Enregistrement supprimé.");}catch(e:any){flash("error","Suppression impossible : "+e.message);}}

  async function archiveProduct(product:Product) {
    if(!supabase||!company)return;
    const nextActive=!product.is_active;
    if(!window.confirm(nextActive?"Réactiver cet article ?":"Archiver cet article ?"))return;
    try{const {error}=await supabase.from("products").update({is_active:nextActive}).eq("id",product.id).eq("company_id",company.id);if(error)throw error;await loadWorkspace(company.id);flash("success",nextActive?"Article réactivé.":"Article archivé.");}catch(e:any){flash("error",e.message)}
  }

  async function openWarehouseEditor(row?:any) {
    if(!supabase||!company)return;
    setEditingId(row?.id||null);
    setForm(row?{code:row.code||"",name:row.name||"",address:row.address||"",site_id:row.site_id||"",unit_id:row.unit_id||"",service_id:row.service_id||"",equipment_id:row.equipment_id||""}:{...assignedContext.values});
    const [sr,ur,ar,team]=await Promise.all([
      row?supabase.from("warehouse_service_assignments").select("service_id").eq("company_id",company.id).eq("warehouse_id",row.id):Promise.resolve({data:[],error:null} as any),
      row?supabase.from("warehouse_unit_assignments").select("unit_id").eq("company_id",company.id).eq("warehouse_id",row.id):Promise.resolve({data:[],error:null} as any),
      row?supabase.from("warehouse_user_access").select("user_id").eq("company_id",company.id).eq("warehouse_id",row.id):Promise.resolve({data:[],error:null} as any),
      supabase.rpc("list_company_users_with_names",{p_company_id:company.id})
    ]);
    const err=[sr,ur,ar,team].find(x=>x.error)?.error;if(err){flash("error",err.message);return;}
    setWarehouseServiceIds((sr.data||[]).map((x:any)=>x.service_id));
    setWarehouseUnitIds((ur.data||[]).map((x:any)=>x.unit_id));
    setWarehouseUserIds((ar.data||[]).map((x:any)=>x.user_id));
    setWarehouseMembers((team.data||[]).filter((x:any)=>x.is_active));
    setModal("warehouse");
  }

  function editRecord(kind:"product"|"warehouse"|"supplier"|"customer",row:any) {
    if(kind==="warehouse"){void openWarehouseEditor(row);return;}
    setEditingId(row.id);
    if(kind==="product")setForm({sku:row.sku||"",name:row.name||"",description:row.description||"",barcode:row.barcode||"",unit:row.unit||"piece",category_id:row.category_id||"",purchase_price:String(row.purchase_price??0),min_stock:String(row.min_stock??0),max_stock:String(row.max_stock??0),reorder_quantity:String(row.reorder_quantity??0),lead_time_days:String(row.lead_time_days??0),track_lots:String(row.track_lots??false),track_serial_numbers:String(row.track_serial_numbers??false),weight:String(row.weight??0),volume:String(row.volume??0)});
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
        table = "warehouses"; const selectedEquipment=orgEquipment.find(x=>x.id===form.equipment_id); payload = {...payload,code:form.code?.trim().toUpperCase(),name:form.name?.trim(),address:form.address?.trim()||null,site_id:selectedEquipment?.site_id||form.site_id||null,unit_id:null,service_id:null,department_id:null,equipment_id:form.equipment_id||null};
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
      if (table) { if(modal==="warehouse"){const query=editingId?supabase.from(table).update(payload).eq("id",editingId).eq("company_id",company.id).select("id").single():supabase.from(table).insert(payload).select("id").single();const {data,error}=await query;if(error)throw error;const {error:configError}=await supabase.rpc("save_warehouse_configuration",{p_company_id:company.id,p_warehouse_id:data.id,p_service_ids:warehouseServiceIds,p_unit_ids:warehouseUnitIds,p_user_ids:warehouseUserIds});if(configError)throw configError;}else{const query=editingId?supabase.from(table).update(payload).eq("id",editingId).eq("company_id",company.id):supabase.from(table).insert(payload);const {error}=await query;if(error)throw error;} }
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
      const subtotal=Number(d.subtotal||0);const discount=Number(d.discount||0);const total=kind==="sale"?Number(d.total||0):subtotal;const creatorName=members.find((m:any)=>m.user_id===d.created_by)?.full_name||"Utilisateur";
      printWindow.document.write("<!doctype html><html lang='fr'><head><meta charset='utf-8'><title>"+esc(number)+"</title><style>body{font:13px Arial,sans-serif;color:#1d2939;margin:36px}header{display:flex;justify-content:space-between;border-bottom:2px solid #243b73;padding-bottom:18px}h1{font-size:22px;margin:0 0 8px}h2{font-size:18px;color:#243b73;margin:28px 0 12px}.muted{color:#667085;line-height:1.6}.meta{margin:22px 0;display:flex;justify-content:space-between}.box{background:#f6f8fb;padding:14px;border-radius:8px;min-width:220px}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{padding:10px 8px;border-bottom:1px solid #e4e7ec;text-align:left}th{background:#f6f8fb;font-size:11px}.num{text-align:right;white-space:nowrap}.totals{margin:22px 0 0 auto;width:300px}.totals div{display:flex;justify-content:space-between;padding:7px}.grand{font-size:18px;font-weight:bold;border-top:2px solid #243b73;margin-top:8px}.foot{margin-top:50px;text-align:center;color:#667085;font-size:10px}@media print{body{margin:16mm}}</style></head><body><header><div><h1>"+esc(c.legal_name||c.name)+"</h1><div class='muted'>"+esc(c.address||"")+" "+esc(c.city||"")+" "+esc(c.country||"")+"</div><div class='muted'>"+esc(c.phone||"")+" · "+esc(c.email||"")+"</div><div class='muted'>NIF / Identifiant: "+esc(c.tax_number||"—")+"</div></div><div style='text-align:right'><h1>"+(kind==="sale"?"FACTURE DE VENTE":"BON D’ACHAT")+"</h1><b>"+esc(number)+"</b><div class='muted'>Date: "+esc(new Date(date).toLocaleDateString("fr-FR"))+"</div></div></header><div class='meta'><div class='box'><b>"+(kind==="sale"?"Client":"Fournisseur")+"</b><div>"+esc(partner?.name||"—")+"</div><div class='muted'>"+esc(partner?.phone||"")+"</div><div class='muted'>"+esc(partner?.address||"")+"</div></div><div class='box'><b>Statut</b><div>"+esc(d.status||"—")+"</div><div class='muted'>Établi par : "+esc(creatorName)+"</div></div></div><h2>Détail des articles</h2><table><thead><tr><th>Référence</th><th>Article</th><th>Unité</th><th class='num'>Qté</th><th class='num'>Prix unitaire</th><th class='num'>Remise</th><th class='num'>Total</th></tr></thead><tbody>"+lines+"</tbody></table><div class='totals'><div><span>Sous-total</span><b>"+fmt(subtotal)+"</b></div>"+(kind==="sale"?"<div><span>Remise facture</span><b>"+fmt(discount)+"</b></div>":"")+"<div class='grand'><span>Total</span><b>"+fmt(total)+"</b></div></div><div class='foot'>Document généré par Stock & Project Management · Merci pour votre confiance.</div><script>window.onload=()=>{window.focus();window.print()}</script></body></html>");
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

  async function refreshTeam(){if(!supabase||!company)return;const team=await supabase.rpc("list_company_users_with_names",{p_company_id:company.id});if(team.error)flash("error",team.error.message);else setMembers((team.data??[]).filter((m:any)=>String(m.email||"").toLowerCase()!=="gnnamine@gmail.com"));}

  function playScanFeedback(){
    // Audible ascending three-note chime; resume audio after camera interaction.
    try{
      const AudioContextCtor=window.AudioContext||(window as any).webkitAudioContext;
      if(AudioContextCtor){
        const ctx=new AudioContextCtor();
        void ctx.resume().then(()=>{
          const now=ctx.currentTime;
          [880,1175,1568].forEach((frequency,index)=>{
            const start=now+index*0.105;
            const oscillator=ctx.createOscillator();
            const gain=ctx.createGain();
            const filter=ctx.createBiquadFilter();
            oscillator.type="triangle";
            oscillator.frequency.setValueAtTime(frequency,start);
            filter.type="lowpass";filter.frequency.setValueAtTime(3200,start);
            gain.gain.setValueAtTime(0.0001,start);
            gain.gain.exponentialRampToValueAtTime(0.78,start+0.012);
            gain.gain.exponentialRampToValueAtTime(0.0001,start+0.30);
            oscillator.connect(filter);filter.connect(gain);gain.connect(ctx.destination);
            oscillator.start(start);oscillator.stop(start+0.32);
          });
          window.setTimeout(()=>{void ctx.close();},850);
        }).catch(()=>{void ctx.close();});
      }
    }catch{}
    try{if("vibrate" in navigator)navigator.vibrate([140,55,160,55,220]);}catch{}
  }

  async function handleScannedCode(code:string){
    playScanFeedback();
    let scanned=code.trim();
    try{const url=new URL(scanned,window.location.origin);scanned=url.searchParams.get("equipment")||url.searchParams.get("equipment_tag")||url.searchParams.get("product")||url.searchParams.get("sku")||url.searchParams.get("part")||url.searchParams.get("barcode")||url.pathname.split("/equipment/")[1]?.split("/")[0]||scanned;}catch{}
    try{const parsed=JSON.parse(scanned);scanned=String(parsed.equipment_id||parsed.equipmentId||parsed.equipment_tag||parsed.equipment||parsed.product_id||parsed.productId||parsed.sku||parsed.part_number||parsed.barcode||scanned);}catch{}
    if(!company||!supabase)return;
    const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    let equipmentMatch:any=null;
    if(uuid.test(scanned)){const r=await supabase.from("org_equipment").select("id,equipment_tag,name").eq("company_id",company.id).eq("id",scanned).maybeSingle();equipmentMatch=r.data;}
    if(!equipmentMatch){const r=await supabase.from("org_equipment").select("id,equipment_tag,name").eq("company_id",company.id).eq("equipment_tag",scanned).maybeSingle();equipmentMatch=r.data;}
    if(equipmentMatch){setScanChoice({type:"equipment",id:equipmentMatch.id,code:equipmentMatch.equipment_tag,name:equipmentMatch.name});setScannerOpen(false);return;}
    let productMatch:any=(products||[]).find((p:any)=>p.id===scanned||String(p.sku||"").toLowerCase()===scanned.toLowerCase()||String(p.barcode||"").toLowerCase()===scanned.toLowerCase());
    if(!productMatch){
      let d=await supabase.from("spare_part_details").select("product_id").eq("company_id",company.id).eq("part_number",scanned).maybeSingle();
      if(!d.data?.product_id)d=await supabase.from("spare_part_details").select("product_id").eq("company_id",company.id).eq("manufacturer_reference",scanned).maybeSingle();
      const scannedProductId=d.data?.product_id;if(scannedProductId)productMatch=(products||[]).find((p:any)=>p.id===scannedProductId)||null;
    }
    if(productMatch){setScanChoice({type:"spare",id:productMatch.id,code:productMatch.sku||scanned,name:productMatch.name});setScannerOpen(false);return;}
    setSearch(scanned);setPage("spareParts");setScannerOpen(false);
    flash("error",lang==="ar"?"لم يتم العثور على قطعة أو معدة بهذا الرمز":lang==="en"?"No spare part or equipment matches this code":"Aucune pièce ou équipement ne correspond à ce code");
  }

  const accessFor = (key:string) => {
    const p=modulePermissions[key]||{};
    const scopeRequired=!["users","settings"].includes(key);
    const scopeAllows=(action:string)=>!scopeRequired||myScopeAssignments.some((x:any)=>x.scope_type!=="management"&&x[`can_${action}`]===true);
    const canView=isAdmin||(p.can_view===true&&scopeAllows("view"));
    const allowed=(permission:string,scopeAction:string)=>isAdmin||(canView&&p[permission]===true&&scopeAllows(scopeAction));
    return {canView,canCreate:allowed("can_create","create"),canEdit:allowed("can_edit","edit"),canDelete:allowed("can_delete","delete"),canApprove:allowed("can_approve","approve"),canIssue:allowed("can_issue","issue"),canReceive:allowed("can_receive","receive"),canTransfer:allowed("can_transfer","transfer"),canInventory:allowed("can_inventory","inventory"),isAdmin};
  };
  const assignedContext = useMemo(()=>resolveAssignedContext(myScopeAssignments,{sites:orgSites,services:orgServices,units:orgUnits,equipment:orgEquipment,warehouses}),[myScopeAssignments,orgSites,orgServices,orgUnits,orgEquipment,warehouses]);
  const defaultWarehouseId=assignedContext.values.warehouse_id||(warehouses.length===1?warehouses[0].id:"");
  const canManageUsers = ["owner","admin","director","manager","supervisor"].includes(currentRole);
  const isDemoSession = session?.user?.is_anonymous === true;
  const visibleNav = nav.filter(item=>{if(isDemoSession&&["users","organization","settings"].includes(item.id))return false;if(isDemoSession&&item.id==="projects")return true;if(item.id==="dashboard")return true;if(item.id==="users")return isAdmin||canManageUsers;if(item.id==="organization")return isAdmin;if(item.id==="settings")return isAdmin||modulePermissions.settings?.can_view===true;if(isAdmin)return true;if(item.id==="projects")return accessFor("projects").canView;return accessFor(item.id).canView;});
  const visiblePageIds=visibleNav.map(item=>item.id).join("|");
  useEffect(()=>{if(company&&!visibleNav.some(item=>item.id===page)){setPage((visibleNav[0]?.id||"dashboard") as Page);}},[company?.id,page,visiblePageIds,hasProjectAccess]);
  const title = t[page];
  const money = (value:number) => new Intl.NumberFormat(lang==="en"?"en-US":lang==="ar"?"ar-DZ":"fr-DZ",{style:"currency",currency:company?.currency_code||"DZD",maximumFractionDigits:0}).format(value||0);
  const documentGross=documentLines.reduce((sum,line)=>sum+Math.max(0,Number(line.quantity||0))*Math.max(0,Number(line.unit_price||0)),0);
  const documentLineDiscount=documentLines.reduce((sum,line)=>sum+Math.max(0,Number(line.discount||0)),0);
  const documentNet=Math.max(0,documentGross-documentLineDiscount);
  const documentTotal=Math.max(0,documentNet-(modal==="sale"?Math.max(0,Number(form.discount||0)):0));
  if (!isSupabaseConfigured) return <div className="config-screen"><div className="auth-card"><div className="brand-mark"><Boxes size={26}/></div><h1>Stock & Project Management</h1><p>{t.configError}</p><code>VITE_SUPABASE_URL<br/>VITE_SUPABASE_PUBLISHABLE_KEY</code></div></div>;
  if (loading) return <div className="loading-screen"><div className="spinner"/><span>{t.loading}</span></div>;

  if (!session) return <div className="auth-screen" dir={rtl?"rtl":"ltr"}>
    <div className="auth-visual"><div className="auth-brand"><span className="brand-mark app-brand-mark"><img className="app-brand-image" src="/brand-mark.svg" alt="Stock & Project Management" /></span><b>Stock & Project Management</b></div><div className="visual-copy"><span className="eyebrow">{lang==="ar"?"الصيانة · قطع الغيار · مراقبة المخزون":"MAINTENANCE · SPARE PARTS · STOCK CONTROL"}</span><h1>{lang==="ar"?"تحكم أفضل في مخزونك.":"Votre stock, enfin sous contrôle."}</h1><p>{lang==="ar"?"منصة لإدارة مخزون قطع غيار الصيانة والمعدات.":"Une plateforme dédiée au stock des pièces de rechange de maintenance."}</p><div className="visual-stats"><div><b>01</b><span>{lang==="ar"?"مساحة العمل":lang==="en"?"Workspace":"Espace"}</span></div><div><b>02</b><span>{lang==="ar"?"المخزون":lang==="en"?"Inventory":"Stock"}</span></div><div><b>03</b><span>{lang==="ar"?"التحليلات":lang==="en"?"Insights":"Analyses"}</span></div></div></div><div className="visual-footer">Stock & Project Management · {new Date().getFullYear()}</div></div>
    <div className="auth-panel"><div className="lang-switch"><Languages size={16}/><select value={lang} onChange={e=>setLang(e.target.value as Lang)}><option value="fr">Français</option><option value="en">English</option><option value="ar">العربية</option></select></div><form className="auth-form" onSubmit={submitAuth}><span className="eyebrow">{authMode==="login"?"ESPACE SÉCURISÉ":"NOUVEAU COMPTE"}</span><h2>{authMode==="login"?t.login:t.signup}</h2><p>{t.authSubtitle}</p><label>{t.email}<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required autoComplete="email"/></label><label>{t.password}<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required minLength={8} autoComplete={authMode==="login"?"current-password":"new-password"}/></label><button className="primary-btn full" disabled={busy}>{busy?t.loading:authMode==="login"?t.login:t.signup}</button>{authMode==="login"&&<button type="button" className="demo-access-btn" onClick={()=>void startDemoAccess()} disabled={busy}><PlayCircle size={17}/><span>{busy?(lang==="ar"?"جارٍ التحضير...":lang==="en"?"Preparing demo...":"Préparation de la démo..."):(lang==="ar"?"جرّب النسخة التجريبية":lang==="en"?"Try the demo version":"Essayer la version démo")}</span><small>{lang==="ar"?"دخول مباشر دون حساب":lang==="en"?"Instant access · No account":"Accès direct · Sans compte"}</small></button>}{inviteFlow&&<div className="auth-toggle">{authMode==="login"?t.haveAccount:t.login} <button type="button" onClick={()=>setAuthMode(authMode==="login"?"signup":"login")}>{authMode==="login"?t.signup:t.login}</button></div>}
      {!inviteFlow&&<div className="auth-toggle">Accès réservé aux utilisateurs invités par l’administrateur.</div>}<div className="secure-note"><ShieldCheck size={15}/> Connexion sécurisée · Supabase Auth</div></form></div>
    {notice&&<div className={"toast "+notice.type}>{notice.text}</div>}
  </div>;

  const isPlatformOwner = session?.user?.id === "710901a9-7967-45ab-8e5a-038da8081ce2" && session?.user?.email?.toLowerCase() === "gnnamine@gmail.com";
  if (!company) return <div className="setup-screen" dir={rtl?"rtl":"ltr"}><div className="setup-card"><span className="brand-mark"><Building2/></span><h1>{t.companySetup}</h1><p>{isPlatformOwner ? (lang==="ar"?"أنشئ أول شركة لإعداد مساحة العمل.":"Créez la première société pour initialiser votre espace.") : (lang==="ar"?"لا يوجد حساب شركة مرتبط بك. يرجى الاتصال بمالك المنصة.":lang==="en"?"No company is linked to your account. Please contact the platform owner.":"Aucune société n'est associée à votre compte. Contactez le propriétaire de la plateforme.")}</p>{isPlatformOwner&&<form onSubmit={createCompany}><label>{t.company}<input value={companyName} onChange={e=>setCompanyName(e.target.value)} required minLength={2}/></label><button className="primary-btn full" disabled={busy}>{busy?t.loading:t.createCompany}</button></form>}<button className="text-btn" onClick={signOut}>{t.logout}</button></div>{notice&&<div className={"toast "+notice.type}>{notice.text}</div>}</div>;

  return <div className="app-shell" dir={rtl?"rtl":"ltr"}>
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark app-brand-mark"><img className="app-brand-image" src="/brand-mark.svg" alt="Stock & Project Management" /></span><div><b>Stock</b><small>& PROJECT MANAGEMENT</small></div></div>
      <nav className="sidebar-navigation">{(["workspace","administration"] as const).map(group=>{const items=visibleNav.filter(item=>item.group===group);if(!items.length)return null;const groupLabel=group==="workspace"?(lang==="ar"?"مساحة العمل":lang==="en"?"WORKSPACE":"ESPACE DE TRAVAIL"):(lang==="ar"?"إدارة النظام":lang==="en"?"ADMINISTRATION":"ADMINISTRATION");return <div className="nav-group" key={group}><div className="nav-group-title">{groupLabel}</div>{items.map(item=>{const Icon=item.icon;const label=t[item.id];return <button key={item.id} type="button" title={label} aria-label={label} aria-current={page===item.id?"page":undefined} className={"nav-item "+(page===item.id?"active":"")} onClick={()=>setPage(item.id)}><Icon size={18}/><span>{label}</span>{item.id==="stock"&&<i className="nav-dot"/>}</button>})}</div>})}</nav>
      <div className="sidebar-bottom"><div className="help-card"><CircleHelp size={18}/><b>Besoin d'aide ?</b><span>Votre gestion, simplifiée.</span></div><button className="nav-item" onClick={()=>setLang(lang==="fr"?"en":lang==="en"?"ar":"fr")}><Languages size={18}/><span>{t.language}: {lang.toUpperCase()}</span></button><button className="nav-item" onClick={signOut}><LogOut size={18}/><span>{t.logout}</span></button><div className="user-mini"><div className="avatar">{isDemoSession?"D":session.user.email?.slice(0,1).toUpperCase()}</div><div><b>{isDemoSession?"Demo invité":session.user.email?.split("@")[0]}</b><small>{isDemoSession?"Session de démonstration":session.user.email}</small></div>{!isDemoSession&&<Settings size={16}/>}</div></div>
    </aside>
    <main className="main-area">
      <header className="topbar"><div className="mobile-brand"><span className="brand-mark app-brand-mark"><img className="app-brand-image" src="/brand-mark.svg" alt="Stock & Project Management" /></span><b>Stock & Project Management</b></div>{isDemoSession&&<span className="demo-session-badge"><PlayCircle size={14}/> MODE DÉMO · DONNÉES FICTIVES</span>}{companies.length>1&&<select className="top-company-select" aria-label={lang==="ar"?"الشركة الحالية":lang==="en"?"Current company":"Société active"} value={company.id} onChange={e=>void switchCompany(e.target.value)}>{companies.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select>}<div className="breadcrumbs">{lang==="ar"?"مساحة العمل":lang==="en"?"Workspace":"Espace de travail"} <span>/</span> <b>{title}</b></div><div className="top-actions"><div className="global-search"><Search size={16}/><input placeholder={t.search} value={search} onChange={e=>{const value=e.target.value;setSearch(value);if(!value.trim())setSpareFocusId(null);}}/><kbd>⌘ K</kbd></div><button type="button" className="icon-btn install-trigger" title={lang==="ar"?"تثبيت التطبيق":lang==="en"?"Install app":"Installer l’application"} aria-label={lang==="ar"?"تثبيت التطبيق":lang==="en"?"Install app":"Installer l’application"} onClick={()=>void installApp()}><Download size={17}/><span>{lang==="ar"?"تثبيت":lang==="en"?"Install":"Installer"}</span></button><button type="button" className="icon-btn language-trigger" title={lang==="ar"?"تغيير اللغة":lang==="en"?"Change language":"Changer la langue"} aria-label={lang==="ar"?"تغيير اللغة":lang==="en"?"Change language":"Changer la langue"} onClick={()=>setLang(v=>v==="fr"?"en":v==="en"?"ar":"fr")}><Languages size={17}/><span>{lang.toUpperCase()}</span></button><button className="icon-btn" title="Import / Export Excel" aria-label="Import / Export Excel" onClick={()=>setImportExportOpen(true)}><FileSpreadsheet size={18}/></button><button type="button" className="icon-btn scanner-trigger" title={lang==="ar"?"مسح الباركود":lang==="en"?"Scan barcode":"Scanner code-barres"} aria-label={lang==="ar"?"مسح الباركود":lang==="en"?"Scan barcode":"Scanner code-barres"} onClick={()=>setScannerOpen(true)}><ScanBarcode size={18}/><span>{lang==="ar"?"مسح":lang==="en"?"Scan":"Scanner"}</span></button><div className="notification-wrap"><button className={"icon-btn notification-trigger "+(notificationsOpen?"is-open":"")} title={lang==="ar"?"الإشعارات":lang==="en"?"Notifications":"Notifications"} aria-label={lang==="ar"?"الإشعارات":lang==="en"?"Notifications":"Notifications"} aria-expanded={notificationsOpen} onClick={()=>setNotificationsOpen(v=>!v)}><Bell size={18}/>{notifications.some(n=>!n.is_read)&&<i className="notification-badge">{notifications.filter(n=>!n.is_read).length>99?"99+":notifications.filter(n=>!n.is_read).length}</i>}</button>{notificationsOpen&&<><button className="notification-dismiss" aria-label="Close notifications" onClick={()=>setNotificationsOpen(false)}/><section className="notification-popover"><div className="notification-popover-head"><div><b>{lang==="ar"?"الإشعارات":lang==="en"?"Notifications":"Notifications"}</b><small>{notifications.filter(n=>!n.is_read).length} {lang==="ar"?"غير مقروء":lang==="en"?"unread":"non lues"}</small></div><div className="notification-head-actions"><button type="button" className="gsp-notification-action" onClick={()=>void markAllNotificationsRead()} disabled={!notifications.some(n=>!n.is_read)} title={lang==="ar"?"قراءة الكل":lang==="en"?"Mark all read":"Tout lire"}><CheckCheck size={14}/>{lang==="ar"?"قراءة الكل":lang==="en"?"Mark all read":"Tout lire"}</button><button type="button" className="gsp-notification-action is-danger" onClick={()=>void deleteAllNotifications()} disabled={!notifications.length} title={lang==="ar"?"حذف جميع الإشعارات":lang==="en"?"Delete all notifications":"Supprimer toutes les notifications"}><Trash2 size={14}/>{lang==="ar"?"حذف الكل":lang==="en"?"Delete all":"Tout supprimer"}</button><button type="button" className="gsp-notification-action is-icon" onClick={()=>setNotificationsMinimized(v=>!v)} title={notificationsMinimized?(lang==="ar"?"توسيع الإشعارات":lang==="en"?"Expand notifications":"Développer les notifications"):(lang==="ar"?"تصغير نافذة الإشعارات":lang==="en"?"Minimize notifications":"Réduire les notifications")} aria-label="Minimize or expand notifications"><ChevronDown size={15} style={{transform:notificationsMinimized?"rotate(180deg)":"none"}}/>{notificationsMinimized?(lang==="ar"?"توسيع":lang==="en"?"Expand":"Développer"):(lang==="ar"?"تصغير":lang==="en"?"Minimize":"Réduire")}</button></div></div>{!notificationsMinimized&&<div className="notification-list">{notifications.length?notifications.map(item=><button type="button" key={item.id} className={"notification-item "+(!item.is_read?"unread":"")} onClick={()=>void markNotificationRead(item)}><span className="notification-item-icon"><Bell size={15}/></span><span className="notification-item-copy"><b>{item.title}</b><small>{item.message}</small><time>{new Date(item.created_at).toLocaleString(lang==="ar"?"ar-DZ":lang==="en"?"en-US":"fr-FR",{dateStyle:"short",timeStyle:"short"})}</time></span>{!item.is_read&&<i className="notification-unread-dot"/>}</button>):<div className="notification-empty"><Bell size={22}/><b>{lang==="ar"?"لا توجد إشعارات":lang==="en"?"You’re all caught up":"Aucune notification"}</b><small>{lang==="ar"?"ستظهر هنا آخر التحديثات":lang==="en"?"New updates will appear here":"Les nouvelles activités apparaîtront ici"}</small></div>}</div>}</section></>}</div><button className="icon-btn mobile-logout" type="button" title={t.logout} aria-label={t.logout} onClick={signOut}><LogOut size={18}/></button><div className="top-avatar">{session.user.email?.slice(0,1).toUpperCase()}</div></div></header>
      <div className="page-content">
        <div className="page-heading"><div><span className="eyebrow">{company.name.toUpperCase()} · {new Date().toLocaleDateString(lang==="ar"?"ar-DZ":lang==="en"?"en-US":"fr-FR",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</span><h1>{page==="dashboard"?t.welcome:title}</h1><p>{page==="requests"?(lang==="ar"?"إنشاء ومتابعة طلبات قطع الغيار قبل صرفها من المخزن":lang==="en"?"Create and track spare-part requests before warehouse issue":"Créer et suivre les demandes de pièces avant leur délivrance par le magasin"):page==="spareParts"?(lang==="ar"?"المرجع التقني والتوافق مع المعدات والمخزون":lang==="en"?"Technical catalogue, equipment compatibility and stock":"Référentiel technique, compatibilité équipements et disponibilité du stock"):t.subtitle}</p></div>{page==="products"&&accessFor("products").canCreate&&<button className="primary-btn" onClick={()=>{setEditingId(null);setForm({unit:"piece"});setModal("product")}}><Plus size={17}/>{t.addProduct}</button>}{page==="warehouses"&&accessFor("warehouses").canCreate&&<button className="primary-btn" onClick={()=>void openWarehouseEditor()}><Plus size={17}/>{t.addWarehouse}</button>}{page==="suppliers"&&accessFor("suppliers").canCreate&&<button className="primary-btn" onClick={()=>{setEditingId(null);setForm({});setModal("supplier")}}><Plus size={17}/>{t.addSupplier}</button>}{page==="customers"&&["owner","admin","director","manager","sales"].includes(currentRole)&&<button className="primary-btn" onClick={()=>{setEditingId(null);setForm({});setModal("customer")}}><Plus size={17}/>{t.addCustomer}</button>}{page==="stock"&&["owner","admin","director","manager","warehouse"].includes(currentRole)&&<button className="primary-btn" onClick={()=>{setForm({warehouse_id:defaultWarehouseId});setModal("movement");}}><Plus size={17}/>{t.addMovement}</button>}</div>

        {!["settings","users","organization","dashboard","projects"].includes(page)&&<ProfessionalModuleReport companyId={company.id} company={company} page={page} title={title} lang={lang}/>}
        <Suspense fallback={<ModuleLoading/>}>
        <ModuleErrorBoundary resetKey={page} lang={lang}>
        {page==="dashboard"&&<SparePartsDashboard companyId={company.id} currency={company.currency_code||"DZD"} lang={lang} warehouses={warehouses} myScopes={myScopeAssignments} isAdmin={isAdmin} onNavigate={setPage}/> }
        {page==="projects"&&<ProjectManagement companyId={company.id} companyName={company.name} currentUserId={session.user.id} currentRole={currentRole} members={members} myScopes={myScopeAssignments} sites={orgSites} services={orgServices} units={orgUnits} equipment={orgEquipment} access={accessFor("projects")} lang={lang} currency={company.currency_code||"DZD"}/> }

        {page==="products"&&<section className="panel"><div className="panel-head"><div><h3>{t.products}</h3><p>{filteredProducts.length} / {products.length} {t.items.toLowerCase()}</p></div><div className="product-filters"><select value={productCategoryFilter} onChange={e=>setProductCategoryFilter(e.target.value)}><option value="all">{t.allCategories}</option>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select><div className="table-search"><Search size={15}/><input placeholder={t.search} value={search} onChange={e=>setSearch(e.target.value)}/></div></div></div><ProductTable products={filteredProducts} categories={categories} money={money} t={t} onEdit={accessFor("products").canEdit?p=>editRecord("product",p):undefined} onArchive={accessFor("products").canEdit?p=>void archiveProduct(p):undefined} onDelete={accessFor("products").canDelete?p=>void deleteRecord("products",p):undefined}/></section>}
        {page==="warehouses"&&<section className="panel"><div className="panel-head"><div><h3>{t.warehouses}</h3><p>{warehouses.length} {t.warehouses.toLowerCase()}</p></div></div>{warehouses.length? <div className="simple-list">{warehouses.map(w=><div className="simple-row" key={w.id}><span className="list-icon"><Warehouse size={18}/></span><div><b>{w.name}</b><small>{w.code}</small></div><span className="status-pill">{w.is_active?(lang==="ar"?"نشط":lang==="en"?"Active":"Actif"):(lang==="ar"?"غير نشط":lang==="en"?"Inactive":"Inactif")}</span>{(accessFor("warehouses").canEdit||accessFor("warehouses").canDelete)&&<>{accessFor("warehouses").canEdit&&<button className="ops-icon-btn" onClick={()=>editRecord("warehouse",w)} title={tr(lang,"Modifier","Edit","تعديل")}><Settings size={14}/></button>}{accessFor("warehouses").canDelete&&<button className="ops-icon-btn danger-action" onClick={()=>void deleteRecord("warehouses",w)} title={tr(lang,"Supprimer","Delete","حذف")}><Trash2 size={14}/></button>}</>}</div>)}</div>:<Empty t={t}/>}</section>}
        {page==="suppliers"&&<SimpleDirectory title={t.suppliers} rows={suppliers} icon="supplier" empty={t.empty} lang={lang} onEdit={accessFor("suppliers").canEdit?r=>editRecord("supplier",r):undefined} onDelete={accessFor("suppliers").canDelete?r=>void deleteRecord("suppliers",r):undefined}/>}
        {page==="customers"&&<SimpleDirectory title={t.customers} rows={customers} icon="customer" empty={t.empty} lang={lang} onEdit={accessFor("reports").canEdit?r=>editRecord("customer",r):undefined} onDelete={accessFor("reports").canDelete?r=>void deleteRecord("customers",r):undefined}/>}
        {page==="stock"&&<section className="panel"><div className="panel-head"><div><h3>{t.stock}</h3><p>{filteredMovements.length} / {movements.length} {t.movements.toLowerCase()}</p></div><div className="table-search"><Search size={15}/><input aria-label={t.movementSearch} placeholder={t.movementSearch} value={movementSearch} onChange={e=>setMovementSearch(e.target.value)}/><button type="button" className="secondary-btn" onClick={exportMovements} disabled={!filteredMovements.length}>{t.exportMovements}</button></div></div>{filteredMovements.length?<div className="table-wrap"><table><thead><tr><th>{t.name}</th><th>{t.movementType}</th><th>{t.quantity}</th><th>{t.warehouse}</th><th>{t.dateLabel}</th></tr></thead><tbody>{filteredMovements.map((m:any)=><tr key={m.id}><td><b>{m.products?.name||"—"}</b><small className="cell-sub">{m.products?.sku}</small></td><td><span className="status-pill">{m.movement_type}</span></td><td>{m.quantity}</td><td>{m.warehouses?.name||"—"}</td><td>{new Date(m.occurred_at).toLocaleDateString()}</td></tr>)}</tbody></table></div>:<Empty t={t}/>}</section>}
        {page==="purchases"&&<section className="panel"><div className="panel-head"><div><h3>{t.purchases}</h3><p>{purchases.length} commande(s) · {t.purchaseReceipt}</p></div>{accessFor("stock").canCreate&&<button className="primary-btn" onClick={()=>{setForm({warehouse_id:defaultWarehouseId});setDocumentLines([{product_id:"",quantity:"",unit_price:"",discount:"0"}]);setModal("purchase")}}><Plus size={16}/>{t.newPurchase}</button>}</div>{purchases.length?<div className="table-wrap"><table><thead><tr><th>{t.purchaseNumber}</th><th>{t.suppliers}</th><th>{t.dateLabel}</th><th>{t.statusLabel}</th><th>{t.totalLabel}</th><th>{t.documentLabel}</th></tr></thead><tbody>{purchases.map(x=><tr key={x.id}><td><b>{x.order_number}</b></td><td>{x.suppliers?.name||"—"}</td><td>{new Date(x.order_date).toLocaleDateString()}</td><td><span className="status-pill positive">{x.status}</span></td><td>{money(Number(x.subtotal))}</td><td><button className="ops-icon-btn" title={t.printOrder} onClick={()=>void printDocument("purchase",x.id)}><Printer size={15}/></button></td></tr>)}</tbody></table></div>:<Empty t={t}/>}</section>}
        {page==="settings"&&<section className="panel notification-preferences"><div className="panel-head"><div><h3>{lang==="ar"?"إعدادات التنبيهات":lang==="en"?"Notification preferences":"Préférences des notifications"}</h3><p>{lang==="ar"?"اختر كيف تريد استقبال تنبيهات المخزون والطلبات":"Choisissez comment recevoir les alertes de stock et les demandes."}</p></div><Bell size={20}/></div><div className="form-grid"><label className="notification-setting-row"><span><b>{lang==="ar"?"صوت التنبيه":lang==="en"?"Notification sound":"Son des notifications"}</b><small>{lang==="ar"?"تشغيل صوت عند وصول تنبيه جديد أثناء فتح التطبيق":"Jouer un son lorsqu'une nouvelle notification arrive dans l'application."}</small></span><input type="checkbox" checked={soundEnabled} onChange={e=>setSoundEnabled(e.target.checked)}/></label><label className="notification-setting-row"><span><b>{lang==="ar"?"إشعارات النظام":lang==="en"?"System notifications":"Notifications système"}</b><small>{lang==="ar"?"إظهار إشعار المتصفح عند وصول تنبيه والتطبيق مفتوح":"Afficher une notification du navigateur lorsque l'application est ouverte."}</small></span><input type="checkbox" checked={desktopNotificationsEnabled&&("Notification" in window)&&Notification.permission==="granted"} onChange={e=>{if(e.target.checked)void enableDesktopNotifications();else setDesktopNotificationsEnabled(false)}}/></label><div className="span-2 modal-actions"><button type="button" className="secondary-btn" onClick={playNotificationSound}>{lang==="ar"?"تجربة الصوت":lang==="en"?"Test sound":"Tester le son"}</button>{!("Notification" in window)||Notification.permission!=="granted"?<button type="button" className="primary-btn" onClick={()=>void enableDesktopNotifications()}>{lang==="ar"?"السماح بإشعارات المتصفح":lang==="en"?"Allow browser notifications":"Autoriser les notifications navigateur"}</button>:<span className="status-pill positive">{lang==="ar"?"إذن الإشعارات ممنوح":lang==="en"?"Browser permission granted":"Autorisation accordée"}</span>}<button type="button" className={pushEnabled?"secondary-btn":"primary-btn"} disabled={pushBusy||!company||!session} onClick={()=>void(pushEnabled?disablePushNotifications():enablePushNotifications())}>{pushBusy?(lang==="ar"?"جارٍ التفعيل...":"Activation..."):pushEnabled?(lang==="ar"?"إيقاف إشعارات الخلفية":lang==="en"?"Disable background push":"Désactiver le Push arrière-plan"):(lang==="ar"?"تفعيل حتى والتطبيق مغلق":lang==="en"?"Enable when app is closed":"Activer même application fermée")}</button><p className="span-2 notification-push-help">{lang==="ar"?"ثبت التطبيق على الهاتف واسمح بالإشعارات. ستصلك التنبيهات حتى عندما يكون التطبيق مغلقاً، إذا كان الجهاز متصلاً بالإنترنت.":lang==="en"?"Install the app and allow notifications. Push alerts can arrive while the app is closed when your device is online.":"Installez l'application et autorisez les notifications. Les alertes Push peuvent arriver même lorsque l'application est fermée, si l'appareil est connecté à Internet."}</p></div></div></section>}
        {page==="settings"&&isPlatformOwner&&<section className="panel platform-companies-panel"><div className="panel-head"><div><h3>{lang==="ar"?"إدارة الشركات":lang==="en"?"Platform companies":"Gestion des sociétés"}</h3><p>{lang==="ar"?"إنشاء مساحات مستقلة لكل شركة مع عزل بياناتها":lang==="en"?"Create independent workspaces with isolated company data":"Créez des espaces indépendants avec des données isolées pour chaque société."}</p></div><span className="status-pill positive">{companies.length} société(s)</span></div><form className="platform-company-create" onSubmit={createCompany}><label>{lang==="ar"?"اسم الشركة الجديدة":lang==="en"?"New company name":"Nom de la nouvelle société"}<input value={companyName} onChange={e=>setCompanyName(e.target.value)} placeholder={lang==="ar"?"مثال: Société ABC":lang==="en"?"e.g. ABC Company":"Ex. : Société ABC"} minLength={2} required/></label><button className="primary-btn" disabled={busy||!companyName.trim()}><Plus size={16}/>{busy?t.loading:(lang==="ar"?"إنشاء الشركة":lang==="en"?"Create company":"Créer la société")}</button></form><div className="platform-company-list">{companies.map(item=><div className="platform-company-row" key={item.id}><span className="workspace-icon"><Building2 size={16}/></span><div><b>{item.name}</b><small>{item.id===company.id?(lang==="ar"?"الشركة الحالية":lang==="en"?"Current company":"Société actuelle"):(lang==="ar"?"شركة مرتبطة بحسابك":lang==="en"?"Linked to your account":"Liée à votre compte")}</small></div><span className="status-pill">{companyRoles[item.id]||"—"}</span></div>)}</div><p className="platform-company-note">{lang==="ar"?"كل شركة لها مخزونها ومستخدميها وعملياتها وإعداداتها الخاصة. لا يمكن لمستخدمي شركة أخرى الاطلاع عليها.":lang==="en"?"Each company has its own inventory, users, operations and settings. Other companies' users cannot access its data.":"Chaque société possède son propre stock, ses utilisateurs, ses opérations et ses paramètres. Les utilisateurs d'une autre société ne peuvent pas consulter ses données."}</p></section>}
        {page==="settings"&&isAdmin&&<section className="panel"><div className="panel-head"><div><h3>{lang==="ar"?"إعدادات الشركة":lang==="en"?"Company settings":"Paramètres de l'entreprise"}</h3><p>{lang==="ar"?"المعلومات القانونية وبيانات الاتصال المستخدمة في الوثائق المطبوعة":lang==="en"?"Legal details and contact information used on printed documents":"Informations légales et coordonnées utilisées sur les documents imprimés"}</p></div></div><form className="form-grid" onSubmit={saveCompanySettings}><label>{lang==="ar"?"الاسم التجاري":lang==="en"?"Company name":"Nom commercial"}<input value={settingsForm.name||""} onChange={e=>setSettingsForm({...settingsForm,name:e.target.value})} required/></label><label>{lang==="ar"?"الاسم القانوني":lang==="en"?"Legal name":"Raison sociale"}<input value={settingsForm.legal_name||""} onChange={e=>setSettingsForm({...settingsForm,legal_name:e.target.value})}/></label><label>{lang==="ar"?"الرقم الجبائي":lang==="en"?"Tax ID":"NIF / Identifiant fiscal"}<input value={settingsForm.tax_number||""} onChange={e=>setSettingsForm({...settingsForm,tax_number:e.target.value})}/></label><label>{lang==="ar"?"الهاتف":lang==="en"?"Phone":"Téléphone"}<input value={settingsForm.phone||""} onChange={e=>setSettingsForm({...settingsForm,phone:e.target.value})}/></label><label>{lang==="ar"?"البريد الإلكتروني":lang==="en"?"Email":"E-mail"}<input type="email" value={settingsForm.email||""} onChange={e=>setSettingsForm({...settingsForm,email:e.target.value})}/></label><label>{lang==="ar"?"المدينة":lang==="en"?"City":"Ville"}<input value={settingsForm.city||""} onChange={e=>setSettingsForm({...settingsForm,city:e.target.value})}/></label><label className="span-2">{lang==="ar"?"العنوان":lang==="en"?"Address":"Adresse"}<input value={settingsForm.address||""} onChange={e=>setSettingsForm({...settingsForm,address:e.target.value})}/></label><label>{lang==="ar"?"البلد":lang==="en"?"Country":"Pays"}<input value={settingsForm.country||"Algeria"} onChange={e=>setSettingsForm({...settingsForm,country:e.target.value})}/></label><label>{lang==="ar"?"العملة":lang==="en"?"Currency":"Devise"}<select value={settingsForm.currency_code||"DZD"} onChange={e=>setSettingsForm({...settingsForm,currency_code:e.target.value})}><option value="DZD">DZD · Dinar algérien</option><option value="EUR">EUR · Euro</option><option value="USD">USD · Dollar américain</option></select></label><div className="span-2 modal-actions"><button className="primary-btn" disabled={busy}>{busy?t.loading:t.save}</button></div></form></section>}
        {page==="users"&&canManageUsers&&<UserManagement companyId={company.id} currentRole={currentRole} onlineUsers={onlineTeamUsers} members={members} myScopes={myScopeAssignments} sites={orgSites} units={orgUnits} services={orgServices} warehouses={warehouses} equipment={orgEquipment} onRefresh={()=>void refreshTeam()} onNotice={flash} lang={lang}/>}
        {page==="organization"&&isAdmin&&<OrganizationManagement companyId={company.id} members={members} currentUserId={session.user.id} onNotice={flash} lang={lang}/>}
        
        {page==="sales"&&<section className="panel"><div className="panel-head"><div><h3>{t.sales}</h3><p>{sales.length} facture(s) · {t.automaticIssue}</p></div>{accessFor("reports").canCreate&&<button className="primary-btn" onClick={()=>{setForm({warehouse_id:defaultWarehouseId});setDocumentLines([{product_id:"",quantity:"",unit_price:"",discount:"0"}]);setModal("sale")}}><Plus size={16}/>{t.newSale}</button>}</div>{sales.length?<div className="table-wrap"><table><thead><tr><th>{t.invoiceNumber}</th><th>{t.customers}</th><th>{t.dateLabel}</th><th>{t.statusLabel}</th><th>{t.totalLabel}</th><th>{t.documentLabel}</th></tr></thead><tbody>{sales.map(x=><tr key={x.id}><td><b>{x.invoice_number}</b></td><td>{x.customers?.name||"—"}</td><td>{new Date(x.sale_date).toLocaleDateString()}</td><td><span className="status-pill positive">{x.status}</span></td><td>{money(Number(x.total))}</td><td><button className="ops-icon-btn" title={t.printInvoice} onClick={()=>void printDocument("sale",x.id)}><Printer size={15}/></button></td></tr>)}</tbody></table></div>:<Empty t={t}/>}</section>}
        {page==="equipment"&&<EquipmentManagement companyId={company.id} lang={lang} myScopes={myScopeAssignments} equipmentSeed={equipmentSeed} onBackToList={()=>setEquipmentSeed(null)} autoPrintReport={autoPrintEquipmentReport} reportWindow={equipmentReportWindow} onReportPrinted={()=>{setAutoPrintEquipmentReport(false);setEquipmentReportWindow(null);}} access={accessFor("equipment")} onRequestParts={id=>{setRequestEquipmentId(id);setPage("requests");}}/>}
        {page==="spareParts"&&<SpareParts companyId={company.id} products={products} categories={categories} warehouses={warehouses} suppliers={suppliers} myScopes={myScopeAssignments} role={currentRole} access={accessFor("spareParts")} lang={lang} searchTerm={search} focusProductId={spareFocusId} onClearFocus={()=>setSpareFocusId(null)} view="parts" onSaved={()=>loadWorkspace(company.id)}/>}
        {page==="requests"&&<SpareParts companyId={company.id} products={products} categories={categories} warehouses={warehouses} suppliers={suppliers} myScopes={myScopeAssignments} role={currentRole} access={accessFor("requests")} lang={lang} searchTerm={search} view="requests" initialEquipmentId={requestEquipmentId} initialProductId={scanProductId} onSaved={()=>loadWorkspace(company.id)}/>}
        {(page==="categories"||page==="transfers"||page==="inventory"||page==="locations"||page==="lots"||page==="returns"||page==="expenses"||page==="payments"||page==="reports")&&<StockOperations page={page} companyId={company.id} defaultWarehouseId={defaultWarehouseId} currentUserId={session.user.id} products={products} categories={categories} warehouses={warehouses} suppliers={suppliers} customers={customers} purchases={purchases} sales={sales} role={currentRole} access={accessFor(page)} money={money} lang={lang} onSaved={()=>loadWorkspace(company.id)}/>}
        </ModuleErrorBoundary>
        </Suspense>
      </div>
      <footer className="app-footer"><span>© {new Date().getFullYear()} Stock & Project Management</span><span><ShieldCheck size={14}/> {lang==="ar"?"البيانات محمية بسياسات RLS":lang==="en"?"Data protected by RLS":"Données protégées par RLS"}</span></footer>
    </main>
    <Suspense fallback={null}><StockAIAssistant companyId={company.id} companyName={company.name} lang={lang} page={page} role={currentRole} userId={session.user.id} accessKey={JSON.stringify(myScopeAssignments.map((x:any)=>({scope_type:x.scope_type,scope_id:x.scope_id,can_view:x.can_view})))}/></Suspense>\n    <Suspense fallback={null}>{importExportOpen&&company&&<ImportExportCenter companyId={company.id} lang={lang} canImport={isAdmin||modulePermissions.products?.can_create===true||modulePermissions.spareParts?.can_create===true} onClose={()=>setImportExportOpen(false)} onDone={()=>loadWorkspace(company.id)}/>}</Suspense>{scannerOpen&&<BarcodeScanner lang={lang} onDetected={handleScannedCode} onClose={()=>setScannerOpen(false)}/>}{scanChoice&&<ModalPortal><div className="modal-backdrop scan-choice-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setScanChoice(null)}} style={{position:"fixed",inset:0,zIndex:2147483000,width:"100vw",height:"100dvh",minHeight:"100svh",display:"grid",placeItems:"center",padding:"max(14px,env(safe-area-inset-top)) 14px max(14px,env(safe-area-inset-bottom))",overflowY:"auto",boxSizing:"border-box"}}><section className="modal-card scan-choice-card" role="dialog" aria-modal="true" style={{position:"relative",top:"auto",left:"auto",right:"auto",bottom:"auto",transform:"none",width:"min(520px,100%)",maxWidth:520,maxHeight:"calc(100dvh - 36px)",margin:"auto",alignSelf:"center",justifySelf:"center",overflowY:"auto",boxSizing:"border-box"}}><div className="modal-head"><div><span className="eyebrow">{lang==="ar"?"تم التعرف على الرمز":lang==="en"?"Code identified":"Code identifié"}</span><h2>{scanChoice.type==="equipment"?(lang==="ar"?"ماذا تريد أن تفعل بهذه المعدة؟":lang==="en"?"What would you like to do with this equipment?":"Que souhaitez-vous faire avec cet équipement ?"):(lang==="ar"?"ماذا تريد أن تفعل بهذه القطعة؟":lang==="en"?"What would you like to do with this spare part?":"Que souhaitez-vous faire avec cette pièce ?")}</h2></div><button className="icon-btn" onClick={()=>setScanChoice(null)}><X size={18}/></button></div><div className="panel" style={{marginBottom:16}}><b>{scanChoice.name}</b><small style={{display:"block",marginTop:5,color:"var(--muted,#64748b)"}}>{scanChoice.code}</small></div><div className="form-grid">{scanChoice.type==="spare"?<><button type="button" className="primary-btn" onClick={()=>{setScanProductId(scanChoice.id);setSpareFocusId(null);setScanChoice(null);setPage("requests");}}><ClipboardCheck size={17}/>{lang==="ar"?"إنشاء طلب لهذه القطعة":lang==="en"?"Create request for this part":"Créer une demande pour cette pièce"}</button><button type="button" className="secondary-btn" onClick={()=>{setSpareFocusId(scanChoice.id);setScanProductId(null);setScanChoice(null);setPage("spareParts");}}><Search size={17}/>{lang==="ar"?"عرض القطعة في القائمة":lang==="en"?"View part in list":"Voir la pièce dans la liste"}</button></>:<><button type="button" className="primary-btn" onClick={()=>{const reportWindow=window.open("about:blank","_blank");setEquipmentReportWindow(reportWindow);setEquipmentSeed(scanChoice.id);setAutoPrintEquipmentReport(true);setScanChoice(null);setPage("equipment");}}><FileSpreadsheet size={17}/>{lang==="ar"?"إنشاء تقرير PDF للمعدة":lang==="en"?"Generate equipment PDF report":"Générer le rapport PDF de l’équipement"}</button><button type="button" className="primary-btn" onClick={()=>{setRequestEquipmentId(scanChoice.id);setEquipmentSeed(null);setScanChoice(null);setPage("requests");}}><ClipboardCheck size={17}/>{lang==="ar"?"طلب قطعة غيار لهذه المعدة":lang==="en"?"Request a spare part":"Demander une pièce pour cet équipement"}</button><button type="button" className="secondary-btn" onClick={()=>{setEquipmentSeed(scanChoice.id);setAutoPrintEquipmentReport(false);setScanChoice(null);setPage("equipment");}}><Wrench size={17}/>{lang==="ar"?"عرض معلومات المعدة":lang==="en"?"View equipment details":"Consulter la fiche équipement"}</button></>}</div><div className="modal-actions"><button className="secondary-btn" onClick={()=>setScanChoice(null)}>{t.cancel}</button></div></section></div></ModalPortal>}
    {modal&&<ModalPortal><div className={`modal-backdrop ${modal==="warehouse"?"warehouse-modal-backdrop":""}`} onMouseDown={e=>{if(e.target===e.currentTarget)setModal(null)}}><form className={`modal-card ${modal==="warehouse"?"warehouse-modal":""}`} onSubmit={saveRecord}><div className="modal-head"><div><span className="eyebrow">{t.newRecord}</span><h2>{modal==="product"?t.addProduct:modal==="warehouse"?t.addWarehouse:modal==="supplier"?t.addSupplier:modal==="customer"?t.addCustomer:modal==="purchase"?"Nouvelle commande d’achat (CA)":modal==="sale"?"Nouvelle vente":t.addMovement}</h2></div><button type="button" className="icon-btn" onClick={()=>{setModal(null);setEditingId(null);setForm({})}}><X size={19}/></button></div>
      {modal==="product"&&<div className="form-grid"><label>{t.sku}<input value={form.sku||""} onChange={e=>setForm({...form,sku:e.target.value})} required/></label><label>{t.name}<input value={form.name||""} onChange={e=>setForm({...form,name:e.target.value})} required/></label><label className="span-2">{t.description}<input value={form.description||""} onChange={e=>setForm({...form,description:e.target.value})}/></label><label>{t.barcode}<input value={form.barcode||""} onChange={e=>setForm({...form,barcode:e.target.value})}/></label><label>{t.unit}<select value={form.unit||"piece"} onChange={e=>setForm({...form,unit:e.target.value})}><option value="piece">{t.piece}</option><option value="kg">{t.kg}</option><option value="g">{t.gram}</option><option value="l">{t.liter}</option><option value="m">{t.meter}</option><option value="box">{t.carton}</option></select></label><label>{t.category}<select value={form.category_id||""} onChange={e=>setForm({...form,category_id:e.target.value})}><option value="">—</option>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label>{t.purchasePrice}<input type="number" min="0" step="0.01" value={form.purchase_price||""} onChange={e=>setForm({...form,purchase_price:e.target.value})}/></label><label>{t.minStock}<input type="number" min="0" step="0.001" value={form.min_stock||""} onChange={e=>setForm({...form,min_stock:e.target.value})}/></label><label>{t.maxStock}<input type="number" min="0" step="0.001" value={form.max_stock||"0"} onChange={e=>setForm({...form,max_stock:e.target.value})}/></label><label>{t.reorderQty}<input type="number" min="0" step="0.001" value={form.reorder_quantity||"0"} onChange={e=>setForm({...form,reorder_quantity:e.target.value})}/></label><label>{t.leadTime}<input type="number" min="0" step="1" value={form.lead_time_days||"0"} onChange={e=>setForm({...form,lead_time_days:e.target.value})}/></label><label>{t.weight}<input type="number" min="0" step="0.001" value={form.weight||"0"} onChange={e=>setForm({...form,weight:e.target.value})}/></label><label>{t.volume}<input type="number" min="0" step="0.001" value={form.volume||"0"} onChange={e=>setForm({...form,volume:e.target.value})}/></label><label className="check-field"><span>{t.trackLots}</span><input type="checkbox" checked={form.track_lots==="true"} onChange={e=>setForm({...form,track_lots:String(e.target.checked)})}/></label><label className="check-field"><span>{t.trackSerials}</span><input type="checkbox" checked={form.track_serial_numbers==="true"} onChange={e=>setForm({...form,track_serial_numbers:String(e.target.checked)})}/></label></div>}
       {modal==="warehouse"&&<div className="form-grid"><label>{t.warehouseCode}<input value={form.code||""} onChange={e=>setForm({...form,code:e.target.value})} required/></label><label>{t.warehouseName}<input value={form.name||""} onChange={e=>setForm({...form,name:e.target.value})} required/></label><label>Site<select disabled={!!assignedContext.locked.site_id} value={form.site_id||""} onChange={e=>setForm({...form,site_id:e.target.value,unit_id:"",service_id:"",equipment_id:""})}><option value="">— Non affecté —</option>{orgSites.map(x=><option key={x.id} value={x.id}>{x.code} · {x.name}</option>)}</select></label><div className="span-2"><b>Services rattachés (sélection multiple)</b><div className="warehouse-assignment-grid">{orgServices.filter(x=>!form.site_id||x.site_id===form.site_id).map(x=><label className="check-field" key={x.id}><span>{x.code} · {x.name}</span><input type="checkbox" checked={warehouseServiceIds.includes(x.id)} onChange={e=>setWarehouseServiceIds(v=>e.target.checked?[...v,x.id]:v.filter(id=>id!==x.id))}/></label>)}</div></div><div className="span-2"><b>Unités rattachées (sélection multiple)</b><div className="warehouse-assignment-grid">{orgUnits.filter(x=>!form.site_id||x.site_id===form.site_id).map(x=><label className="check-field" key={x.id}><span>{x.code} · {x.name}</span><input type="checkbox" checked={warehouseUnitIds.includes(x.id)} onChange={e=>setWarehouseUnitIds(v=>e.target.checked?[...v,x.id]:v.filter(id=>id!==x.id))}/></label>)}</div></div><div className="span-2"><b>Utilisateurs autorisés à consulter ce stock</b><div className="warehouse-assignment-grid">{warehouseMembers.map(u=><label className="check-field" key={u.user_id}><span>{u.full_name||u.email} · {u.role}</span><input type="checkbox" checked={warehouseUserIds.includes(u.user_id)} onChange={e=>setWarehouseUserIds(v=>e.target.checked?[...v,u.user_id]:v.filter(id=>id!==u.user_id))}/></label>)}</div><small>Accès en lecture uniquement. Les autres permissions restent inchangées.</small></div><label>Équipement<select disabled={!!assignedContext.locked.equipment_id} value={form.equipment_id||""} onChange={e=>{const x=orgEquipment.find(z=>z.id===e.target.value);setForm({...form,equipment_id:e.target.value,site_id:x?.site_id||form.site_id,service_id:x?.service_id||form.service_id,unit_id:x?.unit_id||form.unit_id});}}><option value="">— Non affecté —</option>{orgEquipment.filter(x=>(!form.site_id||x.site_id===form.site_id)&&(!form.unit_id||x.unit_id===form.unit_id)).map(x=><option key={x.id} value={x.id}>{x.equipment_tag} · {x.name}</option>)}</select></label><label className="span-2">Adresse<input value={form.address||""} onChange={e=>setForm({...form,address:e.target.value})}/></label></div>}
      {(modal==="supplier"||modal==="customer")&&<div className="form-grid"><label>{modal==="supplier"?t.supplierName:t.customerName}<input value={form.name||""} onChange={e=>setForm({...form,name:e.target.value})} required/></label>{modal==="supplier"&&<label>Contact<input value={form.contact_name||""} onChange={e=>setForm({...form,contact_name:e.target.value})}/></label>}<label>{t.phone}<input value={form.phone||""} onChange={e=>setForm({...form,phone:e.target.value})}/></label><label>E-mail<input type="email" value={form.email||""} onChange={e=>setForm({...form,email:e.target.value})}/></label><label>Identifiant fiscal<input value={form.tax_number||""} onChange={e=>setForm({...form,tax_number:e.target.value})}/></label><label className="span-2">Adresse<input value={form.address||""} onChange={e=>setForm({...form,address:e.target.value})}/></label><label className="span-2">Notes<input value={form.notes||""} onChange={e=>setForm({...form,notes:e.target.value})}/></label></div>}
      {(modal==="purchase"||modal==="sale")&&<div className="form-grid">
        <label>{modal==="purchase"?t.suppliers:t.customers}<select value={modal==="purchase"?(form.supplier_id||""):(form.customer_id||"")} onChange={e=>setForm({...form,[modal==="purchase"?"supplier_id":"customer_id"]:e.target.value})}><option value="">—</option>{(modal==="purchase"?suppliers:customers).map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
        <label>{t.warehouse}<select disabled={warehouses.length===1||!!assignedContext.locked.warehouse_id} value={form.warehouse_id||defaultWarehouseId} onChange={e=>setForm({...form,warehouse_id:e.target.value})} required><option value="">—</option>{warehouses.map(w=><option key={w.id} value={w.id}>{w.name}</option>)}</select></label>
        <div className="document-lines span-2"><div className="document-lines-title"><b>Lignes du document</b><button type="button" className="link-btn" onClick={()=>setDocumentLines(lines=>[...lines,{product_id:"",quantity:"",unit_price:"",discount:"0"}])}><Plus size={14}/> Ajouter un article</button></div>{documentLines.map((line,index)=><div className="document-line" key={index}><select value={line.product_id} onChange={e=>setDocumentLines(lines=>lines.map((x,i)=>i===index?{...x,product_id:e.target.value}:x))} required><option value="">Article</option>{products.filter(p=>p.is_active).map(p=><option key={p.id} value={p.id}>{p.name} ({p.sku}) · {categories.find(c=>c.id===p.category_id)?.name||"Sans catégorie"}</option>)}</select><input type="number" min="0.001" step="0.001" placeholder="Qté" value={line.quantity} onChange={e=>setDocumentLines(lines=>lines.map((x,i)=>i===index?{...x,quantity:e.target.value}:x))} required/><input type="number" min="0" step="0.01" placeholder="Prix" value={line.unit_price} onChange={e=>setDocumentLines(lines=>lines.map((x,i)=>i===index?{...x,unit_price:e.target.value}:x))} required/>{modal==="sale"&&<input type="number" min="0" step="0.01" placeholder="Remise" value={line.discount} onChange={e=>setDocumentLines(lines=>lines.map((x,i)=>i===index?{...x,discount:e.target.value}:x))}/>}<button type="button" className="ops-icon-btn" disabled={documentLines.length===1} onClick={()=>setDocumentLines(lines=>lines.filter((_,i)=>i!==index))}><X size={14}/></button></div>)}</div>
        {modal==="sale"&&<label>{lang==="ar"?"خصم الفاتورة":"Remise facture"}<input type="number" min="0" step="0.01" value={form.discount||"0"} onChange={e=>setForm({...form,discount:e.target.value})}/></label>}
<div className="document-summary span-2"><div><span>Sous-total</span><b>{money(documentGross)}</b></div>{modal==="sale"&&<div><span>Remises lignes</span><b>− {money(documentLineDiscount)}</b></div>}{modal==="sale"&&<div><span>Remise facture</span><b>− {money(Number(form.discount||0))}</b></div>}<div className="document-grand-total"><span>Total estimé</span><b>{money(documentTotal)}</b></div></div>
                <label>{modal==="purchase"?"N° CA":"N° facture"}<input value={form.order_number||""} onChange={e=>setForm({...form,order_number:e.target.value})} placeholder={modal==="purchase"?"CA-AAAA-MMJJ-00001 · généré automatiquement":"Généré automatiquement si vide"}/></label>
        <label className="span-2">{t.note}<input value={form.note||""} onChange={e=>setForm({...form,note:e.target.value})}/></label>
      </div>}
      {modal==="movement"&&<div className="form-grid"><label>{t.name}<select value={form.product_id||""} onChange={e=>setForm({...form,product_id:e.target.value})} required><option value="">—</option>{products.map(p=><option key={p.id} value={p.id}>{p.name} ({p.sku}) · {categories.find(c=>c.id===p.category_id)?.name||"Sans catégorie"}</option>)}</select></label><label>{t.warehouse}<select disabled={warehouses.length===1||!!assignedContext.locked.warehouse_id} value={form.warehouse_id||defaultWarehouseId} onChange={e=>setForm({...form,warehouse_id:e.target.value})} required><option value="">—</option>{warehouses.map(w=><option key={w.id} value={w.id}>{w.name}</option>)}</select></label><label>{t.movementType}<select value={form.movement_type||"opening"} onChange={e=>setForm({...form,movement_type:e.target.value})}><option value="opening">{t.opening}</option><option value="adjustment_in">{t.adjustmentIn}</option><option value="adjustment_out">{t.adjustmentOut}</option></select></label><label>{t.quantity}<input type="number" min="0.001" step="0.001" value={form.quantity||""} onChange={e=>setForm({...form,quantity:e.target.value})} required/></label><label className="span-2">{t.note}<input value={form.note||""} onChange={e=>setForm({...form,note:e.target.value})}/></label></div>}
      <div className="modal-actions"><button type="button" className="secondary-btn" onClick={()=>{setModal(null);setEditingId(null);setForm({})}}>{t.cancel}</button><button className="primary-btn" disabled={busy}>{busy?t.loading:t.save}</button></div>
    </form></div></ModalPortal>}
    {notice&&<div className={"toast "+notice.type}>{notice.text}</div>}
  </div>;
}

function ProductTable({products,categories,money,t,onEdit,onArchive,onDelete}:{products:Product[];categories:any[];money:(n:number)=>string;t:Labels;onEdit?:(p:Product)=>void;onArchive?:(p:Product)=>void;onDelete?:(p:Product)=>void}) {
  if (!products.length) return <Empty t={t}/>;
  return <div className="table-wrap"><table><thead><tr><th>{t.name}</th><th>{t.sku}</th><th>{t.category}</th><th>{t.purchasePrice}</th><th>{t.minStock}</th><th>{t.statusLabel}</th>{(onEdit||onArchive||onDelete)&&<th>{t.actions}</th>}</tr></thead><tbody>{products.map(p=><tr key={p.id}><td><div className="product-cell"><span className="product-thumb"><Package size={17}/></span><div><b>{p.name}</b><small>{p.barcode||"—"}</small></div></div></td><td><span className="sku">{p.sku}</span></td><td>{categories.find(c=>c.id===p.category_id)?.name||"—"}</td><td>{money(Number(p.purchase_price))}</td><td>{p.min_stock} {p.unit}</td><td><span className={"status-pill "+(p.is_active?"positive":"warning")}>{p.is_active?t.activeStatus:t.archived}</span></td>{(onEdit||onArchive||onDelete)&&<td><div className="member-actions">{onEdit&&<button className="ops-icon-btn" onClick={()=>onEdit(p)} title={t.edit}><Settings size={14}/></button>}{onArchive&&<button className="ops-icon-btn" onClick={()=>onArchive(p)} title={p.is_active?t.archived:t.reactivate}><X size={14}/></button>}{onDelete&&<button className="ops-icon-btn danger-action" onClick={()=>onDelete(p)} title={t.delete}><Trash2 size={14}/></button>}</div></td>}</tr>)}</tbody></table></div>;
}
function Empty({t}:{t:Labels}) { return <div className="empty-state"><div className="empty-icon"><Package size={24}/></div><b>{t.noProducts}</b><span>{t.noProductsHint}</span></div>; }
function SimpleDirectory({title,rows,icon,empty,onEdit,onDelete,lang}:{title:string;rows:any[];icon:string;empty:string;lang:Lang;onEdit?:(row:any)=>void;onDelete?:(row:any)=>void}) {
  const Icon=icon==="supplier"?Truck:Users;
  return <section className="panel"><div className="panel-head"><div><h3>{title}</h3><p>{rows.length} {tr(lang,"enregistrement(s)","record(s)","سجل")}</p></div></div>{rows.length?<div className="simple-list">{rows.map(r=><div className="simple-row" key={r.id}><span className="list-icon"><Icon size={18}/></span><div><b>{r.name}</b><small>{r.phone||r.email||"—"}</small></div><span className="status-pill positive">{tr(lang,"Actif","Active","نشط")}</span>{onEdit&&<button className="ops-icon-btn" onClick={()=>onEdit(r)} title={tr(lang,"Modifier","Edit","تعديل")}><Settings size={14}/></button>}{onDelete&&<button className="ops-icon-btn danger-action" onClick={()=>onDelete(r)} title={tr(lang,"Supprimer","Delete","حذف")}><Trash2 size={14}/></button>}</div>)}</div>:<div className="empty-state"><div className="empty-icon"><Icon size={24}/></div><b>{empty}</b></div>}</section>;
}
function BarcodeScanner({onDetected,onClose,lang}:{onDetected:(code:string)=>void|Promise<void>;onClose:()=>void;lang:Lang}) {
  const videoRef=useRef<HTMLVideoElement>(null);
  const callbackRef=useRef(onDetected);callbackRef.current=onDetected;
  const [error,setError]=useState("");
  const [manualCode,setManualCode]=useState("");
  useEffect(()=>{
    let stopped=false;
    let controls:{stop:()=>void}|undefined;
    const start=async()=>{
      if(!navigator.mediaDevices?.getUserMedia){setError(tr(lang,"Caméra indisponible. Ouvrez le site en HTTPS et autorisez la caméra.","Camera unavailable. Open the site over HTTPS and allow camera access.","الكاميرا غير متاحة. افتح الموقع عبر HTTPS واسمح باستخدام الكاميرا."));return;}
      if(!videoRef.current)return;
      try{
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        const reader = new BrowserMultiFormatReader();
        controls=await reader.decodeFromVideoDevice(undefined,videoRef.current,(result)=>{
          if(result&&!stopped){stopped=true;controls?.stop();void callbackRef.current(result.getText());}
        });
      }catch(e:any){
        setError(e?.name==="NotAllowedError"?tr(lang,"Autorisez l’accès à la caméra pour ce site.","Allow camera access for this site.","اسمح بالوصول إلى الكاميرا لهذا الموقع."):e?.name==="NotFoundError"?tr(lang,"Aucune caméra détectée sur cet appareil.","No camera detected on this device.","لم يتم العثور على كاميرا في هذا الجهاز."):e?.message||tr(lang,"Impossible d'ouvrir la caméra.","Unable to open the camera.","تعذر فتح الكاميرا."));
      }
    };
    void start();
    return()=>{stopped=true;controls?.stop();};
  },[]);
  return <ModalPortal><div className="modal-backdrop scanner-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><section className="modal-card scanner-card"><div className="modal-head"><div><span className="eyebrow">{tr(lang,"SCAN QR / CODE-BARRES","QR / BARCODE SCAN","مسح QR / الباركود")}</span><h2>{tr(lang,"Scanner un équipement ou un article","Scan equipment or an item","مسح معدة أو منتج")}</h2></div><button className="icon-btn" onClick={onClose}><X size={18}/></button></div><video ref={videoRef} autoPlay muted playsInline className="scanner-video"/>{error&&<p className="scanner-error">{error}</p>}<p className="scanner-hint">{tr(lang,"Placez le QR de l’équipement ou le code-barres de l’article devant la caméra arrière. Vérifiez l’autorisation du navigateur et l’accès HTTPS.","Place the equipment QR code or item barcode in front of the rear camera. Check browser permission and HTTPS access.","ضع رمز QR للمعدة أو الباركود أمام الكاميرا الخلفية. تحقق من إذن المتصفح واتصال HTTPS.")}</p><form className="scanner-manual" onSubmit={e=>{e.preventDefault();if(manualCode.trim())void callbackRef.current(manualCode.trim())}}><label>{tr(lang,"Ou saisir le code / tag équipement","Or enter an equipment code / tag","أو أدخل رمز / معرف المعدة")}<input autoFocus value={manualCode} onChange={e=>setManualCode(e.target.value)} placeholder={tr(lang,"Tag équipement, QR ou code-barres","Equipment tag, QR or barcode","معرف المعدة أو QR أو الباركود")}/></label><button className="primary-btn" type="submit" disabled={!manualCode.trim()}>{tr(lang,"Ouvrir / rechercher","Open / search","فتح / بحث")}</button></form><div className="modal-actions"><button className="secondary-btn" onClick={onClose}>{tr(lang,"Fermer","Close","إغلاق")}</button></div></section></div></ModalPortal>;
}
