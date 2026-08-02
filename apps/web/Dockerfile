# Dockerfile for Next.js web app in development
FROM node:24-alpine

WORKDIR /app

# Copy package files only (dockerignore excludes everything else)
COPY package*.json ./
COPY apps/web/package*.json ./apps/web/

# Copy prisma schema (needed for prisma generate)
COPY apps/web/prisma ./apps/web/prisma

# Install dependencies inside container
RUN npm install

# Generate Prisma client for Linux (required for Docker environment)
RUN npx prisma generate --schema=./apps/web/prisma/schema.prisma

EXPOSE 3000

ENV NODE_ENV=development
ENV DATABASE_URL=postgresql://rikkei@postgres:5432/rikkei_docs
ENV AUTH_SECRET=dev_secret_change_in_production_min_32_chars_long
ENV NEXTAUTH_URL=http://localhost:3000

CMD ["npm", "run", "dev", "--workspace=apps/web"]
