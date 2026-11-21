import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return Response.json({ error: "METHOD_NOT_ALLOWED" }, { status: 405, headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return Response.json({ error: "UNAUTHORIZED" }, { status: 401, headers: corsHeaders });

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const publishableMap = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS");
    const publishableKey = Deno.env.get("SUPABASE_ANON_KEY") || (publishableMap ? JSON.parse(publishableMap).default : "");
    if (!supabaseUrl || !publishableKey) throw new Error("SUPABASE_AUTH_CONFIG_MISSING");

    const authClient = createClient(supabaseUrl, publishableKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: { user }, error: authError } = await authClient.auth.getUser(token);
    if (authError || !user) return Response.json({ error: "UNAUTHORIZED" }, { status: 401, headers: corsHeaders });

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) return Response.json({ error: "AI_NOT_CONFIGURED" }, { status: 503, headers: corsHeaders });

    const body = await req.json();
    const messages = Array.isArray(body.messages) ? body.messages.slice(-14) : [];
    if (!messages.length) return Response.json({ error: "MESSAGE_REQUIRED" }, { status: 400, headers: corsHeaders });

    const companyName = String(body.company?.name || "votre entreprise").slice(0, 120);
    const language = body.language === "en" ? "English" : body.language === "ar" ? "Arabic (Algerian Darija when natural)" : "French";
    const context = JSON.stringify({
      currentPage: body.currentPage,
      userRole: body.userRole,
      businessSnapshot: body.context
    }).slice(0, 12000);

    const systemInstruction = `Tu es Stock Pro AI, un assistant professionnel intégré dans un logiciel de gestion de stock multi-entreprises. Tu aides l'utilisateur à utiliser le logiciel, comprendre les stocks, achats, ventes, fournisseurs, clients, entrepôts, mouvements, inventaires, transferts, retours, dépenses, paiements et rapports. Réponds en ${language}. Sois clair, concret, professionnel et concis; en arabe, préfère la darija algérienne si approprié. Entreprise active: ${companyName}. Contexte applicatif disponible (instantané limité fourni par l'application): ${context}. Utilise uniquement les chiffres réellement présents dans ce contexte. Si une information manque, dis-le clairement et ne l'invente jamais. Tu es en mode consultation uniquement: tu ne peux ni créer, ni modifier, ni supprimer, ni valider des documents ou mouvements. N'affirme jamais avoir effectué une action. Pour toute opération, explique le chemin dans le logiciel et rappelle à l'utilisateur de vérifier les données avant validation. Ne demande jamais de mot de passe, clé API ou donnée secrète.`;

    const contents = messages.map((m: any) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: String(m.content || "").slice(0, 5000) }]
    }));

    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=" + encodeURIComponent(apiKey), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemInstruction }] },
        contents,
        generationConfig: { temperature: 0.45, maxOutputTokens: 900 }
      })
    });
    const result = await response.json();
    if (!response.ok) {
      console.error("Gemini API error", response.status, result?.error?.message || "unknown");
      return Response.json({ error: "AI_PROVIDER_ERROR", message: "Le service IA a retourné une erreur." }, { status: 502, headers: corsHeaders });
    }
    const answer = (result?.candidates?.[0]?.content?.parts || []).map((part: any) => part.text || "").join("").trim();
    if (!answer) return Response.json({ error: "EMPTY_AI_RESPONSE" }, { status: 502, headers: corsHeaders });
    return Response.json({ answer }, { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("stock-ai-assistant error", error);
    return Response.json({ error: "INTERNAL_ERROR" }, { status: 500, headers: corsHeaders });
  }
});
