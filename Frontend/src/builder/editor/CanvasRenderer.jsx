import React, { useState, useRef, useEffect, useCallback, useContext, memo } from 'react';
import { useEditorStore } from '../store/editorContext.jsx';
import {
  findParent,
  canNest,
  NODE_REGISTRY,
  HEADING_LEVEL_DEFAULTS,
  resolveStyles,
  resolveLinkTarget,
  BREAKPOINTS,
} from '../model/index.js';
import {
  ArrowUp,
  ArrowDown,
  Copy,
  Trash2,
  CornerLeftUp,
  GripVertical,
  Edit2,
  Check,
  Monitor,
  Tablet,
  Smartphone,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Grid as GridIcon,
  MousePointer,
  Hand,
  Maximize2,
  ChevronDown,
  Move,
  Image as ImageIcon,
  Plus,
  Square,
  Circle,
  Triangle,
  Star,
  ArrowUpRight,
} from 'lucide-react';

export function parseTranslate(transformStr) {
  if (!transformStr || typeof transformStr !== 'string') return { x: 0, y: 0 };
  const match = transformStr.match(/translate\(\s*(-?\d+(?:\.\d+)?)(?:px)?\s*,\s*(-?\d+(?:\.\d+)?)(?:px)?\s*\)/i);
  if (match) {
    return { x: parseFloat(match[1]) || 0, y: parseFloat(match[2]) || 0 };
  }
  return { x: 0, y: 0 };
}

export const DEFAULT_PAGE_HEIGHT = 800;

/**
 * Computes bounding boundaries so a moved component cannot escape the canvas artboard.
 */
export function computeCanvasBounds(nodeEl, currentTranslate, scale) {
  const canvasEl =
    nodeEl?.closest('[data-canvas-frame="true"]') ||
    document.querySelector('[data-canvas-frame="true"]') ||
    document.getElementById('craftify-artboard-frame');

  const safeScale = scale && scale > 0 ? scale : 1;

  if (!nodeEl || !canvasEl) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
  }

  const nodeRect = nodeEl.getBoundingClientRect();
  const canvasRect = canvasEl.getBoundingClientRect();

  const currentLeft = (nodeRect.left - canvasRect.left) / safeScale;
  const currentTop = (nodeRect.top - canvasRect.top) / safeScale;
  const nodeWidth = nodeRect.width / safeScale;
  const nodeHeight = nodeRect.height / safeScale;
  const canvasWidth = canvasRect.width / safeScale;
  const canvasHeight = Math.max(canvasRect.height / safeScale, canvasEl.offsetHeight || DEFAULT_PAGE_HEIGHT);

  const baseLeft = currentLeft - (currentTranslate?.x || 0);
  const baseTop = currentTop - (currentTranslate?.y || 0);

  // Clamping boundaries so the component cannot exit the canvas boundaries
  const minX = -baseLeft;
  const maxX = Math.max(minX, canvasWidth - nodeWidth - baseLeft);
  const minY = -baseTop;
  const maxY = Math.max(minY, Math.max(canvasHeight, 10000) - nodeHeight - baseTop);

  return {
    minX: Math.min(minX, maxX),
    maxX: Math.max(minX, maxX),
    minY: Math.min(minY, maxY),
    maxY: Math.max(minY, maxY),
  };
}

export const SHAPE_OPTIONS = [
  {
    id: 'Rectangle',
    label: 'Rectangle',
    shortcut: 'R',
    nodeType: 'Container',
    createOverrides: {
      name: 'Rectangle',
      styles: {
        width: '240px',
        height: '160px',
        backgroundColor: '#3b82f6',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      },
    },
  },
  {
    id: 'Line',
    label: 'Line',
    shortcut: 'L',
    nodeType: 'Container',
    createOverrides: {
      name: 'Line',
      styles: {
        width: '240px',
        height: '2px',
        backgroundColor: '#ffffff',
        display: 'flex',
        alignItems: 'center',
      },
    },
  },
  {
    id: 'Arrow',
    label: 'Arrow',
    shortcut: 'Shift+L',
    nodeType: 'Container',
    createOverrides: {
      name: 'Arrow',
      styles: {
        width: '200px',
        height: '32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        backgroundColor: 'transparent',
      },
    },
  },
  {
    id: 'Ellipse',
    label: 'Ellipse',
    shortcut: 'O',
    nodeType: 'Container',
    createOverrides: {
      name: 'Ellipse',
      styles: {
        width: '160px',
        height: '160px',
        borderRadius: '9999px',
        backgroundColor: '#8b5cf6',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      },
    },
  },
  {
    id: 'Polygon',
    label: 'Polygon',
    shortcut: '',
    nodeType: 'Container',
    createOverrides: {
      name: 'Polygon',
      styles: {
        width: '160px',
        height: '160px',
        clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
        backgroundColor: '#f59e0b',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      },
    },
  },
  {
    id: 'Star',
    label: 'Star',
    shortcut: '',
    nodeType: 'Container',
    createOverrides: {
      name: 'Star',
      styles: {
        width: '160px',
        height: '160px',
        clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
        backgroundColor: '#ec4899',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      },
    },
  },
  {
    id: 'Image',
    label: 'Image/video...',
    shortcut: 'Ctrl+Shift+K',
    nodeType: 'Container',
    createOverrides: {
      name: 'Image',
      styles: {
        width: '280px',
        height: '180px',
        borderRadius: '12px',
        backgroundImage: "url('/img2.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundColor: '#1f2937',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      },
    },
  },
];

export function renderShapeIcon(id, className = 'w-3.5 h-3.5') {
  switch (id) {
    case 'Rectangle':
      return <div className="w-3.5 h-3.5 border-2 border-current rounded-sm" />;
    case 'Line':
      return (
        <div className="w-3.5 h-3.5 relative flex items-center justify-center">
          <div className="w-3.5 h-[2px] bg-current -rotate-45" />
        </div>
      );
    case 'Arrow':
      return <ArrowUpRight className={className} />;
    case 'Ellipse':
      return <div className="w-3.5 h-3.5 border-2 border-current rounded-full" />;
    case 'Polygon':
      return <Triangle className={className} />;
    case 'Star':
      return <Star className={className} />;
    case 'Image':
      return <ImageIcon className={className} />;
    default:
      return <div className="w-3.5 h-3.5 border-2 border-current rounded-sm" />;
  }
}

const CanvasContext = React.createContext({
  zoom: 100,
  tool: 'select',
});

/**
 * Floating Action Bar displayed above/at top of selected node.
 * Entirely overlay UI; never becomes part of the document AST.
 */
function FloatingActionBar({ node, isRoot, onMoveStart }) {
  const {
    activePage,
    setSelectedNodeId,
    moveUp,
    moveDown,
    duplicateNode,
    removeNode,
    updateStyles,
  } = useEditorStore();

  const handleSelectParent = (e) => {
    e.stopPropagation();
    if (!activePage?.root) return;
    const loc = findParent(activePage.root, node.id);
    if (loc?.parent) {
      setSelectedNodeId(loc.parent.id);
    }
  };

  const currentTranslate = parseTranslate(node.styles?.transform);
  const hasCustomPosition = currentTranslate.x !== 0 || currentTranslate.y !== 0;

  const handleResetPosition = (e) => {
    e.stopPropagation();
    updateStyles(node.id, { transform: 'translate(0px, 0px)' });
  };

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className={`absolute ${currentTranslate.y < 36 ? 'top-1' : '-top-8'} left-1 z-40 flex items-center gap-1 px-2 py-1 rounded-lg bg-[#111114] border border-white/20 shadow-xl text-white select-none text-xs`}
    >
      {!isRoot && (
        <div
          onMouseDown={onMoveStart}
          title="Click & drag to move component on canvas"
          className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-mono font-bold cursor-move active:cursor-grabbing mr-1 shadow-sm select-none"
        >
          <Move className="w-3 h-3" />
          <span>Move</span>
        </div>
      )}

      <span className="font-mono text-[10px] text-zinc-300 font-bold uppercase mr-1">
        {node.type === 'Heading' ? `HEADING (${(node.props?.level || 'h2').toUpperCase()})` : node.type}
      </span>

      {!isRoot && (
        <>
          {hasCustomPosition && (
            <button
              type="button"
              title="Reset position offset to (0, 0)"
              onClick={handleResetPosition}
              className="p-1 rounded hover:bg-white/15 text-indigo-300 hover:text-white"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          )}
          <button
            type="button"
            title="Select parent container"
            onClick={handleSelectParent}
            className="p-1 rounded hover:bg-white/15 text-zinc-300 hover:text-white"
          >
            <CornerLeftUp className="w-3 h-3" />
          </button>
          <button
            type="button"
            title="Move Up (Alt + Up)"
            onClick={() => moveUp(node.id)}
            className="p-1 rounded hover:bg-white/15 text-zinc-300 hover:text-white"
          >
            <ArrowUp className="w-3 h-3" />
          </button>
          <button
            type="button"
            title="Move Down (Alt + Down)"
            onClick={() => moveDown(node.id)}
            className="p-1 rounded hover:bg-white/15 text-zinc-300 hover:text-white"
          >
            <ArrowDown className="w-3 h-3" />
          </button>
          <button
            type="button"
            title="Make width same as page (100%)"
            onClick={(e) => {
              e.stopPropagation();
              updateStyles(node.id, {
                width: '100%',
                maxWidth: '100%',
                left: node.styles?.position === 'absolute' ? '0px' : undefined,
                transform: 'translate(0px, 0px)',
              });
            }}
            className="px-1.5 py-0.5 rounded hover:bg-white/15 text-zinc-300 hover:text-white font-mono text-[9px] cursor-pointer"
          >
            Page Width
          </button>
          <button
            type="button"
            title="Make height same as page (100%)"
            onClick={(e) => {
              e.stopPropagation();
              updateStyles(node.id, {
                height: '100%',
                top: node.styles?.position === 'absolute' ? '0px' : undefined,
                transform: 'translate(0px, 0px)',
              });
            }}
            className="px-1.5 py-0.5 rounded hover:bg-white/15 text-zinc-300 hover:text-white font-mono text-[9px] cursor-pointer"
          >
            Page Height
          </button>
          <button
            type="button"
            title={`Set to default height (${isRoot ? DEFAULT_PAGE_HEIGHT + 'px' : 'auto'})`}
            onClick={(e) => {
              e.stopPropagation();
              if (isRoot) {
                updateStyles(node.id, { minHeight: `${DEFAULT_PAGE_HEIGHT}px`, height: undefined });
              } else {
                updateStyles(node.id, { height: 'auto' });
              }
            }}
            className="px-1.5 py-0.5 rounded hover:bg-white/15 text-zinc-300 hover:text-white font-mono text-[9px] cursor-pointer"
          >
            Default Height
          </button>
          <button
            type="button"
            title="Duplicate (Ctrl+D)"
            onClick={() => duplicateNode(node.id)}
            className="p-1 rounded hover:bg-white/15 text-zinc-300 hover:text-white"
          >
            <Copy className="w-3 h-3" />
          </button>
          <button
            type="button"
            title="Delete (Delete)"
            onClick={() => removeNode(node.id)}
            className="p-1 rounded hover:bg-rose-500/20 text-zinc-300 hover:text-rose-400"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </>
      )}
    </div>
  );
}

