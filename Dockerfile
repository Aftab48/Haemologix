# syntax=docker/dockerfile:1

FROM node:20-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS dependencies
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

FROM base AS builder
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
# Supply .env.local as a BuildKit secret when the build needs Clerk or other
# environment values. The secret is mounted only for this command.
RUN --mount=type=secret,id=env,target=/app/.env.local,required=false npm run build

FROM base AS runner
ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=3000

RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3000/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"]

CMD ["node", "server.js"]
