#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "No se encontró .env. Copiá .env.example: cp .env.example .env"
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

if [[ -z "${DB_PASSWORD:-}" ]]; then
  echo "DB_PASSWORD no está definida en .env"
  exit 1
fi

echo "Esperando que SQL Server esté listo..."
for i in {1..30}; do
  if docker compose -f "$ROOT_DIR/docker-compose.yml" exec -T db \
    /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$DB_PASSWORD" -C -Q "SELECT 1" &>/dev/null; then
    break
  fi
  if [[ "$i" -eq 30 ]]; then
    echo "SQL Server no respondió. ¿Está corriendo? Ejecutá: docker compose up -d"
    exit 1
  fi
  sleep 2
done

run_sql() {
  local file="$1"
  echo "→ Ejecutando $(basename "$file")..."
  docker compose -f "$ROOT_DIR/docker-compose.yml" exec -T db \
    /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$DB_PASSWORD" -C -i "/scripts/$(basename "$file")"
}

run_sql "$ROOT_DIR/database/01_creacion_tablas.sql"
run_sql "$ROOT_DIR/database/02_datos_prueba.sql"

echo "Base de datos inicializada correctamente."
