# Multi-stage build for Node.js TypeScript application

# Stage 1: Build stage
FROM node:20-slim AS builder

# Install build dependencies for native modules (sharp, fluent-ffmpeg)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    libvips-dev \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Configure npm for better network resilience
RUN npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000

# Install all dependencies (including devDependencies for build)
RUN npm ci || npm install

# Copy source code
COPY . .

# Build TypeScript to JavaScript
RUN npm run build

# Stage 2: Runtime stage
FROM node:20-slim

# Install runtime dependencies for native modules
RUN apt-get update && apt-get install -y --no-install-recommends \
    libvips \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Create app user for security
RUN groupadd -r nodejs && \
    useradd -r -g nodejs nodejs

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Configure npm for better network resilience
RUN npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000

# Install only production dependencies
RUN npm ci --only=production || npm install --only=production && \
    npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Copy package.json for reference
COPY --from=builder /app/package.json ./

# Change ownership to nodejs user
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["node", "dist/server.js"]
