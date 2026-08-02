import { ref, watch } from 'vue';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'gzh-layout-theme';

/** 全局主题状态（单例） */
const theme = ref<Theme>(
  (localStorage.getItem(STORAGE_KEY) as Theme) || 'dark'
);

/**
 * 主题切换 composable
 * 通过给 <html> 添加/移除 `dark` class 控制 Tailwind 暗色模式
 */
export function useTheme() {
  const toggle = () => {
    theme.value = theme.value === 'dark' ? 'light' : 'dark';
  };

  const setTheme = (t: Theme) => {
    theme.value = t;
  };

  watch(
    theme,
    (t) => {
      localStorage.setItem(STORAGE_KEY, t);
      document.documentElement.classList.toggle('dark', t === 'dark');
    },
    { immediate: true }
  );

  return { theme, toggle, setTheme };
}
