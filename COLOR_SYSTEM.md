# Color System

This document defines the consistent light-theme color palette used across the application.

## Color Palette

### Backgrounds
- **Page Background**: `#F5F6FA` (off-white, easier on eyes)
  - Used for main page backgrounds
  - CSS class: `bg-bg-page`
  - CSS variable: `--color-bg-page`

- **Card/Panel Background**: `#FFFFFF` (pure white)
  - Used for cards, panels, and contained components
  - CSS class: `bg-bg-card`
  - CSS variable: `--color-bg-card`

- **Header/Sidebar Background**: `#11144C` (dark navy)
  - Used for headers, sidebars, and navigation areas
  - CSS class: `bg-bg-header`
  - CSS variable: `--color-bg-header`

### Text
- **Primary Text**: `#0a0a0a` (near black)
  - Used for main content, headings
  - CSS class: `text-text-primary`
  - CSS variable: `--color-text-primary`

- **Secondary Text**: `#6b7280` (gray)
  - Used for descriptions, placeholders, helper text
  - CSS class: `text-text-secondary`
  - CSS variable: `--color-text-secondary`

- **Accent Text**: `#FFFFFF` (white)
  - Used for text on accent/dark backgrounds
  - CSS class: `text-accent-text`
  - CSS variable: `--color-text-accent`

### Borders & Dividers
- **Border Color**: `#e5e7eb` (light gray)
  - Used for all borders, dividers, and outlines
  - CSS class: `border-border`
  - CSS variable: `--color-border`

### Accent & Buttons
- **Accent Color**: `#11144C` (dark navy)
  - Used for primary buttons, links, focus states
  - CSS class: `bg-accent`
  - CSS variable: `--color-accent`

### Status Colors
- **Success**: `#059669` (green)
  - Used for success messages, completed tasks
  - CSS class: `bg-status-success` or `text-status-success`
  - CSS variable: `--color-status-success`

- **Info**: `#0284c7` (blue)
  - Used for informational messages, active states
  - CSS class: `bg-status-info` or `text-status-info`
  - CSS variable: `--color-status-info`

- **Warning**: `#d97706` (amber/orange)
  - Used for warnings, pending states
  - CSS class: `bg-status-warning` or `text-status-warning`
  - CSS variable: `--color-status-warning`

- **Error**: `#dc2626` (red)
  - Used for errors, failures, destructive actions
  - CSS class: `bg-status-error` or `text-status-error`
  - CSS variable: `--color-status-error`

## Usage

### Via Tailwind Classes
```tsx
// Background colors
<div className="bg-bg-page">Page background</div>
<div className="bg-bg-card">Card background</div>
<div className="bg-bg-header">Header background</div>

// Text colors
<p className="text-text-primary">Primary text</p>
<p className="text-text-secondary">Secondary text</p>

// Status colors
<span className="text-status-success">Success message</span>
<span className="text-status-error">Error message</span>

// Borders
<div className="border border-border">Bordered element</div>

// Combined (e.g., primary button)
<button className="bg-accent text-accent-text px-4 py-2 rounded">
  Primary Button
</button>
```

### Via CSS Variables
```css
.custom-component {
  background-color: var(--color-bg-card);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
}

.custom-button {
  background-color: var(--color-accent);
  color: var(--color-text-accent);
}
```

### Via Component Classes
Pre-defined utility classes are available in `globals.css`:
```tsx
// Card component
<div className="card">Card content</div>

// Primary button
<button className="button-primary">Click me</button>

// Secondary text
<p className="text-secondary">Secondary text</p>
```

## Implementation Notes

1. **Consistency**: Always use the defined colors via Tailwind classes or CSS variables. Avoid hardcoding hex values in component files.

2. **Dark Mode**: To add dark mode support in the future, update the CSS variables in `:root` based on a `prefers-color-scheme` media query.

3. **Extending Colors**: All custom colors are defined in `tailwind.config.js` under `theme.extend.colors`. Add any new colors there.

4. **Legacy Names**: The old color names (`primary`, `surface`, `background`, `text`) are still available for backward compatibility but should be migrated to the new naming scheme.

## Maintenance

When updating colors:
1. Update the color value in `tailwind.config.js`
2. Update the corresponding CSS variable in `app/globals.css`
3. Update this documentation
4. Test across all components to ensure consistency
