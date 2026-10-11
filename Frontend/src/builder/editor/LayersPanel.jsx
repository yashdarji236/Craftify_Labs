import React, { useState, useEffect, useRef } from 'react';
import { useEditorStore } from '../store/editorContext.jsx';
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
} from 'lucide-react';

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

  const { moveNode } = useEditorStore();

  const isSelected = selectedId === node.id;
  const hasChildren = Array.isArray(node.children) && node.children.length > 0;
  const Icon = PALETTE_ICONS[node.type] || Box;

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
      const raw = e.dataTransfer.getData('application/json');
      if (!raw) return;
      const data = JSON.parse(raw);
      if (data.source === 'layer' && data.targetId) {
        if (data.targetId !== node.id) {
          moveNode(data.targetId, node.id);
        }
      }
    } catch { }
  };

  return (
    <div className="select-none text-xs">
      <div
        id={`layer-${node.id}`}
        draggable={!isRoot}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(node.id);
        }}
        style={{ paddingLeft: `${depth * 14 + 8}px` }}
        className={`group relative flex items-center gap-1.5 py-1.5 pr-2 rounded-xl cursor-pointer transition-all ${isSelected
          ? 'bg-white/15 text-white border border-white/20 shadow-sm'
          : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5 border border-transparent'
          }`}
      >
        {/* Expand / Collapse toggle */}
        {hasChildren ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setCollapsed(!collapsed);
            }}
            className="p-0.5 rounded hover:bg-white/10 text-zinc-500 hover:text-zinc-300 shrink-0"
          >
            {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        ) : (
          <span className="w-4 shrink-0 inline-block" />
        )}

        <Icon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white' : 'text-zinc-500'}`} />

        {/* Name / Inline Edit */}
        {isEditing ? (
          <div className="flex items-center gap-1 flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
            <input
              ref={editInputRef}
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onBlur={handleCommitRename}
              onKeyDown={handleKeyDown}
              className="w-full px-1.5 py-0.5 bg-black/80 border border-white/30 rounded text-xs text-white focus:outline-none"
            />
            <button
              type="button"
              onClick={handleCommitRename}
              className="p-0.5 hover:text-emerald-400"
            >
              <Check className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <span
            onDoubleClick={(e) => {
              e.stopPropagation();
              if (!isRoot) setIsEditing(true);
            }}
            className="font-medium truncate max-w-[110px] flex-1 text-left"
            title="Double click to rename"
          >
            {node.type === 'Heading' && (!node.name || node.name === 'Heading')
              ? `Heading (${(node.props?.level || 'h2').toUpperCase()})`
              : (node.name || node.type)}
          </span>
        )}

        {/* Hover Action Buttons */}
        {!isEditing && (
          <div
            className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 shrink-0 ml-auto transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            {!isRoot && (
              <>
                <button
                  type="button"
                  title="Move Up"
                  onClick={() => onMoveUp(node.id)}
                  className="p-1 rounded hover:bg-white/10 text-zinc-400 hover:text-white"
                >
                  <ArrowUp className="w-2.5 h-2.5" />
                </button>
                <button
                  type="button"
                  title="Move Down"
                  onClick={() => onMoveDown(node.id)}
                  className="p-1 rounded hover:bg-white/10 text-zinc-400 hover:text-white"
                >
                  <ArrowDown className="w-2.5 h-2.5" />
                </button>
                <button
                  type="button"
                  title="Duplicate"
                  onClick={() => onDuplicate(node.id)}
                  className="p-1 rounded hover:bg-white/10 text-zinc-400 hover:text-white"
                >
                  <Copy className="w-2.5 h-2.5" />
                </button>
                <button
                  type="button"
                  title="Delete"
                  onClick={() => onDelete(node.id)}
                  className="p-1 rounded hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400"
                >
                  <Trash2 className="w-2.5 h-2.5" />
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {hasChildren && !collapsed && (
        <div className="space-y-0.5 mt-0.5">
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

  const handleSelect = (id) => {
    setSelectedNodeId(id);
    // Scroll canvas element into view smoothly
    const canvasElem = document.querySelector(`[data-node-id="${id}"]`);
    if (canvasElem) {
      canvasElem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  return (
    <aside className="w-64 border-r border-white/10 bg-[#0e0e12]/90 backdrop-blur-2xl flex flex-col shrink-0 z-10 select-none">
      <div className="p-3.5 border-b border-white/10 flex items-center justify-between text-xs font-semibold text-zinc-200">
        <div className="flex items-center gap-2">
          <Layers className="w-3.5 h-3.5 text-zinc-300" />
          <span>Layers Tree</span>
        </div>
        <span className="text-[10px] font-mono text-zinc-500">AST Map</span>
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
    </aside>
  );
}
