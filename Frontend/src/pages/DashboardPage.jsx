import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from '../router/Router';
import { projectStorage } from '../builder/storage/index.js';
import { createDemoProject, createBlankProject } from '../builder/model/index.js';
import {
  Plus,
  Trash2,
  Copy,
  Edit3,
  Sparkles,
  Clock,
  Loader2,
  LogOut,
  AlertCircle,
  FileCode2,
  Layers,
  ChevronRight,
  ShieldCheck,
  FolderOpen,
  Layout,
  X,
} from 'lucide-react';
import Toast from '../components/Toast';

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const { navigate } = useRouter();

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState({ message: '', type: 'info' });

  // Create Project Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [templateType, setTemplateType] = useState('demo'); // 'demo' | 'blank'
  const [creating, setCreating] = useState(false);

  // Rename Modal State
  const [renameTarget, setRenameTarget] = useState(null);
  const [renameValue, setRenameValue] = useState('');

  // Delete Confirmation Modal State
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
  };

  const closeToast = () => {
    setToast({ message: '', type: 'info' });
  };

  const loadProjects = async () => {
    if (!user?._id) return;
    setLoading(true);
    setError(null);
    try {
      const list = await projectStorage.list(user._id);
      setProjects(list);
    } catch (err) {
      setError(err.message || 'Failed to load projects from local storage.');
      showToast(err.message || 'Failed to load projects', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, [user?._id]);

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!newProjectName.trim()) {
      showToast('Please provide a project name.', 'error');
      return;
    }

    setCreating(true);
    try {
      const doc =
        templateType === 'demo'
          ? createDemoProject(user._id, newProjectName.trim())
          : createBlankProject(user._id, newProjectName.trim());

      await projectStorage.save(doc);
      showToast(`Project "${doc.project.name}" created successfully!`, 'success');
      setIsCreateOpen(false);
      setNewProjectName('');
      await loadProjects();
      navigate(`/editor/${doc.project.id}`);
    } catch (err) {
      showToast(err.message || 'Error creating project', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleDuplicate = async (projectId, e) => {
    e.stopPropagation();
    try {
      const duplicated = await projectStorage.duplicate(projectId, user._id);
      showToast(`Duplicated as "${duplicated.project.name}"`, 'success');
      await loadProjects();
    } catch (err) {
      showToast(err.message || 'Failed to duplicate project', 'error');
    }
  };

  const handleConfirmRename = async (e) => {
    e.preventDefault();
    if (!renameTarget || !renameValue.trim()) return;

    try {
      await projectStorage.rename(renameTarget.project.id, user._id, renameValue.trim());
      showToast('Project renamed successfully.', 'success');
      setRenameTarget(null);
      setRenameValue('');
      await loadProjects();
    } catch (err) {
      showToast(err.message || 'Failed to rename project', 'error');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await projectStorage.delete(deleteTarget.project.id, user._id);
      showToast(`Deleted project "${deleteTarget.project.name}"`, 'success');
      setDeleteTarget(null);
      await loadProjects();
    } catch (err) {
      showToast(err.message || 'Failed to delete project', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (isoString) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString || 'Recently';
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-[#09090b] text-zinc-100 flex flex-col font-sans selection:bg-white/20 selection:text-white overflow-x-hidden">
      {/* Fullscreen Metallic Silk Wallpaper Background - Exact Login Page Match */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <img
          src="/img2.jpg"
          alt="Dark metallic texture background"
          className="w-full h-full object-cover object-center filter brightness-95 contrast-105 opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#09090b]/80 via-[#09090b]/92 to-[#09090b]" />
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
      </div>

      {/* Top Metallic Navigation Header */}
      <header className="relative z-20 border-b border-white/10 bg-[#111114]/90 backdrop-blur-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          {/* Brand Logo - Exact Login Page Style */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl overflow-hidden border border-white/15 shadow-[0_4px_20px_rgba(0,0,0,0.5)] bg-[#0e0e11] shrink-0 p-1 flex items-center justify-center">
                <img
                  src="/logo.jpg"
                  alt="Craftify Labs Logo"
                  className="w-full h-full object-contain rounded-xl"
                />
              </div>
              <div className="flex items-center tracking-tight font-extrabold text-2xl text-zinc-100 font-sans">
                <span>Craftify</span>
                <span className="text-zinc-400 font-normal ml-1.5">Labs</span>
                <span className="w-2 h-2 rounded-full bg-zinc-300 ml-1.5 mt-2 inline-block shadow-[0_0_10px_rgba(255,255,255,0.7)]" />
              </div>
            </div>

            <nav className="hidden md:flex items-center gap-1.5 border-l border-white/10 pl-6">
              <button
                onClick={() => navigate('/dashboard')}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white/10 text-white border border-white/10 cursor-pointer shadow-sm"
              >
                Projects
              </button>
              <button
                onClick={() => navigate('/overview')}
                className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              >
                API Diagnostics
              </button>
            </nav>
          </div>

          {/* Action CTAs & Profile */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setNewProjectName('Acme Studio Website');
                setTemplateType('demo');
                setIsCreateOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-semibold shadow-lg shadow-white/10 hover:shadow-white/20 active:scale-[0.99] transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 text-zinc-950" />
              <span>New Project</span>
            </button>

            <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-[#0e0e11]/80 border border-white/10 text-xs text-zinc-300 shadow-inner">
              <ShieldCheck className="w-4 h-4 text-zinc-300" />
              <span className="font-mono text-[11px] truncate max-w-[170px] text-zinc-300">
                {user?.email}
              </span>
            </div>

            <button
              onClick={logout}
              title="Logout"
              className="p-2.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 border border-white/10 transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
        {/* Hero Banner Panel in Metallic Silk Glass */}
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#111114]/90 backdrop-blur-2xl p-6 sm:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.85)]">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2.5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/15 text-zinc-200 text-xs font-medium shadow-sm">
                <Sparkles className="w-3.5 h-3.5 text-zinc-200" />
                <span>Visual Studio • Phase 1 AST Engine</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white font-sans">
                Workspace Projects
              </h1>
              <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl leading-relaxed">
                Design and organize website prototypes powered by an immutable JSON document tree.
                Storage is isolated to user <code className="text-zinc-200 font-mono bg-black/40 px-2 py-0.5 rounded border border-white/10 text-xs">{user?.email}</code>.
              </p>
            </div>

            <button
              onClick={() => {
                setNewProjectName('Craftify Prototype');
                setTemplateType('demo');
                setIsCreateOpen(true);
              }}
              className="self-start md:self-auto flex items-center gap-2 px-5 py-3 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-semibold text-xs sm:text-sm shadow-xl shadow-white/10 hover:shadow-white/20 active:scale-[0.99] transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 text-zinc-950" />
              <span>Create Project</span>
            </button>
          </div>
        </div>

        {/* State: Loading */}
        {loading && (
          <div className="py-24 flex flex-col items-center justify-center gap-3 text-zinc-400">
            <Loader2 className="w-8 h-8 animate-spin text-zinc-200" />
            <span className="text-xs font-mono tracking-wide text-zinc-400">Loading workspace projects from IndexedDB...</span>
          </div>
        )}

        {/* State: Error */}
        {!loading && error && (
          <div className="p-6 rounded-2xl bg-rose-950/40 border border-rose-500/30 text-rose-200 flex items-start gap-4 backdrop-blur-xl">
            <AlertCircle className="w-6 h-6 shrink-0 mt-0.5 text-rose-400" />
            <div className="space-y-1">
              <h3 className="font-semibold text-sm">Failed to Load Projects</h3>
              <p className="text-xs text-rose-300/80">{error}</p>
              <button
                onClick={loadProjects}
                className="mt-3 px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-xs font-semibold transition-colors cursor-pointer"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* State: Empty State */}
        {!loading && !error && projects.length === 0 && (
          <div className="py-20 px-6 rounded-3xl border border-dashed border-white/15 bg-[#111114]/80 backdrop-blur-2xl text-center flex flex-col items-center justify-center space-y-5 shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-[#0e0e11] border border-white/15 shadow-[0_4px_20px_rgba(0,0,0,0.5)] flex items-center justify-center text-zinc-400">
              <FolderOpen className="w-8 h-8 text-zinc-300" />
            </div>
            <div className="space-y-1.5 max-w-md">
              <h2 className="text-xl font-bold text-white tracking-tight">No Projects Yet</h2>
              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                You haven't created any website builder projects yet. Launch with our hero-and-grid showcase demo, or begin from an empty single-page canvas.
              </p>
            </div>
            <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
              <button
                onClick={() => {
                  setNewProjectName('Craftify Demo Project');
                  setTemplateType('demo');
                  setIsCreateOpen(true);
                }}
                className="px-5 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-semibold shadow-lg shadow-white/10 hover:shadow-white/20 transition-all cursor-pointer flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-zinc-950" />
                <span>Launch with Demo Seed</span>
              </button>
              <button
                onClick={() => {
                  setNewProjectName('Blank Canvas');
                  setTemplateType('blank');
                  setIsCreateOpen(true);
                }}
                className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-200 text-xs font-semibold border border-white/10 transition-all cursor-pointer"
              >
                Start Blank Project
              </button>
            </div>
          </div>
        )}

        {/* State: Projects Grid */}
        {!loading && !error && projects.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-zinc-400 px-1">
              <span className="font-medium text-zinc-300">
                {projects.length} {projects.length === 1 ? 'Project' : 'Projects'} Saved
              </span>
              <span className="font-mono text-[11px] text-zinc-500">IndexedDB Local Store • Schema v1</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((item) => {
                const proj = item.project;
                const pageCount = item.pages?.length || 0;

                return (
                  <div
                    key={proj.id}
                    onClick={() => navigate(`/editor/${proj.id}`)}
                    className="group relative rounded-2xl bg-[#111114]/90 backdrop-blur-2xl border border-white/10 hover:border-white/30 p-6 flex flex-col justify-between space-y-6 transition-all shadow-[0_10px_30px_rgba(0,0,0,0.6)] hover:shadow-[0_20px_50px_rgba(0,0,0,0.9)] cursor-pointer"
                  >
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-[#0e0e11] border border-white/15 flex items-center justify-center text-zinc-200 group-hover:border-white/30 transition-all shadow-md">
                            <FileCode2 className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-bold text-white text-base group-hover:text-zinc-200 transition-colors line-clamp-1">
                              {proj.name}
                            </h3>
                            <span className="text-[10px] font-mono text-zinc-500 block">{proj.id}</span>
                          </div>
                        </div>

                        <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-white/5 text-zinc-300 border border-white/10 shrink-0">
                          {pageCount} {pageCount === 1 ? 'page' : 'pages'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-zinc-500">
                        <Clock className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                        <span>Updated {formatDate(proj.updatedAt)}</span>
                      </div>
                    </div>

                    {/* Card Actions Footer */}
                    <div className="pt-4 border-t border-white/5 flex items-center justify-between gap-2">
                      <span className="text-xs text-zinc-200 font-semibold inline-flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                        <span>Open Studio</span>
                        <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
                      </span>

                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          title="Rename project"
                          onClick={() => {
                            setRenameTarget(item);
                            setRenameValue(proj.name);
                          }}
                          className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          title="Duplicate project"
                          onClick={(e) => handleDuplicate(proj.id, e)}
                          className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          title="Delete project"
                          onClick={() => setDeleteTarget(item)}
                          className="p-2 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Modal: Create Project (Matches AuthCard Frosted Style) */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-3xl bg-[#111114]/95 border border-white/15 p-7 shadow-[0_30px_70px_rgba(0,0,0,0.9)] space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-white tracking-tight">Create Project</h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Initialize a new document tree in your workspace.
                </p>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-300">Project Name</label>
                <input
                  type="text"
                  autoFocus
                  required
                  placeholder="e.g. Acme Studio Landing"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-[#0e0e11] border border-white/10 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-white/30 transition-colors"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-300">Starting Template</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setTemplateType('demo')}
                    className={`p-3.5 rounded-2xl border text-left space-y-1.5 transition-all cursor-pointer ${
                      templateType === 'demo'
                        ? 'border-white/40 bg-white/10 text-white shadow-lg'
                        : 'border-white/10 bg-[#0e0e11] text-zinc-400 hover:border-white/20'
                    }`}
                  >
                    <div className="font-semibold text-xs flex items-center gap-1.5 text-zinc-100">
                      <Sparkles className="w-3.5 h-3.5 text-zinc-300" />
                      <span>Demo Seed</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-snug">Hero section, features grid, responsive layout</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTemplateType('blank')}
                    className={`p-3.5 rounded-2xl border text-left space-y-1.5 transition-all cursor-pointer ${
                      templateType === 'blank'
                        ? 'border-white/40 bg-white/10 text-white shadow-lg'
                        : 'border-white/10 bg-[#0e0e11] text-zinc-400 hover:border-white/20'
                    }`}
                  >
                    <div className="font-semibold text-xs flex items-center gap-1.5 text-zinc-100">
                      <Layout className="w-3.5 h-3.5 text-zinc-300" />
                      <span>Blank Canvas</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-snug">Empty single-page container to build from scratch</p>
                  </button>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  disabled={creating}
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-medium text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2.5 rounded-xl bg-white hover:bg-zinc-200 disabled:opacity-50 text-zinc-950 text-xs font-semibold shadow-lg shadow-white/10 transition-all cursor-pointer flex items-center gap-2"
                >
                  {creating && <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-950" />}
                  <span>Create & Open</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Rename Project */}
      {renameTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-3xl bg-[#111114]/95 border border-white/15 p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">Rename Project</h3>
            <form onSubmit={handleConfirmRename} className="space-y-4">
              <input
                type="text"
                autoFocus
                required
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[#0e0e11] border border-white/10 text-white text-sm focus:outline-none focus:border-white/30 transition-colors"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRenameTarget(null)}
                  className="px-3 py-2 rounded-xl text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Delete Project Confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-3xl bg-[#111114]/95 border border-rose-500/25 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Delete Project?</h3>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Are you sure you want to delete{' '}
              <strong className="text-white">{deleteTarget.project.name}</strong>? This action will permanently remove the document from your local storage.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteTarget(null)}
                className="px-3 py-2 rounded-xl text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
              >
                {deleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Delete Permanently</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Component */}
      <Toast message={toast.message} type={toast.type} onClose={closeToast} />
    </div>
  );
}
