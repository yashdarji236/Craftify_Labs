/**
 * Craftify Labs - Seed and Blank Project Generators
 * Generates verified initial project documents for the visual editor and dashboard.
 */

import { SCHEMA_VERSION, GENERATOR_VERSION } from './types.js';
import { generateId } from './id.js';
import { createNode } from './tree.js';
import { validateProject } from './validator.js';

/**
 * Creates a rich demo seed project with hero section, grid showcase, and features.
 * Fully passes validateProject.
 * @param {string} ownerId
 * @param {string} [name='Craftify Studio Demo']
 * @returns {object}
 */
export function createDemoProject(ownerId, name = 'Craftify Studio Demo') {
  if (!ownerId || typeof ownerId !== 'string') {
    throw new Error('ownerId string is required to create demo project.');
  }

  const now = new Date().toISOString();
  const projectId = generateId('proj');
  const pageId = generateId('page');

  // Hero Section Elements
  const heroHeading = createNode('Heading', {
    name: 'Hero Title',
    props: {
      text: 'Design & Ship Next-Gen Web Apps',
      level: 'h1',
    },
    styles: {
      fontSize: '44px',
      fontWeight: '800',
      color: '#ffffff',
      lineHeight: '1.15',
      letterSpacing: '-0.03em',
      marginBottom: '16px',
    },
  });

  const heroText = createNode('Text', {
    name: 'Hero Subtitle',
    props: {
      content:
        'Craftify Labs is a modern visual editor allowing you to design full-stack responsive web experiences and export clean, production-ready React + Vite code.',
    },
    styles: {
      fontSize: '18px',
      color: '#a1a1aa',
      lineHeight: '1.6',
      maxWidth: '680px',
      marginBottom: '24px',
    },
  });

  const heroButton = createNode('Button', {
    name: 'Hero CTA',
    props: {
      label: 'Explore Studio Canvas',
      href: '#features',
      target: '_self',
    },
    styles: {
      padding: '14px 28px',
      backgroundColor: '#6366f1',
      color: '#ffffff',
      borderRadius: '10px',
      fontWeight: '600',
      fontSize: '15px',
      marginBottom: '32px',
      boxShadow: '0 10px 25px -5px rgba(99, 102, 241, 0.4)',
    },
  });

  const heroImage = createNode('Image', {
    name: 'Hero Visual Banner',
    props: {
      src: '/img2.jpg',
      alt: 'Craftify modern dark workspace UI',
      assetId: 'asset_hero_wallpaper',
    },
    styles: {
      width: '100%',
      maxHeight: '440px',
      borderRadius: '16px',
      objectFit: 'cover',
      border: '1px solid rgba(255, 255, 255, 0.12)',
    },
  });

  const heroContainer = createNode('Container', {
    name: 'Hero Content Column',
    props: { layout: 'flex-col' },
    styles: {
      maxWidth: '1100px',
      margin: '0 auto',
      alignItems: 'flex-start',
      gap: '8px',
    },
    children: [heroHeading, heroText, heroButton, heroImage],
  });

  const heroSection = createNode('Section', {
    name: 'Hero Showcase Section',
    props: { semanticTag: 'section' },
    styles: {
      padding: '72px 24px',
      backgroundColor: '#0c0c0e',
      borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    },
    children: [heroContainer],
  });

  // Feature Section with Grid of 3 Containers
  const featureCols = [
    {
      title: 'Visual Layout Engine',
      desc: 'Intuitive container blocks, flexbox primitives, and CSS grids built directly into the single-source-of-truth AST.',
    },
    {
      title: 'Zero Runtime Overhead',
      desc: 'Compiled directly to standard React 19 functional components and modern utility styling without heavy vendor locks.',
    },
    {
      title: 'Safe Multi-Tenant Isolation',
      desc: 'Cryptographically verified JWT identities and owner-scoped storage adapters protect user documents on every operation.',
    },
  ];

  const gridContainers = featureCols.map((col, idx) => {
    const cardHeading = createNode('Heading', {
      name: `Card ${idx + 1} Heading`,
      props: { text: col.title, level: 'h3' },
      styles: {
        fontSize: '20px',
        fontWeight: '700',
        color: '#f4f4f5',
        marginBottom: '8px',
      },
    });

    const cardText = createNode('Text', {
      name: `Card ${idx + 1} Description`,
      props: { content: col.desc },
      styles: {
        fontSize: '14px',
        color: '#71717a',
        lineHeight: '1.5',
      },
    });

    return createNode('Container', {
      name: `Feature Card ${idx + 1}`,
      props: { layout: 'flex-col' },
      styles: {
        padding: '24px',
        backgroundColor: '#141418',
        borderRadius: '14px',
        border: '1px solid rgba(255, 255, 255, 0.07)',
      },
      children: [cardHeading, cardText],
    });
  });

  const featureGrid = createNode('Grid', {
    name: 'Features 3-Col Grid',
    props: { columns: 3, gap: '24px' },
    styles: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
      gap: '24px',
      marginTop: '24px',
    },
    children: gridContainers,
  });

  const featureSectionContainer = createNode('Container', {
    name: 'Features Wrapper',
    props: { layout: 'flex-col' },
    styles: {
      maxWidth: '1100px',
      margin: '0 auto',
    },
    children: [
      createNode('Heading', {
        name: 'Features Section Title',
        props: { text: 'Engineered for Performance', level: 'h2' },
        styles: { fontSize: '28px', fontWeight: '700', color: '#ffffff' },
      }),
      featureGrid,
    ],
  });

  const featureSection = createNode('Section', {
    name: 'Features Section',
    props: { semanticTag: 'section' },
    styles: {
      padding: '72px 24px',
      backgroundColor: '#09090b',
    },
    children: [featureSectionContainer],
  });

  // Root Page Node
  const pageRootNode = createNode('Page', {
    id: generateId('root'),
    name: 'Home Page Root',
    props: {
      title: 'Craftify Studio Demo Landing',
      metaDescription: 'High-performance visual builder demo project.',
    },
    styles: {
      minHeight: '100vh',
      backgroundColor: '#09090b',
      color: '#f4f4f5',
    },
    children: [heroSection, featureSection],
  });

  const projectDocument = {
    schemaVersion: SCHEMA_VERSION,
    generatorVersion: GENERATOR_VERSION,
    project: {
      id: projectId,
      name,
      ownerId,
      createdAt: now,
      updatedAt: now,
    },
    pages: [
      {
        id: pageId,
        name: 'Home',
        path: '/',
        isHome: true,
        order: 0,
        root: pageRootNode,
      },
    ],
    assets: [
      {
        id: 'asset_hero_wallpaper',
        filename: 'img2.jpg',
        mimeType: 'image/jpeg',
        reference: '/img2.jpg',
        altText: 'Craftify dark metallic wallpaper',
      },
    ],
  };

  const validation = validateProject(projectDocument);
  if (!validation.ok) {
    throw new Error(`Demo seed project failed internal validation: ${validation.errors.join('; ')}`);
  }

  return projectDocument;
}

