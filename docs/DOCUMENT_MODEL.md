# Craftify Labs - Document Model Specification

## 1. Overview & Single Source of Truth

The Craftify Labs document model is an immutable, strictly-typed Abstract Syntax Tree (AST) representing web pages, structural containers, and content nodes. It serves as the single source of truth across all application phases:
- The **Visual Editor** renders and manipulates this model.
- The **Storage Adapter** persists and retrieves this model.
- The future **Preview Runtime** will execute animations and interactions from this model.
- The future **React Code Generator** will compile this model directly into clean React 19 JSX and Vite components.

Arbitrary HTML strings are never stored or trusted as document truth.

---

## 2. Top-Level Project Document Structure

```json
{
  "schemaVersion": 1,
  "generatorVersion": "1.0.0",
  "project": {
    "id": "proj_1791621800000_abc123",
    "name": "My Landing Page",
    "ownerId": "user_6ac9fb69ca1660dbeffad5c0",
    "createdAt": "2026-10-10T08:46:33.851Z",
    "updatedAt": "2026-10-10T09:12:00.000Z"
  },
  "pages": [
    {
      "id": "page_1791621800000_def456",
      "name": "Home",
      "path": "/",
      "isHome": true,
      "order": 0,
      "root": {
        "id": "root_1791621800000_ghi789",
        "type": "Page",
        "name": "Home Page Root",
        "props": { "title": "Home", "metaDescription": "" },
        "styles": { "minHeight": "100vh", "backgroundColor": "#09090b" },
        "responsiveStyles": { "tablet": {}, "mobile": {} },
        "children": []
      }
    }
  ],
  "assets": []
}
```

### Top-Level Fields

| Field | Type | Description |
| :--- | :--- | :--- |
| `schemaVersion` | `number` | Version integer (starts at `1`). Used for sequential migrations. |
| `generatorVersion` | `string` | Semantic version string of the generator engine (e.g. `'1.0.0'`). |
| `project` | `object` | Metadata containing `id`, `name`, `ownerId` (verified user), `createdAt`, `updatedAt`. |
| `pages` | `Page[]` | Non-empty array of pages. Exactly one must have `isHome: true`. `path` must start with `/`. |
| `assets` | `Asset[]` | Registered media metadata references (`id`, `filename`, `mimeType`, `reference`, `altText`). |

---

## 3. Node AST Schema & Closed Union

Every element in a page tree is a `Node` object:

```typescript
interface Node {
  id: string;                                  // Globally unique, URL-safe identifier
  type: NodeType;                              // Member of closed NodeType union
  name?: string;                               // Optional human-readable layer label
  props: Record<string, string | number | boolean | null>;
  styles: Record<string, string | number>;     // Inline CSS style tokens
  responsiveStyles: {                          // Reserved for Phase 3 breakpoint overrides
    tablet?: Record<string, string | number>;
    mobile?: Record<string, string | number>;
  };
  children: Node[];                            // Child nodes (empty array for leaf nodes)
  animation?: AnimationConfig;                 // Reserved typed animation config
  interactions?: Interaction[];                // Reserved typed interaction triggers
}
```

### Closed Union of Node Types

| Node Type | Category | Can Have Children? | Allowed Children | Default Key Props |
| :--- | :--- | :---: | :--- | :--- |
| **`Page`** | Root Container | Yes | `Section`, `Container` | `title`, `metaDescription` |
| **`Section`** | Landmark Container | Yes | `Container`, `Heading`, `Text`, `Image`, `Button`, `Link`, `Grid`, `Spacer`, `Divider`, `Form` | `semanticTag` (`section`) |
| **`Container`** | Flex Container | Yes | `Container`, `Heading`, `Text`, `Image`, `Button`, `Link`, `Grid`, `Spacer`, `Divider`, `Form`, `Input` | `layout` (`flex-col`) |
| **`Grid`** | Grid Container | Yes | `Container` | `columns` (`3`), `gap` (`24px`) |
| **`Heading`** | Content Leaf | **No** | None | `text`, `level` (`h1`-`h6`) |
| **`Text`** | Content Leaf | **No** | None | `content` |
| **`Image`** | Visual Leaf | **No** | None | `src`, `alt`, `assetId` |
| **`Button`** | Action Leaf | **No** | None | `label`, `href`, `target` |
| **`Link`** | Anchor Leaf | **No** | None | `text`, `href`, `target` |
| **`Spacer`** | Spacing Leaf | **No** | None | `height` (`32px`) |
| **`Divider`** | Rule Leaf | **No** | None | *(none)* |
| **`Form`** | Interactive Container | Yes | `Container`, `Heading`, `Text`, `Input`, `Button`, `Divider`, `Spacer` | `action`, `method` |
| **`Input`** | Form Control Leaf | **No** | None | `placeholder`, `type`, `name`, `required` |

