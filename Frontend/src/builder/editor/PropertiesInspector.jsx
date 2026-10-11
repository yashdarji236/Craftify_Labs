import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useEditorStore } from '../store/editorContext.jsx';
import {
  isSafeUrl,
  NODE_REGISTRY,
  HEADING_LEVEL_DEFAULTS,
  resolveStyles,
  LINK_TYPES,
  validateLinkTarget,
  validateSlug,
  generateSlug,
} from '../model/index.js';
import {
  Sliders,
  Type,
  Layout,
  Palette,
  Maximize2,
  Box,
  AlertTriangle,
  Info,
  CheckCircle2,
  Sparkles,
  Move,
  RotateCcw,
  Link as LinkIcon,
  Image as ImageIcon,
  ExternalLink,
  Layers,
  Eye,
  EyeOff,
  Columns,
  Grid as GridIcon,
  Check,
  Play,
  Plus,
  X,
  ChevronDown,
} from 'lucide-react';
import { parseTranslate, computeCanvasBounds } from './CanvasRenderer.jsx';

/**
 * Calculates WCAG relative luminance and contrast ratio.
 */
function getContrastRatio(colorHex, bgHex) {
  const parseHex = (hex) => {
    if (!hex || typeof hex !== 'string') return null;
    let clean = hex.trim().replace('#', '');
    if (clean.length === 3) {
      clean = clean.split('').map((c) => c + c).join('');
    }
    if (clean.length !== 6) return null;
    const r = parseInt(clean.substring(0, 2), 16) / 255;
    const g = parseInt(clean.substring(2, 4), 16) / 255;
    const b = parseInt(clean.substring(4, 6), 16) / 255;
    if (isNaN(r) || isNaN(g) || isNaN(b)) return null;

    const toLum = (c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
    return 0.2126 * toLum(r) + 0.7152 * toLum(g) + 0.0722 * toLum(b);
  };

  const lum1 = parseHex(colorHex);
  const lum2 = parseHex(bgHex);
  if (lum1 === null || lum2 === null) return null;

  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Typed Link Target Control (Task 2)
 */
function LinkTargetControl({ linkTarget, onChange, pages = [] }) {
  const currentTarget = linkTarget || { type: 'none' };
  const currentType = currentTarget.type || 'none';

  const [urlError, setUrlError] = useState(null);

  const handleTypeChange = (newType) => {
    const updated = { type: newType };
    if (newType === 'page') {
      updated.pageId = pages[0]?.id || '';
    } else if (newType === 'external') {
      updated.url = 'https://';
      updated.newTab = true;
    } else if (newType === 'anchor') {
      updated.nodeId = '';
    } else if (newType === 'email') {
      updated.email = '';
    } else if (newType === 'phone') {
      updated.phone = '';
    }
    setUrlError(null);
    onChange(updated);
  };

  const handleFieldChange = (key, val) => {
    const next = { ...currentTarget, [key]: val };
    const valRes = validateLinkTarget(next);
    if (!valRes.valid) {
      setUrlError(valRes.error);
    } else {
      setUrlError(null);
    }
    onChange(next);
  };

  const handleAddHttps = () => {
    const raw = currentTarget.url || '';
    const fixed = `https://${raw.replace(/^(?:https?:\/\/)?/, '')}`;
    handleFieldChange('url', fixed);
  };

  return (
    <div className="space-y-3 p-3 rounded-2xl bg-[#0e0e11] border border-white/10">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-semibold text-zinc-300 flex items-center gap-1.5">
          <LinkIcon className="w-3 h-3 text-indigo-400" />
          <span>Link Destination</span>
        </label>
        <span className="text-[10px] font-mono text-zinc-500 uppercase">
          {currentType}
        </span>
      </div>

      {/* Segmented Type Picker */}
      <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-black/40 border border-white/5 text-[10px]">
        {LINK_TYPES.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => handleTypeChange(t)}
            className={`py-1 rounded-lg font-medium capitalize transition-all cursor-pointer ${
              currentType === t
                ? 'bg-white text-black font-bold shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Target Type Specific Inputs */}
      {currentType === 'page' && (
        <div className="space-y-1">
          <label className="text-[10px] text-zinc-400">Target Page</label>
          <select
            value={currentTarget.pageId || ''}
            onChange={(e) => handleFieldChange('pageId', e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none"
          >
            {pages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.path}) {p.isHome ? '★ Home' : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      {currentType === 'external' && (
        <div className="space-y-2">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[10px] text-zinc-400">External URL</label>
              {currentTarget.url && !/^https?:\/\//i.test(currentTarget.url) && (
                <button
                  type="button"
                  onClick={handleAddHttps}
                  className="text-[9px] text-indigo-400 hover:text-indigo-300 underline cursor-pointer"
                >
                  + Add https://
                </button>
              )}
            </div>
            <input
              type="text"
              placeholder="https://example.com"
              value={currentTarget.url || ''}
              onChange={(e) => handleFieldChange('url', e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs font-mono focus:outline-none"
            />
            {urlError && (
              <p className="text-[10px] text-rose-400 leading-tight">{urlError}</p>
            )}
          </div>

          <label className="flex items-center gap-2 cursor-pointer text-[11px] text-zinc-300 pt-1">
            <input
              type="checkbox"
              checked={Boolean(currentTarget.newTab)}
              onChange={(e) => handleFieldChange('newTab', e.target.checked)}
              className="rounded accent-indigo-600 cursor-pointer"
            />
            <span>Open in new tab (rel="noopener noreferrer")</span>
          </label>
        </div>
      )}

      {currentType === 'anchor' && (
        <div className="space-y-1">
          <label className="text-[10px] text-zinc-400">Anchor ID (#section)</label>
          <input
            type="text"
            placeholder="#features or section-id"
            value={currentTarget.nodeId || ''}
            onChange={(e) => handleFieldChange('nodeId', e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs font-mono focus:outline-none"
          />
        </div>
      )}

      {currentType === 'email' && (
        <div className="space-y-1">
          <label className="text-[10px] text-zinc-400">Email Address</label>
          <input
            type="email"
            placeholder="contact@company.com"
            value={currentTarget.email || ''}
            onChange={(e) => handleFieldChange('email', e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs font-mono focus:outline-none"
          />
        </div>
      )}

      {currentType === 'phone' && (
        <div className="space-y-1">
          <label className="text-[10px] text-zinc-400">Phone Number</label>
          <input
            type="tel"
            placeholder="+1 555 123 4567"
            value={currentTarget.phone || ''}
            onChange={(e) => handleFieldChange('phone', e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs font-mono focus:outline-none"
          />
        </div>
      )}
    </div>
  );
}

export default function PropertiesInspector() {
  const {
    selectedNode,
    activePage,
    project,
    activeBreakpoint,
    updateProps,
    updateStyles,
    resetStyleOverride,
    setResponsiveVisibility,
    stackOnMobile,
    updateNodeData,
    renameNode,
    updatePageSettings,
  } = useEditorStore();

  const [urlErrors, setUrlErrors] = useState({});

  if (!selectedNode) {
    return (
      <aside className="w-80 border-l border-white/10 bg-[#111114]/90 backdrop-blur-2xl flex flex-col shrink-0 z-20 select-none p-6 text-center text-zinc-500 justify-center items-center">
        <Info className="w-8 h-8 text-zinc-600 mb-2" />
        <h4 className="text-sm font-semibold text-zinc-400">No Element Selected</h4>
        <p className="text-xs text-zinc-600 mt-1">
          Click any element on the canvas or layers tree to configure content and styling properties.
        </p>
      </aside>
    );
  }

  const { id, type, props = {}, styles = {}, name, responsiveStyles = {} } = selectedNode;
  const def = NODE_REGISTRY[type] || {};

  // Resolved styles at active breakpoint
  const effectiveStyles = resolveStyles(selectedNode, activeBreakpoint);
  const isHiddenAtBreakpoint = effectiveStyles.display === 'none';

  // Helper to check if a specific style key has an override at the active breakpoint
  const isOverriddenAtBreakpoint = (key) => {
    if (activeBreakpoint === 'desktop') return false;
    return responsiveStyles[activeBreakpoint]?.[key] !== undefined;
  };

  const handlePropChange = (key, value) => {
    if (['href', 'src', 'action', 'url'].includes(key.toLowerCase()) && typeof value === 'string') {
      if (value && !isSafeUrl(value)) {
        setUrlErrors((prev) => ({
          ...prev,
          [key]: 'Invalid scheme. Use http, https, mailto, tel, /path, or #anchor.',
        }));
      } else {
        setUrlErrors((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      }
    }
    updateProps(id, { [key]: value }, true);
  };

  const handleHeadingLevelChange = (newLevel) => {
    const normalizedLevel = (newLevel || 'h2').toLowerCase();
    const levelDefaults = HEADING_LEVEL_DEFAULTS[normalizedLevel] || HEADING_LEVEL_DEFAULTS.h2;
    updateNodeData(id, {
      props: { level: normalizedLevel },
      styles: {
        fontSize: levelDefaults.fontSize,
        fontWeight: levelDefaults.fontWeight,
        lineHeight: levelDefaults.lineHeight,
      },
    });
  };

  const handleStyleChange = (key, value) => {
    updateStyles(id, { [key]: value }, true);

    // If height is increased and overlaps or exceeds page height, auto-expand page minHeight
    if (key === 'height' && type !== 'Page' && activePage?.root) {
      const numH = parseInt(value, 10);
      if (!isNaN(numH) && numH > 0 && typeof value === 'string' && value.includes('px')) {
        const pageMinH = parseInt(activePage.root.styles?.minHeight, 10) || 800;
        const compTop = parseInt(effectiveStyles.top, 10) || 0;
        const compBottom = compTop + numH;
        if (compBottom + 32 > pageMinH) {
          updateStyles(activePage.root.id, {
            minHeight: `${compBottom + 64}px`,
          });
        }
      }
    }
  };

  const handleResetOverride = (key) => {
    resetStyleOverride(id, key, activeBreakpoint);
  };

  // Contrast check
  const textColor = effectiveStyles.color || '#ffffff';
  const bgColor = effectiveStyles.backgroundColor || '#09090b';
  const contrast = getContrastRatio(textColor, bgColor);
  const isLowContrast = contrast !== null && contrast < 4.5;

  const { user } = useAuth();
  const userInitial = user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'C';

  const uploadedAssets = project?.assets || [];
  const [inspectorTab, setInspectorTab] = useState('design');
  const [showAgentBanner, setShowAgentBanner] = useState(true);

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
    } catch {}
  };

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  return (
    <aside className="w-72 bg-[#2c2c2c] border-l border-[#383838] flex flex-col shrink-0 z-20 select-none overflow-y-auto text-zinc-300">
      {/* 1. TOP BAR: User Avatar pill, Preview Play button, Blue Share button */}
      <div className="p-2.5 border-b border-[#383838] flex items-center justify-between bg-[#2c2c2c] sticky top-0 z-30">
        <div
          title={user?.email ? `Logged in as ${user.email}` : 'Craftify Account'}
          className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-black/30 border border-white/10 hover:bg-black/50 cursor-pointer"
        >
          <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center text-white text-[10px] font-bold">
            {userInitial}
          </div>
          <ChevronDown className="w-3 h-3 text-zinc-400" />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            title="Preview Site"
            onClick={handleExportJson}
            className="p-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-white/10 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
          </button>

          <button
            type="button"
            title="Share & Export"
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0d99ff] hover:bg-[#0b86e0] text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
          >
            <span>Share</span>
          </button>
        </div>
      </div>

      {/* 2. TABS BAR: Design | Prototype & Breakpoint (Matches Figma Screenshot) */}
      <div className="px-3 py-2 border-b border-[#383838] flex items-center justify-between text-xs font-semibold text-zinc-400">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setInspectorTab('design')}
            className={`pb-1 border-b-2 transition-all cursor-pointer ${
              inspectorTab === 'design'
                ? 'text-white border-white font-bold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Design
          </button>
          <button
            type="button"
            onClick={() => setInspectorTab('prototype')}
            className={`pb-1 border-b-2 transition-all cursor-pointer ${
              inspectorTab === 'prototype'
                ? 'text-white border-white font-bold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Prototype
          </button>
        </div>

        <span className="text-[11px] font-mono text-zinc-400 capitalize">
          {activeBreakpoint}
        </span>
      </div>

      {/* 3. PAGE SECTION: Color swatch 1E1E1E 100% Eye & Page Height */}
      <div className="p-3 border-b border-[#383838] space-y-2">
        <span className="text-xs font-bold text-white block">Page</span>
        <div className="flex items-center gap-2">
          <div
            className="w-5 h-5 rounded border border-white/20 shrink-0 shadow-inner"
            style={{ backgroundColor: '#1e1e1e' }}
          />
          <span className="text-xs font-mono text-zinc-300 uppercase font-semibold">1E1E1E</span>
          <span className="text-xs font-mono text-zinc-500 ml-auto">100 %</span>
          <Eye className="w-3.5 h-3.5 text-zinc-500 hover:text-zinc-300 cursor-pointer" />
        </div>
        <div className="flex items-center justify-between pt-1">
          <span className="text-[10px] text-zinc-400">Page Height</span>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-mono text-zinc-300">
              {activePage?.root?.styles?.minHeight || '800px'}
            </span>
            <button
              type="button"
              title="Reset page to default height (800px)"
              onClick={() => {
                if (activePage?.root) {
                  updateStyles(activePage.root.id, { minHeight: '800px', height: undefined });
                }
              }}
              className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 hover:bg-[#0d99ff]/20 text-zinc-400 hover:text-[#0d99ff] border border-white/10 transition-colors cursor-pointer"
            >
              Default (800px)
            </button>
          </div>
        </div>
      </div>

      {/* 4. STYLES & EXPORT SECTIONS (Matches Figma Screenshot) */}
      <div className="px-3 py-2 border-b border-[#383838] flex items-center justify-between text-xs text-zinc-300">
        <span className="font-semibold text-white">Styles</span>
        <button
          type="button"
          title="Add Style"
          className="p-1 rounded hover:bg-white/10 text-zinc-400 hover:text-white cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="px-3 py-2 border-b border-[#383838] flex items-center justify-between text-xs text-zinc-300">
        <span className="font-semibold text-white">Export</span>
        <button
          type="button"
          title="Export JSON file"
          onClick={handleExportJson}
          className="p-1 rounded hover:bg-white/10 text-zinc-400 hover:text-white cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="p-4 space-y-5 text-xs text-zinc-300">
        {/* Layer Identification */}
        <div className="p-3 rounded-2xl bg-[#0e0e11] border border-white/10 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase text-zinc-400 font-bold">Element Name</span>
            <span className="text-[9px] font-mono text-zinc-600 truncate max-w-[120px]">{id}</span>
          </div>
          <input
            type="text"
            value={name || type}
            onChange={(e) => renameNode(id, e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-white/30"
          />
        </div>

        {/* Responsive Mode Status Banner */}
        {activeBreakpoint !== 'desktop' && (
          <div className="p-2.5 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-indigo-300 text-[11px] space-y-1">
            <div className="flex items-center justify-between font-semibold">
              <span className="capitalize">{activeBreakpoint} Override Mode</span>
              <span className="text-[9px] font-mono text-indigo-400">Cascades from Base</span>
            </div>
            <p className="text-[10px] text-indigo-300/80">
              Edits here write only to {activeBreakpoint} overrides. Desktop base styles remain untouched.
            </p>
          </div>
        )}

        {/* Responsive Visibility Toggle */}
        {type !== 'Page' && (
          <div className="p-3 rounded-2xl bg-[#0e0e11] border border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isHiddenAtBreakpoint ? (
                <EyeOff className="w-4 h-4 text-amber-400" />
              ) : (
                <Eye className="w-4 h-4 text-zinc-400" />
              )}
              <div>
                <span className="text-xs font-medium text-white block">Visibility on {activeBreakpoint}</span>
                <span className="text-[10px] text-zinc-500">
                  {isHiddenAtBreakpoint ? 'Hidden (display: none)' : 'Visible'}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setResponsiveVisibility(id, activeBreakpoint, !isHiddenAtBreakpoint)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                isHiddenAtBreakpoint
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30'
                  : 'bg-white/10 text-zinc-300 hover:text-white hover:bg-white/15'
              }`}
            >
              {isHiddenAtBreakpoint ? 'Unhide' : 'Hide'}
            </button>
          </div>
        )}

        {/* 1. CONTENT CONTROLS */}
        <div className="space-y-3">
          <div className="flex items-center gap-1.5 font-semibold text-zinc-200 text-xs">
            <Type className="w-3.5 h-3.5 text-zinc-400" />
            <span>Content & Props</span>
          </div>

          {/* Heading Props */}
          {type === 'Heading' && (
            <div className="space-y-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] text-zinc-400 font-medium">Heading Level</label>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/10 text-zinc-200 font-bold">
                    {(props.level || 'h2').toUpperCase()} &bull;{' '}
                    {effectiveStyles.fontSize || '32px'}
                  </span>
                </div>

                <div className="grid grid-cols-6 gap-1 p-1 rounded-xl bg-[#0a0a0c] border border-white/10">
                  {['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].map((lvl) => {
                    const isCurrent = (props.level || 'h2').toLowerCase() === lvl;
                    return (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => handleHeadingLevelChange(lvl)}
                        className={`py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          isCurrent
                            ? 'bg-white text-black shadow-md font-bold'
                            : 'text-zinc-400 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        {lvl.toUpperCase()}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-zinc-400">Title Text</label>
                <input
                  type="text"
                  value={props.text ?? ''}
                  onChange={(e) => handlePropChange('text', e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-xl bg-[#0e0e11] border border-white/10 text-white text-xs focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Text Props */}
          {type === 'Text' && (
            <div className="space-y-1">
              <label className="text-[11px] text-zinc-400">Paragraph Content</label>
              <textarea
                rows={4}
                value={props.content ?? ''}
                onChange={(e) => handlePropChange('content', e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl bg-[#0e0e11] border border-white/10 text-white text-xs focus:outline-none resize-y"
              />
            </div>
          )}

          {/* Button Props */}
          {type === 'Button' && (
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] text-zinc-400">Button Label</label>
                <input
                  type="text"
                  value={props.label ?? ''}
                  onChange={(e) => handlePropChange('label', e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-xl bg-[#0e0e11] border border-white/10 text-white text-xs focus:outline-none"
                />
              </div>

              <LinkTargetControl
                linkTarget={props.linkTarget}
                pages={project?.pages || []}
                onChange={(target) => handlePropChange('linkTarget', target)}
              />
            </div>
          )}

          {/* Link Props */}
          {type === 'Link' && (
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] text-zinc-400">Link Text</label>
                <input
                  type="text"
                  value={props.text ?? ''}
                  onChange={(e) => handlePropChange('text', e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-xl bg-[#0e0e11] border border-white/10 text-white text-xs focus:outline-none"
                />
              </div>

              <LinkTargetControl
                linkTarget={props.linkTarget}
                pages={project?.pages || []}
                onChange={(target) => handlePropChange('linkTarget', target)}
              />
            </div>
          )}

          {/* Image Props & Asset Picker (Task 3) */}
          {type === 'Image' && (
            <div className="space-y-3">
              {/* Asset Library Picker */}
              <div className="space-y-1">
                <label className="text-[11px] text-zinc-400 font-medium">Project Asset Image</label>
                <select
                  value={props.assetId || ''}
                  onChange={(e) => {
                    const chosenId = e.target.value;
                    const chosenAsset = uploadedAssets.find((a) => a.id === chosenId);
                    if (chosenAsset) {
                      updateProps(id, {
                        assetId: chosenId,
                        alt: chosenAsset.altText || props.alt || '',
                      });
                    } else {
                      updateProps(id, { assetId: undefined });
                    }
                  }}
                  className="w-full px-2.5 py-1.5 rounded-xl bg-[#0e0e11] border border-white/10 text-white text-xs focus:outline-none"
                >
                  <option value="">-- Choose from Asset Library or use URL --</option>
                  {uploadedAssets.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.filename} ({(a.size / 1024).toFixed(0)} KB)
                    </option>
                  ))}
                </select>
              </div>

              {/* External URL fallback input */}
              {!props.assetId && (
                <div className="space-y-1">
                  <label className="text-[11px] text-zinc-400">External Image URL</label>
                  <input
                    type="text"
                    value={props.src ?? ''}
                    onChange={(e) => handlePropChange('src', e.target.value)}
                    placeholder="https://..."
                    className="w-full px-2.5 py-1.5 rounded-xl bg-[#0e0e11] border border-white/10 text-white text-xs focus:outline-none font-mono"
                  />
                  {urlErrors.src && (
                    <p className="text-[10px] text-rose-400 leading-tight">{urlErrors.src}</p>
                  )}
                </div>
              )}

              {/* Alt Text & Decorative image */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] text-zinc-400 font-medium">Alt Text (Accessibility)</label>
                  {!props.alt && !props.isDecorative && (
                    <span className="text-[10px] text-amber-400 flex items-center gap-1 font-mono">
                      <AlertTriangle className="w-3 h-3" />
                      Alt required
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  disabled={Boolean(props.isDecorative)}
                  value={props.alt ?? ''}
                  onChange={(e) => handlePropChange('alt', e.target.value)}
                  placeholder={props.isDecorative ? 'Marked decorative (alt="")' : 'Describe image content'}
                  className="w-full px-2.5 py-1.5 rounded-xl bg-[#0e0e11] border border-white/10 text-white text-xs focus:outline-none disabled:opacity-50"
                />

                <label className="flex items-center gap-2 cursor-pointer text-[11px] text-zinc-300 pt-0.5">
                  <input
                    type="checkbox"
                    checked={Boolean(props.isDecorative)}
                    onChange={(e) => {
                      const isDec = e.target.checked;
                      handlePropChange('isDecorative', isDec);
                      if (isDec) handlePropChange('alt', '');
                    }}
                    className="rounded accent-indigo-600 cursor-pointer"
                  />
                  <span>Decorative image (sets alt="" intentionally)</span>
                </label>
              </div>
            </div>
          )}

          {/* Grid Layout Props */}
          {type === 'Grid' && (
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] text-zinc-400">
                    Grid Columns ({effectiveStyles.gridTemplateColumns || `repeat(${props.columns || 3}, minmax(0, 1fr))`})
                  </label>
                  {isOverriddenAtBreakpoint('gridTemplateColumns') && (
                    <button
                      type="button"
                      onClick={() => handleResetOverride('gridTemplateColumns')}
                      className="text-[9px] text-amber-400 underline cursor-pointer"
                    >
                      Reset override
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {[1, 2, 3, 4].map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => {
                        handlePropChange('columns', col);
                        handleStyleChange('gridTemplateColumns', `repeat(${col}, minmax(0, 1fr))`);
                      }}
                      className={`py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                        effectiveStyles.gridTemplateColumns === `repeat(${col}, minmax(0, 1fr))` ||
                        (!effectiveStyles.gridTemplateColumns && (props.columns || 3) === col)
                          ? 'bg-white text-black font-bold'
                          : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {col} Col
                    </button>
                  ))}
                </div>
              </div>

              {/* Stack on Mobile Button */}
              <button
                type="button"
                onClick={() => stackOnMobile(id)}
                className="w-full py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Columns className="w-3.5 h-3.5" />
                <span>Stack on mobile (1 col override)</span>
              </button>
            </div>
          )}

          {/* Container Layout Props */}
          {(type === 'Container' || type === 'Section') && (
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] text-zinc-400">Flex Direction</label>
                  {isOverriddenAtBreakpoint('flexDirection') && (
                    <button
                      type="button"
                      onClick={() => handleResetOverride('flexDirection')}
                      className="text-[9px] text-amber-400 underline cursor-pointer"
                    >
                      Reset override
                    </button>
                  )}
                </div>
                <select
                  value={effectiveStyles.flexDirection || (props.layout === 'flex-row' ? 'row' : 'column')}
                  onChange={(e) => handleStyleChange('flexDirection', e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-xl bg-[#0e0e11] border border-white/10 text-white text-xs focus:outline-none"
                >
                  <option value="column">Column (Vertical)</option>
                  <option value="row">Row (Horizontal)</option>
                </select>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] text-zinc-400">Flex Wrap</label>
                  {isOverriddenAtBreakpoint('flexWrap') && (
                    <button
                      type="button"
                      onClick={() => handleResetOverride('flexWrap')}
                      className="text-[9px] text-amber-400 underline cursor-pointer"
                    >
                      Reset override
                    </button>
                  )}
                </div>
                <select
                  value={effectiveStyles.flexWrap || 'nowrap'}
                  onChange={(e) => handleStyleChange('flexWrap', e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-xl bg-[#0e0e11] border border-white/10 text-white text-xs focus:outline-none"
                >
                  <option value="nowrap">No Wrap (single line)</option>
                  <option value="wrap">Wrap (wrap to next line)</option>
                </select>
              </div>

              {/* Stack on Mobile Shortcut */}
              <button
                type="button"
                onClick={() => stackOnMobile(id)}
                className="w-full py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Columns className="w-3.5 h-3.5" />
                <span>Stack on mobile (column override)</span>
              </button>
            </div>
          )}
        </div>

        {/* 2. STYLE CONTROLS */}
        <div className="space-y-4 pt-4 border-t border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-semibold text-zinc-200 text-xs">
              <Palette className="w-3.5 h-3.5 text-zinc-400" />
              <span>Styles & Typography</span>
            </div>
            {activeBreakpoint !== 'desktop' && (
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                {activeBreakpoint} overrides
              </span>
            )}
          </div>

          {/* Typography Controls */}
          {['Heading', 'Text', 'Button', 'Link'].includes(type) && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] text-zinc-400">Font Size</label>
                    {isOverriddenAtBreakpoint('fontSize') && (
                      <button
                        type="button"
                        onClick={() => handleResetOverride('fontSize')}
                        className="text-[9px] text-amber-400 underline cursor-pointer"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={effectiveStyles.fontSize || '16px'}
                    onChange={(e) => handleStyleChange('fontSize', e.target.value)}
                    className="w-full px-2 py-1 rounded-lg bg-[#0e0e11] border border-white/10 text-white text-xs font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] text-zinc-400">Font Weight</label>
                    {isOverriddenAtBreakpoint('fontWeight') && (
                      <button
                        type="button"
                        onClick={() => handleResetOverride('fontWeight')}
                        className="text-[9px] text-amber-400 underline cursor-pointer"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                  <select
                    value={effectiveStyles.fontWeight || '400'}
                    onChange={(e) => handleStyleChange('fontWeight', e.target.value)}
                    className="w-full px-2 py-1 rounded-lg bg-[#0e0e11] border border-white/10 text-white text-xs"
                  >
                    <option value="400">Normal (400)</option>
                    <option value="500">Medium (500)</option>
                    <option value="600">Semibold (600)</option>
                    <option value="700">Bold (700)</option>
                    <option value="800">Extra Bold (800)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-zinc-400">Font Family</label>
                <select
                  value={effectiveStyles.fontFamily || 'Inter, sans-serif'}
                  onChange={(e) => handleStyleChange('fontFamily', e.target.value)}
                  className="w-full px-2 py-1 rounded-lg bg-[#0e0e11] border border-white/10 text-white text-xs"
                >
                  <option value="Inter, system-ui, sans-serif">Inter (Modern Clean)</option>
                  <option value="Roboto, sans-serif">Roboto</option>
                  <option value="Outfit, sans-serif">Outfit (Editorial)</option>
                  <option value="monospace">Monospace (Code)</option>
                  <option value="Georgia, serif">Georgia (Serif)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-zinc-400">Text Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={effectiveStyles.color || '#ffffff'}
                    onChange={(e) => handleStyleChange('color', e.target.value)}
                    className="w-7 h-7 rounded-lg bg-transparent border border-white/20 cursor-pointer p-0 shrink-0"
                  />
                  <input
                    type="text"
                    value={effectiveStyles.color || '#ffffff'}
                    onChange={(e) => handleStyleChange('color', e.target.value)}
                    className="flex-1 px-2 py-1 rounded-lg bg-[#0e0e11] border border-white/10 text-white text-xs font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Background Color */}
          <div className="space-y-1">
            <label className="text-[10px] text-zinc-400">Background Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={effectiveStyles.backgroundColor || '#09090b'}
                onChange={(e) => handleStyleChange('backgroundColor', e.target.value)}
                className="w-7 h-7 rounded-lg bg-transparent border border-white/20 cursor-pointer p-0 shrink-0"
              />
              <input
                type="text"
                value={effectiveStyles.backgroundColor || ''}
                placeholder="transparent"
                onChange={(e) => handleStyleChange('backgroundColor', e.target.value)}
                className="flex-1 px-2 py-1 rounded-lg bg-[#0e0e11] border border-white/10 text-white text-xs font-mono"
              />
            </div>
          </div>

          {/* Contrast Ratio Warning */}
          {isLowContrast && (
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>Low text contrast ({contrast?.toFixed(1)}:1). Consider higher contrast.</span>
            </div>
          )}

          {/* Spacing & Sizing */}
          <div className="space-y-2 pt-2 border-t border-white/5">
            <span className="text-[10px] font-mono uppercase text-zinc-500">Dimensions & Padding</span>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-400">Padding</label>
                <input
                  type="text"
                  value={effectiveStyles.padding || ''}
                  placeholder="e.g. 16px 24px"
                  onChange={(e) => handleStyleChange('padding', e.target.value)}
                  className="w-full px-2 py-1 rounded-lg bg-[#0e0e11] border border-white/10 text-white text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-400">Margin</label>
                <input
                  type="text"
                  value={effectiveStyles.margin || ''}
                  placeholder="e.g. 0 auto"
                  onChange={(e) => handleStyleChange('margin', e.target.value)}
                  className="w-full px-2 py-1 rounded-lg bg-[#0e0e11] border border-white/10 text-white text-xs font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] text-zinc-400">Width</label>
                  {isOverriddenAtBreakpoint('width') && (
                    <button
                      type="button"
                      onClick={() => handleResetOverride('width')}
                      className="text-[9px] text-amber-400 underline cursor-pointer"
                    >
                      Reset
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={effectiveStyles.width || ''}
                  placeholder="auto / 100%"
                  onChange={(e) => handleStyleChange('width', e.target.value)}
                  className="w-full px-2 py-1 rounded-lg bg-[#0e0e11] border border-white/10 text-white text-xs font-mono"
                />
                <div className="flex items-center gap-1 pt-0.5">
                  <button
                    type="button"
                    title="Make width same as page (100%)"
                    onClick={() => {
                      handleStyleChange('width', '100%');
                      handleStyleChange('maxWidth', '100%');
                      if (effectiveStyles.position === 'absolute') {
                        handleStyleChange('left', '0px');
                      }
                    }}
                    className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 hover:bg-[#0d99ff]/20 text-zinc-400 hover:text-[#0d99ff] border border-white/5 hover:border-[#0d99ff]/40 transition-colors cursor-pointer"
                  >
                    100% (Page)
                  </button>
                  <button
                    type="button"
                    title="Reset to auto width"
                    onClick={() => handleStyleChange('width', 'auto')}
                    className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  >
                    Auto
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] text-zinc-400">Height</label>
                  {isOverriddenAtBreakpoint('height') && (
                    <button
                      type="button"
                      onClick={() => handleResetOverride('height')}
                      className="text-[9px] text-amber-400 underline cursor-pointer"
                    >
                      Reset
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={effectiveStyles.height || ''}
                  placeholder="auto"
                  onChange={(e) => handleStyleChange('height', e.target.value)}
                  className="w-full px-2 py-1 rounded-lg bg-[#0e0e11] border border-white/10 text-white text-xs font-mono"
                />
                <div className="flex items-center gap-1 pt-0.5">
                  <button
                    type="button"
                    title="Make height same as page (100%)"
                    onClick={() => {
                      handleStyleChange('height', '100%');
                      if (effectiveStyles.position === 'absolute') {
                        handleStyleChange('top', '0px');
                      }
                    }}
                    className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 hover:bg-[#0d99ff]/20 text-zinc-400 hover:text-[#0d99ff] border border-white/5 hover:border-[#0d99ff]/40 transition-colors cursor-pointer"
                  >
                    100% (Page)
                  </button>
                  <button
                    type="button"
                    title="Set to viewport height"
                    onClick={() => handleStyleChange('height', '100vh')}
                    className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  >
                    100vh
                  </button>
                  <button
                    type="button"
                    title="Set to default / auto height"
                    onClick={() => handleStyleChange('height', 'auto')}
                    className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  >
                    Default
                  </button>
                  <button
                    type="button"
                    title="Set to 800px default height"
                    onClick={() => handleStyleChange('height', '800px')}
                    className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  >
                    800px
                  </button>
                </div>
              </div>
            </div>

            {/* TOP & BOTTOM BORDER RADIUS */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] text-zinc-400">Top Border Radius</label>
                  {isOverriddenAtBreakpoint('borderTopLeftRadius') && (
                    <button
                      type="button"
                      onClick={() => {
                        handleResetOverride('borderTopLeftRadius');
                        handleResetOverride('borderTopRightRadius');
                      }}
                      className="text-[9px] text-amber-400 underline cursor-pointer"
                    >
                      Reset
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={effectiveStyles.borderTopLeftRadius || effectiveStyles.borderRadius || ''}
                  placeholder="0px"
                  onChange={(e) => {
                    const val = e.target.value;
                    updateStyles(id, {
                      borderTopLeftRadius: val,
                      borderTopRightRadius: val,
                    }, true);
                  }}
                  className="w-full px-2 py-1 rounded-lg bg-[#0e0e11] border border-white/10 text-white text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] text-zinc-400">Bottom Border Radius</label>
                  {isOverriddenAtBreakpoint('borderBottomLeftRadius') && (
                    <button
                      type="button"
                      onClick={() => {
                        handleResetOverride('borderBottomLeftRadius');
                        handleResetOverride('borderBottomRightRadius');
                      }}
                      className="text-[9px] text-amber-400 underline cursor-pointer"
                    >
                      Reset
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={effectiveStyles.borderBottomLeftRadius || effectiveStyles.borderRadius || ''}
                  placeholder="0px"
                  onChange={(e) => {
                    const val = e.target.value;
                    updateStyles(id, {
                      borderBottomLeftRadius: val,
                      borderBottomRightRadius: val,
                    }, true);
                  }}
                  className="w-full px-2 py-1 rounded-lg bg-[#0e0e11] border border-white/10 text-white text-xs font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[10px] text-zinc-400">Max Width</label>
                {isOverriddenAtBreakpoint('maxWidth') && (
                  <button
                    type="button"
                    onClick={() => handleResetOverride('maxWidth')}
                    className="text-[9px] text-amber-400 underline cursor-pointer"
                  >
                    Reset
                  </button>
                )}
              </div>
              <input
                type="text"
                value={effectiveStyles.maxWidth || ''}
                placeholder="100%"
                onChange={(e) => handleStyleChange('maxWidth', e.target.value)}
                className="w-full px-2 py-1 rounded-lg bg-[#0e0e11] border border-white/10 text-white text-xs font-mono"
              />
            </div>
          </div>
        </div>

        {/* 3. POSITION & CANVAS OFFSET */}
        {type !== 'Page' && (
          <div className="space-y-3 pt-4 border-t border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-semibold text-zinc-200 text-xs">
                <Move className="w-3.5 h-3.5 text-zinc-400" />
                <span>Canvas Position (X, Y)</span>
              </div>
              <button
                type="button"
                onClick={() => handleStyleChange('transform', 'translate(0px, 0px)')}
                className="text-[10px] text-zinc-400 hover:text-white px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 transition-colors flex items-center gap-1 cursor-pointer"
                title="Reset to (0, 0)"
              >
                <RotateCcw className="w-2.5 h-2.5" />
                <span>Reset</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-400">X Offset (px)</label>
                <input
                  type="number"
                  value={parseTranslate(effectiveStyles.transform).x}
                  onChange={(e) => {
                    const rawX = parseFloat(e.target.value) || 0;
                    const cur = parseTranslate(effectiveStyles.transform);
                    const el = document.querySelector(`[data-node-id="${id}"]`);
                    const bounds = computeCanvasBounds(el, cur, 1);
                    const clampedX = Math.max(bounds.minX, Math.min(bounds.maxX, rawX));
                    handleStyleChange('transform', `translate(${clampedX}px, ${cur.y}px)`);
                  }}
                  className="w-full px-2 py-1 rounded-lg bg-[#0e0e11] border border-white/10 text-white text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-400">Y Offset (px)</label>
                <input
                  type="number"
                  value={parseTranslate(effectiveStyles.transform).y}
                  onChange={(e) => {
                    const rawY = parseFloat(e.target.value) || 0;
                    const cur = parseTranslate(effectiveStyles.transform);
                    const el = document.querySelector(`[data-node-id="${id}"]`);
                    const bounds = computeCanvasBounds(el, cur, 1);
                    const clampedY = Math.max(bounds.minY, Math.min(bounds.maxY, rawY));
                    handleStyleChange('transform', `translate(${cur.x}px, ${clampedY}px)`);
                  }}
                  className="w-full px-2 py-1 rounded-lg bg-[#0e0e11] border border-white/10 text-white text-xs font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {/* 5. CRAFTIFY AI WEB COPILOT WIDGET */}
        {showAgentBanner && (
          <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 space-y-2 mt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-violet-500" />
                <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              </div>
              <button
                type="button"
                onClick={() => setShowAgentBanner(false)}
                className="text-zinc-500 hover:text-zinc-300 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </div>

            <h5 className="font-bold text-xs text-white">Craftify AI Web Copilot</h5>
            <p className="text-[10px] text-zinc-400 leading-relaxed">
              Generate web layouts, write copy, or auto-audit design and accessibility with AI.
            </p>

            <button
              type="button"
              className="w-full py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-semibold cursor-pointer transition-colors"
            >
              Explore AI Copilot
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
