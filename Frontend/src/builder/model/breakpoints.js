/**
 * Craftify Labs - Responsive Breakpoints & Style Resolution
 *
 * Defines the shared breakpoint system and pure cascade style resolver.
 * Cascade order: Desktop (base) -> Tablet (max-width: 1024px) -> Mobile (max-width: 640px).
 */

export const BREAKPOINTS = Object.freeze({
  desktop: {
    id: 'desktop',
    label: 'Desktop',
    width: 1280,
    maxWidth: null, // Base styles apply to all screen sizes
    minWidth: 1025,
  },
  tablet: {
    id: 'tablet',
    label: 'Tablet',
    width: 768,
    maxWidth: 1024,
    minWidth: 641,
  },
  mobile: {
    id: 'mobile',
    label: 'Mobile',
    width: 375,
    maxWidth: 640,
    minWidth: 0,
  },
});

export const BREAKPOINT_ORDER = Object.freeze(['desktop', 'tablet', 'mobile']);

/**
 * Pure function to compute effective styles for a node at a given breakpoint.
 * Cascades downward:
 * - 'desktop': returns node.styles
 * - 'tablet':  merges node.styles + node.responsiveStyles.tablet
 * - 'mobile':  merges node.styles + node.responsiveStyles.tablet + node.responsiveStyles.mobile
 *
 * @param {object} node - Document AST Node with `styles` and optional `responsiveStyles`
 * @param {'desktop'|'tablet'|'mobile'} [breakpoint='desktop'] - Target breakpoint
 * @returns {Record<string, string|number>} Merged CSS styles object
 */
export function resolveStyles(node, breakpoint = 'desktop') {
  if (!node || typeof node !== 'object') return {};

  const base = (node.styles && typeof node.styles === 'object') ? node.styles : {};
  const responsive = (node.responsiveStyles && typeof node.responsiveStyles === 'object')
    ? node.responsiveStyles
    : {};

  const tabletOverrides = (responsive.tablet && typeof responsive.tablet === 'object')
    ? responsive.tablet
    : {};
  const mobileOverrides = (responsive.mobile && typeof responsive.mobile === 'object')
    ? responsive.mobile
    : {};

  if (breakpoint === 'tablet') {
    return { ...base, ...tabletOverrides };
  }

  if (breakpoint === 'mobile') {
    return { ...base, ...tabletOverrides, ...mobileOverrides };
  }

  // Default / desktop base
  return { ...base };
}

/**
 * Checks if a specific CSS property has an override defined at a given breakpoint.
 * @param {object} node
 * @param {string} property
 * @param {'desktop'|'tablet'|'mobile'} breakpoint
 * @returns {boolean}
 */
export function hasBreakpointOverride(node, property, breakpoint) {
  if (!node || breakpoint === 'desktop') return false;
  const responsive = node.responsiveStyles || {};
  const overrides = responsive[breakpoint] || {};
  return Object.prototype.hasOwnProperty.call(overrides, property);
}
