# Build context is the monorepo root (see docker-compose.yml).
FROM node:22-alpine AS base
# This network intercepts TLS (same class of issue as the npmjs.org cert
# problem worked around via .npmrc's strict-ssl=false). Applies to every
# HTTPS fetch during the build: apk, corepack, postinstall binary downloads
# (esbuild/sharp), etc.
ENV NODE_TLS_REJECT_UNAUTHORIZED=0
RUN sed -i 's/https:\/\//http:\/\//g' /etc/apk/repositories \
  && apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@11.5.2 --activate

FROM base AS pruner
WORKDIR /app
COPY . .
RUN npx turbo prune @job-hunt/web --docker

FROM base AS installer
WORKDIR /app
COPY --from=pruner /app/out/json/ .
COPY .npmrc .npmrc
RUN pnpm install --frozen-lockfile
COPY --from=pruner /app/out/full/ .
COPY tsconfig.base.json tsconfig.base.json
RUN mkdir -p apps/web/public

ARG API_URL=http://api:3001
ENV API_URL=${API_URL}
ENV NEXT_PUBLIC_API_URL=/api
ENV NEXT_TELEMETRY_DISABLED=1

RUN pnpm turbo build --filter=@job-hunt/web

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Restore real TLS verification at runtime — the bypass above is build-time-only.
ENV NODE_TLS_REJECT_UNAUTHORIZED=1
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=installer --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=installer --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=installer --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
CMD ["node", "apps/web/server.js"]
