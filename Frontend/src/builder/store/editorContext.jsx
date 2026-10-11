/**
 * Craftify Labs - Editor State Architecture & Command Dispatcher
 *
 * Implements:
 * - Single source of truth (Project document model)
 * - Immutable command dispatching with nesting rules enforcement
 * - Structural sharing Undo/Redo history stack with rapid-edit debounced grouping
 * - Separate ephemeral editor state (selectedNodeId, hoveredNodeId, dirty, saveStatus)
 * - Auto-save integration with storage adapter
 */

import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
} from 'react';
import {
  createNode,
  findNode,
  findParent,
  insertNode,
  removeNode,
  updateNode,
  moveNode as modelMoveNode,
  moveUp as modelMoveUp,
  moveDown as modelMoveDown,
  duplicateNode as modelDuplicateNode,
  canNest,
  validateProject,
  isSafeUrl,
  NODE_REGISTRY,
} from '../model/index.js';
import { projectStorage } from '../storage/index.js';

const EditorContext = createContext(null);

function parseTranslate(transformStr) {
  if (!transformStr || typeof transformStr !== 'string') return { x: 0, y: 0 };
  const match = transformStr.match(/translate\(\s*(-?\d+(?:\.\d+)?)(?:px)?\s*,\s*(-?\d+(?:\.\d+)?)(?:px)?\s*\)/i);
  if (match) {
    return { x: parseFloat(match[1]) || 0, y: parseFloat(match[2]) || 0 };
  }
  return { x: 0, y: 0 };
}

