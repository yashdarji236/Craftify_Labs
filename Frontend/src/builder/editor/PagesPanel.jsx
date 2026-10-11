import React, { useState } from 'react';
import { useEditorStore } from '../store/editorContext.jsx';
import {
  FileText,
  Plus,
  Home,
  Copy,
  Trash2,
  ArrowUp,
  ArrowDown,
  Settings,
  AlertTriangle,
  Check,
  X,
  ExternalLink,
  Info,
} from 'lucide-react';
import { generateSlug, validateSlug } from '../model/slug.js';

export default function PagesPanel() {
  const {
    project,
    activePage,
    setActivePage,
    createPage,
    renamePage,
    updatePageSettings,
    duplicatePage,
    deletePage,
    setHomePage,
    movePageUp,
    movePageDown,
    getLinkedNodesForPage,
  } = useEditorStore();

  const [isCreating, setIsCreating] = useState(false);
  const [newPageName, setNewPageName] = useState('');
  const [newPagePath, setNewPagePath] = useState('');
  const [useSameFormat, setUseSameFormat] = useState(true);
  const [editingSettingsPageId, setEditingSettingsPageId] = useState(null);
  const [pageToDelete, setPageToDelete] = useState(null);

  // Settings form state
  const [settingsForm, setSettingsForm] = useState({
    name: '',
    path: '',
    title: '',
    metaDescription: '',
  });

  const handleOpenSettings = (page) => {
    setEditingSettingsPageId(page.id);
    setSettingsForm({
      name: page.name || '',
      path: page.path || '',
      title: page.title || '',
      metaDescription: page.metaDescription || '',
    });
  };

  const handleSaveSettings = () => {
    if (!editingSettingsPageId) return;
    const res = updatePageSettings(editingSettingsPageId, settingsForm);
    if (res?.ok) {
      setEditingSettingsPageId(null);
    }
  };

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    if (!newPageName.trim()) return;

    const res = createPage(newPageName.trim(), newPagePath.trim() || null, {
      copyFormat: useSameFormat,
    });
    if (res?.ok) {
      setNewPageName('');
      setNewPagePath('');
      setIsCreating(false);
    }
  };

  const handleNewNameChange = (val) => {
    setNewPageName(val);
    setNewPagePath(`/${generateSlug(val)}`);
  };

  const pages = project?.pages || [];

  return (
    <div className="flex-1 flex flex-col overflow-hidden text-xs text-zinc-300">
      {/* Action Header */}
      <div className="p-3 border-b border-white/10 flex items-center justify-between bg-[#111114]">
        <span className="font-semibold text-zinc-200 flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5 text-zinc-400" />
          <span>Pages ({pages.length})</span>
        </span>
        <button
          type="button"
          onClick={() => {
            setIsCreating(true);
            setNewPageName('');
            setNewPagePath('');
          }}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Page</span>
        </button>
      </div>

      {/* New Page Drawer/Form */}
      {isCreating && (
        <form
          onSubmit={handleCreateSubmit}
          className="p-3 bg-[#18181c] border-b border-white/10 space-y-2 animate-in fade-in duration-150"
        >
          <div className="flex items-center justify-between text-xs font-semibold text-zinc-200">
            <span>Add New Page</span>
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="text-zinc-500 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div>
            <label className="text-[10px] text-zinc-400 uppercase font-mono">Page Name</label>
            <input
              type="text"
              placeholder="e.g. About Us"
              value={newPageName}
              onChange={(e) => handleNewNameChange(e.target.value)}
              autoFocus
              className="w-full px-2.5 py-1.5 mt-0.5 rounded-lg bg-black/50 border border-white/10 text-white text-xs focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="text-[10px] text-zinc-400 uppercase font-mono">URL Path</label>
            <input
              type="text"
              placeholder="/about-us"
              value={newPagePath}
              onChange={(e) => setNewPagePath(e.target.value)}
              className="w-full px-2.5 py-1.5 mt-0.5 rounded-lg bg-black/50 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-indigo-500"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer text-[11px] text-zinc-400 hover:text-zinc-200 select-none pt-1">
            <input
              type="checkbox"
              checked={useSameFormat}
              onChange={(e) => setUseSameFormat(e.target.checked)}
              className="rounded bg-black/40 border-white/20 text-indigo-500 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
            />
            <span>Same format as {pages[0]?.name || 'Page 1'}</span>
          </label>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="px-2.5 py-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!newPageName.trim()}
              className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium disabled:opacity-50 cursor-pointer"
            >
              Create Page
            </button>
          </div>
        </form>
      )}

      {/* Pages List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {pages.map((p, idx) => {
          const isActive = activePage?.id === p.id;
          return (
            <div
              key={p.id}
              onClick={() => setActivePage(p.id)}
              className={`group flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                isActive
                  ? 'bg-indigo-950/40 border-indigo-500/50 text-white shadow-sm'
                  : 'bg-[#141418] hover:bg-[#1a1a20] border-white/5 text-zinc-300'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                    p.isHome
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      : 'bg-white/5 text-zinc-400'
                  }`}
                  title={p.isHome ? 'Home Page' : 'Page'}
                >
                  {p.isHome ? <Home className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-xs truncate text-zinc-100">{p.name}</span>
                    {p.isHome && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        HOME
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500 block truncate">
                    {p.path}
                  </span>
                </div>
              </div>

              {/* Actions toolbar */}
              <div
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                {/* Reorder Buttons */}
                <button
                  type="button"
                  title="Move Up"
                  disabled={idx === 0}
                  onClick={() => movePageUp(p.id)}
                  className="p-1 rounded text-zinc-400 hover:text-white hover:bg-white/10 disabled:opacity-20 cursor-pointer"
                >
                  <ArrowUp className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  title="Move Down"
                  disabled={idx === pages.length - 1}
                  onClick={() => movePageDown(p.id)}
                  className="p-1 rounded text-zinc-400 hover:text-white hover:bg-white/10 disabled:opacity-20 cursor-pointer"
                >
                  <ArrowDown className="w-3 h-3" />
                </button>

                {/* Duplicate */}
                <button
                  type="button"
                  title="Duplicate Page"
                  onClick={() => duplicatePage(p.id)}
                  className="p-1 rounded text-zinc-400 hover:text-white hover:bg-white/10 cursor-pointer"
                >
                  <Copy className="w-3 h-3" />
                </button>

                {/* Settings / Meta */}
                <button
                  type="button"
                  title="Page Settings & SEO"
                  onClick={() => handleOpenSettings(p)}
                  className="p-1 rounded text-zinc-400 hover:text-white hover:bg-white/10 cursor-pointer"
                >
                  <Settings className="w-3 h-3" />
                </button>

                {/* Delete */}
                {!p.isHome && (
                  <button
                    type="button"
                    title="Delete Page"
                    onClick={() => setPageToDelete(p)}
                    className="p-1 rounded text-rose-400 hover:text-rose-200 hover:bg-rose-500/10 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Page Settings Modal */}
      {editingSettingsPageId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md rounded-2xl bg-[#141418] border border-white/15 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-indigo-400" />
                <h3 className="font-bold text-sm text-white">Page Settings & SEO</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingSettingsPageId(null)}
                className="text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] text-zinc-400 font-medium">Page Name</label>
                <input
                  type="text"
                  value={settingsForm.name}
                  onChange={(e) => setSettingsForm({ ...settingsForm, name: e.target.value })}
                  className="w-full px-2.5 py-1.5 mt-1 rounded-lg bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="text-[11px] text-zinc-400 font-medium">URL Path</label>
                  {project.pages.find((p) => p.id === editingSettingsPageId)?.isHome && (
                    <span className="text-[10px] font-mono text-amber-400">Fixed at '/' for Home</span>
                  )}
                </div>
                <input
                  type="text"
                  value={settingsForm.path}
                  disabled={project.pages.find((p) => p.id === editingSettingsPageId)?.isHome}
                  onChange={(e) => setSettingsForm({ ...settingsForm, path: e.target.value })}
                  className="w-full px-2.5 py-1.5 mt-1 rounded-lg bg-black/40 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="text-[11px] text-zinc-400 font-medium">Page Title (&lt;title&gt;)</label>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    {settingsForm.title.length}/60 chars
                  </span>
                </div>
                <input
                  type="text"
                  placeholder="e.g. Craftify Labs - Modern Web Studio"
                  value={settingsForm.title}
                  onChange={(e) => setSettingsForm({ ...settingsForm, title: e.target.value })}
                  className="w-full px-2.5 py-1.5 mt-1 rounded-lg bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="text-[11px] text-zinc-400 font-medium">Meta Description</label>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    {settingsForm.metaDescription.length}/160 chars
                  </span>
                </div>
                <textarea
                  rows={3}
                  placeholder="Brief summary for search engine results..."
                  value={settingsForm.metaDescription}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, metaDescription: e.target.value })
                  }
                  className="w-full px-2.5 py-1.5 mt-1 rounded-lg bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              {/* Set as Home Page action */}
              {!project.pages.find((p) => p.id === editingSettingsPageId)?.isHome && (
                <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                  <div className="text-[11px] text-zinc-400">Designate as site entry point:</div>
                  <button
                    type="button"
                    onClick={() => {
                      setHomePage(editingSettingsPageId);
                      setSettingsForm({ ...settingsForm, path: '/' });
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-medium cursor-pointer transition-colors"
                  >
                    <Home className="w-3.5 h-3.5" />
                    <span>Set as Home Page</span>
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setEditingSettingsPageId(null)}
                className="px-3 py-1.5 rounded-lg text-zinc-400 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveSettings}
                className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium cursor-pointer"
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal (with affected linked nodes warning) */}
      {pageToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md rounded-2xl bg-[#141418] border border-rose-500/30 p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-rose-400">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="font-bold text-sm text-white">Delete Page "{pageToDelete.name}"?</h3>
            </div>

            <p className="text-xs text-zinc-300">
              Are you sure you want to permanently delete this page? This action cannot be undone.
            </p>

            {/* Check for affected internal links */}
            {(() => {
              const linkedNodes = getLinkedNodesForPage(pageToDelete.id);
              if (linkedNodes.length === 0) return null;
              return (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Warning: {linkedNodes.length} element(s) link to this page</span>
                  </div>
                  <p className="text-[11px] text-amber-300/80">
                    Deleting this page will reset their target link to 'none':
                  </p>
                  <ul className="text-[10px] font-mono space-y-1 max-h-28 overflow-y-auto pl-2 border-l border-amber-500/30">
                    {linkedNodes.map((item, idx) => (
                      <li key={idx}>
                        • [{item.pageName}] {item.nodeName} ({item.nodeType})
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })()}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPageToDelete(null)}
                className="px-3 py-1.5 rounded-lg text-zinc-400 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  deletePage(pageToDelete.id);
                  setPageToDelete(null);
                }}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-medium cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
