<template>
  <div class="space-y-4">
    <div class="flex items-center gap-2 mb-3">
      <span class="w-1.5 h-4 bg-primary rounded-full"></span>
      <label class="text-sm font-bold text-slate-800">全局标题规则</label>
    </div>

    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <label class="text-xs font-medium text-slate-600">启用公共前缀</label>
        <input
          type="checkbox"
          v-model="localConfig.enabled"
          class="w-4 h-4 text-primary"
        />
      </div>

      <div v-if="localConfig.enabled">
        <label class="text-xs font-medium text-slate-500 block mb-1"
          >公共前缀</label
        >
        <input
          type="text"
          v-model="localConfig.prefix"
          class="w-full border border-slate-300 rounded-lg text-sm px-3 py-2 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
          placeholder="输入标题前缀"
        />
      </div>

      <div v-if="localConfig.enabled">
        <label class="text-xs font-medium text-slate-500 block mb-1"
          >编号规则</label
        >
        <select
          v-model="localConfig.numberingRule"
          class="w-full border border-slate-300 rounded-lg text-sm px-3 py-2 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
        >
          <option value="none">不编号</option>
          <option value="vol">Vol.1 / Vol.2</option>
          <option value="issue">第1期 / 第2期</option>
          <option value="custom">自定义格式</option>
        </select>
      </div>

      <div v-if="localConfig.enabled && localConfig.numberingRule === 'custom'">
        <label class="text-xs font-medium text-slate-500 block mb-1"
          >自定义格式（使用 {n} 表示编号）</label
        >
        <input
          type="text"
          v-model="localConfig.customFormat"
          class="w-full border border-slate-300 rounded-lg text-sm px-3 py-2 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
          placeholder="例如：第{n}期"
        />
      </div>

      <div v-if="localConfig.enabled">
        <label class="text-xs font-medium text-slate-500 block mb-1"
          >分隔符</label
        >
        <input
          type="text"
          v-model="localConfig.separator"
          class="w-full border border-slate-300 rounded-lg text-sm px-3 py-2 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
          placeholder="例如： | "
        />
      </div>

      <div
        v-if="localConfig.enabled"
        class="bg-slate-50 rounded-lg p-3 border border-slate-200"
      >
        <label class="text-xs font-medium text-slate-500 block mb-1"
          >示例预览</label
        >
        <p class="text-sm text-slate-700 font-medium">{{ previewExample }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/* eslint-disable vue/no-unused-properties, @typescript-eslint/no-unused-vars */
import { computed } from "vue";
import type { GlobalTitleConfig } from "../../types";

interface Props {
  config: GlobalTitleConfig;
}

const props = defineProps<Props>();
/* eslint-enable vue/no-unused-properties, @typescript-eslint/no-unused-vars */

const emit = defineEmits<{
  "update:config": [config: GlobalTitleConfig];
}>();

const localConfig = computed({
  get: () => props.config,
  set: (val) => emit("update:config", val),
});

const previewExample = computed(() => {
  if (!localConfig.value.enabled) return "标题示例";

  const numbering =
    localConfig.value.numberingRule === "none"
      ? ""
      : localConfig.value.numberingRule === "vol"
        ? "Vol.3"
        : localConfig.value.numberingRule === "issue"
          ? "第3期"
          : localConfig.value.customFormat.replace("{n}", "3");

  return `${localConfig.value.prefix}${localConfig.value.separator}${numbering}`.trim();
});
</script>
