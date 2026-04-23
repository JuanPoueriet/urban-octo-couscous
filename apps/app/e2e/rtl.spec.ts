import { test, expect } from '@playwright/test';

test.describe('RTL Layout and Direction', () => {
  test('should switch to RTL when Arabic is selected', async ({ page }) => {
    const baseUrl = process.env['BASE_URL'] || 'http://localhost:4200';
    await page.goto(`${baseUrl}/ar/home`);

    // Check RTL state
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
    await expect(page.locator('body')).toHaveAttribute('dir', 'rtl');

    // Verify a component that should use logical properties
    const cardIcon = page.locator('.card__icon').first();
    await expect(cardIcon).toBeVisible();
  });

  test('mobile menu should handle RTL translation', async ({ page }) => {
    const baseUrl = process.env['BASE_URL'] || 'http://localhost:4200';
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(`${baseUrl}/ar/home`);

    const menuToggle = page.locator('.header__mobile-toggle');
    await menuToggle.click({ force: true });

    const mobileMenu = page.locator('.header__nav-links-mobile');
    await expect(mobileMenu).toHaveClass(/open/);

    // In RTL, the open menu should have transform: translateX(0)
    const transform = await mobileMenu.evaluate((el) => window.getComputedStyle(el).transform);
    expect(transform).toContain('matrix(1, 0, 0, 1, 0, 0)');
  });
});
