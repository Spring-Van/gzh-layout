<template>
  <div
    class="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center transition-opacity"
    :class="[visible ? 'opacity-100' : 'opacity-0 pointer-events-none']"
    @click.self="$emit('close')"
  >
    <div
      class="bg-white w-full max-w-lg rounded-2xl shadow-xl overflow-hidden transform transition-transform"
      :class="[visible ? 'scale-100' : 'scale-95']"
    >
      <div class="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
        <h3 class="font-bold text-slate-800">排版模板全局配置</h3>
        <button class="text-slate-400 hover:text-slate-600" @click="$emit('close')">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
      <div class="p-6">
        <p class="text-sm text-slate-500 mb-4">这里可以自行编写 HTML 或注入自定义 CSS 样式表。</p>
        <div class="border border-slate-200 rounded-lg p-4 bg-slate-50 flex items-center justify-center h-32 mb-4 text-sm text-slate-400 border-dashed">
          [开发中] 模板代码可视化编辑器
        </div>
        <button class="w-full border border-dashed border-slate-300 text-sm text-slate-600 py-2 rounded-lg hover:bg-slate-50 transition">
          + 导入外部模板文件
        </button>
      </div>
      <div class="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
        <button class="px-4 py-2 text-sm text-slate-600 hover:bg-slate-200 rounded" @click="$emit('close')">取消</button>
        <button class="px-4 py-2 text-sm bg-primary text-white rounded hover:bg-primary-hover transition" @click="handleSave">
          保存配置
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus';

interface Props {
  visible: boolean;
}

const props = defineProps<Props>();
const emit = defineEmits(['close', 'save']);

function handleSave() {
  ElMessage.success('模板配置保存成功');
  emit('save');
  emit('close');
}
</script>
