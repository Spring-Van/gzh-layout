/**
 * 漫画页面编辑器类型定义
 * 所有页面数据均为动态结构，支持任意字段扩展
 */

/** 单页数据 - 动态结构，支持任意键值 */
export type ComicPage = Record<string, unknown>;

/** 整本漫画数据 */
export interface ComicPageData {
  title?: string;
  summary?: string;
  pages: ComicPage[];
  assetDefinitions?: Record<string, unknown>;
}
