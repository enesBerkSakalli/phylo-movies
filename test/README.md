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
- `test/optional/` contains supplemental Mocha tests that are tracked
  separately by `npm run test:structure` but still run as part of
  `npm run test:all`.
- `test/data/` contains static test fixtures. The browser-demo payloads are
  generated under `publication_data/precomputed/`.

Generated browser-demo fixtures are owned by:

```sh
npm run fixtures:list
npm run fixtures:generate
npm run fixtures:check
```

`fixtures:generate` rewrites committed demo JSON through the current
BranchArchitect backend serializer. Some fixtures start from fixed tree inputs;
the norovirus browser examples first infer IQ-TREE window trees from the
committed MSA, then write the generated tree series and precomputed JSON.
`fixtures:check` is non-mutating and fails when a committed fixture is stale.

`npm run test:structure` fails if a test file is neither in the default suite
nor under `test/optional/`.

Standalone debugging and audit scripts belong in `scripts/diagnostics/`, not in
this directory.
