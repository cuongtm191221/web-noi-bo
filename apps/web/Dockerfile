# Dockerfile for Next.js web app in development
# Note: Source is mounted via volumes from docker-compose.yml for hot reload

FROM node:24-alpine

WORKDIR /app

# Install all npm dependencies (workspace root + apps/web)
# The source code is mounted via volumes, but node_modules must be inside the container
COPY package*.json ./
COPY apps/web/package*.json ./apps/web/

RUN npm install

EXPOSE 3000

ENV NODE_ENV=development
ENV DATABASE_URL=postgresql://rikkei@postgres:5432/rikkei_docs
ENV AUTH_SECRET=dev_secret_change_in_production_min_32_chars_long
ENV NEXTAUTH_URL=http://localhost:3000

CMD ["npm", "run", "dev", "--workspace=apps/web"]
