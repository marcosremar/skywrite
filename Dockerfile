FROM oven/bun:1 AS client-build
WORKDIR /app
COPY package.json bun.lock ./
COPY client/package.json client/package.json
COPY server/package.json server/package.json
RUN bun install --frozen-lockfile
COPY client/ client/
RUN cd client && bun run build

FROM oven/bun:1 AS server
ENV NODE_ENV=production
ENV CLIENT_DIST=/app/client/dist
ENV TECTONIC_VERSION=0.15.0
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    pandoc curl ca-certificates \
    libfontconfig1 libgraphite2-3 libharfbuzz0b libicu-dev libssl3 libfreetype6 \
  && rm -rf /var/lib/apt/lists/*
RUN curl --proto '=https' --tlsv1.2 -fsSL \
    "https://github.com/tectonic-typesetting/tectonic/releases/download/tectonic@${TECTONIC_VERSION}/tectonic-${TECTONIC_VERSION}-x86_64-unknown-linux-gnu.tar.gz" \
    | tar -xz -C /usr/local/bin tectonic \
  && chmod +x /usr/local/bin/tectonic
WORKDIR /app
COPY package.json bun.lock ./
COPY client/package.json client/package.json
COPY server/package.json server/package.json
RUN bun install --frozen-lockfile
COPY server/ server/
RUN cd server && bunx prisma generate
RUN printf '\\documentclass{article}\\begin{document}warmup\\end{document}' > /tmp/warmup.tex \
  && tectonic -o /tmp /tmp/warmup.tex
COPY --from=client-build /app/client/dist /app/client/dist
WORKDIR /app/server
EXPOSE 4000
CMD ["sh", "-c", "bunx prisma migrate deploy && bun run start"]