/**
 * Creates an empty baseline project with a single empty home page.
 * @param {string} ownerId
 * @param {string} [name='Blank Project']
 * @returns {object}
 */
export function createBlankProject(ownerId, name = 'Blank Project') {
  if (!ownerId || typeof ownerId !== 'string') {
    throw new Error('ownerId string is required to create blank project.');
  }

  const now = new Date().toISOString();
  const projectId = generateId('proj');
  const pageId = generateId('page');

  const emptyContainer = createNode('Container', {
    name: 'Initial Container',
    props: { layout: 'flex-col' },
    styles: {
      maxWidth: '1100px',
      margin: '0 auto',
      padding: '40px 0',
    },
    children: [
      createNode('Heading', {
        name: 'Welcome Heading',
        props: { text: 'Start Building Your Project', level: 'h1' },
      }),
      createNode('Text', {
        name: 'Welcome Text',
        props: { content: 'Add sections, containers, headings, and images to bring your design to life.' },
      }),
    ],
  });

  const emptySection = createNode('Section', {
    name: 'Initial Section',
    props: { semanticTag: 'section' },
    children: [emptyContainer],
  });

  const pageRootNode = createNode('Page', {
    id: generateId('root'),
    name: 'Home Page Root',
    props: {
      title: name,
      metaDescription: '',
    },
    children: [emptySection],
  });

  const projectDocument = {
    schemaVersion: SCHEMA_VERSION,
    generatorVersion: GENERATOR_VERSION,
    project: {
      id: projectId,
      name,
      ownerId,
      createdAt: now,
      updatedAt: now,
    },
    pages: [
      {
        id: pageId,
        name: 'Home',
        path: '/',
        isHome: true,
        order: 0,
        root: pageRootNode,
      },
    ],
    assets: [],
  };

  const validation = validateProject(projectDocument);
  if (!validation.ok) {
    throw new Error(`Blank project failed internal validation: ${validation.errors.join('; ')}`);
  }

  return projectDocument;
}
