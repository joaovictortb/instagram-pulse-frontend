import React from "react";
import { User, Instagram } from "lucide-react";
import { InstagramConfig } from "./InstagramConfig";

export function ProfilePage() {
  return (
    <div className="mx-auto space-y-10">
      <header className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-white">
          <User className="h-7 w-7" />
        </div>
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tighter text-white">
            Configurações
          </h1>
          <p className="text-sm text-white/50 uppercase tracking-widest mt-1">
            Configurações da sua conta e integrações
          </p>
        </div>
      </header>

      <section>
        <h2 className="text-sm font-bold uppercase tracking-widest text-white/60 mb-4 flex items-center gap-2">
          <Instagram size={16} />
          Instagram
        </h2>
        <InstagramConfig />
      </section>
    </div>
  );
}
