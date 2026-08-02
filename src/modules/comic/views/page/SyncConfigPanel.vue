<template>
  <aside
    class="w-[35%] min-w-[320px] max-w-[420px] rounded-xl bg-surface border border-border-subtle shadow-lg shadow-black/20 overflow-hidden flex flex-col"
  >
    <!-- 顶部 Tab -->
    <div
      class="shrink-0 px-4 pt-3 pb-0 border-b border-border-subtle bg-elevated/50"
    >
      <div class="flex">
        <button
          v-for="tab in tabs"
          :key="tab.value"
          class="flex-1 pb-2.5 text-xs font-medium border-b-2 transition-colors"
          :class="
            modelTab === tab.value
              ? 'border-[#07c160] text-[#07c160]'
              : 'border-transparent text-text-tertiary hover:text-text-secondary'
          "
          @click="$emit('update:tab', tab.value)"
        >
          {{ tab.label }}
        </button>
      </div>
    </div>

    <!-- 内容区 -->
    <div class="flex-1 overflow-y-auto p-4 custom-scrollbar">
      <!-- ========== 标题 Tab ========== -->
      <template v-if="modelTab === 'title'">
        <div class="space-y-3">
          <div>
            <label class="block text-xs font-medium text-text-secondary mb-1.5">
              文章标题
            </label>
            <input
              :value="title"
              type="text"
              maxlength="64"
              placeholder="请输入文章标题"
              class="w-full px-3 py-2 rounded-lg bg-app-bg border border-border-subtle text-sm text-text-primary placeholder-text-tertiary focus:outline-none focus:border-[#07c160]/50 transition-colors"
              @input="$emit('update:title', ($event.target as HTMLInputElement).value)"
            />
            <p class="text-[10px] text-text-tertiary mt-1 text-right">
              {{ title.length }}/64
            </p>
          </div>

          <div>
            <label class="block text-xs font-medium text-text-secondary mb-1.5">
              文章摘要
            </label>
            <textarea
              :value="subtitle"
              rows="3"
              maxlength="120"
              placeholder="选填，建议 30-50 字"
              class="w-full px-3 py-2 rounded-lg bg-app-bg border border-border-subtle text-sm text-text-primary placeholder-text-tertiary focus:outline-none focus:border-[#07c160]/50 transition-colors resize-none"
              @input="$emit('update:subtitle', ($event.target as HTMLTextAreaElement).value)"
            />
            <p class="text-[10px] text-text-tertiary mt-1 text-right">
              {{ subtitle.length }}/120
            </p>
          </div>
        </div>
      </template>

      <!-- ========== 封面 Tab ========== -->
      <template v-else-if="modelTab === 'cover'">
        <div class="space-y-4">
          <!-- 封面模板选择 -->
          <div>
            <label class="block text-xs font-medium text-text-secondary mb-2">封面模板</label>
            <div
              class="border-2 border-border-subtle rounded-xl p-3 cursor-pointer hover:border-[#07c160]/40 hover:bg-app-bg/50 transition"
              @click="$emit('open-cover-template-selector')"
            >
              <div class="flex items-center gap-3">
                <div class="w-12 h-12 bg-surface rounded-lg border border-border-subtle flex items-center justify-center shadow-sm overflow-hidden">
                  <template v-if="coverTemplateId">
                    <svg class="w-6 h-6 text-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </template>
                  <template v-else>
                    <svg class="w-6 h-6 text-text-tertiary/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 4v16m8-8H4" />
                    </svg>
                  </template>
                </div>
                <div class="flex-1">
                  <p class="text-sm font-bold text-text-primary">
                    {{ coverTemplateName || '未选择封面模板' }}
                  </p>
                  <p class="text-xs text-text-tertiary">
                    {{ coverTemplateId ? '点击更换模板' : '点击选择封面模板' }}
                  </p>
                </div>
                <svg class="w-4 h-4 text-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </div>

          <!-- 封面预览卡片（含裁剪按钮，参考 CoverPreviewCard） -->
          <div v-if="previewCoverImage" class="space-y-2">
            <label class="block text-xs font-medium text-text-secondary">封面预览</label>
            <CoverPreviewCard
              v-model:ratio="previewRatio"
              :generated-cover-image="previewCoverImage"
              :pic-crop-235="picCrop235"
              :pic-crop-11="picCrop11"
              @crop="$emit('crop', $event)"
            />
          </div>

          <!-- 选择封面图片 -->
          <button
            class="w-full py-2.5 text-sm font-medium text-[#07c160] bg-[#07c160]/10 rounded-xl hover:bg-[#07c160]/20 transition flex items-center justify-center gap-2"
            @click="$emit('open-image-selector')"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            选择封面图片
          </button>

          <!-- 调整图片位置 -->
          <button
            v-if="coverTemplateId && coverImageIds.length > 0"
            class="w-full py-2.5 text-sm font-medium text-amber-600 bg-amber-50 dark:bg-amber-500/10 rounded-xl hover:bg-amber-100 dark:hover:bg-amber-500/20 transition flex items-center justify-center gap-2 border border-amber-200 dark:border-amber-500/30"
            @click="$emit('open-image-position-editor')"
          >
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 7h4m0 0V3m0 4v4m12-4h-4m0 0V3m0 4v4M4 17h4m0 0v4m0-4v-4m12 4h-4m0 0v4m0-4v-4" />
            </svg>
            调整图片位置
          </button>

          <!-- 生成封面 -->
          <button
            v-if="coverTemplateId && coverImageIds.length > 0"
            class="w-full py-2.5 text-sm font-medium text-white bg-[#07c160] rounded-xl hover:bg-[#06ad56] transition flex items-center justify-center gap-2 shadow-lg shadow-[#07c160]/20"
            :disabled="isGeneratingCover"
            @click="$emit('regenerate-cover')"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {{ isGeneratingCover ? '生成中...' : '生成封面' }}
          </button>
        </div>
      </template>

      <!-- ========== 排版 Tab（内部自带 ModalTemplateSelector 和 StyleTemplateDrawer） ========== -->
      <template v-else-if="modelTab === 'layout'">
        <div class="space-y-4">
          <!-- 排版模板选择 -->
          <div>
            <label class="block text-xs font-medium text-text-secondary mb-2">排版模板</label>
            <div
              class="border-2 border-border-subtle rounded-xl p-3 cursor-pointer hover:border-[#07c160]/40 hover:bg-app-bg/50 transition"
              @click="showTemplateSelector = true"
            >
              <div class="flex items-center gap-3">
                <div class="w-12 h-12 bg-surface rounded-lg border border-border-subtle flex items-center justify-center shadow-sm overflow-hidden">
                  <svg class="w-5 h-5 text-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                  </svg>
                </div>
                <div class="flex-1">
                  <p class="text-sm font-bold text-text-primary">{{ currentTemplateName }}</p>
                  <p class="text-xs text-text-tertiary">{{ currentTemplateDescription }}</p>
                </div>
                <svg class="w-4 h-4 text-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </div>

          <!-- 图片顺序 -->
          <div>
            <label class="block text-xs font-medium text-text-secondary mb-2">图片顺序</label>
            <div class="grid grid-cols-4 gap-2">
              <div
                v-for="img in images.slice(0, 4)"
                :key="img.id"
                class="aspect-square rounded-lg overflow-hidden bg-app-bg cursor-pointer hover:ring-2 hover:ring-[#07c160]/30 transition"
                @click="$emit('open-image-manager')"
              >
                <img
                  :src="getImageUrl(img.path)"
                  :alt="img.name"
                  class="w-full h-full object-cover"
                  @error="(e) => { (e.target as HTMLImageElement).style.display = 'none'; }"
                />
              </div>
              <div
                v-if="images.length > 4"
                class="aspect-square rounded-lg overflow-hidden bg-app-bg cursor-pointer hover:ring-2 hover:ring-[#07c160]/30 transition flex items-center justify-center"
                @click="$emit('open-image-manager')"
              >
                <span class="text-xs text-text-secondary font-medium">+{{ images.length - 4 }}</span>
              </div>
            </div>
            <button
              class="mt-2 w-full border border-border-subtle rounded-lg p-2 text-center text-sm text-text-secondary hover:bg-app-bg/50 transition flex items-center justify-center gap-2"
              @click="$emit('open-image-manager')"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              管理图片素材
            </button>
          </div>

        </div>
      </template>
    </div>

    <!-- 底部：公众号 + 发布 -->
    <div class="shrink-0 p-4 border-t border-border-subtle bg-elevated/50 space-y-3">
      <!-- 公众号选择 -->
      <div>
        <label class="block text-[10px] font-medium text-text-tertiary mb-1">
          公众号
        </label>
        <button
          class="w-full px-3 py-2 rounded-lg bg-app-bg border border-border-subtle text-sm hover:border-[#07c160]/50 transition-colors flex items-center justify-between"
          :class="!selectedAccount ? 'text-text-tertiary' : 'text-text-primary'"
          @click="$emit('open-account-selector')"
        >
          <span class="flex items-center gap-2 min-w-0">
            <span
              v-if="selectedAccount"
              class="w-6 h-6 rounded-full bg-[#07c160]/20 text-[#07c160] flex items-center justify-center text-[10px] font-medium flex-shrink-0"
            >
              {{ selectedAccount.nickname.charAt(0) || '微' }}
            </span>
            <span class="truncate">
              {{ selectedAccount?.nickname || '未选择公众号' }}
            </span>
          </span>
          <svg class="w-4 h-4 text-text-tertiary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <!-- 发布按钮 -->
      <button
        class="w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1.5"
        :class="
          canPublish
            ? 'bg-[#07c160] text-white hover:bg-[#06ad56] shadow-lg shadow-[#07c160]/20'
            : 'bg-app-bg border border-border-subtle text-text-tertiary cursor-not-allowed'
        "
        :disabled="!canPublish || isPublishing"
        @click="$emit('publish')"
      >
        <svg v-if="!isPublishing" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18" />
        </svg>
        <svg v-else class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
        </svg>
        {{ isPublishing ? '同步中...' : '同步至公众号' }}
      </button>
    </div>

    <!-- ========== 内置弹窗 ========== -->
    <!-- 排版模板选择器 -->
    <ModalTemplateSelector
      :visible="showTemplateSelector"
      :current-template-id="layoutTemplateId"
      @close="showTemplateSelector = false"
      @select="handleTemplateSelect"
      @open-template="handleOpenTemplateManager"
    />
  </aside>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import CoverPreviewCard from '@/components/typeset/CoverPreviewCard.vue'
