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

Le seed nécessite `ADMIN_PHONE`, `ADMIN_NAME` et `ADMIN_PASSWORD` (12 caractères minimum, 72 octets maximum). `ADMIN_USERNAME`, facultatif, donne à l’administrateur un identifiant de connexion à la place du téléphone. Le seed ne modifie jamais un compte déjà présent et refuse de transformer un client en administrateur.

Le serveur fait la même chose à chaque démarrage (`src/instrumentation.ts`, `src/lib/first-admin.ts`) : si ces variables sont définies et qu’aucun compte n’a ce téléphone, il crée l’administrateur. Un hébergeur où personne ne lance le seed, comme Railway, n’a donc qu’à recevoir ces variables. Un compte existant n’est jamais modifié : un mot de passe changé ensuite dans l’administration reste valable. Une variable incomplète ou invalide est signalée dans les journaux, sans empêcher le site de démarrer.

Pour l’instance locale préparée pendant la réalisation : PostgreSQL utilise **55438**, l’application **http://127.0.0.1:3018**. Lancer `npm run dev -- --port 3018` et conserver la même origine dans `APP_URL`. `.env` contient déjà le mot de passe aléatoire de cette base de développement. Le premier administrateur doit être renseigné par l’exploitant ; les comptes QA des tests sont supprimés après vérification.

## Parcours

- Site public : accueil, services, à propos, contact et trois pages métier.
- Chaque page métier propose un formulaire en étapes, validé dans le navigateur et au serveur. Les questions fermées se répondent par oui ou non : le choix « Je ne sais pas » n’est plus proposé.
- À l’étape « Documents », chaque type de document coché affiche un champ pour joindre les fichiers correspondants (JPEG, PNG, WebP, PDF, MP4 ou MOV ; 20 Mo par fichier, 10 fichiers au total). Le choix « Aucun… » décoche les autres et n’affiche aucun champ. Les fichiers restent dans le navigateur jusqu’à la création du dossier, puis sont envoyés un par un à `/api/documents`, classés selon le type coché. Un fichier refusé ou interrompu est signalé dans la fenêtre de confirmation, où il peut être renvoyé ; il ne remet pas en cause le dossier.
- La soumission crée dans une transaction le compte client, le dossier et son premier historique. Les numéros marocains sont normalisés au format `+212…`.
- Pour un compte existant, une fenêtre de connexion s’ouvre sur le formulaire : l’utilisateur s’authentifie sans perdre ses réponses et le dossier est ajouté à son compte. Aucun deuxième compte n’est créé.
- Une fenêtre de confirmation, avec la référence du dossier, ne s’affiche qu’après l’enregistrement réel en base.
- Un membre de l’équipe connecté dans le même navigateur est traité comme un visiteur par le formulaire : le dossier est créé pour le client indiqué, et le navigateur passe sur ce compte client.
- Le client se connecte par téléphone sur `/connexion` (« Suivre mon dossier »), suit ses dossiers, transmet des documents et échange avec l’équipe.
- Quand l’équipe demande un document, le client n’a pas besoin d’ouvrir son dossier pour le savoir : en haut de chaque page de son espace (sauf la page du dossier, dont le bandeau le dit déjà), un message liste les documents attendus, dossier par dossier, avec un bouton qui mène au formulaire d’envoi du dossier (`src/components/awaited-documents.tsx`), et « Mes dossiers » porte une pastille rouge avec leur nombre. Le message disparaît, sans recharger la page, quand l’équipe a vérifié les documents ; un dossier terminé, annulé ou archivé ne demande plus rien.
- L’équipe se connecte sur une page distincte, `/admin/connexion` (`/admin` y conduit), avec un identifiant (3 à 32 lettres, chiffres, points ou tirets, insensible à la casse) ou le téléphone du compte. Chaque page n’ouvre que son type de compte : un compte d’équipe est refusé sur la page client, un compte client sur la page d’équipe, avec la même réponse que pour un mot de passe erroné. La déconnexion ramène à la page de connexion de l’espace quitté.
- Les administrateurs filtrent les dossiers en base, changent les statuts et demandent des pièces ; la liste de statut d’un dossier affiche toujours le statut enregistré. Les experts ne voient que les dossiers qui leur sont assignés. La page d’un dossier ne propose plus d’assigner un responsable ni de notes internes : l’assignation (`assignedTo`) ne se fait plus depuis l’interface.
- La page d’un dossier (`src/components/dossier-detail.tsx`), commune à l’équipe et au client, s’ouvre sur un bandeau : référence, service, lieu, dates, statut, et les cinq étapes du parcours — Réception, Étude, Expertise, Rapport, Terminé. `statusStages` (`src/lib/constants.ts`) range chaque statut dans une étape ; un dossier annulé ou archivé garde les étapes franchies, sans étape en cours. Le bandeau donne à l’équipe le client et les liens pour le joindre (téléphone, WhatsApp, email, fiche client) ; au client, les documents que l’équipe attend, avec un lien vers l’envoi d’un fichier. Une barre qui reste visible pendant le défilement (`src/components/section-nav.tsx`) mène à chaque partie de la page et marque celle qui est lue. L’équipe lit d’abord la demande, le client d’abord ses documents et ses échanges ; à droite, le changement de statut (équipe) et l’historique des statuts, le plus récent en premier. Les réponses du formulaire sont présentées par section, deux par ligne. La partie Documents réunit les documents demandés (ceux en attente d’abord), la demande d’une nouvelle pièce par l’équipe, les fichiers et l’ajout d’un fichier : la zone d’envoi accepte un clic ou un fichier déposé et nomme le fichier choisi. Le journal des actions, réservé à l’équipe, nomme le document vérifié et replie les actions les plus anciennes. Sur un écran étroit la page passe en une colonne ; le client y lit l’avancement en premier.
- La page Demandes de contact de l’administration classe les demandes par statut (onglets avec compteurs). Chaque demande présente son message, les liens pour appeler, écrire sur WhatsApp ou par email, la date de réception et son statut, modifiable sur place ; une nouvelle demande est mise en avant.
- La page Documents, dans l’espace client comme dans l’administration, classe les pièces par dossier (le dossier qui a reçu une pièce en dernier d’abord) : catégorie, format, taille, déposant, date et heure. Tout fichier s’ouvre dans une fenêtre d’aperçu qui propose aussi le téléchargement : une image, une vidéo dans son lecteur, un PDF dans le lecteur du site lui-même (PDF.js, `src/components/pdf-view.tsx` : pages dessinées à la demande, numéro de page, zoom), qui ne dépend ni du lecteur PDF du navigateur ni de ses réglages. La page d’un dossier utilise la même fenêtre. Un client lit « Vous » ou « Équipe Monsinistre », jamais le nom d’un membre de l’équipe. Dans l’administration, une barre de recherche filtre les fichiers : chaque mot saisi doit se trouver dans le fichier (nom, catégorie, format, déposant) ou dans son dossier (référence, service, client, téléphone, commerce), sans tenir compte des majuscules ni des accents.
- Le menu de l’administration porte, à droite du bouton de chaque page, une pastille rouge : les nouveaux dossiers (statut « Nouveau » seulement : une demande arrivée « À vérifier » n’est pas comptée ; le compteur baisse dès qu’un dossier change de statut), les nouvelles demandes de contact, et pour Paramètres les demandes de réinitialisation auxquelles aucun lien n’a encore été délivré. Les compteurs se mettent à jour en direct (`src/lib/pending.ts`, `/api/updates`).
- Les demandes non assurées, clôturées ou ayant une décision définitive sont enregistrées avec des indications de revue humaine.
- Une vérification légère toutes les deux secondes détecte les modifications et actualise l’espace ouvert. Aucun avancement n’est inventé.

