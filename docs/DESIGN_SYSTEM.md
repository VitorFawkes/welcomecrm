# 🎨 Elite Design System (Unified Hybrid)

> **Status:** ACTIVE
> **Enforcement:** MANDATORY for all new UI components.

## 1. The "Two Universes" Architecture

The application is strictly divided into two visual universes. Components must respect the universe they inhabit.

| Universe | Zone | Theme Mode | Visual Style |
| :--- | :--- | :--- | :--- |
| **Navigation** | Sidebar, Topbar | `dark` | Glassmorphism, Deep Blue/Gray, Translucent |
| **Workspace** | Main Content, Cards, Tables | `light` | Clean, High Contrast, Solid White/Gray |

### 🚫 The "No Leak" Rule
-   **NEVER** use `bg-white/5` or `backdrop-blur` in the **Workspace**.
-   **NEVER** use `bg-white` or `bg-gray-100` in the **Navigation**.

## 2. Semantic Tokens (The Only Way to Style)

Do not use raw colors. Use these semantic tokens which automatically adapt to the Universe.

| Token | Usage | Light Mode (Workspace) | Dark Mode (Nav) |
| :--- | :--- | :--- | :--- |
| `bg-surface-primary` | Main container background | White | Gray-950 |
| `bg-surface-secondary` | Page background / Hover | Gray-50 | Gray-900 |
| `border-subtle` | Dividers, card borders | Gray-200 | White/10 |
| `text-primary` | Main headings | Gray-900 | White |
| `text-secondary` | Subtitles, metadata | Gray-500 | Gray-400 |

### Example Usage
```tsx
// ✅ CORRECT (Elite Standard)
<div className="bg-surface-primary border border-border-subtle text-text-primary">
  <h1>Hello World</h1>
</div>

// ❌ WRONG (Legacy/Fragile)
<div className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
  <h1>Hello World</h1>
</div>
```

## 3. The Theme Boundary

We use `<ThemeBoundary>` to enforce these universes.

```tsx
// Layout.tsx
<ThemeBoundary mode="dark"> <Sidebar /> </ThemeBoundary>
<ThemeBoundary mode="light"> <MainContent /> </ThemeBoundary>
```

If you are creating a new page, you do **NOT** need to worry about the theme. Just use the Semantic Tokens, and the `ThemeBoundary` in the layout will handle the rest.

## 4. Component Checklist

Before submitting any UI code, verify:
1.  [ ] Are you using `bg-surface-*` tokens?
2.  [ ] Are inputs using `bg-background` (which maps to surface)?
3.  [ ] Are badges using `bg-status-neutral-bg`?
4.  [ ] Did you avoid hardcoding `bg-gray-900` or `bg-white`?
