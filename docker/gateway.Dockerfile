FROM node:22-bookworm-slim

ENV NODE_ENV=production
WORKDIR /app

RUN npm install --global npm@11.13.0
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev \
    && npm cache clean --force

COPY --chown=node:node backend/src ./src
COPY --chown=node:node docker/load-runtime-env.js ./load-runtime-env.js
COPY --chown=node:node docker/gateway-entrypoint.js ./docker-entrypoint.js
RUN mkdir -p .data && chown node:node .data

USER node
EXPOSE 3000
CMD ["node", "docker-entrypoint.js"]
