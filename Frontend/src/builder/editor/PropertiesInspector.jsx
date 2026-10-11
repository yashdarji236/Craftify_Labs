import React, { useState, useEffect } from 'react';
import { useEditorStore } from '../store/editorContext.jsx';
import { isSafeUrl, NODE_REGISTRY, HEADING_LEVEL_DEFAULTS } from '../model/index.js';
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
} from 'lucide-react';

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

export default function PropertiesInspector() {
  const { selectedNode, updateProps, updateStyles, updateNodeData, renameNode } = useEditorStore();

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

  const { id, type, props = {}, styles = {}, name } = selectedNode;
  const def = NODE_REGISTRY[type] || {};

  const handlePropChange = (key, value) => {
    // Validate URLs inline
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
  };

  // Contrast check
  const textColor = styles.color || '#ffffff';
  const bgColor = styles.backgroundColor || '#09090b';
  const contrast = getContrastRatio(textColor, bgColor);
  const isLowContrast = contrast !== null && contrast < 4.5;

  return (
    <aside className="w-80 border-l border-white/10 bg-[#111114]/90 backdrop-blur-2xl flex flex-col shrink-0 z-20 select-none overflow-y-auto">
      {/* Header Badge */}
      <div className="p-3.5 border-b border-white/10 flex items-center justify-between text-xs font-semibold text-zinc-200 sticky top-0 bg-[#111114]/95 backdrop-blur-md z-10">
        <div className="flex items-center gap-2">
          <Sliders className="w-3.5 h-3.5 text-zinc-300" />
          <span>Properties</span>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-zinc-300">
          {type}
        </span>
      </div>

      <div className="p-4 space-y-6 text-xs text-zinc-300">
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

        {/* 1. CONTENT CONTROLS (SCHEMA-DRIVEN) */}
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
                    {(props.level || 'h2').toUpperCase()} &bull; {styles.fontSize || HEADING_LEVEL_DEFAULTS[(props.level || 'h2').toLowerCase()]?.fontSize || '32px'}
                  </span>
                </div>

                {/* Quick-Pick Pill Selector */}
                <div className="grid grid-cols-6 gap-1 p-1 rounded-xl bg-[#0a0a0c] border border-white/10">
                  {['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].map((lvl) => {
                    const isCurrent = (props.level || 'h2').toLowerCase() === lvl;
                    return (
                      <button
                        key={lvl}
                        type="button"
                        id={`heading-level-pill-${lvl}`}
                        onClick={() => handleHeadingLevelChange(lvl)}
                        className={`py-1.5 rounded-lg text-xs font-semibold transition-all ${
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

                <select
                  value={(props.level || 'h2').toLowerCase()}
                  onChange={(e) => handleHeadingLevelChange(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-xl bg-[#0e0e11] border border-white/10 text-white text-xs focus:outline-none"
                >
                  <option value="h1">H1 - Primary Page Title (44px)</option>
                  <option value="h2">H2 - Major Section Heading (32px)</option>
                  <option value="h3">H3 - Sub-section Heading (24px)</option>
                  <option value="h4">H4 - Card Title (20px)</option>
                  <option value="h5">H5 - Small Title (16px)</option>
                  <option value="h6">H6 - Micro Title (13px)</option>
                </select>
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

              <div className="space-y-1">
                <label className="text-[11px] text-zinc-400">Link URL (href)</label>
                <input
                  type="text"
                  value={props.href ?? ''}
                  onChange={(e) => handlePropChange('href', e.target.value)}
                  placeholder="https://... or #section"
                  className="w-full px-2.5 py-1.5 rounded-xl bg-[#0e0e11] border border-white/10 text-white text-xs focus:outline-none font-mono"
                />
                {urlErrors.href && (
                  <p className="text-[10px] text-rose-400 leading-tight">{urlErrors.href}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-zinc-400">Target Window</label>
                <select
                  value={props.target || '_self'}
                  onChange={(e) => handlePropChange('target', e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-xl bg-[#0e0e11] border border-white/10 text-white text-xs focus:outline-none"
                >
                  <option value="_self">Same tab (_self)</option>
                  <option value="_blank">New tab (_blank)</option>
                </select>
              </div>
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

              <div className="space-y-1">
                <label className="text-[11px] text-zinc-400">Destination URL</label>
                <input
                  type="text"
                  value={props.href ?? ''}
                  onChange={(e) => handlePropChange('href', e.target.value)}
                  placeholder="/about or https://..."
                  className="w-full px-2.5 py-1.5 rounded-xl bg-[#0e0e11] border border-white/10 text-white text-xs focus:outline-none font-mono"
                />
                {urlErrors.href && (
                  <p className="text-[10px] text-rose-400 leading-tight">{urlErrors.href}</p>
                )}
              </div>
            </div>
          )}

          {/* Image Props */}
          {type === 'Image' && (
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] text-zinc-400">Image Source URL</label>
                <input
                  type="text"
                  value={props.src ?? ''}
                  onChange={(e) => handlePropChange('src', e.target.value)}
                  placeholder="/img2.jpg or https://..."
                  className="w-full px-2.5 py-1.5 rounded-xl bg-[#0e0e11] border border-white/10 text-white text-xs focus:outline-none font-mono"
                />
                {urlErrors.src && (
                  <p className="text-[10px] text-rose-400 leading-tight">{urlErrors.src}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-zinc-400 flex items-center justify-between">
                  <span>Alt Text (Accessibility)</span>
                  {!props.alt && (
                    <span className="text-[10px] text-amber-400 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Required for SEO
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  value={props.alt ?? ''}
                  onChange={(e) => handlePropChange('alt', e.target.value)}
                  placeholder="Describe image content"
                  className="w-full px-2.5 py-1.5 rounded-xl bg-[#0e0e11] border border-white/10 text-white text-xs focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Grid Props */}
          {type === 'Grid' && (
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] text-zinc-400">Columns Count ({props.columns || 3})</label>
                <input
                  type="range"
                  min={1}
                  max={6}
                  value={props.columns || 3}
                  onChange={(e) => {
                    const cols = parseInt(e.target.value, 10);
                    handlePropChange('columns', cols);
                    handleStyleChange(
                      'gridTemplateColumns',
                      `repeat(${cols}, minmax(0, 1fr))`
                    );
                  }}
                  className="w-full accent-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-zinc-400">Grid Gap</label>
                <select
                  value={props.gap || '24px'}
                  onChange={(e) => {
                    handlePropChange('gap', e.target.value);
                    handleStyleChange('gap', e.target.value);
                  }}
                  className="w-full px-2.5 py-1.5 rounded-xl bg-[#0e0e11] border border-white/10 text-white text-xs focus:outline-none"
                >
                  <option value="12px">Compact (12px)</option>
                  <option value="16px">Standard (16px)</option>
                  <option value="24px">Spacious (24px)</option>
                  <option value="36px">Expansive (36px)</option>
                </select>
              </div>
            </div>
          )}

          {/* Container Layout Props */}
          {type === 'Container' && (
            <div className="space-y-1">
              <label className="text-[11px] text-zinc-400">Container Layout</label>
              <select
                value={props.layout || 'flex-col'}
                onChange={(e) => {
                  const layout = e.target.value;
                  handlePropChange('layout', layout);
                  handleStyleChange(
                    'flexDirection',
                    layout === 'flex-row' ? 'row' : 'column'
                  );
                }}
                className="w-full px-2.5 py-1.5 rounded-xl bg-[#0e0e11] border border-white/10 text-white text-xs focus:outline-none"
              >
                <option value="flex-col">Vertical Column (flex-col)</option>
                <option value="flex-row">Horizontal Row (flex-row)</option>
              </select>
            </div>
          )}
        </div>

        {/* 2. STYLE CONTROLS */}
        <div className="space-y-4 pt-4 border-t border-white/10">
          <div className="flex items-center gap-1.5 font-semibold text-zinc-200 text-xs">
            <Palette className="w-3.5 h-3.5 text-zinc-400" />
            <span>Styles & Typography</span>
          </div>

          {/* Typography Controls */}
          {['Heading', 'Text', 'Button', 'Link'].includes(type) && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-400">Font Size</label>
                  <input
                    type="text"
                    value={styles.fontSize || '16px'}
                    onChange={(e) => handleStyleChange('fontSize', e.target.value)}
                    className="w-full px-2 py-1 rounded-lg bg-[#0e0e11] border border-white/10 text-white text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-400">Font Weight</label>
                  <select
                    value={styles.fontWeight || '400'}
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
                  value={styles.fontFamily || 'Inter, sans-serif'}
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
                    value={styles.color || '#ffffff'}
                    onChange={(e) => handleStyleChange('color', e.target.value)}
                    className="w-7 h-7 rounded-lg bg-transparent border border-white/20 cursor-pointer p-0 shrink-0"
                  />
                  <input
                    type="text"
                    value={styles.color || '#ffffff'}
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
                value={styles.backgroundColor || '#09090b'}
                onChange={(e) => handleStyleChange('backgroundColor', e.target.value)}
                className="w-7 h-7 rounded-lg bg-transparent border border-white/20 cursor-pointer p-0 shrink-0"
              />
              <input
                type="text"
                value={styles.backgroundColor || ''}
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
                  value={styles.padding || ''}
                  placeholder="e.g. 16px 24px"
                  onChange={(e) => handleStyleChange('padding', e.target.value)}
                  className="w-full px-2 py-1 rounded-lg bg-[#0e0e11] border border-white/10 text-white text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-400">Margin</label>
                <input
                  type="text"
                  value={styles.margin || ''}
                  placeholder="e.g. 0 auto"
                  onChange={(e) => handleStyleChange('margin', e.target.value)}
                  className="w-full px-2 py-1 rounded-lg bg-[#0e0e11] border border-white/10 text-white text-xs font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-400">Width</label>
                <input
                  type="text"
                  value={styles.width || ''}
                  placeholder="auto / 320px / 100%"
                  onChange={(e) => handleStyleChange('width', e.target.value)}
                  className="w-full px-2 py-1 rounded-lg bg-[#0e0e11] border border-white/10 text-white text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-400">Height</label>
                <input
                  type="text"
                  value={styles.height || ''}
                  placeholder="auto / 180px"
                  onChange={(e) => handleStyleChange('height', e.target.value)}
                  className="w-full px-2 py-1 rounded-lg bg-[#0e0e11] border border-white/10 text-white text-xs font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-400">Border Radius</label>
                <input
                  type="text"
                  value={styles.borderRadius || ''}
                  placeholder="8px"
                  onChange={(e) => handleStyleChange('borderRadius', e.target.value)}
                  className="w-full px-2 py-1 rounded-lg bg-[#0e0e11] border border-white/10 text-white text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-400">Max Width</label>
                <input
                  type="text"
                  value={styles.maxWidth || ''}
                  placeholder="1200px"
                  onChange={(e) => handleStyleChange('maxWidth', e.target.value)}
                  className="w-full px-2 py-1 rounded-lg bg-[#0e0e11] border border-white/10 text-white text-xs font-mono"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
