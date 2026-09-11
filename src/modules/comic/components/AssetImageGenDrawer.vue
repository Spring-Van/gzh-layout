<template>
  <Teleport to="body">
    <!-- 遮罩层 -->
    <Transition name="fade">
      <!-- 生图配置抽屉：z-[130]/[131] 高于资产全屏抽屉（z-[101]）、低于大图预览（z-[200]） -->
      <div v-if="modelValue" class="fixed inset-0 z-[130] bg-black/60 backdrop-blur-sm" @click="handleClose" />
    </Transition>

    <!-- 抽屉：浮动卡片（与分镜页绘图配置抽屉一致），右侧滑入 -->
    <Transition name="slide-right">
      <div v-if="modelValue" class="fixed bottom-0 right-0 top-0 z-[131] flex w-[min(400px,96vw)] flex-col overflow-hidden p-4">
        <div class="flex flex-1 flex-col overflow-hidden rounded-xl border border-border-subtle bg-surface shadow-2xl shadow-black/40">
          <header class="flex shrink-0 items-center justify-between border-b border-border-subtle px-5 py-4">
            <h2 class="text-base font-semibold text-text-primary">资产生图配置</h2>
            <button class="icon-button" title="关闭" @click="handleClose"><X :size="18" /></button>
          </header>

          <div class="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-5">
            <div class="flex flex-col gap-4">
              <label class="flex flex-col gap-1.5 text-xs text-text-secondary">
                提示词生成模型（LLM）
                <select v-model="config.promptModelId" class="task-select h-9 w-full">
                  <option value="">未选择（单条重写时取第一个 LLM）</option>
                  <option v-for="model in llmModels" :key="model.id" :value="model.id">{{ model.name }}</option>
                </select>
              </label>

              <label class="flex flex-col gap-1.5 text-xs text-text-secondary">
                绘画提示词模板
                <select v-model="config.promptTemplateId" class="task-select h-9 w-full">
                  <option value="">未选择（生成时弹窗内选择）</option>
                  <option v-for="template in templates" :key="template.id" :value="template.id">{{ template.name }}</option>
                </select>
                <span v-if="!templates.length" class="text-[11px] text-amber-500">暂无「资产绘画提示词」模板，请先在系统设置中创建（类型选 asset-prompt）。</span>
              </label>

              <label class="flex flex-col gap-1.5 text-xs text-text-secondary">
                生图模型
                <select v-model="config.imageModelId" class="task-select h-9 w-full">
                  <option value="" disabled>选择生图模型</option>
                  <option v-for="model in imageModels" :key="model.id" :value="model.id">{{ model.name }}</option>
                </select>
              </label>

              <label class="flex flex-col gap-1.5 text-xs text-text-secondary">
                画面比例（资产参考图建议 3:4 或 1:1）
                <select v-model="config.aspectRatio" class="task-select h-9 w-full">
                  <option v-for="ratio in aspectRatios" :key="ratio" :value="ratio">{{ ratio }}</option>
                </select>
              </label>

              <label class="flex flex-col gap-1.5 text-xs text-text-secondary">
                分辨率
                <select v-model="config.resolution" class="task-select h-9 w-full">
                  <option v-for="item in resolutions" :key="item" :value="item">{{ item }}</option>
                </select>
              </label>

              <label class="flex flex-col gap-1.5 text-xs text-text-secondary">
                质量
                <select v-model="config.quality" class="task-select h-9 w-full">
                  <option value="">默认</option>
                  <option v-for="item in qualities" :key="item" :value="item">{{ item }}</option>
                </select>
              </label>

              <p class="rounded border border-border-subtle bg-app-bg px-3 py-2 text-[11px] leading-5 text-text-muted">
                配置保存后：单张「生成参考图」直接使用；批量生图按此配置串行执行。风格参考图沿用项目绘图配置中启用参考图的共用块。
              </p>
            </div>
          </div>

          <footer class="flex shrink-0 items-center justify-end gap-3 border-t border-border-subtle px-5 py-3">
            <button class="secondary-button" @click="handleClose">取消</button>
            <button class="primary-button h-9 px-4 text-xs" :disabled="!config.imageModelId" @click="handleSave">保存配置</button>
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
/**
 * 资产生图配置抽屉：项目级默认（生图模型/比例/分辨率/质量/提示词 LLM）。
 */
import { reactive, watch } from 'vue'
import { X } from 'lucide-vue-next'
import type { AssetGenConfig, ModelConfig, PromptTemplate } from '@comic/types'

interface Props {
  modelValue: boolean
  imageModels: ModelConfig[]
  llmModels: ModelConfig[]
  /** asset-prompt 类型模板，供提示词生成选择。 */
  templates: PromptTemplate[]
  config?: AssetGenConfig
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'save', config: AssetGenConfig): void
}>()

const aspectRatios = ['1:1', '3:4', '4:3', '2:3', '3:2', '16:9', '9:16']
const resolutions = ['1K', '2K', '4K']
const qualities = ['low', 'medium', 'high', 'auto']

const config = reactive<AssetGenConfig>({
  imageModelId: '',
  promptModelId: '',
  promptTemplateId: '',
  aspectRatio: '3:4',
  resolution: '1K',
  quality: '',
  concurrency: 1,
})

watch(() => props.modelValue, (visible) => {
  if (!visible) return
  Object.assign(config, {
    imageModelId: '',
    promptModelId: '',
    promptTemplateId: '',
    aspectRatio: '3:4',
    resolution: '1K',
    quality: '',
    concurrency: 1,
  }, props.config)
})

function handleSave() {
  emit('save', { ...config })
  emit('update:modelValue', false)
}

function handleClose() {
  emit('update:modelValue', false)
}
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
.slide-right-enter-active,
.slide-right-leave-active {
  transition: transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}
.slide-right-enter-from,
.slide-right-leave-to {
  transform: translateX(100%);
}
</style>
