import React, { useState, useRef, useEffect, useCallback, useContext, memo } from 'react';
import { useEditorStore } from '../store/editorContext.jsx';
import { findParent, canNest, NODE_REGISTRY, HEADING_LEVEL_DEFAULTS } from '../model/index.js';
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
} from 'lucide-react';

export function parseTranslate(transformStr) {
  if (!transformStr || typeof transformStr !== 'string') return { x: 0, y: 0 };
  const match = transformStr.match(/translate\(\s*(-?\d+(?:\.\d+)?)(?:px)?\s*,\s*(-?\d+(?:\.\d+)?)(?:px)?\s*\)/i);
  if (match) {
    return { x: parseFloat(match[1]) || 0, y: parseFloat(match[2]) || 0 };
  }
  return { x: 0, y: 0 };
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
      className="absolute -top-8 left-0 z-40 flex items-center gap-1 px-2 py-1 rounded-lg bg-[#111114] border border-white/20 shadow-xl text-white select-none text-xs"
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
      className={`transition-all duration-150 relative ${
        isOver
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
const InteractiveNode = memo(function InteractiveNode({ node, isRoot = false }) {
  const {
    selectedNodeId,
    setSelectedNodeId,
    hoveredNodeId,
    setHoveredNodeId,
    updateProps,
    updateStyles,
    moveNode,
    addNode,
  } = useEditorStore();

  const { zoom, tool } = useContext(CanvasContext);

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

  // Resize handler for handles with zoom-scale compensation
  const handleResizeStart = (dir, e) => {
    if (!nodeRef.current) return;
    const rect = nodeRef.current.getBoundingClientRect();
    const scale = (zoom || 100) / 100;
    const startW = rect.width / scale;
    const startH = rect.height / scale;
    const startX = e.clientX;
    const startY = e.clientY;

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

      newW = Math.max(30, Math.round(newW));
      newH = Math.max(20, Math.round(newH));

      setLiveSize({ width: newW, height: newH });
    };

    const handleMouseUp = (upEvent) => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);

      const deltaX = (upEvent.clientX - startX) / scale;
      const deltaY = (upEvent.clientY - startY) / scale;

      const styleUpdates = {};

      if (dir.includes('e') || dir.includes('w')) {
        const finalW = Math.max(30, Math.round(dir.includes('e') ? startW + deltaX : startW - deltaX));
        styleUpdates.width = `${finalW}px`;
      }
      if (dir.includes('s') || dir.includes('n')) {
        const finalH = Math.max(20, Math.round(dir.includes('s') ? startH + deltaY : startH - deltaY));
        styleUpdates.height = `${finalH}px`;
      }

      if (Object.keys(styleUpdates).length > 0) {
        updateStyles(node.id, styleUpdates);
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

    const startX = e.clientX;
    const startY = e.clientY;
    const currentTranslate = parseTranslate(node.styles?.transform);
    const scale = (zoom || 100) / 100;
    let moved = false;

    setIsMoving(true);
    setLiveTranslate(currentTranslate);

    const onMouseMove = (moveEvent) => {
      const deltaX = (moveEvent.clientX - startX) / scale;
      const deltaY = (moveEvent.clientY - startY) / scale;

      if (!moved && (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2)) {
        moved = true;
      }

      const newX = Math.round(currentTranslate.x + deltaX);
      const newY = Math.round(currentTranslate.y + deltaY);
      setLiveTranslate({ x: newX, y: newY });
    };

    const onMouseUp = (upEvent) => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);

      if (moved) {
        const deltaX = (upEvent.clientX - startX) / scale;
        const deltaY = (upEvent.clientY - startY) / scale;
        const finalX = Math.round(currentTranslate.x + deltaX);
        const finalY = Math.round(currentTranslate.y + deltaY);

        updateStyles(node.id, {
          transform: `translate(${finalX}px, ${finalY}px)`,
        });
      }

      setIsMoving(false);
      setLiveTranslate(null);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Node mousedown: if user drags the selected node itself, move it!
  const handleNodeMouseDown = (e) => {
    if (tool === 'hand' || isRoot || isInlineEditing || isResizing) return;
    if (e.button !== 0) return;
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.closest('button')) return;

    const startX = e.clientX;
    const startY = e.clientY;
    const currentTranslate = parseTranslate(node.styles?.transform);
    const scale = (zoom || 100) / 100;
    let isDragMoving = false;

    const onMouseMove = (moveEvent) => {
      const deltaX = (moveEvent.clientX - startX) / scale;
      const deltaY = (moveEvent.clientY - startY) / scale;

      if (!isDragMoving && (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4)) {
        isDragMoving = true;
        setIsMoving(true);
        setSelectedNodeId(node.id);
      }

      if (isDragMoving) {
        const newX = Math.round(currentTranslate.x + deltaX);
        const newY = Math.round(currentTranslate.y + deltaY);
        setLiveTranslate({ x: newX, y: newY });
      }
    };

    const onMouseUp = (upEvent) => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);

      if (isDragMoving) {
        const deltaX = (upEvent.clientX - startX) / scale;
        const deltaY = (upEvent.clientY - startY) / scale;
        const finalX = Math.round(currentTranslate.x + deltaX);
        const finalY = Math.round(currentTranslate.y + deltaY);

        updateStyles(node.id, {
          transform: `translate(${finalX}px, ${finalY}px)`,
        });

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
    setSelectedNodeId(node.id);
  };

  const handleDoubleClick = (e) => {
    e.stopPropagation();
    if (isTextEditable) {
      setIsInlineEditing(true);
    }
  };

  // Base and active dynamic styles
  const baseStyle = node.styles || {};
  const baseTranslate = parseTranslate(baseStyle.transform);
  const currentTranslate = liveTranslate || (baseStyle.transform ? baseTranslate : null);

  const activeStyle = {
    ...baseStyle,
    ...(currentTranslate ? { transform: `translate(${currentTranslate.x}px, ${currentTranslate.y}px)` } : {}),
    ...(liveSize && (resizingInfo?.dir?.includes('e') || resizingInfo?.dir?.includes('w'))
      ? { width: `${liveSize.width}px` }
      : {}),
    ...(liveSize && (resizingInfo?.dir?.includes('s') || resizingInfo?.dir?.includes('n'))
      ? { height: `${liveSize.height}px` }
      : {}),
  };

  // Render children recursively with drop zones between them
  const isContainerNode = NODE_REGISTRY[node.type]?.isContainer;
  const childrenWithDropZones = Array.isArray(node.children)
    ? node.children.map((child, idx) => (
      <React.Fragment key={child.id}>
        <DropZoneIndicator parentId={node.id} index={idx} />
        <InteractiveNode node={child} />
        {idx === node.children.length - 1 && (
          <DropZoneIndicator parentId={node.id} index={idx + 1} />
        )}
      </React.Fragment>
    ))
    : null;

  // Empty container placeholder
  const renderEmptyContainer =
    isContainerNode && (!node.children || node.children.length === 0);

  // Outline class states
  const outlineClasses = isSelected
    ? 'relative ring-0'
    : isHovered
      ? 'outline-dashed outline-1 outline-white/50 relative'
      : 'relative';

  const cursorClass = isSelected && !isRoot && !isInlineEditing ? 'cursor-move' : '';
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
        <div {...commonProps} className={`w-full min-h-screen transition-all ${outlineClasses}`}>
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
          {renderEmptyContainer ? (
            <div className="p-6 text-center text-zinc-500 text-xs border border-dashed border-white/10 rounded-lg">
              Empty Container. Add content.
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
          className={animClasses}
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
        <p {...commonProps} className={animClasses}>
          {renderSelectionOverlays()}
          {String(node.props?.content ?? '')}
        </p>
      );
    }

    case 'Image':
      return (
        <div {...commonProps} className={animClasses}>
          {renderSelectionOverlays()}
          <img
            src={String(node.props?.src || '/img2.jpg')}
            alt={String(node.props?.alt || 'Visual asset')}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            className="block rounded-[inherit]"
          />
        </div>
      );

    case 'Button': {
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
        <button type="button" {...commonProps} className={animClasses}>
          {renderSelectionOverlays()}
          {String(node.props?.label ?? 'Click Me')}
        </button>
      );
    }

    case 'Link': {
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
        <span
          {...commonProps}
          style={{ display: 'inline-block', ...activeStyle }}
          className={`cursor-pointer ${animClasses}`}
        >
          {renderSelectionOverlays()}
          {String(node.props?.text ?? 'Link text')}
        </span>
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
  const { activePage, selectedNodeId, setSelectedNodeId } = useEditorStore();

  const containerRef = useRef(null);
  const zoomMenuRef = useRef(null);

  const [zoom, setZoom] = useState(100);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [tool, setTool] = useState('select'); // 'select' | 'hand'
  const [device, setDevice] = useState('desktop'); // 'desktop' | 'tablet' | 'mobile'
  const [showGrid, setShowGrid] = useState(true);
  const [showZoomMenu, setShowZoomMenu] = useState(false);
  const [showNavHint, setShowNavHint] = useState(true);

  const deviceWidths = {
    desktop: { width: 'w-[1200px]', label: 'Desktop — 1200px' },
    tablet: { width: 'w-[768px]', label: 'Tablet — 768px' },
    mobile: { width: 'w-[390px]', label: 'Mobile — 390px' },
  };

  const currentDevice = deviceWidths[device] || deviceWidths.desktop;

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

    const targetW =
      device === 'desktop' ? 1200 : device === 'tablet' ? 768 : 390;
    const targetH = 800;

    const scaleW = availableW / targetW;
    const scaleH = availableH / targetH;
    const scale = Math.min(scaleW, scaleH);

    const optimalZoom = Math.min(150, Math.max(25, Math.round((scale * 100) / 5) * 5));
    setZoom(optimalZoom);
    setPan({ x: 0, y: 0 });
  }, [device]);

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

      // Zoom In: Ctrl/Cmd + = or Ctrl/Cmd + +
      if (modKey && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        handleZoomIn();
      }

      // Zoom Out: Ctrl/Cmd + - or Ctrl/Cmd + _
      if (modKey && (e.key === '-' || e.key === '_')) {
        e.preventDefault();
        handleZoomOut();
      }

      // Reset Zoom (100%): Ctrl/Cmd + 0
      if (modKey && e.key === '0') {
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
  }, [handleZoomIn, handleZoomOut, handleResetView, handleFitToScreen]);

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

  // Pan dragging handler
  const handlePanMouseDown = (e) => {
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
      : 'cursor-default';

  return (
    <CanvasContext.Provider value={{ zoom, tool }}>
      <section
        ref={containerRef}
        onMouseDown={handlePanMouseDown}
        data-canvas-bg="true"
        style={{
          backgroundColor: '#141416',
          backgroundImage: showGrid
            ? 'radial-gradient(circle, rgba(255, 255, 255, 0.14) 1.2px, transparent 1.2px)'
            : 'none',
          backgroundSize: '24px 24px',
          backgroundPosition: `${pan.x}px ${pan.y}px`,
        }}
        className={`flex-1 overflow-hidden relative w-full h-full select-none ${cursorClass} transition-colors`}
      >
        {/* Full-canvas pan capture overlay when holding Spacebar or Hand Tool */}
        {(isSpacePressed || tool === 'hand') && (
          <div
            onMouseDown={handlePanMouseDown}
            className="absolute inset-0 z-30 cursor-grab active:cursor-grabbing"
          />
        )}

        {/* Helpful Figma Navigation Badge */}
        {showNavHint && (
          <div className="absolute top-4 left-4 z-20 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#1c1c21]/80 border border-white/10 backdrop-blur-md text-[11px] font-mono text-zinc-400 shadow-lg">
            <span>💡 Space + Drag to Pan • Ctrl + Scroll to Zoom</span>
            <button
              type="button"
              onClick={() => setShowNavHint(false)}
              className="text-zinc-500 hover:text-zinc-300 ml-1 p-0.5 cursor-pointer"
              title="Dismiss hint"
            >
              ×
            </button>
          </div>
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
            className="pointer-events-auto flex flex-col items-center select-none"
            style={{
              transform: `scale(${zoom / 100})`,
              transformOrigin: 'top center',
              transition: isPanning ? 'none' : 'transform 0.15s cubic-bezier(0.2, 0, 0, 1)',
            }}
          >
            {/* Figma Frame Header Pill */}
            <div className={`w-full ${currentDevice.width} mb-3 flex items-center justify-between px-1 select-none`}>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono font-medium text-zinc-400 flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#1c1c21]/90 border border-white/10 backdrop-blur-md shadow-md">
                  <span className="text-indigo-400 font-bold">#</span>
                  <span className="text-zinc-200 font-semibold">{activePage?.title || 'Home Page'}</span>
                  <span className="text-zinc-600">&bull;</span>
                  <span className="text-zinc-400">{currentDevice.label}</span>
                </span>
              </div>
              <div className="text-[10px] font-mono text-zinc-400 hidden sm:flex items-center gap-2 px-3 py-1 rounded-xl bg-[#1c1c21]/80 border border-white/10 backdrop-blur-md">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Figma Infinite Canvas</span>
                <span className="text-zinc-600">&bull;</span>
                <span className="text-zinc-300 font-semibold">{zoom}%</span>
              </div>
            </div>

            {/* Main Artboard Canvas Frame */}
            <div
              className={`${currentDevice.width} rounded-3xl shadow-[0_30px_90px_rgba(0,0,0,0.95)] border border-white/15 bg-[#09090b] min-h-[720px] relative transition-[width] duration-200`}
            >
              {activePage?.root ? (
                <InteractiveNode node={activePage.root} isRoot={true} />
              ) : (
                <div className="p-16 text-center text-zinc-500 text-sm">
                  No document tree loaded.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Floating Figma Bottom Toolbar */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-3 py-2 rounded-2xl bg-[#18181c]/90 border border-white/15 backdrop-blur-2xl shadow-[0_10px_35px_rgba(0,0,0,0.8)] text-zinc-300 select-none"
        >
          {/* Tool Selector: Select (V) vs Hand (H) */}
          <div className="flex items-center bg-black/40 p-1 rounded-xl border border-white/10 gap-1">
            <button
              type="button"
              title="Select Tool (V)"
              onClick={() => setTool('select')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                tool === 'select'
                  ? 'bg-white text-black shadow-sm font-bold'
                  : 'text-zinc-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <MousePointer className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              title="Hand / Pan Tool (H) — Hold Space to pan anytime"
              onClick={() => setTool('hand')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                tool === 'hand'
                  ? 'bg-white text-black shadow-sm font-bold'
                  : 'text-zinc-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <Hand className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-4 w-px bg-white/10 mx-0.5" />

          {/* Device Viewport Selector */}
          <div className="flex items-center bg-black/40 p-1 rounded-xl border border-white/10 gap-1">
            <button
              type="button"
              title="Desktop View (1200px)"
              onClick={() => setDevice('desktop')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                device === 'desktop'
                  ? 'bg-white text-black shadow-sm font-bold'
                  : 'text-zinc-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              title="Tablet View (768px)"
              onClick={() => setDevice('tablet')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                device === 'tablet'
                  ? 'bg-white text-black shadow-sm font-bold'
                  : 'text-zinc-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <Tablet className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              title="Mobile View (390px)"
              onClick={() => setDevice('mobile')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                device === 'mobile'
                  ? 'bg-white text-black shadow-sm font-bold'
                  : 'text-zinc-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-4 w-px bg-white/10 mx-0.5" />

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
                title="Zoom Presets & Options"
                onClick={() => setShowZoomMenu((prev) => !prev)}
                className="flex items-center gap-1 text-[11px] font-mono font-semibold px-2 py-1 rounded-lg hover:bg-white/10 text-zinc-300 min-w-[58px] justify-center transition-colors cursor-pointer"
              >
                <span>{zoom}%</span>
                <ChevronDown className="w-3 h-3 text-zinc-400" />
              </button>

              {showZoomMenu && (
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-[#18181c]/95 border border-white/15 rounded-2xl shadow-2xl p-1.5 min-w-[140px] z-50 text-xs backdrop-blur-2xl animate-in fade-in slide-in-from-bottom-2 duration-150">
                  <div className="text-[10px] uppercase font-mono text-zinc-500 px-2 py-1 font-bold">Zoom Presets</div>
                  {[200, 150, 125, 100, 75, 50, 25].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setZoom(preset);
                        setShowZoomMenu(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-xl flex items-center justify-between font-mono text-xs transition-colors cursor-pointer ${
                        zoom === preset
                          ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                          : 'text-zinc-300 hover:bg-white/10'
                      }`}
                    >
                      <span>{preset}%</span>
                      {preset === 100 && <span className="text-[9px] text-zinc-400">100%</span>}
                    </button>
                  ))}
                  <div className="h-px bg-white/10 my-1" />
                  <button
                    type="button"
                    onClick={() => {
                      handleFitToScreen();
                      setShowZoomMenu(false);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-xl font-mono text-xs text-zinc-300 hover:bg-white/10 flex items-center justify-between cursor-pointer"
                  >
                    <span>Fit to screen</span>
                    <span className="text-[9px] text-zinc-500">Shift+1</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleResetView();
                      setShowZoomMenu(false);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-xl font-mono text-xs text-zinc-300 hover:bg-white/10 flex items-center justify-between cursor-pointer"
                  >
                    <span>Reset view</span>
                    <span className="text-[9px] text-zinc-500">Ctrl+0</span>
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

            <button
              type="button"
              title="Fit to Screen (Shift+1)"
              onClick={handleFitToScreen}
              className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              title="Reset & Center View (Ctrl+0)"
              onClick={handleResetView}
              className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>

          <div className="h-4 w-px bg-white/10 mx-0.5" />

          {/* Toggle Dot Grid */}
          <button
            type="button"
            title="Toggle Figma Dot Grid"
            onClick={() => setShowGrid(!showGrid)}
            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
              showGrid
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <GridIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      </section>
    </CanvasContext.Provider>
  );
}
