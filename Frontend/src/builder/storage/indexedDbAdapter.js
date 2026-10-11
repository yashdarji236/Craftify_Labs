/**
 * Craftify Labs - Local IndexedDB Storage Adapter
 *
 * ARCHITECTURAL NOTICE:
 * This IndexedDB implementation is a local-only, browser/device-bound storage adapter.
 * Per docs/OWNERSHIP_PLAN.md, this adapter will be complemented or replaced by a backend
 * MongoDB REST adapter in subsequent phases. All consumers in the application MUST depend
 * strictly on the ProjectStorage contract without making assumptions about physical storage.
 */

import { validateProject } from '../model/validator.js';
import { generateId } from '../model/id.js';
import { cloneNode } from '../model/tree.js';

const DB_NAME = 'craftify_builder_db';
const DB_VERSION = 2; // Bumped to 2 for assets store
const STORE_NAME = 'projects';
const ASSETS_STORE_NAME = 'assets';

export const MAX_ASSET_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB per asset
export const MAX_PROJECT_ASSETS_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB total per project

/**
 * Verifies file signature magic bytes for security against renamed executable payloads.
 * Strictly verifies PNG, JPEG, WEBP, and GIF signatures.
 *
 * @param {ArrayBuffer|Uint8Array} buffer
 * @param {string} mimeType
 * @returns {boolean}
 */
export function verifyMagicBytes(buffer, mimeType) {
  if (!buffer) return false;
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  if (bytes.length < 3) return false;

  const normalized = (mimeType || '').toLowerCase().trim();

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (normalized === 'image/png') {
    return (
      bytes.length >= 8 &&
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a
    );
  }

  // JPEG: FF D8 FF
  if (normalized === 'image/jpeg' || normalized === 'image/jpg') {
    return (
      bytes.length >= 3 &&
      bytes[0] === 0xff &&
      bytes[1] === 0xd8 &&
      bytes[2] === 0xff
    );
  }

  // WEBP: 52 49 46 46 (RIFF) ... 57 45 42 50 (WEBP)
  if (normalized === 'image/webp') {
    if (bytes.length < 12) return false;
    const isRiff =
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46;
    const isWebp =
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50;
    return isRiff && isWebp;
  }

  // GIF: 47 49 46 38 (GIF87a / GIF89a)
  if (normalized === 'image/gif') {
    return (
      bytes.length >= 6 &&
      bytes[0] === 0x47 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x38 &&
      (bytes[4] === 0x37 || bytes[4] === 0x39) &&
      bytes[5] === 0x61
    );
  }

  return false;
}

/**
 * Opens or initializes the IndexedDB database instance.
 * @returns {Promise<IDBDatabase>}
 */
function openDatabase() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(
        new Error('IndexedDB is not supported in this environment. Please use a modern browser.')
      );
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'project.id' });
        store.createIndex('ownerId', 'project.ownerId', { unique: false });
      }

      if (!db.objectStoreNames.contains(ASSETS_STORE_NAME)) {
        const assetStore = db.createObjectStore(ASSETS_STORE_NAME, { keyPath: 'id' });
        assetStore.createIndex('ownerId', 'ownerId', { unique: false });
        assetStore.createIndex('projectId', 'projectId', { unique: false });
        assetStore.createIndex('owner_project', ['ownerId', 'projectId'], { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);

    request.onerror = () => {
      reject(new Error(`Failed to open IndexedDB: ${request.error?.message || 'Unknown error'}`));
    };

    request.onblocked = () => {
      reject(new Error('IndexedDB upgrade blocked by open connections in other tabs.'));
    };
  });
}

/**
 * IndexedDB implementation of ProjectStorage contract.
 */
export class IndexedDbProjectStorage {
  // =========================================================================
  // PROJECT PERSISTENCE
  // =========================================================================

  /**
   * Retrieves all projects belonging to the specified ownerId.
   * Enforces owner isolation: projects from other users are strictly filtered out.
   * @param {string} ownerId
   * @returns {Promise<Array<object>>}
   */
  async list(ownerId) {
    if (!ownerId) throw new Error('ownerId is required to list projects.');
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const allProjects = request.result || [];
        const userProjects = allProjects.filter((p) => p?.project?.ownerId === ownerId);
        userProjects.sort(
          (a, b) => new Date(b.project.updatedAt).getTime() - new Date(a.project.updatedAt).getTime()
        );
        resolve(userProjects);
      };

