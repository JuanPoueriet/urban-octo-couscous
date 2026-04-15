import { test, expect } from '@playwright/test';

test.describe('SEO Technical Audit', () => {
  const baseUrl = 'http://127.0.0.1:4200';
  const languages = ['es', 'en'];
  const totalLangsCount = 12; // 11 supported + x-default

  for (const lang of languages) {
    test(`Home page [${lang}] should have correct basic SEO tags`, async ({ page }) => {
      await page.goto(`${baseUrl}/${lang}/home`);

      // Canonical
      const canonical = await page.locator('link[rel="canonical"]');
      await expect(canonical).toHaveAttribute('href', `${baseUrl}/${lang}`);

      // Hreflang
      const hreflangs = await page.locator('link[rel="alternate"][hreflang]');
      await expect(hreflangs).toHaveCount(totalLangsCount);
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
    expect(title).toContain('JSL Technology');

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
    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveAttribute('href', /[^/]$/);
  });

  test('Meta tags should not accumulate during SPA navigation', async ({ page }) => {
    await page.goto(`${baseUrl}/es/home`);

    // Use footer links which are usually more stable for E2E
    const solutionsLink = page.locator('footer a[href="/es/solutions"]').first();
    await solutionsLink.scrollIntoViewIfNeeded();
    await solutionsLink.click();
    await page.waitForURL(/.*\/solutions/);

    const aboutUsLink = page.locator('footer a[href="/es/about-us"]').first();
    await aboutUsLink.scrollIntoViewIfNeeded();
    await aboutUsLink.click();
    await page.waitForURL(/.*\/about-us/);

    const canonicals = page.locator('link[rel="canonical"]');
    await expect(canonicals).toHaveCount(1);

    const hreflangs = page.locator('link[rel="alternate"][hreflang]');
    await expect(hreflangs).toHaveCount(totalLangsCount);
  });

  test('Sitemap.xml should be valid and return 200', async ({ request }) => {
    const response = await request.get(`${baseUrl}/sitemap.xml`);
    expect(response.status()).toBe(200);

    const body = await response.text();
    expect(body).toContain('<?xml');
    expect(body).toContain('<urlset');
    expect(body).toContain('<loc>');
    expect(body).toContain(`${baseUrl}/es`);
  });

  test('Error pages should return correct SSR status codes', async ({ request }) => {
    // Note: This requires the server to be running and handling these routes with SSR
    const notFoundResponse = await request.get(`${baseUrl}/es/not-found-page-that-does-not-exist`);
    expect(notFoundResponse.status()).toBe(404);

    const serverErrorResponse = await request.get(`${baseUrl}/es/server-error`);
    expect(serverErrorResponse.status()).toBe(500);
  });
});
