#!/bin/sh
# Sauvegarde la base PostgreSQL et les documents privés dans le dossier backups/ du projet.
# À lancer sur le serveur :  sh deploy/backup.sh
set -eu
cd "$(dirname "$0")/.."
stamp=$(date +%Y%m%d-%H%M%S)
mkdir -p backups
chmod 700 backups
docker compose -f compose.prod.yaml exec -T db \
  pg_dump -U monsinistre --format=custom monsinistre > "backups/base-$stamp.dump"
docker compose -f compose.prod.yaml exec -T app \
  tar -czf - -C /data storage > "backups/documents-$stamp.tar.gz"
# Ne garder que les 14 sauvegardes les plus récentes de chaque type.
for kind in base documents; do
  ls -1t backups/$kind-* 2>/dev/null | tail -n +15 | while read -r old; do rm -f "$old"; done
done
echo "Sauvegarde terminée : backups/base-$stamp.dump et backups/documents-$stamp.tar.gz"
