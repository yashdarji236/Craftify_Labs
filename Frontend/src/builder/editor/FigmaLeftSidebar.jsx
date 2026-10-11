import React, { useState, useRef } from 'react';
import { useRouter } from '../../router/Router.jsx';
import { useEditorStore } from '../store/editorContext.jsx';
import { projectStorage } from '../storage/index.js';
import { validateProject, migrateProject } from '../model/index.js';
import ComponentPalette from './ComponentPalette.jsx';
import AssetsPanel from './AssetsPanel.jsx';
import WarningsPanel from './WarningsPanel.jsx';
import {
  FileText,
  Bot,
  Shapes,
  Wrench,
  Sliders,
  ChevronDown,
  ChevronRight,
  Plus,
  Search,
  PanelLeftClose,
  PanelLeft,
  Home,
  Copy,
  Trash2,
  ArrowUp,
  ArrowDown,
  Settings,
  AlertTriangle,
  Layout,
  Box,
  Layers,
  Grid as GridIcon,
  Type,
  Image as ImageIcon,
  Square,
  Link as LinkIcon,
  Maximize2,
  Minus,
  FormInput,
  TextCursorInput,
  Eye,
  EyeOff,
  Sparkles,
  BookOpen,
  ArrowLeft,
  Download,
  Upload,
  CheckCircle2,
  Loader2,
  Undo2,
  Redo2,
} from 'lucide-react';
import { resolveStyles } from '../model/breakpoints.js';
import { generateSlug, validateSlug } from '../model/slug.js';

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

