import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/api';
import {
  LogOut,
  ShieldCheck,
  UserCheck,
  Key,
  CheckCircle2,
  Sparkles,
  Zap,
  Globe,
  Layers,
  Code2,
  Terminal,
  RefreshCw,
  Copy,
  ExternalLink,
  Laptop,
  Flame,
  ArrowRight,
  Server,
  Activity,
  Check
} from 'lucide-react';
import Toast from '../components/Toast';

export default function HomePage() {
  const { user, token, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [toast, setToast] = useState({ message: '', type: 'info' });
  const [copiedToken, setCopiedToken] = useState(false);

  // Protected route test state
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [testLatency, setTestLatency] = useState(null);

  // AI Prompt builder mock state
  const [promptText, setPromptText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState(0);

  // Backend Health state
  const [healthStatus, setHealthStatus] = useState({ status: 'checking', latency: 0 });

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
  };

  const closeToast = () => {
    setToast({ message: '', type: 'info' });
  };

  // Test /api/health on mount
  useEffect(() => {
    const checkHealth = async () => {
      const startTime = performance.now();
      try {
        const res = await fetch('http://localhost:3000/api/health');
        const data = await res.json();
        const latency = Math.round(performance.now() - startTime);
        if (res.ok) {
          setHealthStatus({ status: 'online', latency, data });
        } else {
          setHealthStatus({ status: 'error', latency, data });
        }
      } catch {
        setHealthStatus({ status: 'offline', latency: 0 });
      }
    };
    checkHealth();
  }, []);

  // Handler to test protected /api/auth/me route
  const handleTestAuth = async () => {
    setTestLoading(true);
    const start = performance.now();
    try {
      const res = await authService.getMe();
      const latency = Math.round(performance.now() - start);
      setTestLatency(latency);
      setTestResult({
        status: 200,
        success: true,
        data: res.data || res,
        timestamp: new Date().toLocaleTimeString(),
      });
      showToast('Protected route verified successfully! 200 OK', 'success');
    } catch (err) {
      const latency = Math.round(performance.now() - start);
      setTestLatency(latency);
      setTestResult({
        status: 401,
        success: false,
        error: err.message,
        timestamp: new Date().toLocaleTimeString(),
      });
      showToast(err.message || 'Token verification failed', 'error');
    } finally {
      setTestLoading(false);
    }
  };

  // Copy token to clipboard
  const handleCopyToken = () => {
    if (!token) return;
    navigator.clipboard.writeText(token);
    setCopiedToken(true);
    showToast('JWT Token copied to clipboard!', 'success');
    setTimeout(() => setCopiedToken(false), 2500);
  };

  // Trigger Mock AI Generation
  const handleGenerateSite = (e) => {
    e.preventDefault();
    if (!promptText.trim()) {
      showToast('Please type a website description prompt first.', 'error');
      return;
    }
    setIsGenerating(true);
    setGenerationStep(1);

    setTimeout(() => setGenerationStep(2), 1000);
    setTimeout(() => setGenerationStep(3), 2000);
    setTimeout(() => {
      setIsGenerating(false);
      setGenerationStep(0);
      showToast(`Website skeleton for "${promptText}" generated successfully!`, 'success');
      setPromptText('');
    }, 3200);
  };

  const sampleProjects = [
    {
      id: 1,
      name: 'SaaS Nova Landing',
      type: 'Dark Glassmorphism Next.js App',
      status: 'Live & Deployed',
      updated: '2 mins ago',
      color: 'from-blue-600 to-indigo-900',
    },
    {
      id: 2,
      name: 'CyberPortfolio 2026',
      type: 'Interactive 3D Three.js Studio',
      status: 'Draft Prototype',
      updated: '1 hour ago',
      color: 'from-purple-600 to-pink-900',
    },
    {
      id: 3,
      name: 'HyperCart E-Commerce',
      type: 'Modern AI-driven Marketplace',
      status: 'Ready to Publish',
      updated: 'Yesterday',
      color: 'from-emerald-600 to-teal-900',
    },
  ];

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col font-sans selection:bg-white/20 selection:text-white">
      {/* Background Glow effects */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[140px]" />
        <div className="absolute top-[40%] right-[10%] w-[450px] h-[450px] bg-purple-500/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-[-10%] left-[30%] w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[160px]" />
      </div>

      {/* Navigation Bar */}
      <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-[#0e0e11]/85 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/15 bg-zinc-950 p-1 flex items-center justify-center shadow-lg shadow-black/40">
              <img
                src="/logo.jpg"
                alt="Craftify Labs Logo"
                className="w-full h-full object-contain rounded-lg"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight text-white">Craftify</span>
                <span className="text-zinc-400 font-medium text-lg">Web Studio</span>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-1.5" />
                  AUTHENTICATED
                </span>
              </div>
            </div>
          </div>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-1 bg-white/[0.03] border border-white/10 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-white/15 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
              }`}
            >
              Overview & Studio
            </button>
            <button
              onClick={() => setActiveTab('auth-test')}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'auth-test'
                  ? 'bg-white/15 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
              }`}
            >
              <Terminal className="w-3.5 h-3.5 text-indigo-400" />
              Auth Tester
            </button>
            <button
              onClick={() => setActiveTab('projects')}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                activeTab === 'projects'
                  ? 'bg-white/15 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
              }`}
            >
              Sample Projects
            </button>
          </nav>

          {/* User Profile & Actions */}
          <div className="flex items-center gap-3">
            {/* User details pill */}
            <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center font-bold text-xs text-white uppercase shadow-inner">
                {user?.name ? user.name.charAt(0) : user?.email?.charAt(0) || 'U'}
              </div>
              <div className="text-left">
                <p className="text-xs font-semibold text-zinc-200 leading-none truncate max-w-[120px]">
                  {user?.name || 'Craftify User'}
                </p>
                <p className="text-[10px] text-zinc-400 font-mono leading-tight truncate max-w-[120px]">
                  {user?.email}
                </p>
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={() => {
                logout();
                showToast('Successfully logged out.', 'info');
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-all cursor-pointer active:scale-95"
              title="Log Out of your account"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Log Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Top Hero Banner: Login Verification Banner */}
        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#15151c] via-[#111115] to-[#0d0d10] p-6 sm:p-8 shadow-2xl">
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Successfully Logged In
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                  <Server className="w-3.5 h-3.5" />
                  Backend: {healthStatus.status === 'online' ? `Online (${healthStatus.latency}ms)` : healthStatus.status}
                </span>
              </div>
              
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
                Welcome, <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-zinc-200 to-zinc-400">{user?.name || user?.email?.split('@')[0] || 'Creator'}</span> 👋
              </h1>
              <p className="text-sm text-zinc-400 max-w-2xl leading-relaxed">
                Your session has been securely established via JSON Web Token (JWT). You can test authenticated API calls, inspect your bearer token, or generate AI websites below.
              </p>
            </div>

            {/* Quick Action Test Buttons */}
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <button
                onClick={handleTestAuth}
                disabled={testLoading}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-white text-zinc-950 hover:bg-zinc-200 transition-all shadow-lg shadow-white/10 active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {testLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-zinc-950" />
                ) : (
                  <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
                )}
                Test Protected Route (/me)
              </button>

              <button
                onClick={handleCopyToken}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-zinc-200 border border-white/10 transition-all active:scale-95 cursor-pointer"
              >
                {copiedToken ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-zinc-400" />}
                {copiedToken ? 'Token Copied!' : 'Copy JWT Token'}
              </button>
            </div>
          </div>
        </section>

        {/* Dynamic Tabs Content */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-[#111114]/90 border border-white/10 backdrop-blur-xl shadow-lg flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-zinc-400">Authenticated Email</p>
                  <p className="text-sm font-semibold text-white truncate max-w-[160px]">{user?.email}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                  <UserCheck className="w-5 h-5" />
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-[#111114]/90 border border-white/10 backdrop-blur-xl shadow-lg flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-zinc-400">Security Model</p>
                  <p className="text-sm font-semibold text-emerald-400 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" /> JWT Bearer 30D
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Key className="w-5 h-5" />
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-[#111114]/90 border border-white/10 backdrop-blur-xl shadow-lg flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-zinc-400">Backend API Port</p>
                  <p className="text-sm font-semibold text-indigo-300 font-mono">http://localhost:3000</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <Server className="w-5 h-5" />
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-[#111114]/90 border border-white/10 backdrop-blur-xl shadow-lg flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-zinc-400">AI Generation Engine</p>
                  <p className="text-sm font-semibold text-purple-300 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4" /> v2.4 Active
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                  <Zap className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* AI Generator Studio Card */}
            <div className="p-6 sm:p-8 rounded-3xl bg-[#111114]/90 border border-white/10 backdrop-blur-xl shadow-xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-indigo-400" />
                    AI Website Prompt Studio
                  </h2>
                  <p className="text-xs text-zinc-400 mt-1">
                    Describe any web application or landing page to prototype it with modern Tailwind CSS and React components.
                  </p>
                </div>
                <span className="self-start sm:self-auto px-3 py-1 rounded-full text-xs font-mono bg-white/5 border border-white/10 text-zinc-300">
                  Sample Workspace Ready
                </span>
              </div>

              {/* Input Form */}
              <form onSubmit={handleGenerateSite} className="space-y-4">
                <div className="relative">
                  <textarea
                    rows={3}
                    value={promptText}
                    onChange={(e) => setPromptText(e.target.value)}
                    placeholder="e.g. Build a high-converting dark-themed landing page for an AI voice agent platform with pricing tier cards, glowing glass effects, and client testimonial sliders..."
                    disabled={isGenerating}
                    className="w-full bg-[#0a0a0c] text-zinc-100 placeholder-zinc-500 rounded-2xl p-4 text-sm border border-white/10 focus:outline-none focus:border-indigo-500/80 focus:ring-2 focus:ring-indigo-500/20 transition-all resize-none font-sans"
                  />
                  <div className="absolute right-3 bottom-3 flex items-center gap-2">
                    <button
                      type="submit"
                      disabled={isGenerating}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold text-xs transition-all flex items-center gap-2 shadow-lg shadow-indigo-500/25 cursor-pointer disabled:opacity-50"
                    >
                      {isGenerating ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Generating...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Generate Website</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Live Generation Progress Steps */}
                {isGenerating && (
                  <div className="p-4 rounded-2xl bg-black/60 border border-indigo-500/30 space-y-3 animate-in fade-in duration-300">
                    <div className="flex items-center justify-between text-xs text-zinc-400">
                      <span className="font-mono text-indigo-300 flex items-center gap-2">
                        <Activity className="w-3.5 h-3.5 animate-pulse" />
                        AI Generation in progress...
                      </span>
                      <span className="font-mono text-zinc-400">Step {generationStep} of 3</span>
                    </div>
                    <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
                        style={{ width: `${(generationStep / 3) * 100}%` }}
                      />
                    </div>
                    <div className="text-xs text-zinc-300 font-mono">
                      {generationStep === 1 && '> Analyzing prompt tokens and structuring semantic HTML5 layout...'}
                      {generationStep === 2 && '> Generating responsive glassmorphism styles and color schemes...'}
                      {generationStep === 3 && '> Linking interactive React hooks, auth middlewares & API endpoints...'}
                    </div>
                  </div>
                )}
              </form>

              {/* Quick suggestions pills */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-xs text-zinc-400 flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-amber-400" /> Suggestions:
                </span>
                {[
                  'Fintech Crypto Dashboard with Dark UI',
                  'Developer Portfolio with Code Terminal',
                  'AI Chat SaaS with Sidebar & History',
                ].map((sug, i) => (
                  <button
                    key={i}
                    onClick={() => setPromptText(sug)}
                    className="px-2.5 py-1 rounded-lg text-xs bg-white/[0.03] hover:bg-white/[0.08] text-zinc-300 border border-white/5 transition-colors cursor-pointer"
                  >
                    {sug}
                  </button>
                ))}
              </div>
            </div>

            {/* Sample Recent Projects Grid */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Layers className="w-5 h-5 text-zinc-400" />
                    Your Sample AI Projects
                  </h2>
                  <p className="text-xs text-zinc-400">
                    Created under account <span className="text-zinc-200 font-mono">{user?.email}</span>
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('projects')}
                  className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium transition-colors cursor-pointer"
                >
                  View All <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {sampleProjects.map((p) => (
                  <div
                    key={p.id}
                    className="group relative rounded-2xl bg-[#111114]/80 border border-white/10 p-5 hover:border-white/20 transition-all duration-300 hover:shadow-xl hover:shadow-black/50 flex flex-col justify-between overflow-hidden"
                  >
                    <div className="space-y-3">
                      <div className={`h-24 w-full rounded-xl bg-gradient-to-tr ${p.color} opacity-80 group-hover:opacity-100 transition-opacity flex items-center justify-center shadow-inner`}>
                        <Globe className="w-8 h-8 text-white/80 group-hover:scale-110 transition-transform" />
                      </div>
                      <div>
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-sm text-white group-hover:text-indigo-300 transition-colors">
                            {p.name}
                          </h3>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-zinc-300">
                            {p.status}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 mt-1">{p.type}</p>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-zinc-500">
                      <span>Updated {p.updated}</span>
                      <button
                        onClick={() => showToast(`Opening project workspace for "${p.name}"`, 'info')}
                        className="text-zinc-300 hover:text-white font-medium flex items-center gap-1 cursor-pointer"
                      >
                        Edit <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Detailed Auth Tester */}
        {activeTab === 'auth-test' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="p-6 rounded-3xl bg-[#111114]/90 border border-white/10 backdrop-blur-xl shadow-xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Terminal className="w-5 h-5 text-indigo-400" />
                    Authentication Verification Console
                  </h2>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Verify that your frontend is communicating correctly with your backend Express server on port 3000.
                  </p>
                </div>
                <button
                  onClick={handleTestAuth}
                  disabled={testLoading}
                  className="self-start sm:self-auto flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all cursor-pointer disabled:opacity-50"
                >
                  {testLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                  Execute GET /api/auth/me
                </button>
              </div>

              {/* User Session Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/5 space-y-2">
                  <div className="flex items-center gap-2 text-zinc-400 text-xs">
                    <UserCheck className="w-4 h-4 text-zinc-300" />
                    <span>User Data in Context (from AuthContext)</span>
                  </div>
                  <pre className="p-3 rounded-xl bg-black/60 font-mono text-xs text-emerald-400 border border-zinc-800 overflow-x-auto">
                    {JSON.stringify(user, null, 2)}
                  </pre>
                </div>

                <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/5 space-y-2">
                  <div className="flex items-center justify-between text-zinc-400 text-xs">
                    <span className="flex items-center gap-2">
                      <Key className="w-4 h-4 text-zinc-300" />
                      <span>Active JWT Bearer Token</span>
                    </span>
                    <button
                      onClick={handleCopyToken}
                      className="text-[11px] text-zinc-400 hover:text-white flex items-center gap-1 font-mono cursor-pointer"
                    >
                      <Copy className="w-3 h-3" /> Copy
                    </button>
                  </div>
                  <div className="p-3 rounded-xl bg-black/60 font-mono text-[11px] text-zinc-400 border border-zinc-800 break-all select-all max-h-[140px] overflow-y-auto">
                    {token || 'No token active'}
                  </div>
                </div>
              </div>

              {/* Live Test Response Box */}
              <div className="p-5 rounded-2xl bg-black/80 border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-mono text-zinc-300">
                    <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold">GET</span>
                    <span>http://localhost:3000/api/auth/me</span>
                  </div>
                  {testResult && (
                    <div className="flex items-center gap-2 text-xs font-mono">
                      <span className={`px-2 py-0.5 rounded ${testResult.success ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                        HTTP {testResult.status} {testResult.success ? 'OK' : 'FAIL'}
                      </span>
                      {testLatency && <span className="text-zinc-400">{testLatency}ms</span>}
                    </div>
                  )}
                </div>

                <pre className="p-4 rounded-xl bg-zinc-950 font-mono text-xs text-zinc-300 border border-zinc-800 overflow-x-auto min-h-[100px] flex items-center justify-start">
                  {testResult ? (
                    JSON.stringify(testResult, null, 2)
                  ) : (
                    <span className="text-zinc-600">Click "Execute GET /api/auth/me" or "Test Protected Route" above to send an authenticated request and view live response...</span>
                  )}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Projects Full View */}
        {activeTab === 'projects' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="p-6 rounded-3xl bg-[#111114]/90 border border-white/10 backdrop-blur-xl shadow-xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Code2 className="w-5 h-5 text-indigo-400" />
                    All Sample Projects & Prototypes
                  </h2>
                  <p className="text-xs text-zinc-400">
                    Explore and test sample AI-generated web apps stored under your account.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('overview')}
                  className="self-start sm:self-auto px-4 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
                >
                  + Create New Project
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sampleProjects.map((p) => (
                  <div
                    key={p.id}
                    className="rounded-2xl bg-zinc-900/50 border border-white/10 p-5 space-y-4 hover:border-indigo-500/40 transition-all"
                  >
                    <div className={`h-32 w-full rounded-xl bg-gradient-to-tr ${p.color} flex items-center justify-center`}>
                      <Laptop className="w-10 h-10 text-white/90" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-white text-base">{p.name}</h3>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {p.status}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400">{p.type}</p>
                    </div>
                    <div className="pt-2 flex items-center gap-2">
                      <button
                        onClick={() => showToast(`Opening code editor for ${p.name}`, 'info')}
                        className="flex-1 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-zinc-200 font-medium transition-colors cursor-pointer"
                      >
                        Code Editor
                      </button>
                      <button
                        onClick={() => showToast(`Launching live preview for ${p.name}`, 'success')}
                        className="flex-1 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs text-white font-medium transition-colors cursor-pointer"
                      >
                        Live Preview
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 bg-[#0e0e11]/80 py-6 text-center text-xs text-zinc-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Craftify Labs Web Builder v2.0 • ESM + React 19 + Tailwind v4</span>
          </div>
          <div>
            <span>Logged in as: <span className="text-zinc-300 font-mono">{user?.email}</span></span>
          </div>
        </div>
      </footer>

      {/* Toast Notification */}
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={closeToast}
      />
    </div>
  );
}
