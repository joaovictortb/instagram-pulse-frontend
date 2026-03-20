import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      let errorMessage = "Ocorreu um erro inesperado.";
      
      try {
        // Check if it's a Firestore error JSON
        const firestoreError = JSON.parse(this.state.error?.message || "");
        if (firestoreError.operationType) {
          errorMessage = `Erro no banco de dados: ${firestoreError.error}. Operação: ${firestoreError.operationType}`;
        }
      } catch (e) {
        // Not a JSON error, use the message directly if it's simple
        if (this.state.error?.message && this.state.error.message.length < 100) {
          errorMessage = this.state.error.message;
        }
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-dashboard-bg p-4 text-center">
          <div className="glass-card p-8 max-w-md w-full space-y-4 border-rose-500/20">
            <div className="w-16 h-16 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mx-auto">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            </div>
            <h2 className="text-xl font-bold">Ops! Algo deu errado</h2>
            <p className="text-zinc-500 text-sm">{errorMessage}</p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm font-bold transition-colors"
            >
              Recarregar Página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
