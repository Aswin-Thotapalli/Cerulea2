# Cerulea REST API + indexer — container image for Railway.
# Build context MUST be the repo root (this is a monorepo; the API pulls the
# @cerulea/types workspace package). On Railway set Dockerfile Path to
# apps/api/Dockerfile and leave Root Directory at the repo root.
FROM node:22-bookworm-slim

# better-sqlite3 ships a prebuilt binary for linux-x64/node22; python/make/g++
# are only a fallback if the prebuild download ever fails.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy the whole repo (node_modules etc. excluded via .dockerignore) and install
# all workspaces exactly as local dev does — the most reliable path for this
# monorepo. tsx is a runtime dependency, so the app can run TypeScript directly.
COPY . .
RUN npm install --include=dev --no-audit --no-fund

ENV NODE_ENV=production
ENV HOST=0.0.0.0
# Railway injects PORT at runtime; the app reads process.env.PORT.
ENV DB_PATH=/app/apps/api/data/cerulea.db

WORKDIR /app/apps/api

# Seed demo data on boot (idempotent), then start the server. Once a live
# Cerulea node is configured (RPC_WS_*), the indexer overwrites/extends this.
CMD ["sh", "-c", "node /app/node_modules/tsx/dist/cli.mjs src/seed.ts && node /app/node_modules/tsx/dist/cli.mjs src/index.ts"]
