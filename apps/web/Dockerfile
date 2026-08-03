# Multi-stage Dockerfile for Next.js (production)
# Stage 1: install deps + build
# Stage 2: minimal runtime image with standalone output

# ========== Stage 1: deps + build ==========
FROM node:24-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.base.json ./
COPY apps/web/package*.json ./apps/web/
COPY apps/web/tsconfig.json ./apps/web/
COPY apps/web/next.config.ts ./apps/web/
COPY apps/web/next-env.d.ts ./apps/web/ 2>/dev/null || true

# Install dependencies
RUN npm install --no-audit --no-fund

# Copy source
COPY apps/web ./apps/web

# Generate Prisma client (Linux musl)
RUN npx prisma generate --schema=./apps/web/prisma/schema.prisma

# Build Next.js
ENV NEXT_TELEMETRY_DISABLED=1
RUN cd apps/web && npm run build

# ========== Stage 2: runtime ==========
FROM node:24-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone build (includes minimal node_modules + server.js)
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

# Copy Prisma schema + generated client for runtime migrate deploy
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/prisma ./apps/web/prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma

USER nextjs

EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget -q --spider http://localhost:3000/api/health || exit 1

# Run migrations on container start, then start Next.js standalone server
CMD ["sh", "-c", "npx prisma migrate deploy --schema=./apps/web/prisma/schema.prisma && node apps/web/server.js"]
