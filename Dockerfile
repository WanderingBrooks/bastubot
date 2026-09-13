# syntax=docker/dockerfile:1

################################################################################
# builder — full npm install (tsc needs the typescript peerDependency),
# compile src/ to dist/.
################################################################################
FROM node:22-slim AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src

RUN npm run build

################################################################################
# runtime — prod-only deps + compiled dist/. Puppeteer needs a real browser
# at runtime here (not just build time), so this stage keeps Chromium and
# node_modules, unlike a fully static output.
#
# PUPPETEER_SKIP_CHROMIUM_DOWNLOAD stops puppeteer's own postinstall from
# also pulling a bundled Chromium — apt's chromium package pulls its own
# correct dependency set, more reliable than manually enumerating
# puppeteer's ~15 required shared libs. HEADLESS_CHROMIUM_PATH is the
# app's existing escape hatch (feature/move-chromium-path-to-env) for
# pointing at a system Chromium instead of launching visibly.
################################################################################
FROM node:22-slim
WORKDIR /app

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    HEADLESS_CHROMIUM_PATH=/usr/bin/chromium

RUN apt-get update \
    && apt-get install -y --no-install-recommends chromium \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

CMD ["node", "dist/index.js"]
