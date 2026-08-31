#!/usr/bin/env bash
# Backup do banco dedicado do GP (container gp_postgres_db).
# Uso: ./backup.sh
set -euo pipefail
cd "$(dirname "$0")"
set -a; source .env; set +a

mkdir -p backups
STAMP=$(date +%Y%m%d_%H%M%S)
OUT="backups/sistema_producao_${STAMP}.sql"

docker exec gp_postgres_db pg_dump -U "$DB_USERNAME" -d "$DB_NAME" --no-owner --no-privileges > "$OUT"

echo "✅ Backup salvo em: $OUT"
