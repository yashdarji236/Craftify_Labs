# Craftify Labs - Responsive Design & Cascading Overrides (Phase 3)

## 1. Overview & Breakpoint Grid

Craftify Labs supports three responsive viewports:

| Breakpoint | Viewport Width | Canvas Frame | Target Form Factor |
| :--- | :--- | :--- | :--- |
| **`desktop`** (Base) | `>= 1280px` | `1280px` default frame | Large desktops, laptops |
| **`tablet`** | `768px - 1279px` | `768px` frame | iPads, tablets, small screens |
| **`mobile`** | `< 768px` | `375px` frame | Mobile devices (iPhone, Android) |

---

## 2. Cascading Rule & Single Source of Truth

Styles follow a downward cascading inheritance model:

```
[ Desktop (Base: node.styles) ]
         │
         ▼
[ Tablet Override (node.responsiveStyles.tablet) ]
         │
         ▼
[ Mobile Override (node.responsiveStyles.mobile) ]
```

- When editing on **Desktop**, styles are written to base `node.styles`.
- When editing on **Tablet**, any changes are written directly into `node.responsiveStyles.tablet`. Unchanged properties inherit from Desktop.
- When editing on **Mobile**, changes are written into `node.responsiveStyles.mobile`. Unchanged properties inherit from Tablet (if present) or Desktop.

### Pure Resolution Function

The pure resolver in `src/builder/model/breakpoints.js`:

```javascript
export function resolveStyles(node, breakpoint) {
  if (!node) return {};
  const base = node.styles || {};
  const resp = node.responsiveStyles || {};

  if (breakpoint === 'desktop') {
    return { ...base };
  }
  if (breakpoint === 'tablet') {
    return { ...base, ...(resp.tablet || {}) };
  }
  if (breakpoint === 'mobile') {
    return {
      ...base,
      ...(resp.tablet || {}),
      ...(resp.mobile || {}),
    };
  }
  return { ...base };
}
```

---

## 3. Override Management & Resetting

- **Visual Indicators**: In the Properties Inspector, properties that have an active override on the current breakpoint display an amber override badge `[Overridden]`.
- **Resetting Overrides**: Clicking the reset button removes that specific CSS property from `node.responsiveStyles[breakpoint]`, immediately reverting to the inherited base value.
- **Responsive Visibility**: Elements can be hidden on a specific breakpoint (`display: 'none'`). Hidden elements show a semi-opaque preview in the canvas and layers tree with an unhide action.
- **Stack on Mobile**: Containers with flex row layouts can toggle "Stack on Mobile", automatically overriding `flexDirection: 'column'` on mobile screens.
