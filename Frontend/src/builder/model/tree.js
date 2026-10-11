/**
 * Craftify Labs - Immutable Node Tree Operations
 * Pure helper functions for querying and transforming the document tree without mutations.
 */

import { generateId } from './id.js';
import { NODE_REGISTRY, HEADING_LEVEL_DEFAULTS } from './registry.js';
import {
  NODE_TYPES,
  createDefaultResponsiveStyles,
  createDefaultAnimationConfig,
} from './types.js';

/**
 * Creates a new node initialized with registry defaults.
 * @param {string} type
 * @param {object} [overrides={}]
 * @returns {object}
 */
export function createNode(type, overrides = {}) {
  if (!NODE_TYPES.includes(type)) {
    throw new Error(`Unsupported node type: "${type}"`);
  }

  const def = NODE_REGISTRY[type];
  const headingDefaults =
    type === 'Heading'
      ? HEADING_LEVEL_DEFAULTS[(overrides.props?.level || def.defaultProps?.level || 'h2').toLowerCase()] || {}
      : {};

  const node = {
    id: overrides.id || generateId(type.toLowerCase()),
    type,
    name: overrides.name || def.label,
    props: {
      ...def.defaultProps,
      ...(overrides.props || {}),
    },
    styles: {
      ...def.defaultStyles,
      ...headingDefaults,
      ...(overrides.styles || {}),
    },
    responsiveStyles: overrides.responsiveStyles || createDefaultResponsiveStyles(),
    children: overrides.children ? [...overrides.children] : [],
    animation: overrides.animation || createDefaultAnimationConfig(),
    interactions: overrides.interactions ? [...overrides.interactions] : [],
  };

  return node;
}

/**
 * Recursively locates a node by ID.
 * @param {object} rootNode
 * @param {string} targetId
 * @returns {object|null}
 */
export function findNode(rootNode, targetId) {
  if (!rootNode || typeof rootNode !== 'object') return null;
  if (rootNode.id === targetId) return rootNode;

  if (Array.isArray(rootNode.children)) {
    for (const child of rootNode.children) {
      const found = findNode(child, targetId);
      if (found) return found;
    }
  }

  return null;
}

/**
 * Recursively locates the parent of a node by targetId.
 * @param {object} rootNode
 * @param {string} targetId
 * @returns {{ parent: object, index: number }|null}
 */
export function findParent(rootNode, targetId) {
  if (!rootNode || !Array.isArray(rootNode.children)) return null;

  const childIndex = rootNode.children.findIndex((c) => c.id === targetId);
  if (childIndex !== -1) {
    return { parent: rootNode, index: childIndex };
  }

  for (const child of rootNode.children) {
    const found = findParent(child, targetId);
    if (found) return found;
  }

  return null;
}

/**
 * Inserts a node into parentId at the specified index.
 * Returns a new immutable rootNode.
 * @param {object} rootNode
 * @param {string} parentId
 * @param {object} nodeToInsert
 * @param {number} [index=-1]
 * @returns {object}
 */
export function insertNode(rootNode, parentId, nodeToInsert, index = -1) {
  if (!rootNode) return rootNode;

  if (rootNode.id === parentId) {
    const newChildren = [...(rootNode.children || [])];
    if (index >= 0 && index <= newChildren.length) {
      newChildren.splice(index, 0, nodeToInsert);
    } else {
      newChildren.push(nodeToInsert);
    }
    return {
      ...rootNode,
      children: newChildren,
    };
  }

  if (!Array.isArray(rootNode.children)) {
    return rootNode;
  }

  return {
    ...rootNode,
    children: rootNode.children.map((child) =>
      insertNode(child, parentId, nodeToInsert, index)
    ),
  };
}

/**
 * Removes a node by ID from the tree.
 * Returns a new immutable rootNode, or null if root itself is removed.
 * @param {object} rootNode
 * @param {string} targetId
 * @returns {object|null}
 */
export function removeNode(rootNode, targetId) {
  if (!rootNode) return null;
  if (rootNode.id === targetId) return null;

  if (!Array.isArray(rootNode.children)) {
    return rootNode;
  }

  return {
    ...rootNode,
    children: rootNode.children
      .filter((child) => child.id !== targetId)
      .map((child) => removeNode(child, targetId)),
  };
}

/**
 * Updates a node by targetId with partial updates (props, styles, name, etc.).
 * Returns a new immutable rootNode.
 * @param {object} rootNode
 * @param {string} targetId
 * @param {object} updates
 * @returns {object}
 */
