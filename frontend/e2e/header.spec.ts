import { test, expect } from '@playwright/test';

/**
 * Issue #231 — Header não pode ter overflow/corte horizontal em telas
 * pequenas (375px), e o hamburger mobile só aparece abaixo de `md`.
 */
test.describe('Header — responsividade (issue #231)', () => {
  test('não tem overflow horizontal em nenhum viewport', async ({ page }) => {
    await page.goto('/');

    const header = page.locator('header');
    await expect(header).toBeVisible();

    const overflow = await header.evaluate((el) => ({
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
    }));
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);
  });

  test('hamburger visível apenas abaixo de md (768px)', async ({ page }) => {
    await page.goto('/');

    const viewport = page.viewportSize();
    const isBelowMd = (viewport?.width ?? 0) < 768;
    const hamburger = page.getByRole('button', { name: 'Abrir menu' });

    if (isBelowMd) {
      await expect(hamburger).toBeVisible();
    } else {
      await expect(hamburger).toBeHidden();
    }
  });
});
