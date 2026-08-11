<template>
  <div class="space-y-2.5">
    <div class="flex items-center gap-2">
      <input :value="block.name" class="field-control flex-1 min-w-0" placeholder="属性名（Prompt 字段名）" @input="update({ name: inputValue($event) })" />
      <button class="icon-button" title="上移" @click="$emit('moveUp')"><ArrowUp class="w-3.5 h-3.5" /></button>
      <button class="icon-button" title="下移" @click="$emit('moveDown')"><ArrowDown class="w-3.5 h-3.5" /></button>
      <button class="icon-button hover:text-red-400" title="删除" @click="$emit('remove')"><Trash2 class="w-3.5 h-3.5" /></button>
    </div>

    <div v-if="isStyleTemplate" class="space-y-1.5">
      <div class="flex items-center justify-between">
        <label class="text-[11px] text-text-secondary">风格模板</label>
        <button class="text-[10px] text-cyan-400 hover:text-cyan-300" @click="isCustomStyle = !isCustomStyle">
          {{ isCustomStyle ? '改用风格模板' : '使用自定义风格' }}
        </button>
      </div>
      <select v-if="!isCustomStyle" :value="block.styleTemplateId || ''" class="field-control" @change="$emit('styleTemplateChange', ($event.target as HTMLSelectElement).value)">
        <option value="">请选择风格模板</option>
        <option v-for="template in styleTemplates" :key="template.id" :value="template.id">{{ template.name }}</option>
      </select>
    </div>

    <div class="flex items-center justify-between">
      <label class="text-[11px] text-text-secondary">需要参考图</label>
      <button class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors" :class="block.enableRefImages ? 'bg-cyan-500' : 'bg-elevated'" @click="update({ enableRefImages: !block.enableRefImages })">
        <span class="inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform" :class="block.enableRefImages ? 'translate-x-4' : 'translate-x-0.5'" />
      </button>
    </div>

    <div v-if="block.enableRefImages" class="space-y-2">
      <div class="flex items-center justify-between">
        <span class="text-[11px] text-text-secondary">参考图</span>
        <div class="flex items-center rounded-lg bg-surface p-0.5 border border-border-subtle">
          <button v-for="option in storageOptions" :key="option.value" class="px-2 py-0.5 rounded text-[10px]" :class="(block.storageMode || 'local') === option.value ? 'bg-elevated text-text-primary' : 'text-text-secondary'" @click="update({ storageMode: option.value })">{{ option.label }}</button>
        </div>
      </div>
      <div class="flex flex-wrap gap-2">
        <div v-for="(url, index) in block.referenceImages || []" :key="`${url}-${index}`" class="relative w-16 h-16 rounded-lg border border-border-subtle overflow-hidden group">
          <img :src="url" alt="属性参考图" class="w-full h-full object-cover" />
          <span v-if="imageNumbers[index]" class="absolute bottom-0 inset-x-0 text-center text-[9px] bg-black/70 text-cyan-300 py-0.5">图{{ imageNumbers[index] }}</span>
          <div class="absolute inset-0 bg-black/50 flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button class="image-button" title="预览" @click="$emit('previewImage', index)"><Eye class="w-3 h-3" /></button>
            <button class="image-button hover:bg-red-500/50" title="删除" @click="$emit('removeImage', index)"><X class="w-3 h-3" /></button>
          </div>
        </div>
        <button class="w-16 h-16 rounded-lg border border-dashed border-border-default flex flex-col items-center justify-center hover:border-cyan-500/40 hover:bg-cyan-500/5 disabled:opacity-50" :disabled="isUploading" @click="$emit('upload')">
          <LoaderCircle v-if="isUploading" class="w-4 h-4 animate-spin text-text-secondary" />
          <template v-else><Plus class="w-4 h-4 text-text-secondary" /><span class="text-[10px] text-text-secondary">上传</span></template>
        </button>
      </div>
    </div>

    <div class="space-y-1">
      <div class="flex items-center justify-between">
        <label class="text-[11px] text-text-secondary">描述</label>
        <button v-if="block.enableRefImages && imageNumbers.length" class="text-[10px] text-cyan-400 hover:text-cyan-300" @click="$emit('refreshDesc')">按图号刷新描述</button>
      </div>
      <textarea :value="block.description" class="field-control resize-none" rows="4" placeholder="属性描述（写入 Prompt 的值）" @input="update({ description: inputValue($event) })" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { ArrowDown, ArrowUp, Eye, LoaderCircle, Plus, Trash2, X } from 'lucide-vue-next';
import type { ImageStorageMode } from '@comic/services/uploadService';
import type { PromptTemplate, SharedPromptBlock } from '@comic/types';

const props = withDefaults(defineProps<{
  block: SharedPromptBlock;
  imageNumbers?: number[];
  styleTemplates?: PromptTemplate[];
  isUploading?: boolean;
}>(), {
  imageNumbers: () => [],
  styleTemplates: () => [],
  isUploading: false,
});
const emit = defineEmits<{
  update: [patch: Partial<SharedPromptBlock>];
  remove: [];
  moveUp: [];
  moveDown: [];
  upload: [];
  removeImage: [index: number];
  previewImage: [index: number];
  refreshDesc: [];
  styleTemplateChange: [templateId: string];
}>();
const storageOptions: Array<{ value: ImageStorageMode; label: string }> = [{ value: 'cloud', label: '云端' }, { value: 'local', label: '本地' }];
const isStyleTemplate = computed(() => props.block.contentSource === 'style_template');
const isCustomStyle = ref(false);

watch(() => [props.block.styleTemplateId, props.block.description] as const, () => {
  if (!isStyleTemplate.value) { isCustomStyle.value = true; return; }
  const template = props.styleTemplates?.find(item => item.id === props.block.styleTemplateId);
  if (template) isCustomStyle.value = template.content !== props.block.description;
  else isCustomStyle.value = !props.styleTemplates?.some(item => item.content === props.block.description);
}, { immediate: true });

function update(patch: Partial<SharedPromptBlock>) { emit('update', patch); }
function inputValue(event: Event) { return (event.target as HTMLInputElement | HTMLTextAreaElement).value; }
</script>

<style scoped>
.field-control { width: 100%; border-radius: .5rem; border: 1px solid var(--border-subtle); background: var(--bg-input); padding: .375rem .625rem; color: var(--text-primary); font-size: .875rem; outline: none; }
.field-control:focus { border-color: rgb(6 182 212 / .3); }
.icon-button { width: 1.75rem; height: 1.75rem; display: inline-flex; align-items: center; justify-content: center; border-radius: .5rem; color: var(--text-secondary); }
.icon-button:hover { color: var(--text-primary); background: var(--bg-elevated); }
.image-button { width: 1.5rem; height: 1.5rem; border-radius: .25rem; display: inline-flex; align-items: center; justify-content: center; color: white; background: rgb(255 255 255 / .2); }
</style>
