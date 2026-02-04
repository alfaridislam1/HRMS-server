# Multi-stage build for HRMS Backend - Production Optimized

# Stage 1: Dependencies
FROM node:18-alpine AS deps
WORKDIR /build

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci --include=dev && \
    npm cache clean --force

# Stage 2: Build
FROM node:18-alpine AS builder
WORKDIR /build

# Copy dependencies from deps stage
COPY --from=deps /build/node_modules ./node_modules

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build && \
    npm prune --production && \
    rm -rf src tests *.md .env.example

# Stage 3: Runtime
FROM node:18-alpine AS runtime
WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init curl

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy built artifacts from builder
COPY --from=builder --chown=nodejs:nodejs /build/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /build/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /build/package.json ./package.json

# Create logs directory
RUN mkdir -p logs && chown nodejs:nodejs logs

# Switch to non-root user
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:${PORT:-3000}/health || exit 1

# Expose port (configurable via PORT env var)
EXPOSE 3000

# Environment variables (injected at runtime)
ENV NODE_ENV=production \
    PORT=3000

# Run with dumb-init for proper signal handling
ENTRYPOINT ["/sbin/dumb-init", "--"]
CMD ["node", "dist/server.js"]
