# Mettre Monsinistre en ligne sur un VPS Hostinger

Ce guide installe le site sur un serveur Hostinger avec trois services Docker : un proxy qui
gère HTTPS tout seul (Caddy), l’application, et la base PostgreSQL 17. Les documents des
clients et la base sont conservés sur des volumes du serveur ; ils survivent aux mises à jour.

Comptez environ 30 minutes. Les commandes sont à copier telles quelles ; seules les valeurs
en MAJUSCULES sont à remplacer.

## 1. Commander et préparer le VPS

Dans Hostinger, commander un **VPS** (et non un hébergement web) :

- **Offre** : KVM 2 (2 cœurs, 8 Go de mémoire) est confortable. KVM 1 (4 Go) suffit pour démarrer.
- **Emplacement** : France, le plus proche du Maroc.
- **Système** : dans le catalogue, choisir **Docker** (« Ubuntu 24.04 with Docker »).
- **Mot de passe root** : le choisir long et le noter.

Une fois le serveur prêt, relever dans hPanel → VPS → Vue d’ensemble :

- son **adresse IP** (par exemple `203.0.113.10`) ;
- son **nom d’hôte** (du type `srv123456.hstgr.cloud`). Il sert d’adresse provisoire tant que
  vous n’avez pas de nom de domaine.

Si vous activez le pare-feu de Hostinger (hPanel → VPS → Sécurité → Pare-feu), autorisez les
ports TCP 22, 80 et 443, et UDP 443.

## 2. Envoyer le projet sur le serveur

Sur votre Mac, dans le Terminal :

```sh
cd ~/Desktop/Monsinistre
rsync -az --delete \
  --exclude node_modules --exclude .next --exclude .env --exclude storage \
  --exclude backups --exclude test-results --exclude graphify-out --exclude .DS_Store \
  ./ root@ADRESSE_IP:/opt/monsinistre/
```

À la première connexion, répondre `yes` à la question sur l’empreinte, puis saisir le mot de
passe root. Votre fichier `.env` local (développement) n’est pas envoyé.

## 3. Configurer

Se connecter au serveur et créer la configuration de production :

```sh
ssh root@ADRESSE_IP
cd /opt/monsinistre
cp .env.production.example .env
sed -i "s/^POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=$(openssl rand -hex 24)/" .env
chmod 600 .env
nano .env
```

La troisième commande génère le mot de passe de la base. Dans `nano`, renseigner :

| Variable | Valeur |
| --- | --- |
| `DOMAIN` | Le nom d’hôte du VPS (`srv123456.hstgr.cloud`), sans `https://`. Vous le remplacerez par votre domaine à l’étape 6. |
| `ADMIN_PHONE` | Votre numéro marocain, par exemple `0612345678`. Ce sera votre identifiant. |
| `ADMIN_NAME` | Votre nom et prénom. |
| `ADMIN_PASSWORD` | 12 caractères minimum. Éviter les espaces et les caractères `$ " ' #`. |
| `CONTACT_PHONE`, `CONTACT_WHATSAPP`, `CONTACT_EMAIL` | Les coordonnées affichées sur la page Contact. Laissées vides, elles ne s’affichent pas. |

Enregistrer avec `Ctrl+O`, `Entrée`, puis quitter avec `Ctrl+X`.

## 4. Démarrer le site

```sh
docker compose -f compose.prod.yaml up -d --build
```

La première fois, la construction prend 5 à 10 minutes. Vérifier ensuite :

```sh
docker compose -f compose.prod.yaml ps
```

`app` doit afficher `healthy`, `caddy` et `db` doivent être `Up`, et `migrate` `Exited (0)` :
c’est lui qui crée les tables, puis il s’arrête.

Ouvrir `https://VOTRE_DOMAIN` dans un navigateur. Le certificat HTTPS est obtenu
automatiquement ; cela peut prendre une minute au premier accès.

## 5. Créer le premier administrateur

```sh
docker compose -f compose.prod.yaml run --rm tools npm run db:seed
```

La commande répond `Premier administrateur créé.` Se connecter sur `https://VOTRE_DOMAIN/connexion`
avec le téléphone et le mot de passe choisis. Une fois connecté, effacer la valeur de
`ADMIN_PASSWORD` dans `.env` (`nano .env`) : elle ne sert plus.

Pour ajouter plus tard un administrateur ou un expert, ajouter temporairement dans `.env` les
lignes `STAFF_PHONE`, `STAFF_NAME`, `STAFF_PASSWORD` et `STAFF_ROLE` (`ADMIN` ou `EXPERT`),
lancer la commande ci-dessous, puis retirer ces lignes :

