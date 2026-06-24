# syntax=docker/dockerfile:1

# ---- Build stage -----------------------------------------------------------
# Compiles the Angular SSR app (browser bundle + Node server) into dist/app.
FROM node:22-slim AS build
WORKDIR /app

# Install dependencies against the lockfile for reproducible builds.
COPY package.json package-lock.json .npmrc ./
RUN npm ci

# Build the production server bundle.
COPY . .
RUN npm run build

# Drop dev dependencies so only the runtime modules are copied forward.
RUN npm prune --omit=dev

# ---- Runtime stage ---------------------------------------------------------
# Minimal image that just runs the prebuilt Node SSR server.
FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Cloud Run sends traffic to $PORT (8080 by default) and terminates TLS itself,
# so the SSR host-header check is delegated to that proxy layer. Override
# NG_ALLOWED_HOSTS with your exact domain(s) if you want to enforce it here too.
ENV PORT=8080
ENV NG_ALLOWED_HOSTS=*

# Runtime artifacts only: the built app and its production node_modules.
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json

# Run as the unprivileged user that ships with the node image.
USER node

EXPOSE 8080

# Local/Docker liveness probe. Cloud Run uses its own probes and ignores this.
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8080)+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/app/server/server.mjs"]
