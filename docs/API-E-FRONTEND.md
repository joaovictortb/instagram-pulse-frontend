# API e frontend — como está separado

## Pastas

| Pasta | O quê |
|--------|--------|
| `app/`, `src/` (sem `api/`) | **Frontend** React + Vite |
| `api/` | **Backend** Express + rotas `/api/*` |
| `api/src/` | Serviços Meta, OpenAI, Supabase, repositório |

O servidor HTTP vive em `api/src/startServer.ts`. O arquivo `api/server.ts` só sobe a API com `API_ONLY=true` (sem Vite embutido).

## Rodar em desenvolvimento

Dois terminais, **sempre na raiz do repositório**:

```bash
yarn api    # API em http://localhost:3000
yarn dev    # Frontend em http://localhost:5173 (proxy /api → 3000)
```

Ou só API a partir da pasta `api`:

```bash
cd api && yarn dev
```

**Onde está o `.env`:** o `api/server.ts` aplica **primeiro** `../.env` (raiz) e depois `api/.env` (opcional, sem sobrescrever a raiz). Os serviços leem `process.env` ao serem importados — por isso o `dotenv` tem de correr **antes** de importar o `startServer` (usa import dinâmico). Detalhes: [DEV-SETUP.md](./DEV-SETUP.md).

## Onde configurar a URL da API no frontend

1. **Código:** `src/lib/api.ts` — usa `import.meta.env.VITE_API_BASE_URL`.
2. **Dev:** deixe `VITE_API_BASE_URL` vazio; o Vite repassa `/api` para `VITE_API_PROXY_TARGET` (padrão `http://localhost:3000`).
3. **Produção:** defina `VITE_API_BASE_URL=https://sua-api.com` no build do frontend.

Todas as chamadas do painel devem usar `apiFetch("/api/...")` em vez de `fetch` direto, para respeitar essa base.

## Variáveis de ambiente

Veja `.env.example` na raiz e `api/.env.example`. Secrets (Meta, OpenAI, Supabase) ficam só no backend; **não** exponha no `VITE_*`.

Se a API “não vê” as chaves: confirma que estão no `.env` da **raiz** ou em `api/.env`, e reinicia `yarn api` (o carregamento é na arranque do processo).

## Por que o painel fica tudo zerado?

1. **Token Meta:** o backend lê `META_GRAPH_ACCESS_TOKEN` **ou** `META_ACCESS_TOKEN` + `INSTAGRAM_BUSINESS_ACCOUNT_ID`.
2. **KPIs / gráficos:** vêm do **Supabase** após um **`POST /api/sync/instagram`** — no painel use o botão **Sincronizar Instagram → Supabase** (Dashboard).
3. **Dev com URL direta:** se `VITE_API_BASE_URL=http://localhost:3000`, o navegador chama a API em outra origem; a API agora envia **CORS**, mas o mais simples é deixar `VITE_API_BASE_URL` **vazio** e usar só o proxy do Vite.
