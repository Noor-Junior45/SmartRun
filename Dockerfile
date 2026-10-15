# Build Stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package.json package-lock.json* ./

# Install dependencies (including devDependencies required for vite build and esbuild)
RUN npm install

# Copy source files
COPY . .

# Build Vite client and bundle server.ts -> dist/server.cjs
RUN npm run build

# Production Stage
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

# Copy package manifest
COPY package.json ./

# Install only production dependencies
RUN npm install --omit=dev

# Copy built distribution bundle from builder stage
COPY --from=builder /app/dist ./dist
# Copy public assets, configurations and data files
COPY --from=builder /app/public ./public
COPY --from=builder /app/data ./data
COPY --from=builder /app/firebase-applet-config.json* ./

# Expose port (Google Cloud Run dynamically routes to PORT, default 8080)
EXPOSE 8080

# Start server
CMD ["node", "dist/server.cjs"]
