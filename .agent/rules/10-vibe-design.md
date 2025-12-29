---
trigger: glob
globs: **/*.tsx
---

# 🎨 Vibe Design System (Atomic & Premium)
## 1. Aesthetic Principles (Glassmorphism)
-   **Style:** Glassmorphism, TailwindCSS.
-   **Backgrounds:** Use `bg-white/10` + `backdrop-blur-md` for depth.
-   **Layout:** Use `dvh` for mobile heights. `overflow: hidden` on body.
-   **Motion:** All interactions must have smooth transitions (`duration-200`).
## 2. Inputs & Forms (Premium Standard)
-   **Forbidden:** Native `<input>` or `<textarea>` tags without classes.
-   **Mandatory Component:** Use `@components/ui/Input` or `Textarea`.
    -   *Note:* These components automatically enforce the Premium Glass style (`h-11`, `px-4`, `border-white/20`). You do not need to add these classes manually.
## 3. Component Architecture
-   **Don't Repeat Yourself (DRY):** Never hardcode a button or input style. Use `@components/ui/...`.
-   **Mobile First:** Ensure `touch-action: manipulation` for snappy taps.