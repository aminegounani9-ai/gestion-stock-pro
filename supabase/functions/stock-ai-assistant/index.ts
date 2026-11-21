import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const safeText = (value: unknown, max = 160) => String(value ?? "").replace(/[,%()]/g, " ").trim().slice(0, max);
const numericCode = (value: string) => value.match(/[a-z0-9][a-z0-9._/-]{1,}/gi) || [];

async function buildLiveContext(client: any, companyId: string, question: string) {
  const q = safeText(question, 180);
  const terms = [...new Set(numericCode(q).map(x => x.trim()).filter(x => x.length >= 2))].slice(0, 5);
  const result: Record<string, unknown> = { source: "live_database", companyId, lookup: q };

  // Search both the catalogue and technical spare-part references. This is the
  // key path for questions such as "do we have belt 1717?".
  if (terms.length) {
    const clauses = (columns: string[]) => terms.flatMap(term => columns.map(col => `${col}.ilike.%${term}%`)).join(",");
    const [productRes, detailRes] = await Promise.all([
      client.from("products")
        .select("id,sku,barcode,name,description,unit,purchase_price,sale_price,min_stock,max_stock,is_active,category_id")
        .eq("company_id", companyId)
        .or(clauses(["sku", "barcode", "name", "description"]))
        .limit(25),
      client.from("spare_part_details")
        .select("product_id,part_number,manufacturer,manufacturer_reference,part_type,equipment_family,equipment_model,equipment_tag,criticality,condition_class,alternative_part_number,drawing_reference,technical_specifications,safety_stock,reorder_point,max_stock,reorder_quantity,lead_time_days,unit_of_measure,material,voltage,power_rating,notes,warehouse_id,site_id,unit_id,service_id,department_id,equipment_id")
        .eq("company_id", companyId)
        .or(clauses(["part_number", "manufacturer_reference", "alternative_part_number", "equipment_tag", "equipment_model", "manufacturer", "part_type", "technical_specifications"]))
        .limit(25)
    ]);
    if (productRes.error) console.error("AI product lookup failed", productRes.error.message);
    if (detailRes.error) console.error("AI spare detail lookup failed", detailRes.error.message);
    const products = productRes.data || [];
    const details = detailRes.data || [];
    const ids = [...new Set([...products.map((p: any) => p.id), ...details.map((d: any) => d.product_id)].filter(Boolean))];
    let linkedProducts: any[] = products;
    if (ids.length && ids.some(id => !products.some((p: any) => p.id === id))) {
      const extra = await client.from("products")
        .select("id,sku,barcode,name,description,unit,purchase_price,sale_price,min_stock,max_stock,is_active,category_id")
        .eq("company_id", companyId).in("id", ids).limit(25);
      linkedProducts = [...products, ...(extra.data || []).filter((p: any) => !products.some((x: any) => x.id === p.id))];
    }
    result.productMatches = linkedProducts;
    result.sparePartTechnicalRecords = details;

    if (ids.length) {
      const [movementRes, reservationRes, lotRes] = await Promise.all([
        client.from("stock_movements")
          .select("product_id,warehouse_id,movement_type,quantity,unit_cost,reference_type,note,occurred_at")
          .eq("company_id", companyId).in("product_id", ids)
          .order("occurred_at", { ascending: false }).limit(100),
        client.from("spare_part_reservations")
          .select("product_id,warehouse_id,quantity,reservation_number,requested_for,work_order_reference,required_date,status,notes")
          .eq("company_id", companyId).in("product_id", ids).limit(100),
        client.from("stock_lots")
          .select("product_id,warehouse_id,lot_number,expiry_date,quantity_on_hand,status")
          .eq("company_id", companyId).in("product_id", ids).limit(100)
      ]);
      result.stockMovements = movementRes.data || [];
      result.reservations = reservationRes.data || [];
      result.lots = lotRes.data || [];
      if (movementRes.error) console.error("AI movement lookup failed", movementRes.error.message);
      if (reservationRes.error) console.error("AI reservation lookup failed", reservationRes.error.message);
      if (lotRes.error) console.error("AI lot lookup failed", lotRes.error.message);
    }
    const [warehouseRes, supplierRes] = await Promise.all([
      client.from("warehouses").select("id,code,name").eq("company_id", companyId).limit(100),
      client.from("suppliers").select("id,name,phone,email").eq("company_id", companyId).limit(100)
    ]);
    result.warehouses = warehouseRes.data || [];
    result.suppliers = supplierRes.data || [];
  }

  // Provide real module-level counts for broad questions without dumping the
  // entire database into the model. Every query remains scoped to this company
  // and runs with the signed-in user's JWT/RLS permissions.
  const summaryTables = [
    ["products", "Articles"], ["spare_part_details", "Fiches techniques pièces"],
    ["warehouses", "Entrepôts"], ["suppliers", "Fournisseurs"], ["customers", "Clients"],
    ["purchase_orders", "Commandes d'achat"], ["sales", "Ventes"],
    ["stock_movements", "Mouvements de stock"], ["stock_transfers", "Transferts"],
    ["inventory_counts", "Inventaires"], ["stock_returns", "Retours"],
    ["expenses", "Dépenses"], ["payment_transactions", "Paiements"],
    ["projects", "Projets"], ["project_tasks", "Tâches projets"],
    ["org_equipment", "Équipements"]
  ];
  const countResults = await Promise.all(summaryTables.map(async ([table, label]) => {
    const { count, error } = await client.from(table).select("id", { count: "exact", head: true }).eq("company_id", companyId);
    return error ? null : { module: label, count: count ?? 0 };
  }));
  result.moduleCounts = countResults.filter(Boolean);
  return result;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token) return json({ error: "UNAUTHORIZED" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const publishableMap = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS");
    const publishableKey = Deno.env.get("SUPABASE_ANON_KEY") || (publishableMap ? JSON.parse(publishableMap).default : "");
    if (!supabaseUrl || !publishableKey) throw new Error("SUPABASE_AUTH_CONFIG_MISSING");

    const client = createClient(supabaseUrl, publishableKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const { data: { user }, error: authError } = await client.auth.getUser(token);
    if (authError || !user) return json({ error: "UNAUTHORIZED" }, 401);

    const body = await req.json();
    const messages = Array.isArray(body.messages) ? body.messages.slice(-16) : [];
    if (!messages.length) return json({ error: "MESSAGE_REQUIRED" }, 400);
    const companyId = String(body.company?.id || "");
    if (!/^[0-9a-f-]{36}$/i.test(companyId)) return json({ error: "COMPANY_REQUIRED" }, 400);

    const { data: membership, error: membershipError } = await client
      .from("company_members").select("company_id,role,is_active")
      .eq("company_id", companyId).eq("user_id", user.id).eq("is_active", true).maybeSingle();
    if (membershipError || !membership) return json({ error: "COMPANY_ACCESS_DENIED" }, 403);

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) return json({ error: "AI_NOT_CONFIGURED" }, 503);

    const latestQuestion = String([...messages].reverse().find((m: any) => m.role === "user")?.content || "").slice(0, 1800);
    let liveContext: Record<string, unknown> = {};
    try {
      liveContext = await buildLiveContext(client, companyId, latestQuestion);
    } catch (error) {
      console.error("AI live context retrieval failed", String(error).slice(0, 300));
      liveContext = { source: "live_database", lookup: latestQuestion, retrievalStatus: "partial_unavailable" };
    }

    const companyName = String(body.company?.name || "votre entreprise").slice(0, 120);
    const language = "Algerian Darija (Wahrani), naturally mixing simple French technical terms when useful";
    const page = String(body.currentPage || "dashboard").slice(0, 60);
    const userRole = String(membership.role || body.userRole || "staff").slice(0, 50);
    const contextText = JSON.stringify({
      company: companyName,
      currentPage: page,
      signedInRole: userRole,
      liveDatabaseEvidence: liveContext,
      uiSnapshot: body.context || {}
    }).slice(0, 18000);

    const systemInstruction = `نتا Stock Pro AI، مساعد ذكي داخل برنامج تسيير المخزون. جاوب دائماً بالدارجة الجزائرية الوهرانية، وبطريقة طبيعية ومفهومة، واستعمل المصطلحات التقنية بالفرنسية كي يلزم.
قواعد ضرورية:
- جاوب غير على السؤال المطروح، مباشرة وباختصار. عادةً جملة إلى 3 جمل؛ ما تطوّلش وما تعاودش السؤال.
- ما تعطِ حتى معلومة من راسك. بيانات الشركة الموجودة في LIVE DATA هي المرجع الوحيد للمخزون والمنتجات والأرقام.
- كي يسقسيك على قطعة أو Référence، فتّش في productMatches و sparePartTechnicalRecords. طابق الاسم وSKU وBarcode وPart Number وRéférence constructeur. إذا لقيتها، قول بوضوح موجودة واذكر الاسم والمرجع والمعدة المرتبطة بها إذا كانت موجودة.
- إذا ما لقيتش تطابق، قول: "ما لقيتش هاد المرجع في البيانات اللي قدرت نفتش فيها"، وما تخترعش جواب.
- ما تخلطش بين وجود القطعة في الكاتالوغ والكمية المتوفرة. ما تعطيش Stock disponible إلا إذا عندك رصيد موثوق وصريح في البيانات.
- إذا السؤال على كيفية استعمال البرنامج، أعطِ خطوات قليلة وواضحة حسب الموديول اللي راه ظاهر في معلومات البرنامج. إذا ما تعرفش اسم زر أو صفحة بالضبط، ما تخترعهاش.
- إذا السؤال بسيط، ما تزيدش شرح ما طلبوش. إذا السؤال يحتاج توضيح، اسأل سؤال واحد فقط.
- تقدر تشرح وتحلل وتقترح، بصح READ-ONLY: ما تقولش بلي درت إضافة أو تعديل أو حذف أو تحويل.
- ممنوع تكشف بيانات شركة أخرى أو أسرار الدخول.
- إذا المستخدم يهدر بالدارجة، جاوبه بالدارجة. ما تستعملش الفرنسية الكاملة إلا إذا طلبها.
`;

    const contents = messages.map((m: any) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: String(m.content || "").slice(0, 3500) }]
    }));
    // Keep live evidence in the system instruction, not as a fake user turn.
    const groundedSystemInstruction = systemInstruction + "\n\nLIVE APPLICATION DATA (trusted factual context; never invent beyond it): " + contextText;

    const models = ["gemini-3.5-flash-lite", "gemini-3.6-flash"];
    let lastStatus = 0;
    for (const model of models) {
      let response: Response;
      try {
        response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
          signal: AbortSignal.timeout(9000),
          body: JSON.stringify({
            system_instruction: { parts: [{ text: groundedSystemInstruction }] },
            contents,
            generationConfig: { temperature: 0.1, maxOutputTokens: 380 }
          })
        });
      } catch (error) {
        console.error("Gemini request timed out or failed", model, String(error).slice(0, 140));
        lastStatus = 0;
        continue;
      }
      const result = await response.json().catch(() => ({}));
      if (response.ok) {
        const answer = (result?.candidates?.[0]?.content?.parts || []).map((part: any) => part.text || "").join("").trim();
        if (!answer) return json({ error: "EMPTY_AI_RESPONSE" }, 502);
        return json({ answer, model, dataSources: Object.keys(liveContext) });
      }
      lastStatus = response.status;
      console.error("Gemini API error", model, response.status, result?.error?.message || "unknown");
      if (response.status !== 429 && response.status < 500) return json({ error: "AI_PROVIDER_ERROR", providerStatus: response.status }, 502);
    }
    console.error("All Gemini models unavailable", lastStatus);
    return json({ error: "AI_TEMPORARILY_UNAVAILABLE" }, 503);
  } catch (error) {
    console.error("stock-ai-assistant error", error);
    return json({ error: "INTERNAL_ERROR" }, 500);
  }
});
