# ==============================================================================
# Multi-stage Dockerfile for ACS Backend (NestJS)
# ==============================================================================
FROM node:20-bookworm-slim AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production Stage
FROM node:20-bookworm-slim AS runner

WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --only=production && chown -R node:node /app

COPY --chown=node:node --from=builder /app/dist ./dist

USER node

EXPOSE 4000
CMD ["node", "dist/main"]

