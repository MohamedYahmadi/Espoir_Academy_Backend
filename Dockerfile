# ============================================================
# ESPOIR ACADEMY — BACKEND (Express + Socket.IO + MongoDB)
# ============================================================

# ---------- Build stage ----------
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build TypeScript -> dist/
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ---------- Runtime stage ----------
FROM node:22-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Install only production dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy compiled output from the build stage
COPY --from=builder /app/dist ./dist

# Uploaded files (photos, certificates, etc.) persist here.
# Mount a volume here so uploads survive container restarts:
#   docker run -v academy_uploads:/app/uploads ...
RUN mkdir -p /app/uploads
VOLUME ["/app/uploads"]

EXPOSE 5000

# Starts with the built server; loads .env.production automatically
CMD ["node", "dist/server.js"]