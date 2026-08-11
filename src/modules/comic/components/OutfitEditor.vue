<template>
  <section
    v-if="asset && outfits.length"
    class="flex-1 min-w-0 rounded-lg bg-surface border border-border-subtle shadow-lg shadow-black/20 flex flex-col overflow-hidden"
  >
    <div class="shrink-0 px-3 py-2.5 border-b border-border-subtle flex items-center gap-2">
      <span class="text-xs font-medium text-text-primary">服装</span>
      <span class="text-[10px] text-text-secondary">{{ outfits.length }} 套</span>
    </div>

    <div class="shrink-0 px-3 py-2 border-b border-border-subtle overflow-x-auto">
      <div class="flex items-center gap-1.5 min-w-min">
        <button
          v-for="(outfit, index) in outfits"
          :key="outfit.id"
          class="group shrink-0 px-3 py-1.5 rounded-lg text-[11px] transition-colors flex items-center gap-2"
          :class="activeOutfitId === outfit.id
            ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
            : 'bg-surface text-text-secondary border border-border-subtle hover:bg-elevated hover:text-text-primary'"
          @click="activeOutfitId = outfit.id"
        >
          <span v-if="outfit.referenceImage" class="w-5 h-5 rounded overflow-hidden border border-border-subtle shrink-0">
            <img :src="outfit.referenceImage" :alt="`${outfit.name}参考图`" class="w-full h-full object-cover" loading="lazy" decoding="async" />
          </span>
          <span v-else class="w-5 h-5 rounded border border-dashed border-border-default flex items-center justify-center shrink-0">
            <ImageIcon class="w-3 h-3 text-text-muted" />
          </span>
          <span>{{ outfit.name || `服装${index + 1}` }}</span>
          <span v-if="outfit.syncedToLibrary" class="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" title="已在素材库" />
          <span
            class="shrink-0 w-4 h-4 rounded inline-flex items-center justify-center text-text-muted opacity-0 group-hover:opacity-100 hover:bg-red-500/20 hover:text-red-400"
            title="删除该服装"
            @click.stop="$emit('delete', outfit.id)"
          >
            <X class="w-3 h-3" />
          </span>
        </button>
      </div>
    </div>

    <div class="flex-1 overflow-auto p-4">
      <div v-if="activeOutfit" class="rounded-lg border border-border-subtle bg-input-bg p-4 space-y-3 max-w-2xl mx-auto">
        <input
          :value="activeOutfit.name"
          class="w-full bg-transparent text-sm text-text-primary font-medium border-b border-border-subtle hover:border-border-default focus:border-cyan-500/40 focus:outline-none px-0 py-1"
          maxlength="20"
          placeholder="服装名称"
          @input="$emit('nameInput', activeOutfit.id, ($event.target as HTMLInputElement).value)"
          @blur="$emit('save')"
        />

        <div class="flex gap-4 items-stretch">
          <div class="w-44 shrink-0">
            <div v-if="activeOutfit.referenceImage" class="relative w-full aspect-[3/4] rounded-lg border border-border-subtle overflow-hidden">
              <img
                :src="activeOutfit.referenceImage"
                :alt="`${asset.name} - ${activeOutfit.name}`"
                class="w-full h-full object-cover cursor-pointer"
                decoding="async"
                @click="$emit('preview', [activeOutfit.referenceImage], 0, `${asset.name} - ${activeOutfit.name}`)"
              />
              <button class="absolute top-1.5 right-1.5 w-6 h-6 rounded bg-black/60 hover:bg-red-500/70 inline-flex items-center justify-center text-white" title="移除参考图" @click="$emit('removeImage', activeOutfit.id)">
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
              <button class="action-button" :disabled="uploadingOutfitId === activeOutfit.id" @click="$emit('upload', activeOutfit.id)">
                <LoaderCircle v-if="uploadingOutfitId === activeOutfit.id" class="w-3.5 h-3.5 animate-spin" />
                <Upload v-else class="w-3.5 h-3.5" />
                {{ uploadingOutfitId === activeOutfit.id ? '上传中' : activeOutfit.referenceImage ? '重新上传' : '上传图片' }}
              </button>
              <button class="action-button action-button--cyan" @click="$emit('selectMaterial', activeOutfit.id)">
                <Images class="w-3.5 h-3.5" />
                从素材库选择
              </button>
              <button
                v-if="activeOutfit.referenceImage && !activeOutfit.syncedToLibrary"
                class="action-button action-button--green"
                :disabled="syncing"
                @click="$emit('syncMaterial', activeOutfit.id)"
              >
                <LoaderCircle v-if="syncing" class="w-3.5 h-3.5 animate-spin" />
                <RefreshCw v-else class="w-3.5 h-3.5" />
                同步至素材库
              </button>
              <div v-else-if="activeOutfit.referenceImage" class="flex-1 rounded-lg border border-emerald-500/20 bg-emerald-500/5 flex items-center justify-center gap-1.5 py-2 text-emerald-400 text-[11px]">
                <Check class="w-3.5 h-3.5" />
                已在素材库
              </div>
            </div>

            <div class="flex-1 flex flex-col rounded-lg border border-border-subtle bg-input-bg overflow-hidden min-h-[180px]">
              <div class="flex items-center gap-4 px-3 py-1.5 border-b border-border-subtle text-[11px]">
                <button
                  v-for="tab in descriptionTabs"
                  :key="tab.value"
                  class="py-1.5 transition-colors"
                  :class="activeDescriptionTab === tab.value ? 'text-cyan-400 border-b border-cyan-400' : 'text-text-secondary hover:text-text-primary'"
                  @click="activeDescriptionTab = tab.value"
                >
                  {{ tab.label }}
                </button>
                <span class="flex-1" />
                <span class="text-[10px] text-text-muted">{{ activeDescription.length }} / 500</span>
              </div>
              <textarea
                :value="activeDescription"
                class="flex-1 w-full bg-transparent px-3 py-2 text-[11px] text-text-primary placeholder-text-muted focus:outline-none resize-none leading-relaxed"
                :placeholder="activeDescriptionTab === 'description' ? '如：米白色棉麻连衣裙，裙摆柔软...' : defaultReferenceDescription"
                maxlength="500"
                @input="handleDescriptionInput"
                @blur="$emit('save')"
              />
            </div>

            <label class="flex items-center gap-2 cursor-pointer select-none text-[11px] text-text-secondary hover:text-text-primary">
              <button
                type="button"
                class="relative inline-flex h-4 w-7 items-center rounded-full transition-colors shrink-0"
                :class="asset.insertOutfitDescription !== false ? 'bg-cyan-500' : 'bg-elevated'"
                @click="$emit('toggleInsertDescription')"
              >
                <span class="inline-block h-3 w-3 rounded-full bg-white transition-transform" :class="asset.insertOutfitDescription !== false ? 'translate-x-3.5' : 'translate-x-0.5'" />
              </button>
              <span>是否插入服装描述</span>
            </label>
          </div>
        </div>
      </div>
      <div v-else class="text-center text-text-muted text-[11px] py-8">请选择服装</div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { Check, Image as ImageIcon, Images, LoaderCircle, RefreshCw, Upload, X } from 'lucide-vue-next';
