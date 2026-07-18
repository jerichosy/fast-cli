# syntax=docker/dockerfile:1
FROM node:20-bookworm-slim

ENV PUPPETEER_SKIP_DOWNLOAD=true \
	PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-headless-shell

WORKDIR /app

# Debian supplies Chromium for every image architecture we publish, including
# 32-bit ARM. This avoids Puppeteer's x64-only browser download.
RUN apt-get update \
	&& apt-get install --yes --no-install-recommends \
		ca-certificates \
		fonts-liberation \
		chromium-headless-shell \
	&& rm -rf /var/lib/apt/lists/*

COPY package.json tsconfig.json ./
COPY source ./source
RUN npm install

RUN npm run build \
	&& npm prune --omit=dev

ENV NODE_ENV=production

# `docker run fast-cli --json` works like `fast --json`.
ENTRYPOINT ["node", "distribution/cli.js"]
