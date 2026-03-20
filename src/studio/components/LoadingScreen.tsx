import React from 'react';
import { motion } from 'motion/react';

export function LoadingScreen() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-12 h-12 border-4 border-nfl-red border-t-transparent rounded-full"
        />
        <p className="text-white font-black uppercase tracking-widest animate-pulse">
          Carregando notícias do blog...
        </p>
      </div>
    </div>
  );
}
