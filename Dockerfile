# ── Stage 1: Build ───────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Accept build-time env vars for Vite
ARG VITE_PB_URL=https://pb.gryf.ai
ENV VITE_PB_URL=$VITE_PB_URL

# Install dependencies first (Docker layer cache)
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# Copy source files
COPY index.html vite.config.ts tsconfig*.json eslint.config.js ./
COPY src/ src/
COPY public/ public/

# Build for production
RUN npm run build

# ── Stage 2: Serve ───────────────────────────────────────────
FROM nginx:1.27-alpine

# Add non-root user and setup permissions
RUN addgroup -S appgroup && adduser -S appuser -G appgroup && \
    mkdir -p /var/cache/nginx /var/log/nginx /var/run && \
    chown -R appuser:appgroup /usr/share/nginx/html /var/cache/nginx /var/log/nginx /etc/nginx/conf.d /var/run && \
    touch /var/run/nginx.pid && \
    chown -R appuser:appgroup /var/run/nginx.pid

# Copy built assets and nginx config
COPY --chown=appuser:appgroup --from=builder /app/dist /usr/share/nginx/html
COPY --chown=appuser:appgroup nginx.conf /etc/nginx/conf.d/default.conf

USER appuser

# Healthcheck for Coolify
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:8080/ || exit 1

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
