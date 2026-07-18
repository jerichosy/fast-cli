# syntax=docker/dockerfile:1
FROM node:20-bookworm-slim

ENV PUPPETEER_CACHE_DIR=/app/.cache/puppeteer

WORKDIR /app

# Chromium's runtime libraries. Puppeteer downloads its matching Chrome build
# during npm install, so no system browser is needed.
RUN apt-get update \
	&& apt-get install --yes --no-install-recommends \
		ca-certificates \
		fonts-liberation \
		libasound2 \
		libatk-bridge2.0-0 \
		libatk1.0-0 \
		libatspi2.0-0 \
		libcairo2 \
		libcups2 \
		libdbus-1-3 \
		libdrm2 \
		libgbm1 \
		libglib2.0-0 \
		libgtk-3-0 \
		libnspr4 \
		libnss3 \
		libpango-1.0-0 \
		libpangocairo-1.0-0 \
		libx11-6 \
		libx11-xcb1 \
		libxcb1 \
		libxcomposite1 \
		libxdamage1 \
		libxext6 \
		libxfixes3 \
		libxkbcommon0 \
		libxrandr2 \
		libxrender1 \
		libxshmfence1 \
		libxss1 \
		libxtst6 \
	&& rm -rf /var/lib/apt/lists/*

COPY package.json tsconfig.json ./
COPY source ./source
RUN npm install

RUN npm run build \
	&& npm prune --omit=dev

ENV NODE_ENV=production

# `docker run fast-cli --json` works like `fast --json`.
ENTRYPOINT ["node", "distribution/cli.js"]
