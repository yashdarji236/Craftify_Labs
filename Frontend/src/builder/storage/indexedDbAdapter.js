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
const DB_VERSION = 1;
const STORE_NAME = 'projects';

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
        // Strict owner isolation filter
        const userProjects = allProjects.filter((p) => p?.project?.ownerId === ownerId);
        // Sort descending by last updated
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
   * @param {string} id
   * @param {string} ownerId
   * @param {string} newName
   * @returns {Promise<void>}
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
   * @param {string} id
   * @param {string} ownerId
   * @returns {Promise<object>}
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
   * Permanently deletes a project after verifying ownership.
   * @param {string} id
   * @param {string} ownerId
   * @returns {Promise<void>}
   */
  async delete(id, ownerId) {
    const existing = await this.get(id, ownerId);
    if (!existing) {
      throw new Error(`Project with id "${id}" was not found or access was denied.`);
    }

    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error || new Error('Failed to delete project.'));
    });
  }
}

export const projectStorage = new IndexedDbProjectStorage();
