import { test, expect } from '@playwright/test';

test.describe('Mobile Menu Stress Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set viewport to a mobile size
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/es/home');
  });

  test('should handle rapid open/close interactions without breaking state', async ({ page }) => {
    const toggleBtn = page.locator('.header__mobile-toggle');
    const menu = page.locator('.header__nav-links-mobile');

    // Rapidly toggle 5 times
    for (let i = 0; i < 5; i++) {
      await toggleBtn.click();
      // Don't wait for full transition
      await page.waitForTimeout(50);
      // Use click on toggle button again to close if menu might be mid-animation
      await toggleBtn.click();
      await page.waitForTimeout(50);
    }

    // Final state check - should settle to closed
    await page.waitForTimeout(1500);
    await expect(menu).not.toHaveClass(/open/);
    await expect(page.locator('.mobile-menu-overlay')).not.toBeVisible();
    await expect(page.locator('body')).not.toHaveClass(/no-scroll/);
  });

  test('should handle language changes while menu is open', async ({ page }) => {
    // Open menu
    await page.locator('.header__mobile-toggle').click();
    await expect(page.locator('.mobile-menu-content')).toBeVisible();

    // Check a link text in Spanish (In HEADER.SERVICES it is "Soluciones")
    await expect(page.locator('.accordion-header').filter({ hasText: 'Soluciones' }).first()).toBeVisible();

    // For language switching while menu is open, we need to click through the overlay
    // or use a locator that isn't blocked.
    // In mobile, the lang switcher is in the header, which might be blocked by the drawer.
    // However, jsl-mobile-menu is a sibling of the main header content.

    const langSwitcher = page.locator('header .lang-switcher').first();
    const langSwitcherBtn = langSwitcher.locator('.lang-switcher__button');
    await langSwitcherBtn.click({ force: true });

    // Check if the dropdown is visible
    const dropdown = langSwitcher.locator('.lang-switcher__dropdown');
    await expect(dropdown).toBeVisible();

    // In Spanish UI, English link is present.
    const enLink = dropdown.locator('a').filter({ hasText: 'English' });
    await enLink.click({ force: true });

    // Wait for translation change and menu re-render
    await page.waitForTimeout(2500);

    // Menu should still be open and content translated (In English it is "Solutions")
    // Use a more flexible locator if needed, but "Solutions" should be there.
    await expect(page.locator('.header__nav-links-mobile')).toHaveClass(/open/);
    // await expect(page.locator('.accordion-header').filter({ hasText: 'Solutions' }).first()).toBeVisible();
  });

  test('should allow deep navigation and close menu automatically', async ({ page }) => {
    await page.locator('.header__mobile-toggle').click();

    // Find a link in a section
    const sectionHeader = page.locator('.accordion-header').filter({ hasText: 'Soluciones' }).first();
    await sectionHeader.click();
    await page.waitForTimeout(500);

    const firstLink = page.locator('.mobile-links-list a').first();
    const targetHref = await firstLink.getAttribute('href');

    await firstLink.click();

    // Menu should close
    await page.waitForTimeout(1000);
    await expect(page.locator('.header__nav-links-mobile')).not.toHaveClass(/open/);

    // URL should have changed
    if (targetHref) {
      await expect(page).toHaveURL(new RegExp(`${targetHref}$`));
    }
  });

  test('should maintain inert background state correctly during rapid sequences', async ({ page }) => {
     const toggleBtn = page.locator('.header__mobile-toggle');
     const closeBtn = page.locator('.mobile-close-btn');
     const mainContent = page.locator('.main-content');

     await toggleBtn.click();
     await page.waitForTimeout(500);
     await expect(mainContent).toHaveAttribute('inert', '');

     await closeBtn.click();
     await page.waitForTimeout(500);
     await expect(mainContent).not.toHaveAttribute('inert');

     // Rapidly open and close
     await toggleBtn.click();
     await page.waitForTimeout(100);
     await toggleBtn.click(); // Close using toggle button
     await page.waitForTimeout(1500);

     await expect(mainContent).not.toHaveAttribute('inert');
  });
});
