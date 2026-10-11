import React, { useState, useEffect, useRef } from 'react';
import { useEditorStore } from '../store/editorContext.jsx';
import PagesPanel from './PagesPanel.jsx';
import AssetsPanel from './AssetsPanel.jsx';
import {
  Layers,
  ChevronDown,
  ChevronRight,
  Edit2,
  Copy,
  Trash2,
  ArrowUp,
  ArrowDown,
  Layout,
  Box,
  Grid as GridIcon,
  Type,
  Image as ImageIcon,
  Square,
  Link as LinkIcon,
  Maximize2,
  Minus,
  FormInput,
  TextCursorInput,
  Check,
  X,
  GripVertical,
  FileText,
  Eye,
  EyeOff,
} from 'lucide-react';
import { resolveStyles } from '../model/breakpoints.js';

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

function LayerRow({
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
  const editInputRef = useRef(null);

  const { moveNode, activeBreakpoint, setResponsiveVisibility } = useEditorStore();

  const isSelected = selectedId === node.id;
  const hasChildren = Array.isArray(node.children) && node.children.length > 0;
  const Icon = PALETTE_ICONS[node.type] || Box;

  // Compute resolved styles to see if hidden at active breakpoint
  const effectiveStyles = resolveStyles(node, activeBreakpoint);
  const isHidden = effectiveStyles.display === 'none';

  useEffect(() => {
    setNameInput(node.name || node.type);
  }, [node.name, node.type]);

  useEffect(() => {
    if (isEditing && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [isEditing]);

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

  const handleDragStart = (e) => {
    if (isRoot) return;
    e.dataTransfer.setData(
      'application/json',
      JSON.stringify({ source: 'layer', targetId: node.id })
    );
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      if (data?.source === 'layer' && data.targetId && data.targetId !== node.id) {
        moveNode(data.targetId, node.id, -1);
      }
    } catch {}
  };

  return (
    <div className="flex flex-col select-none">
      <div
        draggable={!isRoot && !isEditing}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(node.id);
        }}
        style={{ paddingLeft: `${Math.max(6, depth * 14)}px` }}
        className={`group relative flex items-center justify-between py-1.5 pr-2 rounded-xl text-xs font-medium cursor-pointer transition-all ${
          isSelected
            ? 'bg-indigo-600/25 border border-indigo-500/40 text-white shadow-sm'
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
              className="p-0.5 rounded hover:bg-white/10 text-zinc-400 hover:text-zinc-200"
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

          <Icon className="w-3.5 h-3.5 shrink-0 text-zinc-400 group-hover:text-zinc-200" />

          {isEditing ? (
            <input
              ref={editInputRef}
              type="text"
              value={nameInput}
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
            <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-white/10 text-zinc-400" title="Hidden on active breakpoint">
              hidden
            </span>
          )}
        </div>

        {/* Action icons */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          {/* Toggle visibility shortcut */}
          {!isRoot && (
            <button
              type="button"
              title={isHidden ? `Show on ${activeBreakpoint}` : `Hide on ${activeBreakpoint}`}
              onClick={() => setResponsiveVisibility(node.id, activeBreakpoint, !isHidden)}
              className="p-1 rounded text-zinc-400 hover:text-white hover:bg-white/10"
            >
              {isHidden ? <EyeOff className="w-3 h-3 text-amber-400" /> : <Eye className="w-3 h-3" />}
            </button>
          )}

          {!isRoot && (
            <>
              <button
                type="button"
                title="Move Up"
                onClick={() => onMoveUp(node.id)}
                className="p-1 rounded text-zinc-400 hover:text-white hover:bg-white/10"
              >
                <ArrowUp className="w-3 h-3" />
              </button>
              <button
                type="button"
                title="Move Down"
                onClick={() => onMoveDown(node.id)}
                className="p-1 rounded text-zinc-400 hover:text-white hover:bg-white/10"
              >
                <ArrowDown className="w-3 h-3" />
              </button>
              <button
                type="button"
                title="Duplicate"
                onClick={() => onDuplicate(node.id)}
                className="p-1 rounded text-zinc-400 hover:text-white hover:bg-white/10"
              >
                <Copy className="w-3 h-3" />
              </button>
              <button
                type="button"
                title="Delete"
                onClick={() => onDelete(node.id)}
                className="p-1 rounded text-rose-400 hover:text-rose-200 hover:bg-rose-500/10"
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
            <LayerRow
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

export default function LayersPanel() {
  const {
    activePage,
    selectedNodeId,
    setSelectedNodeId,
    renameNode,
    duplicateNode,
    removeNode,
    moveUp,
    moveDown,
  } = useEditorStore();

  const [activeTab, setActiveTab] = useState('layers'); // 'layers' | 'pages' | 'assets'

  const handleSelect = (id) => {
    setSelectedNodeId(id);
    const canvasElem = document.querySelector(`[data-node-id="${id}"]`);
    if (canvasElem) {
      canvasElem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  return (
    <aside className="w-64 border-r border-white/10 bg-[#0e0e12]/90 backdrop-blur-2xl flex flex-col shrink-0 z-10 select-none">
      {/* 3-Tab Header Switcher */}
      <div className="p-2 border-b border-white/10 bg-[#111114] grid grid-cols-3 gap-1">
        <button
          type="button"
          onClick={() => setActiveTab('layers')}
          className={`py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeTab === 'layers'
              ? 'bg-white/15 text-white shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
          }`}
        >
          <Layers className="w-3 h-3" />
          <span>Layers</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('pages')}
          className={`py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeTab === 'pages'
              ? 'bg-white/15 text-white shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
          }`}
        >
          <FileText className="w-3 h-3" />
          <span>Pages</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('assets')}
          className={`py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeTab === 'assets'
              ? 'bg-white/15 text-white shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
          }`}
        >
          <ImageIcon className="w-3 h-3" />
          <span>Assets</span>
        </button>
      </div>

      {/* Panel Content based on Tab */}
      {activeTab === 'pages' && <PagesPanel />}
      {activeTab === 'assets' && <AssetsPanel />}
      {activeTab === 'layers' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="p-3 border-b border-white/5 flex items-center justify-between text-[11px] text-zinc-400">
            <span>Element Hierarchy</span>
            <span className="font-mono text-[10px] text-zinc-500">AST Map</span>
          </div>
          <div className="p-2 overflow-y-auto flex-1">
            {activePage?.root ? (
              <LayerRow
                node={activePage.root}
                selectedId={selectedNodeId}
                onSelect={handleSelect}
                onRename={renameNode}
                onDuplicate={duplicateNode}
                onDelete={removeNode}
                onMoveUp={moveUp}
                onMoveDown={moveDown}
                isRoot={true}
              />
            ) : (
              <p className="text-xs text-zinc-500 p-2">No root layer found.</p>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}
