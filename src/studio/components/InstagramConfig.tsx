import React, { useState, useEffect } from "react";
import {
  Instagram,
  Key,
  Eye,
  EyeOff,
  Save,
  Loader2,
  CheckCircle2,
  Unplug,
  ExternalLink,
  Info,
  Clock,
} from "lucide-react";
import {
  getInstagramConfig,
  saveInstagramConfig,
  clearInstagramConfig,
  hasInstagramConfig,
} from "../lib/instagram-settings";
import { cn } from "../lib/utils";

const GRAPH_API_EXPLORER_URL =
  "https://developers.facebook.com/tools/explorer/";
const ACCESS_TOKEN_DEBUGGER_URL =
  "https://developers.facebook.com/tools/debug/accesstoken/";
const LONG_LIVED_TOKEN_DOC_URL =
  "https://developers.facebook.com/docs/facebook-login/guides/access-tokens/get-long-lived/";
const GRAPH_DEBUG_TOKEN = "https://graph.facebook.com/v21.0/debug_token";
const META_IG_ACCOUNTS_URL =
  "https://business.facebook.com/latest/settings/accounts/instagram-accounts";

function formatTokenStatus(data: {
  is_valid?: boolean;
  expires_at?: number;
  data_access_expires_at?: number;
}): string {
  if (!data.is_valid) {
    return "Token inválido ou expirado.";
  }
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = data.expires_at ?? 0;
  const dataAccessExpires = data.data_access_expires_at ?? 0;

  if (expiresAt === 0) {
    return "Token válido e sem data de expiração (ex.: Page token).";
  }
  const diff = expiresAt - now;
  if (diff <= 0) {
    return "Token expirado.";
  }
  const days = Math.floor(diff / 86400);
  const hours = Math.floor((diff % 86400) / 3600);
  let text = `Token válido. Expira em ${days} dia(s)`;
  if (hours > 0 && days < 2) text += ` e ${hours} hora(s)`;
  text += ".";
  if (dataAccessExpires > 0 && dataAccessExpires !== expiresAt) {
    const dataDays = Math.floor((dataAccessExpires - now) / 86400);
    if (dataDays > 0) text += ` Acesso aos dados até ~${dataDays} dia(s).`;
  }
  return text;
}

