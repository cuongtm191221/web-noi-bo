# Rikkei Document Management — Deployment Guide

Production deployment cho hệ thống quản lý tài liệu nội bộ.

## 🏗️ Production Architecture

```
                          ┌─────────────────┐
                          │   Cloudflare    │
                          │  (DNS + SSL)    │
                          └────────┬────────┘
                                   │
                          ┌────────▼────────┐
                          │   Nginx (LB)    │
                          │   + SSL term    │
                          └────────┬────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              │                    │                    │
     ┌────────▼────────┐  ┌────────▼────────┐  ┌────────▼────────┐
     │  web (Next.js)  │  │ ai-pipeline     │  │  mcp-server     │
     │  Port 3000      │  │ (FastAPI)       │  │  (stdio)        │
     │                 │  │ Port 8000       │  │                 │
     └────────┬────────┘  └────────┬────────┘  └─────────────────┘
              │                    │
              └─────────┬──────────┘
                        │
              ┌─────────▼──────────┐
              │  Postgres 16       │
              │  Port 5432         │
              │  Persistent volume │
              └────────────────────┘

       ┌────────────────────┐
       │  Ollama            │
       │  (separate host)   │
       │  Port 11434        │
       │  GPU recommended   │
       └────────────────────┘
```

## 📋 Prerequisites

