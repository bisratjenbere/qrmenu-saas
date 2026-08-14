# Build Stage
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# Copy root configurations
COPY package.json package-lock.json tsconfig.json turbo.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json
COPY packages/db/package.json ./packages/db/package.json
COPY packages/shared/package.json ./packages/shared/package.json

# Install dependencies
RUN npm ci

# Copy source code
COPY apps/web ./apps/web
COPY packages/db ./packages/db
COPY packages/shared ./packages/shared

# Generate Prisma Client
RUN npm run db:generate

# Build the shared packages and the frontend
RUN npx turbo run build --filter=@qrmenu/web --filter=@qrmenu/shared

# Production Stage
FROM node:20-alpine AS runner

WORKDIR /usr/src/app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Install curl for health check
RUN apk add --no-cache curl

# Copy standalone outputs
COPY --from=builder /usr/src/app/apps/web/.next/standalone ./
COPY --from=builder /usr/src/app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /usr/src/app/apps/web/public ./apps/web/public

EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/ || exit 1

# Run as non-root user
USER node

CMD ["node", "apps/web/server.js"]
