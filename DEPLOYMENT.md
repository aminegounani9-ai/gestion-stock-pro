# Gestion Stock Pro — configuration et déploiement

## Projet Supabase lié
- Project ref: `kguywkmfiddztkpotmbo`
- API URL: `https://kguywkmfiddztkpotmbo.supabase.co`
- Région: vérifier dans le tableau de bord Supabase avant de renseigner une région dans la documentation.
- Devise par défaut: DZD
- Pays par défaut: Algeria

## Variables frontend
Créer les variables dans les paramètres du projet Vercel (Development, Preview et Production):
- `VITE_SUPABASE_URL` = URL du projet Supabase ci-dessus
- `VITE_SUPABASE_PUBLISHABLE_KEY` = clé `sb_publishable_...` du projet Supabase

La clé publishable est conçue pour être utilisée dans le navigateur. La sécurité des données dépend des politiques RLS et des contrôles côté base.

## Secrets — règle obligatoire
Ne jamais mettre une clé Supabase `service_role`, une clé `sb_secret_...`, un mot de passe de base de données, un token GitHub ou un secret Vercel dans:
- le code React/Vite;
- un fichier `.env` commité;
- GitHub, même dans un dépôt privé;
- une variable préfixée `VITE_` (Vite l'intègre au bundle public).

Les clés secrètes ne sont nécessaires que pour un service backend de confiance (par exemple une Edge Function). Les ajouter uniquement dans les secrets du service backend, jamais dans le navigateur. Aucune clé secrète n'est requise pour le client Supabase actuel.

## Base de données
Les tables publiques utilisent RLS et les politiques d'accès à l'entreprise. Le modèle de stock est un journal de mouvements:
- les entrées augmentent le stock;
- les sorties diminuent le stock;
- la vue `public.stock_balances` calcule les quantités par article et entrepôt;
- le trigger `stock_movements_prevent_negative` bloque une sortie supérieure au stock disponible.

La migration correspondante est dans `supabase/migrations/20261117130000_stock_balance_and_negative_stock.sql`.

## Déploiement Vercel
1. Importer le dépôt GitHub `aminegounani9-ai/gestion-stock-pro`.
2. Framework preset: Vite.
3. Build command: `npm run build`.
4. Output directory: `dist`.
5. Ajouter les deux variables frontend ci-dessus.
6. Déployer puis vérifier l'URL, l'inscription, la confirmation e-mail et la création d'un espace entreprise.

## État fonctionnel actuel
Déjà présents: authentification, création d'entreprise, sélection d'espace, articles, fournisseurs, clients, entrepôts, journal des mouvements, vue des quantités de stock, affichage du total stock, interface FR/EN/AR.
À compléter avant une mise en production: parcours achats et ventes transactionnels, paiements, retours, inventaires, gestion détaillée des rôles, tests automatisés et validation de bout en bout.
