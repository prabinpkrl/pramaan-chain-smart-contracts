FROM node:22-bookworm-slim AS build

WORKDIR /app
RUN npm install --global npm@11.13.0
COPY __frontend/package.json __frontend/package-lock.json ./
RUN npm ci \
    && npm cache clean --force
COPY __frontend/ ./
RUN npm run build

FROM nginx:1.27-alpine

RUN apk add --no-cache gettext
COPY docker/nginx-main.conf /etc/nginx/nginx.conf
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY docker/frontend-entrypoint.sh /usr/local/bin/pramaan-frontend-entrypoint
COPY docker/runtime-config.template.js /opt/pramaan/runtime-config.template.js
COPY --from=build /app/dist /usr/share/nginx/html
RUN chmod 755 /usr/local/bin/pramaan-frontend-entrypoint

USER nginx
EXPOSE 8080
ENTRYPOINT ["/usr/local/bin/pramaan-frontend-entrypoint"]
