/**
 * Craftify Labs - URL Slug Generator & Validator
 *
 * Enforces URL safety and ASCII compliance for multi-page website routing.
 */

/**
 * Auto-generates a clean, ASCII-safe URL path slug from a page name.
 * e.g. "About Us" -> "/about-us", "Contact & Support!" -> "/contact-support"
 *
 * @param {string} name - Raw page name
 * @returns {string} Formatted URL path slug starting with '/'
 */
export function generateSlug(name) {
  if (!name || typeof name !== 'string') return '/page';

  const clean = name
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Strip accents
    .replace(/[^a-z0-9\s-_]/g, '')   // Keep alphanumeric, hyphens, underscores
    .replace(/[\s_]+/g, '-')        // Convert spaces and underscores to hyphens
    .replace(/-+/g, '-')            // Collapse consecutive hyphens
    .replace(/^-+|-+$/g, '');       // Trim leading/trailing hyphens

  return clean ? `/${clean}` : '/page';
}

/**
 * Validates a page URL path against routing constraints.
 * Rules:
 * - Must start with '/'
 * - No spaces
 * - No consecutive dots ('..')
 * - ASCII characters only: lowercase letters, numbers, hyphens, underscores, slashes
 * - Home page must be strictly '/'
 *
 * @param {string} path - URL path to validate
 * @param {boolean} [isHome=false] - Whether this page is the designated home page
 * @returns {{ ok: boolean, error?: string }}
 */
export function validateSlug(path, isHome = false) {
  if (typeof path !== 'string') {
    return { ok: false, valid: false, error: 'Page path must be a string.' };
  }

  const trimmed = path.trim();

  if (isHome) {
    if (trimmed !== '/') {
      return { ok: false, valid: false, error: 'The home page URL path must be strictly "/".' };
    }
    return { ok: true, valid: true };
  }

  if (trimmed === '/') {
    return { ok: false, valid: false, error: 'Only the home page can use the root path "/".' };
  }

  if (!trimmed.startsWith('/')) {
    return { ok: false, valid: false, error: 'Path must start with a forward slash ("/").' };
  }

  if (/\s/.test(trimmed)) {
    return { ok: false, valid: false, error: 'Path cannot contain spaces.' };
  }

  if (trimmed.includes('..')) {
    return { ok: false, valid: false, error: 'Path cannot contain directory traversal ("..").' };
  }

  if (!/^\/[a-z0-9\-_/]+$/.test(trimmed)) {
    return {
      ok: false,
      valid: false,
      error: 'Path can only contain lowercase letters, numbers, hyphens, and slashes.',
    };
  }

  return { ok: true, valid: true };
}
