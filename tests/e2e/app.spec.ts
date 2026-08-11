import { _electron as electron, expect, test } from '@playwright/test';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

test('starts, loads settings, and renders a persisted comic project', async () => {
  const userDataDirectory = await mkdtemp(path.join(os.tmpdir(), 'gzh-layout-e2e-'));
  const application = await electron.launch({
    args: ['.', `--user-data-dir=${userDataDirectory}`],
    cwd: path.resolve('.'),
  });

  try {
    const page = await application.firstWindow();
    await expect(page.locator('#app')).not.toBeEmpty();

    await page.evaluate(() => { window.location.hash = '#/settings'; });
    await expect(page).toHaveURL(/#\/settings$/);
    await expect(page.locator('body')).not.toContainText('Internal Server Error');

    await page.evaluate(async () => {
      await (window as any).electronAPI.comic.db.saveProject({
        id: 'e2e-project',
        name: 'E2E Project',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      window.location.hash = '#/comic/projects';
    });

    await expect(page).toHaveURL(/#\/comic\/projects$/);
    await expect(page.getByText('E2E Project')).toBeVisible();
  } finally {
    await application.close();
    await rm(userDataDirectory, { recursive: true, force: true });
  }
});
