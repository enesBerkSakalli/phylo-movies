import { describe, expect, it } from 'vitest';
import { isDynamicImportFailure } from '../src/lib/lazyRouteRecovery.js';

describe('lazy route recovery', () => {
  it('detects browser failures for stale dynamic-import chunks', () => {
    expect(
      isDynamicImportFailure(
        new TypeError(
          'Failed to fetch dynamically imported module: https://example.test/assets/App-old.js'
        )
      )
    ).toBe(true);
    expect(isDynamicImportFailure(new Error('Importing a module script failed.'))).toBe(true);
    expect(isDynamicImportFailure(new Error('Loading chunk App failed.'))).toBe(true);
  });

  it('does not classify ordinary render errors as deployment chunk failures', () => {
    expect(isDynamicImportFailure(new Error('Cannot read properties of undefined'))).toBe(false);
    expect(isDynamicImportFailure(new TypeError('items.map is not a function'))).toBe(false);
  });
});
