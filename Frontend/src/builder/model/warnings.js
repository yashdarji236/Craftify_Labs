/**
 * Craftify Labs - Project Health & Warnings Collector
 *
 * Pure function inspecting a project document across all pages and breakpoints:
 * - Broken internal page links
 * - Invalid external URLs / unsafe schemes
 * - Missing or unregistered asset references
 * - Accessible alt text omissions on images
 * - Horizontal layout overflow at active breakpoint
 * - Low contrast typography (WCAG AA ratio < 4.5:1)
 */

import { isSafeUrl } from './validator.js';
import { resolveStyles, BREAKPOINTS } from './breakpoints.js';

/**
 * Calculates WCAG 2.1 relative luminance and contrast ratio between two hex colors.
 * @param {string} colorHex
 * @param {string} bgHex
 * @returns {number|null} Contrast ratio (1.0 to 21.0) or null if unparseable
 */
export function getContrastRatio(colorHex, bgHex) {
  const parseHex = (hex) => {
    if (!hex || typeof hex !== 'string') return null;
    let clean = hex.trim().replace('#', '');
    if (clean.length === 3) {
      clean = clean.split('').map((c) => c + c).join('');
    }
    if (clean.length !== 6) return null;
    const r = parseInt(clean.substring(0, 2), 16) / 255;
    const g = parseInt(clean.substring(2, 4), 16) / 255;
    const b = parseInt(clean.substring(4, 6), 16) / 255;
    if (isNaN(r) || isNaN(g) || isNaN(b)) return null;

    const toLum = (c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
    return 0.2126 * toLum(r) + 0.7152 * toLum(g) + 0.0722 * toLum(b);
  };

  const lum1 = parseHex(colorHex);
  const lum2 = parseHex(bgHex);
  if (lum1 === null || lum2 === null) return null;

  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Recursively inspects a node subtree and records any issues.
 */
function inspectNodeSubtree(node, page, project, activeBreakpoint, warnings) {
  if (!node || typeof node !== 'object') return;

  const resolved = resolveStyles(node, activeBreakpoint);
  const breakpointWidth = BREAKPOINTS[activeBreakpoint]?.width || 1280;

  // 1. LINK AUDIT (Button, Link, or any component with linkTarget / href)
  const linkTarget = node.props?.linkTarget;
  if (linkTarget && typeof linkTarget === 'object') {
    if (linkTarget.type === 'page' && linkTarget.pageId) {
      const pageExists = project.pages?.some((p) => p.id === linkTarget.pageId);
      if (!pageExists) {
        warnings.push({
          id: `warn_link_broken_${node.id}`,
          type: 'broken-link',
          severity: 'error',
          nodeId: node.id,
          pageId: page.id,
          pageName: page.name,
          nodeName: node.name || node.type,
          message: `Link targets non-existent or deleted page (ID: ${linkTarget.pageId}).`,
        });
      }
    } else if (linkTarget.type === 'external' && linkTarget.url) {
      const url = String(linkTarget.url).trim();
      if (!isSafeUrl(url)) {
        warnings.push({
          id: `warn_link_invalid_${node.id}`,
          type: 'invalid-url',
          severity: 'error',
          nodeId: node.id,
          pageId: page.id,
          pageName: page.name,
          nodeName: node.name || node.type,
          message: `External URL "${url}" uses an unsafe or invalid scheme.`,
        });
      }
    }
  } else if (typeof node.props?.href === 'string' && node.props.href.trim()) {
    // Legacy string href audit
    const href = node.props.href.trim();
    if (!isSafeUrl(href)) {
      warnings.push({
        id: `warn_link_unsafe_${node.id}`,
        type: 'invalid-url',
        severity: 'error',
        nodeId: node.id,
        pageId: page.id,
        pageName: page.name,
        nodeName: node.name || node.type,
        message: `URL "${href}" uses an unsafe or disallowed scheme.`,
      });
    }
  }

  // 2. IMAGE AUDIT
  if (node.type === 'Image') {
    const assetId = node.props?.assetId;
    const isDecorative = Boolean(node.props?.isDecorative);
    const alt = node.props?.alt;

    // Missing asset check
    if (assetId) {
      const assetExists = project.assets?.some((a) => a.id === assetId);
      if (!assetExists) {
        warnings.push({
          id: `warn_asset_missing_${node.id}`,
          type: 'missing-asset',
          severity: 'error',
          nodeId: node.id,
          pageId: page.id,
          pageName: page.name,
          nodeName: node.name || 'Image',
          message: `Image references asset ID "${assetId}" which is missing from project assets.`,
        });
      }
    }

    // Alt text omission check
    if (!isDecorative && (!alt || !String(alt).trim())) {
      warnings.push({
        id: `warn_alt_missing_${node.id}`,
        type: 'missing-alt',
        severity: 'warning',
        nodeId: node.id,
        pageId: page.id,
        pageName: page.name,
        nodeName: node.name || 'Image',
        message: 'Image is missing alt text. Provide a description or mark as decorative.',
      });
    }
  }

  // 3. HORIZONTAL OVERFLOW CHECK AT ACTIVE BREAKPOINT
  if (resolved.width && typeof resolved.width === 'string') {
    const widthMatch = resolved.width.match(/^(\d+(?:\.\d+)?)px$/i);
    if (widthMatch) {
      const pxWidth = parseFloat(widthMatch[1]);
      if (pxWidth > breakpointWidth) {
        warnings.push({
          id: `warn_overflow_${node.id}_${activeBreakpoint}`,
          type: 'overflow',
          severity: 'warning',
          nodeId: node.id,
          pageId: page.id,
          pageName: page.name,
          nodeName: node.name || node.type,
          message: `Fixed width (${pxWidth}px) exceeds the ${BREAKPOINTS[activeBreakpoint]?.label || activeBreakpoint} viewport width (${breakpointWidth}px).`,
        });
      }
    }
  }

  // 4. LOW CONTRAST AUDIT (Heading & Text)
  if (['Heading', 'Text', 'Button', 'Link'].includes(node.type)) {
    const textColor = resolved.color || '#ffffff';
    const bgColor = resolved.backgroundColor || page.root?.styles?.backgroundColor || '#09090b';

    const ratio = getContrastRatio(textColor, bgColor);
    if (ratio !== null && ratio < 4.5) {
      warnings.push({
        id: `warn_contrast_${node.id}`,
        type: 'low-contrast',
        severity: 'warning',
        nodeId: node.id,
        pageId: page.id,
        pageName: page.name,
        nodeName: node.name || node.type,
        message: `Low text contrast ratio (${ratio.toFixed(2)}:1). WCAG AA requires at least 4.5:1.`,
      });
    }
  }

  // Recursively inspect children
  if (Array.isArray(node.children)) {
    for (const child of node.children) {
      inspectNodeSubtree(child, page, project, activeBreakpoint, warnings);
    }
  }
}

/**
 * Pure function to collect all project health warnings.
 *
 * @param {object} project - Validated Project document model
 * @param {'desktop'|'tablet'|'mobile'} [activeBreakpoint='desktop'] - Active breakpoint to check overflow
 * @returns {Array<{ id: string, type: string, severity: 'warning'|'error', nodeId?: string, pageId?: string, pageName?: string, nodeName?: string, message: string }>}
 */
export function collectWarnings(project, activeBreakpoint = 'desktop') {
  if (!project || typeof project !== 'object' || !Array.isArray(project.pages)) {
    return [];
  }

  const warnings = [];

  for (const page of project.pages) {
    if (page && page.root) {
      inspectNodeSubtree(page.root, page, project, activeBreakpoint, warnings);
    }
  }

  return warnings;
}
