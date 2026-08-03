# Rikkei Document Management — Deployment Guide

Production deployment cho hệ thống quản lý tài liệu nội bộ (~50 users, self-hosted).

> **Updated 2026-08-04** — Plan 15 deploy. Sử dụng multi-stage Dockerfile, docker-compose.prod.yml overrides, Nginx + Let's Encrypt, và script `deploy.sh` tự động hoá.

## 🏗️ Production Architecture

```
                          ┌─────────────────┐
                          │   Cloudflare    │ (optional)
                          │  (DNS + CDN)    │
                          └────────┬────────┘
                                   │
                          ┌────────▼────────┐
                          │   Nginx (LB)    │ Let's Encrypt SSL
                          │   + security    │ rate limit, gzip
                          └────────┬────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              │                    │                    │
     ┌────────▼────────┐  ┌────────▼────────┐  ┌────────▼────────┐
     │  web (Next.js)  │  │ ai-pipeline     │  │  mcp-server     │
     │  Port 3000      │  │ (FastAPI)       │  │  (stdio)        │
     │  standalone     │  │ Port 8000       │  │                 │
     └────────┬────────┘  └────────┬────────┘  └─────────────────┘
              │                    │
              └─────────┬──────────┘
                        │
              ┌─────────▼──────────┐
              │  Postgres 16       │
              │  Port 5432 (local) │ scram-sha-256
              │  Persistent volume │
              └────────────────────┘

       ┌────────────────────┐
       │  Ollama            │ CPU only (16GB+ RAM)
       │  Port 11434 (local)│ profile: ai
       └────────────────────┘
```

## 📋 Prerequisites

