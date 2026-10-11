/**
 * Craftify Labs - Typed Link & Navigation Model
 *
 * Implements typed link targets:
 * - { type: "page", pageId: string }
 * - { type: "external", url: string, openInNewTab?: boolean }
 * - { type: "anchor", anchorId: string }
 * - { type: "email", email: string }
 * - { type: "phone", phone: string }
 * - { type: "none" }
 */

import { isSafeUrl } from './validator.js';

export const LINK_TYPES = Object.freeze([
  'none',
  'page',
  'external',
  'anchor',
  'email',
  'phone',
]);

/**
 * Creates a default typed link target.
 * @param {'none'|'page'|'external'|'anchor'|'email'|'phone'} [type='none']
 * @param {object} [initialData={}]
 * @returns {object} Typed link target object
 */
export function createLinkTarget(type = 'none', initialData = {}) {
  switch (type) {
    case 'page':
      return { type: 'page', pageId: initialData.pageId || '' };
    case 'external':
      return {
        type: 'external',
        url: initialData.url || '',
        openInNewTab: Boolean(initialData.openInNewTab),
      };
    case 'anchor':
      return { type: 'anchor', anchorId: initialData.anchorId || '' };
    case 'email':
      return { type: 'email', email: initialData.email || '' };
    case 'phone':
      return { type: 'phone', phone: initialData.phone || '' };
    case 'none':
    default:
      return { type: 'none' };
  }
}

/**
 * Validates a typed link target against schema and security policies.
 * @param {any} target - The linkTarget object to validate
 * @returns {{ ok: boolean, error?: string }}
 */
export function validateLinkTarget(target) {
  if (!target || typeof target !== 'object') {
    return { ok: false, valid: false, error: 'Link target must be an object.' };
  }

  const { type } = target;
  if (!type || !LINK_TYPES.includes(type)) {
    return {
      ok: false,
      valid: false,
      error: `Invalid link type "${type}". Allowed types: ${LINK_TYPES.join(', ')}.`,
    };
  }

  if (type === 'page') {
    if (!target.pageId || typeof target.pageId !== 'string') {
      return { ok: false, valid: false, error: 'Page link must specify a valid string pageId.' };
    }
  }

  if (type === 'external') {
    if (typeof target.url !== 'string') {
      return { ok: false, valid: false, error: 'External link must specify a string url.' };
    }
    const trimmed = target.url.trim();
    if (trimmed && !isSafeUrl(trimmed)) {
      return {
        ok: false,
        valid: false,
        error: `Unsafe external URL "${trimmed}". Only http, https, mailto, tel, and /path are allowed.`,
      };
    }
  }

  return { ok: true, valid: true };
}

/**
 * Pure function to resolve a typed link target to renderable HTML anchor attributes.
 * Internal page links resolve dynamically to the target page's current `path`.
 *
 * @param {object|string|null} linkTarget - Typed link target or legacy string href
 * @param {Array<object>} [pages=[]] - Project pages array
 * @returns {{ href: string, target?: string, rel?: string, isBroken: boolean }}
 */
export function resolveLinkTarget(linkTarget, pages = []) {
  if (!linkTarget) {
    return { href: '#', isBroken: false };
  }

  // Handle legacy string href backward compatibility
  if (typeof linkTarget === 'string') {
    const trimmed = linkTarget.trim();
    if (!trimmed || trimmed === '#') {
      return { href: '#', isBroken: false };
    }
    if (trimmed.startsWith('/')) {
      const matchedPage = pages.find((p) => p.path === trimmed);
      return {
        href: matchedPage ? matchedPage.path : trimmed,
        isBroken: false,
      };
    }
    return {
      href: isSafeUrl(trimmed) ? trimmed : '#',
      isBroken: !isSafeUrl(trimmed),
    };
  }

  const { type } = linkTarget;

  switch (type) {
    case 'page': {
      const page = pages.find((p) => p.id === linkTarget.pageId);
      if (!page) {
        return {
          href: '#',
          isBroken: true,
        };
      }
      return {
        href: page.path || '/',
        target: '_self',
        isBroken: false,
      };
    }

    case 'external': {
      const rawUrl = (linkTarget.url || '').trim();
      let safeUrl = rawUrl;

      // Auto-suggest https:// prefix if user forgot scheme (e.g. "google.com")
      if (rawUrl && !rawUrl.includes('://') && !rawUrl.startsWith('/') && !rawUrl.startsWith('#')) {
        safeUrl = `https://${rawUrl}`;
      }

      const isValid = Boolean(safeUrl) && isSafeUrl(safeUrl);
      const openInNewTab = Boolean(linkTarget.openInNewTab || linkTarget.newTab);

      return {
        href: isValid ? safeUrl : '#',
        target: openInNewTab ? '_blank' : '_self',
        rel: openInNewTab ? 'noopener noreferrer' : undefined,
        isBroken: Boolean(rawUrl) && !isValid,
      };
    }

    case 'anchor': {
      const anchor = (linkTarget.anchorId || linkTarget.nodeId || '').replace(/^#/, '');
      return {
        href: anchor ? `#${anchor}` : '#',
        target: '_self',
        isBroken: false,
      };
    }

    case 'email': {
      const email = (linkTarget.email || '').replace(/^mailto:/, '');
      return {
        href: email ? `mailto:${email}` : '#',
        target: '_self',
        isBroken: false,
      };
    }

    case 'phone': {
      const phone = (linkTarget.phone || '').replace(/^tel:/, '');
      return {
        href: phone ? `tel:${phone}` : '#',
        target: '_self',
        isBroken: false,
      };
    }

    case 'none':
    default:
      return {
        href: '#',
        isBroken: false,
      };
  }
}
