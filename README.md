# Gestion Stock Pro

Application web de gestion de stock multi-entreprises, construite avec React, TypeScript, Vite et Supabase.

## Modules

- **Tableau de bord** : catalogue, fournisseurs, entrepôts, unités en stock et alertes de seuil minimum.
- **Articles** : SKU, code-barres, catégorie, unité, prix d'achat/vente, seuil minimum, archivage et réactivation.
- **Catégories** : classification des articles.
- **Entrepôts** : création et modification des emplacements.
- **Mouvements** : stock initial, entrées et sorties d'ajustement avec journal.
- **Achats** : commandes multi-articles, fournisseur, entrepôt de réception, coût unitaire et réception atomique.
- **Ventes** : factures multi-articles, client, remises par ligne et facture, sortie de stock atomique.
- **Transferts** : transfert multi-articles entre deux entrepôts avec mouvements de sortie et d'entrée.
- **Inventaires** : quantité théorique, quantité comptée, écart et ajustement automatique.
- **Retours** : retours clients et retours fournisseurs avec mouvements de stock.
- **Dépenses** : catégorie, date, montant, moyen de paiement et référence.
- **Paiements** : encaissements clients et règlements fournisseurs liés aux factures/commandes, avec contrôle serveur du solde restant.
- **Rapports** : ventes, achats, dépenses, marge brute estimée, valeur du stock, seuils, créances clients, dettes fournisseurs, comparaison visuelle et export CSV.
- **Documents** : impression des factures de vente et bons d'achat au format imprimable/PDF depuis le navigateur.
- **Scanner** : lecture des codes-barres et QR avec la caméra lorsque le navigateur prend en charge BarcodeDetector; les lecteurs USB/clavier restent compatibles via la recherche.
- **Utilisateurs** : invitations, rôles, statut actif/inactif et révocation des invitations.
- **Paramètres** : coordonnées légales et commerciales, pays et devise utilisés sur les documents.

## Rôles

- **Admin / Owner** : accès complet, gestion des utilisateurs, rôles, paramètres et données.
- **Manager** : gestion opérationnelle complète, achats, ventes, dépenses, paiements et rapports.
- **Magasinier (warehouse)** : articles en lecture, fournisseurs, achats, mouvements, transferts, inventaires et retours.
- **Ventes (sales)** : articles en lecture, clients, ventes, retours clients et encaissements clients.
- **Consultation (viewer)** : accès en lecture seule, sans accès aux écrans financiers sensibles.
- **Employé (staff)** : accès en lecture seule aux écrans non financiers.

Les permissions sont appliquées dans l'interface et dans les politiques PostgreSQL RLS. Les fonctions transactionnelles utilisent les droits de l'utilisateur connecté.

## Sécurité et intégrité

- RLS activé sur les tables exposées.
- Isolation des données par `company_id`.
- Vérification que les produits, entrepôts, fournisseurs, clients et documents liés appartiennent à la même entreprise.
- Fonctions transactionnelles pour réception d'achat, vente, transfert, inventaire et retour.
- Protection contre les stocks négatifs.
- Journal de stock append-only pour les mouvements opérationnels.
- Paiements liés à une facture ou commande et bloqués si le montant dépasse le solde dû.
- Inscription Auth réservée aux invitations valides; les administrateurs créent les invitations.
- La fonction de liste des utilisateurs utilise une fonction privilégiée dans le schéma privé, derrière un RPC public en mode invoker.

## Stack technique

- React 19 + TypeScript
- Vite
- Supabase Auth + PostgreSQL + RLS
- Lucide React
- Vercel (déploiement continu depuis `main`)
- GitHub Actions (typecheck + build)

## Configuration locale

Créer un fichier `.env.local` avec :

```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Puis :

```bash
npm install
npm run dev
npm run build
```

Ne jamais placer une clé `service_role` ou `sb_secret_*` dans le frontend.

## Invitations

L'administrateur crée une invitation depuis **Utilisateurs**, partage manuellement le lien `/?invite=1` avec l'adresse e-mail invitée, puis l'utilisateur s'inscrit avec cette même adresse. Les invitations expirent après 7 jours. L'envoi automatique d'e-mails n'est pas configuré.

## Déploiement

La branche `main` est reliée au projet Vercel `gestion-stock-pro`. Chaque commit déclenche une vérification GitHub Actions et un déploiement Vercel.

## Données

Aucune donnée de démonstration n'est créée par l'application. Les enregistrements sont créés par les utilisateurs dans leur propre espace d'entreprise.
