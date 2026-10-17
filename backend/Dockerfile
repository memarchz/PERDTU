FROM node:22-bookworm-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates libgomp1 \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app

FROM base AS dependencies
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

FROM dependencies AS build
COPY tsconfig.json ./
COPY src ./src
RUN npx prisma generate && npm run build

# Short-lived migration job. Prisma CLI is intentionally kept out of the API image.
FROM build AS migrate
ENV NODE_ENV=production
USER node
CMD ["node", "node_modules/prisma/build/index.js", "migrate", "deploy"]

FROM build AS production-dependencies
RUN npm prune --omit=dev && npm cache clean --force

FROM base AS runtime
ENV NODE_ENV=production PORT=4000
COPY --from=production-dependencies --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node fixtures/matching-calibration.json ./fixtures/matching-calibration.json
COPY --chown=node:node package.json ./
COPY --chown=node:node scripts/setup-matching-model.mjs ./scripts/setup-matching-model.mjs
RUN mkdir -p storage/uploads storage/models && chown -R node:node storage
USER node
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 CMD node -e "fetch('http://127.0.0.1:4000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/index.js"]
