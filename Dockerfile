# syntax=docker/dockerfile:1

################################################################################
# builder: full npm install (tsc is a dev dependency), compile src/ to dist/
################################################################################
FROM node:24-slim AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src

RUN npm run build

################################################################################
# runtime: prod-only deps + compiled dist/. A one-shot job, the schedule
# lives outside the container.
################################################################################
FROM node:24-slim
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

CMD ["node", "dist/index.js"]