import ModalTemplateSelector from '@/components/layout/ModalTemplateSelector.vue'
import { useTemplateStore } from '@/stores/template'
import type { WechatAccount } from '@/types'
import type { ComicConfigTab, ComicSyncImage } from '../../stores/sync'

interface Props {
  modelTab: ComicConfigTab
  title: string
  subtitle: string
  // 封面
  coverTemplateId: string
  coverTemplateName: string
  coverImageIds: string[]
  generatedCoverImage?: string
  picCrop235?: string
  picCrop11?: string
  isGeneratingCover: boolean
  // 排版
  layoutTemplateId: string
  images: ComicSyncImage[]
  getImageUrl: (path: string) => string
  // 发布
  isPublishing: boolean
  canPublish: boolean
  accounts: WechatAccount[]
  selectedAccountId: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:tab', tab: ComicConfigTab): void
  (e: 'update:title', title: string): void
  (e: 'update:subtitle', subtitle: string): void
  // 封面
  (e: 'open-cover-template-selector'): void
  (e: 'open-image-selector'): void
  (e: 'open-image-position-editor'): void
  (e: 'regenerate-cover'): void
  (e: 'crop', ratio: '235' | '11'): void
  // 排版
  (e: 'update:layout-template', templateId: string): void
  (e: 'open-image-manager'): void
  (e: 'open-template-manager'): void
  // 发布
  (e: 'open-account-selector'): void
  (e: 'publish'): void
}>()

