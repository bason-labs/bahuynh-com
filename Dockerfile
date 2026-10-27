# Builds the static export, then serves out/ from Caddy on port 80.
FROM node:22.17.1-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml .nvmrc ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM caddy:2.10-alpine
LABEL org.opencontainers.image.source="https://github.com/bason-labs/bahuynh-com"
COPY deploy/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/out /srv
EXPOSE 80
