# Build context is the monorepo root (see docker-compose.yml).
FROM node:22-alpine AS base
# This network intercepts TLS (same class of issue as the npmjs.org cert
# problem worked around via .npmrc's strict-ssl=false). Applies to every
# HTTPS fetch during the build: apk, corepack, prisma engines, postinstall
# binary downloads (esbuild/sharp), etc.
ENV NODE_TLS_REJECT_UNAUTHORIZED=0
RUN sed -i 's/https:\/\//http:\/\//g' /etc/apk/repositories \
  && apk add --no-cache libc6-compat openssl
RUN corepack enable && corepack prepare pnpm@11.5.2 --activate

FROM base AS pruner
WORKDIR /app
COPY . .
RUN npx turbo prune @job-hunt/api --docker

FROM base AS installer
WORKDIR /app
COPY --from=pruner /app/out/json/ .
COPY .npmrc .npmrc
RUN pnpm install --frozen-lockfile
COPY --from=pruner /app/out/full/ .
COPY tsconfig.base.json tsconfig.base.json
RUN pnpm --filter @job-hunt/db exec prisma generate
RUN pnpm turbo build --filter=@job-hunt/api

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
# Restore real TLS verification for the running app's own outbound calls
# (e.g. OpenRouter) — the bypass above is a build-time-only workaround.
ENV NODE_TLS_REJECT_UNAUTHORIZED=1
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 apiuser
COPY --from=installer /app .
RUN chmod +x ./apps/api/docker-entrypoint.sh \
  && mkdir -p /app/apps/api/uploads \
  && chown -R apiuser:nodejs /app/apps/api/uploads
USER apiuser
EXPOSE 3001
ENTRYPOINT ["./apps/api/docker-entrypoint.sh"]
