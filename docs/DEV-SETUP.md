# Como o projeto funciona (dev)

## Visão geral

| Parte | Comando | URL | Ficheiros |
|--------|---------|-----|-----------|
| **Frontend** | `yarn dev` | http://localhost:5173 | `app/`, `src/`, Vite |
| **API** | `yarn api` | http://localhost:3000 | `api/server.ts` → `api/src/startServer.ts` |

O browser **não** fala com a porta 3000 diretamente em dev (recomendado): o Vite faz **proxy** de `http://localhost:5173/api/*` → `http://localhost:3000/api/*`. Isto evita CORS e mantém o front a usar caminhos `/api/...` (`src/lib/api.ts`).

## Variáveis de ambiente (o ponto que mais confunde)

1. **`api/server.ts` carrega o `.env` antes de importar o Express e os serviços.**  
   Motivo: ficheiros como `api/src/services/instagram.ts` definem `axios` com `process.env` **no momento do `import`**. Se o `dotenv` correr depois, o token fica `undefined` para sempre.

2. **Dois ficheiros possíveis (por ordem):**
   - **`.env` na raiz do repo** — o principal; copia de `.env.example`.
   - **`api/.env`** — opcional; só preenche variáveis que **ainda não existem** (a raiz ganha sempre).

3. **Frontend:** variáveis `VITE_*` vêm do `.env` na **raiz** (Vite só lê da raiz). Não coloques secrets da Meta/OpenAI em `VITE_*`.

4. **Em dev:** deixa `VITE_API_BASE_URL` **vazio** para usar o proxy. Se estiver errado ou a API desligada, o Vite devolve **HTML** (página SPA) em `/api/...` e o browser acusa erro de JSON — não é “bug do React”, é rota a bater no sítio errado.

## Checklist rápido

- [ ] `.env` na raiz com pelo menos token Meta + `INSTAGRAM_BUSINESS_ACCOUNT_ID` (+ Supabase se quiseres métricas persistidas).
- [ ] Dois terminais na **raiz**: `yarn api` e `yarn dev`.
- [ ] `PORT` na API (default 3000) = `VITE_API_PROXY_TARGET` no front (default `http://localhost:3000`).

## Comandos úteis

```bash
# Raiz do repositório
yarn api    # API
yarn dev    # Vite + proxy /api
```

```bash
cd api && yarn dev   # Também válido; o .env continua a ser lido da raiz e de api/.env como acima
```

## Produção

- Build do front: `yarn build` → pasta `dist/`.
- A API pode servir o `dist` se `API_ONLY` **não** estiver definido (modo “full server” em `startServer.ts`). Em `yarn api` usamos `API_ONLY=true` — só API, sem SPA.
- Define `VITE_API_BASE_URL` no build do front para a URL **pública** da API.
