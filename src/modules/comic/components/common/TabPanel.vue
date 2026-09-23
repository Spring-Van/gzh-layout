<template>
  <!--
    页签容器：**互斥显示由这一层保证**。
    `v-show` 直接写在子组件上时，一旦子组件根节点变成多根（fragment）或抛出渲染错误，
    隐藏就可能失效或半失效（典型症状：两个页签内容同时出现、下拉浮层关不掉）。
    包一层真实元素后，display 一定落在这一层上，切换必定生效。
  -->
  <div v-show="active" class="flex min-h-0 flex-1 flex-col overflow-hidden">
    <!-- 兜住页签内部的渲染错误：不让一个页签的异常中断父页面的补丁 -->
    <div v-if="error" class="m-4 rounded-lg border border-red-500/40 bg-red-500/5 p-4 text-xs leading-relaxed text-red-300">
      <p class="font-medium">该页签渲染出错</p>
      <p class="mt-1 break-all">{{ error }}</p>
      <button
        class="mt-2 rounded-md border border-red-500/40 px-2 py-1 transition-colors hover:bg-red-500/10"
        @click="error = ''"
      >重试</button>
    </div>
    <slot v-else />
  </div>
</template>

<script setup lang="ts">
import { onErrorCaptured, ref } from 'vue'

withDefaults(defineProps<{
  /** 是否为当前页签（false 时整块 display:none）。不传 = 恒显示，只做错误兜底。 */
  active?: boolean
}>(), {
  active: true,
})

const error = ref('')

/**
 * 捕获子树里的渲染错误并就地降级显示。
 *
 * 为什么必须有：Vue 的补丁是「一路 patch 下去」的，子树抛错会让**父页面这次更新整体中断** ——
 * 于是 v-show 没应用（两个页签同时可见）、浮层状态没更新（下拉菜单关不掉）。
 * 在这里拦住，父页面的更新就能正常走完。
 */
onErrorCaptured((caught) => {
  error.value = caught instanceof Error ? caught.message : String(caught)
  console.error('[TabPanel] 页签渲染出错：', caught)
  return false
})
</script>
