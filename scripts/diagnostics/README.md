# Diagnostic scripts

This directory contains one-off investigation scripts that are useful during
debugging but are not part of the automated test suite.

Run them from the repository root. Scripts that import application modules use
Vite's module loader:

```sh
npx vite-node scripts/diagnostics/check_d3_exports.js
node scripts/diagnostics/subtree_flow_debug.js
```

Authoritative frontend tests live in `test/` and are run by `npm run test:all`.
