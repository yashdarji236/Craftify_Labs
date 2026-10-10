import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from '../router/Router';
import { projectStorage } from '../builder/storage/index.js';
import {
  validateProject,
  migrateProject,
  NODE_REGISTRY,
  NODE_TYPES,
  findNode,
} from '../builder/model/index.js';
import {
  ArrowLeft,
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Sliders,
  Palette,
  Layout,
  Type,
  Image as ImageIcon,
  Square,
  Link as LinkIcon,
  Grid as GridIcon,
  Maximize2,
  Minus,
  FormInput,
  TextCursorInput,
  Box,
  Info,
  ChevronDown,
  ChevronRight,
  X,
  Loader2,
} from 'lucide-react';
import Toast from '../components/Toast';

// Icon map for component palette & layers
const PALETTE_ICONS = {
  Page: Layout,
  Section: Box,
  Container: Layers,
  Grid: GridIcon,
  Heading: Type,
  Text: Type,
  Image: ImageIcon,
  Button: Square,
  Link: LinkIcon,
  Spacer: Maximize2,
  Divider: Minus,
  Form: FormInput,
  Input: TextCursorInput,
};

/**
 * Recursive Tree Node renderer for the Layers Panel.
 */
function LayerItem({ node, selectedId, onSelect, depth = 0 }) {
  const [collapsed, setCollapsed] = useState(false);
  const hasChildren = Array.isArray(node.children) && node.children.length > 0;
  const isSelected = selectedId === node.id;
  const Icon = PALETTE_ICONS[node.type] || Box;

  return (
    <div className="select-none text-xs">
      <div
        onClick={(e) => {
          e.stopPropagation();
          onSelect(node.id);
        }}
        style={{ paddingLeft: `${depth * 14 + 10}px` }}
        className={`group flex items-center gap-1.5 py-1.5 pr-2.5 rounded-xl cursor-pointer transition-all ${
          isSelected
            ? 'bg-white/15 text-white border border-white/20 shadow-sm'
            : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5 border border-transparent'
        }`}
      >
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setCollapsed(!collapsed);
            }}
            className="p-0.5 rounded hover:bg-white/10 text-zinc-500 hover:text-zinc-300"
          >
            {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        ) : (
          <span className="w-3 inline-block" />
        )}

        <Icon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white' : 'text-zinc-500'}`} />

        <span className="font-medium truncate max-w-[120px]">
          {node.name || node.type}
        </span>

        <span className="ml-auto text-[9px] font-mono text-zinc-600 uppercase group-hover:text-zinc-500">
          {node.type}
        </span>
      </div>

      {hasChildren && !collapsed && (
        <div className="space-y-0.5 mt-0.5">
          {node.children.map((child) => (
            <LayerItem
              key={child.id}
              node={child}
              selectedId={selectedId}
              onSelect={onSelect}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Recursive Semantic Canvas Renderer.
 * Read-only layout constructed strictly from the AST document model.
 * Text content is escaped; dangerouslySetInnerHTML is NEVER used.
 */
function CanvasNode({ node, selectedId, onSelect }) {
  if (!node) return null;

  const isSelected = selectedId === node.id;
  const selectionClass = isSelected
    ? 'ring-2 ring-white ring-offset-2 ring-offset-black'
    : 'hover:outline hover:outline-1 hover:outline-dashed hover:outline-white/40';

  const handleClick = (e) => {
    e.stopPropagation();
    onSelect(node.id);
  };

  const childrenRendered = Array.isArray(node.children)
    ? node.children.map((child) => (
        <CanvasNode
          key={child.id}
          node={child}
          selectedId={selectedId}
          onSelect={onSelect}
        />
      ))
    : null;

  switch (node.type) {
    case 'Page':
      return (
        <div
          data-node-id={node.id}
          onClick={handleClick}
          style={node.styles || {}}
          className={`w-full min-h-screen transition-all ${selectionClass}`}
        >
          {childrenRendered}
        </div>
      );

    case 'Section':
      return (
        <section
          data-node-id={node.id}
          onClick={handleClick}
          style={node.styles || {}}
          className={`relative transition-all ${selectionClass}`}
        >
          {childrenRendered}
        </section>
      );

    case 'Container':
      return (
        <div
          data-node-id={node.id}
          onClick={handleClick}
          style={node.styles || {}}
          className={`relative transition-all ${selectionClass}`}
        >
          {childrenRendered}
        </div>
      );

    case 'Grid':
      return (
        <div
          data-node-id={node.id}
          onClick={handleClick}
          style={node.styles || {}}
          className={`relative transition-all ${selectionClass}`}
        >
          {childrenRendered}
        </div>
      );

    case 'Heading': {
      const level = (node.props?.level || 'h2').toLowerCase();
      const text = String(node.props?.text ?? 'Heading');
      const HeadingTag = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(level) ? level : 'h2';

      return (
        <HeadingTag
          data-node-id={node.id}
          onClick={handleClick}
          style={node.styles || {}}
          className={`transition-all ${selectionClass}`}
        >
          {text}
        </HeadingTag>
      );
    }

    case 'Text': {
      const content = String(node.props?.content ?? '');
      return (
        <p
          data-node-id={node.id}
          onClick={handleClick}
          style={node.styles || {}}
          className={`transition-all ${selectionClass}`}
        >
          {content}
        </p>
      );
    }

    case 'Image': {
      const src = String(node.props?.src || '/img2.jpg');
      const alt = String(node.props?.alt || 'Visual element');
      return (
        <img
          data-node-id={node.id}
          onClick={handleClick}
          src={src}
          alt={alt}
          style={node.styles || {}}
          className={`transition-all ${selectionClass}`}
        />
      );
    }

    case 'Button': {
      const label = String(node.props?.label ?? 'Click Me');
      return (
        <button
          type="button"
          data-node-id={node.id}
          onClick={handleClick}
          style={node.styles || {}}
          className={`transition-all ${selectionClass}`}
        >
          {label}
        </button>
      );
    }

    case 'Link': {
      const text = String(node.props?.text ?? 'Link text');
      return (
        <span
          data-node-id={node.id}
          onClick={handleClick}
          style={node.styles || {}}
          className={`cursor-pointer transition-all ${selectionClass}`}
        >
          {text}
        </span>
      );
    }

    case 'Spacer':
      return (
        <div
          data-node-id={node.id}
          onClick={handleClick}
          style={node.styles || { height: '32px' }}
          className={`transition-all ${selectionClass}`}
        />
      );

    case 'Divider':
      return (
        <hr
          data-node-id={node.id}
          onClick={handleClick}
          style={node.styles || {}}
          className={`transition-all ${selectionClass}`}
        />
      );

    case 'Form':
      return (
        <form
          data-node-id={node.id}
          onClick={handleClick}
          onSubmit={(e) => e.preventDefault()}
          style={node.styles || {}}
          className={`transition-all ${selectionClass}`}
        >
          {childrenRendered}
        </form>
      );

    case 'Input': {
      const placeholder = String(node.props?.placeholder || '');
      const inputType = String(node.props?.type || 'text');
      return (
        <input
          data-node-id={node.id}
          onClick={handleClick}
          readOnly
          type={inputType}
          placeholder={placeholder}
          style={node.styles || {}}
          className={`transition-all ${selectionClass}`}
        />
      );
    }

    default:
      return (
        <div
          data-node-id={node.id}
          onClick={handleClick}
          className={`p-2 border border-zinc-700 text-zinc-400 text-xs ${selectionClass}`}
        >
          Unknown Node Type: {node.type}
        </div>
      );
  }
}

export default function EditorPage({ projectId }) {
  const { user } = useAuth();
  const { navigate } = useRouter();

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [toast, setToast] = useState({ message: '', type: 'info' });

  // Editor State
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [importErrors, setImportErrors] = useState(null);

  const fileInputRef = useRef(null);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
  };

  const closeToast = () => {
    setToast({ message: '', type: 'info' });
  };

  // Load, migrate, and validate project on mount
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

        setProject(validation.project);
        if (validation.project.pages?.[0]?.root) {
          setSelectedNodeId(validation.project.pages[0].root.id);
        }
      } catch (err) {
        setLoadError(err.message || 'Failed to load project into editor.');
      } finally {
        setLoading(false);
      }
    }

    loadEditorProject();
  }, [projectId, user?._id]);

  // Handle Export JSON
  const handleExportJson = () => {
    if (!project) return;
    try {
      const jsonString = JSON.stringify(project, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const filename = `${(project.project?.name || 'project').toLowerCase().replace(/\s+/g, '_')}_document.json`;
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast(`Exported "${filename}" successfully!`, 'success');
    } catch (err) {
      showToast(err.message || 'Export failed.', 'error');
    }
  };

  // Handle Import JSON
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
          showToast('Import rejected: document model validation failed.', 'error');
          return;
        }

        // Re-assign current owner to guarantee authorization
        validation.project.project.ownerId = user._id;

        // Persist via storage adapter
        await projectStorage.save(validation.project);

        setProject(validation.project);
        setSelectedNodeId(validation.project.pages[0].root.id);
        setImportErrors(null);
        showToast('Project JSON imported and validated successfully!', 'success');
      } catch (err) {
        setImportErrors([err.message || 'Unexpected error during import.']);
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };

    reader.readAsText(file);
  };

  const activePage = project?.pages?.find((p) => p.isHome) || project?.pages?.[0];
  const selectedNode = activePage ? findNode(activePage.root, selectedNodeId) : null;

  // Loading Screen
  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center gap-4 text-zinc-300">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-200" />
        <span className="text-xs font-mono tracking-wide text-zinc-400">Loading project into editor shell...</span>
      </div>
    );
  }

  // Friendly Error Screen
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
    <div className="h-screen w-screen bg-[#09090b] text-zinc-100 flex flex-col overflow-hidden font-sans select-none relative">
      {/* 1. TOP METALLIC TOOLBAR REGION */}
      <header className="h-16 border-b border-white/10 bg-[#111114]/95 backdrop-blur-2xl px-4 sm:px-6 flex items-center justify-between z-30 shrink-0">
        {/* Left: Back & Project Metadata */}
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

          {/* Mini Logo */}
          <div className="w-7 h-7 rounded-xl overflow-hidden border border-white/15 shadow-sm bg-[#0e0e11] shrink-0 p-0.5 flex items-center justify-center">
            <img src="/logo.jpg" alt="Logo" className="w-full h-full object-contain rounded-lg" />
          </div>

          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-white truncate max-w-[180px] sm:max-w-[280px]">
              {project?.project?.name}
            </span>
          </div>

          <span className="hidden lg:inline-flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-white/5 text-zinc-300 border border-white/10">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>Saved locally (IndexedDB)</span>
          </span>
        </div>

        {/* Right: Actions (Import / Export JSON) */}
        <div className="flex items-center gap-2.5">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFilePicked}
            accept=".json,application/json"
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            title="Import project JSON file"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-200 transition-colors cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-zinc-300" />
            <span>Import JSON</span>
          </button>

          <button
            onClick={handleExportJson}
            title="Export project as valid JSON"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-zinc-200 text-zinc-950 shadow-lg shadow-white/10 hover:shadow-white/20 active:scale-[0.99] transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-zinc-950" />
            <span>Export JSON</span>
          </button>
        </div>
      </header>

      {/* WORKSPACE MAIN BODY: 4 COLUMNS / PANELS */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* 2. LEFT COMPONENT PALETTE (METALLIC PANEL) */}
        <aside className="w-56 border-r border-white/10 bg-[#111114]/90 backdrop-blur-2xl flex flex-col shrink-0 z-20">
          <div className="p-3.5 border-b border-white/10 flex items-center justify-between text-xs font-semibold text-zinc-200">
            <div className="flex items-center gap-2">
              <Palette className="w-3.5 h-3.5 text-zinc-300" />
              <span>Components</span>
            </div>
            <span className="text-[10px] font-mono text-zinc-500">{NODE_TYPES.length}</span>
          </div>

          <div className="p-2 space-y-1 overflow-y-auto flex-1">
            <p className="text-[10px] text-zinc-500 px-2 py-1 leading-tight font-mono">
              Registered AST nodes:
            </p>

            {NODE_TYPES.map((type) => {
              const def = NODE_REGISTRY[type];
              const Icon = PALETTE_ICONS[type] || Box;

              return (
                <div
                  key={type}
                  title={`${def.label}: ${def.isContainer ? 'Container' : 'Leaf'}`}
                  className="p-2.5 rounded-xl bg-[#0e0e11]/80 hover:bg-white/5 border border-white/5 hover:border-white/15 flex items-center gap-2.5 text-xs text-zinc-300 cursor-default transition-all"
                >
                  <Icon className="w-4 h-4 text-zinc-400 shrink-0" />
                  <div className="truncate flex-1">
                    <span className="font-semibold text-xs text-zinc-200 block truncate">
                      {def.label}
                    </span>
                    <span className="text-[9px] text-zinc-500 font-mono block">
                      {def.isContainer ? 'Container' : 'Leaf Element'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        {/* 3. LAYERS TREE PANEL */}
        <aside className="w-64 border-r border-white/10 bg-[#0e0e12]/90 backdrop-blur-2xl flex flex-col shrink-0 z-10">
          <div className="p-3.5 border-b border-white/10 flex items-center justify-between text-xs font-semibold text-zinc-200">
            <div className="flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-zinc-300" />
              <span>Layers Tree</span>
            </div>
            <span className="text-[10px] font-mono text-zinc-500">Hierarchy</span>
          </div>

          <div className="p-2 overflow-y-auto flex-1">
            {activePage?.root ? (
              <LayerItem
                node={activePage.root}
                selectedId={selectedNodeId}
                onSelect={(id) => setSelectedNodeId(id)}
              />
            ) : (
              <p className="text-xs text-zinc-500 p-2">No root node found.</p>
            )}
          </div>
        </aside>

        {/* 4. CENTRAL CANVAS REGION */}
        <section
          onClick={() => setSelectedNodeId(activePage?.root?.id)}
          className="flex-1 bg-[#09090b] overflow-y-auto relative p-6 sm:p-10 flex flex-col items-center justify-start"
        >
          {/* Canvas Board Surface */}
          <div className="w-full max-w-5xl rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.9)] border border-white/10 overflow-hidden bg-[#09090b]">
            {activePage?.root ? (
              <CanvasNode
                node={activePage.root}
                selectedId={selectedNodeId}
                onSelect={(id) => setSelectedNodeId(id)}
              />
            ) : (
              <div className="p-12 text-center text-zinc-500 text-sm">
                No content in home page document.
              </div>
            )}
          </div>
        </section>

        {/* 5. RIGHT PROPERTIES INSPECTOR */}
        <aside className="w-80 border-l border-white/10 bg-[#111114]/90 backdrop-blur-2xl flex flex-col shrink-0 z-20 overflow-y-auto">
          <div className="p-3.5 border-b border-white/10 flex items-center justify-between text-xs font-semibold text-zinc-200">
            <div className="flex items-center gap-2">
              <Sliders className="w-3.5 h-3.5 text-zinc-300" />
              <span>Properties Inspector</span>
            </div>
            <span className="text-[10px] font-mono text-zinc-500">Read-Only</span>
          </div>

          <div className="p-4 space-y-6 flex-1 text-xs">
            {selectedNode ? (
              <div className="space-y-5">
                {/* Basic Node Identification */}
                <div className="p-3.5 rounded-2xl bg-[#0e0e11] border border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase text-zinc-200 font-bold tracking-wider">
                      {selectedNode.type}
                    </span>
                    <span className="text-[10px] font-mono text-zinc-500">
                      {selectedNode.children?.length || 0} children
                    </span>
                  </div>
                  <div className="font-semibold text-white text-sm">
                    {selectedNode.name || selectedNode.type}
                  </div>
                  <div className="text-[10px] font-mono text-zinc-500 break-all">
                    ID: {selectedNode.id}
                  </div>
                </div>

                {/* Node Props */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-zinc-400 font-semibold text-[11px]">
                    <span>Node Props</span>
                    <span className="text-[10px] font-mono text-zinc-600">
                      {Object.keys(selectedNode.props || {}).length}
                    </span>
                  </div>

                  <pre className="p-3.5 rounded-2xl bg-[#0e0e11] font-mono text-[11px] text-zinc-300 border border-white/5 overflow-x-auto max-h-48">
                    {JSON.stringify(selectedNode.props || {}, null, 2)}
                  </pre>
                </div>

                {/* Node Styles */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-zinc-400 font-semibold text-[11px]">
                    <span>Node Inline Styles</span>
                    <span className="text-[10px] font-mono text-zinc-600">
                      {Object.keys(selectedNode.styles || {}).length}
                    </span>
                  </div>

                  <pre className="p-3.5 rounded-2xl bg-[#0e0e11] font-mono text-[11px] text-zinc-300 border border-white/5 overflow-x-auto max-h-48">
                    {JSON.stringify(selectedNode.styles || {}, null, 2)}
                  </pre>
                </div>

                {/* Reserved Slots */}
                <div className="space-y-2 pt-2 border-t border-white/5">
                  <span className="text-zinc-500 text-[10px] uppercase font-mono block">
                    Reserved Engine Capabilities
                  </span>
                  <div className="space-y-1 text-[11px] text-zinc-400 font-mono">
                    <div className="flex justify-between">
                      <span>Responsive:</span>
                      <span className="text-zinc-500">Reserved (tablet/mobile)</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Animation:</span>
                      <span className="text-zinc-500">
                        {selectedNode.animation?.type || 'none'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Interactions:</span>
                      <span className="text-zinc-500">
                        {selectedNode.interactions?.length || 0} active
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-16 text-center text-zinc-500 space-y-2">
                <Info className="w-6 h-6 mx-auto text-zinc-600" />
                <p className="text-xs">No element selected.</p>
                <p className="text-[11px] text-zinc-600">
                  Click any element on the central canvas or layers tree to inspect properties.
                </p>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Modal: Import Errors */}
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

      {/* Toast Notification */}
      <Toast message={toast.message} type={toast.type} onClose={closeToast} />
    </div>
  );
}
