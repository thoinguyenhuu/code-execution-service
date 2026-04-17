# ===== Build stage =====
FROM node:18-alpine AS builder

WORKDIR /app

# Deterministic install
COPY package*.json ./
RUN npm ci

# Copy source and schema, then generate Prisma client for the build
COPY . .
RUN npx prisma generate

# Build TypeScript
RUN npm run build

# ===== Runtime stage =====
FROM node:18-alpine

# Runtime needed to execute user Python code
RUN apk add --no-cache python3

WORKDIR /app

# Copy only runtime artifacts and Prisma schema
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma

# Install production dependencies and generate Prisma client
RUN npm ci --omit=dev
RUN npx prisma generate

# Run as non-root
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 3000

# Default to API; worker command is overridden in compose
CMD ["node", "dist/app.js"]
