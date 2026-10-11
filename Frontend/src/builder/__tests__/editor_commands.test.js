/**
 * Craftify Labs - Editor Commands & Undo/Redo Unit Tests
 * Uses native Node.js test runner (node:test, node:assert) with zero dependencies.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createDemoProject,
  createBlankProject,
  validateProject,
  createNode,
  findNode,
  findParent,
  insertNode,
  removeNode,
  updateNode,
  moveNode,
  moveUp,
  moveDown,
  duplicateNode,
  canNest,
  isSafeUrl,
  HEADING_LEVEL_DEFAULTS,
} from '../model/index.js';

test('1. Command: addNode inserts component and adheres to nesting rules', () => {
  const project = createBlankProject('user_test', 'Blank Test');
  const root = project.pages[0].root;

  // Insert Section into Page
  assert.equal(canNest('Page', 'Section'), true);
  const newSection = createNode('Section', { name: 'My Custom Section' });
  const rootWithSection = insertNode(root, root.id, newSection);

  assert.equal(rootWithSection.children.length, 2);
  const foundSection = findNode(rootWithSection, newSection.id);
  assert.ok(foundSection);
  assert.equal(foundSection.name, 'My Custom Section');

  // Insert Container into Section
  assert.equal(canNest('Section', 'Container'), true);
  const newContainer = createNode('Container');
  const rootWithContainer = insertNode(rootWithSection, newSection.id, newContainer);
  const foundContainer = findNode(rootWithContainer, newContainer.id);
  assert.ok(foundContainer);

  // Insert Heading into Container
  assert.equal(canNest('Container', 'Heading'), true);
  const newHeading = createNode('Heading', { props: { text: 'Hello Visual Builder' } });
  const finalRoot = insertNode(rootWithContainer, newContainer.id, newHeading);

  const foundHeading = findNode(finalRoot, newHeading.id);
  assert.ok(foundHeading);
  assert.equal(foundHeading.props.text, 'Hello Visual Builder');

  // Verify full project still validates
  project.pages[0].root = finalRoot;
  assert.equal(validateProject(project).ok, true);
});

test('2. Command: removeNode deletes target and root is protected', () => {
  const project = createDemoProject('user_test');
  const root = project.pages[0].root;

  // Root cannot be removed
  assert.equal(removeNode(root, root.id), null);

  // Remove first section
  const sectionId = root.children[0].id;
  const initialCount = root.children.length;
  const updatedRoot = removeNode(root, sectionId);

  assert.equal(updatedRoot.children.length, initialCount - 1);
  assert.equal(findNode(updatedRoot, sectionId), null);

  project.pages[0].root = updatedRoot;
  assert.equal(validateProject(project).ok, true);
});

test('3. Command: duplicateNode generates fresh IDs for all descendants', () => {
  const project = createDemoProject('user_test');
  const root = project.pages[0].root;
  const heroSection = root.children[0];

  const { newRoot, clonedNode } = duplicateNode(root, heroSection.id);

  assert.notEqual(clonedNode.id, heroSection.id);
  assert.equal(newRoot.children.length, root.children.length + 1);

  // Check children of cloned section have completely new IDs
  const originalHeroChildren = heroSection.children[0].children;
  const clonedHeroChildren = clonedNode.children[0].children;
  assert.equal(originalHeroChildren.length, clonedHeroChildren.length);

  for (let i = 0; i < clonedHeroChildren.length; i++) {
    assert.notEqual(clonedHeroChildren[i].id, originalHeroChildren[i].id);
    assert.equal(clonedHeroChildren[i].type, originalHeroChildren[i].type);
  }

  project.pages[0].root = newRoot;
  assert.equal(validateProject(project).ok, true);
});

test('4. Command: moveUp and moveDown reorders siblings correctly', () => {
  const container = createNode('Container', {
    children: [
      createNode('Heading', { props: { text: 'First' } }),
      createNode('Text', { props: { content: 'Second' } }),
      createNode('Button', { props: { label: 'Third' } }),
    ],
  });

  const headingId = container.children[0].id;
  const textId = container.children[1].id;
  const buttonId = container.children[2].id;

  // Moving topmost element up is a no-op
  const noopUp = moveUp(container, headingId);
  assert.equal(noopUp.children[0].id, headingId);

  // Moving second element up swaps with first
  const movedTextUp = moveUp(container, textId);
  assert.equal(movedTextUp.children[0].id, textId);
  assert.equal(movedTextUp.children[1].id, headingId);

  // Moving middle element down swaps with third
  const movedTextDown = moveDown(movedTextUp, headingId);
  assert.equal(movedTextDown.children[1].id, buttonId);
  assert.equal(movedTextDown.children[2].id, headingId);

  // Moving bottom element down is a no-op
  const noopDown = moveDown(movedTextDown, headingId);
  assert.equal(noopDown.children[2].id, headingId);
});

test('5. Command: updateProps and updateStyles are pure and validate URLs', () => {
  const container = createNode('Container', {
    children: [createNode('Button', { props: { label: 'Click', href: '#' } })],
  });

  const buttonId = container.children[0].id;

  // Safe update
  assert.equal(isSafeUrl('https://craftify.io'), true);
  const updatedContainer = updateNode(container, buttonId, {
    props: { label: 'Updated Label', href: 'https://craftify.io' },
    styles: { backgroundColor: '#4338ca', padding: '16px 32px' },
  });

  const button = findNode(updatedContainer, buttonId);
  assert.equal(button.props.label, 'Updated Label');
  assert.equal(button.props.href, 'https://craftify.io');
  assert.equal(button.styles.backgroundColor, '#4338ca');
  assert.equal(button.styles.padding, '16px 32px');

  // Original node was not mutated
  assert.equal(container.children[0].props.label, 'Click');

  // Rejection of javascript: URL
  assert.equal(isSafeUrl('javascript:alert(1)'), false);
});

test('6. Invalid nesting and root operations are rejected', () => {
  assert.equal(canNest('Heading', 'Section'), false);
  assert.equal(canNest('Text', 'Container'), false);
  assert.equal(canNest('Button', 'Heading'), false);
  assert.equal(canNest('Image', 'Text'), false);

  const root = createNode('Page');
  assert.throws(() => {
    duplicateNode(root, root.id);
  }, /Cannot duplicate the page root node/);
});

test('7. Undo/Redo stack behavior with grouped typing simulation', () => {
  let project = createDemoProject('user_test');
  const past = [];
  let future = [];

  const headingId = project.pages[0].root.children[0].children[0].children[0].id;

  function commit(newProj, isGrouped = false) {
    if (!isGrouped) {
      past.push(JSON.parse(JSON.stringify(project)));
    }
    future = [];
    project = newProj;
  }

  function undo() {
    if (past.length === 0) return;
    future.unshift(JSON.parse(JSON.stringify(project)));
    project = past.pop();
  }

  function redo() {
    if (future.length === 0) return;
    past.push(JSON.parse(JSON.stringify(project)));
    project = future.shift();
  }

  const initialTitle = findNode(project.pages[0].root, headingId).props.text;

  // Step 1: Typing edits (simulating rapid keystrokes grouped into 1 entry)
  // Keystroke 1: 'D'
  commit({
    ...project,
    pages: [{
      ...project.pages[0],
      root: updateNode(project.pages[0].root, headingId, { props: { text: 'D' } })
    }]
  }, false);

  // Keystrokes 2 & 3: grouped
  commit({
    ...project,
    pages: [{
      ...project.pages[0],
      root: updateNode(project.pages[0].root, headingId, { props: { text: 'Design' } })
    }]
  }, true);

  commit({
    ...project,
    pages: [{
      ...project.pages[0],
      root: updateNode(project.pages[0].root, headingId, { props: { text: 'Design Next-Gen' } })
    }]
  }, true);

  assert.equal(past.length, 1, 'Grouped typing should only produce 1 history snapshot');
  assert.equal(findNode(project.pages[0].root, headingId).props.text, 'Design Next-Gen');

  // Step 2: Add a new button
  const newBtn = createNode('Button', { props: { label: 'New Action' } });
  commit({
    ...project,
    pages: [{
      ...project.pages[0],
      root: insertNode(project.pages[0].root, project.pages[0].root.children[0].children[0].id, newBtn)
    }]
  }, false);

  assert.equal(past.length, 2);

  // Undo button add
  undo();
  assert.equal(findNode(project.pages[0].root, newBtn.id), null);
  assert.equal(future.length, 1);

  // Undo typing
  undo();
  assert.equal(findNode(project.pages[0].root, headingId).props.text, initialTitle);
  assert.equal(future.length, 2);

  // Redo typing
  redo();
  assert.equal(findNode(project.pages[0].root, headingId).props.text, 'Design Next-Gen');

  // A new edit after undo clears the future stack
  const anotherSection = createNode('Section');
  commit({
    ...project,
    pages: [{
      ...project.pages[0],
      root: insertNode(project.pages[0].root, project.pages[0].root.id, anotherSection)
    }]
  }, false);

  assert.equal(future.length, 0, 'New edit must clear redo stack');
});

test('8. Scripted visual editing session passes validateProject at every step', () => {
  let project = createBlankProject('user_scripted', 'Hero Builder');
  assert.equal(validateProject(project).ok, true);

  const rootId = project.pages[0].root.id;

  // Step 1: Add a Section
  const section = createNode('Section', { name: 'Hero Landmark' });
  project.pages[0].root = insertNode(project.pages[0].root, rootId, section);
  assert.equal(validateProject(project).ok, true);

  // Step 2: Add Container
  const container = createNode('Container', { props: { layout: 'flex-col' } });
  project.pages[0].root = insertNode(project.pages[0].root, section.id, container);
  assert.equal(validateProject(project).ok, true);

  // Step 3: Add Heading
  const heading = createNode('Heading', { props: { text: 'Craftify Website Builder', level: 'h1' } });
  project.pages[0].root = insertNode(project.pages[0].root, container.id, heading);
  assert.equal(validateProject(project).ok, true);

  // Step 4: Add Text
  const text = createNode('Text', { props: { content: 'Build fast, responsive web apps.' } });
  project.pages[0].root = insertNode(project.pages[0].root, container.id, text);
  assert.equal(validateProject(project).ok, true);

  // Step 5: Add Button
  const btn = createNode('Button', { props: { label: 'Get Started', href: 'https://craftify.io' } });
  project.pages[0].root = insertNode(project.pages[0].root, container.id, btn);
  assert.equal(validateProject(project).ok, true);

  // Step 6: Add Image
  const img = createNode('Image', { props: { src: '/img2.jpg', alt: 'Hero background' } });
  project.pages[0].root = insertNode(project.pages[0].root, container.id, img);
  assert.equal(validateProject(project).ok, true);

  // Step 7: Update styling
  project.pages[0].root = updateNode(project.pages[0].root, heading.id, {
    styles: { color: '#ffffff', fontSize: '48px', fontWeight: '800' },
  });
  assert.equal(validateProject(project).ok, true);

  // Step 8: Reorder button before text
  project.pages[0].root = moveUp(project.pages[0].root, btn.id);
  assert.equal(validateProject(project).ok, true);

  // Step 9: Duplicate container
  const { newRoot: dupRoot } = duplicateNode(project.pages[0].root, container.id);
  project.pages[0].root = dupRoot;
  assert.equal(validateProject(project).ok, true);

  // Step 10: Delete duplicated container
  project.pages[0].root = removeNode(project.pages[0].root, project.pages[0].root.children[1].children[1].id);
  assert.equal(validateProject(project).ok, true);
});

test('9. Heading level switching updates props, typography styles, and defaults accurately', () => {
  // 1. Initial createNode with default h2
  const headingH2 = createNode('Heading');
  assert.equal(headingH2.props.level, 'h2');
  assert.equal(headingH2.styles.fontSize, HEADING_LEVEL_DEFAULTS.h2.fontSize);
  assert.equal(headingH2.styles.fontWeight, HEADING_LEVEL_DEFAULTS.h2.fontWeight);

  // 2. Initial createNode with custom level h1
  const headingH1 = createNode('Heading', { props: { level: 'h1' } });
  assert.equal(headingH1.props.level, 'h1');
  assert.equal(headingH1.styles.fontSize, HEADING_LEVEL_DEFAULTS.h1.fontSize);
  assert.equal(headingH1.styles.fontWeight, HEADING_LEVEL_DEFAULTS.h1.fontWeight);

  // 3. Atomically update heading to H3
  const updatedRoot = updateNode(headingH1, headingH1.id, {
    props: { level: 'h3' },
    styles: {
      fontSize: HEADING_LEVEL_DEFAULTS.h3.fontSize,
      fontWeight: HEADING_LEVEL_DEFAULTS.h3.fontWeight,
      lineHeight: HEADING_LEVEL_DEFAULTS.h3.lineHeight,
    },
  });
  assert.equal(updatedRoot.props.level, 'h3');
  assert.equal(updatedRoot.styles.fontSize, '24px');
  assert.equal(updatedRoot.styles.fontWeight, '700');
  assert.equal(updatedRoot.styles.lineHeight, '1.25');

  // 4. Atomically update heading to H6
  const h6Root = updateNode(updatedRoot, updatedRoot.id, {
    props: { level: 'h6' },
    styles: {
      fontSize: HEADING_LEVEL_DEFAULTS.h6.fontSize,
      fontWeight: HEADING_LEVEL_DEFAULTS.h6.fontWeight,
      lineHeight: HEADING_LEVEL_DEFAULTS.h6.lineHeight,
    },
  });
  assert.equal(h6Root.props.level, 'h6');
  assert.equal(h6Root.styles.fontSize, '13px');
  assert.equal(h6Root.styles.fontWeight, '600');
  assert.equal(h6Root.styles.lineHeight, '1.4');
});

