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

    await page.getByText('新建项目', { exact: true }).click();
    await expect(page.getByRole('heading', { name: '新建漫画项目' })).toBeVisible();
    await page.getByRole('button', { name: '长篇漫画' }).click();
    await page.getByPlaceholder('输入项目名称').fill('长篇测试项目');
    await page.getByRole('button', { name: '创建项目' }).click();

    await expect(page).toHaveURL(/#\/comic\/long-project\//);
    await expect(page.getByRole('button', { name: '长篇测试项目' })).toBeVisible();
    await expect(page.getByText('暂无章节')).toBeVisible();

    await page.getByRole('button', { name: '长篇测试项目' }).click({ button: 'right' });
    await page.getByRole('button', { name: '新建章节' }).click();
    await page.getByPlaceholder('例如：第 1 章 雨夜来客').fill('第 1 章');
    await page.getByRole('button', { name: '创建', exact: true }).click();
    await expect(page.getByRole('heading', { name: '第 1 章' })).toBeVisible();
    await expect(page.getByPlaceholder('粘贴或输入当前小说章节内容...')).toBeVisible();

    await page.getByRole('button', { name: '长篇测试项目' }).click({ button: 'right' });
    await page.getByRole('button', { name: '新建文件夹' }).click();
    await page.getByPlaceholder('例如：第一卷').fill('第一卷');
    await page.getByRole('button', { name: '创建', exact: true }).click();
    await expect(page.getByText('第一卷', { exact: true })).toBeVisible();
  } finally {
    await application.close();
    await rm(userDataDirectory, { recursive: true, force: true });
  }
});
