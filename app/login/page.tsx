"use client";

import { useState, type FormEvent } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/src/components/AuthProvider";

export default function LoginPage() {
  const { session, loading, authConfigured, signInWithPassword } = useAuth();
  const location = useLocation();
  const from =
    (location.state as { from?: string })?.from?.startsWith("/")
      ? (location.state as { from: string }).from
      : "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-dashboard-bg flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
      </div>
    );
  }

  if (!authConfigured) {
    return (
      <div className="min-h-screen bg-dashboard-bg flex items-center justify-center p-6">
        <div className="w-full max-w-md glass-card p-8 border border-dashboard-border space-y-4 text-center">
          <h1 className="text-2xl font-bold font-display">InstaPulse</h1>
          <p className="text-sm text-amber-200/90">
            O painel exige Supabase Auth. Define{" "}
            <code className="rounded bg-zinc-900 px-1.5 py-0.5 text-xs">
              VITE_SUPABASE_URL
            </code>{" "}
            e{" "}
            <code className="rounded bg-zinc-900 px-1.5 py-0.5 text-xs">
              VITE_SUPABASE_ANON_KEY
            </code>{" "}
            no <code className="text-xs">frontend/.env</code> e reinicia o Vite.
          </p>
        </div>
      </div>
    );
  }

  if (session) {
    return <Navigate to={from} replace />;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signInWithPassword(email.trim(), password);
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Falha no login";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-dashboard-bg flex items-center justify-center p-6">
      <div className="w-full max-w-md glass-card p-8 border border-dashboard-border space-y-6">
        <div>
          <h1 className="text-2xl font-bold font-display">InstaPulse</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Entre com a conta Supabase Auth do projeto.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-zinc-400">E-mail</span>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl bg-zinc-900 border border-dashboard-border px-4 py-2.5 text-sm outline-none focus:ring-1 ring-brand-primary"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-zinc-400">Palavra-passe</span>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl bg-zinc-900 border border-dashboard-border px-4 py-2.5 text-sm outline-none focus:ring-1 ring-brand-primary"
            />
          </label>
          {error && (
            <p className="text-sm text-red-400" role="alert">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 rounded-xl bg-brand-primary hover:bg-brand-primary/90 disabled:opacity-50 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Entrar"
            )}
          </button>
        </form>

        <p className="text-xs text-zinc-500 text-center">
          Sem conta? Cria um utilizador em Supabase → Authentication → Users.
        </p>
      </div>
    </div>
  );
}
