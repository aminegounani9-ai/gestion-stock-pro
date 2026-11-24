import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const respond = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return respond({ error: "Method not allowed" }, 405);
  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SECRET_KEY");
  if (!url || !anonKey || !serviceKey) return respond({ error: "Configuration serveur incomplète." }, 500);
  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return respond({ error: "Authentification requise." }, 401);
  const callerClient = createClient(url, anonKey, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false, autoRefreshToken: false } });
  const adminClient = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  try {
    const { data: authData, error: authError } = await callerClient.auth.getUser();
    if (authError || !authData.user) return respond({ error: "Session invalide ou expirée." }, 401);
    const caller = authData.user;
    const body = await req.json();
    const companyId = String(body.company_id ?? "");
    const userId = String(body.user_id ?? "");
    const fullName = String(body.full_name ?? "").trim();
    const jobTitle = String(body.job_title ?? "").trim();
    const role = String(body.role ?? "");
    const hasReportingUpdate = Object.prototype.hasOwnProperty.call(body, "reports_to_user_id");
    const reportsToUserId = body.reports_to_user_id ? String(body.reports_to_user_id) : null;
    const password = typeof body.password === "string" ? body.password : "";
    if (!companyId || !userId || !fullName || fullName.length > 160 || jobTitle.length > 160) {
      return respond({ error: "Nom, fonction ou utilisateur invalide." }, 400);
    }
    if (caller.id === userId) return respond({ error: "Vous ne pouvez pas modifier votre propre compte depuis cette fenêtre." }, 403);
    const { data: callerMember, error: callerError } = await adminClient.from("company_members")
      .select("role,is_active").eq("company_id", companyId).eq("user_id", caller.id).maybeSingle();
    if (callerError) throw callerError;
    if (!callerMember?.is_active) return respond({ error: "Accès à l'entreprise refusé." }, 403);
    const isAdmin = ["owner", "admin"].includes(callerMember.role);
    if (password && (!isAdmin || password.length < 8 || password.length > 128)) {
      return respond({ error: !isAdmin ? "Seuls les administrateurs peuvent réinitialiser le mot de passe." : "Le mot de passe doit contenir entre 8 et 128 caractères." }, 403);
    }
    const { data: target, error: targetError } = await adminClient.from("company_members")
      .select("role,is_active").eq("company_id", companyId).eq("user_id", userId).maybeSingle();
    if (targetError) throw targetError;
    if (!target?.is_active || target.role === "owner") return respond({ error: "Ce compte ne peut pas être modifié." }, 403);
    const manageableByManager = ["supervisor", "shift_leader", "project_responsible", "warehouse", "technician", "viewer", "staff"];
    const manageableBySupervisor = ["shift_leader", "technician", "viewer", "staff"];
    if (!isAdmin) {
      const permitted = callerMember.role === "manager" ? manageableByManager :
        callerMember.role === "supervisor" ? manageableBySupervisor : [];
      if (!permitted.includes(target.role) || !permitted.includes(role)) {
        return respond({ error: "Votre rôle ne permet pas de modifier ce collaborateur ou de lui attribuer ce rôle." }, 403);
      }
      const { data: scopes, error: scopeError } = await adminClient.from("user_scope_assignments")
        .select("scope_type,scope_id").eq("company_id", companyId).eq("user_id", caller.id).eq("can_view", true);
      if (scopeError) throw scopeError;
      const { data: targetScopes, error: targetScopeError } = await adminClient.from("user_scope_assignments")
        .select("scope_type,scope_id").eq("company_id", companyId).eq("user_id", userId);
      if (targetScopeError) throw targetScopeError;
      const callerKeys = new Set((scopes ?? []).map((x:any)=>x.scope_type+":"+x.scope_id));
      if (!(targetScopes ?? []).some((x:any)=>callerKeys.has(x.scope_type+":"+x.scope_id))) {
        return respond({ error: "Ce collaborateur est hors de votre périmètre." }, 403);
      }
    }
    if (hasReportingUpdate) {
      if (!isAdmin) return respond({ error: "Seuls les administrateurs peuvent modifier le responsable direct." }, 403);
      if (reportsToUserId === userId) return respond({ error: "Un utilisateur ne peut pas être son propre responsable." }, 400);
      if (reportsToUserId) {
        const { data: parent, error: parentError } = await adminClient.from("company_members")
          .select("role,is_active").eq("company_id", companyId).eq("user_id", reportsToUserId).maybeSingle();
        if (parentError) throw parentError;
        if (!parent?.is_active) return respond({ error: "Le responsable sélectionné n'est pas un membre actif de cette entreprise." }, 400);
        const rank: Record<string, number> = { owner: 7, admin: 7, director: 6, manager: 5, supervisor: 4, shift_leader: 3, technician: 2, warehouse: 1, viewer: 1, staff: 1, project_responsible: 1 };
        if ((rank[parent.role] ?? 0) <= (rank[role] ?? 0)) return respond({ error: "Le responsable direct doit avoir un niveau hiérarchique supérieur." }, 400);
      }
    }
    const { data: targetAuth, error: targetAuthError } = await adminClient.auth.admin.getUserById(userId);
    if (targetAuthError) throw targetAuthError;
    const authUpdate: Record<string, unknown> = {
      user_metadata: { ...(targetAuth.user?.user_metadata ?? {}), full_name: fullName, job_title: jobTitle },
    };
    if (password) authUpdate.password = password;
    const { error: authUpdateError } = await adminClient.auth.admin.updateUserById(userId, authUpdate);
    if (authUpdateError) throw authUpdateError;
    const memberUpdate: Record<string, unknown> = { role };
    if (hasReportingUpdate) memberUpdate.reports_to_user_id = reportsToUserId;
    const { error: roleError } = await adminClient.from("company_members").update(memberUpdate).eq("company_id", companyId).eq("user_id", userId);
    if (roleError) throw roleError;
    const { error: jobError } = await adminClient.from("user_scope_assignments").update({ job_title: jobTitle || null })
      .eq("company_id", companyId).eq("user_id", userId);
    if (jobError) throw jobError;
    return respond({ success: true, user_id: userId });
  } catch (error) {
    console.error("update-team-user failed:", error);
    return respond({ error: error instanceof Error ? error.message : "Erreur interne." }, 400);
  }
});