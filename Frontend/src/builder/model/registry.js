/**
 * Craftify Labs - Node Type Registry
 * Defines allowed props, default values, and structural nesting rules.
 */

import { NODE_TYPES } from './types.js';

export const NODE_REGISTRY = Object.freeze({
  Page: {
    label: 'Page',
    isContainer: true,
    allowedChildren: ['Section', 'Container'],
    allowedProps: ['title', 'metaDescription'],
    defaultProps: {
      title: 'New Page',
      metaDescription: '',
    },
    defaultStyles: {
      minHeight: '100vh',
      backgroundColor: '#09090b',
      color: '#f4f4f5',
      fontFamily: 'Inter, system-ui, sans-serif',
    },
  },
  Section: {
    label: 'Section',
    isContainer: true,
    allowedChildren: [
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
    ],
    allowedProps: ['semanticTag'],
    defaultProps: {
      semanticTag: 'section',
    },
    defaultStyles: {
      padding: '64px 24px',
      width: '100%',
      boxSizing: 'border-box',
    },
  },
  Container: {
    label: 'Container',
    isContainer: true,
    allowedChildren: [
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
    ],
    allowedProps: ['layout'],
    defaultProps: {
      layout: 'flex-col',
    },
    defaultStyles: {
      maxWidth: '1200px',
      margin: '0 auto',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
    },
  },
  Grid: {
    label: 'Grid',
    isContainer: true,
    allowedChildren: ['Container'],
    allowedProps: ['columns', 'gap'],
    defaultProps: {
      columns: 3,
      gap: '24px',
    },
    defaultStyles: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
      gap: '24px',
      width: '100%',
    },
  },
  Heading: {
    label: 'Heading',
    isContainer: false,
    allowedChildren: [],
    allowedProps: ['text', 'level'],
    defaultProps: {
      text: 'Build Something Exceptional',
      level: 'h2',
    },
    defaultStyles: {
      fontSize: '32px',
      fontWeight: '700',
      color: '#ffffff',
      margin: '0',
      lineHeight: '1.2',
      letterSpacing: '-0.02em',
    },
  },
  Text: {
    label: 'Text Paragraph',
    isContainer: false,
    allowedChildren: [],
    allowedProps: ['content'],
    defaultProps: {
      content: 'Craft responsive, high-performance web applications with effortless precision.',
    },
    defaultStyles: {
      fontSize: '16px',
      color: '#a1a1aa',
      margin: '0',
      lineHeight: '1.6',
    },
  },
  Image: {
    label: 'Image',
    isContainer: false,
    allowedChildren: [],
    allowedProps: ['src', 'alt', 'assetId'],
    defaultProps: {
      src: '/img2.jpg',
      alt: 'Visual element',
    },
    defaultStyles: {
      width: '100%',
      height: 'auto',
      borderRadius: '12px',
      objectFit: 'cover',
      display: 'block',
    },
  },
  Button: {
    label: 'Button',
    isContainer: false,
    allowedChildren: [],
    allowedProps: ['label', 'href', 'target'],
    defaultProps: {
      label: 'Explore Canvas',
      href: '#',
      target: '_self',
    },
    defaultStyles: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '12px 24px',
      backgroundColor: '#4f46e5',
      color: '#ffffff',
      borderRadius: '8px',
      fontWeight: '600',
      fontSize: '14px',
      cursor: 'pointer',
      textDecoration: 'none',
      border: 'none',
      width: 'fit-content',
    },
  },
  Link: {
    label: 'Link',
    isContainer: false,
    allowedChildren: [],
    allowedProps: ['text', 'href', 'target'],
    defaultProps: {
      text: 'Documentation & Guides',
      href: '#',
      target: '_self',
    },
    defaultStyles: {
      color: '#818cf8',
      textDecoration: 'underline',
      fontSize: '14px',
      fontWeight: '500',
    },
  },
  Spacer: {
    label: 'Spacer',
    isContainer: false,
    allowedChildren: [],
    allowedProps: ['height'],
    defaultProps: {
      height: '32px',
    },
    defaultStyles: {
      height: '32px',
      width: '100%',
    },
  },
  Divider: {
    label: 'Divider',
    isContainer: false,
    allowedChildren: [],
    allowedProps: [],
    defaultProps: {},
    defaultStyles: {
      height: '1px',
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      width: '100%',
      margin: '16px 0',
      border: 'none',
    },
  },
  Form: {
    label: 'Form',
    isContainer: true,
    allowedChildren: ['Container', 'Heading', 'Text', 'Input', 'Button', 'Divider', 'Spacer'],
    allowedProps: ['action', 'method'],
    defaultProps: {
      action: '#',
      method: 'POST',
    },
    defaultStyles: {
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      width: '100%',
    },
  },
  Input: {
    label: 'Input Field',
    isContainer: false,
    allowedChildren: [],
    allowedProps: ['placeholder', 'type', 'name', 'required'],
    defaultProps: {
      placeholder: 'Enter your email address',
      type: 'text',
      name: 'email',
      required: false,
    },
    defaultStyles: {
      padding: '12px 16px',
      borderRadius: '8px',
      border: '1px solid rgba(255, 255, 255, 0.15)',
      backgroundColor: '#18181b',
      color: '#ffffff',
      fontSize: '14px',
      width: '100%',
      boxSizing: 'border-box',
    },
  },
});

/**
 * Standard default typographical styles for each semantic heading level.
 * Used when switching levels to ensure immediate visual responsiveness on canvas.
 */
export const HEADING_LEVEL_DEFAULTS = Object.freeze({
  h1: { fontSize: '44px', fontWeight: '800', lineHeight: '1.15' },
  h2: { fontSize: '32px', fontWeight: '700', lineHeight: '1.2' },
  h3: { fontSize: '24px', fontWeight: '700', lineHeight: '1.25' },
  h4: { fontSize: '20px', fontWeight: '600', lineHeight: '1.3' },
  h5: { fontSize: '16px', fontWeight: '600', lineHeight: '1.35' },
  h6: { fontSize: '13px', fontWeight: '600', lineHeight: '1.4' },
});

/**
 * Validates whether childType can be placed inside parentType.
 * @param {string} parentType
 * @param {string} childType
 * @returns {boolean}
 */
export function canNest(parentType, childType) {
  if (!NODE_TYPES.includes(parentType) || !NODE_TYPES.includes(childType)) {
    return false;
  }
  const parentDef = NODE_REGISTRY[parentType];
  if (!parentDef || !parentDef.isContainer) {
    return false;
  }
  return parentDef.allowedChildren.includes(childType);
}
