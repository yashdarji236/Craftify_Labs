import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, ShieldCheck, UserCheck, Key, CheckCircle, Sparkles } from 'lucide-react';

export default function DashboardView() {
  const { user, token, logout } = useAuth();

  return (
    <div className="w-full max-w-2xl bg-[#111114]/90 border border-white/10 backdrop-blur-2xl rounded-3xl p-8 shadow-2xl text-white animate-in zoom-in-95 duration-300">
      {/* Header */}
      <div className="flex items-center justify-between pb-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/15 bg-[#0e0e11] shrink-0 p-1 flex items-center justify-center">
            <img
              src="/logo.jpg"
              alt="Craftify Labs Logo"
              className="w-full h-full object-contain rounded-lg"
            />
          </div>
          <div>
            <h2 className="font-bold text-lg text-white flex items-center gap-2">
              Craftify Labs <span className="text-zinc-300 text-xs font-mono px-2 py-0.5 rounded-full bg-white/5 border border-white/10">Authenticated</span>
            </h2>
            <p className="text-xs text-zinc-400">Welcome to your full-stack developer workspace</p>
          </div>
        </div>

        <button
          onClick={logout}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium text-zinc-300 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          Log Out
        </button>
      </div>

      {/* User Info Card */}
      <div className="mt-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/5 space-y-1">
            <div className="flex items-center gap-2 text-zinc-400 text-xs">
              <UserCheck className="w-4 h-4 text-zinc-300" />
              <span>User Email</span>
            </div>
            <p className="text-sm font-semibold text-white truncate">{user?.email}</p>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/5 space-y-1">
            <div className="flex items-center gap-2 text-zinc-400 text-xs">
              <ShieldCheck className="w-4 h-4 text-zinc-300" />
              <span>Account Name</span>
            </div>
            <p className="text-sm font-semibold text-white capitalize">{user?.name || 'Craftify Creator'}</p>
          </div>
        </div>

        {/* Token Box */}
        <div className="p-4 rounded-2xl bg-black/50 border border-white/5 space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span className="flex items-center gap-1.5 font-mono text-[11px]">
              <Key className="w-3.5 h-3.5 text-zinc-300" />
              Active JWT Bearer Session
            </span>
            <span className="flex items-center gap-1 text-zinc-300 font-mono text-[10px]">
              <CheckCircle className="w-3 h-3 text-emerald-400" /> Verified
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-zinc-950 font-mono text-[11px] text-zinc-400 break-all select-all border border-zinc-800">
            {token}
          </div>
        </div>

        <div className="pt-2 flex items-center justify-between text-xs text-zinc-500">
          <span className="flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-zinc-400" /> Backend Controller & Mongoose active (ESM)
          </span>
          <span>Craftify Labs v2.0.0</span>
        </div>
      </div>
    </div>
  );
}