const tabs: Array<{ label: string; value: ComicConfigTab }> = [
  { label: '标题', value: 'title' },
  { label: '封面', value: 'cover' },
  { label: '排版', value: 'layout' },
]

const previewRatio = ref<'235' | '11'>('235')

const selectedAccount = computed(() =>
  props.accounts.find((a) => a.id === props.selectedAccountId),
)

// === 封面预览（无生成封面时 fallback 到选中图片） ===
const previewCoverImage = computed(() => {
  if (props.generatedCoverImage) return props.generatedCoverImage
  const firstId = props.coverImageIds[0]
  if (firstId) {
    const img = props.images.find((i) => i.id === firstId)
    if (img) return props.getImageUrl(img.path)
  }
  // 没有选中的封面图片时，fallback 到第一张源图
  if (props.images.length > 0) return props.getImageUrl(props.images[0].path)
  return ''
})

// === 排版模板（内部自包含） ===
const templateStore = useTemplateStore()
const showTemplateSelector = ref(false)

const currentTemplateName = computed(() => {
  if (!props.layoutTemplateId) return '请选择模板'
  const tpl = templateStore.customTemplates.find((t) => t.id === props.layoutTemplateId)
  return tpl?.name || '未知模板'
})

const currentTemplateDescription = computed(() => {
  if (!props.layoutTemplateId) return '点击选择模板'
  const tpl = templateStore.customTemplates.find((t) => t.id === props.layoutTemplateId)
  return tpl?.description || '自定义排版模板'
})

function handleTemplateSelect(templateId: string) {
  emit('update:layout-template', templateId)
  showTemplateSelector.value = false
}

function handleOpenTemplateManager() {
  showTemplateSelector.value = false
  emit('open-template-manager')
}
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: var(--color-border-default, #cbd5e1);
  border-radius: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: var(--color-text-tertiary, #94a3b8);
}
</style>