export function EditorProvider({ initialProject, onToast, children }) {
  // Current document model
  const [project, setProject] = useState(initialProject);

  // Ephemeral editor state
  const [selectedNodeId, setSelectedNodeIdState] = useState(() => {
    return initialProject?.pages?.[0]?.root?.id || null;
  });
  const [hoveredNodeId, setHoveredNodeId] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved' | 'saving' | 'error'

  // History stacks
  const [past, setPast] = useState([]);
  const [future, setFuture] = useState([]);

  // Ref tracking rapid edit grouping
  const lastGroupActionRef = useRef({ key: null, time: 0 });
  const saveTimeoutRef = useRef(null);

  // Active home page helper
  const activePage = useMemo(() => {
    return project?.pages?.find((p) => p.isHome) || project?.pages?.[0] || null;
  }, [project]);

  // Selected node helper
  const selectedNode = useMemo(() => {
    if (!activePage?.root || !selectedNodeId) return null;
    return findNode(activePage.root, selectedNodeId);
  }, [activePage, selectedNodeId]);

  // Keep selection valid whenever activePage changes
  const setSelectedNodeId = useCallback((id) => {
    setSelectedNodeIdState(id);
  }, []);

  /**
   * Internal helper to commit a new project document to state and history.
   * Clears future (redo) stack.
   */
  const commitDocument = useCallback(
    (newProject, groupKey = null) => {
      setProject((currentProject) => {
        const now = Date.now();
        const isGrouped =
          groupKey &&
          lastGroupActionRef.current.key === groupKey &&
          now - lastGroupActionRef.current.time < GROUPING_WINDOW_MS;

        if (isGrouped) {
          // Do not push a new entry to past; update in place
          lastGroupActionRef.current = { key: groupKey, time: now };
        } else {
          // Push current state to past
          setPast((prev) => {
            const nextPast = [...prev, currentProject];
            if (nextPast.length > MAX_HISTORY) {
              return nextPast.slice(nextPast.length - MAX_HISTORY);
            }
            return nextPast;
          });
          lastGroupActionRef.current = { key: groupKey, time: now };
        }

        // New edit clears future redo stack
        setFuture([]);
        setDirty(true);
        setSaveStatus('saving');

        return newProject;
      });
    },
    []
  );

  /**
   * Debounced auto-save hook triggered on document changes
   */
  useEffect(() => {
    if (!dirty || !project) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await projectStorage.save(project);
        setSaveStatus('saved');
        setDirty(false);
      } catch (err) {
        setSaveStatus('error');
        if (onToast) onToast(err.message || 'Auto-save failed.', 'error');
      }
    }, 800);

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [project, dirty, onToast]);

  // Warn on window reload if dirty
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [dirty]);

  /**
   * Updates the home page root node immutably and commits to document.
   */
  const setPageRoot = useCallback(
    (newRoot, groupKey = null) => {
      const updatedPages = project.pages.map((p) => {
        if (p.id === activePage.id) {
          return { ...p, root: newRoot };
        }
        return p;
      });

      const updatedProject = {
        ...project,
        project: {
          ...project.project,
          updatedAt: new Date().toISOString(),
        },
        pages: updatedPages,
      };

      commitDocument(updatedProject, groupKey);
    },
    [project, activePage, commitDocument]
  );

  // =========================================================================
  // TYPED EDITOR COMMANDS
  // =========================================================================

  /**
   * Command: addNode
   * Inserts a new component node into targetParentId, or the currently selected container.
   */
  const addNode = useCallback(
    (type, targetParentId = null, index = -1) => {
      if (!activePage?.root) {
        return { ok: false, error: 'No active page found.' };
      }

      let parentId = targetParentId;
      let finalIndex = index;

      // Helper to find any container in the active tree that can accept `type`
      const findFirstValidContainer = (node) => {
        if (!node) return null;
        if (canNest(node.type, type)) return node.id;
        if (Array.isArray(node.children)) {
          for (const child of node.children) {
            const found = findFirstValidContainer(child);
            if (found) return found;
          }
        }
        return null;
      };

      // 1. If no parent specified, resolve based on current selection
      if (!parentId) {
        if (selectedNode) {
          if (canNest(selectedNode.type, type)) {
            parentId = selectedNode.id;
          } else {
            // Find parent of selected node
            const loc = findParent(activePage.root, selectedNode.id);
            if (loc && canNest(loc.parent.type, type)) {
              parentId = loc.parent.id;
              finalIndex = loc.index + 1;
            }
          }
        }

        // 2. Fallback to page root if allowed
        if (!parentId && canNest(activePage.root.type, type)) {
          parentId = activePage.root.id;
        }

        // 3. Fallback: Search the active page for the first container that can nest this component
        if (!parentId) {
          parentId = findFirstValidContainer(activePage.root);
        }
      }

      // 4. If root is Page and has no valid container yet, auto-create Section + Container to center component
      if (!parentId && activePage.root.type === 'Page') {
        const autoSection = createNode('Section', { name: 'New Section' });
        const autoContainer = createNode('Container', { name: 'Main Container' });
        const centerStyles = ['Heading', 'Text'].includes(type)
          ? { textAlign: 'center', margin: '0 auto' }
          : ['Button', 'Image'].includes(type)
            ? { margin: '0 auto' }
            : {};

        const newNode = createNode(type, { styles: centerStyles });
        autoContainer.children = [newNode];
        autoSection.children = [autoContainer];

        const newRoot = insertNode(activePage.root, activePage.root.id, autoSection, -1);
        setPageRoot(newRoot);
        setSelectedNodeId(newNode.id);

        setTimeout(() => {
          const el = document.querySelector(`[data-node-id="${newNode.id}"]`);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 80);

        if (onToast) onToast(`Added ${NODE_REGISTRY[type]?.label || type} (centered)`, 'success');
        return { ok: true, node: newNode };
      }

      if (!parentId) {
        const msg = `Cannot insert "${type}": select a valid container first.`;
        if (onToast) onToast(msg, 'error');
        return { ok: false, error: msg };
      }

      const parentNode = findNode(activePage.root, parentId);
      if (!parentNode) {
        return { ok: false, error: `Parent "${parentId}" not found.` };
      }

      if (!canNest(parentNode.type, type)) {
        const msg = `Nesting rejected: "${type}" cannot be placed inside "${parentNode.type}".`;
        if (onToast) onToast(msg, 'error');
        return { ok: false, error: msg };
      }

      // Centered styling for newly created component
      const centerStyles = ['Heading', 'Text'].includes(type)
        ? { textAlign: 'center', margin: '0 auto' }
        : ['Button', 'Image'].includes(type)
          ? { margin: '0 auto' }
          : {};

      const newNode = createNode(type, { styles: centerStyles });
      const newRoot = insertNode(activePage.root, parentId, newNode, finalIndex);

      setPageRoot(newRoot);
      setSelectedNodeId(newNode.id);

      setTimeout(() => {
        const el = document.querySelector(`[data-node-id="${newNode.id}"]`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 80);

      if (onToast) onToast(`Added ${NODE_REGISTRY[type]?.label || type}`, 'success');
      return { ok: true, node: newNode };
    },
    [activePage, selectedNode, setPageRoot, setSelectedNodeId, onToast]
  );

  /**
   * Command: removeNode
   * Removes targetId. Page root is strictly protected.
   */
  const removeNodeCmd = useCallback(
    (targetId) => {
      if (!activePage?.root) return { ok: false, error: 'No active page.' };

      if (targetId === activePage.root.id) {
        const msg = 'The page root cannot be deleted.';
        if (onToast) onToast(msg, 'error');
        return { ok: false, error: msg };
      }

      const loc = findParent(activePage.root, targetId);
      if (!loc) {
        return { ok: false, error: `Parent for "${targetId}" not found.` };
      }

      const newRoot = removeNode(activePage.root, targetId);
      setPageRoot(newRoot);

      // If deleted node was selected, select parent
      if (selectedNodeId === targetId) {
        setSelectedNodeId(loc.parent.id);
      }

      if (onToast) onToast('Element removed.', 'info');
      return { ok: true };
    },
    [activePage, selectedNodeId, setPageRoot, setSelectedNodeId, onToast]
  );

  /**
   * Command: duplicateNode
   * Duplicates targetId with new IDs and inserts right below original.
   */
  const duplicateNodeCmd = useCallback(
    (targetId) => {
      if (!activePage?.root) return { ok: false, error: 'No active page.' };

      if (targetId === activePage.root.id) {
        const msg = 'The page root cannot be duplicated.';
        if (onToast) onToast(msg, 'error');
        return { ok: false, error: msg };
      }

      try {
        const { newRoot, clonedNode } = modelDuplicateNode(activePage.root, targetId);
        setPageRoot(newRoot);
        setSelectedNodeId(clonedNode.id);
        if (onToast) onToast(`Duplicated ${clonedNode.name || clonedNode.type}`, 'success');
        return { ok: true, node: clonedNode };
      } catch (err) {
        if (onToast) onToast(err.message, 'error');
        return { ok: false, error: err.message };
      }
    },
    [activePage, setPageRoot, setSelectedNodeId, onToast]
  );

  /**
   * Command: moveNode
   * Re-parents or reorders targetId into newParentId at newIndex.
   */
  const moveNodeCmd = useCallback(
    (targetId, newParentId, newIndex = -1) => {
      if (!activePage?.root) return { ok: false, error: 'No active page.' };

      if (targetId === activePage.root.id) {
        return { ok: false, error: 'Cannot move the page root.' };
      }

      const target = findNode(activePage.root, targetId);
      const parent = findNode(activePage.root, newParentId);

      if (!target || !parent) {
        return { ok: false, error: 'Target or destination parent not found.' };
      }

      if (!canNest(parent.type, target.type)) {
        const msg = `Cannot place "${target.type}" inside "${parent.type}". Nesting not allowed.`;
        if (onToast) onToast(msg, 'error');
        return { ok: false, error: msg };
      }

      try {
        const newRoot = modelMoveNode(activePage.root, targetId, newParentId, newIndex);
        setPageRoot(newRoot);
        setSelectedNodeId(targetId);
        return { ok: true };
      } catch (err) {
        if (onToast) onToast(err.message, 'error');
        return { ok: false, error: err.message };
      }
    },
    [activePage, setPageRoot, setSelectedNodeId, onToast]
  );

  /**
   * Command: moveUp
   */
  const moveUpCmd = useCallback(
    (targetId) => {
      if (!activePage?.root || targetId === activePage.root.id) {
        return { ok: false, error: 'Cannot move root.' };
      }

      const newRoot = modelMoveUp(activePage.root, targetId);
      if (newRoot !== activePage.root) {
        setPageRoot(newRoot);
        return { ok: true };
      }
      return { ok: false, error: 'Already at top.' };
    },
    [activePage, setPageRoot]
  );

  /**
   * Command: moveDown
   */
  const moveDownCmd = useCallback(
    (targetId) => {
      if (!activePage?.root || targetId === activePage.root.id) {
        return { ok: false, error: 'Cannot move root.' };
      }

      const newRoot = modelMoveDown(activePage.root, targetId);
      if (newRoot !== activePage.root) {
        setPageRoot(newRoot);
        return { ok: true };
      }
      return { ok: false, error: 'Already at bottom.' };
    },
    [activePage, setPageRoot]
  );

  /**
   * Command: updateProps
   * Validates URLs and applies partial prop updates immutably.
   */
  const updatePropsCmd = useCallback(
    (targetId, propUpdates, debounceHistory = false) => {
      if (!activePage?.root) return { ok: false, error: 'No active page.' };

      // Validate URLs
      for (const [k, v] of Object.entries(propUpdates)) {
        if (['href', 'src', 'action', 'url'].includes(k.toLowerCase()) && typeof v === 'string') {
          if (!isSafeUrl(v)) {
            const msg = `Unsafe URL scheme in "${k}": only http, https, mailto, tel, /path, and #anchor are permitted.`;
            if (onToast) onToast(msg, 'error');
            return { ok: false, error: msg };
          }
        }
      }

      const newRoot = updateNode(activePage.root, targetId, { props: propUpdates });
      const groupKey = debounceHistory ? `prop_${targetId}` : null;
      setPageRoot(newRoot, groupKey);
      return { ok: true };
    },
    [activePage, setPageRoot, onToast]
  );

  /**
   * Command: updateStyles
   * Applies partial inline styles immutably.
   */
  const updateStylesCmd = useCallback(
    (targetId, styleUpdates, debounceHistory = false) => {
      if (!activePage?.root) return { ok: false, error: 'No active page.' };

      const newRoot = updateNode(activePage.root, targetId, { styles: styleUpdates });
      const groupKey = debounceHistory ? `style_${targetId}` : null;
      setPageRoot(newRoot, groupKey);
      return { ok: true };
    },
    [activePage, setPageRoot]
  );

  /**
   * Command: renameNode
   */
  const renameNodeCmd = useCallback(
    (targetId, newName) => {
      if (!activePage?.root) return { ok: false, error: 'No active page.' };
      const newRoot = updateNode(activePage.root, targetId, { name: newName });
      setPageRoot(newRoot);
      return { ok: true };
    },
    [activePage, setPageRoot]
  );

  /**
   * Command: updateNodeData
   * Updates props, styles, and/or name atomically in a single operation/history step.
   */
  const updateNodeDataCmd = useCallback(
    (targetId, dataUpdates, debounceHistory = false) => {
      if (!activePage?.root) return { ok: false, error: 'No active page.' };

      // Validate URLs in props if any
      if (dataUpdates?.props) {
        for (const [k, v] of Object.entries(dataUpdates.props)) {
          if (['href', 'src', 'action', 'url'].includes(k.toLowerCase()) && typeof v === 'string') {
            if (!isSafeUrl(v)) {
              const msg = `Unsafe URL scheme in "${k}": only http, https, mailto, tel, /path, and #anchor are permitted.`;
              if (onToast) onToast(msg, 'error');
              return { ok: false, error: msg };
            }
          }
        }
      }

      const newRoot = updateNode(activePage.root, targetId, dataUpdates);
      const groupKey = debounceHistory ? `data_${targetId}` : null;
      setPageRoot(newRoot, groupKey);
      return { ok: true };
    },
    [activePage, setPageRoot, onToast]
  );

  // =========================================================================
  // UNDO / REDO CONTROLS
  // =========================================================================

  const canUndo = past.length > 0;
  const canRedo = future.length > 0;

  const undo = useCallback(() => {
    if (past.length === 0) return;

    const previousProject = past[past.length - 1];
    const newPast = past.slice(0, past.length - 1);

    setPast(newPast);
    setFuture((prev) => [project, ...prev]);
    setProject(previousProject);
    setDirty(true);
    setSaveStatus('saving');

    // Re-verify selectedNode exists in previous document
    const prevHome = previousProject?.pages?.find((p) => p.isHome) || previousProject?.pages?.[0];
    if (prevHome && selectedNodeId) {
      const exists = findNode(prevHome.root, selectedNodeId);
      if (!exists) {
        setSelectedNodeId(prevHome.root.id);
      }
    }
    if (onToast) onToast('Undo', 'info');
  }, [past, future, project, selectedNodeId, setSelectedNodeId, onToast]);

  const redo = useCallback(() => {
    if (future.length === 0) return;

    const nextProject = future[0];
    const newFuture = future.slice(1);

    setFuture(newFuture);
    setPast((prev) => [...prev, project]);
    setProject(nextProject);
    setDirty(true);
    setSaveStatus('saving');

    const nextHome = nextProject?.pages?.find((p) => p.isHome) || nextProject?.pages?.[0];
    if (nextHome && selectedNodeId) {
      const exists = findNode(nextHome.root, selectedNodeId);
      if (!exists) {
        setSelectedNodeId(nextHome.root.id);
      }
    }
    if (onToast) onToast('Redo', 'info');
  }, [past, future, project, selectedNodeId, setSelectedNodeId, onToast]);

  // Explicit Save
  const saveNow = useCallback(async () => {
    if (!project) return;
    setSaveStatus('saving');
    try {
      await projectStorage.save(project);
      setSaveStatus('saved');
      setDirty(false);
      if (onToast) onToast('Project saved successfully!', 'success');
    } catch (err) {
      setSaveStatus('error');
      if (onToast) onToast(err.message || 'Save failed', 'error');
    }
  }, [project, onToast]);

  // =========================================================================
  // KEYBOARD SHORTCUTS LISTENER
  // =========================================================================

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Do not intercept keystrokes if typing inside inputs/textareas/contenteditable
      const target = e.target;
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);

      if (isInput) return;

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modKey = isMac ? e.metaKey : e.ctrlKey;

      // Undo: Ctrl/Cmd + Z
      if (modKey && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        undo();
        return;
      }

      // Redo: Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y
      if ((modKey && e.shiftKey && e.key.toLowerCase() === 'z') || (modKey && e.key.toLowerCase() === 'y')) {
        e.preventDefault();
        redo();
        return;
      }

      // Duplicate: Ctrl/Cmd + D
      if (modKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        if (selectedNodeId) {
          duplicateNodeCmd(selectedNodeId);
        }
        return;
      }

      // Delete: Delete or Backspace
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedNodeId) {
          e.preventDefault();
          removeNodeCmd(selectedNodeId);
        }
        return;
      }

      // Reorder Up: Alt + ArrowUp
      if (e.altKey && e.key === 'ArrowUp') {
        e.preventDefault();
        if (selectedNodeId) moveUpCmd(selectedNodeId);
        return;
      }

      // Reorder Down: Alt + ArrowDown
      if (e.altKey && e.key === 'ArrowDown') {
        e.preventDefault();
        if (selectedNodeId) moveDownCmd(selectedNodeId);
        return;
      }

      // Nudge component with Arrow keys: ArrowUp, ArrowDown, ArrowLeft, ArrowRight
      if (!e.altKey && !modKey && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        if (selectedNodeId && activePage?.root && selectedNodeId !== activePage.root.id) {
          e.preventDefault();
          const step = e.shiftKey ? 10 : 2;
          const targetNode = findNode(activePage.root, selectedNodeId);
          if (targetNode) {
            const currentTranslate = parseTranslate(targetNode.styles?.transform);
            let dx = 0;
            let dy = 0;
            if (e.key === 'ArrowLeft') dx = -step;
            if (e.key === 'ArrowRight') dx = step;
            if (e.key === 'ArrowUp') dy = -step;
            if (e.key === 'ArrowDown') dy = step;
            updateStylesCmd(
              selectedNodeId,
              {
                transform: `translate(${currentTranslate.x + dx}px, ${currentTranslate.y + dy}px)`,
              },
              true
            );
          }
        }
        return;
      }

      // Deselect: Escape
      if (e.key === 'Escape') {
        e.preventDefault();
        if (activePage?.root) {
          setSelectedNodeId(activePage.root.id);
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    undo,
    redo,
    selectedNodeId,
    duplicateNodeCmd,
    removeNodeCmd,
    moveUpCmd,
    moveDownCmd,
    activePage,
    setSelectedNodeId,
  ]);

  const value = {
    project,
    activePage,
    selectedNodeId,
    selectedNode,
    hoveredNodeId,
    dirty,
    saveStatus,
    canUndo,
    canRedo,
    setSelectedNodeId,
    setHoveredNodeId,
    // Commands
    addNode,
    removeNode: removeNodeCmd,
    duplicateNode: duplicateNodeCmd,
    moveNode: moveNodeCmd,
    moveUp: moveUpCmd,
    moveDown: moveDownCmd,
    updateProps: updatePropsCmd,
    updateStyles: updateStylesCmd,
    updateNodeData: updateNodeDataCmd,
    renameNode: renameNodeCmd,
    // History
    undo,
    redo,
    saveNow,
  };

  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
}

export function useEditorStore() {
  const context = useContext(EditorContext);
  if (!context) {
    throw new Error('useEditorStore must be used within an EditorProvider');
  }
  return context;
}