      request.onerror = () => reject(request.error || new Error('Failed to retrieve projects.'));
    });
  }

  /**
   * Retrieves a single project by ID, verifying ownership.
   * Returns null if not found or if the project belongs to another user.
   * @param {string} id
   * @param {string} ownerId
   * @returns {Promise<object|null>}
   */
  async get(id, ownerId) {
    if (!id || !ownerId) throw new Error('Both id and ownerId are required to fetch a project.');
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => {
        const project = request.result;
        if (!project || project.project?.ownerId !== ownerId) {
          return resolve(null);
        }
        resolve(project);
      };

      request.onerror = () => reject(request.error || new Error(`Failed to load project ${id}.`));
    });
  }

  /**
   * Saves or updates a project document after rigorous validation.
   * @param {object} project
   * @returns {Promise<void>}
   */
  async save(project) {
    const validation = validateProject(project);
    if (!validation.ok) {
      throw new Error(`Project document validation failed: ${validation.errors.join('; ')}`);
    }

    const db = await openDatabase();
    const updatedProject = {
      ...project,
      project: {
        ...project.project,
        updatedAt: new Date().toISOString(),
      },
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(updatedProject);

      request.onsuccess = () => resolve();
      request.onerror = () => {
        if (request.error?.name === 'QuotaExceededError') {
          reject(new Error('Storage quota exceeded. Please free browser storage space.'));
        } else {
          reject(request.error || new Error('Failed to persist project to IndexedDB.'));
        }
      };
    });
  }

  /**
   * Renames a project owned by ownerId.
   */
  async rename(id, ownerId, newName) {
    if (!newName || !newName.trim()) {
      throw new Error('Project name cannot be empty.');
    }

    const existing = await this.get(id, ownerId);
    if (!existing) {
      throw new Error(`Project with id "${id}" was not found or access was denied.`);
    }

    existing.project.name = newName.trim();
    await this.save(existing);
  }

  /**
   * Duplicates an existing project, issuing new IDs for the project, pages, and nodes.
   */
  async duplicate(id, ownerId) {
    const existing = await this.get(id, ownerId);
    if (!existing) {
      throw new Error(`Project with id "${id}" was not found or access was denied.`);
    }

    const now = new Date().toISOString();
    const newProjectId = generateId('proj');

    const duplicatedPages = (existing.pages || []).map((page, index) => ({
      ...page,
      id: generateId('page'),
      name: page.name,
      order: index,
      root: cloneNode(page.root),
    }));

    const duplicatedProject = {
      ...existing,
      project: {
        ...existing.project,
        id: newProjectId,
        name: `${existing.project.name} (Copy)`,
        createdAt: now,
        updatedAt: now,
      },
      pages: duplicatedPages,
    };

    await this.save(duplicatedProject);
    return duplicatedProject;
  }

  /**
   * Permanently deletes a project and cascades cleanup of its assets.
   */
  async delete(id, ownerId) {
    const existing = await this.get(id, ownerId);
    if (!existing) {
      throw new Error(`Project with id "${id}" was not found or access was denied.`);
    }

    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_NAME, ASSETS_STORE_NAME], 'readwrite');
      const projectStore = tx.objectStore(STORE_NAME);
      const assetStore = tx.objectStore(ASSETS_STORE_NAME);

      projectStore.delete(id);

      // Cascade delete project assets
      const assetIndex = assetStore.index('projectId');
      const req = assetIndex.openCursor(IDBKeyRange.only(id));
      req.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
          if (cursor.value?.ownerId === ownerId) {
            cursor.delete();
          }
          cursor.continue();
        }
      };

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('Failed to delete project.'));
    });
  }

  // =========================================================================
  // ASSET PERSISTENCE (TASK 3)
  // =========================================================================

  /**
   * Validates and persists an image asset blob into IndexedDB scoped by ownerId and projectId.
   * Enforces security constraints:
   * - Max 5MB per asset
   * - Total project assets quota warning/limit (25MB)
   * - Strict MIME type validation (PNG, JPEG, WEBP, GIF)
   * - Strict rejection of SVG uploads to prevent XSS / script injection
   * - Magic bytes file signature verification
   *
   * @param {string} projectId
   * @param {string} ownerId
   * @param {File|Blob} file
   * @param {{ altText?: string, filename?: string }} [metadata={}]
   * @returns {Promise<object>} Asset metadata record (without binary blob)
   */
  async saveAsset(projectId, ownerId, file, metadata = {}) {
    if (!projectId || !ownerId) {
      throw new Error('Both projectId and ownerId are required to save an asset.');
    }
    if (!file) {
      throw new Error('A valid File or Blob is required.');
    }

    const filename = metadata.filename || file.name || 'image.png';
    const mimeType = (file.type || '').toLowerCase();

    // 1. Strict SVG rejection policy
    if (mimeType === 'image/svg+xml' || filename.toLowerCase().endsWith('.svg')) {
      throw new Error(
        'SVG uploads are rejected for security. SVG files can embed executable JavaScript, entity expansions, and foreign objects. Please upload WebP, PNG, JPEG, or GIF images.'
      );
    }

    // 2. MIME type validation
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(mimeType)) {
      throw new Error(
        `Unsupported image type "${mimeType}". Allowed formats: WebP, PNG, JPEG, GIF.`
      );
    }

    // 3. Per-asset size limit (5MB)
    if (file.size > MAX_ASSET_SIZE_BYTES) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
      throw new Error(
        `File size (${sizeMb} MB) exceeds maximum allowed limit of 5 MB per asset.`
      );
    }

    // 4. Magic bytes verification
    let headerBuffer;
    if (typeof file.slice === 'function') {
      const headerSlice = file.slice(0, 16);
      headerBuffer = await headerSlice.arrayBuffer();
    } else if (typeof file.arrayBuffer === 'function') {
      const fullBuffer = await file.arrayBuffer();
      headerBuffer = fullBuffer.slice(0, 16);
    } else {
      throw new Error('Unsupported file object format.');
    }

    const isValidSignature = verifyMagicBytes(headerBuffer, mimeType);
    if (!isValidSignature) {
      throw new Error(
        'File signature mismatch. The actual binary contents do not match the claimed image format.'
      );
    }

    // 5. Total project size check
    const currentAssets = await this.listAssets(projectId, ownerId);
    const totalCurrentSize = currentAssets.reduce((sum, a) => sum + (a.size || 0), 0);
    if (totalCurrentSize + file.size > MAX_PROJECT_ASSETS_SIZE_BYTES) {
      throw new Error(
        `Total project asset limit of 25 MB exceeded. Current storage: ${(totalCurrentSize / (1024 * 1024)).toFixed(1)} MB.`
      );
    }

    const assetId = generateId('asset');
    const assetMeta = {
      id: assetId,
      projectId,
      ownerId,
      filename,
      mimeType,
      size: file.size,
      altText: typeof metadata.altText === 'string' ? metadata.altText.trim() : '',
      reference: `asset://${assetId}`,
      createdAt: new Date().toISOString(),
    };

    const recordToStore = {
      ...assetMeta,
      blob: file,
    };

    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(ASSETS_STORE_NAME, 'readwrite');
      const store = tx.objectStore(ASSETS_STORE_NAME);
      const req = store.put(recordToStore);

      req.onsuccess = () => resolve(assetMeta);
      req.onerror = () => {
        if (req.error?.name === 'QuotaExceededError') {
          reject(new Error('Storage quota exceeded. Please free browser storage space.'));
        } else {
          reject(req.error || new Error('Failed to persist asset blob to IndexedDB.'));
        }
      };
    });
  }

  /**
   * Retrieves an asset binary blob from IndexedDB, enforcing owner verification.
   * @param {string} assetId
   * @param {string} ownerId
   * @returns {Promise<Blob|null>}
   */
  async getAssetBlob(assetId, ownerId) {
    if (!assetId || !ownerId) return null;
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(ASSETS_STORE_NAME, 'readonly');
      const store = tx.objectStore(ASSETS_STORE_NAME);
      const req = store.get(assetId);

      req.onsuccess = () => {
        const record = req.result;
        if (!record || record.ownerId !== ownerId) {
          return resolve(null);
        }
        resolve(record.blob);
      };

      req.onerror = () => reject(req.error || new Error(`Failed to load asset ${assetId}.`));
    });
  }

  /**
   * Lists all asset metadata records for a project, filtered by ownerId.
   * Does NOT return binary blobs, avoiding large memory consumption.
   * @param {string} projectId
   * @param {string} ownerId
   * @returns {Promise<Array<object>>}
   */
  async listAssets(projectId, ownerId) {
    if (!projectId || !ownerId) return [];
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(ASSETS_STORE_NAME, 'readonly');
      const store = tx.objectStore(ASSETS_STORE_NAME);
      const req = store.getAll();

      req.onsuccess = () => {
        const all = req.result || [];
        const projectAssets = all
          .filter((a) => a.projectId === projectId && a.ownerId === ownerId)
          .map(({ blob, ...metadata }) => metadata);

        projectAssets.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        resolve(projectAssets);
      };

      req.onerror = () => reject(req.error || new Error('Failed to list assets.'));
    });
  }

  /**
   * Deletes an asset record and its binary blob from IndexedDB after ownership verification.
   * @param {string} assetId
   * @param {string} ownerId
   * @returns {Promise<void>}
   */
  async deleteAsset(assetId, ownerId) {
    if (!assetId || !ownerId) {
      throw new Error('Both assetId and ownerId are required to delete an asset.');
    }
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(ASSETS_STORE_NAME, 'readwrite');
      const store = tx.objectStore(ASSETS_STORE_NAME);
      const req = store.get(assetId);

      req.onsuccess = () => {
        const record = req.result;
        if (!record || record.ownerId !== ownerId) {
          return reject(new Error(`Asset "${assetId}" not found or unauthorized.`));
        }

        const deleteReq = store.delete(assetId);
        deleteReq.onsuccess = () => resolve();
        deleteReq.onerror = () =>
          reject(deleteReq.error || new Error(`Failed to delete asset ${assetId}.`));
      };

      req.onerror = () => reject(req.error || new Error('Asset lookup failed.'));
    });
  }
}

export const projectStorage = new IndexedDbProjectStorage();