- **Server**: Linux (Ubuntu 22.04 LTS recommended)
- **CPU**: 4 cores minimum (8 for AI + MCP)
- **RAM**: **16GB minimum** (qwen2.5:7b ~5GB + web + postgres)
- **Disk**: 100GB+ SSD (20GB Postgres, 30GB uploads, 5GB Ollama, buffer cho backup)
- **Domain**: HTTPS bắt buộc (Let's Encrypt miễn phí)
- **DNS**: A record `@` và `www` trỏ về IP server
- **VPS provider**: VNHOST, AZDIGI, Vinahost (Việt Nam) hoặc DO/Vultr/Hetzner (quốc tế)

## 🚀 Deployment Steps (lần đầu)

### 1. Chuẩn bị VPS

```bash
# SSH vào server (Ubuntu 22.04, 16GB RAM)
ssh root@<IP_VPS>

# Update + cài Docker
apt update && apt -y upgrade
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
apt install -y docker-compose-plugin

# Verify
docker --version
docker compose version
```

### 2. Mua domain + trỏ DNS

Ở nhà cung cấp domain (Namecheap, Tenten, Pavietnam, v.v.):
- Tạo A record: `@` → `<IP_VPS>`
- Tạo A record: `www` → `<IP_VPS>`

Đợi 5-30 phút để DNS propagate. Test: `dig <DOMAIN>` (Linux) hoặc `nslookup <DOMAIN>` (Windows).

### 3. Clone repo

```bash
mkdir -p /opt && cd /opt
git clone <repo-url> rikkei-docs
cd rikkei-docs
```

### 4. Generate secrets

```bash
bash scripts/generate-secrets.sh
# Output:
#   POSTGRES_PASSWORD=xxxx
#   AUTH_SECRET=xxxx
#   MCP_API_KEY=xxxx
```

### 5. Tạo `.env.production`

```bash
cp .env.production.example .env.production
nano .env.production   # điền DOMAIN, ADMIN_EMAIL, ADMIN_PASSWORD, và paste 3 secret từ bước 4
```

**Bắt buộc**:
- `DOMAIN` = domain thật (vd `docs.rikkei.edu.vn`)
- `NEXTAUTH_URL` = `https://${DOMAIN}`
- `AUTH_SECRET` ≥ 32 chars
- `POSTGRES_PASSWORD` ≥ 12 chars
- `ADMIN_PASSWORD` ≥ 12 chars

### 6. Cài Nginx + Let's Encrypt

```bash
apt install -y nginx certbot python3-certbot-nginx
systemctl enable nginx
```

Cấu hình Nginx trước (để certbot có thể verify domain):

```bash
# Sửa DOMAIN trong file nginx config
sed -i "s/DOMAIN_PLACEHOLDER/${DOMAIN}/g" nginx/rikkei.conf

# Copy vào Nginx
cp nginx/rikkei.conf /etc/nginx/sites-available/rikkei
ln -sf /etc/nginx/sites-available/rikkei /etc/nginx/sites-enabled/rikkei
rm -f /etc/nginx/sites-enabled/default

# Test + reload
nginx -t
systemctl reload nginx
```

Issue SSL certificate:

```bash
certbot --nginx -d ${DOMAIN} -d www.${DOMAIN}
# Chọn: redirect HTTP → HTTPS (option 2)
```

Cert sẽ tự động renew (systemd timer + certbot hook).

### 7. Deploy

```bash
bash scripts/deploy.sh
```

Script sẽ tự động:
1. Pull code mới nhất
2. Build Docker image (multi-stage)
3. Khởi động postgres + web
4. Chạy `prisma migrate deploy`
5. Seed admin user (idempotent)
6. Verify `/api/health`
7. Khởi động Ollama + AI pipeline (nếu `ENABLE_AI=true`)
8. Khởi động MCP server (nếu `ENABLE_MCP=true`)

### 8. Verify

```bash
# Health check
curl -I https://${DOMAIN}
curl https://${DOMAIN}/api/health
# → {"status":"ok","db":"ok","uptime":42,"responseTimeMs":15,"timestamp":"..."}

# Mở browser
# → Login với ADMIN_EMAIL + ADMIN_PASSWORD
# → Upload 1 file PDF nhỏ
# → Status chuyển parsing → published

# AI (nếu bật profile)
docker exec rikkei-ollama ollama list  # check model đã pull
# Upload file → đợi 5-30 phút (CPU only) → có summary + outline
```

### 9. Bật AI / MCP (optional)

Sửa `.env.production`:
```bash
ENABLE_AI=true
ENABLE_MCP=true   # optional
```

Sau đó:
```bash
bash scripts/deploy.sh
```

## 🔄 Re-deploy (cập nhật code)

```bash
cd /opt/rikkei-docs
git pull
bash scripts/deploy.sh
```

Script idempotent — an toàn chạy nhiều lần.

## 💾 Backup

### Manual (chạy từ host)

```bash
bash scripts/backup.sh
# → /backups/rikkei-YYYYMMDD-HHMMSS.tar.gz (postgres + uploads + manifest)
```

### On-demand qua app UI

Đăng nhập admin → **Admin → Backup** → click "Create backup". Action gọi `scripts/backup.js` trong container, retention 30 ngày.

### Tự động (optional — thêm sau nếu cần)

Tạo systemd timer:

```bash
cat > /etc/systemd/system/rikkei-backup.timer <<'EOF'
[Unit]
Description=Daily Rikkei backup

[Timer]
OnCalendar=daily
Persistent=true

[Install]
WantedBy=timers.target
EOF

cat > /etc/systemd/system/rikkei-backup.service <<'EOF'
[Unit]
Description=Daily Rikkei backup

[Service]
Type=oneshot
WorkingDirectory=/opt/rikkei-docs
ExecStart=/usr/bin/bash /opt/rikkei-docs/scripts/backup.sh
EOF

systemctl daemon-reload
systemctl enable --now rikkei-backup.timer
```

Verify: `systemctl list-timers | grep rikkei`

## 🔧 Useful commands

```bash
# Xem trạng thái
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps

# Logs (real-time)
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f web

# Restart 1 service
docker compose -f docker-compose.yml -f docker-compose.prod.yml restart web

# Vào container
docker exec -it rikkei-web sh

# Database CLI
docker exec -it rikkei-postgres psql -U rikkei -d rikkei_docs

# Resource usage
docker stats
```

## 🔐 Security Checklist (production)

- [x] HTTPS enabled (Let's Encrypt, auto-renew)
- [x] Strong `AUTH_SECRET` (32+ chars random)
- [x] Strong `POSTGRES_PASSWORD` (12+ chars)
- [x] `POSTGRES_HOST_AUTH_METHOD=scram-sha-256`
- [x] Postgres bind 127.0.0.1 only (no public exposure)
- [x] Ollama bind 127.0.0.1 only (no public exposure)
- [x] NextAuth `trustHost: true` (works behind Nginx)
- [x] Cookie `secure` flag in production
- [x] Next.js standalone output (no dev source leak)
- [x] Security headers (HSTS, X-Frame-Options, X-Content-Type-Options)
- [x] `client_max_body_size 50M` (prevents DoS via huge uploads)
- [x] Rate limiting on auth, change-password, user-create APIs
- [x] Seed admin password from env (never hardcoded)
- [x] Healthcheck endpoint at `/api/health`
- [x] Resource limits per service (`mem_limit` in prod compose)

## 🚨 Disaster Recovery

### Restore Postgres từ backup

```bash
# Từ file backup (.tar.gz đã có postgres.sql.gz bên trong)
tar xzf rikkei-latest.tar.gz
gunzip -c rikkei-*/postgres.sql.gz | docker exec -i rikkei-postgres psql -U rikkei -d rikkei_docs
```

### Restore uploads

```bash
docker run --rm \
  -v rikkei_uploads_data:/target \
  -v /backups:/backup:ro \
  alpine tar xzf /backup/rikkei-latest.tar.gz -C /target \
  rikkei-*/uploads.tar.gz --strip-components=1
```

(hoặc giải nén thủ công rồi copy)

### Reset toàn bộ (⚠️ xoá data)

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml down -v
bash scripts/deploy.sh
```

## 🆘 Troubleshooting

### Health check fails sau deploy

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs web | tail -50
# Thường do:
# - AUTH_SECRET chưa set / quá ngắn
# - DATABASE_URL sai
# - Postgres chưa healthy
```

### `certbot` fail

```bash
# Check DNS đã resolve chưa
dig ${DOMAIN}
# Check Nginx config
nginx -t
systemctl status nginx
```

### AI pipeline timeout

```bash
# Check Ollama
docker exec rikkei-ollama ollama list

# Tăng timeout (mặc định 600s) — sửa apps/ai-pipeline/main.py:36
OLLAMA_TIMEOUT = 1800  # 30 phút

# Rebuild + restart
docker compose -f docker-compose.yml -f docker-compose.prod.yml build ai-pipeline
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d ai-pipeline
```

### Upload fail với file lớn

Check Nginx:
```bash
grep client_max_body_size /etc/nginx/sites-available/rikkei
# Phải là 50M (match next.config.ts serverActions.bodySizeLimit)
```

### Disk đầy

```bash
# Check backup dir
du -sh /backups
# Cleanup thủ công
find /backups -name "rikkei-*.tar.gz" -mtime +30 -delete

# Check uploads
du -sh /var/lib/docker/volumes/rikkei_uploads_data
```

## 📊 Monitoring

### Health endpoint (cho uptime monitor)

```bash
curl https://${DOMAIN}/api/health
# Trả {status, db, uptime, responseTimeMs, timestamp}
# HTTP 200 nếu OK, 503 nếu degraded
```

Có thể setup UptimeRobot / Betterstack / Healthchecks.io monitor endpoint này.

### Resource monitoring

```bash
# Real-time
docker stats

# Disk
df -h

# Memory
free -h

# Logs
journalctl -u nginx -f
```

### Backup verification

```bash
# Check backup mới nhất
ls -lh /backups/rikkei-latest.tar.gz
tar tzf /backups/rikkei-latest.tar.gz | head  # list contents
```

## 📞 Support

- Repo issues: liên hệ team dev Rikkei Education
- Internal Slack: `#rikkei-docs`
- Email: `dev@rikkei.edu.vn`

---

**Last updated**: 2026-08-04 (Plan 15)
**Applies to**: Plan 1-14 + Plan 15 (deploy production)