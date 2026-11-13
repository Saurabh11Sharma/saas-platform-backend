# syntax=docker/dockerfile:1

ARG NODE_IMAGE=node:22-bookworm-slim

FROM ${NODE_IMAGE} AS build

ARG SERVICE_WORKSPACE
ARG SERVICE_PATH
ARG SERVICE_PORT
ARG SERVICE_ENTRY

WORKDIR /workspace

COPY package.json package-lock.json ./
COPY tsconfig.base.json ./
COPY apps ./apps

RUN npm ci --no-audit --no-fund
RUN npm run build --workspace="${SERVICE_WORKSPACE}"

# Keep only the selected service's compiled output in the runtime filesystem.
RUN mkdir -p "/runtime/apps/${SERVICE_PATH}" \
    && cp -R "apps/${SERVICE_PATH}/dist" "/runtime/apps/${SERVICE_PATH}/dist" \
    && cp "apps/${SERVICE_PATH}/package.json" "/runtime/apps/${SERVICE_PATH}/package.json"

# Remove TypeScript, Prettier, and other development-only dependencies.
RUN npm prune --omit=dev --no-audit --no-fund

FROM ${NODE_IMAGE} AS runtime

ARG SERVICE_PORT
ARG SERVICE_ENTRY

ENV NODE_ENV=production \
    PORT=${SERVICE_PORT} \
    SERVICE_ENTRY=${SERVICE_ENTRY}

WORKDIR /app

COPY --from=build --chown=node:node /workspace/node_modules ./node_modules
COPY --from=build --chown=node:node /runtime/apps ./apps

USER node

EXPOSE ${SERVICE_PORT}

HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=5 \
    CMD node -e "fetch('http://127.0.0.1:' + process.env.PORT + '/api/v1/health/ready').then((response) => process.exit(response.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["sh", "-c", "exec node \"$SERVICE_ENTRY\""]
