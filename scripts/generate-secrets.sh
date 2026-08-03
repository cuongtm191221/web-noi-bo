#!/usr/bin/env bash
# =============================================================
#  Generate random secrets for production .env
#  Usage: bash scripts/generate-secrets.sh
#  Output: prints 3 secrets to stdout, copy into .env.production
# =============================================================
set -euo pipefail

# Try to find openssl (Linux/Mac/Windows Git Bash)
if ! command -v openssl >/dev/null 2>&1; then
  echo "❌ openssl not found. Install OpenSSL or use Git Bash on Windows." >&2
  exit 1
fi

echo "# Generated secrets — $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "# Copy these into .env.production"
echo ""
echo "# Postgres password (24 chars)"
echo "POSTGRES_PASSWORD=$(openssl rand -base64 24 | tr -d '\n' | tr -d '=+/' | cut -c1-24)"
echo ""
echo "# NextAuth secret (32+ chars)"
echo "AUTH_SECRET=$(openssl rand -base64 32)"
echo ""
echo "# MCP API key (32+ chars)"
echo "MCP_API_KEY=$(openssl rand -base64 32)"
echo ""
echo "# ⚠️  Store these securely. Anyone with these values can access your data."