Les références `MS-AAAA-000001` utilisent une séquence PostgreSQL globale. Elles sont attribuées dans la transaction et sont distinctes de l’identifiant interne. La séquence ne redémarre pas au changement d’année ; des trous après rollback ou suppression de tests sont normaux.

## Structure

```text
content/                     Sources éditoriales métier originales
prisma/schema.prisma         Modèles, relations et index
prisma/migrations/           Migration SQL PostgreSQL versionnée
prisma/seed.ts               Premier administrateur depuis l’environnement
src/app/(public)/            Site public et connexion des clients
src/app/mon-espace/           Portail client protégé
src/app/admin/connexion/      Connexion de l’équipe
src/app/admin/(espace)/       Administration et espace expert, protégés
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
| Statuts et demandes de pièces | Non | Assignés | Tous |
| Supprimer un document | Non | Non | Oui |
| Clients, contacts et réinitialisations | Non | Non | Oui |

Les sessions sont des jetons aléatoires de 256 bits dont seul le SHA-256 est enregistré en base. Cookie HttpOnly, SameSite=Lax, Secure en production, durée de sept jours. Les sessions sont renouvelées à la connexion et invalidées lors d’une réinitialisation. Bcrypt utilise un coût de 12 ; les entrées dépassant 72 octets sont refusées à la création.

Chaque action vérifie l’identité et les droits côté serveur. Les hashes de mots de passe ne sont pas transmis aux composants client. Les mutations de dossier sont sérialisées par un verrou de ligne PostgreSQL pour garantir un historique ancien/nouveau cohérent. La clé de soumission unique et le verrou frontend empêchent les doublons.

La limitation de tentatives utilise PostgreSQL, donc fonctionne entre plusieurs processus. Pour une connexion par identifiant, les tentatives sont comptées par adresse (8 par quart d’heure), avec un plafond global de 200 : un identifiant devinable ne permet pas à un tiers de bloquer son titulaire depuis une autre adresse. Par défaut `TRUST_PROXY=false` applique un quota réseau partagé en développement, complété par un quota par téléphone/utilisateur. En production, n’activer `TRUST_PROXY=true` que si un reverse proxy de confiance écrase `X-Forwarded-For` et interdit l’accès direct au serveur.

La protection d’origine Next.js couvre les Server Actions. Les endpoints de modification des fichiers appliquent la même règle (`src/lib/origin.ts`) : l’hôte de l’en-tête `Origin` doit être celui auquel la requête est arrivée (`X-Forwarded-Host` derrière un proxy, sinon `Host`) ou celui d’`APP_URL` ; une requête sans `Origin` est refusée. Le site peut donc être ouvert indifféremment sous `localhost` ou `127.0.0.1` en développement, ou sous un second domaine en production, sans que l’envoi de fichiers soit refusé. Les uploads sont lus avec une limite effective de 20 Mo, puis leur signature binaire est vérifiée (JPEG, PNG, WebP, PDF, MP4, MOV). Les noms de stockage sont aléatoires et les fichiers ne sont jamais placés dans `public/`. Les réponses de téléchargement sont privées et non mises en cache. Un fichier demandé en aperçu (`?preview=1`) ne peut rien exécuter ni charger d’autre que lui-même (`next.config.ts`) et, comme un téléchargement, ne peut pas être encadré. Les fichiers de données du lecteur PDF (décodeurs d’images, polices standard) sont servis depuis le paquet `pdfjs-dist` par `/pdfjs/…`. Les lectures partielles (`Range`) sont servies pour la lecture des vidéos.

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

Couverture : normalisation des téléphones, validation métier, limites bcrypt, trois formulaires, compte existant, historique réel, changement de statut visible côté client, messages, fichiers valides/invalides, isolation des clients, restrictions expert, recherche serveur, contact, réinitialisation, responsive 390/768/1366/1920 px.

## Déploiement

Sur Railway, le site est reconstruit à chaque envoi sur `main` ; les migrations sont appliquées au démarrage (`RUN_MIGRATIONS=true`). Variables du service de l’application : `DATABASE_URL` (référence au service PostgreSQL), `APP_URL` (l’adresse publique, en https), `RUN_MIGRATIONS=true`, `STORAGE_DIR` (le volume des documents), `TRUST_PROXY=true` pour compter les tentatives par visiteur et non pour tous à la fois, et `ADMIN_USERNAME`, `ADMIN_PHONE`, `ADMIN_NAME`, `ADMIN_PASSWORD` pour le premier administrateur, créé au démarrage suivant.

`DEPLOIEMENT.md` décrit la mise en ligne sur un VPS avec Docker. `compose.prod.yaml` lance le proxy HTTPS (Caddy), l’application et PostgreSQL, applique les migrations au démarrage et conserve la base et les documents sur des volumes. La configuration de production part de `.env.production.example`.

## Configuration avant ouverture publique

- Créer l’administrateur et renseigner les véritables coordonnées publiques dans `/admin/parametres` (ou par `CONTACT_PHONE`, `CONTACT_WHATSAPP`, `CONTACT_EMAIL`, utilisées tant que rien n’est enregistré). Les liens restent masqués tant qu’ils sont vides.
- Compléter les informations de l’exploitant et les règles de conservation de la page de confidentialité.
- Configurer `APP_URL`, HTTPS, sauvegardes PostgreSQL et stockage persistant privé. En production les cookies Secure exigent HTTPS.
- Configurer le proxy de confiance et une limite de requête adaptée aux uploads ; fixer la clé `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` si plusieurs instances Next.js sont déployées.
- Exécuter `npm run db:migrate` à chaque déploiement, puis `npm run build` et `npm start`. Les secrets ne doivent jamais être inclus dans une image publique.

La page paramètres, réservée à l’administrateur, range ses rubriques dans une liste latérale et n’en affiche qu’une à la fois (`?section=`) : le compte (identifiant de connexion, nom affiché), le mot de passe, les coordonnées publiques de la page Contact, et les demandes de réinitialisation (nom du titulaire du compte, date, état « À traiter », « Lien valable jusqu’à… » ou « Lien expiré »). Sans rubrique choisie, elle s’ouvre sur les demandes de réinitialisation s’il en reste à traiter, sinon sur le compte. Les coordonnées enregistrées là sont stockées en base (`site_settings`) et priment sur les variables d’environnement ; les réglages d’infrastructure restent gérés par environnement. Le statut de contact « Converti en dossier » qualifie le suivi commercial, sans créer automatiquement un compte à la place du client.

Références techniques : [authentification Next.js](https://nextjs.org/docs/app/guides/authentication), [cookies serveur](https://nextjs.org/docs/app/api-reference/functions/cookies), [migrations Prisma 6](https://docs.prisma.io/docs/orm/v6/prisma-migrate/getting-started).
