<template>
  <div class="space-y-4">
    <div class="flex items-center gap-2 mb-3">
      <span class="w-1.5 h-4 bg-slate-400 rounded-full"></span>
      <label class="text-sm font-bold text-slate-800">当前文章标题</label>
    </div>

    <div class="flex items-center justify-between bg-slate-50 rounded-lg p-3 border border-slate-200">
      <label class="text-xs font-medium text-slate-600">继承全局标题规则</label>
      <button
        :class="[
          'w-11 h-6 rounded-full transition-colors relative',
          localInherit ? 'bg-primary' : 'bg-slate-300',
        ]"
        @click="localInherit = !localInherit"
      >
        <span
          :class="[
            'absolute top-1 w-4 h-4 bg-white rounded-full transition-transform',
            localInherit ? 'left-6' : 'left-1',
          ]"
        ></span>
      </button>
    </div>

    <div v-if="!localInherit" class="space-y-3">
      <div>
        <label class="text-xs font-medium text-slate-500 block mb-1">本篇标题</label>
        <input
          type="text"
          v-model="localTitle"
          class="w-full border border-slate-300 rounded-lg text-sm px-3 py-2 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
          placeholder="输入本篇标题"
        />
      </div>

      <div>
        <label class="text-xs font-medium text-slate-500 block mb-1">本篇副标题/文案</label>
        <textarea
          v-model="localSubtitle"
          rows="3"
          class="w-full border border-slate-300 rounded-lg text-sm px-3 py-2 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
          placeholder="输入副标题"
        ></textarea>
      </div>
    </div>

    <div class="bg-blue-50 rounded-lg p-3 border border-blue-200">
      <label class="text-xs font-medium text-blue-600 block mb-1">最终标题预览</label>
      <p class="text-sm text-blue-800 font-medium">{{ finalPreview }}</p>
      <p class="text-xs text-blue-500 mt-1">
        {{ localInherit ? '当前生效：来自全局' : '当前生效：已覆盖' }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { ArticleTitleConfig, GlobalTitleConfig } from '../../types';

interface Props {
  config: ArticleTitleConfig;
  globalConfig: GlobalTitleConfig;
  articleIndex: number;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  'update:config': [config: Partial<ArticleTitleConfig>];
}>();

const localInherit = computed({
  get: () => props.config.inheritGlobal,
  set: (val) => emit('update:config', { inheritGlobal: val }),
});

const localTitle = computed({
  get: () => props.config.title,
  set: (val) => emit('update:config', { title: val }),
});

const localSubtitle = computed({
  get: () => props.config.subtitle || '',
  set: (val) => emit('update:config', { subtitle: val }),
});

const finalPreview = computed(() => {
  if (localInherit.value) {
    const config = props.globalConfig;
    if (!config.enabled) return localTitle.value || '未设置标题';

    const numbering = generateNumbering(props.articleIndex + 1, config.numberingRule, config.customFormat);
    return `${config.prefix}${config.separator}${numbering}`.trim();
  }

  return localTitle.value || '未设置标题';
});

function generateNumbering(index: number, rule: string, customFormat: string): string {
  switch (rule) {
    case 'none':
      return '';
    case 'vol':
      return `Vol.${index}`;
    case 'issue':
      return `第${index}期`;
    case 'custom':
      return customFormat.replace('{n}', String(index));
    default:
      return '';
  }
}
</script>
