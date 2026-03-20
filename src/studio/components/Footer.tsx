import React from 'react';
import { Trophy, Instagram, Share2 } from 'lucide-react';

export function Footer() {
  return (
    <footer className="pt-16 pb-8 border-t border-white/10">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
        <div className="col-span-1 md:col-span-2 space-y-6">
          <div className="flex items-center gap-2">
            <div className="bg-nfl-red p-1.5 rounded-lg">
              <Trophy className="text-white" size={20} />
            </div>
            <span className="font-black text-2xl tracking-tighter uppercase italic">
              NFL<span className="text-nfl-red">HUB</span>
            </span>
          </div>
          <p className="text-white/40 max-w-sm font-medium">
            O destino para notícias da NFL, análises e criação de posts. Notícias do blog (Supabase).
          </p>
        </div>
        <div className="space-y-4">
          <h4 className="font-black uppercase tracking-widest text-sm">Quick Links</h4>
          <ul className="space-y-2 text-white/40 text-sm font-bold">
            <li><a href="#" className="hover:text-white transition-colors">Latest News</a></li>
            <li><a href="#" className="hover:text-white transition-colors">Post Generator</a></li>
            <li><a href="#" className="hover:text-white transition-colors">NFL Scores</a></li>
            <li><a href="#" className="hover:text-white transition-colors">Team Stats</a></li>
          </ul>
        </div>
        <div className="space-y-4">
          <h4 className="font-black uppercase tracking-widest text-sm">Follow Us</h4>
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-nfl-red transition-colors cursor-pointer">
              <Instagram size={20} />
            </div>
            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-nfl-red transition-colors cursor-pointer">
              <Share2 size={20} />
            </div>
          </div>
        </div>
      </div>
      <div className="text-center text-white/20 text-xs font-bold uppercase tracking-[0.2em]">
        © 2026 NFLHUB MEDIA GROUP • ALL RIGHTS RESERVED
      </div>
    </footer>
  );
}