/**
 * Interactive Selection Border with 8 Resize Handles and Drag-to-Move Grip.
 * Rendered on top of the selected component on the canvas.
 */
function SelectionResizeBox({ onResizeStart, isResizing, resizingSize, onMoveStart, isMoving, movingPos }) {
  const handles = [
    { dir: 'nw', cursor: 'nwse-resize', style: 'top-0 left-0 -translate-x-1/2 -translate-y-1/2' },
    { dir: 'n', cursor: 'ns-resize', style: 'top-0 left-1/2 -translate-x-1/2 -translate-y-1/2' },
    { dir: 'ne', cursor: 'nesw-resize', style: 'top-0 right-0 translate-x-1/2 -translate-y-1/2' },
    { dir: 'e', cursor: 'ew-resize', style: 'top-1/2 right-0 translate-x-1/2 -translate-y-1/2' },
    { dir: 'se', cursor: 'nwse-resize', style: 'bottom-0 right-0 translate-x-1/2 translate-y-1/2' },
    { dir: 's', cursor: 'ns-resize', style: 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2' },
    { dir: 'sw', cursor: 'nesw-resize', style: 'bottom-0 left-0 -translate-x-1/2 translate-y-1/2' },
    { dir: 'w', cursor: 'ew-resize', style: 'top-1/2 left-0 -translate-x-1/2 -translate-y-1/2' },
  ];

  return (
    <span
      onClick={(e) => e.stopPropagation()}
      className="block absolute inset-0 pointer-events-none z-30 select-none"
    >
      {/* High-visibility Electric Indigo Selection Border */}
      <span className="block absolute inset-0 border-2 border-indigo-500 rounded-[inherit] shadow-[0_0_14px_rgba(99,102,241,0.4)] pointer-events-none" />

      {/* Move Grip Pill at Top-Right of Component */}
      <span
        onMouseDown={onMoveStart}
        title="Click & drag to move component on canvas"
        className="pointer-events-auto block absolute -top-7 right-0 z-40 px-2 py-0.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-mono font-bold cursor-move active:cursor-grabbing shadow-lg select-none transition-colors"
      >
        <span className="flex items-center gap-1">
          <Move className="w-3 h-3" />
          <span>Move</span>
        </span>
      </span>

      {/* Live Dimension Badge while Resizing */}
      {isResizing && resizingSize && (
        <span className="pointer-events-none block absolute -bottom-7 left-1/2 -translate-x-1/2 z-40 px-2.5 py-0.5 rounded-md bg-zinc-950/95 border border-indigo-500 text-indigo-200 text-[10px] font-mono shadow-2xl select-none whitespace-nowrap font-bold">
          {resizingSize.width} &times; {resizingSize.height} px
        </span>
      )}

      {/* Live Position Badge while Moving */}
      {isMoving && movingPos && (
        <span className="pointer-events-none block absolute -bottom-7 left-1/2 -translate-x-1/2 z-40 px-2.5 py-0.5 rounded-md bg-zinc-950/95 border border-indigo-500 text-indigo-200 text-[10px] font-mono shadow-2xl select-none whitespace-nowrap font-bold">
          X: {movingPos.x > 0 ? `+${movingPos.x}` : movingPos.x}px, Y: {movingPos.y > 0 ? `+${movingPos.y}` : movingPos.y}px
        </span>
      )}

      {/* 8 Interactive Resize Handles */}
      {handles.map(({ dir, cursor, style }) => (
        <span
          key={dir}
          draggable={false}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onResizeStart(dir, e);
          }}
          style={{ cursor }}
          title={`Resize (${dir.toUpperCase()})`}
          className={`pointer-events-auto block absolute ${style} w-2.5 h-2.5 bg-white border border-indigo-600 rounded-[2px] shadow-[0_1px_4px_rgba(0,0,0,0.6)] hover:scale-150 hover:bg-indigo-200 transition-transform z-40`}
        />
      ))}
    </span>
  );
}

/**
 * Drop Zone Indicator rendered between elements or inside empty containers.
 */
function DropZoneIndicator({ parentId, index, active }) {
  const { addNode, moveNode } = useEditorStore();
  const [isOver, setIsOver] = useState(false);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOver(true);
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOver(false);
    try {
      const raw = e.dataTransfer.getData('application/json');
      if (!raw) return;
      const data = JSON.parse(raw);

      if (data.source === 'palette' && data.type) {
        addNode(data.type, parentId, index);
      } else if (data.source === 'canvas' && data.targetId) {
        moveNode(data.targetId, parentId, index);
      }
    } catch { }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`transition-all duration-150 relative ${isOver
          ? 'h-7 bg-indigo-500/25 border-2 border-dashed border-indigo-400 rounded-xl my-2 shadow-[0_0_20px_rgba(99,102,241,0.6)] flex items-center justify-center text-[10px] font-mono font-bold text-indigo-200 uppercase tracking-wider'
          : 'h-2 hover:h-6 opacity-0 hover:opacity-100 bg-indigo-500/10 hover:border-2 hover:border-dashed hover:border-indigo-400 rounded-lg my-0.5 flex items-center justify-center text-[9px] font-mono font-semibold text-zinc-400'
        }`}
    >
      <span>Drop Here</span>
    </div>
  );
}

/**
 * Individual Node Renderer for the Canvas (Memoized).
 */
