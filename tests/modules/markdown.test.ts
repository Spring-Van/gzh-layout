import { describe, expect, it } from 'vitest';
import { escapeHtml, renderMarkdown } from '../../src/modules/comic/utils/markdown';

/**
 * 回归背景：预览最初只做块级解析，行内一律 escapeHtml 后原样输出，
 * 导致「- **萧炎**：……」这种列表项里的加粗只在页面上显示成字面星号。
 */
describe('renderMarkdown · 块级解析', () => {
  it('标题按 # 个数映射到 h1~h6', () => {
    expect(renderMarkdown('# 一级')).toBe('<h1>一级</h1>');
    expect(renderMarkdown('### 三级')).toBe('<h3>三级</h3>');
    expect(renderMarkdown('###### 六级')).toBe('<h6>六级</h6>');
  });

  it('无序列表合并成单个 ul，遇到非列表行才闭合', () => {
    expect(renderMarkdown('- 甲\n- 乙\n\n正文')).toBe('<ul><li>甲</li><li>乙</li></ul><p>正文</p>');
  });

  it('有序列表单独成 ol，且在 ul 之后会正确切换', () => {
    expect(renderMarkdown('- 甲\n1. 一\n2. 二')).toBe('<ul><li>甲</li></ul><ol><li>一</li><li>二</li></ol>');
  });

  it('空内容输出占位段落', () => {
    expect(renderMarkdown('   ', '尚未填写')).toBe('<p class="empty-preview">尚未填写</p>');
  });
});

describe('renderMarkdown · 行内解析（原始 bug）', () => {
  it('列表项里的粗体被渲染成 strong —— 这是「只渲染一层」的根因场景', () => {
    expect(renderMarkdown('- **萧炎**：13岁，萧家少年')).toBe('<ul><li><strong>萧炎</strong>：13岁，萧家少年</li></ul>');
  });

  it('标题里的粗体同样生效', () => {
    expect(renderMarkdown('## 人物 **重点**')).toBe('<h2>人物 <strong>重点</strong></h2>');
  });

  it('段落里的粗体生效', () => {
    expect(renderMarkdown('这是 **重点** 内容')).toBe('<p>这是 <strong>重点</strong> 内容</p>');
  });

  it('__下划线粗体__ 也生效', () => {
    expect(renderMarkdown('__加粗__')).toBe('<p><strong>加粗</strong></p>');
  });

  it('单个星号是斜体，且不会被粗体规则吃掉', () => {
    expect(renderMarkdown('*斜体* 与 **粗体**')).toBe('<p><em>斜体</em> 与 <strong>粗体</strong></p>');
  });

  it('snake_case 里的下划线不被误判成斜体', () => {
    expect(renderMarkdown('变量 snake_case_name 保持原样')).toBe('<p>变量 snake_case_name 保持原样</p>');
  });

  it('行内代码内的星号保持字面量', () => {
    expect(renderMarkdown('写法 `a**b**c` 不变')).toBe('<p>写法 <code>a**b**c</code> 不变</p>');
  });

  it('粗体 + 行内代码可混用', () => {
    expect(renderMarkdown('- **配置**：用 `key=value`')).toBe('<ul><li><strong>配置</strong>：用 <code>key=value</code></li></ul>');
  });
});

describe('renderMarkdown · 安全', () => {
  it('模型输出的 HTML 标签被转义，不会穿透成真标签', () => {
    expect(renderMarkdown('<script>alert(1)</script>')).toBe('<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>');
  });

  it('粗体内部若含标签同样被转义', () => {
    expect(renderMarkdown('**<img src=x onerror=1>**')).toBe('<p><strong>&lt;img src=x onerror=1&gt;</strong></p>');
  });

  it('escapeHtml 覆盖五个符号', () => {
    expect(escapeHtml(`&<>"'`)).toBe('&amp;&lt;&gt;&quot;&#39;');
  });
});
