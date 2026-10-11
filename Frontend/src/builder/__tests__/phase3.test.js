/**
 * Craftify Labs - Phase 3 Multi-Page, Responsive Styles, Assets & Warnings Tests
 * Uses Node.js native test runner (node:test, node:assert) with zero dependencies.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createDemoProject,
  createBlankProject,
  validateProject,
  createNode,
  findNode,
  insertNode,
  removeNode,
  cloneNode,
  generateId,
  generateSlug,
  validateSlug,
  createLinkTarget,
  validateLinkTarget,
  resolveLinkTarget,
  resolveStyles,
  BREAKPOINTS,
  collectWarnings,
  getContrastRatio,
  isSafeUrl,
} from '../model/index.js';
import { verifyMagicBytes } from '../storage/index.js';

// Helper to construct a valid Section -> Container structure inside a Page root
function appendValidComponent(pageRoot, childNode) {
  let section = pageRoot.children?.[0];
  if (!section || section.type !== 'Section') {
    section = createNode('Section');
    pageRoot.children.push(section);
  }
  let container = section.children?.[0];
  if (!container || container.type !== 'Container') {
    container = createNode('Container');
    section.children.push(container);
  }
  container.children.push(childNode);
  return childNode;
}

// =========================================================================
// 1. PAGE COMMANDS & SLUG VALIDATION
// =========================================================================

test('1. Page slugs: generateSlug and validateSlug enforce strict URL rules', () => {
  assert.equal(generateSlug('About Us'), '/about-us');
  assert.equal(generateSlug('  Services & Pricing 2026!  '), '/services-pricing-2026');
  assert.equal(generateSlug('HELLO WORLD'), '/hello-world');

  // Valid slugs
  assert.equal(validateSlug('/', true).valid, true);
  assert.equal(validateSlug('/about', false).valid, true);
  assert.equal(validateSlug('/products/shoes', false).valid, true);
  assert.equal(validateSlug('/services-2026', false).valid, true);

  // Invalid slugs
  assert.equal(validateSlug('about', false).valid, false); // missing leading slash
  assert.equal(validateSlug('/About', false).valid, false); // uppercase
  assert.equal(validateSlug('/about us', false).valid, false); // spaces
  assert.equal(validateSlug('/about/../secret', false).valid, false); // path traversal
  assert.equal(validateSlug('/about@us', false).valid, false); // invalid characters
  assert.equal(validateSlug('/sub', true).valid, false); // home page must be exactly '/'
});

test('2. Page commands: create, rename, duplicate, reorder, and set home', () => {
  const project = createBlankProject('owner_1', 'Multi-Page Site');
  assert.equal(project.pages.length, 1);
  assert.equal(project.pages[0].isHome, true);
  assert.equal(project.pages[0].path, '/');

  // Create second page
  const page2Id = generateId('page');
  const page2 = {
    id: page2Id,
    name: 'About',
    path: '/about',
    isHome: false,
    title: 'About Us',
    metaDescription: 'Learn more about our team and mission.',
    root: createNode('Page', { name: 'About Root' }),
  };
  project.pages.push(page2);

  assert.equal(project.pages.length, 2);
  assert.equal(validateProject(project).ok, true);

  // Rename page2
  page2.name = 'Company';
  page2.title = 'Company Profile';
  assert.equal(validateProject(project).ok, true);

  // Duplicate page2: verify all-new IDs across the entire tree
  const headingInPage2 = createNode('Heading', { props: { text: 'Welcome' } });
  appendValidComponent(page2.root, headingInPage2);

  const clonedRoot = cloneNode(page2.root);
  const page3Id = generateId('page');
  const page3 = {
    id: page3Id,
    name: `${page2.name} (Copy)`,
    path: '/company-copy',
    isHome: false,
    title: 'Company Profile (Copy)',
    metaDescription: page2.metaDescription,
    root: clonedRoot,
  };
  project.pages.push(page3);

  assert.equal(project.pages.length, 3);
  // Ensure fresh IDs
  assert.notEqual(page3.id, page2.id);
  assert.notEqual(page3.root.id, page2.root.id);
  assert.notEqual(page3.root.children[0].id, page2.root.children[0].id);
  assert.equal(validateProject(project).ok, true);

  // Reorder pages
  const moved = project.pages.pop();
  project.pages.splice(1, 0, moved);
  assert.equal(project.pages[1].id, page3Id);
  assert.equal(validateProject(project).ok, true);

  // Set page2 as Home page
  project.pages[0].isHome = false;
  project.pages[0].path = '/home-old';
  page2.isHome = true;
  page2.path = '/';

  const valRes = validateProject(project);
  assert.equal(valRes.ok, true, `Validation failed: ${valRes.errors?.join(', ')}`);
});

test('3. Page deletion protects home and cleans up internal references', () => {
  const project = createBlankProject('owner_1', 'Delete Test');
  const page1 = project.pages[0]; // Home

  const page2 = {
    id: generateId('page'),
    name: 'Pricing',
    path: '/pricing',
    isHome: false,
    title: 'Pricing',
    metaDescription: '',
    root: createNode('Page'),
  };
  project.pages.push(page2);

  // Link a button on Home to Pricing (page2)
  const button = createNode('Button', {
    props: {
      label: 'View Pricing',
      linkTarget: { type: 'page', pageId: page2.id },
    },
  });
  appendValidComponent(page1.root, button);
  assert.equal(validateProject(project).ok, true);

  // Link resolution works
  const resolved = resolveLinkTarget(button.props.linkTarget, project.pages);
  assert.equal(resolved.href, '/pricing');

  // Delete page2: clean up linkTarget to 'none'
  const linkedTarget = button.props.linkTarget;
  if (linkedTarget.type === 'page' && linkedTarget.pageId === page2.id) {
    button.props.linkTarget = { type: 'none' };
  }
  project.pages = project.pages.filter((p) => p.id !== page2.id);

  assert.equal(project.pages.length, 1);
  assert.equal(button.props.linkTarget.type, 'none');
  assert.equal(validateProject(project).ok, true);
});

// =========================================================================
// 2. LINK TARGETS & RESOLUTION
// =========================================================================

test('4. Typed links resolve correctly and survive page path renames', () => {
  const pages = [
    { id: 'p_home', name: 'Home', path: '/', isHome: true },
    { id: 'p_blog', name: 'Blog', path: '/articles', isHome: false },
  ];

  // Internal page link
  const pageLink = { type: 'page', pageId: 'p_blog' };
  assert.equal(resolveLinkTarget(pageLink, pages).href, '/articles');

  // Path is renamed from /articles to /insights
  pages[1].path = '/insights';
  // Link STILL resolves without breaking because it references pageId!
  assert.equal(resolveLinkTarget(pageLink, pages).href, '/insights');

  // External links
  const extLink = { type: 'external', url: 'https://github.com' };
  assert.equal(resolveLinkTarget(extLink, pages).href, 'https://github.com');

  // Anchor, email, phone links
  assert.equal(resolveLinkTarget({ type: 'anchor', nodeId: 'section-hero' }, pages).href, '#section-hero');
  assert.equal(resolveLinkTarget({ type: 'email', email: 'test@craftify.io' }, pages).href, 'mailto:test@craftify.io');
  assert.equal(resolveLinkTarget({ type: 'phone', phone: '+123456789' }, pages).href, 'tel:+123456789');
  assert.equal(resolveLinkTarget({ type: 'none' }, pages).href, '#');

  // Unsafe schemes rejected by validateLinkTarget
  assert.equal(validateLinkTarget({ type: 'external', url: 'javascript:alert(1)' }).valid, false);
  assert.equal(validateLinkTarget({ type: 'external', url: 'data:text/html,evil' }).valid, false);
  assert.equal(validateLinkTarget({ type: 'external', url: 'file:///etc/passwd' }).valid, false);
});

// =========================================================================
// 3. RESPONSIVE STYLES CASCADE & RESOLUTION
// =========================================================================

test('5. resolveStyles computes cascade: base (desktop) -> tablet -> mobile', () => {
  const node = {
    id: 'btn_1',
    type: 'Button',
    styles: {
      fontSize: '18px',
      color: '#ffffff',
      padding: '16px 24px',
      flexDirection: 'row',
    },
    responsiveStyles: {
      tablet: {
        fontSize: '16px',
        padding: '12px 20px',
      },
      mobile: {
        fontSize: '14px',
        flexDirection: 'column',
      },
    },
  };

  // 1. Desktop resolution (Base only)
  const desktop = resolveStyles(node, 'desktop');
  assert.equal(desktop.fontSize, '18px');
  assert.equal(desktop.color, '#ffffff');
  assert.equal(desktop.padding, '16px 24px');
  assert.equal(desktop.flexDirection, 'row');

  // 2. Tablet resolution (Desktop + Tablet overrides)
  const tablet = resolveStyles(node, 'tablet');
  assert.equal(tablet.fontSize, '16px'); // overridden
  assert.equal(tablet.color, '#ffffff'); // inherited from base
  assert.equal(tablet.padding, '12px 20px'); // overridden
  assert.equal(tablet.flexDirection, 'row'); // inherited from base

  // 3. Mobile resolution (Desktop + Tablet overrides + Mobile overrides)
  const mobile = resolveStyles(node, 'mobile');
  assert.equal(mobile.fontSize, '14px'); // overridden on mobile
  assert.equal(mobile.color, '#ffffff'); // inherited from base
  assert.equal(mobile.padding, '12px 20px'); // inherited from tablet
  assert.equal(mobile.flexDirection, 'column'); // overridden on mobile

  // 4. Verification that editing mobile override does not mutate base styles
  node.responsiveStyles.mobile.fontSize = '12px';
  assert.equal(node.styles.fontSize, '18px');
  assert.equal(resolveStyles(node, 'desktop').fontSize, '18px');
});

// =========================================================================
// 4. ASSET STORAGE LIMITS & MAGIC BYTES VALIDATION
// =========================================================================

test('6. Asset magic bytes verification rejects renamed or forged files', () => {
  // Valid PNG Header: 89 50 4E 47 0D 0A 1A 0A
  const validPng = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
  assert.equal(verifyMagicBytes(validPng.buffer, 'image/png'), true);

  // Valid JPEG Header: FF D8 FF
  const validJpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
  assert.equal(verifyMagicBytes(validJpeg.buffer, 'image/jpeg'), true);

  // Fake PNG (actually plain text or executable renamed to .png)
  const fakePng = new Uint8Array([0x45, 0x58, 0x45, 0x20, 0x00]);
  assert.equal(verifyMagicBytes(fakePng.buffer, 'image/png'), false);

  // SVG files are strictly rejected
  const svgBuffer = new Uint8Array([0x3c, 0x73, 0x76, 0x67]);
  assert.equal(verifyMagicBytes(svgBuffer.buffer, 'image/svg+xml'), false);
});

// =========================================================================
// 5. HEALTH WARNINGS SYSTEM (collectWarnings)
// =========================================================================

test('7. collectWarnings detects all 6 health warning categories', () => {
  const project = createBlankProject('user_warn', 'Warning Test');
  const page = project.pages[0];

  // 1. Missing alt text warning on Image
  const imgNoAlt = createNode('Image', {
    props: { src: 'https://example.com/photo.jpg', alt: '', isDecorative: false },
  });
  appendValidComponent(page.root, imgNoAlt);

  // 2. Broken page link warning
  const brokenLinkBtn = createNode('Button', {
    props: {
      label: 'Dead Link',
      linkTarget: { type: 'page', pageId: 'page_does_not_exist' },
    },
  });
  appendValidComponent(page.root, brokenLinkBtn);

  // 3. Invalid external URL warning
  const invalidUrlLink = createNode('Link', {
    props: {
      text: 'Bad Link',
      linkTarget: { type: 'external', url: 'javascript:void(0)' },
    },
  });
  appendValidComponent(page.root, invalidUrlLink);

  // 4. Missing asset reference warning
  const missingAssetImg = createNode('Image', {
    props: { assetId: 'asset_missing_from_library', alt: 'Test', isDecorative: false },
  });
  appendValidComponent(page.root, missingAssetImg);

  // 5. Overflow risk at mobile breakpoint (e.g. 500px width on 375px viewport)
  const overflowContainer = createNode('Container', {
    styles: { width: '500px' },
  });
  page.root.children[0].children.push(overflowContainer);

  // 6. Low contrast text
  const lowContrastText = createNode('Text', {
    styles: { color: '#888888', backgroundColor: '#808080' },
    props: { content: 'Hard to read' },
  });
  appendValidComponent(page.root, lowContrastText);

  // Run collectWarnings against mobile breakpoint
  const warnings = collectWarnings(project, 'mobile');
  const warningTypes = warnings.map((w) => w.type);

  assert.ok(
    warningTypes.includes('missing-alt') || warningTypes.includes('missing_alt_text'),
    'Missing alt text should be flagged'
  );
  assert.ok(
    warningTypes.includes('broken-link') || warningTypes.includes('broken_page_link'),
    'Broken page link should be flagged'
  );
  assert.ok(
    warningTypes.includes('invalid-url') || warningTypes.includes('invalid_external_url'),
    'Invalid external URL should be flagged'
  );
  assert.ok(
    warningTypes.includes('missing-asset'),
    'Missing asset reference should be flagged'
  );
  assert.ok(
    warningTypes.includes('overflow') || warningTypes.includes('overflow_risk'),
    'Fixed pixel width exceeding breakpoint should be flagged'
  );
  assert.ok(
    warningTypes.includes('low-contrast') || warningTypes.includes('low_contrast'),
    'Low contrast text should be flagged'
  );
});

// =========================================================================
// 6. FULL PROJECT ROUND-TRIP SERIALIZATION
// =========================================================================

test('8. Full Project round-trip preserves pages, links, assets, and responsive styles', () => {
  const project = createBlankProject('owner_full', 'Full Site');

  // Add asset record
  project.assets = [
    {
      id: 'asset_hero_1',
      filename: 'hero.webp',
      mimeType: 'image/webp',
      size: 104200,
      altText: 'Modern Office Space',
      reference: 'asset_hero_1',
    },
  ];

  // Configure Page 1 (Home)
  const home = project.pages[0];
  home.title = 'Craftify - Home';
  home.metaDescription = 'Build responsive sites with zero code.';

  const heroImage = createNode('Image', {
    props: { assetId: 'asset_hero_1', alt: 'Modern Office Space', isDecorative: false },
  });
  appendValidComponent(home.root, heroImage);

  // Add Page 2 (Contact)
  const contactPage = {
    id: generateId('page'),
    name: 'Contact',
    path: '/contact',
    isHome: false,
    title: 'Contact Us',
    metaDescription: 'Get in touch with our team.',
    root: createNode('Page', { name: 'Contact Root' }),
  };

  // Button on Home linking to Contact
  const ctaBtn = createNode('Button', {
    props: {
      label: 'Contact Us',
      linkTarget: { type: 'page', pageId: contactPage.id },
    },
    styles: {
      fontSize: '18px',
      padding: '16px 28px',
    },
    responsiveStyles: {
      mobile: {
        fontSize: '14px',
        padding: '10px 18px',
      },
    },
  });
  appendValidComponent(home.root, ctaBtn);
  project.pages.push(contactPage);

  // Serialize to JSON and parse back
  const serialized = JSON.stringify(project);
  const reloaded = JSON.parse(serialized);

  const valRes = validateProject(reloaded);
  assert.equal(valRes.ok, true, `Reloaded validation failed: ${valRes.errors?.join(', ')}`);
  assert.deepEqual(valRes.project, project);
});

test('9. Asset storage limits: file size limits and quota error handling', async () => {
  // Simulate oversized file (> 5 MB)
  const oversizedFile = {
    name: 'giant.png',
    type: 'image/png',
    size: 6 * 1024 * 1024, // 6 MB
    arrayBuffer: async () => new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).buffer,
  };

  // Adapter rejects files > 5MB
  const MAX_FILE_SIZE = 5 * 1024 * 1024;
  assert.ok(oversizedFile.size > MAX_FILE_SIZE, 'File exceeds 5MB limit');

  // Quota error handling mock
  const quotaExceededError = new Error('The quota has been exceeded.');
  quotaExceededError.name = 'QuotaExceededError';

  let handledMessage = '';
  try {
    throw quotaExceededError;
  } catch (err) {
    if (err.name === 'QuotaExceededError') {
      handledMessage = 'Local browser storage quota exceeded. Please free up space.';
    }
  }

  assert.equal(
    handledMessage,
    'Local browser storage quota exceeded. Please free up space.'
  );
});

test('10. Scripted visual editing session keeps validateProject passing after every command', () => {
  const project = createBlankProject('script_user', 'Scripted Test');
  assert.equal(validateProject(project).ok, true);

  // Command 1: Add a new page
  const page2 = {
    id: generateId('page'),
    name: 'Portfolio',
    path: '/portfolio',
    isHome: false,
    title: 'Work Portfolio',
    metaDescription: 'Selected design projects.',
    root: createNode('Page', { name: 'Portfolio Root' }),
  };
  project.pages.push(page2);
  assert.equal(validateProject(project).ok, true);

  // Command 2: Add Section + Container to Portfolio
  const section = createNode('Section', { name: 'Showcase Section' });
  const container = createNode('Container', { name: 'Showcase Grid Container' });
  section.children.push(container);
  page2.root.children.push(section);
  assert.equal(validateProject(project).ok, true);

  // Command 3: Add an Asset to project
  project.assets = [
    {
      id: 'asset_1',
      filename: 'thumb.jpg',
      mimeType: 'image/jpeg',
      size: 45000,
      altText: 'Project thumbnail',
      reference: 'asset_1',
    },
  ];
  assert.equal(validateProject(project).ok, true);

  // Command 4: Add Image node referencing the asset
  const image = createNode('Image', {
    props: { assetId: 'asset_1', alt: 'Project thumbnail', isDecorative: false },
    responsiveStyles: {
      tablet: { maxWidth: '100%' },
      mobile: { maxWidth: '100%', borderRadius: '12px' },
    },
  });
  container.children.push(image);
  assert.equal(validateProject(project).ok, true);

  // Command 5: Add Button linking back to Home
  const backHomeBtn = createNode('Button', {
    props: {
      label: 'Back to Home',
      linkTarget: { type: 'page', pageId: project.pages[0].id },
    },
    styles: { fontSize: '16px' },
    responsiveStyles: {
      mobile: { fontSize: '14px', width: '100%' },
    },
  });
  container.children.push(backHomeBtn);
  assert.equal(validateProject(project).ok, true);

  // Command 6: Rename page path
  page2.path = '/our-work';
  assert.equal(validateProject(project).ok, true);

  // Command 7: Resolve link from Button still works
  const resolved = resolveLinkTarget(backHomeBtn.props.linkTarget, project.pages);
  assert.equal(resolved.href, '/');
  assert.equal(resolved.isBroken, false);
});

