import { describe, expect, it } from 'vitest';
import { buildContentBlocksHtml, serializeInlineStyle } from '../../src/shared/typeset/contentBlocksHtml';
import type { ContentBlock } from '../../src/types';

describe('content block HTML', () => {
  it('serializes camelCase CSS properties', () => {
    expect(serializeInlineStyle({ backgroundColor: '#fff', fontSize: '16px' }))
      .toBe('background-color:#fff;font-size:16px');
  });

  it('renders every supported block type', () => {
    const blocks: ContentBlock[] = [
      { id: 'image', type: 'image', content: '', imagePath: 'file:///cover.png' },
      { id: 'html', type: 'html', content: '', html: '<strong>raw</strong>' },
      { id: 'empty', type: 'empty', content: '', align: 'center' },
      { id: 'text', type: 'text', content: 'paragraph' },
    ];

    expect(buildContentBlocksHtml(blocks)).toBe([
      '<p><img src="file:///cover.png" style="max-width:100%;display:block;margin:0 auto;"/></p>',
      '<strong>raw</strong>',
      '<p style="text-align:center"><br/></p>',
      '<p>paragraph</p>',
    ].join('\n'));
  });

  it('optionally wraps blocks in a styled section', () => {
    const blocks: ContentBlock[] = [{ id: 'text', type: 'text', content: 'body' }];
    expect(buildContentBlocksHtml(blocks, { lineHeight: '1.8' }))
      .toBe('<section style="line-height:1.8"><p>body</p></section>');
  });
});
