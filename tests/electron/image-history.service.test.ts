import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { ImageHistoryService } from '../../electron/services/image-history.service';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map(directory =>
    rm(directory, { recursive: true, force: true }),
  ));
});

describe('ImageHistoryService', () => {
  it('moves embedded image data to disk and reloads metadata', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'gzh-image-history-'));
    temporaryDirectories.push(root);
    const service = new ImageHistoryService(() => root);
    const dataUrl = `data:image/png;base64,${Buffer.from('image-bytes').toString('base64')}`;

    const saved = await service.save([{
      id: 'image-1',
      url: dataUrl,
      referenceImages: [dataUrl],
    }]);

    expect(saved[0].url).toBe('app-image://history/image-1-main.png');
    expect(saved[0].referenceImages).toEqual(['app-image://history/image-1-ref-0.png']);
    expect(await service.load()).toEqual(saved);
    expect(await readFile(path.join(root, 'images', 'image-1-main.png'), 'utf8'))
      .toBe('image-bytes');
  });

  it('rejects paths outside the history image directory', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'gzh-image-history-'));
    temporaryDirectories.push(root);
    const service = new ImageHistoryService(() => root);

    expect(service.resolveImagePath('../secret.png')).toBeNull();
    expect(service.resolveImagePath('nested/secret.png')).toBeNull();
    expect(service.resolveImagePath('safe.png')).toBe(path.join(root, 'images', 'safe.png'));
  });
});
