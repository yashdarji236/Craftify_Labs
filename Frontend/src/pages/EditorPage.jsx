import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from '../router/Router';
import { projectStorage } from '../builder/storage/index.js';
import { validateProject, migrateProject } from '../builder/model/index.js';
import { EditorProvider, useEditorStore } from '../builder/store/editorContext.jsx';
import ComponentPalette from '../builder/editor/ComponentPalette.jsx';
import LayersPanel from '../builder/editor/LayersPanel.jsx';
import CanvasRenderer from '../builder/editor/CanvasRenderer.jsx';
import PropertiesInspector from '../builder/editor/PropertiesInspector.jsx';
import {
  ArrowLeft,
  Download,
  Upload,
  Undo2,
  Redo2,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Code2,
  RefreshCw,
  X,
} from 'lucide-react';
import Toast from '../components/Toast';

/**
 * Editor Shell Top Toolbar
 */
function EditorToolbar({ onToast }) {
  const { navigate } = useRouter();
  const {
    project,
    canUndo,
    canRedo,
    undo,
    redo,
    saveStatus,
    saveNow,
  } = useEditorStore();

  const fileInputRef = useRef(null);
  const [importErrors, setImportErrors] = useState(null);

  const handleExportJson = () => {
    if (!project) return;
    try {
      const jsonString = JSON.stringify(project, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const filename = `${(project.project?.name || 'project')
        .toLowerCase()
        .replace(/\s+/g, '_')}_document.json`;
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      if (onToast) onToast(`Exported "${filename}" successfully!`, 'success');
    } catch (err) {
      if (onToast) onToast(err.message || 'Export failed.', 'error');
    }
  };

  const handleFilePicked = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const content = evt.target.result;
        let parsed;
        try {
          parsed = JSON.parse(content);
        } catch {
          setImportErrors(['Uploaded file is not valid JSON syntax.']);
          return;
        }

        const migrated = migrateProject(parsed);
        const validation = validateProject(migrated);

        if (!validation.ok) {
          setImportErrors(validation.errors);
          if (onToast) onToast('Import rejected: document validation failed.', 'error');
          return;
        }

        // Re-assign owner
        validation.project.project.ownerId = project.project.ownerId;
        await projectStorage.save(validation.project);
        window.location.reload();
      } catch (err) {
        setImportErrors([err.message || 'Import error.']);
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  return (
    <>
      <header className="h-16 border-b border-white/10 bg-[#111114]/95 backdrop-blur-2xl px-4 sm:px-6 flex items-center justify-between z-30 shrink-0 select-none">
        {/* Left: Back & Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            title="Return to Projects Dashboard"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Projects</span>
          </button>

          <div className="h-4 w-px bg-white/10" />

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl overflow-hidden border border-white/15 shadow-sm bg-[#0e0e11] shrink-0 p-0.5 flex items-center justify-center">
              <img src="/logo.jpg" alt="Logo" className="w-full h-full object-contain rounded-lg" />
            </div>
            <span className="font-bold text-sm text-white truncate max-w-[180px] sm:max-w-[280px]">
              {project?.project?.name}
            </span>
          </div>
        </div>

        {/* Center: Undo / Redo & Save Status */}
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-xl bg-white/5 border border-white/10 p-0.5">
            <button
              onClick={undo}
              disabled={!canUndo}
              title="Undo (Ctrl+Z)"
              className="p-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              onClick={redo}
              disabled={!canRedo}
              title="Redo (Ctrl+Shift+Z or Ctrl+Y)"
              className="p-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              <Redo2 className="w-4 h-4" />
            </button>
          </div>

          {/* Save Status Badge */}
          {saveStatus === 'saved' && (
            <span className="hidden md:inline-flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="w-3 h-3" />
              <span>Saved</span>
            </span>
          )}
          {saveStatus === 'saving' && (
            <span className="hidden md:inline-flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1 rounded-full bg-white/5 text-zinc-400 border border-white/10 animate-pulse">
              <Loader2 className="w-3 h-3 animate-spin text-zinc-300" />
              <span>Saving...</span>
            </span>
          )}
          {saveStatus === 'error' && (
            <button
              onClick={saveNow}
              title="Click to retry saving"
              className="inline-flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30 hover:bg-rose-500/25 transition-colors cursor-pointer"
            >
              <AlertTriangle className="w-3 h-3 text-rose-400" />
              <span>Save Error (Retry)</span>
            </button>
          )}
        </div>

        {/* Right: Import / Export */}
        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFilePicked}
            accept=".json,application/json"
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            title="Import valid document JSON"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-200 transition-colors cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-zinc-400" />
            <span className="hidden sm:inline">Import</span>
          </button>

          <button
            onClick={handleExportJson}
            title="Download document JSON file"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-zinc-200 text-zinc-950 shadow-md shadow-white/10 hover:shadow-white/20 active:scale-[0.99] transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-zinc-950" />
            <span>Export</span>
          </button>
        </div>
      </header>

      {/* Import Error Modal */}
      {importErrors && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-3xl bg-[#111114]/95 border border-rose-500/30 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between text-rose-400">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="font-bold text-base text-white">Import Validation Failed</h3>
              </div>
              <button
                onClick={() => setImportErrors(null)}
                className="p-1 rounded text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-400">
              The JSON file was parsed but violated document model specifications. The active project was not modified.
            </p>

            <ul className="p-3.5 rounded-2xl bg-zinc-950 border border-rose-500/20 font-mono text-xs text-rose-300 space-y-1.5 max-h-56 overflow-y-auto">
              {importErrors.map((err, i) => (
                <li key={i} className="leading-relaxed">
                  • {err}
                </li>
              ))}
            </ul>

            <div className="flex justify-end">
              <button
                onClick={() => setImportErrors(null)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs text-white font-semibold transition-colors cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Main Editor Shell View
 */
export default function EditorPage({ projectId }) {
  const { user } = useAuth();
  const { navigate } = useRouter();

  const [initialProject, setInitialProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [toast, setToast] = useState({ message: '', type: 'info' });

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
  };

  const closeToast = () => {
    setToast({ message: '', type: 'info' });
  };

  useEffect(() => {
    async function loadEditorProject() {
      if (!projectId || !user?._id) return;
      setLoading(true);
      setLoadError(null);

      try {
        const stored = await projectStorage.get(projectId, user._id);
        if (!stored) {
          throw new Error(
            `Project "${projectId}" not found or does not belong to your account.`
          );
        }

        const migrated = migrateProject(stored);
        const validation = validateProject(migrated);
        if (!validation.ok) {
          throw new Error(
            `Document validation failed: ${validation.errors.join('; ')}`
          );
        }

        setInitialProject(validation.project);
      } catch (err) {
        setLoadError(err.message || 'Failed to load project into editor.');
      } finally {
        setLoading(false);
      }
    }

    loadEditorProject();
  }, [projectId, user?._id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center gap-4 text-zinc-300">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-200" />
        <span className="text-xs font-mono tracking-wide text-zinc-400">Loading project into editor shell...</span>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-[#09090b] text-zinc-100 flex items-center justify-center p-6">
        <div className="w-full max-w-lg rounded-3xl bg-[#111114]/95 border border-white/15 p-8 shadow-[0_25px_60px_rgba(0,0,0,0.9)] space-y-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto text-rose-400">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white tracking-tight">Project Validation Error</h2>
            <p className="text-xs text-rose-300/80 leading-relaxed max-h-40 overflow-y-auto p-3 rounded-xl bg-zinc-950 font-mono text-left border border-white/5">
              {loadError}
            </p>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-zinc-950 hover:bg-zinc-200 font-semibold text-xs shadow-lg transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Dashboard</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <EditorProvider initialProject={initialProject} onToast={showToast}>
      <div className="h-screen w-screen bg-[#09090b] text-zinc-100 flex flex-col overflow-hidden font-sans select-none relative">
        {/* Top Metallic Toolbar */}
        <EditorToolbar onToast={showToast} />

        {/* 4-Column Workspace: Palette | Layers | Canvas | Inspector */}
        <div className="flex-1 flex overflow-hidden relative">
          <ComponentPalette />
          <LayersPanel />
          <CanvasRenderer />
          <PropertiesInspector />
        </div>

        {/* Toast Notification */}
        <Toast message={toast.message} type={toast.type} onClose={closeToast} />
      </div>
    </EditorProvider>
  );
}
