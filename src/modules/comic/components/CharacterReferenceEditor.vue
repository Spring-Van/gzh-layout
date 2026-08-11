<template>
  <section class="flex-1 min-w-0 flex flex-col overflow-hidden rounded-lg bg-surface border border-border-subtle shadow-lg shadow-black/20">
    <div v-if="asset" class="flex-1 overflow-auto p-5">
      <div class="max-w-3xl mx-auto space-y-5">
        <div class="flex items-center justify-between gap-4">
          <h2 class="text-base font-semibold text-text-primary truncate">{{ asset.name }}</h2>
          <div class="flex items-center gap-1.5 shrink-0">
            <span class="text-[10px] text-text-secondary">存储方式</span>
            <div class="flex items-center rounded-lg bg-surface p-0.5 border border-border-subtle">
              <button
                v-for="option in storageOptions"
                :key="option.value"
                class="px-2 py-0.5 rounded text-[10px] transition-colors"
                :class="storageMode === option.value ? 'bg-elevated text-text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'"
                @click="$emit('update:storageMode', option.value)"
              >
                {{ option.label }}
              </button>
            </div>
          </div>
        </div>

        <div>
          <div class="flex items-center justify-between mb-3">
            <span class="text-[11px] text-text-secondary">参考图</span>
            <span class="text-[10px] text-text-muted">单张，限一张</span>
          </div>

          <div class="flex gap-4 items-stretch">
            <div class="w-44 shrink-0">
              <div v-if="referenceImage" class="relative w-full aspect-[3/4] rounded-lg border border-border-subtle overflow-hidden group">
                <img
                  :src="referenceImage"
                  :alt="`${asset.name}参考图`"
                  class="w-full h-full object-cover cursor-pointer"
                  decoding="async"
                  @click="$emit('preview', asset.referenceImages, 0, `${asset.name} - 参考图`)"
                />
                <button
                  class="absolute top-1.5 right-1.5 w-6 h-6 rounded bg-black/60 hover:bg-red-500/70 inline-flex items-center justify-center text-white"
                  title="移除参考图"
                  @click="$emit('removeImage')"
                >
                  <X class="w-3.5 h-3.5" />
                </button>
              </div>
              <div v-else class="w-full aspect-[3/4] rounded-lg border border-dashed border-border-default flex flex-col items-center justify-center gap-2">
                <ImageIcon class="w-7 h-7 text-text-muted" />
                <span class="text-[10px] text-text-secondary">暂无参考图</span>
              </div>
            </div>

            <div class="flex-1 min-w-0 flex flex-col gap-2">
              <div class="flex gap-2">
                <button class="action-button" :disabled="uploading" @click="$emit('upload')">
                  <LoaderCircle v-if="uploading" class="w-3.5 h-3.5 animate-spin" />
                  <Upload v-else class="w-3.5 h-3.5" />
                  {{ uploading ? '上传中' : referenceImage ? '重新上传' : '上传图片' }}
                </button>
                <button class="action-button action-button--cyan" @click="$emit('selectMaterial')">
                  <Images class="w-3.5 h-3.5" />
                  从素材库选择
                </button>
                <button
                  v-if="referenceImage && !imageInLibrary"
                  class="action-button action-button--green"
                  :disabled="syncing"
                  @click="$emit('syncMaterial')"
                >
                  <LoaderCircle v-if="syncing" class="w-3.5 h-3.5 animate-spin" />
                  <RefreshCw v-else class="w-3.5 h-3.5" />
                  {{ syncing ? '同步中' : '同步至素材库' }}
                </button>
                <div v-else-if="referenceImage" class="flex-1 rounded-lg border border-emerald-500/20 bg-emerald-500/5 flex items-center justify-center gap-1.5 py-2 text-emerald-400 text-[10px]">
                  <Check class="w-3.5 h-3.5" />
                  已在素材库
                </div>
              </div>

              <div class="flex-1 min-h-[140px] rounded-lg bg-input-bg border border-border-subtle flex flex-col overflow-hidden">
                <div class="shrink-0 flex items-center justify-between border-b border-border-subtle px-2">
                  <div class="flex items-center">
                    <button
                      v-for="tab in descriptionTabs"
                      :key="tab"
                      class="px-2 py-2 text-[10px] transition-colors relative"
                      :class="activeTab === tab ? 'text-cyan-400' : 'text-text-secondary hover:text-text-primary'"
                      @click="activeTab = tab"
                    >
                      {{ tab }}
                      <span v-if="activeTab === tab" class="absolute bottom-0 left-1 right-1 h-px bg-cyan-400" />
                    </button>
                  </div>
                  <span class="text-[10px] text-text-muted">{{ activeText.length }} / 500</span>
                </div>
                <textarea
                  :value="activeText"
                  class="flex-1 w-full bg-transparent px-3 py-2 text-[11px] text-text-primary placeholder-text-muted focus:outline-none resize-none leading-relaxed"
                  :placeholder="activeTab === '人物描述' ? characterPlaceholder : defaultReferenceDescription"
                  maxlength="500"
                  @input="handleDescriptionInput"
                />
              </div>

              <label class="flex items-center gap-2 cursor-pointer select-none text-[10px] text-text-secondary hover:text-text-primary">
                <button
                  type="button"
                  class="relative inline-flex h-4 w-7 items-center rounded-full transition-colors shrink-0"
                  :class="asset.insertCharacterDescription !== false ? 'bg-cyan-500' : 'bg-elevated'"
                  @click="$emit('toggleInsertDescription')"
                >
                  <span class="inline-block h-3 w-3 rounded-full bg-white transition-transform" :class="asset.insertCharacterDescription !== false ? 'translate-x-3.5' : 'translate-x-0.5'" />
                </button>
                <span>是否插入人物描述</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="flex-1 flex flex-col items-center justify-center text-text-muted">
      <UserRound class="w-12 h-12 mb-3 opacity-30" />
      <p class="text-sm">选择左侧人物上传参考图</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { Check, Image as ImageIcon, Images, LoaderCircle, RefreshCw, Upload, UserRound, X } from 'lucide-vue-next';