function LayerTreeRow({
  node,
  selectedId,
  onSelect,
  depth = 0,
  onRename,
  onDuplicate,
  onDelete,
  onMoveUp,
  onMoveDown,
  isRoot = false,
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [nameInput, setNameInput] = useState(node.name || node.type);

  const { moveNode, activeBreakpoint, setResponsiveVisibility } = useEditorStore();

  const isSelected = selectedId === node.id;
  const hasChildren = Array.isArray(node.children) && node.children.length > 0;
  const Icon = PALETTE_ICONS[node.type] || Box;

  const effectiveStyles = resolveStyles(node, activeBreakpoint);
  const isHidden = effectiveStyles.display === 'none';

  const handleCommitRename = () => {
    if (nameInput.trim()) {
      onRename(node.id, nameInput.trim());
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCommitRename();
    } else if (e.key === 'Escape') {
      setNameInput(node.name || node.type);
      setIsEditing(false);
    }
  };

  return (
    <div className="flex flex-col select-none">
      <div
        onClick={(e) => {
          e.stopPropagation();
          onSelect(node.id);
        }}
        style={{ paddingLeft: `${Math.max(8, depth * 14)}px` }}
        className={`group relative flex items-center justify-between py-1.5 pr-2 text-xs font-medium cursor-pointer transition-colors ${
          isSelected
            ? 'bg-[#0d99ff] text-white font-semibold'
            : isHidden
              ? 'opacity-40 hover:opacity-80 text-zinc-400 hover:bg-white/5'
              : 'text-zinc-300 hover:text-white hover:bg-white/5'
        }`}
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1 mr-1">
          {hasChildren ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setCollapsed(!collapsed);
              }}
              className="p-0.5 rounded hover:bg-black/20 text-zinc-400 hover:text-white cursor-pointer"
            >
              {collapsed ? (
                <ChevronRight className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
            </button>
          ) : (
            <div className="w-4 h-4 shrink-0" />
          )}

          <Icon className="w-3.5 h-3.5 shrink-0 opacity-70 group-hover:opacity-100" />

          {isEditing ? (
            <input
              type="text"
              value={nameInput}
              autoFocus
              onChange={(e) => setNameInput(e.target.value)}
              onBlur={handleCommitRename}
              onKeyDown={handleKeyDown}
              onClick={(e) => e.stopPropagation()}
              className="px-1 py-0.5 rounded bg-black/60 border border-white/30 text-white text-xs w-full focus:outline-none"
            />
          ) : (
            <span
              onDoubleClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
              }}
              className="truncate text-[11px]"
            >
              {node.name || node.type}
            </span>
          )}

          {isHidden && (
            <span className="text-[9px] font-mono px-1 rounded bg-black/30 text-amber-300">
              hidden
            </span>
          )}
        </div>

        {/* Action icons on hover */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          {!isRoot && (
            <button
              type="button"
              title={isHidden ? 'Unhide' : 'Hide'}
              onClick={() => setResponsiveVisibility(node.id, activeBreakpoint, !isHidden)}
              className="p-1 rounded text-zinc-400 hover:text-white hover:bg-black/20"
            >
              {isHidden ? <EyeOff className="w-3 h-3 text-amber-300" /> : <Eye className="w-3 h-3" />}
            </button>
          )}

          {!isRoot && (
            <>
              <button
                type="button"
                title="Duplicate"
                onClick={() => onDuplicate(node.id)}
                className="p-1 rounded text-zinc-400 hover:text-white hover:bg-black/20"
              >
                <Copy className="w-3 h-3" />
              </button>
              <button
                type="button"
                title="Delete"
                onClick={() => onDelete(node.id)}
                className="p-1 rounded text-zinc-400 hover:text-rose-300 hover:bg-black/20"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </>
          )}
        </div>
      </div>

      {hasChildren && !collapsed && (
        <div className="flex flex-col">
          {node.children.map((child) => (
            <LayerTreeRow
              key={child.id}
              node={child}
              selectedId={selectedId}
              onSelect={onSelect}
              depth={depth + 1}
              onRename={onRename}
              onDuplicate={onDuplicate}
              onDelete={onDelete}
              onMoveUp={onMoveUp}
              onMoveDown={onMoveDown}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function FigmaLeftSidebar() {
  const {
    project,
    activePage,
    setActivePage,
    selectedNodeId,
    setSelectedNodeId,
    createPage,
    duplicatePage,
    deletePage,
    renameNode,
    duplicateNode,
    removeNode,
    moveUp,
    moveDown,
    warnings,
    jumpToWarning,
  } = useEditorStore();

  const { navigate } = useRouter();
  const {
    saveStatus,
    saveNow,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useEditorStore();

  const [activeTab, setActiveTab] = useState('file'); // 'file' | 'agents' | 'assets' | 'tools' | 'variables'
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [pagesSearch, setPagesSearch] = useState('');
  const [isCreatingPage, setIsCreatingPage] = useState(false);
  const [newPageName, setNewPageName] = useState('');
  const [useSameFormat, setUseSameFormat] = useState(true);
  const [showFileMenu, setShowFileMenu] = useState(false);

  const fileInputRef = useRef(null);

  const pages = project?.pages || [];
  const filteredPages = pages.filter((p) =>
    (p.name || '').toLowerCase().includes(pagesSearch.toLowerCase())
  );

  const handleSelectLayer = (id) => {
    setSelectedNodeId(id);
    const canvasElem = document.querySelector(`[data-node-id="${id}"]`);
    if (canvasElem) {
      canvasElem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  const handleCreatePageSubmit = (e) => {
    e.preventDefault();
    if (!newPageName.trim()) return;
    createPage(newPageName.trim(), null, { copyFormat: useSameFormat });
    setNewPageName('');
    setIsCreatingPage(false);
  };

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
    } catch (err) {
      console.error(err);
    }
    setShowFileMenu(false);
  };

  const handleFilePicked = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const content = evt.target.result;
        const parsed = JSON.parse(content);
        const migrated = migrateProject(parsed);
        const validation = validateProject(migrated);
        if (!validation.ok) {
          alert('Import failed: invalid project document.');
          return;
        }
        validation.project.project.ownerId = project.project.ownerId;
        await projectStorage.save(validation.project);
        window.location.reload();
      } catch (err) {
        alert(err.message || 'Import error.');
      }
    };
    reader.readAsText(file);
    setShowFileMenu(false);
  };

  const navItems = [
    { id: 'file', label: 'Pages', icon: Layers },
    { id: 'agents', label: 'Add', icon: Plus },
    { id: 'assets', label: 'Media', icon: ImageIcon },
    { id: 'tools', label: 'Audit', icon: AlertTriangle, badge: warnings.length > 0 ? warnings.length : null },
    { id: 'variables', label: 'Theme', icon: Sliders },
  ];

  return (
    <div className="flex h-full select-none shrink-0 z-20 relative">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFilePicked}
        accept=".json,application/json"
        className="hidden"
      />

      {/* 1. NARROW LEFT ICON RAIL (Craftify Editor Rail) */}
      <aside className="w-12 bg-[#2c2c2c] border-r border-[#383838] flex flex-col items-center py-2.5 justify-between shrink-0 z-30">
        <div className="flex flex-col items-center gap-3 w-full relative">
          {/* Top Craftify Logo */}
          <div
            onClick={() => setShowFileMenu(!showFileMenu)}
            title="Craftify Menu"
            className="w-7 h-7 rounded-lg bg-[#141416] border border-white/15 flex items-center justify-center text-white font-black text-sm mb-1 hover:border-white/30 cursor-pointer shadow-sm active:scale-95 transition-all p-0.5 overflow-hidden"
          >
            <img src="/logo.jpg" alt="Craftify" className="w-full h-full object-contain rounded-md" onError={(e) => { e.target.style.display = 'none'; }} />
            <span className="text-white font-mono text-xs font-bold">C</span>
          </div>

          {/* Craftify File Dropdown Menu */}
          {showFileMenu && (
            <div className="absolute top-10 left-12 w-56 rounded-2xl bg-[#1e1e1e] border border-[#383838] shadow-2xl p-1.5 z-50 text-xs text-zinc-300 space-y-1">
              <div className="px-3 py-1.5 border-b border-white/10 flex items-center justify-between">
                <span className="font-bold text-white text-[11px] truncate">{project?.project?.name}</span>
                {saveStatus === 'saved' && (
                  <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
                    <CheckCircle2 className="w-2.5 h-2.5" /> Saved
                  </span>
                )}
                {saveStatus === 'saving' && (
                  <span className="text-[10px] text-zinc-400 flex items-center gap-1 font-mono">
                    <Loader2 className="w-2.5 h-2.5 animate-spin" /> Saving...
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-white/10 text-left text-zinc-200 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-zinc-400" />
                <span>Back to Projects</span>
              </button>

              <button
                type="button"
                onClick={saveNow}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-white/10 text-left text-zinc-200 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-zinc-400" />
                <span>Save Now</span>
              </button>

              <div className="h-px bg-white/10 my-1" />

              <button
                type="button"
                onClick={() => {
                  fileInputRef.current?.click();
                  setShowFileMenu(false);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-white/10 text-left text-zinc-200 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-zinc-400" />
                <span>Import JSON</span>
              </button>

              <button
                type="button"
                onClick={handleExportJson}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-white/10 text-left text-zinc-200 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-zinc-400" />
                <span>Export JSON</span>
              </button>

              <div className="h-px bg-white/10 my-1" />

              <button
                type="button"
                onClick={() => {
                  undo();
                  setShowFileMenu(false);
                }}
                disabled={!canUndo}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-white/10 text-left text-zinc-200 disabled:opacity-40 cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Undo2 className="w-3.5 h-3.5 text-zinc-400" /> Undo
                </span>
                <span className="text-[10px] font-mono text-zinc-500">Ctrl+Z</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  redo();
                  setShowFileMenu(false);
                }}
                disabled={!canRedo}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-white/10 text-left text-zinc-200 disabled:opacity-40 cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Redo2 className="w-3.5 h-3.5 text-zinc-400" /> Redo
                </span>
                <span className="text-[10px] font-mono text-zinc-500">Ctrl+Y</span>
              </button>
            </div>
          )}

          {/* Navigation Items with Icon + Label Underneath */}
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id && drawerOpen;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  if (activeTab === item.id && drawerOpen) {
                    setDrawerOpen(false);
                  } else {
                    setActiveTab(item.id);
                    setDrawerOpen(true);
                  }
                }}
                title={item.label}
                className={`relative flex flex-col items-center justify-center w-10 py-1.5 rounded-lg transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#0d99ff] text-white shadow-sm'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-4 h-4 mb-0.5" />
                <span className="text-[9px] font-medium leading-none tracking-tight">
                  {item.label}
                </span>

                {item.badge && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-400 ring-2 ring-[#2c2c2c]" />
                )}
              </button>
            );
          })}
        </div>

        {/* Bottom Help / Sidebar Toggle */}
        <button
          type="button"
          onClick={() => setDrawerOpen(!drawerOpen)}
          title={drawerOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 cursor-pointer"
        >
          {drawerOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
        </button>
      </aside>

      {/* 2. ADJACENT LEFT DRAWER PANEL (Matches Figma Screenshot) */}
      {drawerOpen && (
        <aside className="w-64 bg-[#2c2c2c] border-r border-[#383838] flex flex-col shrink-0 overflow-hidden text-zinc-300 animate-in fade-in duration-100">
          {/* TAB 1: FILE (Image 2 Structure: Project Title + Pages + Layers) */}
          {activeTab === 'file' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Header: Project Name & Drafts Free Badge */}
              <div className="p-3 border-b border-[#383838] flex items-center justify-between">
                <div className="min-w-0 flex-1 mr-2">
                  <div
                    onClick={() => setShowFileMenu(!showFileMenu)}
                    className="flex items-center gap-1 cursor-pointer group"
                  >
                    <span className="font-bold text-xs text-white truncate group-hover:text-zinc-200">
                      {project?.project?.name || 'Untitled'}
                    </span>
                    <ChevronDown className="w-3 h-3 text-zinc-400 shrink-0" />
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] text-zinc-400">Craftify</span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-blue-500/20 text-blue-400 font-semibold">
                      Draft
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  title="Close sidebar"
                  className="p-1 rounded hover:bg-white/10 text-zinc-400 hover:text-white cursor-pointer"
                >
                  <PanelLeftClose className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Pages Section */}
              <div className="border-b border-[#383838] flex flex-col">
                <div className="px-3 py-2 flex items-center justify-between text-xs font-semibold text-zinc-200">
                  <span className="text-zinc-300 font-bold">Pages</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      title="Search pages"
                      onClick={() => setPagesSearch(pagesSearch ? '' : ' ')}
                      className="p-1 rounded hover:bg-white/10 text-zinc-400 hover:text-white cursor-pointer"
                    >
                      <Search className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      title="Add new page"
                      onClick={() => setIsCreatingPage(true)}
                      className="p-1 rounded hover:bg-white/10 text-zinc-400 hover:text-white cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Inline Page Create Form */}
                {isCreatingPage && (
                  <form
                    onSubmit={handleCreatePageSubmit}
                    className="px-3 pb-2 flex flex-col gap-1.5"
                  >
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        autoFocus
                        placeholder="Page name (e.g. About)..."
                        value={newPageName}
                        onChange={(e) => setNewPageName(e.target.value)}
                        className="flex-1 px-2 py-1 rounded bg-black/50 border border-white/20 text-white text-xs focus:outline-none"
                      />
                      <button
                        type="submit"
                        disabled={!newPageName.trim()}
                        className="px-2.5 py-1 rounded bg-[#0d99ff] hover:bg-[#0c8ce9] text-white text-xs font-semibold disabled:opacity-50 cursor-pointer"
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsCreatingPage(false)}
                        className="px-1.5 py-1 text-zinc-400 hover:text-white text-xs cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>

                    <label className="flex items-center gap-1.5 cursor-pointer text-[10px] text-zinc-400 hover:text-zinc-200 select-none">
                      <input
                        type="checkbox"
                        checked={useSameFormat}
                        onChange={(e) => setUseSameFormat(e.target.checked)}
                        className="rounded bg-black/40 border-white/20 text-[#0d99ff] focus:ring-0 w-3 h-3 cursor-pointer"
                      />
                      <span>Same format as {pages[0]?.name || 'Page 1'}</span>
                    </label>
                  </form>
                )}

                {/* Pages List */}
                <div className="px-1.5 pb-2 space-y-0.5 max-h-40 overflow-y-auto">
                  {filteredPages.map((p) => {
                    const isActive = activePage?.id === p.id;
                    return (
                      <div
                        key={p.id}
                        onClick={() => setActivePage(p.id)}
                        className={`group flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs cursor-pointer transition-colors ${
                          isActive
                            ? 'bg-[#383838] text-white font-medium'
                            : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
                        }`}
                      >
                        <span className="truncate flex-1 mr-1">{p.name}</span>
                        <div className="flex items-center gap-1 shrink-0">
                          {p.isHome ? (
                            <span className="text-[9px] font-mono text-zinc-500 uppercase px-1 py-0.2 rounded bg-black/30">
                              Home
                            </span>
                          ) : (
                            <button
                              type="button"
                              title="Delete page"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm(`Delete page "${p.name}"?`)) {
                                  deletePage(p.id);
                                }
                              }}
                              className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 transition-opacity"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                          <button
                            type="button"
                            title="Duplicate page"
                            onClick={(e) => {
                              e.stopPropagation();
                              duplicatePage(p.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-white/10 text-zinc-400 hover:text-white transition-opacity"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Layers Section */}
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="px-3 py-2 flex items-center justify-between text-xs font-semibold text-zinc-300 border-b border-[#383838]/50">
                  <span className="font-bold">Layers</span>
                  <span className="text-[10px] font-mono text-zinc-500">AST</span>
                </div>

                <div className="flex-1 overflow-y-auto py-1">
                  {activePage?.root ? (
                    <LayerTreeRow
                      node={activePage.root}
                      selectedId={selectedNodeId}
                      onSelect={handleSelectLayer}
                      onRename={renameNode}
                      onDuplicate={duplicateNode}
                      onDelete={removeNode}
                      onMoveUp={moveUp}
                      onMoveDown={moveDown}
                      isRoot={true}
                    />
                  ) : (
                    <p className="text-xs text-zinc-500 p-3">No layers found.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ADD ELEMENTS (Component Palette) */}
          {activeTab === 'agents' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="p-3 border-b border-[#383838] flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-xs text-white">
                  <Plus className="w-4 h-4 text-[#0d99ff]" />
                  <span>Add Elements</span>
                </div>
                <span className="text-[10px] font-mono text-zinc-400">Palette</span>
              </div>
              <div className="flex-1 overflow-y-auto">
                <ComponentPalette />
              </div>
            </div>
          )}

          {/* TAB 3: MEDIA & ASSETS */}
          {activeTab === 'assets' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="p-3 border-b border-[#383838] flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-xs text-white">
                  <ImageIcon className="w-4 h-4 text-[#0d99ff]" />
                  <span>Media & Assets</span>
                </div>
                <BookOpen className="w-3.5 h-3.5 text-zinc-400" />
              </div>
              <div className="flex-1 overflow-y-auto">
                <AssetsPanel />
              </div>
            </div>
          )}

          {/* TAB 4: SITE HEALTH & AUDIT */}
          {activeTab === 'tools' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="p-3 border-b border-[#383838] flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-xs text-white">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span>Site Health & Audit</span>
                </div>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-amber-500/20 text-amber-300 font-bold">
                  {warnings.length}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {warnings.length === 0 ? (
                  <div className="p-6 text-center text-zinc-400 space-y-1">
                    <p className="text-xs font-semibold text-emerald-400">✓ All checks pass</p>
                    <p className="text-[11px] text-zinc-500">No issues found.</p>
                  </div>
                ) : (
                  warnings.map((w, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg bg-black/30 border border-white/5 space-y-1 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono uppercase text-amber-400 font-bold">
                          {w.type}
                        </span>
                        <button
                          type="button"
                          onClick={() => jumpToWarning(w)}
                          className="text-[10px] text-blue-400 hover:underline cursor-pointer"
                        >
                          Jump →
                        </button>
                      </div>
                      <p className="text-zinc-200 text-[11px]">{w.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 5: THEME TOKENS */}
          {activeTab === 'variables' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="p-3 border-b border-[#383838] flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-xs text-white">
                  <Sliders className="w-4 h-4 text-[#0d99ff]" />
                  <span>Theme & Tokens</span>
                </div>
              </div>
              <div className="p-4 space-y-3 text-xs text-zinc-400">
                <div className="p-3 rounded-lg bg-black/30 border border-white/5 space-y-1.5">
                  <span className="font-semibold text-white block">Theme Canvas</span>
                  <span className="font-mono text-[11px] text-zinc-500 block">Default background: #1e1e1e</span>
                </div>
                <div className="p-3 rounded-lg bg-black/30 border border-white/5 space-y-1.5">
                  <span className="font-semibold text-white block">Breakpoints</span>
                  <span className="font-mono text-[11px] text-zinc-500 block">Desktop: 1280px</span>
                  <span className="font-mono text-[11px] text-zinc-500 block">Tablet: 768px</span>
                  <span className="font-mono text-[11px] text-zinc-500 block">Mobile: 375px</span>
                </div>
              </div>
            </div>
          )}
        </aside>
      )}
    </div>
  );
}
