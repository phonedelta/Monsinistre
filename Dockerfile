# Production image of Monsinistre. Two targets are used by compose.prod.yaml:
#   app   — the Next.js server, with production dependencies only
#   tools — migrations, seed, staff and maintenance commands, with all dependencies

FROM node:22-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# Prisma needs OpenSSL when it generates its client and when it runs.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS tools
COPY tsconfig.json ./
COPY prisma ./prisma
COPY scripts ./scripts
COPY src ./src
RUN npx prisma generate
USER node
CMD ["npm", "run", "db:migrate"]

FROM deps AS build
COPY . .
# The contact page is prerendered: its public contact details are read at build time.
ARG CONTACT_PHONE=
ARG CONTACT_WHATSAPP=
ARG CONTACT_EMAIL=
ENV CONTACT_PHONE=$CONTACT_PHONE CONTACT_WHATSAPP=$CONTACT_WHATSAPP CONTACT_EMAIL=$CONTACT_EMAIL
# The build cache is of no use at run time.
RUN npm run build && rm -rf .next/cache

FROM base AS prod-deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM base AS app
ENV NODE_ENV=production
COPY --from=prod-deps /app/node_modules ./node_modules
# The Prisma client is generated during the build, not installed by npm.
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/.next ./.next
COPY package.json next.config.ts ./
# The business pages read their Markdown sources at run time.
COPY content ./content
# The unprivileged user writes in two places only: the cache of optimised images,
# and the volume of private documents mounted on /data/storage.
RUN mkdir -p .next/cache /data/storage && chown node:node .next/cache /data/storage
USER node
EXPOSE 3000
# Listen on every interface of the container: only the reverse proxy can reach it.
CMD ["node_modules/.bin/next", "start", "--hostname", "0.0.0.0", "--port", "3000"]
