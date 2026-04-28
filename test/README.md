# Test suite

This directory is for frontend tests and their fixtures.

Authoritative commands:

```sh
npm run test:all
npm run test:mocha
npm run test:vitest
npm run test:list
npm run test:structure
```

Structure:

- Root `test/*.test.js` files are default-suite tests only.
- `test/domain/` and `test/integration/` are default Vitest suites.
- `test/optional/` contains non-default or legacy tests that are intentionally
  excluded from `npm run test:all`.
- `test/data/` contains fixtures.

`npm run test:structure` fails if a test file is neither in the default suite
nor under `test/optional/`.

Standalone debugging and audit scripts belong in `scripts/diagnostics/`, not in
this directory.