export function InstagramConfig() {
  const [accountId, setAccountId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [tokenStatus, setTokenStatus] = useState<string | null>(null);
  const [checkingToken, setCheckingToken] = useState(false);

  useEffect(() => {
    const cfg = getInstagramConfig();
    setAccountId(cfg.accountId);
    setAccessToken(cfg.accessToken);
  }, []);

  const handleSave = () => {
    setSaving(true);
    setSaved(false);
    try {
      saveInstagramConfig({
        accountId: accountId.trim(),
        accessToken: accessToken.trim(),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = () => {
    setDisconnecting(true);
    clearInstagramConfig();
    setAccountId("");
    setAccessToken("");
    setTokenStatus(null);
    setDisconnecting(false);
  };

  const handleCheckToken = async () => {
    const token = accessToken.trim();
    if (!token) {
      setTokenStatus("Cole um token no campo acima para verificar.");
      return;
    }
    setCheckingToken(true);
    setTokenStatus(null);
    try {
      const url = `${GRAPH_DEBUG_TOKEN}?input_token=${encodeURIComponent(token)}&access_token=${encodeURIComponent(token)}`;
      const res = await fetch(url);
      const json = await res.json();
      const data = json?.data;
      if (json?.error) {
        setTokenStatus(
          `Erro: ${json.error.message ?? "Falha ao verificar token."}`,
        );
        return;
      }
      if (!data) {
        setTokenStatus("Resposta inválida da API.");
        return;
      }
      setTokenStatus(formatTokenStatus(data));
    } catch (e) {
      setTokenStatus(
        e instanceof Error ? e.message : "Erro de rede ao verificar o token.",
      );
    } finally {
      setCheckingToken(false);
    }
  };

  const isConnected = hasInstagramConfig();
  const canSave = accountId.trim().length > 0 && accessToken.trim().length > 0;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white">
            <Instagram className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-black uppercase tracking-tighter text-white">
              Configuração Instagram
            </h3>
            <p className="text-xs text-white/50 uppercase tracking-widest mt-0.5">
              Para publicar posts pelo NFL Blog Brasil
            </p>
          </div>
        </div>

        <p className="text-sm text-white/60 mb-6">
          Use o mesmo token e ID da conta que você configura no painel do NFL
          Blog Brasil. Assim você pode publicar direto daqui ou pelo blog. No
          .env do editor, configure{" "}
          <code className="bg-white/10 px-1 rounded text-[10px]">
            VITE_NFL_BLOG_URL_STUDIO
          </code>{" "}
          (ou <code className="bg-white/10 px-1 rounded text-[10px]">VITE_NFL_BLOG_URL</code>){" "}
          com a URL do app Next.js (ex:{" "}
          <code className="bg-white/10 px-1 rounded text-[10px]">
            http://localhost:3000
          </code>
          ) para gerar legenda com IA e publicar.
        </p>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-white/60 mb-2 block">
              ID da conta (Instagram Business)
            </label>
            <input
              type="text"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              placeholder="Ex: 17841478080624083"
              className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white font-mono text-sm placeholder:text-white/30 focus:border-nfl-red/50 focus:outline-none focus:ring-1 focus:ring-nfl-red/50"
            />
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  window.open(
                    META_IG_ACCOUNTS_URL,
                    "_blank",
                    "noopener,noreferrer",
                  )
                }
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-widest text-white/80 hover:bg-white/10 hover:text-white transition-colors"
              >
                <ExternalLink size={14} />
                Abrir página Meta do ID
              </button>
              <span className="text-xs text-white/50">
                Abre a tela de contas do Instagram Business no Meta Business
                para você copiar o ID correto.
              </span>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-white/60 mb-2 block">
              Token de acesso (Meta Graph API)
            </label>
            <div className="flex gap-2">
              <input
                type={showToken ? "text" : "password"}
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                placeholder="Cole o token (curto do Explorer ou de longa duração ~60 dias)"
                className="flex-1 rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white font-mono text-sm placeholder:text-white/30 focus:border-nfl-red/50 focus:outline-none focus:ring-1 focus:ring-nfl-red/50"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="rounded-xl border border-white/10 bg-black/40 p-3 text-white/60 hover:text-white hover:bg-white/5 transition-colors"
                aria-label={showToken ? "Ocultar token" : "Mostrar token"}
              >
                {showToken ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  window.open(
                    ACCESS_TOKEN_DEBUGGER_URL,
                    "_blank",
                    "noopener,noreferrer",
                  )
                }
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-widest text-white/80 hover:bg-white/10 hover:text-white transition-colors"
              >
                <Key size={14} />
                Gerar token de 60 dias (sem backend)
              </button>
              <button
                type="button"
                onClick={handleCheckToken}
                disabled={checkingToken || !accessToken.trim()}
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-widest text-white/80 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {checkingToken ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Clock size={14} />
                )}
                Verificar tempo do token
              </button>
              <span className="text-xs text-white/50">
                Abre o Access Token Debugger: cole seu token curto lá, clique em
                &quot;Extend Access Token&quot; e copie o novo token de volta
                aqui.
              </span>
            </div>
            {tokenStatus !== null && (
              <p
                className={cn(
                  "mt-2 rounded-xl border px-4 py-3 text-sm",
                  tokenStatus.startsWith("Token válido")
                    ? "border-green-500/30 bg-green-500/10 text-green-400"
                    : tokenStatus.startsWith("Erro") ||
                        tokenStatus.startsWith("Token expirado") ||
                        tokenStatus.startsWith("Token inválido")
                      ? "border-red-500/30 bg-red-500/10 text-red-400"
                      : "border-white/10 bg-white/5 text-white/70",
                )}
              >
                {tokenStatus}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={saving || !canSave}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold uppercase tracking-widest transition-all",
                canSave
                  ? "bg-nfl-red text-white hover:opacity-90"
                  : "bg-white/10 text-white/40 cursor-not-allowed",
              )}
            >
              {saving ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Save size={18} />
              )}
              {saved ? "Salvo!" : "Salvar"}
            </button>
            {isConnected && (
              <button
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-transparent px-5 py-2.5 text-sm font-bold uppercase tracking-widest text-white/70 hover:bg-white/10 hover:text-white transition-all"
              >
                <Unplug size={18} />
                Desconectar
              </button>
            )}
          </div>

          {isConnected && (
            <div className="flex items-center gap-2 rounded-xl bg-green-500/10 border border-green-500/20 px-4 py-3 text-sm text-green-400">
              <CheckCircle2 size={18} />
              Conta configurada. Você pode publicar no Instagram a partir do
              gerador de posts.
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="flex items-center gap-2 mb-3">
          <Info className="h-5 w-5 text-white/50" />
          <h4 className="text-sm font-black uppercase tracking-widest text-white/80">
            Como obter o token
          </h4>
        </div>
        <ol className="list-decimal space-y-2 pl-4 text-sm text-white/60">
          <li>
            Acesse o{" "}
            <a
              href={GRAPH_API_EXPLORER_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-nfl-red hover:underline inline-flex items-center gap-1"
            >
              Graph API Explorer <ExternalLink size={12} />
            </a>
            , selecione seu App e gere um token com permissões{" "}
            <code className="bg-white/10 px-1 rounded">instagram_basic</code> e{" "}
            <code className="bg-white/10 px-1 rounded">
              instagram_content_publish
            </code>
            . Esse token é de <strong>curta duração (~1 hora)</strong>.
          </li>
          <li>
            Para um{" "}
            <strong>token de longa duração (~60 dias) sem backend</strong>: use
            o botão &quot;Gerar token de 60 dias (sem backend)&quot; acima — ele
            abre o{" "}
            <a
              href={ACCESS_TOKEN_DEBUGGER_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-nfl-red hover:underline inline-flex items-center gap-1"
            >
              Access Token Debugger <ExternalLink size={12} />
            </a>
            . Cole seu token curto no campo, clique em &quot;Extend Access
            Token&quot; e copie o novo token de volta. Alternativa via backend:{" "}
            <a
              href={LONG_LIVED_TOKEN_DOC_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-nfl-red hover:underline"
            >
              documentação oficial
            </a>
            .
          </li>
          <li>
            O ID da conta você obtém no painel do NFL Blog Brasil (Instagram) ou
            via API com o token (ex.: endpoint{" "}
            <code className="bg-white/10 px-1 rounded">me/accounts</code> no
            Graph API).
          </li>
        </ol>
      </div>
    </div>
  );
}