const InteractiveNode = memo(function InteractiveNode({ node, isRoot = false, pageId = null }) {
  const {
    activePage,
    setActivePage,
    selectedNodeId,
    setSelectedNodeId,
    hoveredNodeId,
    setHoveredNodeId,
    updateProps,
    updateStyles,
    moveNode,
    addNode,
    activeBreakpoint,
    project,
    getAssetBlobUrl,
  } = useEditorStore();

  const { zoom, tool } = useContext(CanvasContext);
  const resolvedStyle = resolveStyles(node, activeBreakpoint);

  const [isInlineEditing, setIsInlineEditing] = useState(false);
  const [inlineValue, setInlineValue] = useState('');
  const inlineInputRef = useRef(null);
  const nodeRef = useRef(null);

  const [resizingInfo, setResizingInfo] = useState(null);
  const [liveSize, setLiveSize] = useState(null);
  const [liveTranslate, setLiveTranslate] = useState(null);
  const [isMoving, setIsMoving] = useState(false);

  const isSelected = selectedNodeId === node.id;
  const isHovered = hoveredNodeId === node.id && !isSelected;
  const isResizing = Boolean(resizingInfo);

  // Resize handler for handles with zoom-scale compensation & page snapping & auto-expanding page
  const handleResizeStart = (dir, e) => {
    if (!nodeRef.current) return;
    const rect = nodeRef.current.getBoundingClientRect();
    const scale = (zoom || 100) / 100;
    const startW = rect.width / scale;
    const startH = rect.height / scale;
    const startX = e.clientX;
    const startY = e.clientY;

    const canvasEl =
      nodeRef.current?.closest('[data-canvas-frame="true"]') ||
      document.querySelector('[data-canvas-frame="true"]');
    const artboardRect = canvasEl ? canvasEl.getBoundingClientRect() : null;
    const artboardW = artboardRect ? Math.round(artboardRect.width / scale) : null;
    const initialArtboardH = artboardRect ? Math.max(DEFAULT_PAGE_HEIGHT, Math.round(artboardRect.height / scale)) : DEFAULT_PAGE_HEIGHT;
    let latestPageH = initialArtboardH;
    const compTop = artboardRect ? Math.round((rect.top - artboardRect.top) / scale) : 0;

    setResizingInfo({ dir, startX, startY, startW, startH });
    setLiveSize({ width: Math.round(startW), height: Math.round(startH) });

    const handleMouseMove = (moveEvent) => {
      const deltaX = (moveEvent.clientX - startX) / scale;
      const deltaY = (moveEvent.clientY - startY) / scale;

      let newW = startW;
      let newH = startH;

      if (dir.includes('e')) newW = startW + deltaX;
      if (dir.includes('w')) newW = startW - deltaX;
      if (dir.includes('s')) newH = startH + deltaY;
      if (dir.includes('n')) newH = startH - deltaY;

      // Snap to full page width if close to artboard width
      if (artboardW && Math.abs(newW - artboardW) < 24) {
        newW = artboardW;
      }

      newW = Math.max(30, Math.round(newW));
      newH = Math.max(20, Math.round(newH));

      // Calculate component's bottom position relative to the artboard
      const compBottom = dir.includes('s')
        ? compTop + newH
        : Math.max(compTop + startH, compTop + newH);

      // When increasing vertical size is going to overlap with / exceed page bottom,
      // increase the size of the page vertically in real-time!
      if (compBottom + 32 > latestPageH) {
        const expandedH = Math.max(latestPageH, compBottom + 64);
        latestPageH = expandedH;
        if (canvasEl) {
          canvasEl.style.minHeight = `${expandedH}px`;
        }
      }

      setLiveSize({ width: newW, height: newH });
    };

    const handleMouseUp = (upEvent) => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);

      const deltaX = (upEvent.clientX - startX) / scale;
      const deltaY = (upEvent.clientY - startY) / scale;

      const styleUpdates = {};

      if (dir.includes('e') || dir.includes('w')) {
        let finalW = Math.max(30, Math.round(dir.includes('e') ? startW + deltaX : startW - deltaX));
        if (artboardW && Math.abs(finalW - artboardW) < 24) {
          finalW = artboardW;
          styleUpdates.width = '100%';
          styleUpdates.maxWidth = '100%';
          if (resolvedStyle.position === 'absolute') {
            styleUpdates.left = '0px';
          }
        } else {
          styleUpdates.width = `${finalW}px`;
        }
      }

      if (dir.includes('s') || dir.includes('n')) {
        let finalH = Math.max(20, Math.round(dir.includes('s') ? startH + deltaY : startH - deltaY));
        styleUpdates.height = `${finalH}px`;

        if (dir.includes('n') && resolvedStyle.position === 'absolute') {
          const startTop = parseInt(resolvedStyle.top, 10) || compTop;
          styleUpdates.top = `${Math.max(0, Math.round(startTop - deltaY))}px`;
        }
      }

      if (Object.keys(styleUpdates).length > 0) {
        updateStyles(node.id, styleUpdates);
      }

      // If page was expanded vertically, commit the new minHeight to the page root!
      if (latestPageH > initialArtboardH) {
        const targetPage = project?.pages?.find((p) => p.id === pageId) || activePage;
        if (targetPage?.root?.id) {
          updateStyles(targetPage.root.id, {
            minHeight: `${latestPageH}px`,
          });
        }
      }

      setResizingInfo(null);
      setLiveSize(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Move handler for free dragging on canvas
  const handleMoveStart = (e) => {
    if (tool === 'hand' || isRoot || isInlineEditing || isResizing) return;
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    if (pageId && activePage?.id !== pageId) {
      setActivePage(pageId);
    }

    const startX = e.clientX;
    const startY = e.clientY;
    const currentTranslate = parseTranslate(resolvedStyle?.transform || node.styles?.transform);
    const scale = (zoom || 100) / 100;
    const bounds = computeCanvasBounds(nodeRef.current, currentTranslate, scale);

    const canvasEl =
      nodeRef.current?.closest('[data-canvas-frame="true"]') ||
      document.querySelector('[data-canvas-frame="true"]');
    const artboardRect = canvasEl ? canvasEl.getBoundingClientRect() : null;
    const initialCanvasH = artboardRect ? Math.max(DEFAULT_PAGE_HEIGHT, Math.round(artboardRect.height / scale)) : DEFAULT_PAGE_HEIGHT;
    let latestCanvasH = initialCanvasH;

    let moved = false;

    setIsMoving(true);
    setLiveTranslate(currentTranslate);

    const onMouseMove = (moveEvent) => {
      const deltaX = (moveEvent.clientX - startX) / scale;
      const deltaY = (moveEvent.clientY - startY) / scale;

      if (!moved && (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2)) {
        moved = true;
      }

      const rawX = Math.round(currentTranslate.x + deltaX);
      const rawY = Math.round(currentTranslate.y + deltaY);

      // Check if moving down overlaps with or exceeds the bottom of the page
      if (nodeRef.current && canvasEl) {
        const nRect = nodeRef.current.getBoundingClientRect();
        const aRect = canvasEl.getBoundingClientRect();
        const compCurrentTop = (nRect.top - aRect.top) / scale;
        const compHeight = nRect.height / scale;
        const projectedBottom = compCurrentTop + (rawY - currentTranslate.y) + compHeight;

        if (projectedBottom + 32 > latestCanvasH) {
          const expandedH = Math.max(latestCanvasH, Math.round(projectedBottom + 64));
          latestCanvasH = expandedH;
          canvasEl.style.minHeight = `${expandedH}px`;
        }
      }

      const clampedX = Math.max(bounds.minX, Math.min(bounds.maxX, rawX));
      const clampedY = Math.max(bounds.minY, rawY);
      setLiveTranslate({ x: clampedX, y: clampedY });
    };

    const onMouseUp = (upEvent) => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);

      if (moved) {
        const deltaX = (upEvent.clientX - startX) / scale;
        const deltaY = (upEvent.clientY - startY) / scale;
        const rawX = Math.round(currentTranslate.x + deltaX);
        const rawY = Math.round(currentTranslate.y + deltaY);
        const finalX = Math.max(bounds.minX, Math.min(bounds.maxX, rawX));
        const finalY = Math.max(bounds.minY, rawY);

        updateStyles(node.id, {
          transform: `translate(${finalX}px, ${finalY}px)`,
        });

        if (latestCanvasH > initialCanvasH) {
          const targetPage = project?.pages?.find((p) => p.id === pageId) || activePage;
          if (targetPage?.root?.id) {
            updateStyles(targetPage.root.id, {
              minHeight: `${latestCanvasH}px`,
            });
          }
        }
      }

      setIsMoving(false);
      setLiveTranslate(null);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Node mousedown: if user drags the selected node itself, move it!
  const handleNodeMouseDown = (e) => {
    if (tool === 'hand' || tool === 'shape' || isRoot || isInlineEditing || isResizing) return;
    if (e.button !== 0) return;
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    if (pageId && activePage?.id !== pageId) {
      setActivePage(pageId);
    }

    const startX = e.clientX;
    const startY = e.clientY;
    const currentTranslate = parseTranslate(resolvedStyle?.transform || node.styles?.transform);
    const scale = (zoom || 100) / 100;
    const bounds = computeCanvasBounds(nodeRef.current, currentTranslate, scale);

    const canvasEl =
      nodeRef.current?.closest('[data-canvas-frame="true"]') ||
      document.querySelector('[data-canvas-frame="true"]');
    const artboardRect = canvasEl ? canvasEl.getBoundingClientRect() : null;
    const initialCanvasH = artboardRect ? Math.max(DEFAULT_PAGE_HEIGHT, Math.round(artboardRect.height / scale)) : DEFAULT_PAGE_HEIGHT;
    let latestCanvasH = initialCanvasH;

    let isDragMoving = false;

    const onMouseMove = (moveEvent) => {
      const deltaX = (moveEvent.clientX - startX) / scale;
      const deltaY = (moveEvent.clientY - startY) / scale;

      if (!isDragMoving && (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2)) {
        isDragMoving = true;
        setIsMoving(true);
        setSelectedNodeId(node.id);
        moveEvent.preventDefault();
        window.getSelection()?.removeAllRanges();
      }

      if (isDragMoving) {
        moveEvent.preventDefault();
        const rawX = Math.round(currentTranslate.x + deltaX);
        const rawY = Math.round(currentTranslate.y + deltaY);

        // Expand canvas vertically if moving down overlaps with page bottom
        if (nodeRef.current && canvasEl) {
          const nRect = nodeRef.current.getBoundingClientRect();
          const aRect = canvasEl.getBoundingClientRect();
          const compCurrentTop = (nRect.top - aRect.top) / scale;
          const compHeight = nRect.height / scale;
          const projectedBottom = compCurrentTop + (rawY - currentTranslate.y) + compHeight;

          if (projectedBottom + 32 > latestCanvasH) {
            const expandedH = Math.max(latestCanvasH, Math.round(projectedBottom + 64));
            latestCanvasH = expandedH;
            canvasEl.style.minHeight = `${expandedH}px`;
          }
        }

        const clampedX = Math.max(bounds.minX, Math.min(bounds.maxX, rawX));
        const clampedY = Math.max(bounds.minY, rawY);
        setLiveTranslate({ x: clampedX, y: clampedY });
      }
    };

    const onMouseUp = (upEvent) => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);

      if (isDragMoving) {
        const deltaX = (upEvent.clientX - startX) / scale;
        const deltaY = (upEvent.clientY - startY) / scale;
        const rawX = Math.round(currentTranslate.x + deltaX);
        const rawY = Math.round(currentTranslate.y + deltaY);
        const finalX = Math.max(bounds.minX, Math.min(bounds.maxX, rawX));
        const finalY = Math.max(bounds.minY, rawY);

        updateStyles(node.id, {
          transform: `translate(${finalX}px, ${finalY}px)`,
        });

        if (latestCanvasH > initialCanvasH) {
          const targetPage = project?.pages?.find((p) => p.id === pageId) || activePage;
          if (targetPage?.root?.id) {
            updateStyles(targetPage.root.id, {
              minHeight: `${latestCanvasH}px`,
            });
          }
        }

        setIsMoving(false);
        setLiveTranslate(null);
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Text content extraction for editable elements
  const isTextEditable = ['Heading', 'Text', 'Button', 'Link'].includes(node.type);

  useEffect(() => {
    if (node.type === 'Heading') {
      setInlineValue(String(node.props?.text ?? ''));
    } else if (node.type === 'Text') {
      setInlineValue(String(node.props?.content ?? ''));
    } else if (node.type === 'Button') {
      setInlineValue(String(node.props?.label ?? ''));
    } else if (node.type === 'Link') {
      setInlineValue(String(node.props?.text ?? ''));
    }
  }, [node.props, node.type]);

  useEffect(() => {
    if (isInlineEditing && inlineInputRef.current) {
      inlineInputRef.current.focus();
      inlineInputRef.current.select();
    }
  }, [isInlineEditing]);

  const handleCommitInlineEdit = () => {
    setIsInlineEditing(false);
    if (node.type === 'Heading') {
      updateProps(node.id, { text: inlineValue });
    } else if (node.type === 'Text') {
      updateProps(node.id, { content: inlineValue });
    } else if (node.type === 'Button') {
      updateProps(node.id, { label: inlineValue });
    } else if (node.type === 'Link') {
      updateProps(node.id, { text: inlineValue });
    }
  };

  const handleInlineKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (node.type === 'Text' && e.shiftKey) {
        return;
      }
      e.preventDefault();
      handleCommitInlineEdit();
    } else if (e.key === 'Escape') {
      setIsInlineEditing(false);
    }
  };

  const handleClick = (e) => {
    e.stopPropagation();
    if (tool === 'shape') {
      return;
    }
    if (pageId && activePage?.id !== pageId) {
      setActivePage(pageId);
    }
    setSelectedNodeId(node.id);
  };

  const handleDoubleClick = (e) => {
    e.stopPropagation();
    if (isTextEditable) {
      setIsInlineEditing(true);
    }
  };

  // Responsive visibility
  const isHiddenOnBreakpoint = resolvedStyle.display === 'none';

  const baseTranslate = parseTranslate(resolvedStyle.transform);
  const currentTranslate = liveTranslate || (resolvedStyle.transform ? baseTranslate : null);

  const isTextElement = ['Heading', 'Text', 'Button', 'Link'].includes(node.type);

  const activeStyle = {
    boxSizing: 'border-box',
    overflowWrap: 'anywhere',
    ...(isTextElement
      ? {
          width: resolvedStyle.width || 'fit-content',
          maxWidth: resolvedStyle.maxWidth || '100%',
          display: resolvedStyle.display || 'inline-block',
          userSelect: isInlineEditing ? 'text' : 'none',
          WebkitUserSelect: isInlineEditing ? 'text' : 'none',
        }
      : {}),
    ...resolvedStyle,
    ...(currentTranslate ? { transform: `translate(${currentTranslate.x}px, ${currentTranslate.y}px)` } : {}),
    ...(liveSize && (resizingInfo?.dir?.includes('e') || resizingInfo?.dir?.includes('w'))
      ? { width: `${liveSize.width}px` }
      : {}),
    ...(liveSize && (resizingInfo?.dir?.includes('s') || resizingInfo?.dir?.includes('n'))
      ? { height: `${liveSize.height}px` }
      : {}),
  };

  // If element is hidden on this breakpoint and not selected, hide from canvas
  if (isHiddenOnBreakpoint && !isSelected) {
    return null;
  }

  // Render children recursively with drop zones between them
  const isContainerNode = NODE_REGISTRY[node.type]?.isContainer;
  const childrenWithDropZones = Array.isArray(node.children)
    ? node.children.map((child, idx) => (
      <React.Fragment key={child.id}>
        <DropZoneIndicator parentId={node.id} index={idx} />
        <InteractiveNode node={child} pageId={pageId} />
        {idx === node.children.length - 1 && (
          <DropZoneIndicator parentId={node.id} index={idx + 1} />
        )}
      </React.Fragment>
    ))
    : null;

  // Empty container placeholder
  const isShapeContainer =
    Boolean(node.name && ['Rectangle', 'Ellipse', 'Polygon', 'Star', 'Arrow', 'Line', 'Image'].includes(node.name)) ||
    Boolean(node.styles?.clipPath);

  const renderEmptyContainer =
    isContainerNode && !isShapeContainer && (!node.children || node.children.length === 0);

  // Outline class states
  const outlineClasses = isSelected
    ? 'relative ring-0'
    : isHovered
      ? 'outline-dashed outline-1 outline-white/50 relative'
      : 'relative';

  const cursorClass =
    tool === 'shape'
      ? 'cursor-crosshair'
      : isSelected && !isRoot && !isInlineEditing
        ? 'cursor-move'
        : '';
  const animClasses = isResizing || isMoving ? 'relative' : `transition-all ${outlineClasses} ${cursorClass}`;

  const commonProps = {
    ref: nodeRef,
    'data-node-id': node.id,
    onMouseDown: handleNodeMouseDown,
    onClick: tool === 'hand' ? undefined : handleClick,
    onDoubleClick: tool === 'hand' ? undefined : handleDoubleClick,
    onMouseEnter: (e) => {
      if (tool === 'hand') return;
      e.stopPropagation();
      setHoveredNodeId(node.id);
    },
    onMouseLeave: (e) => {
      e.stopPropagation();
      setHoveredNodeId(null);
    },
    style: activeStyle,
  };

  // Renders FloatingActionBar and SelectionResizeBox overlays for selected element
  const renderSelectionOverlays = () => {
    if (!isSelected || isRoot) return null;
    return (
      <>
        <FloatingActionBar
          node={node}
          isRoot={false}
          onMoveStart={handleMoveStart}
        />
        <SelectionResizeBox
          node={node}
          onResizeStart={handleResizeStart}
          isResizing={isResizing}
          resizingSize={liveSize}
          onMoveStart={handleMoveStart}
          isMoving={isMoving}
          movingPos={liveTranslate}
        />
      </>
    );
  };

  // Render element based on type
  switch (node.type) {
    case 'Page':
      return (
        <div
          {...commonProps}
          style={{
            ...activeStyle,
            minHeight: activeStyle?.minHeight && activeStyle.minHeight !== '100vh'
              ? activeStyle.minHeight
              : '100%',
          }}
          className={`w-full transition-all ${outlineClasses} relative overflow-hidden`}
        >
          {isSelected && <FloatingActionBar node={node} isRoot={true} />}
          {renderEmptyContainer ? (
            <div className="p-12 text-center text-zinc-500 text-xs border border-dashed border-white/10 rounded-2xl m-6">
              Drop components or click from the palette to start building.
              <DropZoneIndicator parentId={node.id} index={0} />
            </div>
          ) : (
            childrenWithDropZones
          )}
        </div>
      );

    case 'Section':
      return (
        <section {...commonProps} className={animClasses}>
          {renderSelectionOverlays()}
          {renderEmptyContainer ? (
            <div className="p-8 text-center text-zinc-500 text-xs border border-dashed border-white/10 rounded-xl">
              Empty Section. Add containers or content blocks.
              <DropZoneIndicator parentId={node.id} index={0} />
            </div>
          ) : (
            childrenWithDropZones
          )}
        </section>
      );

    case 'Container':
      return (
        <div {...commonProps} className={animClasses}>
          {renderSelectionOverlays()}
          {node.name === 'Arrow' && (!node.children || node.children.length === 0) && (
            <div className="w-full h-full flex items-center justify-center text-white pointer-events-none p-1">
              <svg className="w-full h-full min-h-[20px]" viewBox="0 0 100 24" fill="none" preserveAspectRatio="none">
                <line x1="0" y1="12" x2="86" y2="12" stroke="currentColor" strokeWidth="3" />
                <polygon points="84,4 100,12 84,20" fill="currentColor" />
              </svg>
            </div>
          )}
          {renderEmptyContainer ? (
            <div className="p-4 border border-dashed border-white/10 rounded-lg min-h-[48px] flex items-center justify-center">
              <DropZoneIndicator parentId={node.id} index={0} />
            </div>
          ) : (
            childrenWithDropZones
          )}
        </div>
      );

    case 'Grid':
      return (
        <div {...commonProps} className={animClasses}>
          {renderSelectionOverlays()}
          {renderEmptyContainer ? (
            <div className="p-6 text-center text-zinc-500 text-xs border border-dashed border-white/10 rounded-lg">
              Empty Grid. Add container columns.
              <DropZoneIndicator parentId={node.id} index={0} />
            </div>
          ) : (
            childrenWithDropZones
          )}
        </div>
      );

    case 'Heading': {
      const level = (node.props?.level || 'h2').toLowerCase();
      const HeadingTag = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(level) ? level : 'h2';
      const levelDefaults = HEADING_LEVEL_DEFAULTS[HeadingTag] || HEADING_LEVEL_DEFAULTS.h2;
      const headingStyles = {
        ...levelDefaults,
        ...activeStyle,
      };

      if (isInlineEditing) {
        return (
          <div className="relative">
            <input
              ref={inlineInputRef}
              type="text"
              value={inlineValue}
              onChange={(e) => setInlineValue(e.target.value)}
              onBlur={handleCommitInlineEdit}
              onKeyDown={handleInlineKeyDown}
              style={headingStyles}
              className="bg-black/90 border border-white/50 text-white px-2 py-1 rounded w-full focus:outline-none"
            />
          </div>
        );
      }

      return (
        <HeadingTag
          {...commonProps}
          style={headingStyles}
          className={`${animClasses} select-none`}
        >
          {renderSelectionOverlays()}
          {String(node.props?.text ?? 'Heading')}
        </HeadingTag>
      );
    }

    case 'Text': {
      if (isInlineEditing) {
        return (
          <div className="relative">
            <textarea
              ref={inlineInputRef}
              rows={3}
              value={inlineValue}
              onChange={(e) => setInlineValue(e.target.value)}
              onBlur={handleCommitInlineEdit}
              onKeyDown={handleInlineKeyDown}
              style={activeStyle}
              className="bg-black/90 border border-white/50 text-white px-2 py-1 rounded w-full focus:outline-none"
            />
          </div>
        );
      }

      return (
        <p {...commonProps} className={`${animClasses} select-none`}>
          {renderSelectionOverlays()}
          {String(node.props?.content ?? '')}
        </p>
      );
    }

    case 'Image': {
      const assetUrl = node.props?.assetId ? getAssetBlobUrl(node.props.assetId) : node.props?.src;
      const isDecorative = Boolean(node.props?.isDecorative);
      const altText = isDecorative ? '' : (node.props?.alt || 'Visual asset');

      return (
        <div {...commonProps} className={animClasses}>
          {renderSelectionOverlays()}
          {assetUrl ? (
            <img
              src={assetUrl}
              alt={altText}
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                if (e.currentTarget.nextSibling) {
                  e.currentTarget.nextSibling.style.display = 'flex';
                }
              }}
              style={{ width: '100%', height: '100%', objectFit: 'cover', maxWidth: '100%' }}
              className="block rounded-[inherit]"
            />
          ) : null}
          <div
            style={{ display: assetUrl ? 'none' : 'flex' }}
            className="w-full h-full min-h-[140px] bg-[#18181c] border border-dashed border-white/20 rounded-[inherit] flex flex-col items-center justify-center p-4 text-center text-zinc-400 select-none"
          >
            <ImageIcon className="w-6 h-6 text-zinc-500 mb-1" />
            <span className="text-[11px] font-medium text-zinc-300">
              {node.props?.assetId ? 'Missing or Loading Asset' : 'Image Placeholder'}
            </span>
            <span className="text-[9px] font-mono text-zinc-500 mt-0.5">
              {node.props?.assetId ? `Asset ID: ${node.props.assetId}` : 'No image source assigned'}
            </span>
          </div>
        </div>
      );
    }

    case 'Button': {
      const linkTarget = node.props?.linkTarget;
      const resolvedHref = linkTarget && linkTarget.type !== 'none'
        ? resolveLinkTarget(linkTarget, project?.pages || [])
        : node.props?.href || '#';
      const isNewTab = linkTarget?.newTab || node.props?.target === '_blank';

      if (isInlineEditing) {
        return (
          <input
            ref={inlineInputRef}
            type="text"
            value={inlineValue}
            onChange={(e) => setInlineValue(e.target.value)}
            onBlur={handleCommitInlineEdit}
            onKeyDown={handleInlineKeyDown}
            style={activeStyle}
            className="bg-black/90 border border-white/50 text-white px-3 py-2 rounded focus:outline-none"
          />
        );
      }

      return (
        <a
          href={resolvedHref}
          target={isNewTab ? '_blank' : '_self'}
          rel={isNewTab ? 'noopener noreferrer' : undefined}
          {...commonProps}
          className={`inline-block text-center cursor-pointer ${animClasses}`}
        >
          {renderSelectionOverlays()}
          {String(node.props?.label ?? 'Click Me')}
        </a>
      );
    }

    case 'Link': {
      const linkTarget = node.props?.linkTarget;
      const resolvedHref = linkTarget && linkTarget.type !== 'none'
        ? resolveLinkTarget(linkTarget, project?.pages || [])
        : node.props?.href || '#';
      const isNewTab = linkTarget?.newTab || node.props?.target === '_blank';

      if (isInlineEditing) {
        return (
          <input
            ref={inlineInputRef}
            type="text"
            value={inlineValue}
            onChange={(e) => setInlineValue(e.target.value)}
            onBlur={handleCommitInlineEdit}
            onKeyDown={handleInlineKeyDown}
            style={activeStyle}
            className="bg-black/90 border border-white/50 text-white px-2 py-0.5 rounded focus:outline-none"
          />
        );
      }

      return (
        <a
          href={resolvedHref}
          target={isNewTab ? '_blank' : '_self'}
          rel={isNewTab ? 'noopener noreferrer' : undefined}
          {...commonProps}
          style={{ display: 'inline-block', ...activeStyle }}
          className={`cursor-pointer ${animClasses}`}
        >
          {renderSelectionOverlays()}
          {String(node.props?.text ?? 'Link text')}
        </a>
      );
    }

    case 'Spacer':
      return (
        <div {...commonProps} className={animClasses}>
          {renderSelectionOverlays()}
          <div className="w-full h-full border border-dashed border-white/10 flex items-center justify-center text-[9px] font-mono text-zinc-600">
            Spacer ({node.styles?.height || node.props?.height || '32px'})
          </div>
        </div>
      );

    case 'Divider':
      return (
        <div {...commonProps} className={animClasses}>
          {renderSelectionOverlays()}
          <hr style={{ width: '100%', borderColor: 'inherit' }} />
        </div>
      );

    default:
      return (
        <div {...commonProps} className={`p-3 border border-zinc-700 text-zinc-400 text-xs ${animClasses}`}>
          {renderSelectionOverlays()}
          {node.type}
        </div>
      );
  }
});

