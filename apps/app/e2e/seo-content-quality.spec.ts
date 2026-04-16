import { test, expect } from '@playwright/test';

test.describe('SEO Content Quality', () => {
  const locales = ['en', 'es'];
  const paths = [
    '/',
    '/solutions',
    '/projects',
    '/blog',
    '/products',
    '/contact'
  ];

  for (const locale of locales) {
    for (const path of paths) {
      const url = `/${locale}${path === '/' ? '' : path}`;

      test(`should have high quality metadata for ${url}`, async ({ page }) => {
        await page.goto(url);

        // 1. Title length (between 10 and 70 chars)
        const title = await page.title();
        expect(title.length).toBeGreaterThan(10);
        expect(title.length).toBeLessThan(70);

        // 2. Meta description length (between 50 and 160 chars)
        const description = await page.locator('meta[name="description"]').getAttribute('content');
        expect(description?.length).toBeGreaterThan(50);
        expect(description?.length).toBeLessThan(160);

        // 3. No raw translation keys in the body (e.g. {{ 'KEY' }})
        const bodyContent = await page.textContent('body');
        expect(bodyContent).not.toMatch(/\{\{\s*'.*'\s*\}\}/);
        expect(bodyContent).not.toMatch(/[A-Z_]{5,}/); // Heuristic for untranslated keys like 'STATS_PROJECTS'
      });
    }
  }
});
