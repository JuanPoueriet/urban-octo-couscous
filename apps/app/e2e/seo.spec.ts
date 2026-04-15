import { test, expect } from '@playwright/test';

test.describe('SEO Technical Audit', () => {
  const baseUrl = 'http://localhost:4200';
  const languages = ['es', 'en'];

  for (const lang of languages) {
    test(`Home page [${lang}] should have correct basic SEO tags`, async ({ page }) => {
      await page.goto(`${baseUrl}/${lang}/home`);

      // Canonical
      const canonical = await page.locator('link[rel="canonical"]');
      await expect(canonical).toHaveAttribute('href', `${baseUrl}/${lang}`);

      // Hreflang
      const hreflangs = await page.locator('link[rel="alternate"][hreflang]');
      await expect(hreflangs).toHaveCount(3); // es, en, x-default
      await expect(page.locator('link[rel="alternate"][hreflang="x-default"]')).toHaveAttribute('href', `${baseUrl}/es`);

      // Title & Description
      const title = await page.title();
      expect(title).toContain('JSL Technology');

      const description = await page.locator('meta[name="description"]');
      await expect(description).toHaveAttribute('content', /.+/); // Not empty
    });
  }

  test('Solution detail page should have granular metadata and schema', async ({ page }) => {
    // web-development is a slug in mock-data
    await page.goto(`${baseUrl}/es/solutions/web-development`);

    const title = await page.title();
    expect(title).toContain('Desarrollo Web');
    expect(title).toContain('| JSL Technology');

    // Schema Service
    const schemaScript = await page.locator('script[type="application/ld+json"]#structured-data');
    const schemaText = await schemaScript.textContent();
    const schema = JSON.parse(schemaText || '{}');
    expect(schema['@type']).toBe('Service');
    expect(schema['name']).toContain('Desarrollo Web');
  });

  test('Blog detail page should have Article schema', async ({ page }) => {
    await page.goto(`${baseUrl}/en/blog/future-of-angular-ssr`);

    const schemaScript = await page.locator('script[type="application/ld+json"]#structured-data');
    const schemaText = await schemaScript.textContent();
    const schema = JSON.parse(schemaText || '{}');
    expect(schema['@type']).toBe('BlogPosting');
    expect(schema['headline']).toContain('Future of Angular SSR');
  });

  test('FAQ page should have FAQPage schema', async ({ page }) => {
    await page.goto(`${baseUrl}/es/faq`);

    const schemaScript = await page.locator('script[type="application/ld+json"]#faq-schema');
    const schemaText = await schemaScript.textContent();
    const schema = JSON.parse(schemaText || '{}');
    expect(schema['@type']).toBe('FAQPage');
    expect(schema['mainEntity'].length).toBeGreaterThan(0);
  });

  test('Canonical should not have trailing slash', async ({ page }) => {
    await page.goto(`${baseUrl}/es/solutions/`);
    const canonical = await page.locator('link[rel="canonical"]');
    const href = await canonical.getAttribute('href');
    expect(href).not.endsWith('/');
  });
});
