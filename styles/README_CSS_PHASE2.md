# CSS Phase 2 cleanup

This pass keeps the site visual behavior intact while reducing the number of CSS files you need to touch day to day.

## Current structure
- `base/` — variables and global reset/base rules
- `layout/` — app shell layout
- `components/` — reusable UI pieces
- `pages/` — page-specific rules (`detail.css`, `favorites.css`, `admin.css`)
- `overrides/legacy-fixes.css` — old patch history merged in original order
- `overrides/ui-hotfixes.css` — late UI hotfixes merged in original order

## Why this is safer
The declarations were not aggressively rewritten. They were merged in the same order as before, so cascade priority stays stable.

## Best next step
Run the site page by page and then move stable rules out of `legacy-fixes.css` and `ui-hotfixes.css` into normal component/page files.
