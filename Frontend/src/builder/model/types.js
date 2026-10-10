/**
 * Craftify Labs - Document Model Definitions & Types
 * Single source of truth for visual editor, preview runtime, and React generator.
 */

export const SCHEMA_VERSION = 1;
export const GENERATOR_VERSION = '1.0.0';

/**
 * Closed union of supported node types.
 */
export const NODE_TYPES = Object.freeze([
  'Page',
  'Section',
  'Container',
  'Heading',
  'Text',
  'Image',
  'Button',
  'Link',
  'Grid',
  'Spacer',
  'Divider',
  'Form',
  'Input',
]);

/**
 * Default empty responsive styles placeholder.
 */
export const createDefaultResponsiveStyles = () => ({
  tablet: {},
  mobile: {},
});

/**
 * Default reserved animation configuration placeholder.
 */
export const createDefaultAnimationConfig = () => ({
  type: 'none',
  duration: 300,
  delay: 0,
  easing: 'ease',
});
