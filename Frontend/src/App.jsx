import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { RouterProvider, useRouter } from './router/Router';
import AuthPage from './pages/AuthPage';
import HomePage from './pages/HomePage';
import DashboardPage from './pages/DashboardPage';
import EditorPage from './pages/EditorPage';
import { Loader2 } from 'lucide-react';

function ProtectedRoutes() {
  const { currentPath } = useRouter();

  // Match /editor/:projectId
  if (currentPath.startsWith('/editor/')) {
    const projectId = currentPath.replace(/^\/editor\//, '').split('/')[0];
    if (projectId) {
      return <EditorPage projectId={projectId} />;
    }
  }

  // System Diagnostics and API health view
  if (currentPath === '/overview') {
    return <HomePage />;
  }

  // Default protected landing: Authenticated Projects Dashboard
  return <DashboardPage />;
}

function MainApp() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-[#09090b] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl overflow-hidden border border-white/15 bg-zinc-950 p-2 flex items-center justify-center animate-pulse shadow-xl">
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

  // Unauthenticated visitors always route to AuthPage
  if (!user) {
    return <AuthPage />;
  }

  return <ProtectedRoutes />;
}

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider>
        <MainApp />
      </RouterProvider>
    </AuthProvider>
  );
}
