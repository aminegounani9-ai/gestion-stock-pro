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
  const q = safeText(question, 240);
  const lower = q.toLowerCase();
  const stockIntent = /\b(stock|quantity|quantit[eé]|disponible|disponibilit[eé]|available|balance|inventory|inventaire|entrep[oô]t|warehouse|lot|expiry|p[eé]remption|r[eé]servation|reserved|mouvement|movement|article|produit|product|pi[eè]ce|spare|r[eé]f[eé]rence|reference|sku|barcode|code.barre|prix|value|valeur)\b/i.test(lower);
  const broadIntent = /\b(tout|tous|toutes|global|globale|r[eé]sum[eé]|overview|summary|dashboard|logiciel|modules|combien|chhal|total|statistique|statistics|rapport|report|d[eé]tail|details)\b/i.test(lower);
  const stop = new Set(["wach","wesh","kifach","kifeh","3tini","atini","donne","moi","svp","stp","please","show","give","want","need","what","how","where","which","the","and","for","with","dans","pour","avec","les","des","une","un","est","que","qui","quoi","comment","combien","stock","article","articles","produit","produits","quantite","quantité","disponible","disponibilite","disponibilité","entrepot","entrepôt","entrepots","entrepôts","kayn","kayen","rani","rah","rahi","ta3","m3a","fih","fiha","hada","hadi","3la","li","bghit","baghi","nheb","nchof","chof","dirli","mouvement","mouvements","details","détails"]);
  const tokens = [...new Set((q.match(/[a-zA-Z0-9À-ÿ][a-zA-Z0-9À-ÿ._/-]{1,}/g) || [])
    .map((x: string) => x.trim()).filter((x: string) => x.length >= 2 && !stop.has(x.toLowerCase())))].slice(0, 6);
  const result: Record<string, unknown> = { source: "live_database", lookup: q, stockIntent, retrievalScope: "current_company_only" };

  const [warehouseRes, productCountRes, balanceRes] = await Promise.all([
    client.from("warehouses").select("id,code,name,is_active").eq("company_id", companyId).limit(200),
    client.from("products").select("id", {count:"exact",head:true}).eq("company_id", companyId),
    client.from("stock_balances").select("product_id,warehouse_id,quantity_on_hand").eq("company_id", companyId).limit(stockIntent ? 1000 : 100)
  ]);
  const warehouses = warehouseRes.data || [];
  let balances = balanceRes.data || [];
  if (warehouseRes.error) console.error("AI warehouse lookup failed", warehouseRes.error.message);
  if (balanceRes.error) console.error("AI stock balance lookup failed", balanceRes.error.message);
  result.warehouses = warehouses;
  result.stockBalanceRowsReturned = balances.length;
  result.stockBalanceRowsLimited = balances.length >= (stockIntent ? 1000 : 100);

  let productRows: any[] = [];
  let detailRows: any[] = [];
  if (tokens.length) {
    const clauses = (cols: string[]) => tokens.flatMap(term => cols.map(col => col + ".ilike.%" + term + "%")).join(",");
    const [pRes,dRes] = await Promise.all([
      client.from("products").select("id,sku,barcode,name,description,unit,purchase_price,sale_price,min_stock,max_stock,reorder_quantity,lead_time_days,track_lots,track_serial_numbers,is_active,category_id")
        .eq("company_id",companyId).or(clauses(["sku","barcode","name","description"])).limit(40),
      client.from("spare_part_details").select("product_id,part_number,manufacturer,manufacturer_reference,part_type,equipment_family,equipment_model,equipment_tag,criticality,condition_class,shelf_life_months,storage_conditions,shelf_code,alternative_part_number,drawing_reference,technical_specifications,safety_stock,reorder_point,max_stock,reorder_quantity,lead_time_days,purchase_pack_quantity,unit_of_measure,weight,dimensions,material,voltage,power_rating,pressure_rating,connection_type,operating_temperature,standard_reference,warranty_months,country_of_origin,storage_temperature,humidity_range,notes,warehouse_id,site_id,unit_id,service_id,department_id,equipment_id,storage_location_id")
        .eq("company_id",companyId).or(clauses(["part_number","manufacturer_reference","alternative_part_number","equipment_tag","equipment_model","manufacturer","part_type","technical_specifications"])).limit(40)
    ]);
    if(pRes.error) console.error("AI product search failed",pRes.error.message);
    if(dRes.error) console.error("AI technical search failed",dRes.error.message);
    productRows=pRes.data||[];
    detailRows=dRes.data||[];
  }

  const matchedProductIds = [...new Set([...productRows.map((p:any)=>p.id),...detailRows.map((d:any)=>d.product_id)].filter(Boolean))];
  if(matchedProductIds.length){
    const exactBalanceRes=await client.from("stock_balances").select("product_id,warehouse_id,quantity_on_hand")
      .eq("company_id",companyId).in("product_id",matchedProductIds).limit(500);
    if(exactBalanceRes.error) console.error("AI exact stock balance lookup failed",exactBalanceRes.error.message);
    else balances=exactBalanceRes.data||[];
  }
  const ids = [...new Set([...matchedProductIds,...(stockIntent?balances.map((x:any)=>x.product_id):[])].filter(Boolean))];
  const knownIds = new Set(productRows.map((p:any)=>p.id));
  const missingIds = ids.filter(id=>!knownIds.has(id));
  for(let i=0;i<missingIds.length;i+=100){
    const extra=await client.from("products").select("id,sku,barcode,name,description,unit,purchase_price,sale_price,min_stock,max_stock,reorder_quantity,lead_time_days,track_lots,track_serial_numbers,is_active,category_id")
      .eq("company_id",companyId).in("id",missingIds.slice(i,i+100)).limit(100);
    if(extra.error) console.error("AI balance product labels failed",extra.error.message);
    productRows.push(...(extra.data||[]));
  }
  const productById = new Map(productRows.map((p:any)=>[p.id,p]));
  const warehouseById = new Map(warehouses.map((w:any)=>[w.id,w]));
  const enrichedBalances = balances.map((row:any)=>({...row,product:productById.get(row.product_id)||null,warehouse:warehouseById.get(row.warehouse_id)||null}));
  result.productMatches = productRows;
  result.sparePartTechnicalRecords = detailRows;
  result.stockBalances = enrichedBalances;
  result.stockSummary = {
    totalQuantityAcrossReturnedRows: balances.reduce((sum:number,row:any)=>sum+Number(row.quantity_on_hand||0),0),
    productsWithBalance: new Set(balances.map((x:any)=>x.product_id)).size,
    warehousesWithBalance: new Set(balances.map((x:any)=>x.warehouse_id)).size,
    productCount: productCountRes.count ?? null,
    note: "Sum of quantity_on_hand rows returned; not a monetary valuation. If row limit is reached, this is not a complete company total."
  };

  if(ids.length){
    const [movementRes,lotRes,serialRes,reservationRes] = await Promise.all([
      client.from("stock_movements").select("product_id,warehouse_id,movement_type,quantity,unit_cost,reference_type,reference_id,note,occurred_at,location_id,lot_id")
        .eq("company_id",companyId).in("product_id",ids).order("occurred_at",{ascending:false}).limit(80),
      client.from("stock_lots").select("product_id,warehouse_id,location_id,lot_number,manufacture_date,expiry_date,received_quantity,quantity_on_hand,unit_cost,supplier_id,status,notes")
        .eq("company_id",companyId).in("product_id",ids).limit(100),
      client.from("stock_serial_numbers").select("product_id,warehouse_id,location_id,lot_id,serial_number,status,received_at,notes")
        .eq("company_id",companyId).in("product_id",ids).limit(100),
      client.from("spare_part_reservations").select("product_id,warehouse_id,quantity,reservation_number,requested_for,work_order_reference,required_date,status,notes")
        .eq("company_id",companyId).in("product_id",ids).limit(100)
    ]);
    result.stockMovements=movementRes.data||[];
    result.stockLots=lotRes.data||[];
    result.stockSerialNumbers=serialRes.data||[];
    result.sparePartReservations=reservationRes.data||[];
    for(const [name,res] of [["movements",movementRes],["lots",lotRes],["serials",serialRes],["reservations",reservationRes]] as any){
      if(res.error) console.error("AI "+name+" lookup failed",res.error.message);
    }
  }

  if(broadIntent){
    const tables=[
      ["products","Articles"],["categories","Catégories"],["warehouses","Entrepôts"],["suppliers","Fournisseurs"],["customers","Clients"],
      ["purchase_orders","Commandes d'achat"],["sales","Ventes"],["stock_movements","Mouvements"],["stock_transfers","Transferts"],
      ["inventory_counts","Inventaires"],["stock_returns","Retours"],["expenses","Dépenses"],["payment_transactions","Paiements"],
      ["projects","Projets"],["project_tasks","Tâches projets"],["org_equipment","Équipements"],["spare_part_details","Fiches techniques pièces"],
      ["stock_lots","Lots"],["stock_serial_numbers","Numéros de série"]
    ];
    const counts=await Promise.all(tables.map(async ([table,label])=>{
      const {count,error}=await client.from(table).select("*",{count:"exact",head:true}).eq("company_id",companyId);
      return error?null:{module:label,count:count??0};
    }));
    result.moduleCounts=counts.filter(Boolean);
  }

  if(/\b(achat|purchase|commande|order|fournisseur|vente|sales|invoice|facture|transfert|transfer|inventaire|inventory|retour|return)\b/i.test(lower)){
    const [poRes,saleRes,transferRes,inventoryRes,returnRes]=await Promise.all([
      client.from("purchase_orders").select("id,order_number,status,order_date,expected_date,subtotal,supplier_id,warehouse_id,notes").eq("company_id",companyId).order("order_date",{ascending:false}).limit(20),
      client.from("sales").select("id,invoice_number,status,sale_date,subtotal,discount,total,customer_id,notes").eq("company_id",companyId).order("sale_date",{ascending:false}).limit(20),
      client.from("stock_transfers").select("id,transfer_number,status,transfer_date,source_warehouse_id,destination_warehouse_id,approved_at,dispatched_at,received_at,notes").eq("company_id",companyId).order("transfer_date",{ascending:false}).limit(20),
      client.from("inventory_counts").select("id,count_number,status,count_date,warehouse_id,notes").eq("company_id",companyId).order("count_date",{ascending:false}).limit(20),
      client.from("stock_returns").select("id,return_number,return_type,status,return_date,warehouse_id,reason,notes").eq("company_id",companyId).order("return_date",{ascending:false}).limit(20)
    ]);
    result.recentPurchaseOrders=poRes.data||[];
    result.recentSales=saleRes.data||[];
    result.recentTransfers=transferRes.data||[];
    result.recentInventoryCounts=inventoryRes.data||[];
    result.recentReturns=returnRes.data||[];
  }
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
    const detectLanguage = (value: string): string => {
      const text = value.toLowerCase().trim();
      if (/[\u0600-\u06FF]/.test(value)) return "Arabic (use the same register as the user)";
      if (/\b(wach|wesh|kifach|kifeh|3lach|3lah|3tini|atini|chhal|ch7al|win|wein|rani|rana|rah|rahi|nheb|bghit|baghi|ndir|dirli|saha|kayen|kayn|ma3lich|mlih|ta3|t3|m3a|hada|hadi|hadak|smahli|machi|mazal|wella|3awed|3awd|nchof|chof|m3aya|3andi|3ndek|3ndna)\b/i.test(text)) return "Algerian Darija in Latin script (Wahrani), naturally mixing French technical terms";
      if (/[àâçéèêëîïôûùüÿœ]/i.test(text) || /\b(bonjour|comment|pourquoi|merci|article|entrepôt|fournisseur|quantité|commande|achat|vente|enregistrer|modifier|supprimer|gestion|logiciel|formulaire|je|vous|nous|avec|dans|pour|quelle|quels)\b/i.test(text)) return "French";
      if (/\b(what|how|why|where|when|please|help|show|product|warehouse|supplier|purchase|sales|inventory|create|update|delete|form|field|save|report|hello|thanks|can you|i need)\b/i.test(text)) return "English";
      return "the same language and writing style as the user's latest message";
    };
    const language = detectLanguage(latestQuestion);
    const currentPageLabel: Record<string, string> = {
      dashboard:"Tableau de bord", projects:"Gestion des projets", requests:"Demandes de pièces", products:"Articles",
      categories:"Catégories", stock:"Mouvements de stock", warehouses:"Entrepôts", suppliers:"Fournisseurs",
      customers:"Clients", purchases:"Achats", sales:"Ventes", transfers:"Transferts", inventory:"Inventaires",
      locations:"Emplacements", lots:"Lots et péremption", spareParts:"Pièces de rechange", returns:"Retours",
      expenses:"Dépenses", payments:"Paiements", reports:"Rapports", users:"Utilisateurs",
      settings:"Paramètres", organization:"Organisation et affectations", equipment:"Équipements"
    };
    const page = String(body.currentPage || "dashboard").slice(0, 60);
    const userRole = String(membership.role || body.userRole || "staff").slice(0, 50);
    const contextText = JSON.stringify({
      company: companyName,
      currentPage: page,
      signedInRole: userRole,
      liveDatabaseEvidence: liveContext,
      uiSnapshot: body.context || {}
    }).slice(0, 28000);

    const softwareGuide = `
STOCK PRO — GUIDE FONCTIONNEL
Logiciel web de gestion de stock et de projets. Les données sont isolées par entreprise; les écrans et actions dépendent du rôle et des permissions.

MODULES ET PROCESSUS
• Tableau de bord: synthèse des articles, fournisseurs, entrepôts, mouvements et alertes.
• Articles: SKU/référence, désignation, description, code-barres, catégorie, prix d'achat, unité, seuil minimum, stock maximum, quantité de réapprovisionnement, délai fournisseur, poids, volume, suivi lots et numéros de série.
• Catégories: nom et description pour classer les articles.
• Entrepôts: code, nom et adresse.
• Fournisseurs/Clients: nom, contact, téléphone, e-mail, identifiant fiscal, adresse et notes.
• Mouvements de stock: entrée, sortie ou ajustement; choisir article, quantité, entrepôt et note/motif. Contrôler le sens avant validation.
• Achats: choisir fournisseur, date et lignes d'articles (quantités/prix); enregistrer la commande puis réceptionner la marchandise réellement. Une commande non réceptionnée n'augmente pas nécessairement le stock.
• Ventes: choisir client, date, articles, quantités, prix et remise; vérifier le total puis valider. La vente validée entraîne la sortie selon le flux applicatif.
• Transferts: entrepôt source et destination, articles et quantités; les entrepôts doivent être différents. C'est un déplacement interne, pas un achat/vente.
• Inventaires: choisir entrepôt, compter physiquement, saisir les quantités comptées, analyser les écarts; un brouillon ne modifie pas le stock, la validation autorisée applique les écarts.
• Emplacements: code (ex. A-01-02), nom, capacité, unité (palette/m³/kg) et note.
• Lots & péremption: numéro de lot, quantité, coût unitaire, date de fabrication, date d'expiration, fournisseur et note. Vérifier la cohérence des dates.
• Retours: numéro, type, entrepôt, date, raison et note; vérifier retour client/fournisseur et l'effet stock avant validation.
• Dépenses: numéro, description, montant, date, référence et note.
• Paiements: suivi des transactions; vérifier montant, date, statut/moyen et document lié.
• Pièces de rechange: SKU interne, désignation, prix d'achat, fabricant, référence fabricant/Part Number, quantité initiale réelle et stock minimum/safety stock. Détails complémentaires: compatibilité équipement (repère, nom, famille, modèle, fabricant, quantité par équipement, criticité, notes); devis fournisseur (référence, prix, devise DZD/EUR/USD, MOQ, délai, date offre, garantie, fournisseur préféré); réparation (numéro série/actif, équipement, prestataire, date envoi, retour prévu, coût/devise, panne); numéros de série. Catalogue ≠ disponibilité physique.
• Demandes de pièces: sélectionner équipement/pièces, quantités et date souhaitée; suivre le statut. Une demande ne constitue pas automatiquement une sortie physique.
• Équipements: Equipment Tag obligatoire, désignation obligatoire, fabricant, modèle, numéro de série, emplacement et notes; associer pièces compatibles, suivre demandes/consommations et QR.
• Organisation: hiérarchie Management > Site > Service > Département > Unité; codes, noms et descriptions; affectations utilisateur selon périmètre.
• Utilisateurs: compte/invitation, nom complet, rôle, périmètre et permissions par module/action.
• Projets: code, nom, statut, site, département, date/heure début, date/heure fin cible, budget, coût réel, description, objectifs, périmètre, critères de réussite et notes. Tâches: titre, priorité, début/fin planifiés, heures estimées/réelles, description, progression, responsables/équipe et dépendances. Gantt reflète les dates de chaque tâche. Sous-fonctions: jalons, risques, problèmes, réunions, documents, RACI, commentaires, dépendances et demandes de changement.
• Rapports: filtres période/module, consultation, export/impression selon droits.
• Paramètres entreprise: nom commercial, raison sociale, NIF, téléphone, e-mail, ville, adresse et pays.

COMMENT REMPLIR LES FORMULAIRES
1. Commencer par les champs obligatoires (*) et ne jamais inventer une donnée.
2. SKU = code unique stable; désignation = nom clair; code-barres = code réellement scanné/imprimé.
3. Quantité = nombre positif dans l'unité de l'article; prix/coût = montant dans le champ monétaire, avec devise affichée.
4. Choisir des fournisseurs, clients, catégories et entrepôts existants; les créer d'abord si absents.
5. Transfert: source et destination différentes. Vérifier article, quantité et entrepôt avant confirmation.
6. Dates = dates réelles du document/événement; expiration après fabrication si les deux sont renseignées.
7. Notes = complément, pas un substitut aux champs structurés.
8. Avant Enregistrer/Valider/Recevoir/Appliquer, vérifier toutes les lignes, quantités, totaux et lieux.
9. Expliquer clairement la différence entre brouillon, enregistrement, validation et réception, ainsi que leur impact sur le stock.
10. Si un champ ou bouton n'est pas confirmé sur l'écran réel, ne pas l'inventer; demander le module exact ou une capture.

PARCOURS DE DÉMARRAGE
Créer l'espace entreprise > compléter paramètres > créer entrepôt(s) > catégories > fournisseurs/clients nécessaires > articles/pièces > saisir stock initial via la procédure disponible > contrôler tableau de bord.
PARCOURS ACHAT: fournisseur > commande > lignes/prix/quantités > enregistrer > réception réelle > vérifier stock.
PARCOURS VENTE: client si nécessaire > vente > lignes/prix/remise > vérifier total > valider > vérifier mouvement.
PARCOURS TRANSFERT: source > destination > lignes > contrôle > valider > vérifier mouvements.
PARCOURS INVENTAIRE: entrepôt > comptage physique > saisie > écarts > validation autorisée > contrôle stock.
PARCOURS PROJET: projet > objectifs/budget/dates > tâches/responsables > dépendances/jalons > progression > Gantt/rapports.
`;
    const systemInstruction = `Stock Pro AI: اللغة المكتشفة للسؤال الحالي هي ${language}. أجب حصرياً بلغة آخر سؤال وبنفس طريقة كتابته: الدارجة بالحروف اللاتينية تبقى دارجة لاتينية، والدارجة/العربية بالحروف العربية تبقى بالعربية، والفرنسية تبقى بالفرنسية، والإنجليزية تبقى بالإنجليزية. لا تحوّل الدارجة إلى العربية الفصحى ولا تختار العربية لمجرد أن واجهة البرنامج عربية.
أجب اعتماداً على بيانات قاعدة البيانات الحية قبل أي معرفة عامة. اربط stock_balances مع products وwarehouses، واستعمل stock_movements وstock_lots وstock_serial_numbers وspare_part_reservations للتفاصيل التاريخية والدفعات والأرقام التسلسلية والحجوزات. دليل البرنامج ليس بديلاً عن البيانات الفعلية. إذا سأل المستخدم عن كمية article، اذكر الكمية حسب كل warehouse ثم الإجمالي. لا تحسب المتبقي بعد الحجز إلا إذا كانت statuses واضحة ويمكن التحقق من الحساب. لا تعرض نتيجة مشابهة على أنها تطابق مؤكد؛ إذا لم تجد تطابقاً قل ذلك بوضوح. إذا كانت قراءة البيانات محدودة أو جزئية، لا تعرض الإجمالي كأنه كامل.\nقاعدة أساسية: طول الجواب يتحدد حسب السؤال، وليس حسب طول دليل البرنامج.
- سؤال مباشر أو معلومة بسيطة: جواب مباشر في جملة إلى 3 جمل كحد أقصى.
- سؤال عن وجود article أو référence أو quantité: أعط النتيجة أولاً، ثم أهم معلومة داعمة فقط. إذا البيانات لا تثبت الكمية المتاحة، قل ذلك بوضوح.
- سؤال "كيفاش/كيف/كيف أستعمل": خطوات عملية قصيرة ومرقمة، فقط الخطوات اللازمة للسؤال والموديول المعني.
- شرح مفصل، جميع الحقول، مقارنة أو إجراء كامل: أعط التفاصيل المطلوبة فقط عندما يطلب المستخدم ذلك صراحة.
لا تعطِ مقدمة عامة، ولا تعاود صياغة السؤال، ولا تسرد modules غير المطلوبة، ولا تكرر نفس المعلومة، ولا تضف نصائح عامة لا تساعد في السؤال. إذا السؤال واضح، لا تسأل أسئلة إضافية. إذا معلومة واحدة ضرورية ناقصة، اسأل سؤال توضيح واحد فقط.
استعمل STOCK PRO GUIDE وLIVE APPLICATION DATA والـ schema الفعلي كمراجع داخلية، لكن لا تفرغ محتواها في الجواب. ابدأ بالإجابة المطلوبة مباشرة. لا تخترع أسماء أزرار أو حقول أو صلاحيات. إذا التفاصيل غير مؤكدة، صرّح بالجزء غير المؤكد فقط.
بيانات LIVE هي المصدر الوحيد للأرقام والمخزون. لا تخلط وجود article في catalogue مع stock disponible؛ لا تحسب الرصيد من mouvements إلا إذا كان موثوقاً وصريحاً. في أسئلة القطع والـ références فتّش productMatches وsparePartTechnicalRecords وطابق SKU/Barcode/Part Number/Référence constructeur.
READ-ONLY: تشرح وتوجّه فقط، لا تدّعي أنك أضفت أو عدلت أو حذفت أو استلمت أو حولت أو صادقت. احمِ بيانات الشركات الأخرى والأسرار.
`;

    const contents = messages.map((m: any) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: String(m.content || "").slice(0, 3500) }]
    }));
    // Keep live evidence in the system instruction, not as a fake user turn.
    const groundedSystemInstruction = systemInstruction + "\n\nSTOCK PRO SOFTWARE GUIDE (reference only; use only the parts relevant to the question): " + softwareGuide + "\n\nLIVE APPLICATION DATA (trusted factual context; never invent beyond it): " + contextText + "\n\nCURRENT SCREEN: " + (currentPageLabel[page] || page);
    const asksForDetail = /\b(d[eé]taill[eé]|en d[eé]tail|tous les champs|chaque champ|complet|compl[eè]te|pas [àa] pas|step by step|in detail|full explanation|شرح مفصل|بالتفصيل|كل الحقول|خطوة بخطوة)\b/i.test(latestQuestion);
    const asksHowTo = /\b(comment|kifach|kifeh|how to|how do i|how can i|اشرح|كيفاش|كيف ندير|كيف أ)\b/i.test(latestQuestion);
    const maxOutputTokens = asksForDetail ? 520 : asksHowTo ? 260 : 180;

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
            generationConfig: { temperature: 0.1, maxOutputTokens }
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