- **Server**: Linux (Ubuntu 22.04 LTS recommended)
- **CPU**: 4 cores minimum (8 for AI + MCP)
- **RAM**: 8GB minimum (16GB recommended)
- **Disk**: 100GB+ (50GB for Ollama model, 20GB Postgres, 30GB uploads)
- **GPU** (optional but recommended): NVIDIA GPU with 8GB+ VRAM
- **Domain**: HTTPS required (Let's Encrypt or Cloudflare)
- **DNS**: A record pointing to server IP

## 🚀 Deployment Steps

### 1. Clone repo

```bash
git clone <repo-url>
cd web-noi-bo
```

### 2. Configure environment

Create production `.env`:

```bash
# Postgres
POSTGRES_USER=rikkei
POSTGRES_PASSWORD=<strong-random-password>
POSTGRES_DB=rikkei_docs

# Auth
AUTH_SECRET=<32-char-random-string>  # openssl rand -base64 32
AUTH_URL=https://your-domain.com

# Next.js
NEXT_PUBLIC_APP_URL=https://your-domain.com

# MCP Server
MCP_API_KEY=<32-char-random-string>  # openssl rand -base64 32
```

Generate secrets:
```bash
openssl rand -base64 32  # for AUTH_SECRET
openssl rand -base64 32  # for MCP_API_KEY
openssl rand -base64 16  # for POSTGRES_PASSWORD
```

### 3. Update docker-compose.yml

Edit `docker-compose.yml` to add production overrides:

```yaml
services:
  web:
    environment:
      - NODE_ENV=production
      - NEXTAUTH_URL=${AUTH_URL}
    restart: always

  postgres:
    environment:
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: always

  ai-pipeline:
    environment:
      - OLLAMA_HOST=${OLLAMA_HOST:-http://ollama:11434}
    restart: always
```

### 4. Start core services

```bash
docker compose up -d postgres web
```

### 5. Run migrations + seed

```bash
docker exec -it rikkei-web sh
cd apps/web
npx prisma migrate deploy
node scripts/seed.js
exit
```

### 6. Start AI pipeline (optional)

```bash
docker compose --profile ai up -d
docker compose --profile ai exec ollama ollama pull qwen2.5:7b
```

### 7. Start MCP server (optional)

```bash
docker compose --profile mcp up -d mcp-server
```

### 8. Configure Nginx reverse proxy

`/etc/nginx/sites-available/rikkei`:

```nginx
upstream rikkei_web {
    server localhost:3000;
}

upstream rikkei_ai {
    server localhost:8000;
}

server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Web app
    location / {
        proxy_pass http://rikkei_web;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # AI pipeline
    location /api/ai/ {
        proxy_pass http://rikkei_ai/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        client_max_body_size 50M;  # Allow large file uploads
    }

    # File uploads (50MB max)
    client_max_body_size 50M;
}
```

Enable:
```bash
sudo ln -s /etc/nginx/sites-available/rikkei /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 9. SSL with Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### 10. Configure backups

Postgres daily backup:
```bash
# /etc/cron.daily/rikkei-pg-backup
docker exec rikkei-postgres pg_dump -U rikkei rikkei_docs | gzip > /backups/postgres-$(date +\%Y\%m\%d).sql.gz
find /backups -name "postgres-*.sql.gz" -mtime +30 -delete
```

Uploads weekly backup:
```bash
# /etc/cron.weekly/rikkei-uploads-backup
docker run --rm -v rikkei_uploads:/uploads -v /backups:/backup alpine tar czf /backup/uploads-$(date +\%Y\%m\%d).tar.gz -C /uploads .
```

## 🔧 Environment-Specific Notes

### Ollama on separate host

For GPU-powered LLM:
```yaml
  ai-pipeline:
    environment:
      - OLLAMA_HOST=http://ollama-gpu.internal:11434
```

### Scaling web (load balancer)

Run multiple web instances behind Nginx:
```yaml
  web:
    deploy:
      replicas: 3
```

### MCP server exposed (rare)

MCP uses stdio, but you can wrap with HTTP-SSE bridge:
```bash
docker run --rm -p 8765:8765 mcp-proxy --stdio "docker exec -i rikkei-mcp-server python -m server"
```

## 📊 Monitoring

### Health checks

```bash
# Web
curl -I https://your-domain.com

# Postgres
docker exec rikkei-postgres pg_isready -U rikkei

# AI pipeline
curl http://localhost:8000/health

# Ollama
curl http://localhost:11434/api/tags
```

### Logs

```bash
docker compose logs web --tail 100
docker compose logs postgres --tail 100
docker compose --profile ai logs ai-pipeline --tail 100
```

### Resource monitoring

```bash
docker stats
```

## 🔐 Security Checklist

- [ ] HTTPS enabled (Let's Encrypt)
- [ ] Strong passwords for Postgres
- [ ] `AUTH_SECRET` randomly generated (32+ chars)
- [ ] `MCP_API_KEY` not shared publicly
- [ ] Postgres not exposed to public internet (only via Docker network)
- [ ] Uploads dir not web-accessible (Nginx doesn't serve /uploads/)
- [ ] Regular backups (Postgres + uploads)
- [ ] Firewall: only 80/443 open
- [ ] Non-root user in Docker (if possible)

## 🚨 Disaster Recovery

### Restore Postgres from backup

```bash
gunzip -c /backups/postgres-YYYYMMDD.sql.gz | \
  docker exec -i rikkei-postgres psql -U rikkei -d rikkei_docs
```

### Restore uploads

```bash
docker run --rm -v rikkei_uploads:/uploads -v /backups:/backup alpine \
  tar xzf /backup/uploads-YYYYMMDD.tar.gz -C /uploads
```

### Reset everything

```bash
docker compose down -v  # WARNING: deletes all data
docker compose up -d
```

## 🆘 Troubleshooting

### Web returns 500
- Check logs: `docker compose logs web`
- Verify Postgres reachable: `docker exec rikkei-postgres pg_isready`
- Run migrations: see Step 5

### AI pipeline timeout
- Check Ollama: `docker exec rikkei-ollama ollama list`
- Increase timeout in `apps/ai-pipeline/main.py` (default 600s)

### Uploads fail
- Check disk space: `df -h`
- Check Nginx config: `client_max_body_size 50M`

### Performance slow
- Add more CPU to Ollama host (GPU recommended)
- Increase Postgres shared_buffers (1/4 of RAM)
- Enable Nginx gzip compression

## 📞 Support

- Repo issues: https://github.com/your-org/rikkei-docs/issues
- Internal Slack: #rikkei-docs
- Email: dev@rikkei.edu.vn

---

**Last updated**: 2026-08-03
**Applies to**: Plan 1-8 (all current plans)