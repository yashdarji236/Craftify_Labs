/**
 * Craftify Labs - Phase 1 Document Model & Storage Unit Tests
 * Uses Node.js native test runner (node:test, node:assert) with zero extra dependencies.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  SCHEMA_VERSION,
  GENERATOR_VERSION,
  NODE_TYPES,
  canNest,
  generateId,
  createNode,
  findNode,
  insertNode,
  removeNode,
  updateNode,
  cloneNode,
  validateProject,
  migrateProject,
  createDemoProject,
  createBlankProject,
  isSafeUrl,
} from '../model/index.js';

test('1. Demo Seed Project passes validation', () => {
  const seed = createDemoProject('user_owner_123');
  assert.equal(seed.schemaVersion, SCHEMA_VERSION);
  assert.equal(seed.generatorVersion, GENERATOR_VERSION);
  assert.equal(seed.project.ownerId, 'user_owner_123');
  assert.equal(seed.pages.length, 1);
  assert.equal(seed.pages[0].isHome, true);

  const res = validateProject(seed);
  assert.equal(res.ok, true, `Validation failed: ${res.errors?.join(', ')}`);
});

test('2. Blank Project passes validation', () => {
  const blank = createBlankProject('user_owner_123', 'My Blank Site');
  assert.equal(blank.project.name, 'My Blank Site');
  const res = validateProject(blank);
  assert.equal(res.ok, true);
});

test('3. Round-trip serialization preserves exact project structure', () => {
  const original = createDemoProject('user_owner_123');
  const serialized = JSON.stringify(original);
  const parsed = JSON.parse(serialized);

  const validation = validateProject(parsed);
  assert.equal(validation.ok, true);
  assert.deepEqual(validation.project, original);
});

test('4. Node IDs remain stable after non-structural updates', () => {
  const seed = createDemoProject('user_owner_123');
  const pageRoot = seed.pages[0].root;
  const heroSection = pageRoot.children[0];
  const originalHeroId = heroSection.id;

  const updatedTree = updateNode(pageRoot, originalHeroId, {
    name: 'Renamed Hero Showcase',
    props: { semanticTag: 'header' },
  });

  const updatedHero = findNode(updatedTree, originalHeroId);
  assert.ok(updatedHero, 'Node should exist with original ID');
  assert.equal(updatedHero.id, originalHeroId, 'Node ID must remain stable');
  assert.equal(updatedHero.name, 'Renamed Hero Showcase');
  assert.equal(updatedHero.props.semanticTag, 'header');
});

test('5. cloneNode produces all-new IDs and identical structure otherwise', () => {
  const container = createNode('Container', {
    name: 'Test Container',
    props: { layout: 'flex-row' },
    styles: { padding: '20px' },
    children: [
      createNode('Heading', { props: { text: 'Title' } }),
      createNode('Text', { props: { content: 'Paragraph' } }),
    ],
  });

  const cloned = cloneNode(container);

  assert.notEqual(cloned.id, container.id, 'Root cloned node must have a new ID');
  assert.equal(cloned.children.length, container.children.length);

  for (let i = 0; i < cloned.children.length; i++) {
    assert.notEqual(
      cloned.children[i].id,
      container.children[i].id,
      'Child node must receive a new unique ID'
    );
    assert.equal(cloned.children[i].type, container.children[i].type);
    assert.deepEqual(cloned.children[i].props, container.children[i].props);
  }
});

test('6. Validation rejects duplicate node IDs', () => {
  const proj = createDemoProject('user_1');
  // Inject duplicate ID
  proj.pages[0].root.children[1].id = proj.pages[0].root.children[0].id;

  const res = validateProject(proj);
  assert.equal(res.ok, false);
  assert.ok(res.errors.some((e) => e.includes('Duplicate node ID')));
});

test('7. Validation rejects unknown node types', () => {
  const proj = createDemoProject('user_1');
  proj.pages[0].root.children[0].type = 'CustomUnknownWidget';

  const res = validateProject(proj);
  assert.equal(res.ok, false);
  assert.ok(res.errors.some((e) => e.includes('unknown node type')));
});

test('8. Validation rejects invalid parent/child nesting rules', () => {
  assert.equal(canNest('Heading', 'Text'), false, 'Heading cannot nest Text');
  assert.equal(canNest('Page', 'Heading'), false, 'Page can only nest Section or Container directly');

  const proj = createDemoProject('user_1');
  // Illegally place a Section directly inside a Heading
  const heading = createNode('Heading', {
    children: [createNode('Section')],
  });
  proj.pages[0].root.children.push(heading);

  const res = validateProject(proj);
  assert.equal(res.ok, false);
  assert.ok(
    res.errors.some((e) => e.includes('cannot have children') || e.includes('Nesting rules violated'))
  );
});

test('9. Validation rejects multiple home pages', () => {
  const proj = createDemoProject('user_1');
  proj.pages.push({
    id: generateId('page'),
    name: 'Second Home',
    path: '/home-2',
    isHome: true,
    order: 1,
    root: createNode('Page'),
  });

  const res = validateProject(proj);
  assert.equal(res.ok, false);
  assert.ok(res.errors.some((e) => e.includes('exactly one home page')));
});

test('10. Validation rejects unsafe URL schemes (javascript:, data:)', () => {
  assert.equal(isSafeUrl('https://example.com'), true);
  assert.equal(isSafeUrl('http://localhost:3000'), true);
  assert.equal(isSafeUrl('/about'), true);
  assert.equal(isSafeUrl('#features'), true);
  assert.equal(isSafeUrl('mailto:support@craftify.io'), true);
  assert.equal(isSafeUrl('tel:+123456789'), true);
  assert.equal(isSafeUrl('javascript:alert(1)'), false);
  assert.equal(isSafeUrl('data:text/html,<script>alert(1)</script>'), false);

  const proj = createDemoProject('user_1');
  const heroContainer = proj.pages[0].root.children[0].children[0];
  const button = heroContainer.children.find((c) => c.type === 'Button');
  assert.ok(button, 'Demo project should have a Button in hero section');
  button.props.href = 'javascript:evil()';

  const res = validateProject(proj);
  assert.equal(res.ok, false);
  assert.ok(res.errors.some((e) => e.includes('unsafe URL')));
});

test('11. Validation rejects unsupported schemaVersion and malformed shapes', () => {
  const res1 = validateProject({ schemaVersion: 99 });
  assert.equal(res1.ok, false);
  assert.ok(res1.errors.some((e) => e.includes('Unsupported schemaVersion')));

  const res2 = validateProject(null);
  assert.equal(res2.ok, false);

  const res3 = validateProject({ schemaVersion: 1, generatorVersion: '1.0.0' });
  assert.equal(res3.ok, false);
  assert.ok(res3.errors.some((e) => e.includes('project')));
});

test('12. migrateProject migration chain handles v1 idempotently', () => {
  const proj = createDemoProject('user_1');
  const migrated = migrateProject(proj);
  assert.equal(migrated.schemaVersion, 1);
  assert.deepEqual(migrated, proj);
});

test('13. Multi-tenant storage ownership isolation logic', () => {
  // In-memory model of owner isolation as defined in IndexedDbProjectStorage
  const storageMap = new Map();

  function storeSave(project) {
    const val = validateProject(project);
    if (!val.ok) throw new Error('Invalid');
    storageMap.set(project.project.id, JSON.parse(JSON.stringify(project)));
  }

  function storeList(ownerId) {
    return Array.from(storageMap.values()).filter((p) => p.project.ownerId === ownerId);
  }

  function storeGet(id, ownerId) {
    const p = storageMap.get(id);
    if (!p || p.project.ownerId !== ownerId) return null;
    return p;
  }

  function storeDelete(id, ownerId) {
    const p = storeGet(id, ownerId);
    if (!p) throw new Error('Not found or unauthorized');
    storageMap.delete(id);
  }

  const userAProject = createDemoProject('user_A', 'Project A');
  const userBProject = createDemoProject('user_B', 'Project B');

  storeSave(userAProject);
  storeSave(userBProject);

  // User A should only see Project A
  const listA = storeList('user_A');
  assert.equal(listA.length, 1);
  assert.equal(listA[0].project.name, 'Project A');

  // User A cannot get User B's project
  const accessB = storeGet(userBProject.project.id, 'user_A');
  assert.equal(accessB, null);

  // User A cannot delete User B's project
  assert.throws(() => {
    storeDelete(userBProject.project.id, 'user_A');
  }, /Not found or unauthorized/);

  // User B's project is still safe
  assert.ok(storeGet(userBProject.project.id, 'user_B'));
});