import type { ProjectAsset } from '@comic/types';

const props = defineProps<{
  asset: ProjectAsset | null;
  uploadingOutfitId: string | null;
  syncing: boolean;
  defaultReferenceDescription: string;
}>();

const emit = defineEmits<{
  delete: [outfitId: string];
  upload: [outfitId: string];
  selectMaterial: [outfitId: string];
  syncMaterial: [outfitId: string];
  removeImage: [outfitId: string];
  nameInput: [outfitId: string, value: string];
  descriptionInput: [outfitId: string, value: string];
  referenceDescriptionInput: [outfitId: string, value: string];
  preview: [images: string[], index: number, alt: string];
  save: [];
  toggleInsertDescription: [];
}>();

const descriptionTabs = [
  { value: 'description', label: '服装描述' },
  { value: 'reference', label: '参考图描述' },
] as const;
const activeOutfitId = ref<string | null>(null);
const activeDescriptionTab = ref<(typeof descriptionTabs)[number]['value']>('description');
const outfits = computed(() => props.asset?.outfits || []);
const activeOutfit = computed(() => outfits.value.find(outfit => outfit.id === activeOutfitId.value) || null);
const activeDescription = computed(() => activeDescriptionTab.value === 'reference'
  ? activeOutfit.value?.referenceImageDesc || ''
  : activeOutfit.value?.description || '');

watch(
  () => [props.asset?.id, outfits.value.map(outfit => outfit.id).join(',')] as const,
  () => {
    if (!outfits.value.some(outfit => outfit.id === activeOutfitId.value)) {
      activeOutfitId.value = outfits.value[0]?.id || null;
    }
    activeDescriptionTab.value = 'description';
  },
  { immediate: true },
);

function handleDescriptionInput(event: Event) {
  if (!activeOutfit.value) return;
  const value = (event.target as HTMLTextAreaElement).value;
  if (activeDescriptionTab.value === 'reference') emit('referenceDescriptionInput', activeOutfit.value.id, value);
  else emit('descriptionInput', activeOutfit.value.id, value);
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
  font-size: 0.6875rem;
  transition: color 150ms, background-color 150ms, border-color 150ms;
}
.action-button:hover { color: var(--text-primary); background: var(--bg-elevated); }
.action-button--cyan:hover { color: rgb(34 211 238); border-color: rgb(6 182 212 / 0.2); background: rgb(6 182 212 / 0.05); }
.action-button--green:hover { color: rgb(52 211 153); border-color: rgb(16 185 129 / 0.2); background: rgb(16 185 129 / 0.05); }
.action-button:disabled { opacity: 0.5; pointer-events: none; }
</style>
