/**
 * 全局工具启动器配置
 * TabBar 的 "+" 菜单与首页 Dashboard 工具网格共用
 */
export interface LauncherItem {
  /** 对应路由 meta.tab.key */
  key: string;
  path: string;
  title: string;
  desc: string;
  /** 图标标识,TabBar 内映射为 lucide 图标 */
  icon: string;
}

export const LAUNCHERS: LauncherItem[] = [
  {
    key: 'image-studio',
    path: '/image-studio',
    title: '生图工作台',
    desc: 'AI 图像生成',
    icon: 'image-studio',
  },
  {
    key: 'comic',
    path: '/comic/projects',
    title: '漫画工作台',
    desc: '故事到分镜一站式创作',
    icon: 'comic',
  },
  {
    key: 'wechat-flow',
    path: '/setup',
    title: '公众号矩阵',
    desc: '批量排版与一键同步',
    icon: 'wechat-flow',
  },
  {
    key: 'extract',
    path: '/extract',
    title: '图片提取',
    desc: '多平台批量取原图',
    icon: 'extract',
  },
  {
    key: 'gallery',
    path: '/gallery',
    title: '画夹',
    desc: '管理生成的图片',
    icon: 'gallery',
  },
  {
    key: 'prompt-templates',
    path: '/prompt-templates',
    title: '常用提示词',
    desc: '提示词模板管理',
    icon: 'prompt-templates',
  },
  {
    key: 'style-templates',
    path: '/style-templates',
    title: '样式模板',
    desc: '正文样式管理',
    icon: 'style-templates',
  },
  {
    key: 'settings',
    path: '/settings',
    title: '系统设置',
    desc: '模型、账号与存储',
    icon: 'settings',
  },
];
