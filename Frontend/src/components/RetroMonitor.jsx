import React from 'react';

export default function RetroMonitor() {
  return (
    <div className="relative w-full h-full min-h-[340px] md:min-h-full flex items-center justify-center p-6 md:p-8 overflow-hidden rounded-2xl md:rounded-r-3xl">
      {/* Background artwork */}
      <img
        src="/bg-scene.jpg"
        alt="Craftify Labs Retro Computing"
        className="absolute inset-0 w-full h-full object-cover object-center transform scale-105 transition-transform duration-700 hover:scale-110"
      />

      {/* Atmospheric gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#121214]/60 via-transparent to-black/30 pointer-events-none" />

      {/* Retro Brand Monitor Floating Card Tag */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Glow behind the badge */}
        <div className="absolute -inset-4 bg-orange-500/20 rounded-full blur-xl animate-pulse" />

        {/* Vintage CRT Terminal Badge Overlay */}
        <div className="relative backdrop-blur-md bg-black/40 border border-orange-500/30 px-5 py-2.5 rounded-xl shadow-2xl flex items-center gap-3 text-white">
          <div className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-ping" />
          <div className="flex flex-col">
            <span className="font-mono text-xs text-orange-300/90 tracking-widest uppercase font-semibold">
              CRAFTIFY LABS OS
            </span>
            <span className="text-[10px] text-zinc-400 font-mono">
              System Ready • v2.4
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Floating Stats Tag */}
      <div className="absolute bottom-4 left-6 right-6 z-10 flex items-center justify-between text-xs text-zinc-300 backdrop-blur-md bg-black/40 border border-white/10 px-4 py-2 rounded-lg">
        <span className="flex items-center gap-1.5 font-mono text-[11px] text-zinc-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          Auth API Online
        </span>
        <span className="font-mono text-[11px] text-orange-400 font-medium">
          Craftify Labs Engine
        </span>
      </div>
    </div>
  );
}
