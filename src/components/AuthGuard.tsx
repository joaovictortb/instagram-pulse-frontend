import React from 'react';
import { useAuth } from './FirebaseProvider';
import { Navigate } from 'react-router-dom';
import { LogIn } from 'lucide-react';

export const AuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading, signIn } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-dashboard-bg">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-primary"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-dashboard-bg p-4">
        <div className="glass-card p-8 max-w-md w-full text-center space-y-6">
          <div className="w-16 h-16 bg-brand-primary/10 text-brand-primary rounded-2xl flex items-center justify-center mx-auto">
            <LogIn size={32} />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Bem-vindo ao InstaPulse Pro</h2>
            <p className="text-zinc-500 mt-2">Por favor, faça login com sua conta Google para acessar o painel.</p>
          </div>
          <button 
            onClick={signIn}
            className="w-full py-3 bg-brand-primary text-white rounded-xl font-bold transition-transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-brand-primary/20"
          >
            Entrar com Google
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
