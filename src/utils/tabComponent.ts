import { defineComponent, h, markRaw, type Component } from 'vue';

/**
 * Tab 缓存包装组件工厂
 *
 * 每个 Tab 用一个唯一组件名的包装组件包裹原始路由组件,
 * 使 keep-alive 能按 Tab 维度缓存/驱逐"同一原始组件的多实例"
 * (例如多个漫画项目 Tab 各自的 ComicLayout 实例)。
 *
 * 用法(路由层级):component :is="getTabComponent(Component, matchKey)"
 * - matchKey 为空时直接渲染原始组件(未知路由不缓存);
 * - 关闭 Tab 时该包装名从 keep-alive include 移除,实例被精确驱逐,
 *   并触发子树的 onBeforeUnmount(漫画页面编辑器借此 flush 存盘)。
 */

const wrapperCache = new Map<string, Component>();

/** matchKey → keep-alive include 使用的包装组件名 */
export function tabCacheName(matchKey: string): string {
  return `Tab_${matchKey.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
}

/** 获取(或创建并缓存)matchKey 对应的包装组件 */
export function getTabComponent(raw: Component, matchKey: string): Component {
  let wrapper = wrapperCache.get(matchKey);
  if (!wrapper) {
    wrapper = markRaw(
      defineComponent({
        name: tabCacheName(matchKey),
        setup(_, { attrs, slots }) {
          return () => h(raw, attrs, slots);
        },
      })
    );
    wrapperCache.set(matchKey, wrapper);
  }
  return wrapper;
}
