import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthPage from './pages/AuthPage';
import HomePage from './pages/HomePage';
import { Loader2 } from 'lucide-react';

function MainApp() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-[#09090b] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl overflow-hidden border border-white/15 bg-zinc-950 p-2 flex items-center justify-center animate-pulse">
            <img src="/logo.jpg" alt="Logo" className="w-full h-full object-contain" />
          </div>
          <div className="flex items-center gap-2 text-zinc-400 text-xs font-mono">
            <Loader2 className="w-4 h-4 animate-spin text-zinc-300" />
            <span>Verifying session state...</span>
          </div>
        </div>
      </div>
    );
  }

  return user ? <HomePage /> : <AuthPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
