import { describe, expect, it } from 'vitest';
import { toDisplayImageUrl } from '../../src/shared/image/imageUrl';

describe('toDisplayImageUrl', () => {
  it.each([
    ['C:\\images\\cover one.png', 'app-image://local/C%3A%2Fimages%2Fcover%20one.png'],
    ['\\\\server\\share\\cover.png', 'app-image://local/%2F%2Fserver%2Fshare%2Fcover.png'],
    ['/tmp/cover.png', 'app-image://local/%2Ftmp%2Fcover.png'],
  ])('converts local path %s', (source, expected) => {
    expect(toDisplayImageUrl(source)).toBe(expected);
  });

  it.each([
    'https://example.com/a.png',
    'http://example.com/a.png',
    'data:image/png;base64,abc',
    'blob:https://example.com/id',
    'app-image://history/a.png',
  ])('keeps display-ready URL %s unchanged', (source) => {
    expect(toDisplayImageUrl(source)).toBe(source);
  });

  it('migrates a legacy file URL to the controlled protocol', () => {
    expect(toDisplayImageUrl('file:///C:/images/a.png'))
      .toBe('app-image://local/C%3A%2Fimages%2Fa.png');
  });
});
