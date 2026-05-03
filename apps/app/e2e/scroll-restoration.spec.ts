import { test, expect } from '@playwright/test';

test.describe('Scroll Restoration', () => {
  test('should restore scroll position when navigating back', async ({ page }) => {
    // 1. Start at home
    await page.goto('/en/');
    await page.waitForLoadState('networkidle');

    // 2. Scroll down to a specific element (e.g., a card in the offerings section)
    const card = page.locator('[data-scroll-key^="home-offering-"]').first();
    await card.scrollIntoViewIfNeeded();

    // Get initial position
    const box = await card.boundingBox();
    const initialTop = box?.y;

    // 3. Click the card to navigate to detail
    await card.click();
    await page.waitForURL(/\/en\/(solutions|products)\//);
    await page.waitForLoadState('networkidle');

    // 4. Go back
    await page.goBack();
    await page.waitForURL(/\/en\/(home)?$/);

    // 5. Wait for restoration and layout stability
    // We wait a bit for the service's late reconciliation (600ms)
    await page.waitForTimeout(3000);

    // 6. Verify position
    const restoredBox = await card.boundingBox();
    const restoredTop = restoredBox?.y;

    // The element should be back in the viewport
    expect(restoredTop).toBeDefined();
    if (restoredTop !== undefined) {
        // Just verify it's within the viewport (0 to viewport height)
        const viewportHeight = page.viewportSize()?.height || 800;
        expect(restoredTop).toBeGreaterThan(-100);
        expect(restoredTop).toBeLessThan(viewportHeight);
    }
  });

  test('should restore to anchor if specified in URL', async ({ page }) => {
    await page.goto('/en/solutions#stats');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    const statsSection = page.locator('[data-scroll-anchor="stats"]');
    const box = await statsSection.boundingBox();

    // The stats section should be near the top of the viewport (considering header offset)
    expect(box?.y).toBeLessThan(250);
    expect(box?.y).toBeGreaterThan(-100);
  });
});
