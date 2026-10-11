# Craftify Labs - Visual Editor Architecture (Phase 2)

## 1. State Architecture & Single Source of Truth

The Visual Editor operates on a strict single-source-of-truth architecture powered by the validated Document AST (`Project` document model). No competing internal data model (such as GrapesJS/ProseMirror trees) is introduced.

```
┌────────────────────────────────────────────────────────┐
│                   EditorProvider                       │
│                                                        │
│  ┌─────────────────────────┐  ┌─────────────────────┐  │
│  │  Document Model State   │  │   Ephemeral State   │  │
│  │   - project (AST Tree)  │  │   - selectedNodeId  │  │
│  │   - past (Undo stack)   │  │   - hoveredNodeId   │  │
│  │   - future (Redo stack) │  │   - dirty flag      │  │
│  │                         │  │   - saveStatus      │  │
│  └─────────────────────────┘  └─────────────────────┘  │
│               │                          │             │
│               ▼                          ▼             │
│ Component Palette ─► Canvas ◄─ Layers Panel ◄─► Inspector
└────────────────────────────────────────────────────────┘
```

- **Document AST**: Pure JSON tree managed through pure, immutable model helpers in `src/builder/model/tree.js`.
- **Ephemeral State**: Selection, hover, dirty flag, and saving status are maintained in React state without polluting the document.
- **Auto-Save**: Debounced auto-save (800ms) persists the document to the IndexedDB storage adapter, with clear visual state indicators (`Saved`, `Saving...`, `Save Error (Retry)`).

---

## 2. Editor Commands Reference

Every document transformation executes through a typed command that validates against nesting rules (`canNest`) and immutably returns a new document.

| Command | Arguments | Validation / Rules | Description |
| :--- | :--- | :--- | :--- |
| `addNode` | `(type, parentId?, index?)` | Enforces `canNest(parent.type, type)`. Rejects invalid targets. | Inserts a new component node with default props/styles from the registry. |
| `removeNode` | `(targetId)` | **Protected**: Page root cannot be deleted. | Removes the node and updates selection to the nearest valid parent. |
| `duplicateNode`| `(targetId)` | **Protected**: Page root cannot be duplicated. | Deep-clones the node subtree with fresh unique IDs and inserts it adjacent to the original. |
| `moveNode` | `(targetId, newParentId, newIndex?)`| Enforces `canNest(newParent.type, target.type)`. Disallows cycles. | Moves a node to a new parent or reorders within an existing parent. |
| `moveUp` | `(targetId)` | Boundary check (no-op if already topmost sibling). | Swaps node with previous sibling. |
| `moveDown` | `(targetId)` | Boundary check (no-op if already bottom sibling). | Swaps node with next sibling. |
| `updateProps` | `(targetId, propUpdates, debounce?)` | Enforces URL security policy (`isSafeUrl`). Rejects `javascript:`. | Immutably merges prop values. Debounced for rapid typing. |
| `updateStyles`| `(targetId, styleUpdates, debounce?)`| Primitives only (strings, numbers). Rejects script injection. | Immutably merges CSS styles. Debounced for range sliders. |
| `renameNode` | `(targetId, newName)` | Requires non-empty string. | Updates the human-readable label shown in layers and toolbar. |

---

## 3. Undo / Redo & Rapid-Edit Grouping

- **Stack Limit**: Capped at 100 historical snapshots with structural sharing.
- **Clearing Redo**: Any new mutation after an undo automatically clears the `future` redo stack.
- **Selection Safety**: Undoing past a node deletion or redacting into a previous state automatically falls back to the page root if the previously selected node does not exist.
- **Rapid-Edit Grouping**: Consecutive edits to the same field (e.g. typing text into an input or sliding a color/opacity slider) within 500ms update the latest history entry in place rather than creating hundreds of microscopic undo steps.

---

## 4. Keyboard Shortcuts

Shortcuts are automatically bypassed whenever the user is typing inside an `input`, `textarea`, `select`, or `contenteditable` element.

| Shortcut (Mac) | Shortcut (Windows/Linux) | Action | Scope |
| :--- | :--- | :--- | :--- |
| `Cmd + Z` | `Ctrl + Z` | **Undo** last edit | Global Canvas/Editor |
| `Cmd + Shift + Z` / `Cmd + Y` | `Ctrl + Shift + Z` / `Ctrl + Y` | **Redo** next edit | Global Canvas/Editor |
| `Cmd + D` | `Ctrl + D` | **Duplicate** selected node | Canvas / Layers |
| `Backspace` / `Delete` | `Backspace` / `Delete` | **Delete** selected node (root protected) | Canvas / Layers |
| `Alt + Up` | `Alt + Up` | **Move node up** among siblings | Canvas / Layers |
| `Alt + Down` | `Alt + Down` | **Move node down** among siblings | Canvas / Layers |
| `Escape` | `Escape` | **Deselect** node (fallback to page) | Global Editor |
| `Enter` (double click) | `Enter` (double click) | **Inline text edit** (Heading, Text, Button, Link)| Canvas |

---

## 5. Drag-and-Drop & Drop Indicators