import type { ImageStorageMode } from '@comic/services/uploadService';
import type { ProjectAsset } from '@comic/types';

const props = defineProps<{
  asset: ProjectAsset | null;
  storageMode: ImageStorageMode;
  uploading: boolean;
  syncing: boolean;
  imageInLibrary: boolean;
  defaultReferenceDescription: string;
}>();

const emit = defineEmits<{
  upload: [];
  selectMaterial: [];
  syncMaterial: [];
  removeImage: [];
  toggleInsertDescription: [];
  preview: [images: string[], index: number, alt: string];
  descriptionInput: [value: string];
  referenceDescriptionInput: [value: string];
  'update:storageMode': [value: ImageStorageMode];
}>();

const storageOptions: Array<{ value: ImageStorageMode; label: string }> = [
  { value: 'cloud', label: '云端' },
  { value: 'local', label: '本地' },
];
const descriptionTabs = ['人物描述', '参考图描述'] as const;
const activeTab = ref<(typeof descriptionTabs)[number]>('人物描述');
const referenceImage = computed(() => props.asset?.referenceImages?.[0] || '');
const activeText = computed(() => activeTab.value === '人物描述'
  ? props.asset?.description || ''
  : props.asset?.referenceImageDescs?.[0] || '');
const characterPlaceholder = '如：二十多岁男性，黑色短发，身材匀称，脸部线条温和...';

watch(() => props.asset?.id, () => { activeTab.value = '人物描述'; });

function handleDescriptionInput(event: Event) {
  const value = (event.target as HTMLTextAreaElement).value;
  if (activeTab.value === '人物描述') emit('descriptionInput', value);
  else emit('referenceDescriptionInput', value);
}
</script>

<style scoped>
.action-button {
  flex: 1 1 0%;
  border-radius: 0.5rem;
  border: 1px solid var(--border-subtle);
  background: var(--bg-surface);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  padding: 0.5rem;
  color: var(--text-secondary);
  font-size: 0.625rem;
  transition: color 150ms, background-color 150ms, border-color 150ms;
}

.action-button:hover {
  color: var(--text-primary);
  background: var(--bg-elevated);
}

.action-button--cyan:hover {
  color: rgb(34 211 238);
  border-color: rgb(6 182 212 / 0.2);
  background: rgb(6 182 212 / 0.05);
}

.action-button--green:hover {
  color: rgb(52 211 153);
  border-color: rgb(16 185 129 / 0.2);
  background: rgb(16 185 129 / 0.05);
}

.action-button:disabled {
  opacity: 0.5;
  pointer-events: none;
}
</style>
