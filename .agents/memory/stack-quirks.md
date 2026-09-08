---
name: Stack & package quirks
description: npm firewall blocks jspdf 2.5.x; framer-motion 11 now installed; jspdf 4.2.1 is what's actually in node_modules
---

## Rule
Pin `"jspdf": "4.2.1"` (exact, no ^ caret) in package.json. The npm firewall blocks any attempt to download jspdf 2.5.x. jspdf 4.2.1 is already installed in node_modules.

**Why:** Previous sessions had `^2.5.1` which resolved to 2.5.2 (blocked) — caused every `npm install` to fail, blocking framer-motion installation.

**How to apply:** Any time you add a new package, keep jspdf pinned to `4.2.1`. Do not update it.

## framer-motion
framer-motion@11 is now installed. Use `motion`, `AnimatePresence`, `useInView` from `framer-motion`.

## Build verification
`npm run build` must complete with 0 errors. The chunk size warning for jspdf (>500KB) is expected and harmless.

## Vite API adapters
Local Vite API adapters should resolve shared server handlers with `path.resolve(process.cwd(), ...)`, not a relative dynamic import.

**Why:** Vite evaluates the config from `.vite-temp`, so relative imports can resolve under `node_modules/.vite-temp` and return a misleading 500.

**How to apply:** Keep local `/api/*` handlers delegated to the production modules, but use workspace-absolute module paths in `vite.config.js`.