---

## 4. Security & URL Validation Policy

To prevent XSS and script injection:
1. `dangerouslySetInnerHTML`, `eval`, and `new Function` are strictly forbidden.
2. All text content is rendered as escaped text nodes in JSX.
3. Props and styles only accept primitive strings, numbers, or booleans. Object prototype tampering is rejected.
4. URLs in `href`, `src`, and `action` props must pass `isSafeUrl`:
   - **Allowed**: `http:`, `https:`, `mailto:`, `tel:`, internal paths starting with `/`, and `#anchor` targets.
   - **Rejected**: `javascript:`, `data:`, `vbscript:`, and any URI schemes containing script execution vectors.

---

## 5. Versioning & Migration Chain

The document model uses an explicit migration chain in `Frontend/src/builder/model/validator.js`:

```javascript
const MIGRATIONS = {
  1: (doc) => doc, // Schema Version 1 (Current baseline)
  // 2: (doc) => migrateV1ToV2(doc), // Reserved for future schema updates
};
```

When importing or loading a project, `migrateProject(doc)` runs sequentially from `doc.schemaVersion` up to `SCHEMA_VERSION`, ensuring backward compatibility across releases without breaking user documents.

---

## 6. Phase 3 Additions & Specifications

### 6.1 Multi-Page Document Model
Projects contain an array of `pages`. Each page has:
- `id`: Unique string (`page_...`).
- `name`: Display label (e.g. "About Us").
- `path`: URL route path, starting with `/` (e.g. `/about-us`), generated and validated via `generateSlug()` and `validateSlug()`.
- `isHome`: Boolean. Exactly one page must have `isHome: true` with path `/`.
- `order`: Integer sequence index for navigation menus.
- `root`: Root AST node of type `Page`.

### 6.2 Typed Link Targets (`linkTarget`)
Nodes supporting links (`Button`, `Link`, etc.) utilize a typed object `linkTarget`:
```typescript
type LinkTarget =
  | { type: 'none' }
  | { type: 'page'; pageId: string }
  | { type: 'external'; url: string; newTab?: boolean }
  | { type: 'anchor'; nodeId: string }
  | { type: 'email'; email: string; subject?: string }
  | { type: 'phone'; phone: string };
```
Resolution is computed via `resolveLinkTarget(target, project)`, generating safe `href` and `target` attributes.

### 6.3 Responsive Style Overrides (`responsiveStyles`)
Styles cascade downwards: `desktop` (base in `node.styles`) -> `tablet` (`node.responsiveStyles.tablet`) -> `mobile` (`node.responsiveStyles.mobile`).
Overrides are resolved purely via `resolveStyles(node, breakpoint)`.
Removing an override resets inheritance from the next broader viewport.

### 6.4 Asset Metadata & Storage
Images and media reference `assetId` in `assets`:
```typescript
interface Asset {
  id: string;
  name: string;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';
  size: number; // <= 5MB per asset, <= 25MB total per project
  blobKey: string;
  width?: number;
  height?: number;
  alt?: string;
  createdAt: string;
}
```
Binary blobs are stored in IndexedDB `project_assets` store with magic bytes verification. SVGs are rejected to prevent stored XSS.
