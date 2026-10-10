/**
 * Craftify Labs - Document Model Validation & Migration
 * Enforces strict schema integrity, node hierarchy rules, and URL security policies.
 */

import { SCHEMA_VERSION, NODE_TYPES } from './types.js';
import { NODE_REGISTRY, canNest } from './registry.js';

/**
 * Validates whether a URL or link string complies with security policies.
 * Only http:, https:, mailto:, tel:, internal /path, and #anchor are allowed.
 * Rejects javascript:, data:, vbscript:, and similar vectors.
 * @param {string} urlString
 * @returns {boolean}
 */
export function isSafeUrl(urlString) {
  if (typeof urlString !== 'string') return false;
  const trimmed = urlString.trim().toLowerCase();
  if (!trimmed || trimmed === '#') return true;

  // Internal paths and anchors
  if (trimmed.startsWith('/') || trimmed.startsWith('#')) return true;

  // Extract scheme if present
  const schemeMatch = trimmed.match(/^([a-z0-9+.-]+):/);
  if (!schemeMatch) {
    // Relative path without leading slash - ensure no forbidden pseudo-protocols
    return !trimmed.includes(':');
  }

  const scheme = schemeMatch[1];
  return ['http', 'https', 'mailto', 'tel'].includes(scheme);
}

/**
 * Validates style object values (must be strings or numbers).
 * @param {object} styles
 * @param {string} nodeId
 * @param {string[]} errors
 */
function validateStyles(styles, nodeId, errors) {
  if (!styles || typeof styles !== 'object' || Array.isArray(styles)) {
    errors.push(`Node "${nodeId}": "styles" must be a plain key-value object.`);
    return;
  }

  for (const [key, val] of Object.entries(styles)) {
    if (typeof val !== 'string' && typeof val !== 'number') {
      errors.push(`Node "${nodeId}": style "${key}" must be a string or number, received ${typeof val}.`);
    } else if (typeof val === 'string' && /<script|javascript:|data:/i.test(val)) {
      errors.push(`Node "${nodeId}": style "${key}" contains unsafe script or data URI content.`);
    }
  }
}

/**
 * Validates prop values (strings, numbers, booleans) and sanitizes URLs.
 * @param {string} type
 * @param {object} props
 * @param {string} nodeId
 * @param {string[]} errors
 */
function validateProps(type, props, nodeId, errors) {
  if (!props || typeof props !== 'object' || Array.isArray(props)) {
    errors.push(`Node "${nodeId}": "props" must be a plain key-value object.`);
    return;
  }

  const def = NODE_REGISTRY[type];
  if (!def) return;

  for (const [key, val] of Object.entries(props)) {
    const valType = typeof val;
    if (val !== null && valType !== 'string' && valType !== 'number' && valType !== 'boolean') {
      errors.push(`Node "${nodeId}": prop "${key}" must be a primitive value, received ${valType}.`);
      continue;
    }

    // URL policy check for common link and source props
    if (typeof val === 'string') {
      if (/<script/i.test(val)) {
        errors.push(`Node "${nodeId}": prop "${key}" contains forbidden script content.`);
      }

      if (['href', 'src', 'action', 'url'].includes(key.toLowerCase())) {
        if (!isSafeUrl(val)) {
          errors.push(
            `Node "${nodeId}": prop "${key}" contains unsafe URL "${val}". Only http, https, mailto, tel, /path, and #anchor are permitted.`
          );
        }
      }
    }
  }
}

/**
 * Recursively validates a node and all of its descendants.
 * @param {object} node
 * @param {object|null} parent
 * @param {Set<string>} seenNodeIds
 * @param {string[]} errors
 */
function validateNodeSubtree(node, parent, seenNodeIds, errors) {
  if (!node || typeof node !== 'object') {
    errors.push(`Invalid node encountered: expected object, got ${typeof node}.`);
    return;
  }

  const nodeId = node.id;
  if (!nodeId || typeof nodeId !== 'string') {
    errors.push(`Node missing required string "id".`);
  } else if (seenNodeIds.has(nodeId)) {
    errors.push(`Duplicate node ID "${nodeId}" found. All node IDs must be globally unique.`);
  } else {
    seenNodeIds.add(nodeId);
  }

  // Type validation against closed union
  const type = node.type;
  if (!type || typeof type !== 'string') {
    errors.push(`Node "${nodeId || 'unknown'}": missing required "type".`);
    return;
  }

  if (!NODE_TYPES.includes(type)) {
    errors.push(`Node "${nodeId}": unknown node type "${type}". Allowed types: ${NODE_TYPES.join(', ')}.`);
    return;
  }

  // Parent/child nesting check
  if (parent) {
    if (!canNest(parent.type, type)) {
      errors.push(
        `Node "${nodeId}" (${type}) cannot be placed inside parent "${parent.id}" (${parent.type}). Nesting rules violated.`
      );
    }
  }

  // Children check
  const def = NODE_REGISTRY[type];
  if (!def.isContainer && Array.isArray(node.children) && node.children.length > 0) {
    errors.push(`Node "${nodeId}" (${type}) is a leaf component and cannot have children.`);
  }

  // Props & styles validation
  validateProps(type, node.props, nodeId, errors);
  validateStyles(node.styles, nodeId, errors);

  if (node.children) {
    if (!Array.isArray(node.children)) {
      errors.push(`Node "${nodeId}": "children" must be an array.`);
    } else {
      for (const child of node.children) {
        validateNodeSubtree(child, node, seenNodeIds, errors);
      }
    }
  }
}

/**
 * Validates a project document model against all structural and security constraints.
 * Never throws exceptions on malformed input; returns structured errors instead.
 * @param {any} input
 * @returns {{ ok: true, project: object } | { ok: false, errors: string[] }}
 */
