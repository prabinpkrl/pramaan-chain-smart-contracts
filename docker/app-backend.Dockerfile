FROM node:22-bookworm-slim AS dependencies

WORKDIR /app
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
RUN npm install --global npm@11.13.0
COPY app-backend/package.json app-backend/package-lock.json ./
RUN npm ci --omit=dev \
    && npm cache clean --force

FROM node:22-bookworm-slim

ENV NODE_ENV=production
WORKDIR /app

COPY --from=dependencies /app/node_modules ./node_modules
COPY --chown=node:node app-backend/src ./src
COPY --chown=node:node docker/load-runtime-env.js ./load-runtime-env.js
COPY --chown=node:node docker/app-backend-entrypoint.js ./docker-entrypoint.js
RUN mkdir -p .data && chown node:node .data

USER node
EXPOSE 4000
CMD ["node", "docker-entrypoint.js"]
