FROM oven/bun:1 AS client-build
WORKDIR /app/client
COPY client/package.json ./
RUN bun install
COPY client/ ./
RUN bun run build

FROM oven/bun:1 AS server
ENV NODE_ENV=production
ENV CLIENT_DIST=/app/client/dist
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    pandoc curl ca-certificates \
    libfontconfig1 libgraphite2-3 libharfbuzz0b libicu-dev libssl3 libfreetype6 \
  && rm -rf /var/lib/apt/lists/*
RUN curl --proto '=https' --tlsv1.2 -fsSL https://drop-sh.fullyjustified.net | sh \
  && mv tectonic /usr/local/bin/tectonic
WORKDIR /app/server
COPY server/package.json ./
RUN bun install
COPY server/ ./
RUN bunx prisma generate
RUN printf '\\documentclass{article}\\begin{document}warmup\\end{document}' > /tmp/warmup.tex \
  && tectonic -o /tmp /tmp/warmup.tex
COPY --from=client-build /app/client/dist /app/client/dist
EXPOSE 4000
CMD ["sh", "-c", "bunx prisma migrate deploy && bun run start"]
