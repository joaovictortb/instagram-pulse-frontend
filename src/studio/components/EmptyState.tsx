import React from 'react';
import { Trophy } from 'lucide-react';

export function EmptyState() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-8">
      <div className="flex items-center gap-2 mb-4">
        <div className="bg-nfl-red p-1.5 rounded-lg">
          <Trophy className="text-white" size={24} />
        </div>
        <span className="font-black text-2xl tracking-tighter uppercase italic">
          NFL<span className="text-nfl-red">HUB</span>
        </span>
      </div>
      <p className="text-white/60 text-center max-w-md">
        Nenhuma notícia publicada no momento. Configure o Supabase do Studio (
        <span className="text-white/80 font-mono text-xs">VITE_SUPABASE_URL_STUDIO</span> e{" "}
        <span className="text-white/80 font-mono text-xs">VITE_SUPABASE_ANON_KEY_STUDIO</span>
        ) ou publique artigos no blog.
      </p>
    </div>
  );
}
