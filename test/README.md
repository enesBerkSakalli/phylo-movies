# Test suite

This directory is for frontend tests and their fixtures.

Authoritative commands:

```sh
npm run test:all
npm run test:mocha
npm run test:vitest
npm run test:supplemental
npm run test:list
npm run test:structure
```

Structure:

- `test/vitest/domain/` contains focused domain, state, layout, and rendering tests.
- `test/vitest/integration/` contains cross-module, worker, UI-contract, and data-service tests.
- `test/mocha/default/` contains the core timeline and backend-boundary Mocha suite.
- `test/mocha/supplemental/` contains isolated Mocha specs that run one file at a time.
- `test/data/` contains static test fixtures. The browser-demo payloads are
  generated under `publication_data/precomputed/`.
- `test/fixtures/` and `test/helpers/` are shared by both runners.

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

`npm run test:structure` fails if a spec is outside the canonical Mocha or
Vitest directories.

Standalone debugging and audit scripts belong in `scripts/diagnostics/`, not in
this directory.
