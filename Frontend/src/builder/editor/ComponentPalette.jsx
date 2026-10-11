import React from 'react';
import { useEditorStore } from '../store/editorContext.jsx';
import { NODE_REGISTRY } from '../model/registry.js';
import {
  Palette,
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
  Plus,
  GripVertical,
} from 'lucide-react';

const PALETTE_ICONS = {
  Section: Box,
  Container: Layers,
  Heading: Type,
  Text: Type,
  Image: ImageIcon,
  Button: Square,
  Link: LinkIcon,
  Grid: GridIcon,
  Spacer: Maximize2,
  Divider: Minus,
};

// Available components for Phase 2
const ACTIVE_COMPONENTS = [
  { type: 'Section', desc: 'Full-width landmark section' },
  { type: 'Container', desc: 'Flexbox layout wrapper' },
  { type: 'Grid', desc: 'Multi-column grid container' },
  { type: 'Heading', desc: 'Semantic h1-h6 title' },
  { type: 'Text', desc: 'Body paragraph text' },
  { type: 'Image', desc: 'Responsive media image' },
  { type: 'Button', desc: 'Call to action button' },
  { type: 'Link', desc: 'Anchor hyperlink text' },
  { type: 'Spacer', desc: 'Vertical space separator' },
  { type: 'Divider', desc: 'Horizontal dividing line' },
];

export default function ComponentPalette() {
  const { addNode } = useEditorStore();

  const handleDragStart = (e, type) => {
    e.dataTransfer.setData(
      'application/json',
      JSON.stringify({ source: 'palette', type })
    );
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <aside className="w-60 border-r border-white/10 bg-[#111114]/90 backdrop-blur-2xl flex flex-col shrink-0 z-20 select-none">
      <div className="p-3.5 border-b border-white/10 flex items-center justify-between text-xs font-semibold text-zinc-200">
        <div className="flex items-center gap-2">
          <Palette className="w-3.5 h-3.5 text-zinc-300" />
          <span>Components</span>
        </div>
        <span className="text-[10px] font-mono text-zinc-500">{ACTIVE_COMPONENTS.length} items</span>
      </div>

      <div className="p-2 space-y-1.5 overflow-y-auto flex-1">
        <p className="text-[10px] text-zinc-500 px-2 py-0.5 leading-tight font-mono">
          Click or drag onto canvas:
        </p>

        {ACTIVE_COMPONENTS.map(({ type, desc }) => {
          const def = NODE_REGISTRY[type];
          const Icon = PALETTE_ICONS[type] || Box;

          return (
            <div
              key={type}
              draggable
              onDragStart={(e) => handleDragStart(e, type)}
              onClick={() => addNode(type)}
              title={`Add ${def.label} (${desc})`}
              className="group relative p-2.5 rounded-xl bg-[#0e0e11]/80 hover:bg-white/10 border border-white/5 hover:border-white/20 flex items-center gap-2.5 text-xs text-zinc-300 cursor-grab active:cursor-grabbing transition-all shadow-sm"
            >
              <GripVertical className="w-3 h-3 text-zinc-600 group-hover:text-zinc-400 shrink-0 opacity-40 group-hover:opacity-100 transition-opacity" />

              <div className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0 text-zinc-300 group-hover:text-white group-hover:bg-white/10 transition-colors">
                <Icon className="w-3.5 h-3.5" />
              </div>

              <div className="truncate flex-1">
                <span className="font-semibold text-xs text-zinc-200 block truncate group-hover:text-white">
                  {def.label}
                </span>
                <span className="text-[10px] text-zinc-500 block truncate font-normal">
                  {desc}
                </span>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  addNode(type);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 rounded-md bg-white/10 hover:bg-white/20 text-white transition-opacity shrink-0 cursor-pointer"
                title="Add to canvas"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          );
        })}

        {/* Coming Later Placeholder Section */}
        <div className="pt-3 border-t border-white/5">
          <p className="text-[10px] text-zinc-600 px-2 py-1 font-mono uppercase tracking-wider">
            Coming In Later Phases:
          </p>
          <div className="px-2 py-1.5 space-y-1">
            <span className="text-[11px] text-zinc-600 block">• Form & Interactive Inputs</span>
            <span className="text-[11px] text-zinc-600 block">• SVG Vector Illustrations</span>
            <span className="text-[11px] text-zinc-600 block">• Dynamic CMS Collections</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