export function updateNode(rootNode, targetId, updates) {
  if (!rootNode) return rootNode;

  if (rootNode.id === targetId) {
    return {
      ...rootNode,
      ...updates,
      props: {
        ...rootNode.props,
        ...(updates.props || {}),
      },
      styles: {
        ...rootNode.styles,
        ...(updates.styles || {}),
      },
      responsiveStyles: {
        ...rootNode.responsiveStyles,
        ...(updates.responsiveStyles || {}),
      },
      children: updates.children !== undefined ? updates.children : rootNode.children,
    };
  }

  if (!Array.isArray(rootNode.children)) {
    return rootNode;
  }

  return {
    ...rootNode,
    children: rootNode.children.map((child) => updateNode(child, targetId, updates)),
  };
}

/**
 * Moves a node from its current position to a new parent at newIndex.
 * Returns a new immutable rootNode.
 * @param {object} rootNode
 * @param {string} targetId
 * @param {string} newParentId
 * @param {number} [newIndex=-1]
 * @returns {object}
 */
export function moveNode(rootNode, targetId, newParentId, newIndex = -1) {
  const target = findNode(rootNode, targetId);
  if (!target) {
    throw new Error(`Node with id "${targetId}" not found in tree.`);
  }

  // Prevent moving a node into itself or its descendants
  const insideTarget = findNode(target, newParentId);
  if (insideTarget) {
    throw new Error(`Cannot move node "${targetId}" inside its own descendant "${newParentId}".`);
  }

  const pruned = removeNode(rootNode, targetId);
  return insertNode(pruned, newParentId, target, newIndex);
}

/**
 * Deep clones a node subtree, assigning fresh, unique IDs to every node.
 * @param {object} node
 * @returns {object}
 */
export function cloneNode(node) {
  if (!node || typeof node !== 'object') return node;

  const newId = generateId(node.type ? node.type.toLowerCase() : 'clone');
  const clonedChildren = Array.isArray(node.children)
    ? node.children.map((child) => cloneNode(child))
    : [];

  return {
    ...node,
    id: newId,
    name: node.name ? `${node.name} (Copy)` : undefined,
    props: JSON.parse(JSON.stringify(node.props || {})),
    styles: JSON.parse(JSON.stringify(node.styles || {})),
    responsiveStyles: JSON.parse(JSON.stringify(node.responsiveStyles || createDefaultResponsiveStyles())),
    children: clonedChildren,
    animation: node.animation ? { ...node.animation } : createDefaultAnimationConfig(),
    interactions: node.interactions ? JSON.parse(JSON.stringify(node.interactions)) : [],
  };
}

/**
 * Moves a node up one position among its siblings within the same parent.
 * Returns the new immutable rootNode, or original rootNode if already at top.
 * @param {object} rootNode
 * @param {string} targetId
 * @returns {object}
 */
export function moveUp(rootNode, targetId) {
  const loc = findParent(rootNode, targetId);
  if (!loc || loc.index <= 0) return rootNode;

  const { parent, index } = loc;
  const newChildren = [...parent.children];
  const temp = newChildren[index];
  newChildren[index] = newChildren[index - 1];
  newChildren[index - 1] = temp;

  return updateNode(rootNode, parent.id, { children: newChildren });
}

/**
 * Moves a node down one position among its siblings within the same parent.
 * Returns the new immutable rootNode, or original rootNode if already at bottom.
 * @param {object} rootNode
 * @param {string} targetId
 * @returns {object}
 */
export function moveDown(rootNode, targetId) {
  const loc = findParent(rootNode, targetId);
  if (!loc || loc.index >= loc.parent.children.length - 1) return rootNode;

  const { parent, index } = loc;
  const newChildren = [...parent.children];
  const temp = newChildren[index];
  newChildren[index] = newChildren[index + 1];
  newChildren[index + 1] = temp;

  return updateNode(rootNode, parent.id, { children: newChildren });
}

/**
 * Duplicates a node in place (right after the original) with fresh IDs.
 * Returns { newRoot, clonedNode }.
 * @param {object} rootNode
 * @param {string} targetId
 * @returns {{ newRoot: object, clonedNode: object }}
 */
export function duplicateNode(rootNode, targetId) {
  if (rootNode.id === targetId) {
    throw new Error('Cannot duplicate the page root node.');
  }

  const target = findNode(rootNode, targetId);
  if (!target) {
    throw new Error(`Node "${targetId}" not found in tree.`);
  }

  const loc = findParent(rootNode, targetId);
  if (!loc) {
    throw new Error(`Parent of node "${targetId}" not found.`);
  }

  const cloned = cloneNode(target);
  const newRoot = insertNode(rootNode, loc.parent.id, cloned, loc.index + 1);
  return { newRoot, clonedNode: cloned };
}

