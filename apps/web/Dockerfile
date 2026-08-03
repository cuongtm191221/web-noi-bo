# Single-stage Dockerfile for Next.js (dev / production both)
# For production: use output: 'standalone' in next.config.ts (already set)
# and deploy with docker-compose.prod.yml
FROM node:24-alpine

# Install openssl for Prisma
RUN apk add --no-cache openssl

# Enable pnpm via corepack (no-op if not used)
RUN corepack enable

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.base.json ./
COPY apps/web/package*.json ./apps/web/
COPY apps/web/tsconfig.json ./apps/web/
COPY apps/web/next.config.ts ./apps/web/
# next-env.d.ts is auto-generated, may not exist on first checkout
COPY apps/web/next-env.d.ts* ./apps/web/

# Install dependencies
RUN npm install --no-audit --no-fund

# Copy source (dev mode mounts volume to override this for hot-reload)
COPY apps/web ./apps/web

EXPOSE 3000

# Default CMD (overridden by docker-compose.yml command for dev mode)
# Production: docker-compose.prod.yml uses ["npx", "prisma", "migrate", "deploy", "--schema=./apps/web/prisma/schema.prisma", "&&", "node", "apps/web/server.js"]
CMD ["sh", "-c", "npx prisma generate --schema=./apps/web/prisma/schema.prisma && npm run dev --workspace=apps/web"]