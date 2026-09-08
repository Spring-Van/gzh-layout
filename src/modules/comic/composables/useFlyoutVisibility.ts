import { onBeforeUnmount, ref } from "vue";

/**
 * hover 浮层显隐时机管理（收缩侧栏的章节/资产浮层共用）：
 * - 触发区 hover 120ms 防误触后弹出；移出触发区或面板 260ms 后收起；
 * - 点击触发区立即切换显隐；
 * - Esc 监听与打开后的定位由各浮层组件自行 watch visible 处理。
 */
export function useFlyoutVisibility() {
  const visible = ref(false);
  /** 浮层垂直锚点（触发按钮在侧栏内的 offsetTop），每次触发时更新，浮层跟随按钮位置。 */
  const anchorTop = ref(64);
  let showTimer: ReturnType<typeof setTimeout> | undefined;
  let hideTimer: ReturnType<typeof setTimeout> | undefined;

  const clearTimers = () => { clearTimeout(showTimer); clearTimeout(hideTimer); };
  const scheduleHide = () => {
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => { visible.value = false; }, 260);
  };
  const triggerEnter = (top?: number) => {
    if (typeof top === "number") anchorTop.value = top;
    clearTimers();
    showTimer = setTimeout(() => { visible.value = true; }, 120);
  };
  const triggerLeave = () => { clearTimeout(showTimer); scheduleHide(); };
  const triggerClick = (top?: number) => {
    if (typeof top === "number") anchorTop.value = top;
    clearTimers();
    visible.value = !visible.value;
  };
  const panelEnter = () => clearTimeout(hideTimer);
  const panelLeave = () => scheduleHide();
  const close = () => { clearTimers(); visible.value = false; };

  onBeforeUnmount(clearTimers);
  return { visible, anchorTop, triggerEnter, triggerLeave, triggerClick, panelEnter, panelLeave, close };
}
