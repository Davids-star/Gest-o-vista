#!/usr/bin/env bash
# Restaura um backup no banco dedicado do GP (container gp_postgres_db).
# Uso: ./restore.sh backups/sistema_producao_20260830_120000.sql
set -euo pipefail
cd "$(dirname "$0")"
set -a; source .env; set +a

FILE="${1:-}"
if [ -z "$FILE" ] || [ ! -f "$FILE" ]; then
  echo "Uso: ./restore.sh <arquivo.sql>"
  echo "Arquivos disponíveis em backups/:"
  ls -1 backups/ 2>/dev/null || echo "  (nenhum)"
  exit 1
fi

echo "⚠️  Isso vai sobrescrever dados existentes em '$DB_NAME'. Ctrl+C para cancelar."
sleep 5

cat "$FILE" | docker exec -i gp_postgres_db psql -U "$DB_USERNAME" -d "$DB_NAME"

echo "✅ Restore concluído a partir de: $FILE"
