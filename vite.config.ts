import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import {defineConfig, loadEnv} from 'vite';

function attachApiProxyErrorHandler(proxy: {
  on: (
    ev: 'error',
    fn: (err: Error, req: IncomingMessage, res: ServerResponse | undefined) => void,
  ) => void;
}) {
  proxy.on(
    'error',
    (err: Error, _req: IncomingMessage, res: ServerResponse | undefined) => {
      if (!res || res.writableEnded) return;
      try {
        res.writeHead(502, {
          'Content-Type': 'application/json; charset=utf-8',
        });
        res.end(
          JSON.stringify({
            ok: false,
            error:
              'API indisponível (proxy). Na raiz: yarn api (terminal 1) e yarn dev (terminal 2). Confirma VITE_API_PROXY_TARGET e PORT da API.',
            detail: err?.message ?? String(err),
          }),
        );
      } catch {
        /* ignore */
      }
    },
  );
}

export default defineConfig(({mode}) => {
  const frontendDir = path.resolve(__dirname);
  const repoRoot = path.resolve(__dirname, '..');
  /** Raiz do repo primeiro, depois `frontend/` — o segundo ganha em duplicados. */
  const env = {...loadEnv(mode, repoRoot, ''), ...loadEnv(mode, frontendDir, '')};
  /** Studio (cliente): mesma prioridade que `src/studio/lib/env-studio` + `OPENAI_API_KEY` da raiz (API). */
  const studioOpenAiMerged =
    (env.VITE_OPENAI_API_KEY_STUDIO || "").trim() ||
    (env.VITE_OPENAI_API_KEY || "").trim() ||
    (env.OPENAI_API_KEY || "").trim() ||
    "";
  const apiProxyTarget =
    (env.VITE_API_PROXY_TARGET || "").trim() || "http://localhost:3000";
  /** Em dev, só valores vindos dos `.env` — `process.env.VITE_*` no SO sobrepõe ficheiros e quebra o proxy. */
  const apiBaseUrlForClient =
    mode === "development"
      ? (env.VITE_API_BASE_URL ?? "").trim().replace(/\/$/, "")
      : (env.VITE_API_BASE_URL ?? process.env.VITE_API_BASE_URL ?? "")
          .trim()
          .replace(/\/$/, "");
  return {
    plugins: [react(), tailwindcss()],
    optimizeDeps: {
      include: ['react-is'],
    },
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      // Expõe no browser a chave OpenAI mesmo quando só existe OPENAI_API_KEY (sem VITE_).
      "import.meta.env.VITE_STUDIO_OPENAI_MERGED": JSON.stringify(studioOpenAiMerged),
      "import.meta.env.VITE_API_BASE_URL": JSON.stringify(apiBaseUrlForClient),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 5173,
      host: '0.0.0.0',
      proxy: {
        '/api': {
          target: apiProxyTarget,
          changeOrigin: true,
          configure(proxy) {
            attachApiProxyErrorHandler(proxy);
          },
        },
      },
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
    preview: {
      port: 5173,
      host: '0.0.0.0',
      proxy: {
        '/api': {
          target: apiProxyTarget,
          changeOrigin: true,
          configure(proxy) {
            attachApiProxyErrorHandler(proxy);
          },
        },
      },
    },
  };
});