export default function CanvasRenderer() {
  const {
    project,
    activePage,
    setActivePage,
    selectedNodeId,
    setSelectedNodeId,
    activeBreakpoint,
    setActiveBreakpoint,
    addNode,
    updateStyles,
    createPage,
    duplicatePage,
    deletePage,
  } = useEditorStore();

  const pagesToRender =
    project?.pages && project.pages.length > 0
      ? project.pages
      : activePage
        ? [activePage]
        : [];

  const containerRef = useRef(null);
  const zoomMenuRef = useRef(null);

  const [zoom, setZoom] = useState(100);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [tool, setTool] = useState('select'); // 'select' | 'hand' | 'shape'
  const [activeShape, setActiveShape] = useState('Rectangle');
  const [showShapeMenu, setShowShapeMenu] = useState(false);
  const shapeMenuRef = useRef(null);
  const [showTextMenu, setShowTextMenu] = useState(false);
  const textMenuRef = useRef(null);
  const [showGrid, setShowGrid] = useState(true);
  const [showZoomMenu, setShowZoomMenu] = useState(false);
  const [showNavHint, setShowNavHint] = useState(false);

  const [drawingShape, setDrawingShape] = useState(null);

  const activeShapeConfig =
    SHAPE_OPTIONS.find((s) => s.id === activeShape) || SHAPE_OPTIONS[0];

  const handleStartDrawShape = useCallback(
    (e, pageId) => {
      if (tool !== 'shape' || e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();

      const artboardEl = e.currentTarget.closest('[data-canvas-frame="true"]') || e.currentTarget;
      const artboardRect = artboardEl.getBoundingClientRect();
      const scale = (zoom || 100) / 100;

      const artboardW = Math.round(artboardRect.width / scale);
      const artboardH = Math.max(DEFAULT_PAGE_HEIGHT, Math.round(artboardRect.height / scale));

      const rawStartX = Math.round((e.clientX - artboardRect.left) / scale);
      const rawStartY = Math.round((e.clientY - artboardRect.top) / scale);
      const startX = Math.max(0, Math.min(artboardW, rawStartX));
      const startY = Math.max(0, Math.min(artboardH, rawStartY));

      if (activePage?.id !== pageId) {
        setActivePage(pageId);
      }

      setDrawingShape({
        pageId,
        startX,
        startY,
        x: startX,
        y: startY,
        width: 0,
        height: 0,
      });

      let hasDragged = false;
      let latestBox = { x: startX, y: startY, width: 0, height: 0 };

      const onMouseMove = (moveEvent) => {
        const rawX = Math.round((moveEvent.clientX - artboardRect.left) / scale);
        const rawY = Math.round((moveEvent.clientY - artboardRect.top) / scale);
        const currentX = Math.max(0, Math.min(artboardW, rawX));
        const currentY = Math.max(0, Math.min(artboardH, rawY));

        const x = Math.min(startX, currentX);
        const y = Math.min(startY, currentY);
        const width = Math.abs(currentX - startX);
        const height = Math.abs(currentY - startY);

        if (width > 4 || height > 4) {
          hasDragged = true;
        }

        latestBox = { x, y, width, height };
        setDrawingShape({
          pageId,
          startX,
          startY,
          x,
          y,
          width,
          height,
        });
      };

      const onMouseUp = () => {
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
        setDrawingShape(null);

        const shapeConfig =
          SHAPE_OPTIONS.find((s) => s.id === activeShape) || SHAPE_OPTIONS[0];

        let finalW = 240;
        let finalH = 160;
        let finalX = startX;
        let finalY = startY;

        if (hasDragged && (latestBox.width >= 8 || latestBox.height >= 8)) {
          finalW = Math.max(20, latestBox.width);
          finalH = Math.max(activeShape === 'Line' ? 2 : 10, latestBox.height);
          finalX = latestBox.x;
          finalY = latestBox.y;
        } else {
          // Just clicked without dragging: use default dimensions centered at cursor
          if (shapeConfig.createOverrides.styles?.width) {
            finalW = parseInt(shapeConfig.createOverrides.styles.width, 10) || 240;
          }
          if (shapeConfig.createOverrides.styles?.height) {
            finalH = parseInt(shapeConfig.createOverrides.styles.height, 10) || 160;
          }
          finalX = Math.max(0, Math.min(artboardW - finalW, startX - Math.round(finalW / 2)));
          finalY = Math.max(0, Math.min(artboardH - finalH, startY - Math.round(finalH / 2)));
        }

        const overrides = {
          ...shapeConfig.createOverrides,
          styles: {
            ...shapeConfig.createOverrides.styles,
            position: 'absolute',
            left: `${finalX}px`,
            top: `${finalY}px`,
            width: `${finalW}px`,
            height: activeShape === 'Line' ? '2px' : `${finalH}px`,
            transform: 'translate(0px, 0px)',
            zIndex: 20,
          },
        };

        const targetPage = project?.pages?.find((p) => p.id === pageId) || activePage;
        if (finalY + finalH + 40 > artboardH && targetPage?.root?.id) {
          const neededH = finalY + finalH + 64;
          updateStyles(targetPage.root.id, { minHeight: `${neededH}px` });
        }
        addNode(shapeConfig.nodeType, targetPage?.root?.id, -1, overrides);
        setTool('select');
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    },
    [tool, zoom, activePage, setActivePage, activeShape, project, addNode, updateStyles]
  );

  const deviceWidths = {
    desktop: { width: 'w-[1280px]', label: 'Desktop — 1280px' },
    tablet: { width: 'w-[768px]', label: 'Tablet — 768px' },
    mobile: { width: 'w-[375px]', label: 'Mobile — 375px' },
  };

  const currentDevice = deviceWidths[activeBreakpoint] || deviceWidths.desktop;

  const handleZoomIn = useCallback(() => {
    setZoom((z) => Math.min(250, z + 10));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((z) => Math.max(25, z - 10));
  }, []);

  const handleResetView = useCallback(() => {
    setZoom(100);
    setPan({ x: 0, y: 0 });
  }, []);

  const handleFitToScreen = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const availableW = Math.max(200, rect.width - 120);
    const availableH = Math.max(200, rect.height - 180);

    const baseW =
      activeBreakpoint === 'desktop' ? 1280 : activeBreakpoint === 'tablet' ? 768 : 375;
    const count = pagesToRender.length || 1;
    const targetW = baseW * count + (count - 1) * 64;
    const targetH = 800;

    const scaleW = availableW / targetW;
    const scaleH = availableH / targetH;
    const scale = Math.min(scaleW, scaleH);

    const optimalZoom = Math.min(150, Math.max(15, Math.round((scale * 100) / 5) * 5));
    setZoom(optimalZoom);
    setPan({ x: 0, y: 0 });
  }, [activeBreakpoint, pagesToRender.length]);

  // When a new page is added, auto-fit view so all side-by-side pages are comfortably visible
  const prevPageCountRef = useRef(pagesToRender.length);
  useEffect(() => {
    if (pagesToRender.length > prevPageCountRef.current && prevPageCountRef.current > 0) {
      handleFitToScreen();
    }
    prevPageCountRef.current = pagesToRender.length;
  }, [pagesToRender.length, handleFitToScreen]);

  // Non-passive wheel event listener on containerRef for smooth zoom and pan
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (e) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        // Zooming gesture (trackpad pinch or Ctrl + Mouse Wheel)
        const zoomDelta = e.deltaY < 0 ? 5 : -5;
        setZoom((prev) => Math.min(250, Math.max(25, prev + zoomDelta)));
      } else {
        // Two-finger trackpad pan or mouse wheel scroll
        setPan((prev) => ({
          x: Math.round(prev.x - e.deltaX),
          y: Math.round(prev.y - e.deltaY),
        }));
      }
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', onWheel);
    };
  }, []);

  // Keyboard shortcuts for Figma navigation & zoom
  useEffect(() => {
    const handleKeyDown = (e) => {
      const target = e.target;
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);
      if (isInput) return;

      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        setIsSpacePressed(true);
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modKey = isMac ? e.metaKey : e.ctrlKey;

      // Zoom In: + or = or Ctrl/Cmd + =
      if ((e.key === '=' || e.key === '+') && !e.altKey) {
        e.preventDefault();
        handleZoomIn();
      }

      // Zoom Out: - or _ or Ctrl/Cmd + -
      if ((e.key === '-' || e.key === '_') && !e.altKey) {
        e.preventDefault();
        handleZoomOut();
      }

      // Reset Zoom (100%): 0 or Ctrl/Cmd + 0
      if (e.key === '0' && !e.altKey && !e.shiftKey) {
        e.preventDefault();
        handleResetView();
      }

      // Fit to Screen: Shift + 1
      if (e.shiftKey && e.key === '1') {
        e.preventDefault();
        handleFitToScreen();
      }

      // Hand tool: H
      if (!modKey && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 'h') {
        e.preventDefault();
        setTool('hand');
      }

      // Select tool: V
      if (!modKey && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        setTool('select');
      }

      // Shape tool: R (Rectangle)
      if (!modKey && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        setActiveShape('Rectangle');
        setTool('shape');
      }

      // Shape tool: O (Ellipse)
      if (!modKey && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        setActiveShape('Ellipse');
        setTool('shape');
      }

      // Shape tool: L (Line)
      if (!modKey && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        setActiveShape('Line');
        setTool('shape');
      }

      // Shape tool: Shift + L (Arrow)
      if (!modKey && !e.altKey && e.shiftKey && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        setActiveShape('Arrow');
        setTool('shape');
      }

      // Shape tool: Ctrl/Cmd + Shift + K (Image/video)
      if (modKey && e.shiftKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setActiveShape('Image');
        setTool('shape');
      }

      // Escape key cancels shape placement
      if (e.key === 'Escape' && tool === 'shape') {
        e.preventDefault();
        setTool('select');
      }

      // Text tool shortcut: T (when not in input/textarea/editable)
      if (
        !modKey &&
        !e.shiftKey &&
        !e.altKey &&
        e.key.toLowerCase() === 't' &&
        !['INPUT', 'TEXTAREA'].includes(e.target.tagName) &&
        !e.target.isContentEditable
      ) {
        e.preventDefault();
        addNode('Heading', null, -1, { createSectionAndContainer: true });
      }
    };

    const handleKeyUp = (e) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleZoomIn, handleZoomOut, handleResetView, handleFitToScreen, tool, addNode]);

  // Click outside zoom menu to close
  useEffect(() => {
    if (!showZoomMenu) return;
    const handleClickOutside = (e) => {
      if (zoomMenuRef.current && !zoomMenuRef.current.contains(e.target)) {
        setShowZoomMenu(false);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [showZoomMenu]);

  // Click outside shape menu to close
  useEffect(() => {
    if (!showShapeMenu) return;
    const handleClickOutside = (e) => {
      if (shapeMenuRef.current && !shapeMenuRef.current.contains(e.target)) {
        setShowShapeMenu(false);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [showShapeMenu]);

  // Click outside text menu to close
  useEffect(() => {
    if (!showTextMenu) return;
    const handleClickOutside = (e) => {
      if (textMenuRef.current && !textMenuRef.current.contains(e.target)) {
        setShowTextMenu(false);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [showTextMenu]);

  // Pan dragging handler
  const handlePanMouseDown = (e) => {
    if (tool === 'shape' && e.button === 0) {
      return;
    }

    const isMiddle = e.button === 1;
    const isHand = tool === 'hand' || isSpacePressed;
    const isBackgroundClick =
      e.target === containerRef.current ||
      e.target.dataset?.canvasBg === 'true';

    if (!isMiddle && !isHand && !isBackgroundClick) return;

    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const initialPanX = pan.x;
    const initialPanY = pan.y;
    let hasMoved = false;

    setIsPanning(true);

    const onMouseMove = (moveEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        hasMoved = true;
      }
      setPan({
        x: Math.round(initialPanX + dx),
        y: Math.round(initialPanY + dy),
      });
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      setIsPanning(false);

      if (!hasMoved && isBackgroundClick && !isHand && !isMiddle && activePage?.root) {
        setSelectedNodeId(activePage.root.id);
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const cursorClass = isPanning
    ? 'cursor-grabbing'
    : isSpacePressed || tool === 'hand'
      ? 'cursor-grab'
      : tool === 'shape'
        ? 'cursor-crosshair'
        : 'cursor-default';

  return (
    <CanvasContext.Provider value={{ zoom, tool }}>
      <section
        ref={containerRef}
        onMouseDown={handlePanMouseDown}
        data-canvas-bg="true"
        style={{
          backgroundColor: '#1e1e1e',
          backgroundImage: showGrid
            ? 'radial-gradient(circle, rgba(255, 255, 255, 0.12) 1px, transparent 1px)'
            : 'none',
          backgroundSize: '24px 24px',
          backgroundPosition: `${pan.x}px ${pan.y}px`,
        }}
        className={`flex-1 overflow-hidden relative w-full h-full select-none ${cursorClass} transition-colors`}
      >
        {/* Floating Shape Placement Mode Banner */}
        {tool === 'shape' && (
          <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-2 rounded-xl bg-[#2c2c2c]/95 border border-[#383838] shadow-2xl text-xs text-white backdrop-blur-md animate-in fade-in slide-in-from-top-2 select-none">
            <span className="w-2 h-2 rounded-full bg-[#0d99ff] animate-ping" />
            <span>
              Hold & drag on canvas to draw <strong>{activeShapeConfig.label}</strong> to size (or click to place)
            </span>
            <button
              type="button"
              onClick={() => setTool('select')}
              className="ml-2 px-2 py-0.5 rounded-md bg-white/10 hover:bg-white/20 text-[10px] text-zinc-300 hover:text-white cursor-pointer font-mono"
            >
              Cancel (Esc)
            </button>
          </div>
        )}

        {/* Full-canvas pan capture overlay when holding Spacebar or Hand Tool */}
        {(isSpacePressed || tool === 'hand') && (
          <div
            onMouseDown={handlePanMouseDown}
            className="absolute inset-0 z-30 cursor-grab active:cursor-grabbing"
          />
        )}

        {/* Infinite Space Stage Wrapper */}
        <div
          data-canvas-bg="true"
          className="absolute inset-0 flex items-start justify-center pt-16 pointer-events-none"
          style={{
            transform: `translate3d(${pan.x}px, ${pan.y}px, 0)`,
            willChange: 'transform',
          }}
        >
          <div
            className="pointer-events-auto flex items-start gap-16 select-none px-16"
            style={{
              transform: `scale(${zoom / 100})`,
              transformOrigin: 'top center',
              transition: isPanning ? 'none' : 'transform 0.15s cubic-bezier(0.2, 0, 0, 1)',
            }}
          >
            {pagesToRender.map((page) => {
              const isActive = activePage?.id === page.id;
              return (
                <div
                  key={page.id}
                  onClick={() => {
                    if (!isActive) {
                      setActivePage(page.id);
                    }
                  }}
                  className="flex flex-col items-center shrink-0 cursor-default"
                >
                  {/* Artboard Frame Header Pill */}
                  <div className={`w-full ${currentDevice.width} mb-3 flex items-center justify-between px-1 select-none`}>
                    <div className="flex items-center gap-2">
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          setActivePage(page.id);
                          setSelectedNodeId(page.root?.id);
                        }}
                        className={`text-[11px] font-mono font-medium flex items-center gap-1.5 px-3 py-1 rounded-xl border backdrop-blur-md shadow-md transition-all cursor-pointer ${isActive
                            ? 'bg-[#0d99ff]/20 border-[#0d99ff] text-white font-bold ring-2 ring-[#0d99ff]/30'
                            : 'bg-[#2c2c2c]/90 border-[#383838] text-zinc-400 hover:text-white hover:border-white/20'
                          }`}
                      >
                        <span className={isActive ? 'text-[#0d99ff] font-bold' : 'text-indigo-400 font-bold'}>#</span>
                        <span className="text-zinc-200 font-semibold">{page.name}</span>
                        {page.isHome && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-blue-500/30 text-blue-300 uppercase font-semibold">
                            Home
                          </span>
                        )}
                        <span className="text-zinc-600">&bull;</span>
                        <span className="text-zinc-400">{currentDevice.label}</span>
                      </div>

                      {/* Header Quick Actions */}
                      <div className="flex items-center gap-1 opacity-80 hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          title={`Set to default height (${DEFAULT_PAGE_HEIGHT}px)`}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (page?.root) {
                              updateStyles(page.root.id, { minHeight: `${DEFAULT_PAGE_HEIGHT}px`, height: undefined });
                              if (onToast) onToast(`Page height reset to default (${DEFAULT_PAGE_HEIGHT}px)`, 'success');
                            }
                          }}
                          className="px-1.5 py-0.5 rounded-lg bg-[#2c2c2c]/80 border border-[#383838] hover:bg-white/10 text-[9px] font-mono text-zinc-300 hover:text-white transition-colors cursor-pointer"
                        >
                          Default Height
                        </button>
                        <button
                          type="button"
                          title="Duplicate page with same format"
                          onClick={(e) => {
                            e.stopPropagation();
                            duplicatePage(page.id);
                          }}
                          className="p-1 rounded-lg bg-[#2c2c2c]/80 border border-[#383838] hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                        {!page.isHome && pagesToRender.length > 1 && (
                          <button
                            type="button"
                            title="Delete page"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm(`Delete page "${page.name}"?`)) {
                                deletePage(page.id);
                              }
                            }}
                            className="p-1 rounded-lg bg-[#2c2c2c]/80 border border-[#383838] hover:bg-rose-500/20 hover:border-rose-500/40 text-zinc-400 hover:text-rose-400 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="text-[10px] font-mono text-zinc-400 hidden sm:flex items-center gap-2 px-3 py-1 rounded-xl bg-[#2c2c2c]/80 border border-[#383838] backdrop-blur-md">
                      <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'}`} />
                      <span>{isActive ? 'Active Page' : 'Page'}</span>
                    </div>
                  </div>

                  {/* Main Artboard Canvas Frame */}
                  <div
                    data-canvas-frame="true"
                    data-page-id={page.id}
                    style={{
                      minHeight: page.root?.styles?.minHeight && page.root.styles.minHeight !== '100vh'
                        ? page.root.styles.minHeight
                        : `${DEFAULT_PAGE_HEIGHT}px`,
                      ...(page.root?.styles?.height ? { height: page.root.styles.height } : {}),
                    }}
                    className={`${currentDevice.width} rounded-2xl shadow-[0_30px_90px_rgba(0,0,0,0.8)] border ${isActive
                        ? 'border-[#0d99ff]/70 ring-2 ring-[#0d99ff]/25'
                        : 'border-[#383838] hover:border-[#484848]'
                      } bg-[#09090b] relative transition-[width,border-color] duration-200 overflow-hidden ${tool === 'shape' ? 'cursor-crosshair' : ''
                      }`}
                  >
                    {/* Active Shape Drawing Capture Overlay */}
                    {tool === 'shape' && (
                      <div
                        data-shape-draw-overlay="true"
                        onMouseDown={(e) => handleStartDrawShape(e, page.id)}
                        className="absolute inset-0 z-50 cursor-crosshair select-none bg-transparent"
                      />
                    )}

                    {/* Live Shape Draw Preview while user holds & drags cursor */}
                    {drawingShape && drawingShape.pageId === page.id && (
                      <div
                        className="absolute pointer-events-none z-50 transition-none"
                        style={{
                          left: `${drawingShape.x}px`,
                          top: `${drawingShape.y}px`,
                          width: `${Math.max(2, drawingShape.width)}px`,
                          height: `${activeShape === 'Line' ? 2 : Math.max(2, drawingShape.height)}px`,
                        }}
                      >
                        {/* Inner shape styled preview box */}
                        <div
                          className="w-full h-full border-2 border-[#0d99ff] bg-[#0d99ff]/25 shadow-[0_0_20px_rgba(13,153,255,0.45)] relative flex items-center justify-center overflow-hidden"
                          style={{
                            borderRadius:
                              activeShape === 'Ellipse'
                                ? '9999px'
                                : activeShape === 'Rectangle'
                                  ? '8px'
                                  : activeShape === 'Image'
                                    ? '12px'
                                    : '0px',
                            clipPath:
                              activeShape === 'Polygon'
                                ? 'polygon(50% 0%, 0% 100%, 100% 100%)'
                                : activeShape === 'Star'
                                  ? 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)'
                                  : undefined,
                          }}
                        >
                          {activeShape === 'Arrow' && (
                            <svg className="w-full h-full p-1" viewBox="0 0 100 24" fill="none" preserveAspectRatio="none">
                              <line x1="0" y1="12" x2="86" y2="12" stroke="#0d99ff" strokeWidth="3" />
                              <polygon points="84,4 100,12 84,20" fill="#0d99ff" />
                            </svg>
                          )}
                          {activeShape === 'Line' && (
                            <div className="w-full h-full bg-[#0d99ff]" />
                          )}
                          {activeShape === 'Image' && (
                            <div className="text-[10px] font-mono text-white/90 bg-black/60 px-2 py-0.5 rounded backdrop-blur-sm">
                              Image
                            </div>
                          )}
                        </div>

                        {/* Live Dimension Pill Badge (e.g. "240 × 160 px") */}
                        <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-[#0d99ff] text-white text-[11px] font-mono font-bold shadow-[0_4px_12px_rgba(0,0,0,0.6)] whitespace-nowrap flex items-center gap-1">
                          <span>{drawingShape.width}</span>
                          <span className="opacity-70">&times;</span>
                          <span>{activeShape === 'Line' ? 2 : drawingShape.height}</span>
                          <span className="text-[9px] opacity-80">px</span>
                        </div>
                      </div>
                    )}

                    {page.root ? (
                      <InteractiveNode node={page.root} isRoot={true} pageId={page.id} />
                    ) : (
                      <div className="p-16 text-center text-zinc-500 text-sm">
                        No document tree loaded.
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Floating Figma Bottom Toolbar (Matches Screenshot) */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1.5 px-2 py-1.5 rounded-2xl bg-[#2c2c2c]/95 border border-[#383838] backdrop-blur-2xl shadow-[0_12px_40px_rgba(0,0,0,0.7)] text-zinc-300 select-none"
        >
          {/* Tool 1: Move / Select (Blue active button in screenshot) */}
          <button
            type="button"
            title="Move / Select (V)"
            onClick={() => setTool('select')}
            className={`p-2 rounded-xl transition-all cursor-pointer ${tool === 'select'
                ? 'bg-[#0d99ff] text-white shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-white/10'
              }`}
          >
            <MousePointer className="w-4 h-4 fill-current" />
          </button>

          {/* Tool 2: Frame / Section (#) */}
          <button
            type="button"
            title="Add Section / Frame (F)"
            onClick={() => addNode('Section')}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer text-xs font-mono font-bold"
          >
            <span>#</span>
          </button>

          {/* Tool 3: Shapes Tool with Dropdown Menu (Matches Figma Screenshot) */}
          <div className="relative" ref={shapeMenuRef}>
            <div
              className={`flex items-center rounded-xl transition-all ${tool === 'shape'
                  ? 'bg-[#0d99ff] text-white shadow-md'
                  : 'text-zinc-400 hover:text-white hover:bg-white/10'
                }`}
            >
              <button
                type="button"
                title={`Place ${activeShapeConfig.label} (${activeShapeConfig.shortcut || 'Click canvas'})`}
                onClick={() => {
                  if (tool === 'shape') {
                    setTool('select');
                  } else {
                    setTool('shape');
                  }
                }}
                className="p-2 pr-1 rounded-l-xl cursor-pointer flex items-center justify-center transition-colors"
              >
                {renderShapeIcon(activeShape, 'w-3.5 h-3.5')}
              </button>
              <button
                type="button"
                title="Select Shape or Media"
                onClick={() => setShowShapeMenu((prev) => !prev)}
                className="py-2 pr-1.5 pl-0.5 rounded-r-xl cursor-pointer hover:bg-white/10 flex items-center justify-center transition-colors"
              >
                <ChevronDown className="w-3 h-3 text-current opacity-70 hover:opacity-100" />
              </button>
            </div>

            {/* Dropdown Popup Menu (Matches User Screenshot) */}
            {showShapeMenu && (
              <div className="absolute bottom-full mb-2.5 left-0 bg-[#1e1e1e] border border-[#333333] rounded-xl shadow-2xl p-1.5 min-w-[210px] z-50 select-none animate-in fade-in duration-100 text-zinc-300">
                {SHAPE_OPTIONS.map((shape) => {
                  const isCurrent = activeShape === shape.id;
                  return (
                    <button
                      key={shape.id}
                      type="button"
                      onClick={() => {
                        setActiveShape(shape.id);
                        setTool('shape');
                        setShowShapeMenu(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${isCurrent
                          ? 'bg-[#0d99ff] text-white font-medium shadow-sm'
                          : 'text-zinc-300 hover:bg-white/10 hover:text-white'
                        }`}
                    >
                      <div className="flex items-center gap-2">
                        {/* Checkmark icon for active selection */}
                        <div className="w-3.5 flex items-center justify-center">
                          {isCurrent ? (
                            <Check className="w-3.5 h-3.5 text-white stroke-[2.5]" />
                          ) : null}
                        </div>
                        {/* Shape Icon */}
                        <div className="w-4 h-4 flex items-center justify-center">
                          {renderShapeIcon(shape.id, 'w-3.5 h-3.5')}
                        </div>
                        {/* Label */}
                        <span className="font-normal">{shape.label}</span>
                      </div>

                      {/* Keyboard shortcut label */}
                      {shape.shortcut && (
                        <span
                          className={`text-[10px] font-mono tracking-tight ml-3 ${isCurrent ? 'text-white/80' : 'text-zinc-500'
                            }`}
                        >
                          {shape.shortcut}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Tool 5: Text */}
          <div className="relative flex items-center" ref={textMenuRef}>
            <div className="flex items-center rounded-xl hover:bg-white/10 transition-colors">
              <button
                type="button"
                title="Add Heading with Section & Container (T)"
                onClick={() => addNode('Heading', null, -1, { createSectionAndContainer: true })}
                className="p-2 pr-1 rounded-l-xl text-zinc-400 hover:text-white transition-colors cursor-pointer text-xs font-bold"
              >
                <span>T</span>
              </button>
              <button
                type="button"
                title="Select Text Type"
                onClick={() => setShowTextMenu((prev) => !prev)}
                className="py-2 pr-1.5 pl-0.5 rounded-r-xl cursor-pointer text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
              >
                <ChevronDown className="w-3 h-3 text-current opacity-70 hover:opacity-100" />
              </button>
            </div>

            {/* Dropdown for Heading / Text */}
            {showTextMenu && (
              <div className="absolute bottom-full mb-2.5 left-0 bg-[#1e1e1e] border border-[#333333] rounded-xl shadow-2xl p-1.5 min-w-[200px] z-50 select-none text-zinc-300">
                <button
                  type="button"
                  onClick={() => {
                    addNode('Heading', null, -1, { createSectionAndContainer: true });
                    setShowTextMenu(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs text-zinc-300 hover:bg-white/10 hover:text-white transition-colors cursor-pointer text-left"
                >
                  <span className="font-bold font-mono text-white text-xs w-4 text-center">H</span>
                  <div>
                    <span className="font-medium text-white block">Heading</span>
                    <span className="text-[10px] text-zinc-500 block">With Section & Container</span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    addNode('Text', null, -1, { createSectionAndContainer: true });
                    setShowTextMenu(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs text-zinc-300 hover:bg-white/10 hover:text-white transition-colors cursor-pointer text-left"
                >
                  <span className="font-bold text-white text-xs w-4 text-center">¶</span>
                  <div>
                    <span className="font-medium text-white block">Paragraph / Text</span>
                    <span className="text-[10px] text-zinc-500 block">With Section & Container</span>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Tool 6: Hand Tool */}
          <button
            type="button"
            title="Hand / Pan Tool (H)"
            onClick={() => setTool('hand')}
            className={`p-2 rounded-xl transition-all cursor-pointer ${tool === 'hand'
                ? 'bg-[#0d99ff] text-white shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-white/10'
              }`}
          >
            <Hand className="w-3.5 h-3.5" />
          </button>

          {/* Divider */}
          <div className="h-5 w-px bg-white/15 mx-1" />

          {/* Device Viewport Selector */}
          <div className="flex items-center bg-black/30 p-0.5 rounded-xl border border-white/5 gap-0.5">
            <button
              type="button"
              title="Desktop (1280px)"
              onClick={() => setActiveBreakpoint('desktop')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${activeBreakpoint === 'desktop'
                  ? 'bg-white text-black font-bold shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-white/10'
                }`}
            >
              <Monitor className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              title="Tablet (768px)"
              onClick={() => setActiveBreakpoint('tablet')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${activeBreakpoint === 'tablet'
                  ? 'bg-white text-black font-bold shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-white/10'
                }`}
            >
              <Tablet className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              title="Mobile (375px)"
              onClick={() => setActiveBreakpoint('mobile')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${activeBreakpoint === 'mobile'
                  ? 'bg-white text-black font-bold shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-white/10'
                }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Divider */}
          <div className="h-5 w-px bg-white/15 mx-1" />

          {/* Zoom Controls */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              title="Zoom Out (Ctrl -)"
              onClick={handleZoomOut}
              className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>

            {/* Clickable Zoom Percentage Dropdown */}
            <div className="relative" ref={zoomMenuRef}>
              <button
                type="button"
                title="Zoom Presets"
                onClick={() => setShowZoomMenu((prev) => !prev)}
                className="flex items-center gap-1 text-[11px] font-mono font-semibold px-2 py-1 rounded-lg hover:bg-white/10 text-zinc-300 min-w-[54px] justify-center transition-colors cursor-pointer"
              >
                <span>{zoom}%</span>
                <ChevronDown className="w-3 h-3 text-zinc-400" />
              </button>

              {showZoomMenu && (
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-[#2c2c2c] border border-[#383838] rounded-xl shadow-2xl p-1.5 min-w-[140px] z-50 text-xs text-zinc-200">
                  <div className="text-[10px] uppercase font-mono text-zinc-500 px-2 py-1 font-bold">Zoom Presets</div>
                  {[200, 150, 100, 75, 50, 25].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setZoom(preset);
                        setShowZoomMenu(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg font-mono text-xs transition-colors cursor-pointer ${zoom === preset
                          ? 'bg-[#0d99ff] text-white font-semibold'
                          : 'text-zinc-300 hover:bg-white/10'
                        }`}
                    >
                      {preset}%
                    </button>
                  ))}
                  <div className="h-px bg-white/10 my-1" />
                  <button
                    type="button"
                    onClick={() => {
                      handleFitToScreen();
                      setShowZoomMenu(false);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg font-mono text-xs text-zinc-300 hover:bg-white/10 cursor-pointer"
                  >
                    Fit to screen
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleResetView();
                      setShowZoomMenu(false);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg font-mono text-xs text-zinc-300 hover:bg-white/10 cursor-pointer"
                  >
                    Reset (100%)
                  </button>
                </div>
              )}
            </div>

            <button
              type="button"
              title="Zoom In (Ctrl +)"
              onClick={handleZoomIn}
              className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Floating Canvas Controls (Bottom Right) */}
        <div className="fixed bottom-6 right-6 z-40 flex items-center gap-2">
          {/* Dedicated Zoom Widget */}
          <div className="flex items-center gap-1 px-2 py-1 rounded-2xl bg-[#2c2c2c]/95 border border-[#383838] backdrop-blur-2xl shadow-[0_8px_30px_rgba(0,0,0,0.6)] text-zinc-300 select-none">
            <button
              type="button"
              title="Zoom Out (-)"
              onClick={handleZoomOut}
              className="p-1.5 rounded-xl hover:bg-white/10 hover:text-white transition-colors cursor-pointer text-zinc-400"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              title="Click to reset zoom (100%)"
              onClick={handleResetView}
              className="text-[11px] font-mono font-semibold px-1.5 py-0.5 rounded-lg hover:bg-white/10 hover:text-white transition-colors cursor-pointer min-w-[44px] text-center"
            >
              {zoom}%
            </button>
            <button
              type="button"
              title="Zoom In (+)"
              onClick={handleZoomIn}
              className="p-1.5 rounded-xl hover:bg-white/10 hover:text-white transition-colors cursor-pointer text-zinc-400"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <div className="w-px h-4 bg-white/15 mx-0.5" />
            <button
              type="button"
              title="Fit to Screen (Shift + 1)"
              onClick={handleFitToScreen}
              className="p-1.5 rounded-xl hover:bg-white/10 hover:text-white transition-colors cursor-pointer text-zinc-400"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Help navigation modal / trigger */}
          <div className="relative">
            {showNavHint && (
              <div className="absolute bottom-full mb-3 right-0 bg-[#252528] border border-[#383838] p-3.5 rounded-2xl shadow-2xl text-xs text-zinc-300 w-64 space-y-2.5 animate-in fade-in slide-in-from-bottom-2 select-none">
                <div className="flex items-center justify-between font-bold text-white text-[11px]">
                  <span>Craftify Canvas Navigation</span>
                  <button
                    type="button"
                    onClick={() => setShowNavHint(false)}
                    className="text-zinc-500 hover:text-white cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
                <ul className="text-[10px] space-y-1.5 text-zinc-400 font-mono">
                  <li>• <strong className="text-zinc-200">Pan Canvas:</strong> Space + Drag or Middle Click</li>
                  <li>• <strong className="text-zinc-200">Zoom In / Out:</strong> + / - or Ctrl + MouseWheel</li>
                  <li>• <strong className="text-zinc-200">Fit to Screen:</strong> Shift + 1</li>
                  <li>• <strong className="text-zinc-200">Reset Zoom:</strong> 0 or click percentage</li>
                  <li>• <strong className="text-zinc-200">Move Element:</strong> Drag element in canvas</li>
                  <li>• <strong className="text-zinc-200">Edit Text:</strong> Double-click text</li>
                  <li>• <strong className="text-zinc-200">Duplicate:</strong> Ctrl + D</li>
                  <li>• <strong className="text-zinc-200">Undo / Redo:</strong> Ctrl + Z / Ctrl + Y</li>
                </ul>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowNavHint(!showNavHint)}
              title="Craftify Navigation & Shortcuts Help"
              className="w-8 h-8 rounded-full bg-[#2c2c2c] hover:bg-[#383838] border border-white/15 flex items-center justify-center text-zinc-300 hover:text-white font-mono font-bold text-xs shadow-lg transition-all cursor-pointer"
            >
              <span>?</span>
            </button>
          </div>
        </div>
      </section>
    </CanvasContext.Provider>
  );
}
