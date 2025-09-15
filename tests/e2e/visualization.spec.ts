import { test, expect } from '@playwright/test';

// Seed localforage IndexedDB key used by the app
async function seedPhyloData(page) {
  // Go directly to home to avoid meta-refresh-based redirect on index.html
  await page.goto('/pages/home/');
  await page.waitForLoadState('load');
  await page.waitForLoadState('networkidle');
  async function evalSeed() {
    return await page.evaluate(async () => {
      const res = await fetch('/example.json');
      const data = await res.json();
      data.file_name = 'small_example.tree';
      data.window_size = data.window_size || 1;
      data.window_step_size = data.window_step_size || 1;

      function idbSet(dbName, storeName, key, value) {
        return new Promise((resolve, reject) => {
          const open = indexedDB.open(dbName);
          open.onupgradeneeded = () => {
            const db = open.result;
            if (!db.objectStoreNames.contains(storeName)) {
              db.createObjectStore(storeName);
            }
          };
          open.onerror = () => reject(open.error);
          open.onsuccess = () => {
            const db = open.result;
            const tx = db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            const req = store.put(value, key);
            req.onsuccess = () => resolve(true);
            req.onerror = () => reject(req.error);
          };
        });
      }

      await idbSet('localforage', 'keyvaluepairs', 'phyloMovieData', data);
      return { saved: true, treeCount: data.interpolated_trees?.length || 0 };
    });
  }

  let result: any = null;
  for (let i = 0; i < 3; i++) {
    try {
      result = await evalSeed();
      break;
    } catch (e) {
      if (String(e).includes('Execution context was destroyed')) {
        await page.waitForTimeout(250);
        continue;
      }
      throw e;
    }
  }
  expect(result && result.saved).toBeTruthy();
}

test('visualization renders with seeded data', async ({ page }) => {
  await seedPhyloData(page);

  await page.goto('/pages/visualization/');

  // Verify core UI pieces
  await expect(page.getByRole('heading', { name: 'Phylo-Movies' })).toBeVisible();
  await expect(page.locator('#webgl-container canvas')).toHaveCount(1);

  // Badges in the movie player area (chips)
  await expect(page.getByRole('button', { name: /\d+ trees \(\d+ segments\)/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /\d+ \/ \d+ • \d+%/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /MSA Window:/ })).toBeVisible();

  // Take a screenshot for artifact/reference
  await page.screenshot({ path: 'tests/e2e/artifacts/visualization.png', fullPage: false });
});
