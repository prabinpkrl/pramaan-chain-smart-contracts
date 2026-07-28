FROM node:22-bookworm-slim

ARG SOURCE_COMMIT
RUN case "$SOURCE_COMMIT" in \
      (*[!0-9a-fA-F]*|"") echo "SOURCE_COMMIT must be a full Git SHA" >&2; exit 1 ;; \
    esac \
    && test "${#SOURCE_COMMIT}" -eq 40 \
    && test "$SOURCE_COMMIT" != "0000000000000000000000000000000000000000"
LABEL org.opencontainers.image.revision="${SOURCE_COMMIT}"
LABEL org.opencontainers.image.source="https://github.com/prabinpkrl/pramaan-chain-smart-contracts"
ENV BUILD_SOURCE_COMMIT="${SOURCE_COMMIT}"

WORKDIR /workspace

RUN npm install --global npm@11.13.0
COPY package.json package-lock.json ./
RUN npm ci \
    && npm cache clean --force

COPY --chown=node:node contracts ./contracts
COPY --chown=node:node scripts ./scripts
COPY --chown=node:node test ./test
COPY --chown=node:node hardhat.config.js ./
RUN mkdir -p \
      /home/node/.config/hardhat-nodejs \
      /workspace/.docker-state \
      /workspace/artifacts \
      /workspace/cache \
      /workspace/types \
    && chown -R node:node \
      /home/node/.config/hardhat-nodejs \
      /workspace/.docker-state \
      /workspace/artifacts \
      /workspace/cache \
      /workspace/types

USER node
RUN npm run compile -- --build-profile production

CMD ["npx", "hardhat", "keystore", "list"]
