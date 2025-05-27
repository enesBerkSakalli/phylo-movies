# Test info

- Name: Phylo-Movies index.html E2E >> should allow optional order file upload
- Location: /Users/berksakalli/Projects/phylo-movies/frontend/tests/index.e2e.spec.ts:62:3

# Error details

```
TimeoutError: locator.waitFor: Timeout 5000ms exceeded.
Call log:
  - waiting for locator('input[type=file]#trees')

    at /Users/berksakalli/Projects/phylo-movies/frontend/tests/index.e2e.spec.ts:65:21
```

# Page snapshot

```yaml
- navigation:
  - link "Phylo‑Movies":
    - /url: /
- heading "Phylo‑Movies " [level=1]
- text: Tree File
- button "Drag & Drop your files or Browse"
- link "Powered by PQINA":
  - /url: https://pqina.nl/
- text: Drag & Drop your files or Browse
- list
- alert
- text: Order File
- button "Drag & Drop your files or Browse"
- link "Powered by PQINA":
  - /url: https://pqina.nl/
- text: Drag & Drop your files or Browse
- list
- alert
- text: Window Size
- spinbutton "Window Size": "1"
- text: Window Step Size
- spinbutton "Window Step Size": "1"
- checkbox "Enable Midpoint Rooting"
- text: Enable Midpoint Rooting
- button " Play"
```

# Test source

```ts
   1 |
   2 | import { test, expect } from '@playwright/test';
   3 | import path from 'path';
   4 | import { fileURLToPath } from 'url';
   5 |
   6 | // Path to a valid Newick file for upload (ESM compatible)
   7 | const __filename = fileURLToPath(import.meta.url);
   8 | const __dirname = path.dirname(__filename);
   9 | const validNewickPath = path.resolve(__dirname, '../js/__test__/test.newick');
  10 |
  11 | test.describe('Phylo-Movies index.html E2E', () => {
  12 |   test('should require a tree file and show error if missing', async ({ page }) => {
  13 |     const errors: string[] = [];
  14 |     page.on('console', msg => {
  15 |       if (msg.type() === 'error') errors.push(msg.text());
  16 |     });
  17 |     await page.goto('http://localhost:5173/index.html');
  18 |     const content = await page.content();
  19 |     console.log('PAGE HTML AFTER LOAD:', content);
  20 |     if (errors.length > 0) {
  21 |       console.log('CONSOLE ERRORS:', errors);
  22 |     }
  23 |     await page.waitForSelector('button[type="submit"]', { timeout: 5000 });
  24 |     await page.click('button[type="submit"]');
  25 |     // Wait for our alert to be visible and check its text
  26 |     await expect(page.locator('#form-alert')).toBeVisible({ timeout: 5000 });
  27 |     await expect(page.locator('#form-alert')).toHaveText(/tree file/i);
  28 |   });
  29 |
  30 |   test('should upload a valid tree file and redirect to vis.html', async ({ page, context }) => {
  31 |     await page.goto('http://localhost:5173/index.html');
  32 |     const fileInput = page.locator('input[type=file]#trees');
  33 |     await fileInput.waitFor({ state: 'attached', timeout: 5000 });
  34 |     await fileInput.setInputFiles(validNewickPath, { force: true });
  35 |     await page.click('button[type="submit"]');
  36 |     // Wait for redirect
  37 |     await page.waitForURL('**/vis.html', { timeout: 10000 });
  38 |     // Check localStorage for phyloMovieData
  39 |     const data = await page.evaluate(() => localStorage.getItem('phyloMovieData'));
  40 |     expect(data).not.toBeNull();
  41 |     expect(JSON.parse(data!)).toHaveProperty('tree_list');
  42 |   });
  43 |
  44 |   test('should show backend error if /treedata returns error', async ({ page }) => {
  45 |     await page.goto('http://localhost:5173/index.html');
  46 |     // Intercept /treedata and return error
  47 |     await page.route('/treedata', route => {
  48 |       route.fulfill({
  49 |         status: 400,
  50 |         contentType: 'application/json',
  51 |         body: JSON.stringify({ error: 'Test backend error' })
  52 |       });
  53 |     });
  54 |     const fileInput = page.locator('input[type=file]#trees');
  55 |     await fileInput.waitFor({ state: 'attached', timeout: 5000 });
  56 |     await fileInput.setInputFiles(validNewickPath, { force: true });
  57 |     await page.click('button[type="submit"]');
  58 |     await expect(page.locator('#form-alert')).toBeVisible({ timeout: 5000 });
  59 |     await expect(page.locator('#form-alert')).toHaveText(/test backend error/i);
  60 |   });
  61 |
  62 |   test('should allow optional order file upload', async ({ page }) => {
  63 |     await page.goto('http://localhost:5173/index.html');
  64 |     const fileInput = page.locator('input[type=file]#trees');
> 65 |     await fileInput.waitFor({ state: 'attached', timeout: 5000 });
     |                     ^ TimeoutError: locator.waitFor: Timeout 5000ms exceeded.
  66 |     await fileInput.setInputFiles(validNewickPath, { force: true });
  67 |     const orderInput = page.locator('input[type=file]#order');
  68 |     await orderInput.waitFor({ state: 'attached', timeout: 5000 });
  69 |     await orderInput.setInputFiles(validNewickPath, { force: true }); // Use same file for test
  70 |     await page.click('button[type="submit"]');
  71 |     await page.waitForURL('**/vis.html', { timeout: 10000 });
  72 |     const data = await page.evaluate(() => localStorage.getItem('phyloMovieData'));
  73 |     expect(data).not.toBeNull();
  74 |   });
  75 | });
  76 |
```