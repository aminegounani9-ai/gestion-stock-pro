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
    if (authError || !authData.user) return respond({ error: "Session invalide ou expirée. Reconnectez-vous." }, 401);
    const caller = authData.user;
    const body = await req.json();
    const companyId = String(body.company_id ?? "");
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const fullName = String(body.full_name ?? "").trim();
    const jobTitle = String(body.job_title ?? "").trim();
    const role = String(body.role ?? "");
    const scopeType = String(body.scope_type ?? "");
    const scopeId = String(body.scope_id ?? "");

    if (!companyId || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 8 || !fullName || !scopeId) {
      return respond({ error: "Données invalides : vérifiez le nom, l'e-mail, le mot de passe et l'affectation." }, 400);
    }
    const allowedRoles = ["admin", "director", "manager", "supervisor", "project_responsible", "warehouse", "technician", "viewer", "staff"];
    const allowedScopes: Record<string, string> = {
      site: "org_sites", unit: "org_units", service: "org_services",
      department: "org_departments", warehouse: "warehouses", equipment: "org_equipment",
    };
    if (!allowedRoles.includes(role) || !allowedScopes[scopeType]) return respond({ error: "Rôle ou type d'affectation non autorisé." }, 400);

    const { data: membership, error: membershipError } = await adminClient.from("company_members")
      .select("role,is_active").eq("company_id", companyId).eq("user_id", caller.id).maybeSingle();
    if (membershipError) throw membershipError;
    if (!membership?.is_active) return respond({ error: "Vous n'avez pas accès à cette entreprise." }, 403);
    const isAdmin = ["owner", "admin"].includes(membership.role);
    const { data: scope, error: scopeError } = await adminClient.from(allowedScopes[scopeType])
      .select("*").eq("id", scopeId).eq("company_id", companyId).eq("is_active", true).maybeSingle();
    if (scopeError) throw scopeError;
    if (!scope) return respond({ error: "L'affectation sélectionnée n'existe pas ou n'est pas active." }, 400);

    if (!isAdmin) {
      const permitted = membership.role === "manager" ? ["project_responsible", "warehouse", "technician", "viewer", "staff"]
        : membership.role === "supervisor" ? ["technician", "viewer", "staff"] : [];
      if (!permitted.includes(role)) return respond({ error: "Votre rôle ne permet pas de créer ce type de compte." }, 403);
      const { data: scopes, error: scopesError } = await adminClient.from("user_scope_assignments")
        .select("scope_type,scope_id").eq("company_id", companyId).eq("user_id", caller.id).eq("can_view", true);
      if (scopesError) throw scopesError;
      const assignments = scopes ?? [];
      const direct = assignments.some((s: any) => s.scope_type === scopeType && s.scope_id === scopeId);
      const parentDepartments = assignments.filter((s: any) => s.scope_type === "department").map((s: any) => s.scope_id);
      const { data: departmentRows, error: departmentError } = parentDepartments.length
        ? await adminClient.from("org_departments").select("id,unit_id,service_id,site_id").eq("company_id", companyId).in("id", parentDepartments)
        : { data: [], error: null };
      if (departmentError) throw departmentError;
      const departmentAllowsUnit = scopeType === "unit" && (departmentRows ?? []).some((d: any) =>
        d.unit_id === scopeId || (!!d.service_id && d.service_id === scope.service_id)
      );
      const parentAllowed = assignments.some((s: any) =>
        (s.scope_type === "site" && scope.site_id === s.scope_id) ||
        (s.scope_type === "service" && scope.service_id === s.scope_id) ||
        (s.scope_type === "unit" && (scope.unit_id === s.scope_id || (scopeType === "service" && scope.unit_id === s.scope_id))) ||
        (s.scope_type === "department" && ["equipment","warehouse"].includes(scopeType) && scope.department_id === s.scope_id) ||
        (s.scope_type === "equipment" && scopeType === "warehouse" && scope.equipment_id === s.scope_id)
      ) || departmentAllowsUnit;
      if (!direct && !parentAllowed) return respond({ error: "Vous ne pouvez créer un compte que dans votre périmètre autorisé." }, 403);
    }

    // The auth.users guard trigger only permits users with a pending invitation.
    // Create/update that invitation first; the AFTER INSERT trigger will create company_members.
    const { error: invitationError } = await adminClient.from("user_invitations").upsert({
      company_id: companyId,
      email,
      role,
      invited_by: caller.id,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      accepted_at: null,
    }, { onConflict: "company_id,email" });
    if (invitationError) throw invitationError;

    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email, password, email_confirm: true, user_metadata: { full_name: fullName, job_title: jobTitle },
    });
    if (createError) throw createError;
    if (!created.user) throw new Error("Supabase n'a pas retourné le compte créé.");
    const userId = created.user.id;
    try {
      // company_members is created atomically by private.assign_invited_company_membership().
      const { error: assignmentError } = await adminClient.from("user_scope_assignments").insert({
        company_id: companyId, user_id: userId, job_title: jobTitle || null,
        scope_type: scopeType, scope_id: scopeId, can_view: true,
        can_create: false, can_edit: false, can_delete: false, can_approve: false,
        can_issue: false, can_receive: false, can_transfer: false, can_inventory: false,
      });
      if (assignmentError) throw assignmentError;
    } catch (dbError) {
      await adminClient.auth.admin.deleteUser(userId);
      throw dbError;
    }
    return respond({ success: true, user_id: userId });
  } catch (error) {
    console.error("create-team-user failed:", error);
    return respond({ error: error instanceof Error ? error.message : "Erreur interne." }, 400);
  }
});
