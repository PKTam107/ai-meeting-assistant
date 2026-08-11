#!/usr/bin/env bash
#
# Install and configure PostgreSQL for local development on Ubuntu / WSL.
#
# Docker is not available in this WSL setup, so Postgres runs natively under
# systemd instead of docker-compose. Credentials are read from
# apps/api/.env so this script and the app can never drift apart.
#
#   sudo ./scripts/setup-dev-db.sh
#
# Safe to re-run: every step checks before it acts.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$REPO_ROOT/apps/api/.env"

if [ "$(id -u)" -ne 0 ]; then
  echo "This script installs system packages — run it with sudo." >&2
  exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing $ENV_FILE — copy apps/api/.env.example to .env first." >&2
  exit 1
fi

# Parse DATABASE_URL: postgresql://USER:PASS@HOST:PORT/DBNAME?schema=public
DATABASE_URL="$(grep -E '^DATABASE_URL=' "$ENV_FILE" | head -1 | cut -d= -f2- | tr -d '"'"'")"

if [ -z "$DATABASE_URL" ]; then
  echo "No DATABASE_URL found in $ENV_FILE." >&2
  exit 1
fi

after_proto="${DATABASE_URL#*://}"
credentials="${after_proto%%@*}"
DB_USER="${credentials%%:*}"
DB_PASS="${credentials#*:}"
after_host="${after_proto#*/}"
DB_NAME="${after_host%%\?*}"

# A quote in the password would break the ALTER ROLE literal below. Dev-only
# script, so fail loudly rather than trying to escape it.
case "$DB_PASS" in
  *"'"*) echo "Password contains a single quote — not supported here." >&2; exit 1 ;;
esac

echo "==> Installing PostgreSQL"
apt-get update -qq
apt-get install -y -qq postgresql postgresql-contrib

echo "==> Enabling the service"
systemctl enable --now postgresql

echo "==> Ensuring role '$DB_USER' exists with the password from .env"
role_exists="$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'")"
if [ "$role_exists" != "1" ]; then
  sudo -u postgres createuser --superuser "$DB_USER"
fi
sudo -u postgres psql -q -v ON_ERROR_STOP=1 \
  -c "ALTER ROLE \"$DB_USER\" WITH LOGIN PASSWORD '$DB_PASS';"

echo "==> Ensuring database '$DB_NAME' exists"
db_exists="$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'")"
if [ "$db_exists" != "1" ]; then
  sudo -u postgres createdb -O "$DB_USER" "$DB_NAME"
fi

echo "==> Verifying the app's own connection string works"
PGPASSWORD="$DB_PASS" psql -h localhost -U "$DB_USER" -d "$DB_NAME" -c '\q'

echo
echo "PostgreSQL is ready. Next:"
echo "  cd apps/api && pnpm prisma migrate deploy && pnpm prisma generate"