- **Component Palette Drag**: Drag any palette element over the canvas. Drop zone lines indicate where the new element will be inserted.
- **Canvas Reordering**: Drag existing canvas elements to reorder or re-parent. Drop zones validate `canNest` rules before committing.
- **Palette Click Alternative**: Clicking any component in the palette inserts it into the currently selected container or the nearest valid parent.

---

## 6. Inline Text Editing

Double-clicking any `Heading`, `Text`, `Button`, or `Link` opens a plain-text inline editing box:
- Text is treated strictly as plain text (escaped automatically by JSX).
- Press `Enter` to commit (`Shift + Enter` inserts a newline in `Text` paragraphs).
- Press `Escape` or click away to cancel or commit.

---

## 7. Schema-Driven Properties Inspector

The Properties Inspector provides schema-driven controls:
- **Heading**: Semantic level selector (`h1`-`h6`), title text.
- **Text**: Multi-line paragraph content.
- **Button / Link**: Label text, destination URL (with live URL scheme validation), and target window (`_self`, `_blank`).
- **Image**: Source URL, alt text (with WCAG accessibility warnings if blank).
- **Grid / Container**: Columns count (1-6 slider), gap selector, flex layout direction (`column`, `row`).
- **Styles**: Typography (font family, size, weight, line height, text color), background color, padding, margin, max width, border radius.
- **Contrast Hint**: Automatic relative luminance contrast check. If text-to-background ratio is below 4.5:1, a warning badge alerts the designer.

---

## 8. Figma 2024 UI Shell Structure

The Visual Editor adheres to the modern Figma 2024 design system:

```
┌────┬───────────────────────┬──────────────────────────────────────────┬────────────────────────┐
│ ❖  │ Project Title   Drafts│                                          │  Y v    ▷   [ Share ]  │
│────│───────────────────────│                                          │────────────────────────│
│File│ Pages           Q  +  │                                          │ Design  Prototype 1280 │
│    │  Page 1               │             Infinite Canvas              │────────────────────────│
│Agts│───────────────────────│                (#1e1e1e)                 │ Page #1E1E1E 100%   👁  │
│    │ Layers           AST  │                                          │ Styles               + │
│Asst│  ❖ Page               │                                          │ Export               + │
│    │    ❖ Section          │                                          │────────────────────────│
│Tool│      ❖ Container      │                                          │ Component Inspector    │
│    │        ❖ Heading      │                                          │ (Schema Properties)    │
│Var │        ❖ Text         │                                          │                        │
│    │                       │  ┌────────────────────────────────────┐  │ Bring 3rd-Party Agents │
│    │                       │  │ ↖  #  □  ✎  T  ○  㗊 │ ⊞ 🗔 📱 │ 100% │  │ [ Set up agents ]      │
│ ⤹  │                       │  └────────────────────────────────────┘  │                        │
└────┴───────────────────────┴──────────────────────────────────────────┴────────────────────────┘
```

1. **Left Icon Rail (48px)**:
   - Top `❖` Figma menu button (opens dashboard navigation, save, import/export, undo/redo).
   - Icons: `File` (Pages & Layers), `Agents` (Component Palette), `Assets` (Asset Library & Uploads), `Tools` (Health Checks & Warnings), `Variables` (Theme tokens).
   - Bottom sidebar collapse/expand toggle.

2. **Left Drawer Panel (260px)**:
   - Displays context for the selected rail tab.
   - For `File`: Project name, `Drafts Free` badge, searchable `Pages` manager with inline creation, and AST `Layers` tree with reordering, renaming, duplication, and visibility toggling.

3. **Infinite Canvas**:
   - `#1e1e1e` viewport background.
   - Interactive zoom (`10%` to `400%`, presets, fit-to-screen) and infinite pan via middle-mouse drag or Hand tool (`H` / Spacebar).
   - Movable component dragging with CSS transforms and visual alignment guides.
   - **Floating Bottom Dock**: Centered floating pill containing selection tools (`↖`, `#`, `□`, `✎`, `T`, `○`, `㗊`), responsive breakpoint modes (`Desktop 1280px`, `Tablet 768px`, `Mobile 375px`), zoom controls, and help button (`?`) at bottom right.

4. **Right Inspector (288px)**:
   - Top bar: Profile avatar (`Y v`), Play preview button (`▷`), blue `Share` button.
   - Tabs: `Design` and `Prototype` with active breakpoint indicator.
   - `Page` section with `#1E1E1E 100%` color swatch and visibility toggle.
   - `Styles` `+` and `Export` `+` collapsible sections.
   - Schema-driven property controls with responsive override badges (amber pill for overrides, reset action).
   - Bottom "Bring third-party agents to Figma" card with "Set up agents" button.

---

## 9. Responsive Overrides & Breakpoints

- Breakpoints: Desktop (1280px), Tablet (768px), Mobile (375px).
- Cascading: Styles cascade downward Desktop -> Tablet -> Mobile.
- Breakpoint-specific overrides are saved in `node.responsiveStyles[breakpoint]`.
- Resetting an override removes the key from the breakpoint object, restoring inherited base values.
