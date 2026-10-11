/**
 * Craftify Labs - Editor State Architecture & Command Dispatcher
 *
 * Implements:
 * - Single source of truth (Project document model)
 * - Multi-page management (CRUD, unique slugs, home page designation, undoable commands)
 * - Breakpoints & Responsive style overrides (Desktop base, Tablet & Mobile overrides)
 * - Asset management integration (IndexedDB Blob storage, Object URL lifecycle)
 * - Pure health warnings computation & jump actions
 * - Immutable command dispatching with nesting rules enforcement
 * - Structural sharing Undo/Redo history stack with rapid-edit debounced grouping
 * - Ephemeral editor state (selectedNodeId, activePageId, activeBreakpoint, hoveredNodeId, dirty, saveStatus)
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
  cloneNode,
  generateId,
  moveNode as modelMoveNode,
  moveUp as modelMoveUp,
  moveDown as modelMoveDown,
  duplicateNode as modelDuplicateNode,
  canNest,
  validateProject,
  isSafeUrl,
  NODE_REGISTRY,
  generateSlug,
  validateSlug,
  collectWarnings,
} from '../model/index.js';
import { projectStorage } from '../storage/index.js';

const EditorContext = createContext(null);

const GROUPING_WINDOW_MS = 600;
const MAX_HISTORY = 50;

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

  // Active page state
  const [activePageId, setActivePageIdState] = useState(() => {
    return (
      initialProject?.pages?.find((p) => p.isHome)?.id ||
      initialProject?.pages?.[0]?.id ||
      null
    );
  });

  // Active breakpoint state ('desktop' | 'tablet' | 'mobile')
  const [activeBreakpoint, setActiveBreakpoint] = useState('desktop');

  // Ephemeral editor state
  const [selectedNodeId, setSelectedNodeIdState] = useState(() => {
    const page =
      initialProject?.pages?.find((p) => p.isHome) ||
      initialProject?.pages?.[0];
    return page?.root?.id || null;
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

  // Asset Blob Object URL map cache (assetId -> blobUrl)
  const assetBlobUrlsRef = useRef(new Map());
  const [, setAssetUrlTrigger] = useState(0);

  // Clean up Blob URLs on unmount to prevent memory leaks
  useEffect(() => {
    const cache = assetBlobUrlsRef.current;
    return () => {
      for (const url of cache.values()) {
        try {
          URL.revokeObjectURL(url);
        } catch {}
      }
      cache.clear();
    };
  }, []);

  // Active page derived memo
  const activePage = useMemo(() => {
    if (!project?.pages || project.pages.length === 0) return null;
    return (
      project.pages.find((p) => p.id === activePageId) ||
      project.pages.find((p) => p.isHome) ||
      project.pages[0] ||
      null
    );
  }, [project, activePageId]);

  // Selected node helper
  const selectedNode = useMemo(() => {
    if (!activePage?.root || !selectedNodeId) return null;
    return findNode(activePage.root, selectedNodeId);
  }, [activePage, selectedNodeId]);

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
          lastGroupActionRef.current = { key: groupKey, time: now };
        } else {
          setPast((prev) => {
            const nextPast = [...prev, currentProject];
            if (nextPast.length > MAX_HISTORY) {
              return nextPast.slice(nextPast.length - MAX_HISTORY);
            }
            return nextPast;
          });
          lastGroupActionRef.current = { key: groupKey, time: now };
        }

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
   * Updates the active page root node immutably and commits to document.
   */
  const setPageRoot = useCallback(
    (newRoot, groupKey = null) => {
      if (!activePage) return;
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
  // PAGE MANAGEMENT COMMANDS
  // =========================================================================

  /**
   * Switches the active page view and safely resets selection to its root node.
   */
  const setActivePage = useCallback(
    (pageId) => {
      const targetPage = project?.pages?.find((p) => p.id === pageId);
      if (!targetPage) return;
      setActivePageIdState(pageId);
      setSelectedNodeIdState(targetPage.root?.id || null);
    },
    [project]
  );

  /**
   * Helper to ensure unique path slug among project pages
   */
  const getUniquePath = useCallback(
    (baseSlug, excludePageId = null) => {
      const existingPaths = new Set(
        (project?.pages || [])
          .filter((p) => p.id !== excludePageId)
          .map((p) => p.path)
      );

      let candidate = baseSlug.startsWith('/') ? baseSlug : `/${baseSlug}`;
      if (!existingPaths.has(candidate)) return candidate;

      let counter = 2;
      while (existingPaths.has(`${candidate}-${counter}`)) {
        counter++;
      }
      return `${candidate}-${counter}`;
    },
    [project]
  );

  /**
   * Command: createPage
   * Creates a new page, copying the format and layout structure of Page 1 / base page by default.
   */
  const createPage = useCallback(
    (name, customPath = null, options = {}) => {
      const pageName = (name || '').trim() || 'Untitled Page';
      const rawSlug = customPath || generateSlug(pageName);
      const uniquePath = getUniquePath(rawSlug);

      const pathValidation = validateSlug(uniquePath, false);
      if (!pathValidation.valid) {
        if (onToast) onToast(pathValidation.error, 'error');
        return { ok: false, error: pathValidation.error };
      }

      const newPageId = generateId('page');

      // Determine template / format base (defaults to Page 1 if present)
      const basePageId = options?.copyFormatFromPageId;
      const basePage = basePageId
        ? project?.pages?.find((p) => p.id === basePageId)
        : (project?.pages && project.pages.length > 0 ? project.pages[0] : null);

      const shouldCopyFormat = options?.copyFormat !== false && basePage && basePage.root;

      let newPageRoot;
      if (shouldCopyFormat) {
        // Deep-clone the entire structure from Page 1 so it has the exact same format & styling
        const cloned = cloneNode(basePage.root);
        cloned.id = generateId('root');
        cloned.name = `${pageName} Root`;
        if (cloned.props) {
          cloned.props.title = pageName;
        }

        // Update the primary heading in the cloned page to match the new page title
        const updatePrimaryHeading = (node) => {
          if (!node) return false;
          if (node.type === 'Heading' && node.props) {
            node.props.text = pageName;
            return true;
          }
          if (Array.isArray(node.children)) {
            for (const child of node.children) {
              if (updatePrimaryHeading(child)) return true;
            }
          }
          return false;
        };
        updatePrimaryHeading(cloned);

        newPageRoot = cloned;
      } else {
        newPageRoot = createNode('Page', { name: `${pageName} Root` });
      }

      const newPage = {
        id: newPageId,
        name: pageName,
        path: uniquePath,
        isHome: false,
        title: pageName,
        metaDescription: '',
        root: newPageRoot,
      };

      const updatedProject = {
        ...project,
        project: {
          ...project.project,
          updatedAt: new Date().toISOString(),
        },
        pages: [...(project.pages || []), newPage],
      };

      commitDocument(updatedProject);
      setActivePageIdState(newPageId);
      setSelectedNodeIdState(newPage.root.id);

      if (onToast) onToast(`Page "${pageName}" created with same format.`, 'success');
      return { ok: true, page: newPage };
    },
    [project, commitDocument, getUniquePath, onToast]
  );

  /**
   * Command: renamePage
   */
  const renamePage = useCallback(
    (pageId, newName) => {
      const trimmed = (newName || '').trim();
      if (!trimmed) return { ok: false, error: 'Page name cannot be empty.' };

      const updatedPages = project.pages.map((p) => {
        if (p.id === pageId) {
          return { ...p, name: trimmed };
        }
        return p;
      });

      const updatedProject = {
        ...project,
        project: { ...project.project, updatedAt: new Date().toISOString() },
        pages: updatedPages,
      };

      commitDocument(updatedProject);
      return { ok: true };
    },
    [project, commitDocument]
  );

  /**
   * Command: updatePageSettings
   */
  const updatePageSettings = useCallback(
    (pageId, settings) => {
      const targetPage = project?.pages?.find((p) => p.id === pageId);
      if (!targetPage) return { ok: false, error: 'Page not found.' };

      let nextPath = settings.path !== undefined ? settings.path : targetPage.path;

      if (targetPage.isHome) {
        nextPath = '/';
      } else if (settings.path !== undefined) {
        const pathValidation = validateSlug(nextPath, false);
        if (!pathValidation.valid) {
          if (onToast) onToast(pathValidation.error, 'error');
          return { ok: false, error: pathValidation.error };
        }

        // Check path uniqueness
        const collision = project.pages.find(
          (p) => p.id !== pageId && p.path === nextPath
        );
        if (collision) {
          const err = `URL path "${nextPath}" is already used by "${collision.name}".`;
          if (onToast) onToast(err, 'error');
          return { ok: false, error: err };
        }
      }

      const updatedPages = project.pages.map((p) => {
        if (p.id === pageId) {
          return {
            ...p,
            name: settings.name !== undefined ? settings.name.trim() : p.name,
            path: nextPath,
            title: settings.title !== undefined ? settings.title : p.title,
            metaDescription:
              settings.metaDescription !== undefined
                ? settings.metaDescription
                : p.metaDescription,
          };
        }
        return p;
      });

      const updatedProject = {
        ...project,
        project: { ...project.project, updatedAt: new Date().toISOString() },
        pages: updatedPages,
      };

      commitDocument(updatedProject);
      if (onToast) onToast('Page settings updated.', 'success');
      return { ok: true };
    },
    [project, commitDocument, onToast]
  );

  /**
   * Command: duplicatePage (deep clones entire tree with all-new IDs)
   */
  const duplicatePage = useCallback(
    (pageId) => {
      const pageToDup = project?.pages?.find((p) => p.id === pageId);
      if (!pageToDup) return { ok: false, error: 'Page not found.' };

      const clonedRoot = cloneNode(pageToDup.root);
      const newPageId = generateId('page');
      const baseName = `${pageToDup.name} (Copy)`;
      const newPath = getUniquePath(`${pageToDup.path}-copy`);

      const newPage = {
        id: newPageId,
        name: baseName,
        path: newPath,
        isHome: false,
        title: pageToDup.title ? `${pageToDup.title} (Copy)` : baseName,
        metaDescription: pageToDup.metaDescription || '',
        root: clonedRoot,
      };

      const sourceIndex = project.pages.findIndex((p) => p.id === pageId);
      const nextPages = [...project.pages];
      nextPages.splice(sourceIndex + 1, 0, newPage);

      const updatedProject = {
        ...project,
        project: { ...project.project, updatedAt: new Date().toISOString() },
        pages: nextPages,
      };

      commitDocument(updatedProject);
      setActivePageIdState(newPageId);
      setSelectedNodeIdState(clonedRoot.id);

      if (onToast) onToast(`Duplicated "${pageToDup.name}".`, 'success');
      return { ok: true, page: newPage };
    },
    [project, commitDocument, getUniquePath, onToast]
  );

  /**
   * Query: find all nodes across all pages that link to pageId
   */
  const getLinkedNodesForPage = useCallback(
    (targetPageId) => {
      const matches = [];
      if (!project?.pages) return matches;

      const scan = (node, pId, pName) => {
        if (!node) return;
        if (
          node.props?.linkTarget &&
          node.props.linkTarget.type === 'page' &&
          node.props.linkTarget.pageId === targetPageId
        ) {
          matches.push({
            pageId: pId,
            pageName: pName,
            nodeId: node.id,
            nodeName: node.name || node.type,
            nodeType: node.type,
          });
        }
        if (Array.isArray(node.children)) {
          for (const child of node.children) scan(child, pId, pName);
        }
      };

      for (const p of project.pages) {
        if (p.root) scan(p.root, p.id, p.name);
      }
      return matches;
    },
    [project]
  );

  /**
   * Command: deletePage
   */
  const deletePage = useCallback(
    (pageId) => {
      if (!project?.pages || project.pages.length <= 1) {
        const msg = 'The last remaining page cannot be deleted.';
        if (onToast) onToast(msg, 'error');
        return { ok: false, error: msg };
      }

      const pageToDelete = project.pages.find((p) => p.id === pageId);
      if (!pageToDelete) return { ok: false, error: 'Page not found.' };

      if (pageToDelete.isHome) {
        const msg = 'The home page cannot be deleted until another page is set as home.';
        if (onToast) onToast(msg, 'error');
        return { ok: false, error: msg };
      }

      // Clean up internal links targeting this deleted page across all remaining pages
      const cleanLinksInTree = (node) => {
        if (!node) return node;
        let updatedProps = node.props;
        if (
          node.props?.linkTarget &&
          node.props.linkTarget.type === 'page' &&
          node.props.linkTarget.pageId === pageId
        ) {
          updatedProps = {
            ...node.props,
            linkTarget: { type: 'none' },
          };
        }
        const updatedChildren = Array.isArray(node.children)
          ? node.children.map(cleanLinksInTree)
          : [];
        return {
          ...node,
          props: updatedProps,
          children: updatedChildren,
        };
      };

      const nextPages = project.pages
        .filter((p) => p.id !== pageId)
        .map((p) => ({
          ...p,
          root: cleanLinksInTree(p.root),
        }));

      // If active page was deleted, switch to home page
      const nextActivePage =
        nextPages.find((p) => p.isHome) || nextPages[0];

      const updatedProject = {
        ...project,
        project: { ...project.project, updatedAt: new Date().toISOString() },
        pages: nextPages,
      };

      commitDocument(updatedProject);
      if (activePageId === pageId) {
        setActivePageIdState(nextActivePage.id);
        setSelectedNodeIdState(nextActivePage.root?.id || null);
      }

      if (onToast) onToast(`Page "${pageToDelete.name}" deleted.`, 'info');
      return { ok: true };
    },
    [project, activePageId, commitDocument, onToast]
  );

  /**
   * Command: setHomePage
   */
  const setHomePage = useCallback(
    (pageId) => {
      const targetPage = project?.pages?.find((p) => p.id === pageId);
      if (!targetPage) return { ok: false, error: 'Page not found.' };
      if (targetPage.isHome) return { ok: true };

      const prevHome = project.pages.find((p) => p.isHome);
      const updatedPages = project.pages.map((p) => {
        if (p.id === pageId) {
          return { ...p, isHome: true, path: '/' };
        }
        if (p.isHome) {
          // Reassign previous home a unique slug based on its name
          const slug = getUniquePath(generateSlug(p.name || 'home'), pageId);
          return { ...p, isHome: false, path: slug };
        }
        return p;
      });

      const updatedProject = {
        ...project,
        project: { ...project.project, updatedAt: new Date().toISOString() },
        pages: updatedPages,
      };

      commitDocument(updatedProject);
      if (onToast) onToast(`"${targetPage.name}" set as home page.`, 'success');
      return { ok: true };
    },
    [project, commitDocument, getUniquePath, onToast]
  );

  /**
   * Command: reorderPages
   */
  const reorderPages = useCallback(
    (fromIndex, toIndex) => {
      if (
        fromIndex < 0 ||
        fromIndex >= project.pages.length ||
        toIndex < 0 ||
        toIndex >= project.pages.length
      ) {
        return;
      }
      const nextPages = [...project.pages];
      const [moved] = nextPages.splice(fromIndex, 1);
      nextPages.splice(toIndex, 0, moved);

      const updatedProject = {
        ...project,
        project: { ...project.project, updatedAt: new Date().toISOString() },
        pages: nextPages,
      };

      commitDocument(updatedProject);
    },
    [project, commitDocument]
  );

  const movePageUp = useCallback(
    (pageId) => {
      const idx = project.pages.findIndex((p) => p.id === pageId);
      if (idx > 0) reorderPages(idx, idx - 1);
    },
    [project, reorderPages]
  );

  const movePageDown = useCallback(
    (pageId) => {
      const idx = project.pages.findIndex((p) => p.id === pageId);
      if (idx !== -1 && idx < project.pages.length - 1) {
        reorderPages(idx, idx + 1);
      }
    },
    [project, reorderPages]
  );

  // =========================================================================
  // TYPED EDITOR COMMANDS
  // =========================================================================

  /**
   * Command: addNode
   */
  const addNode = useCallback(
    (type, targetParentId = null, index = -1, customOverrides = {}) => {
      if (!activePage?.root) {
        return { ok: false, error: 'No active page found.' };
      }

      let parentId = targetParentId;
      let finalIndex = index;

      const isTextType = ['Heading', 'Text'].includes(type);

      // When creating text (Heading or Text) or when createSectionAndContainer is explicitly requested:
      // ALWAYS auto-create Section -> Container -> Text/Heading on the page!
      const shouldCreateSectionAndContainer =
        customOverrides?.createSectionAndContainer ||
        (!targetParentId && isTextType) ||
        (targetParentId === activePage.root.id && isTextType);

      if (shouldCreateSectionAndContainer && activePage.root.type === 'Page') {
        const autoSection = createNode('Section', { name: 'Section' });
        const autoContainer = createNode('Container', { name: 'Container' });
        const centerStyles = { textAlign: 'center', margin: '0 auto' };
        const newNode = createNode(type, {
          ...customOverrides,
          styles: {
            ...centerStyles,
            ...(customOverrides.styles || {}),
          },
        });
        autoContainer.children.push(newNode);
        autoSection.children.push(autoContainer);

        const newRoot = {
          ...activePage.root,
          children: [...(activePage.root.children || []), autoSection],
        };

        setPageRoot(newRoot);
        setSelectedNodeId(newNode.id);

        setTimeout(() => {
          const el = document.querySelector(`[data-node-id="${newNode.id}"]`);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 80);

        if (onToast) onToast(`Created Section > Container > ${newNode.name || type}`, 'success');
        return { ok: true, node: newNode, section: autoSection, container: autoContainer };
      }

      const isShapeNode = (node) => {
        if (!node) return false;
        const SHAPE_NAMES = ['Rectangle', 'Line', 'Arrow', 'Ellipse', 'Polygon', 'Star', 'Image'];
        return (
          SHAPE_NAMES.includes(node.name) ||
          node.styles?.position === 'absolute' ||
          Boolean(node.styles?.clipPath)
        );
      };

      const findFirstValidContainer = (node) => {
        if (!node) return null;
        if (canNest(node.type, type) && !isShapeNode(node)) return node.id;
        if (Array.isArray(node.children)) {
          for (const child of node.children) {
            const found = findFirstValidContainer(child);
            if (found) return found;
          }
        }
        return null;
      };

      const isTextOrMedia = ['Heading', 'Text', 'Button', 'Image'].includes(type);

      if (!parentId) {
        if (selectedNode) {
          // If selectedNode is a shape, never dump text or elements inside it unless explicitly targeted
          if (isShapeNode(selectedNode)) {
            parentId = null;
          } else if (canNest(selectedNode.type, type)) {
            parentId = selectedNode.id;
          } else {
            const loc = findParent(activePage.root, selectedNode.id);
            if (loc && canNest(loc.parent.type, type) && !isShapeNode(loc.parent)) {
              parentId = loc.parent.id;
              finalIndex = loc.index + 1;
            }
          }
        }

        if (!parentId && canNest(activePage.root.type, type)) {
          parentId = activePage.root.id;
        }

        // Never eagerly dump text or media into arbitrary first container
        if (!parentId && !isTextOrMedia) {
          parentId = findFirstValidContainer(activePage.root);
        }
      }

      // If user selected a Section and is adding text without a container, create a Container inside that Section
      if (!parentId && selectedNode?.type === 'Section' && !customOverrides?.createSectionAndContainer) {
        const autoContainer = createNode('Container', { name: 'Main Container' });
        const centerStyles = ['Heading', 'Text'].includes(type)
          ? { textAlign: 'center', margin: '0 auto' }
          : ['Button', 'Image'].includes(type)
            ? { margin: '0 auto' }
            : {};
        const newNode = createNode(type, {
          ...customOverrides,
          styles: {
            ...centerStyles,
            ...(customOverrides.styles || {}),
          },
        });
        autoContainer.children.push(newNode);
        const newRoot = insertNode(activePage.root, selectedNode.id, autoContainer);

        setPageRoot(newRoot);
        setSelectedNodeId(newNode.id);

        setTimeout(() => {
          const el = document.querySelector(`[data-node-id="${newNode.id}"]`);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 80);

        if (onToast) onToast(`Added ${customOverrides.name || NODE_REGISTRY[type]?.label || type} (with Container)`, 'success');
        return { ok: true, node: newNode };
      }

      if (!parentId && activePage.root.type === 'Page') {
        const autoSection = createNode('Section', { name: 'New Section' });
        const autoContainer = createNode('Container', { name: 'Main Container' });
        const centerStyles = ['Heading', 'Text'].includes(type)
          ? { textAlign: 'center', margin: '0 auto' }
          : ['Button', 'Image'].includes(type)
            ? { margin: '0 auto' }
            : {};
        const newNode = createNode(type, {
          ...customOverrides,
          styles: {
            ...centerStyles,
            ...(customOverrides.styles || {}),
          },
        });
        autoContainer.children.push(newNode);
        autoSection.children.push(autoContainer);

        const newRoot = {
          ...activePage.root,
          children: [...(activePage.root.children || []), autoSection],
        };

        setPageRoot(newRoot);
        setSelectedNodeId(newNode.id);

        setTimeout(() => {
          const el = document.querySelector(`[data-node-id="${newNode.id}"]`);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 80);

        if (onToast) onToast(`Added ${customOverrides.name || NODE_REGISTRY[type]?.label || type} (Section & Container)`, 'success');
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

      const centerStyles = ['Heading', 'Text'].includes(type)
        ? { textAlign: 'center', margin: '0 auto' }
        : ['Button', 'Image'].includes(type)
          ? { margin: '0 auto' }
          : {};

      const newNode = createNode(type, {
        ...customOverrides,
        styles: {
          ...centerStyles,
          ...(customOverrides.styles || {}),
        },
      });
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
   */
  const updatePropsCmd = useCallback(
    (targetId, propUpdates, debounceHistory = false) => {
      if (!activePage?.root) return { ok: false, error: 'No active page.' };

      // Validate legacy URL strings if any
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
   * In desktop mode: writes to base `styles`.
   * In tablet or mobile mode: writes ONLY to `responsiveStyles[activeBreakpoint]`.
   */
  const updateStylesCmd = useCallback(
    (targetId, styleUpdates, debounceHistory = false) => {
      if (!activePage?.root) return { ok: false, error: 'No active page.' };

      const targetNode = findNode(activePage.root, targetId);
      if (!targetNode) return { ok: false, error: 'Node not found.' };

      let newRoot;
      if (activeBreakpoint === 'desktop') {
        newRoot = updateNode(activePage.root, targetId, { styles: styleUpdates });
      } else {
        const currentResp = targetNode.responsiveStyles || { tablet: {}, mobile: {} };
        const bpOverrides = { ...(currentResp[activeBreakpoint] || {}), ...styleUpdates };
        // Clean undefined or empty string values
        for (const [k, v] of Object.entries(bpOverrides)) {
          if (v === '' || v === undefined) delete bpOverrides[k];
        }
        const updatedResp = {
          ...currentResp,
          [activeBreakpoint]: bpOverrides,
        };
        newRoot = updateNode(activePage.root, targetId, { responsiveStyles: updatedResp });
      }

      const groupKey = debounceHistory ? `style_${targetId}_${activeBreakpoint}` : null;
      setPageRoot(newRoot, groupKey);
      return { ok: true };
    },
    [activePage, activeBreakpoint, setPageRoot]
  );

  /**
   * Command: resetStyleOverride
   * Removes a specific style key from a breakpoint's override.
   */
  const resetStyleOverrideCmd = useCallback(
    (targetId, styleKey, breakpoint = activeBreakpoint) => {
      if (!activePage?.root || breakpoint === 'desktop') return { ok: true };

      const targetNode = findNode(activePage.root, targetId);
      if (!targetNode) return { ok: false, error: 'Node not found.' };

      const currentResp = targetNode.responsiveStyles || { tablet: {}, mobile: {} };
      const bpOverrides = { ...(currentResp[breakpoint] || {}) };
      delete bpOverrides[styleKey];

      const updatedResp = {
        ...currentResp,
        [breakpoint]: bpOverrides,
      };

      const newRoot = updateNode(activePage.root, targetId, { responsiveStyles: updatedResp });
      setPageRoot(newRoot);
      return { ok: true };
    },
    [activePage, activeBreakpoint, setPageRoot]
  );

  /**
   * Command: setResponsiveVisibility
   * Toggles hidden (display: none) override on a breakpoint.
   */
  const setResponsiveVisibilityCmd = useCallback(
    (targetId, breakpoint = activeBreakpoint, isHidden = true) => {
      if (!activePage?.root) return { ok: false, error: 'No active page.' };

      if (breakpoint === 'desktop') {
        const styleUpdate = { display: isHidden ? 'none' : '' };
        return updateStylesCmd(targetId, styleUpdate);
      }

      const targetNode = findNode(activePage.root, targetId);
      if (!targetNode) return { ok: false, error: 'Node not found.' };

      const currentResp = targetNode.responsiveStyles || { tablet: {}, mobile: {} };
      const bpOverrides = { ...(currentResp[breakpoint] || {}) };
      if (isHidden) {
        bpOverrides.display = 'none';
      } else {
        delete bpOverrides.display;
      }

      const updatedResp = {
        ...currentResp,
        [breakpoint]: bpOverrides,
      };

      const newRoot = updateNode(activePage.root, targetId, { responsiveStyles: updatedResp });
      setPageRoot(newRoot);
      return { ok: true };
    },
    [activePage, activeBreakpoint, updateStylesCmd, setPageRoot]
  );

  /**
   * Command: stackOnMobile
   * Inspector shortcut: sets mobile flexDirection to column (or grid columns to 1).
   */
  const stackOnMobileCmd = useCallback(
    (targetId) => {
      if (!activePage?.root) return { ok: false, error: 'No active page.' };
      const targetNode = findNode(activePage.root, targetId);
      if (!targetNode) return { ok: false, error: 'Node not found.' };

      const currentResp = targetNode.responsiveStyles || { tablet: {}, mobile: {} };
      const mobileOverrides = { ...(currentResp.mobile || {}) };

      if (targetNode.type === 'Grid') {
        mobileOverrides.gridTemplateColumns = '1fr';
      } else {
        mobileOverrides.flexDirection = 'column';
      }

      const updatedResp = {
        ...currentResp,
        mobile: mobileOverrides,
      };

      const newRoot = updateNode(activePage.root, targetId, { responsiveStyles: updatedResp });
      setPageRoot(newRoot);
      if (onToast) onToast('Mobile stack layout applied.', 'success');
      return { ok: true };
    },
    [activePage, setPageRoot, onToast]
  );

  const renameNodeCmd = useCallback(
    (targetId, newName) => {
      if (!activePage?.root) return { ok: false, error: 'No active page.' };
      const newRoot = updateNode(activePage.root, targetId, { name: newName });
      setPageRoot(newRoot);
      return { ok: true };
    },
    [activePage, setPageRoot]
  );

  const updateNodeDataCmd = useCallback(
    (targetId, dataUpdates, debounceHistory = false) => {
      if (!activePage?.root) return { ok: false, error: 'No active page.' };

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
  // ASSET MANAGEMENT OPERATIONS
  // =========================================================================

  /**
   * Resolves a Blob URL for an assetId (cached in memory and revoked on cleanup)
   */
  const getAssetBlobUrl = useCallback(
    (assetId) => {
      if (!assetId) return null;
      if (assetBlobUrlsRef.current.has(assetId)) {
        return assetBlobUrlsRef.current.get(assetId);
      }
      // Async load from IndexedDB
      projectStorage
        .getAssetBlob(assetId)
        .then((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            assetBlobUrlsRef.current.set(assetId, url);
            setAssetUrlTrigger((v) => v + 1);
          }
        })
        .catch(() => {});
      return null;
    },
    []
  );

  /**
   * Uploads an asset file to IndexedDB and records asset metadata in project.assets
   */
  const uploadAsset = useCallback(
    async (file) => {
      const pId = project?.project?.id || project?.id || 'default_project';
      const oId = project?.project?.ownerId || project?.ownerId || 'local_user';

      try {
        const savedMeta = await projectStorage.saveAsset(pId, oId, file);
        // Cache blob URL immediately
        const blobUrl = URL.createObjectURL(file);
        assetBlobUrlsRef.current.set(savedMeta.id, blobUrl);

        const currentAssets = project.assets || [];
        const nextAssets = [...currentAssets, savedMeta];

        const updatedProject = {
          ...project,
          project: { ...project.project, updatedAt: new Date().toISOString() },
          assets: nextAssets,
        };

        commitDocument(updatedProject);
        if (onToast) onToast(`Asset "${savedMeta.filename}" uploaded.`, 'success');
        return { ok: true, asset: savedMeta, blobUrl };
      } catch (err) {
        if (onToast) onToast(err.message || 'Asset upload failed.', 'error');
        return { ok: false, error: err.message };
      }
    },
    [project, commitDocument, onToast]
  );

  /**
   * Deletes an asset record from project and removes blob from IndexedDB
   */
  const deleteAsset = useCallback(
    async (assetId) => {
      try {
        await projectStorage.deleteAsset(assetId);
        if (assetBlobUrlsRef.current.has(assetId)) {
          try {
            URL.revokeObjectURL(assetBlobUrlsRef.current.get(assetId));
          } catch {}
          assetBlobUrlsRef.current.delete(assetId);
        }

        const nextAssets = (project.assets || []).filter((a) => a.id !== assetId);
        const updatedProject = {
          ...project,
          project: { ...project.project, updatedAt: new Date().toISOString() },
          assets: nextAssets,
        };

        commitDocument(updatedProject);
        if (onToast) onToast('Asset removed.', 'info');
        return { ok: true };
      } catch (err) {
        if (onToast) onToast(err.message || 'Asset deletion failed.', 'error');
        return { ok: false, error: err.message };
      }
    },
    [project, commitDocument, onToast]
  );

  /**
   * Updates asset metadata (e.g. filename, altText)
   */
  const updateAssetMeta = useCallback(
    (assetId, metaUpdates) => {
      const nextAssets = (project.assets || []).map((a) => {
        if (a.id === assetId) {
          return { ...a, ...metaUpdates };
        }
        return a;
      });

      const updatedProject = {
        ...project,
        project: { ...project.project, updatedAt: new Date().toISOString() },
        assets: nextAssets,
      };

      commitDocument(updatedProject);
      return { ok: true };
    },
    [project, commitDocument]
  );

  // =========================================================================
  // HEALTH WARNINGS COMPUTATION
  // =========================================================================

  const warnings = useMemo(() => {
    if (!project) return [];
    return collectWarnings(project, activeBreakpoint);
  }, [project, activeBreakpoint]);

  const jumpToWarning = useCallback(
    (warning) => {
      if (!warning) return;
      if (warning.pageId && warning.pageId !== activePage?.id) {
        setActivePage(warning.pageId);
      }
      if (warning.nodeId) {
        setSelectedNodeId(warning.nodeId);
        setTimeout(() => {
          const el = document.querySelector(`[data-node-id="${warning.nodeId}"]`);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
      }
    },
    [activePage, setActivePage, setSelectedNodeId]
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

    // Safely re-verify active page and selectedNode in restored document
    const restoredPage =
      previousProject.pages?.find((p) => p.id === activePageId) ||
      previousProject.pages?.find((p) => p.isHome) ||
      previousProject.pages?.[0];

    if (restoredPage) {
      if (restoredPage.id !== activePageId) {
        setActivePageIdState(restoredPage.id);
      }
      if (selectedNodeId) {
        const exists = findNode(restoredPage.root, selectedNodeId);
        if (!exists) {
          setSelectedNodeId(restoredPage.root?.id || null);
        }
      }
    }

    if (onToast) onToast('Undo', 'info');
  }, [past, future, project, activePageId, selectedNodeId, setSelectedNodeId, onToast]);

  const redo = useCallback(() => {
    if (future.length === 0) return;

    const nextProject = future[0];
    const newFuture = future.slice(1);

    setFuture(newFuture);
    setPast((prev) => [...prev, project]);
    setProject(nextProject);
    setDirty(true);
    setSaveStatus('saving');

    const restoredPage =
      nextProject.pages?.find((p) => p.id === activePageId) ||
      nextProject.pages?.find((p) => p.isHome) ||
      nextProject.pages?.[0];

    if (restoredPage) {
      if (restoredPage.id !== activePageId) {
        setActivePageIdState(restoredPage.id);
      }
      if (selectedNodeId) {
        const exists = findNode(restoredPage.root, selectedNodeId);
        if (!exists) {
          setSelectedNodeId(restoredPage.root?.id || null);
        }
      }
    }

    if (onToast) onToast('Redo', 'info');
  }, [past, future, project, activePageId, selectedNodeId, setSelectedNodeId, onToast]);

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
  // KEYBOARD SHORTCUTS
  // =========================================================================

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

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modKey = isMac ? e.metaKey : e.ctrlKey;

      // Undo: Ctrl/Cmd + Z
      if (modKey && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        undo();
        return;
      }

      // Redo: Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y
      if (
        (modKey && e.shiftKey && e.key.toLowerCase() === 'z') ||
        (modKey && e.key.toLowerCase() === 'y')
      ) {
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

      // Nudge component with Arrow keys
      if (
        !e.altKey &&
        !modKey &&
        ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)
      ) {
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
    updateStylesCmd,
    activePage,
    setSelectedNodeId,
  ]);

  const value = {
    project,
    activePage,
    activePageId,
    activeBreakpoint,
    selectedNodeId,
    selectedNode,
    hoveredNodeId,
    dirty,
    saveStatus,
    canUndo,
    canRedo,
    setSelectedNodeId,
    setHoveredNodeId,
    setActivePage,
    setActiveBreakpoint,
    // Page Commands
    createPage,
    renamePage,
    updatePageSettings,
    duplicatePage,
    deletePage,
    setHomePage,
    reorderPages,
    movePageUp,
    movePageDown,
    getLinkedNodesForPage,
    // Node Commands
    addNode,
    removeNode: removeNodeCmd,
    duplicateNode: duplicateNodeCmd,
    moveNode: moveNodeCmd,
    moveUp: moveUpCmd,
    moveDown: moveDownCmd,
    updateProps: updatePropsCmd,
    updateStyles: updateStylesCmd,
    resetStyleOverride: resetStyleOverrideCmd,
    setResponsiveVisibility: setResponsiveVisibilityCmd,
    stackOnMobile: stackOnMobileCmd,
    updateNodeData: updateNodeDataCmd,
    renameNode: renameNodeCmd,
    // Asset Management
    uploadAsset,
    deleteAsset,
    updateAssetMeta,
    getAssetBlobUrl,
    // Warnings
    warnings,
    jumpToWarning,
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