export function validateProject(input) {
  const errors = [];

  if (!input || typeof input !== 'object') {
    return { ok: false, errors: ['Project payload must be a non-null object.'] };
  }

  // Schema version checks
  if (typeof input.schemaVersion !== 'number') {
    errors.push('Top-level "schemaVersion" must be a number.');
  } else if (input.schemaVersion !== SCHEMA_VERSION) {
    errors.push(
      `Unsupported schemaVersion: ${input.schemaVersion}. Current supported version is ${SCHEMA_VERSION}.`
    );
  }

  if (typeof input.generatorVersion !== 'string' || !input.generatorVersion.trim()) {
    errors.push('Top-level "generatorVersion" must be a non-empty string.');
  }

  // Project metadata checks
  const project = input.project;
  if (!project || typeof project !== 'object') {
    errors.push('Top-level "project" object is required.');
  } else {
    if (!project.id || typeof project.id !== 'string') {
      errors.push('project.id must be a non-empty string.');
    }
    if (!project.name || typeof project.name !== 'string' || !project.name.trim()) {
      errors.push('project.name must be a non-empty string.');
    }
    if (!project.ownerId || typeof project.ownerId !== 'string' || !project.ownerId.trim()) {
      errors.push('project.ownerId must be a non-empty string representing authenticated user.');
    }
    if (!project.createdAt || typeof project.createdAt !== 'string') {
      errors.push('project.createdAt must be an ISO date string.');
    }
    if (!project.updatedAt || typeof project.updatedAt !== 'string') {
      errors.push('project.updatedAt must be an ISO date string.');
    }
  }

  // Pages array checks
  const pages = input.pages;
  if (!Array.isArray(pages) || pages.length === 0) {
    errors.push('Project must contain at least one page in the "pages" array.');
  } else {
    const seenPageIds = new Set();
    const seenPaths = new Set();
    let homePagesCount = 0;
    const seenNodeIds = new Set();

    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      if (!page || typeof page !== 'object') {
        errors.push(`Page at index ${i} is not a valid object.`);
        continue;
      }

      const pageId = page.id;
      if (!pageId || typeof pageId !== 'string') {
        errors.push(`Page at index ${i} must have a string "id".`);
      } else if (seenPageIds.has(pageId)) {
        errors.push(`Duplicate page ID "${pageId}" found.`);
      } else {
        seenPageIds.add(pageId);
      }

      if (!page.name || typeof page.name !== 'string') {
        errors.push(`Page "${pageId || i}": "name" must be a non-empty string.`);
      }

      if (!page.path || typeof page.path !== 'string' || !page.path.startsWith('/')) {
        errors.push(`Page "${pageId || i}": "path" must be a valid path starting with "/".`);
      } else if (seenPaths.has(page.path)) {
        errors.push(`Duplicate page path "${page.path}" found.`);
      } else {
        seenPaths.add(page.path);
      }

      if (page.isHome) {
        homePagesCount++;
      }

      // Root node check
      if (!page.root || typeof page.root !== 'object') {
        errors.push(`Page "${pageId || i}": must have a valid "root" node object.`);
      } else if (page.root.type !== 'Page') {
        errors.push(`Page "${pageId || i}": "root" node must have type "Page", got "${page.root.type}".`);
      } else {
        validateNodeSubtree(page.root, null, seenNodeIds, errors);
      }
    }

    if (homePagesCount !== 1) {
      errors.push(`Project must contain exactly one home page (isHome: true). Found ${homePagesCount}.`);
    }
  }

  // Assets array checks
  if (input.assets !== undefined) {
    if (!Array.isArray(input.assets)) {
      errors.push('"assets" must be an array.');
    } else {
      const seenAssetIds = new Set();
      for (let i = 0; i < input.assets.length; i++) {
        const asset = input.assets[i];
        if (!asset || typeof asset !== 'object') {
          errors.push(`Asset at index ${i} must be an object.`);
          continue;
        }
        if (!asset.id || typeof asset.id !== 'string') {
          errors.push(`Asset at index ${i} must have a valid string "id".`);
        } else if (seenAssetIds.has(asset.id)) {
          errors.push(`Duplicate asset ID "${asset.id}".`);
        } else {
          seenAssetIds.add(asset.id);
        }

        if (asset.reference && typeof asset.reference === 'string') {
          if (asset.reference.startsWith('data:')) {
            errors.push(`Asset "${asset.id || i}": inline data URIs are not allowed in document model.`);
          }
        }
      }
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, project: input };
}

/**
 * Version migration registry.
 * Keyed by schemaVersion; each function upgrades to the subsequent version.
 */
const MIGRATIONS = {
  1: (doc) => doc, // Version 1 is baseline; returns unchanged
};

/**
 * Sequentially migrates a project document to the latest schemaVersion.
 * Structure allows adding future versions (e.g. v2, v3) without altering consumer code.
 * @param {any} input
 * @returns {object} Migrated document
 */
export function migrateProject(input) {
  if (!input || typeof input !== 'object') {
    return input;
  }

  let currentDoc = { ...input };
  const docVersion = currentDoc.schemaVersion;

  if (typeof docVersion !== 'number' || docVersion < 1) {
    // Legacy or unversioned document fallback
    currentDoc.schemaVersion = 1;
  }

  while (currentDoc.schemaVersion < SCHEMA_VERSION) {
    const migrator = MIGRATIONS[currentDoc.schemaVersion];
    if (!migrator) {
      break;
    }
    currentDoc = migrator(currentDoc);
    currentDoc.schemaVersion += 1;
  }

  return currentDoc;
}
