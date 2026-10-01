# Monsinistre

Plateforme française d’expertise technique au Maroc. Next.js App Router, TypeScript strict, Tailwind CSS 4, PostgreSQL 17 et Prisma 6. Aucun Supabase, Firebase, backend simulé ou stockage métier dans le navigateur.

## Démarrage

Prérequis : Node.js 22+, npm, Docker Compose.

```sh
npm ci
cp .env.example .env
```

Remplacer `CHANGE_ME` dans `POSTGRES_PASSWORD` et `DATABASE_URL` par le même mot de passe robuste. Les autres identifiants restent privés dans `.env`, ignoré par Git.

```sh
docker compose up -d
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

Le seed nécessite `ADMIN_PHONE`, `ADMIN_NAME` et `ADMIN_PASSWORD` (12 caractères minimum, 72 octets maximum). Il ne modifie jamais un compte déjà présent et refuse de transformer un client en administrateur.

Pour l’instance locale préparée pendant la réalisation : PostgreSQL utilise **55438**, l’application **http://127.0.0.1:3018**. Lancer `npm run dev -- --port 3018` et conserver la même origine dans `APP_URL`. `.env` contient déjà le mot de passe aléatoire de cette base de développement. Le premier administrateur doit être renseigné par l’exploitant ; les comptes QA des tests sont supprimés après vérification.

## Parcours

- Site public : accueil, services, à propos, contact et trois pages métier.
- Chaque page métier propose un formulaire en étapes, validé dans le navigateur et au serveur.
- La soumission crée dans une transaction le compte client, le dossier et son premier historique. Les numéros marocains sont normalisés au format `+212…`.
- Pour un compte existant, l’utilisateur s’authentifie dans le formulaire sans perdre ses réponses. Aucun deuxième compte n’est créé.
- Le client se connecte par téléphone, suit ses dossiers, transmet des documents et échange avec l’équipe.
- Les administrateurs filtrent les dossiers en base, changent les statuts, assignent des responsables et demandent des pièces. Les experts ne voient que les dossiers qui leur sont assignés.
- Les demandes non assurées, clôturées ou ayant une décision définitive sont enregistrées avec des indications de revue humaine.
- Une vérification légère toutes les deux secondes détecte les modifications et actualise l’espace ouvert. Aucun avancement n’est inventé.

Les références `MS-AAAA-000001` utilisent une séquence PostgreSQL globale. Elles sont attribuées dans la transaction et sont distinctes de l’identifiant interne. La séquence ne redémarre pas au changement d’année ; des trous après rollback ou suppression de tests sont normaux.

## Structure

```text
content/                     Sources éditoriales métier originales
prisma/schema.prisma         Modèles, relations et index
prisma/migrations/           Migration SQL PostgreSQL versionnée
prisma/seed.ts               Premier administrateur depuis l’environnement
src/app/(public)/            Site public et connexion
src/app/mon-espace/           Portail client protégé
src/app/admin/                Administration et espace expert
src/app/actions/             Mutations serveur avec validation et RBAC
src/app/api/documents/        Upload, téléchargement privé et suppression
src/app/api/updates/          Détection des changements autorisés
src/lib/                     Authentification, validation, données et stockage
src/components/              Composants publics, formulaires et écrans métier
scripts/                     Provisionnement équipe et maintenance
deploy/                      Proxy HTTPS et sauvegarde de la production
```

Les trois Markdown originaux sont conservés dans `content/`. `src/lib/editorial.ts` extrait les sections éditoriales avant le formulaire ; les champs métier sont centralisés dans `src/lib/forms.ts`. Les mots de passe ne sont jamais enregistrés dans `formData`.

## Accès et sécurité

| Fonction | Client | Expert | Administrateur |
| --- | --- | --- | --- |
| Lire un dossier et ses documents | Les siens | Assignés | Tous |
| Messages et uploads | Les siens | Assignés | Tous |
| Statuts, demandes de pièces et notes internes | Non | Assignés | Tous |
| Assigner un responsable | Non | Non | Oui |
| Supprimer un document | Non | Non | Oui |
| Clients, contacts et réinitialisations | Non | Non | Oui |

Les sessions sont des jetons aléatoires de 256 bits dont seul le SHA-256 est enregistré en base. Cookie HttpOnly, SameSite=Lax, Secure en production, durée de sept jours. Les sessions sont renouvelées à la connexion et invalidées lors d’une réinitialisation. Bcrypt utilise un coût de 12 ; les entrées dépassant 72 octets sont refusées à la création.

Chaque action vérifie l’identité et les droits côté serveur. Les notes et les hashes de mots de passe ne sont pas transmis aux composants client. Les mutations de dossier sont sérialisées par un verrou de ligne PostgreSQL pour garantir un historique ancien/nouveau cohérent. La clé de soumission unique et le verrou frontend empêchent les doublons.

La limitation de tentatives utilise PostgreSQL, donc fonctionne entre plusieurs processus. Par défaut `TRUST_PROXY=false` applique un quota réseau partagé en développement, complété par un quota par téléphone/utilisateur. En production, n’activer `TRUST_PROXY=true` que si un reverse proxy de confiance écrase `X-Forwarded-For` et interdit l’accès direct au serveur.

La protection d’origine Next.js couvre les Server Actions. Les endpoints de modification des fichiers vérifient explicitement l’origine contre `APP_URL`. Les uploads sont lus avec une limite effective de 20 Mo, puis leur signature binaire est vérifiée (JPEG, PNG, WebP, PDF, MP4, MOV). Les noms de stockage sont aléatoires et les fichiers ne sont jamais placés dans `public/`. Les réponses de téléchargement sont privées et non mises en cache.

`src/lib/storage.ts` expose l’interface `PrivateStorage` pour un futur stockage S3 privé. Le stockage local nécessite un volume persistant. La version initiale ne comporte pas d’analyse antivirus ni de conversion vidéo. Les visualisations s’ouvrent via un endpoint authentifié et une politique de sandbox navigateur.

## Mot de passe oublié et équipe

Le client peut demander une réinitialisation. Un administrateur vérifie son identité, puis génère un lien à usage unique valable 30 minutes dans `/admin/parametres`. La transmission au client est manuelle. Aucun prestataire SMS ou email n’est configuré et aucun faux envoi n’est annoncé.

Pour ajouter un administrateur ou un expert, renseigner temporairement `STAFF_PHONE`, `STAFF_NAME`, `STAFF_PASSWORD`, `STAFF_ROLE` dans l’environnement et lancer :

```sh
npm run staff:create
```

Ne pas stocker de secrets dans les scripts ou l’historique du terminal. Le changement de rôle n’est pas proposé dans l’interface publique. `npm run db:maintenance` nettoie les sessions et jetons expirés ; cette commande peut être planifiée quotidiennement.

## Vérifications

```sh
npm test
npm run typecheck
npm run build
npm audit --omit=dev
npx playwright install chromium
npm run test:e2e
```

Les tests Playwright nécessitent une application démarrée à `APP_URL` avec la même `DATABASE_URL`. Ils créent des comptes QA aléatoires, exercent les vrais formulaires et les vraies requêtes PostgreSQL, puis suppriment leurs propres données. Ne pas les exécuter sur une base de production. Les captures et traces se trouvent dans `test-results/` (ignoré par Git).

Couverture : normalisation des téléphones, validation métier, limites bcrypt, trois formulaires, compte existant, historique réel, changement de statut visible côté client, messages, notes confidentielles, fichiers valides/invalides, isolation des clients, restrictions expert, recherche serveur, contact, réinitialisation, responsive 390/768/1366/1920 px.

## Déploiement

`DEPLOIEMENT.md` décrit la mise en ligne sur un VPS avec Docker. `compose.prod.yaml` lance le proxy HTTPS (Caddy), l’application et PostgreSQL, applique les migrations au démarrage et conserve la base et les documents sur des volumes. La configuration de production part de `.env.production.example`.

## Configuration avant ouverture publique

- Renseigner l’administrateur et les véritables coordonnées `CONTACT_PHONE`, `CONTACT_WHATSAPP`, `CONTACT_EMAIL`. Les liens restent masqués tant qu’ils sont vides.
- Compléter les informations de l’exploitant et les règles de conservation de la page de confidentialité.
- Configurer `APP_URL`, HTTPS, sauvegardes PostgreSQL et stockage persistant privé. En production les cookies Secure exigent HTTPS.
- Configurer le proxy de confiance et une limite de requête adaptée aux uploads ; fixer la clé `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` si plusieurs instances Next.js sont déployées.
- Exécuter `npm run db:migrate` à chaque déploiement, puis `npm run build` et `npm start`. Les secrets ne doivent jamais être inclus dans une image publique.

La page paramètres permet de voir l’équipe et de traiter les réinitialisations ; les réglages d’infrastructure et coordonnées publiques restent gérés par environnement. Le statut de contact « Converti en dossier » qualifie le suivi commercial, sans créer automatiquement un compte à la place du client.

Références techniques : [authentification Next.js](https://nextjs.org/docs/app/guides/authentication), [cookies serveur](https://nextjs.org/docs/app/api-reference/functions/cookies), [migrations Prisma 6](https://docs.prisma.io/docs/orm/v6/prisma-migrate/getting-started).