```sh
docker compose -f compose.prod.yaml run --rm tools npm run staff:create
```

## 6. Brancher votre nom de domaine

Quand vous aurez un domaine :

1. Chez le gestionnaire du domaine, créer un enregistrement DNS de type **A** pour le nom
   voulu (`@` pour `exemple.ma`) pointant vers l’adresse IP du VPS.
2. Attendre que le nom réponde : `ping exemple.ma` doit afficher l’adresse IP du VPS.
3. Sur le serveur, remplacer la valeur de `DOMAIN` dans `.env`, puis :

```sh
docker compose -f compose.prod.yaml up -d
```

Le nouveau certificat est obtenu automatiquement. Les liens de réinitialisation de mot de
passe et les contrôles de sécurité utilisent aussitôt la nouvelle adresse.

Pour que `www.exemple.ma` redirige vers `exemple.ma`, créer aussi un enregistrement A pour
`www` et ajouter ce bloc à la fin de `deploy/Caddyfile` avant de relancer la commande :

```
www.{$DOMAIN} {
	redir https://{$DOMAIN}{uri} permanent
}
```

## 7. Mettre à jour le site

Depuis le Mac, renvoyer le projet avec la commande `rsync` de l’étape 2, puis sur le serveur :

```sh
cd /opt/monsinistre
docker compose -f compose.prod.yaml up -d --build
```

Les migrations de la base sont appliquées automatiquement. La base et les documents ne sont
pas touchés. Le site est indisponible quelques secondes pendant le redémarrage.

## 8. Sauvegardes

```sh
cd /opt/monsinistre
sh deploy/backup.sh
```

Le script écrit dans `backups/` une copie de la base et une archive des documents, et ne garde
que les 14 plus récentes. Pour le lancer chaque nuit à 3 h, et nettoyer les sessions expirées
à 3 h 30, ouvrir la table des tâches avec `crontab -e` et ajouter :

```
0 3 * * * cd /opt/monsinistre && sh deploy/backup.sh >> backups/sauvegarde.log 2>&1
30 3 * * * cd /opt/monsinistre && docker compose -f compose.prod.yaml run --rm tools npm run db:maintenance > /dev/null 2>&1
```

Une sauvegarde qui reste sur le serveur ne protège pas d’une panne du serveur. Rapatrier
régulièrement le dossier sur votre Mac :

```sh
rsync -az root@ADRESSE_IP:/opt/monsinistre/backups/ ~/Sauvegardes-Monsinistre/
```

Pour restaurer (remplacer les noms de fichiers par ceux de la sauvegarde voulue) :

```sh
docker compose -f compose.prod.yaml exec -T db \
  pg_restore -U monsinistre -d monsinistre --clean --if-exists < backups/base-DATE.dump
docker compose -f compose.prod.yaml exec -T app tar -xzf - -C /data < backups/documents-DATE.tar.gz
```

## 9. Commandes utiles

```sh
docker compose -f compose.prod.yaml logs -f app      # journal de l’application
docker compose -f compose.prod.yaml logs caddy       # journal du proxy et des certificats
docker compose -f compose.prod.yaml restart app      # redémarrer l’application
docker compose -f compose.prod.yaml down             # tout arrêter (les données sont conservées)
apt update && apt upgrade -y                         # mises à jour de sécurité du serveur
```

Ne jamais ajouter `-v` à `down` : cette option supprime la base et les documents.

## 10. Avant l’ouverture au public

- Remplacer l’adresse provisoire par votre nom de domaine (étape 6).
- Renseigner les coordonnées de la page Contact, puis reconstruire (étape 7).
- Compléter la page de confidentialité : informations de l’exploitant et durées de conservation.
- Vérifier qu’une sauvegarde a bien été créée et rapatriée (étape 8).
- Faire un essai complet : déposer une demande, joindre un document, la traiter côté administration.

## En cas de problème

| Symptôme | À vérifier |
| --- | --- |
| Le site ne répond pas | `docker compose -f compose.prod.yaml ps` ; les ports 80 et 443 dans le pare-feu ; `ping VOTRE_DOMAIN` doit donner l’adresse IP du VPS. |
| Avertissement de certificat | `docker compose -f compose.prod.yaml logs caddy`. Le nom indiqué dans `DOMAIN` doit pointer vers le serveur. |
| « Origine invalide » à l’envoi d’un document | `DOMAIN` ne correspond pas à l’adresse utilisée dans le navigateur. |
| `app` ne devient pas `healthy` | `docker compose -f compose.prod.yaml logs app migrate`. |
| Les coordonnées de contact n’apparaissent pas | Elles sont lues à la construction : relancer avec `--build`. |
