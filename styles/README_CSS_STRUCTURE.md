# CSS structure

The original `styles/main.css` was split into smaller files and `main.css` now acts as the single entrypoint via `@import` statements, so the site keeps the same visual output without changing HTML links.

## Main folders

- `base/` — variables and global element styles
- `layout/` — app shell, topbar, hero, section layout
- `components/` — reusable UI pieces such as cards, states, select control, auth styles
- `pages/` — page-specific styles (`detail.css`)
- `overrides/` — existing hotfix/final patch layers kept in order to avoid visual regressions

## Why the override files are separate

This project already had many late-stage patches that intentionally override earlier rules. They were preserved as separate files in the same order to avoid breaking the current UI.

A safe next step would be to gradually merge old overrides back into the component/page files once each page is manually regression-tested.
