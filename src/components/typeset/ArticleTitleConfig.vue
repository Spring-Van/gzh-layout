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
      <button
        class="w-full text-xs text-primary border border-primary/30 bg-primary/5 rounded-lg py-2 hover:bg-primary/10 transition"
        @click="bringGlobalValues"
      >
        从全局带入标题和摘要
      </button>

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
        <label class="text-xs font-medium text-slate-500 block mb-1">本篇摘要</label>
        <textarea
          v-model="localSubtitle"
          rows="3"
          class="w-full border border-slate-300 rounded-lg text-sm px-3 py-2 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
          placeholder="输入本篇摘要"
        ></textarea>
      </div>

      <div>
        <label class="text-xs font-medium text-slate-500 block mb-1">原文地址</label>
        <input
          type="url"
          v-model="localSourceUrl"
          class="w-full border rounded-lg text-sm px-3 py-2 focus:ring-1 focus:ring-primary outline-none"
          :class="urlError ? 'border-red-300 focus:border-red-500' : 'border-slate-300 focus:border-primary'"
          placeholder="输入图文消息的原文地址"
        />
        <p v-if="urlError" class="text-[10px] text-red-500 mt-1">{{ urlError }}</p>
        <p v-else class="text-[10px] text-slate-400 mt-1">填写后文章左下角将显示"阅读原文"链接</p>
      </div>
    </div>

    <div
      class="bg-blue-50 rounded-lg p-3 border border-blue-200"
    >
      <label class="text-xs font-medium text-blue-600 block mb-1">标题示例预览</label>
      <p class="text-sm text-blue-800 font-medium">{{ finalPreview }}</p>
      <p v-if="finalSubtitle" class="text-xs text-blue-500 mt-1">{{ finalSubtitle }}</p>
      <p class="text-xs text-blue-400 mt-1">
        {{ localInherit ? '当前生效：来自全局' : '当前生效：已覆盖' }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
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

const urlError = ref('');

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

const localSourceUrl = computed({
  get: () => props.config.sourceUrl || '',
  set: (val) => {
    urlError.value = '';
    if (val && !isValidUrl(val)) {
      urlError.value = '请输入有效的 URL 地址';
    }
    emit('update:config', { sourceUrl: val });
  },
});

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

const finalPreview = computed(() => {
  const config = props.globalConfig;

  if (localInherit.value) {
    if (!config.enabled) return localTitle.value || '未设置标题';
    const numbering = generateNumbering(props.articleIndex + 1, config.numberingRule, config.customFormat);
    return `${config.prefix}${config.separator}${numbering}`.trim();
  }

  return localTitle.value || '未设置标题';
});

const finalSubtitle = computed(() => {
  if (localInherit.value) {
    return props.globalConfig.subtitle || '';
  }
  return localSubtitle.value;
});

function bringGlobalValues() {
  const config = props.globalConfig;
  if (config.enabled) {
    const numbering = generateNumbering(props.articleIndex + 1, config.numberingRule, config.customFormat);
    emit('update:config', {
      title: `${config.prefix}${config.separator}${numbering}`.trim(),
      subtitle: config.subtitle || '',
    });
  } else {
    emit('update:config', {
      subtitle: config.subtitle || '',
    });
  }
}

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
