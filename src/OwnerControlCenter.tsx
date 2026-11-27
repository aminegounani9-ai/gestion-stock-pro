import { useCallback, useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import {
  Activity, AlertTriangle, CalendarDays, ChevronLeft, ChevronRight, Database,
  Download, FileSpreadsheet, FileText, RefreshCw, ShieldCheck, Trash2, Bug, LockKeyhole, Rocket, HardDrive, Server, Users, PackageOpen, UserCheck, UserX
} from "lucide-react";
import { supabase } from "./lib/supabase";
import "./OwnerControlCenter.css";

const OWNER_ID = "710901a9-7967-45ab-8e5a-038da8081ce2";
const PAGE_SIZE = 100;

type Lang = "fr" | "en" | "ar";
type SecurityEvent = { id:string; event_type:string; severity:string; description:string; ip_hash:string|null; created_at:string };
type AppError = { id:string; actor_user_id:string|null; error_type:string; module:string|null; route:string|null; message:string; created_at:string };
type Deployment = { id:string; provider:string; environment:string; commit_sha:string|null; commit_message:string|null; deployment_url:string|null; status:string; created_at:string };
type PlatformMetrics = {
  generated_at: string; database_name: string; database_size_bytes: number; database_size_pretty: string;
  postgres_version: string; public_table_count: number; auth_user_count: number; storage_bucket_count: number;
  storage_object_count: number; storage_size_bytes: number;
  storage_by_bucket: { bucket_id:string; bucket_name:string; public:boolean; file_count:number; size_bytes:number }[];
  largest_tables: { table_name:string; size_bytes:number; size_pretty:string; estimated_rows:number }[];
};
type ManagedAuthUser = {id:string;email:string;full_name:string;created_at:string;last_sign_in_at:string|null;banned_until:string|null;is_disabled:boolean;memberships:{company_id:string;company_name:string;role:string;is_active:boolean}[]};
type AuditLog = {
  id: string;
  company_id: string | null;
  actor_user_id: string;
  event_type: string;
  action: string;
  module: string;
  entity_id: string | null;
  description: string;
  severity: string;
  source: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

const labels = {
  fr: {
    eyebrow: "ADMINISTRATION PRIVÉE", title: "Owner Control Center",
    subtitle: "Surveillance globale et gestion sécurisée des journaux de la plateforme.",
    total: "Événements enregistrés", shown: "Événements affichés", latest: "Dernière activité",
    filters: "Filtres des journaux", from: "Du", to: "Au", type: "Type d'événement",
    all: "Tous les événements", data: "Modifications de données", search: "Rechercher dans les modules et descriptions…",
    refresh: "Actualiser", export: "Exporter les données", csv: "Exporter CSV", excel: "Exporter Excel",
    json: "Exporter JSON", exportHint: "L'export reprend tous les résultats correspondant aux filtres, pas seulement la page affichée.",
    exportAll: "Export complet", exportAllCSV: "Tout CSV", exportAllExcel: "Tout Excel", exportAllJSON: "Tout JSON",
    history: "Historique des activités", date: "Date", company: "ID entreprise", actor: "ID utilisateur",
    module: "Module / table", action: "Action", description: "Description", severity: "Niveau",
    noLogs: "Aucun événement enregistré pour le moment.", noAccess: "Accès réservé au propriétaire de la plateforme.",
    loading: "Chargement…", previous: "Précédent", next: "Suivant", page: "Page",
    maintenance: "Nettoyage des journaux", cleanupHint: "Ces actions suppriment uniquement les journaux de surveillance (audit, sécurité, erreurs et déploiements). Les ventes, articles, stocks et données métier ne sont jamais touchés.",
    older: "Supprimer les journaux de plus de 90 jours", filtered: "Supprimer les journaux filtrés (audit)",
    allLogs: "Supprimer tous les journaux", danger: "Action irréversible",
    filterRequired: "Ajoute au moins un filtre (date ou type) avant de supprimer les résultats filtrés.",
    confirm90: "Tape PURGER 90 JOURS pour confirmer.", confirmFiltered: "Tape SUPPRIMER FILTRES pour confirmer.",
    confirmAll: "Tape SUPPRIMER TOUT pour effacer tous les journaux de surveillance.",
    done: "Nettoyage terminé.", exportDone: "Export téléchargé.", error: "Une erreur est survenue : ",
    ownerOnly: "Visible uniquement par le propriétaire de la plateforme.",
    retention: "Conseil : exporte une archive avant de supprimer les anciens journaux.",
    securityTitle: "Centre de sécurité", securityDesc: "Échecs de connexion et événements de sécurité récents.",
    errorsTitle: "Erreurs de l’application", errorsDesc: "Erreurs API Supabase, JavaScript, promesses non gérées et erreurs de rendu React.",
    deploymentsTitle: "Historique des déploiements", deploymentsDesc: "Résultats du build GitHub Actions et déploiements Cloudflare Pages.",
    eventTypeLabel: "Événement", ipLabel: "IP anonymisée", messageLabel: "Détail", routeLabel: "Page",
    commitLabel: "Commit", deploymentLabel: "Déploiement", statusLabel: "Statut", noTelemetry: "Aucun événement pour le moment.",
    provider: "Fournisseur",
    infraTitle: "État de l'infrastructure Supabase", infraDesc: "Mesures en direct de la base, de l'authentification et du stockage.",
    dbStatus: "Connexion base de données", dbSize: "Taille base de données", pgVersion: "Version PostgreSQL",
    tableCount: "Tables publiques", authUsers: "Utilisateurs Auth", storageTitle: "Stockage fichiers",
    storageUsed: "Espace utilisé", storageFiles: "Fichiers", bucketCount: "Buckets", bucketName: "Bucket",
    publicBucket: "Public", privateBucket: "Privé", largestTables: "Tables les plus volumineuses",
    estimatedRows: "Lignes estimées", metricsUnavailable: "Mesures indisponibles",
    quotaNote: "Les quotas du forfait et la facturation ne sont pas exposés par les statistiques SQL. Les valeurs ci-dessous sont les volumes réellement mesurés dans la base.",
    lastChecked: "Dernière vérification", deploymentSetup: "Obligatoire : ajoute le même GSP_MONITOR_WEBHOOK_SECRET dans Supabase > Edge Functions > Secrets et GitHub > Settings > Secrets and variables > Actions. Optionnel : CLOUDFLARE_API_TOKEN (Cloudflare Pages Read) pour suivre le statut Cloudflare exact."
  },
  en: {
    eyebrow: "PRIVATE ADMINISTRATION", title: "Owner Control Center",
    subtitle: "Global monitoring and secure management of platform audit logs.",
    total: "Recorded events", shown: "Events displayed", latest: "Latest activity",
    filters: "Log filters", from: "From", to: "To", type: "Event type",
    all: "All events", data: "Data changes", search: "Search modules and descriptions…",
    refresh: "Refresh", export: "Export data", csv: "Export CSV", excel: "Export Excel",
    json: "Export JSON", exportHint: "Exports all results matching the filters, not only the visible page.",
    exportAll: "Full export", exportAllCSV: "All CSV", exportAllExcel: "All Excel", exportAllJSON: "All JSON",
    history: "Activity history", date: "Date", company: "Company ID", actor: "User ID",
    module: "Module / table", action: "Action", description: "Description", severity: "Level",
    noLogs: "No events recorded yet.", noAccess: "Access restricted to the platform owner.",
    loading: "Loading…", previous: "Previous", next: "Next", page: "Page",
    maintenance: "Log cleanup", cleanupHint: "These actions delete only monitoring records (audit, security, errors and deployments). Sales, products, stock and all business data remain untouched.",
    older: "Delete logs older than 90 days", filtered: "Delete filtered audit logs",
    allLogs: "Delete all logs", danger: "Irreversible action",
    filterRequired: "Add at least one date or event-type filter before deleting filtered results.",
    confirm90: "Type PURGE 90 DAYS to confirm.", confirmFiltered: "Type DELETE FILTERS to confirm.",
    confirmAll: "Type DELETE ALL to erase all monitoring logs.",
    done: "Cleanup completed.", exportDone: "Export downloaded.", error: "An error occurred: ",
    ownerOnly: "Visible only to the platform owner.",
    retention: "Tip: export an archive before deleting older logs.",
    securityTitle: "Security Center", securityDesc: "Recent failed sign-ins and security events.",
    errorsTitle: "Application Errors", errorsDesc: "Supabase API errors, JavaScript errors, unhandled promises and React rendering failures.",
    deploymentsTitle: "Deployment History", deploymentsDesc: "GitHub Actions build results and Cloudflare Pages production deployments.",
    eventTypeLabel: "Event", ipLabel: "Anonymized IP", messageLabel: "Details", routeLabel: "Page",
    commitLabel: "Commit", deploymentLabel: "Deployment", statusLabel: "Status", noTelemetry: "No events recorded yet.",
    provider: "Provider",
    infraTitle: "Supabase infrastructure status", infraDesc: "Live measurements for database, authentication and file storage.",
    dbStatus: "Database connection", dbSize: "Database size", pgVersion: "PostgreSQL version",
    tableCount: "Public tables", authUsers: "Auth users", storageTitle: "File storage",
    storageUsed: "Storage used", storageFiles: "Files", bucketCount: "Buckets", bucketName: "Bucket",
    publicBucket: "Public", privateBucket: "Private", largestTables: "Largest tables",
    estimatedRows: "Estimated rows", metricsUnavailable: "Metrics unavailable",
    quotaNote: "Plan quotas and billing limits are not exposed through SQL metrics. Values below are measured usage in the database.",
    lastChecked: "Last checked", deploymentSetup: "Required: set the same GSP_MONITOR_WEBHOOK_SECRET in Supabase > Edge Functions > Secrets and GitHub > Settings > Secrets and variables > Actions. Optional: CLOUDFLARE_API_TOKEN (Cloudflare Pages Read) for exact Cloudflare status."
  },
  ar: {
    eyebrow: "إدارة خاصة", title: "مركز تحكم مالك المنصة",
    subtitle: "مراقبة شاملة وإدارة آمنة لسجلات نشاط المنصة.",
    total: "إجمالي الأحداث", shown: "الأحداث المعروضة", latest: "آخر نشاط",
    filters: "تصفية السجلات", from: "من", to: "إلى", type: "نوع الحدث",
    all: "كل الأحداث", data: "تغييرات البيانات", search: "ابحث في الوحدات والوصف…",
    refresh: "تحديث", export: "تصدير البيانات", csv: "تصدير CSV", excel: "تصدير Excel",
    json: "تصدير JSON", exportHint: "التصدير يشمل كل النتائج المطابقة للفلاتر وليس الصفحة الحالية فقط.",
    exportAll: "تصدير شامل", exportAllCSV: "الكل CSV", exportAllExcel: "الكل Excel", exportAllJSON: "الكل JSON",
    history: "سجل النشاط", date: "التاريخ", company: "معرف الشركة", actor: "معرف المستخدم",
    module: "الوحدة / الجدول", action: "العملية", description: "الوصف", severity: "المستوى",
    noLogs: "لا توجد أحداث مسجلة حاليا.", noAccess: "الدخول مخصص لمالك المنصة فقط.",
    loading: "جار التحميل…", previous: "السابق", next: "التالي", page: "الصفحة",
    maintenance: "تنظيف السجلات", cleanupHint: "هذه العمليات تحذف سجلات المراقبة فقط (التدقيق والأمان والأخطاء والنشر)، ولا تمس المبيعات أو المنتجات أو المخزون أو بيانات الشركات.",
    older: "حذف السجلات الأقدم من 90 يوما", filtered: "حذف سجلات التدقيق المصفاة",
    allLogs: "حذف جميع السجلات", danger: "عملية لا يمكن التراجع عنها",
    filterRequired: "أضف فلتر تاريخ أو نوع حدث قبل حذف النتائج المصفاة.",
    confirm90: "اكتب PURGE 90 DAYS للتأكيد.", confirmFiltered: "اكتب DELETE FILTERS للتأكيد.",
    confirmAll: "اكتب DELETE ALL لحذف جميع سجلات المراقبة.",
    done: "اكتمل التنظيف.", exportDone: "تم تنزيل الملف.", error: "حدث خطأ: ",
    ownerOnly: "مرئي لمالك المنصة فقط.",
    retention: "نصيحة: صدّر نسخة احتياطية قبل حذف السجلات القديمة.",
    securityTitle: "مركز الأمان", securityDesc: "محاولات الدخول الفاشلة وأحداث الأمان الأخيرة.",
    errorsTitle: "أخطاء التطبيق", errorsDesc: "أخطاء واجهة Supabase وJavaScript والوعود غير المعالجة وأخطاء عرض React.",
    deploymentsTitle: "سجل النشر", deploymentsDesc: "نتائج بناء GitHub Actions وعمليات النشر على Cloudflare Pages.",
    eventTypeLabel: "الحدث", ipLabel: "عنوان IP مخفي", messageLabel: "التفاصيل", routeLabel: "الصفحة",
    commitLabel: "Commit", deploymentLabel: "النشر", statusLabel: "الحالة", noTelemetry: "لا توجد أحداث مسجلة حاليا.",
    provider: "المزود",
    infraTitle: "حالة بنية Supabase", infraDesc: "إحصائيات مباشرة لقاعدة البيانات والمستخدمين ومساحة الملفات.",
    dbStatus: "اتصال قاعدة البيانات", dbSize: "حجم قاعدة البيانات", pgVersion: "إصدار PostgreSQL",
    tableCount: "الجداول العامة", authUsers: "مستخدمو Auth", storageTitle: "تخزين الملفات",
    storageUsed: "المساحة المستعملة", storageFiles: "الملفات", bucketCount: "عدد Buckets", bucketName: "Bucket",
    publicBucket: "عام", privateBucket: "خاص", largestTables: "أكبر الجداول",
    estimatedRows: "عدد الصفوف التقديري", metricsUnavailable: "الإحصائيات غير متاحة",
    quotaNote: "حدود الباقة والفوترة لا تظهر عبر SQL. الأرقام أدناه هي الاستعمال الفعلي المقاس داخل قاعدة البيانات.",
    lastChecked: "آخر فحص", deploymentSetup: "ضروري: أضف نفس GSP_MONITOR_WEBHOOK_SECRET في Supabase > Edge Functions > Secrets و GitHub > Settings > Secrets and variables > Actions. اختياري: CLOUDFLARE_API_TOKEN بصلاحية Pages Read لمراقبة حالة Cloudflare بدقة."
  }
};

function formatBytes(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  return `${(value / Math.pow(1024, index)).toFixed(index === 0 ? 0 : 2)} ${units[index]}`;
}

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function OwnerControlCenter({ userId, lang = "fr" }: { userId: string; lang?: Lang }) {
  const t = labels[lang];
  const isOwner = userId === OWNER_ID;
  const [rows, setRows] = useState<AuditLog[]>([]);
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [appErrors, setAppErrors] = useState<AppError[]>([]);
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [platformMetrics, setPlatformMetrics] = useState<PlatformMetrics | null>(null);
  const [managedUsers, setManagedUsers] = useState<ManagedAuthUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [userActionBusy, setUserActionBusy] = useState("");

  const [metricsError, setMetricsError] = useState("");
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [eventType, setEventType] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadManagedUsers = useCallback(async () => {
    if (!isOwner || !supabase) return;
    setUsersLoading(true);
    try {
      const {data,error} = await supabase.functions.invoke("owner-user-admin",{body:{action:"list"}});
      if(error) throw error;
      if(data?.error) throw new Error(data.error);
      setManagedUsers((data?.users||[]) as ManagedAuthUser[]);
    } catch(e:any) { setError(t.error+(e?.message||"User list unavailable")); }
    finally { setUsersLoading(false); }
  },[isOwner,t.error]);

  async function manageUser(user:ManagedAuthUser,action:"disable"|"enable"|"delete") {
    if(!supabase||!isOwner||user.id===OWNER_ID)return;
    if(action==="disable"&&!window.confirm(t.confirmDisable))return;
    if(action==="enable"&&!window.confirm(t.confirmEnable))return;
    if(action==="delete") {
      const typed=window.prompt(t.deletePrompt);
      if(typed!=="DELETE USER")return;
    }
    setUserActionBusy(user.id);
    setError("");setMessage("");
    try {
      const {data,error}=await supabase.functions.invoke("owner-user-admin",{body:{action,user_id:user.id}});
      if(error) throw error;
      if(data?.error) throw new Error(data.error);
      setMessage(action==="disable"?t.userDisabled:action==="enable"?t.userEnabled:t.userDeleted);
      await loadManagedUsers();
    } catch(e:any) { setError(t.error+(e?.message||"User action failed")); }
    finally { setUserActionBusy(""); }
  }

  const filteredManagedUsers = useMemo(() => {
    const q=userSearch.trim().toLowerCase();
    return managedUsers.filter(u=>!q||[u.email,u.full_name,...u.memberships.map(m=>m.company_name),...u.memberships.map(m=>m.role)].join(" ").toLowerCase().includes(q));
  },[managedUsers,userSearch]);

  const makeQuery = useCallback((count = false) => {
    if (!supabase) throw new Error("Supabase is not configured.");
    let query = supabase.from("platform_audit_logs").select("*", count ? { count: "exact" } : undefined);
    if (startDate) query = query.gte("created_at", new Date(startDate + "T00:00:00").toISOString());
    if (endDate) {
      const end = new Date(endDate + "T00:00:00");
      end.setDate(end.getDate() + 1);
      query = query.lt("created_at", end.toISOString());
    }
    if (eventType !== "all") query = query.eq("event_type", eventType);
    return query;
  }, [startDate, endDate, eventType]);

  const load = useCallback(async () => {
    if (!isOwner || !supabase) return;
    setLoading(true);
    setError("");
    try {
      const { data, count, error: queryError } = await makeQuery(true)
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
      if (queryError) throw queryError;
      setRows((data || []) as AuditLog[]);
      setTotal(count || 0);
      const [securityResult, errorsResult, deploymentsResult, metricsResult] = await Promise.all([
        supabase.from("platform_security_events").select("*").order("created_at", { ascending: false }).limit(30),
        supabase.from("platform_app_errors").select("*").order("created_at", { ascending: false }).limit(30),
        supabase.from("platform_deployments").select("*").order("created_at", { ascending: false }).limit(30),
        supabase.rpc("owner_platform_metrics")
      ]);
      if (securityResult.error) throw securityResult.error;
      if (errorsResult.error) throw errorsResult.error;
      if (deploymentsResult.error) throw deploymentsResult.error;
      setSecurityEvents((securityResult.data || []) as SecurityEvent[]);
      setAppErrors((errorsResult.data || []) as AppError[]);
      setDeployments((deploymentsResult.data || []) as Deployment[]);
      setPlatformMetrics((metricsResult.data || null) as PlatformMetrics | null);
      setMetricsError(metricsResult.error?.message || "");
    } catch (e: any) {
      setError(t.error + (e?.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  }, [isOwner, makeQuery, page, t.error]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { void loadManagedUsers(); }, [loadManagedUsers]);

  const visibleRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(row =>
      [row.module, row.description, row.action, row.company_id || "", row.actor_user_id].join(" ").toLowerCase().includes(q)
    );
  }, [rows, search]);

  const hasFilters = Boolean(startDate || endDate || eventType !== "all");
  const lastActivity = rows[0]?.created_at
    ? new Date(rows[0].created_at).toLocaleString(lang === "ar" ? "ar-DZ" : lang === "en" ? "en-GB" : "fr-FR")
    : "—";

  async function fetchAllForExport(): Promise<AuditLog[]> {
    const result: AuditLog[] = [];
    const batch = 1000;
    for (let offset = 0; ; offset += batch) {
      const { data, error: queryError } = await makeQuery()
        .order("created_at", { ascending: false })
        .range(offset, offset + batch - 1);
      if (queryError) throw queryError;
      const part = (data || []) as AuditLog[];
      result.push(...part);
      if (part.length < batch) break;
    }
    const q = search.trim().toLowerCase();
    return q ? result.filter(row =>
      [row.module, row.description, row.action, row.company_id || "", row.actor_user_id].join(" ").toLowerCase().includes(q)
    ) : result;
  }

  async function exportAllMonitoring(format: "csv" | "xlsx" | "json") {
    if (!supabase) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const tables = [
        ["Audit Logs", "platform_audit_logs"],
        ["Security Events", "platform_security_events"],
        ["Application Errors", "platform_app_errors"],
        ["Deployments", "platform_deployments"]
      ] as const;
      const datasets: Record<string, Record<string, unknown>[]> = {};
      for (const [label, table] of tables) {
        let query = supabase.from(table).select("*").order("created_at", { ascending: false });
        if (startDate) query = query.gte("created_at", new Date(startDate + "T00:00:00").toISOString());
        if (endDate) {
          const end = new Date(endDate + "T00:00:00"); end.setDate(end.getDate() + 1);
          query = query.lt("created_at", end.toISOString());
        }
        const collected: Record<string, unknown>[] = [];
        for (let offset = 0; ; offset += 1000) {
          const { data, error: queryError } = await query.range(offset, offset + 999);
          if (queryError) throw queryError;
          const part = (data || []) as Record<string, unknown>[];
          collected.push(...part);
          if (part.length < 1000) break;
        }
        datasets[label] = collected;
      }
      const date = new Date().toISOString().slice(0, 10);
      if (format === "json") {
        saveBlob(new Blob([JSON.stringify(datasets, null, 2)], { type: "application/json;charset=utf-8" }), "GSP-all-monitoring-" + date + ".json");
      } else if (format === "xlsx") {
        const workbook = XLSX.utils.book_new();
        for (const [label, rows] of Object.entries(datasets)) {
          const normalized = rows.map(row => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, typeof value === "object" && value !== null ? JSON.stringify(value) : value])));
          XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(normalized.length ? normalized : [{ info: "No records" }]), label.slice(0, 31));
        }
        XLSX.writeFile(workbook, "GSP-all-monitoring-" + date + ".xlsx");
      } else {
        const combined = Object.entries(datasets).flatMap(([record_type, rows]) => rows.map(row => ({ record_type, ...row, metadata: row.metadata ? JSON.stringify(row.metadata) : "" })));
        const sheet = XLSX.utils.json_to_sheet(combined);
        saveBlob(new Blob(["\\uFEFF", XLSX.utils.sheet_to_csv(sheet)], { type: "text/csv;charset=utf-8" }), "GSP-all-monitoring-" + date + ".csv");
      }
      const totalRecords = Object.values(datasets).reduce((sum, rows) => sum + rows.length, 0);
      setMessage(t.exportDone + " (" + totalRecords + ")");
    } catch (e: any) {
      setError(t.error + (e?.message || "Export failed"));
    } finally { setBusy(false); }
  }

  async function exportLogs(format: "csv" | "xlsx" | "json") {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const data = await fetchAllForExport();
      if (!data.length) throw new Error("Aucune donnée à exporter.");
      const date = new Date().toISOString().slice(0, 10);
      if (format === "json") {
        saveBlob(new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" }), "GSP-platform-logs-" + date + ".json");
      } else {
        const normalized = data.map(row => ({ ...row, metadata: JSON.stringify(row.metadata || {}) }));
        const sheet = XLSX.utils.json_to_sheet(normalized);
        if (format === "csv") {
          saveBlob(new Blob(["\uFEFF", XLSX.utils.sheet_to_csv(sheet)], { type: "text/csv;charset=utf-8" }), "GSP-platform-logs-" + date + ".csv");
        } else {
          const workbook = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(workbook, sheet, "Platform logs");
          XLSX.writeFile(workbook, "GSP-platform-logs-" + date + ".xlsx");
        }
      }
      setMessage(t.exportDone + " (" + data.length + ")");
    } catch (e: any) {
      setError(t.error + (e?.message || "Export failed"));
    } finally {
      setBusy(false);
    }
  }

  async function deleteOlderThan90Days() {
    const phrase = window.prompt(t.confirm90);
    if (phrase !== "PURGER 90 JOURS" && phrase !== "PURGE 90 DAYS") return;
    if (!supabase) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 90);
      const client = supabase;
      const results = await Promise.all([
        client.from("platform_audit_logs").delete().lt("created_at", cutoff.toISOString()),
        client.from("platform_security_events").delete().lt("created_at", cutoff.toISOString()),
        client.from("platform_app_errors").delete().lt("created_at", cutoff.toISOString()),
        client.from("platform_deployments").delete().lt("created_at", cutoff.toISOString())
      ]);
      const failed = results.find(result => result.error);
      if (failed?.error) throw failed.error;
      setPage(0); setMessage(t.done); await load();
    } catch (e: any) { setError(t.error + (e?.message || "Delete failed")); }
    finally { setBusy(false); }
  }

  async function deleteFiltered() {
    if (!hasFilters) { setError(t.filterRequired); return; }
    const phrase = window.prompt(t.confirmFiltered);
    if (phrase !== "SUPPRIMER FILTRES" && phrase !== "DELETE FILTERS") return;
    if (!supabase) return;
    setBusy(true); setError(""); setMessage("");
    try {
      let query = supabase.from("platform_audit_logs").delete();
      if (startDate) query = query.gte("created_at", new Date(startDate + "T00:00:00").toISOString());
      if (endDate) {
        const end = new Date(endDate + "T00:00:00"); end.setDate(end.getDate() + 1);
        query = query.lt("created_at", end.toISOString());
      }
      if (eventType !== "all") query = query.eq("event_type", eventType);
      const { error: deleteError } = await query;
      if (deleteError) throw deleteError;
      setPage(0); setMessage(t.done); await load();
    } catch (e: any) { setError(t.error + (e?.message || "Delete failed")); }
    finally { setBusy(false); }
  }

  async function deleteAll() {
    const phrase = window.prompt(t.confirmAll);
    if (phrase !== "SUPPRIMER TOUT" && phrase !== "DELETE ALL") return;
    if (!supabase) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const client = supabase;
      const results = await Promise.all([
        client.from("platform_audit_logs").delete().gte("created_at", "1970-01-01T00:00:00.000Z"),
        client.from("platform_security_events").delete().gte("created_at", "1970-01-01T00:00:00.000Z"),
        client.from("platform_app_errors").delete().gte("created_at", "1970-01-01T00:00:00.000Z"),
        client.from("platform_deployments").delete().gte("created_at", "1970-01-01T00:00:00.000Z")
      ]);
      const failed = results.find(result => result.error);
      if (failed?.error) throw failed.error;
      setPage(0); setMessage(t.done); await load();
    } catch (e: any) { setError(t.error + (e?.message || "Delete failed")); }
    finally { setBusy(false); }
  }

  if (!isOwner) return <section className="owner-denied"><ShieldCheck size={30}/><h2>{t.noAccess}</h2></section>;

  return <div className="owner-center" dir={lang === "ar" ? "rtl" : "ltr"}>
    <div className="owner-hero">
      <div className="owner-hero-icon"><ShieldCheck size={25}/></div>
      <div><span className="owner-eyebrow">{t.eyebrow}</span><h1>{t.title}</h1><p>{t.subtitle}</p><small><ShieldCheck size={13}/> {t.ownerOnly}</small></div>
      <button className="owner-refresh" type="button" onClick={() => void load()} disabled={loading || busy}><RefreshCw size={16}/>{t.refresh}</button>
    </div>

    <div className="owner-stats">
      <article><span><Database size={16}/>{t.total}</span><strong>{total.toLocaleString()}</strong></article>
      <article><span><Activity size={16}/>{t.shown}</span><strong>{visibleRows.length.toLocaleString()}</strong></article>
      <article><span><CalendarDays size={16}/>{t.latest}</span><strong className="owner-latest">{lastActivity}</strong></article>
    </div>

    <section className="owner-card owner-infra">
      <div className="owner-card-head"><div><h2><Server size={18}/> {t.infraTitle}</h2><p>{t.infraDesc}</p></div><span className={"owner-health-pill " + (platformMetrics ? "ok" : "down")}>{platformMetrics ? "● Connected" : "● Offline"}</span></div>
      {platformMetrics ? <>
        <div className="owner-infra-grid">
          <article><span><Database size={15}/>{t.dbSize}</span><strong>{platformMetrics.database_size_pretty}</strong><small>{platformMetrics.database_name}</small></article>
          <article><span><Server size={15}/>{t.pgVersion}</span><strong>{platformMetrics.postgres_version}</strong><small>{t.tableCount}: {platformMetrics.public_table_count}</small></article>
          <article><span><Users size={15}/>{t.authUsers}</span><strong>{platformMetrics.auth_user_count.toLocaleString()}</strong><small>Supabase Auth</small></article>
          <article><span><HardDrive size={15}/>{t.storageUsed}</span><strong>{formatBytes(platformMetrics.storage_size_bytes)}</strong><small>{platformMetrics.storage_object_count.toLocaleString()} {t.storageFiles} · {platformMetrics.storage_bucket_count} {t.bucketCount}</small></article>
        </div>
        <div className="owner-infra-columns">
          <div><h3><PackageOpen size={15}/> {t.storageTitle}</h3><div className="owner-table-wrap"><table className="owner-table owner-mini-table"><thead><tr><th>{t.bucketName}</th><th>{t.storageFiles}</th><th>{t.storageUsed}</th><th>Access</th></tr></thead><tbody>
            {platformMetrics.storage_by_bucket?.length ? platformMetrics.storage_by_bucket.map(b=><tr key={b.bucket_id}><td>{b.bucket_name}</td><td>{b.file_count}</td><td>{formatBytes(b.size_bytes)}</td><td>{b.public ? t.publicBucket : t.privateBucket}</td></tr>) : <tr><td colSpan={4} className="owner-empty">—</td></tr>}
          </tbody></table></div></div>
          <div><h3><Database size={15}/> {t.largestTables}</h3><div className="owner-table-wrap"><table className="owner-table owner-mini-table"><thead><tr><th>{t.module}</th><th>{t.dbSize}</th><th>{t.estimatedRows}</th></tr></thead><tbody>
            {platformMetrics.largest_tables?.length ? platformMetrics.largest_tables.map(row=><tr key={row.table_name}><td>{row.table_name}</td><td>{row.size_pretty}</td><td>{Number(row.estimated_rows || 0).toLocaleString()}</td></tr>) : <tr><td colSpan={3} className="owner-empty">—</td></tr>}
          </tbody></table></div></div>
        </div>
        <div className="owner-infra-foot"><span>{t.quotaNote}</span><small>{t.lastChecked}: {new Date(platformMetrics.generated_at).toLocaleString(lang === "ar" ? "ar-DZ" : lang === "en" ? "en-GB" : "fr-FR")}</small></div>
      </> : <div className="owner-alert error"><AlertTriangle size={16}/>{t.metricsUnavailable}{metricsError ? " · " + metricsError : ""}</div>}
    </section>

    <section className="owner-card owner-users-card">
      <div className="owner-card-head"><div><h2><Users size={18}/> {t.usersTitle}</h2><p>{t.usersDesc}</p></div><button className="owner-refresh" type="button" onClick={()=>void loadManagedUsers()} disabled={usersLoading||!!userActionBusy}><RefreshCw size={15}/>{t.refresh}</button></div>
      <div className="owner-user-toolbar"><input value={userSearch} onChange={e=>setUserSearch(e.target.value)} placeholder={t.usersSearch}/><span>{filteredManagedUsers.length} / {managedUsers.length}</span></div>
      <div className="owner-table-wrap"><table className="owner-table"><thead><tr><th>{t.userEmail}</th><th>{t.userCompanies}</th><th>{t.userLastLogin}</th><th>{t.userStatus}</th><th>{t.userActions}</th></tr></thead><tbody>
       {usersLoading&&!managedUsers.length?<tr><td colSpan={5} className="owner-empty">{t.loading}</td></tr>:filteredManagedUsers.length?filteredManagedUsers.map(u=>{const protectedUser=u.id===OWNER_ID||u.memberships.some(m=>m.role==="owner");return <tr key={u.id}><td><b>{u.full_name||u.email||"—"}</b><small className="owner-user-email">{u.email}</small><small className="owner-id">{u.id}</small></td><td>{u.memberships.length?u.memberships.map(m=><div className="owner-user-membership" key={m.company_id}><b>{m.company_name}</b><small>{m.role} · {m.is_active?t.active:t.disabled}</small></div>):"—"}</td><td>{u.last_sign_in_at?new Date(u.last_sign_in_at).toLocaleString(lang==="ar"?"ar-DZ":lang==="en"?"en-GB":"fr-FR"):"—"}</td><td><span className={"owner-user-state "+(u.is_disabled?"is-disabled":"is-active")}>{u.is_disabled?t.disabled:t.active}</span></td><td><div className="owner-user-actions">{!protectedUser&&(u.is_disabled?<button type="button" onClick={()=>void manageUser(u,"enable")} disabled={!!userActionBusy}><UserCheck size={14}/>{t.enable}</button>:<button type="button" onClick={()=>void manageUser(u,"disable")} disabled={!!userActionBusy}><UserX size={14}/>{t.disable}</button>)}{!protectedUser&&<button type="button" className="is-danger" onClick={()=>void manageUser(u,"delete")} disabled={!!userActionBusy}><Trash2 size={14}/>{t.deleteUser}</button>}{userActionBusy===u.id&&<small>{t.loading}</small>}</div></td></tr>}):<tr><td colSpan={5} className="owner-empty">{t.noUsers}</td></tr>}
      </tbody></table></div>
      <p className="owner-setup-note">{t.protectedOwner}</p>
    </section>

    <section className="owner-card">
      <div className="owner-card-head"><div><h2>{t.filters}</h2><p>{t.exportHint}</p></div><FileText size={20}/></div>
      <div className="owner-filters">
        <label>{t.from}<input type="date" value={startDate} onChange={e => { setStartDate(e.target.value); setPage(0); }}/></label>
        <label>{t.to}<input type="date" value={endDate} min={startDate || undefined} onChange={e => { setEndDate(e.target.value); setPage(0); }}/></label>
        <label>{t.type}<select value={eventType} onChange={e => { setEventType(e.target.value); setPage(0); }}><option value="all">{t.all}</option><option value="data_change">{t.data}</option></select></label>
        <label className="owner-search">{t.search}<input value={search} onChange={e => setSearch(e.target.value)} placeholder={t.search}/></label>
      </div>
      <div className="owner-export-row">
        <b>{t.export}</b>
        <button type="button" onClick={() => void exportLogs("csv")} disabled={busy}><Download size={15}/>{t.csv}</button>
        <button type="button" onClick={() => void exportLogs("xlsx")} disabled={busy}><FileSpreadsheet size={15}/>{t.excel}</button>
        <button type="button" onClick={() => void exportLogs("json")} disabled={busy}><FileText size={15}/>{t.json}</button>
        <b className="owner-export-all-label">{t.exportAll}</b>
        <button type="button" className="owner-export-all" onClick={() => void exportAllMonitoring("csv")} disabled={busy}>{t.exportAllCSV}</button>
        <button type="button" className="owner-export-all" onClick={() => void exportAllMonitoring("xlsx")} disabled={busy}><Database size={15}/>{t.exportAllExcel}</button>
        <button type="button" className="owner-export-all" onClick={() => void exportAllMonitoring("json")} disabled={busy}>{t.exportAllJSON}</button>
      </div>
    </section>

    <section className="owner-card">
      <div className="owner-card-head"><div><h2>{t.history}</h2><p>{total.toLocaleString()} · {PAGE_SIZE} / page</p></div><Activity size={20}/></div>
      {error && <div className="owner-alert error"><AlertTriangle size={16}/>{error}</div>}
      {message && <div className="owner-alert success">{message}</div>}
      <div className="owner-table-wrap">
        <table className="owner-table"><thead><tr><th>{t.date}</th><th>{t.company}</th><th>{t.actor}</th><th>{t.module}</th><th>{t.action}</th><th>{t.description}</th><th>{t.severity}</th></tr></thead>
          <tbody>{loading ? <tr><td colSpan={7} className="owner-empty">{t.loading}</td></tr> : visibleRows.length ? visibleRows.map(row => <tr key={row.id}>
            <td>{new Date(row.created_at).toLocaleString(lang === "ar" ? "ar-DZ" : lang === "en" ? "en-GB" : "fr-FR")}</td>
            <td className="owner-id">{row.company_id || "—"}</td><td className="owner-id">{row.actor_user_id}</td>
            <td><b>{row.module}</b></td><td><span className={"owner-action " + row.action}>{row.action}</span></td>
            <td>{row.description}</td><td><span className="owner-severity">{row.severity}</span></td>
          </tr>) : <tr><td colSpan={7} className="owner-empty">{t.noLogs}</td></tr>}</tbody>
        </table>
      </div>
      <div className="owner-pagination"><span>{t.page} {page + 1} / {Math.max(1, Math.ceil(total / PAGE_SIZE))}</span><div>
        <button type="button" disabled={page === 0 || loading} onClick={() => setPage(p => Math.max(0, p - 1))}><ChevronLeft size={16}/>{t.previous}</button>
        <button type="button" disabled={(page + 1) * PAGE_SIZE >= total || loading} onClick={() => setPage(p => p + 1)}>{t.next}<ChevronRight size={16}/></button>
      </div></div>
    </section>

    <section className="owner-card">
      <div className="owner-card-head"><div><h2><LockKeyhole size={17}/> {t.securityTitle}</h2><p>{t.securityDesc}</p></div><span className="owner-count">{securityEvents.length}</span></div>
      <div className="owner-table-wrap"><table className="owner-table"><thead><tr><th>{t.date}</th><th>{t.eventTypeLabel}</th><th>{t.description}</th><th>{t.ipLabel}</th><th>{t.severity}</th></tr></thead><tbody>
        {securityEvents.length ? securityEvents.map(row=><tr key={row.id}><td>{new Date(row.created_at).toLocaleString(lang==="ar"?"ar-DZ":lang==="en"?"en-GB":"fr-FR")}</td><td><b>{row.event_type}</b></td><td>{row.description}</td><td className="owner-id">{row.ip_hash || "—"}</td><td><span className="owner-severity">{row.severity}</span></td></tr>) : <tr><td colSpan={5} className="owner-empty">{t.noTelemetry}</td></tr>}
      </tbody></table></div>
    </section>

    <section className="owner-card">
      <div className="owner-card-head"><div><h2><Bug size={17}/> {t.errorsTitle}</h2><p>{t.errorsDesc}</p></div><span className="owner-count">{appErrors.length}</span></div>
      <div className="owner-table-wrap"><table className="owner-table"><thead><tr><th>{t.date}</th><th>{t.eventTypeLabel}</th><th>{t.module}</th><th>{t.routeLabel}</th><th>{t.messageLabel}</th><th>{t.actor}</th></tr></thead><tbody>
        {appErrors.length ? appErrors.map(row=><tr key={row.id}><td>{new Date(row.created_at).toLocaleString(lang==="ar"?"ar-DZ":lang==="en"?"en-GB":"fr-FR")}</td><td><b>{row.error_type}</b></td><td>{row.module || "—"}</td><td>{row.route || "—"}</td><td>{row.message}</td><td className="owner-id">{row.actor_user_id || "—"}</td></tr>) : <tr><td colSpan={6} className="owner-empty">{t.noTelemetry}</td></tr>}
      </tbody></table></div>
    </section>

    <section className="owner-card">
      <div className="owner-card-head"><div><h2><Rocket size={17}/> {t.deploymentsTitle}</h2><p>{t.deploymentsDesc}</p></div><span className="owner-count">{deployments.length}</span></div>
      <div className="owner-table-wrap"><table className="owner-table"><thead><tr><th>{t.date}</th><th>{t.provider}</th><th>{t.deploymentLabel}</th><th>{t.commitLabel}</th><th>{t.statusLabel}</th><th>URL</th></tr></thead><tbody>
        {deployments.length ? deployments.map(row=><tr key={row.id}><td>{new Date(row.created_at).toLocaleString(lang==="ar"?"ar-DZ":lang==="en"?"en-GB":"fr-FR")}</td><td>{row.provider} · {row.environment}</td><td className="owner-id">{row.id}</td><td title={row.commit_message || ""} className="owner-id">{row.commit_sha?.slice(0,12) || "—"}</td><td><span className={"owner-severity " + row.status}>{row.status}</span></td><td>{row.deployment_url ? <a href={row.deployment_url} target="_blank" rel="noreferrer">Open</a> : "—"}</td></tr>) : <tr><td colSpan={6} className="owner-empty">{t.noTelemetry}</td></tr>}
      </tbody></table></div>
      <p className="owner-setup-note">{t.deploymentSetup}</p>
    </section>

    <section className="owner-card owner-cleanup">
      <div className="owner-card-head"><div><h2>{t.maintenance}</h2><p>{t.cleanupHint}</p></div><Trash2 size={20}/></div>
      <div className="owner-warning"><AlertTriangle size={17}/><span><b>{t.danger}.</b> {t.retention}</span></div>
      <div className="owner-cleanup-actions">
        <button type="button" className="owner-delete-muted" disabled={busy || loading} onClick={() => void deleteOlderThan90Days()}><Trash2 size={15}/>{t.older}</button>
        <button type="button" className="owner-delete-muted" disabled={busy || loading || !hasFilters} onClick={() => void deleteFiltered()}><Trash2 size={15}/>{t.filtered}</button>
        <button type="button" className="owner-delete-danger" disabled={busy || loading || total === 0} onClick={() => void deleteAll()}><Trash2 size={15}/>{t.allLogs}</button>
      </div>
    </section>
  </div>;
}
