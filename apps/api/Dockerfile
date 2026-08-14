# Build Stage
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# Copy root configurations
COPY package.json package-lock.json tsconfig.json turbo.json ./
# Copy workspace package files
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json
COPY packages/db/package.json ./packages/db/package.json
COPY packages/shared/package.json ./packages/shared/package.json

# Install dependencies (workspaces hoisted)
RUN npm ci

# Copy source code
COPY apps/api ./apps/api
COPY packages/db ./packages/db
COPY packages/shared ./packages/shared

# Generate Prisma Client
RUN npm run db:generate

# Build the packages
RUN npx turbo run build --filter=@qrmenu/api --filter=@qrmenu/shared

# Production Stage
FROM node:20-alpine AS runner

WORKDIR /usr/src/app

ENV NODE_ENV=production

# Install curl for health check
RUN apk add --no-cache curl

# Copy root configurations
COPY package.json package-lock.json tsconfig.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY packages/db/package.json ./packages/db/package.json
COPY packages/shared/package.json ./packages/shared/package.json

# Install only production dependencies
RUN npm ci --only=production

# Copy generated Prisma Client and built assets
COPY --from=builder /usr/src/app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=builder /usr/src/app/node_modules/@qrmenu/shared ./node_modules/@qrmenu/shared
COPY --from=builder /usr/src/app/apps/api/dist ./apps/api/dist

EXPOSE 3001

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# Run as non-root user
USER node

CMD ["node", "apps/api/dist/server.js"]
