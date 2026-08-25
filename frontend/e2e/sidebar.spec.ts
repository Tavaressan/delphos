import { test, expect } from '@playwright/test';

/**
 * Issue #231 — Sidebar deve virar um drawer (overlay) acionado pelo
 * hamburger do Header abaixo do breakpoint `md` (768px), e permanecer
 * inline (sempre visível) em tablet/desktop. Roda nos três projetos
 * (mobile 375x667, tablet 768x1024, desktop 1280x800) definidos em
 * playwright.config.ts.
 */
test.describe('Sidebar — responsividade (issue #231)', () => {
  test('abaixo de md a sidebar fica oculta até abrir via hamburger; em md+ fica sempre visível', async ({ page }) => {
    await page.goto('/');

    const viewport = page.viewportSize();
    const isBelowMd = (viewport?.width ?? 0) < 768;

    const desktopSidebar = page.getByTestId('sidebar-desktop');
    const hamburger = page.getByRole('button', { name: 'Abrir menu' });

    if (isBelowMd) {
      // Sidebar desktop (inline) escondida via CSS (hidden md:flex)
      await expect(desktopSidebar).toBeHidden();
      // Drawer mobile ainda não foi aberto
      await expect(page.getByTestId('sidebar-mobile-drawer')).toHaveCount(0);

      await expect(hamburger).toBeVisible();
      await hamburger.click();

      const drawer = page.getByTestId('sidebar-mobile-drawer');
      await expect(drawer).toBeVisible();
      await expect(page.getByRole('button', { name: 'Fechar menu' })).toBeVisible();

      // Fechar pelo botão X some o drawer novamente
      await page.getByRole('button', { name: 'Fechar menu' }).click();
      await expect(page.getByTestId('sidebar-mobile-drawer')).toHaveCount(0);
    } else {
      await expect(desktopSidebar).toBeVisible();
      await expect(hamburger).toBeHidden();
    }
  });
});
