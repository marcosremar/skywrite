# Skywrite

Plataforma de escrita de teses: editor Markdown com preview, orientador de IA, templates academicos e geracao de PDF.

Stack: **React (Vite)** no front e **Express + Prisma (PostgreSQL)** no back.

Especificação completa do sistema (arquitetura, modelo de dados, API, RAG, build): [SPEC.md](SPEC.md). Plano de MVP priorizado: [ROADMAP.md](ROADMAP.md).

## Estrutura

```
client/   SPA React + Vite + Tailwind (UI, editor, paginas)
server/   API Express + Prisma + auth JWT
```

## Requisitos

- Bun
- PostgreSQL local (banco `skywrite`)

## Setup

```bash
bun install

createdb skywrite
bun run db:migrate
bun run db:seed
```

Configure `server/.env`:

```
DATABASE_URL="postgresql://USER@localhost:5432/skywrite?schema=public"
JWT_SECRET="troque-isto"
PORT=4000
CLIENT_ORIGIN="http://localhost:5175"
```

## Rodar

```bash
bun run dev
```

- Client: http://localhost:5175 (proxia `/api` para o server)
- Server: http://localhost:4000

Credenciais demo: `demo@thesis.writer` / `demo123`

## Scripts

| Comando | Acao |
| --- | --- |
| `bun run dev` | Sobe client e server juntos |
| `bun run dev:client` | So o front |
| `bun run dev:server` | So a API |
| `bun run build` | Build de producao do client |
| `bun run db:migrate` | Aplica migrations |
| `bun run db:seed` | Popula dados demo |
| `bun run test` | Testes do server (unit + API) |
| `bun run test:e2e` | Testes E2E do client (precisa do `bun run dev` ativo) |

## Testes

- **Server** (`cd server && bun test`): unit (`paper-ingest`, `thesis-analysis`) + integração de todas as rotas (auth, projects, files, templates, analyze, build, research) subindo o app em processo. Precisa do Postgres seedado. Rotas que dependem do ai-gateway passam tanto com ele ligado (200) quanto desligado (502 tratado).
- **Client** (`cd client && bun run test:e2e`): Playwright cobre landing, login, editor (abas + file tree) e o live preview do markdown. Precisa de `bun run dev` rodando (client 5175, server 4000).
