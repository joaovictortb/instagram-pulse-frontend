import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import {defineConfig, loadEnv} from 'vite';

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
  return {
    plugins: [react(), tailwindcss()],
    optimizeDeps: {
      include: ['react-is'],
    },
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      // Expõe no browser a chave OpenAI mesmo quando só existe OPENAI_API_KEY (sem VITE_).
      "import.meta.env.VITE_STUDIO_OPENAI_MERGED": JSON.stringify(studioOpenAiMerged),
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
          target: env.VITE_API_PROXY_TARGET || 'http://localhost:3000',
          changeOrigin: true,
        },
      },
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
    preview: {
      port: 5173,
      host: '0.0.0.0',
      proxy: {
        '/api': {
          target: env.VITE_API_PROXY_TARGET || 'http://localhost:3000',
          changeOrigin: true,
          configure(proxy) {
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
                        'API indisponível (proxy). Corre o servidor da API e confirma VITE_API_PROXY_TARGET.',
                      detail: err?.message ?? String(err),
                    }),
                  );
                } catch {
                  /* ignore */
                }
              },
            );
          },
        },
      },
    },
  };
});
