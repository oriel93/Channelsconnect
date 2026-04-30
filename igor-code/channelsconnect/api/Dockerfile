# Build stage
FROM node:20-slim AS builder

WORKDIR /app

# Install OpenSSL for Prisma
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build application
RUN npm run build

# Production stage
FROM node:20-slim AS production

WORKDIR /app

# Install OpenSSL for Prisma (required for query engine)
RUN apt-get update -y && apt-get install -y openssl curl && rm -rf /var/lib/apt/lists/*

# Copy package files and Prisma schema
COPY package*.json ./
COPY prisma ./prisma/

# Install production dependencies only
RUN npm ci --only=production

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Copy Prisma generated client (built against the correct platform binary)
# These MUST come AFTER npm ci to overwrite the ungenerated @prisma/client stubs
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copy entrypoint script that overrides DNS to Google (8.8.8.8)
# ECS awsvpc mode blocks per-container dnsServers but allows resolv.conf override
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Expose API port
EXPOSE 3001

# Start the compiled NestJS application
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["node", "dist/main"]
