import React from 'react';
import { Layers, Shield, Zap, Sparkles } from 'lucide-react';

export default function GlassPanel() {
  return (
    <div className="relative w-full h-full min-h-[380px] md:min-h-full flex flex-col justify-between p-8 md:p-10 overflow-hidden rounded-2xl md:rounded-r-3xl bg-gradient-to-br from-zinc-900/60 via-black/70 to-zinc-950/80 backdrop-blur-3xl border-l border-white/10">
      {/* Dynamic ambient highlight curves */}
      <div className="absolute -top-24 -right-24 w-80 h-80 bg-zinc-400/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-slate-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Badge */}
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/10 backdrop-blur-xl">
          <div className="w-2 h-2 rounded-full bg-zinc-300 animate-pulse" />
          <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-300">
            Craftify Core
          </span>
        </div>

        <div className="text-[11px] font-mono text-zinc-500">
          v2.0 • Grey Edition
        </div>
      </div>

      {/* Centerpiece Glass Refraction Card */}
      <div className="relative z-10 my-auto py-8">
        <div className="relative p-6 rounded-2xl bg-white/[0.03] border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] backdrop-blur-xl group hover:border-white/20 transition-all duration-500">
          {/* Subtle gradient shimmer overlay */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-transparent via-white/[0.02] to-white/[0.06] pointer-events-none" />

          <div className="flex items-center gap-3.5 mb-4">
            <div className="w-10 h-10 rounded-xl bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center text-zinc-200 shadow-inner">
              <Layers className="w-5 h-5 text-zinc-200" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-100 tracking-tight">
                Craftify Labs Studio
              </h3>
              <p className="text-xs text-zinc-400">Intelligent Full-Stack Architecture</p>
            </div>
          </div>

          <p className="text-xs text-zinc-400 leading-relaxed font-light">
            Build, scale, and orchestrate next-generation web applications with precision-engineered tools and secure authentication.
          </p>

          <div className="mt-5 pt-4 border-t border-white/5 grid grid-cols-2 gap-3 text-xs">
            <div className="flex items-center gap-2 text-zinc-300">
              <Shield className="w-3.5 h-3.5 text-zinc-400" />
              <span className="text-[11px]">JWT Protected</span>
            </div>
            <div className="flex items-center gap-2 text-zinc-300">
              <Zap className="w-3.5 h-3.5 text-zinc-400" />
              <span className="text-[11px]">ESM Node Backend</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Floating Stats */}
      <div className="relative z-10 flex items-center justify-between text-xs text-zinc-400 font-mono pt-2 border-t border-white/5">
        <span className="flex items-center gap-1.5 text-[11px] text-zinc-400">
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-300"></span>
          Connected to MongoDB
        </span>
        <span className="text-[11px] text-zinc-500">
          Craftify Labs Inc.
        </span>
      </div>
    </div>
  );
}
