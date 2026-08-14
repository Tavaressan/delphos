import { test, expect } from '@playwright/test';

/**
 * Issue #231 — PanelDock deve empilhar verticalmente (flex-col) em mobile
 * e ficar lado a lado (flex-row) a partir de `md`. O componente ainda não
 * está conectado a nenhuma rota de produto (só testado via
 * renderToStaticMarkup em tests/panel-dock.test.tsx), então esta suíte usa
 * o harness em /dev-harness/panel-dock para validar o comportamento
 * responsivo real em navegador.
 */
test.describe('PanelDock — responsividade (issue #231)', () => {
  test('empilha em mobile e fica lado a lado a partir de md', async ({ page }) => {
    await page.goto('/dev-harness/panel-dock');

    const kbPanel = page.getByTestId('panel-kb');
    const mcpPanel = page.getByTestId('panel-mcp');
    await expect(kbPanel).toBeVisible();
    await expect(mcpPanel).toBeVisible();

    const kbBox = await kbPanel.boundingBox();
    const mcpBox = await mcpPanel.boundingBox();
    expect(kbBox).not.toBeNull();
    expect(mcpBox).not.toBeNull();

    const viewport = page.viewportSize();
    const isBelowMd = (viewport?.width ?? 0) < 768;

    if (isBelowMd) {
      // Empilhados: o segundo painel começa abaixo do fim do primeiro (mesma coluna, y crescente)
      expect(mcpBox!.y).toBeGreaterThanOrEqual(kbBox!.y + kbBox!.height - 1);
    } else {
      // Lado a lado: mesma linha (y aproximado), x crescente
      expect(Math.abs(mcpBox!.y - kbBox!.y)).toBeLessThan(5);
      expect(mcpBox!.x).toBeGreaterThan(kbBox!.x);
    }
  });

  test('fechar um painel individualmente remove só aquele painel', async ({ page }) => {
    await page.goto('/dev-harness/panel-dock');

    await page.getByTestId('panel-close-mcp').click();

    await expect(page.getByTestId('panel-mcp')).toHaveCount(0);
    await expect(page.getByTestId('panel-kb')).toBeVisible();
  });
});
