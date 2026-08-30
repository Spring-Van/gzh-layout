<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="modelValue" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-5 backdrop-blur-sm" @click.self="handleClose">
        <section class="flex h-[min(680px,calc(100vh-3rem))] w-[min(860px,100%)] flex-col overflow-hidden rounded-lg border border-border-subtle bg-surface shadow-2xl">
          <header class="flex shrink-0 items-center justify-between border-b border-border-subtle px-5 py-4">
            <div>
              <h2 class="text-base font-semibold text-text-primary">批量生成绘画提示词</h2>
              <p class="mt-1 text-xs text-text-muted">将使用所选 LLM 为 {{ effectiveCount }} 个视觉状态一次性生成{{ isOverwrite ? '（覆盖已有提示词）' : '' }}，结果可逐条编辑。</p>
            </div>
            <button class="icon-button" title="关闭" @click="handleClose"><X :size="18" /></button>
          </header>

          <div class="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-5">
            <div class="grid grid-cols-2 gap-4">
              <label class="flex flex-col gap-1.5 text-xs text-text-secondary">
                LLM 模型
                <select v-model="modelId" class="task-select h-9 w-full">
                  <option value="" disabled>选择模型</option>
                  <option v-for="model in llmModels" :key="model.id" :value="model.id">{{ model.name }}</option>
                </select>
              </label>
              <label class="flex flex-col gap-1.5 text-xs text-text-secondary">
                提示词模板（资产提示词）
                <select v-model="templateId" class="task-select h-9 w-full">
                  <option value="" disabled>选择模板</option>
                  <option v-for="template in templates" :key="template.id" :value="template.id">{{ template.name }}</option>
                </select>
              </label>
            </div>
            <div v-if="allowScope" class="mt-4 flex items-center gap-4">
              <span class="text-xs text-text-secondary">生成范围</span>
              <label
                class="flex items-center gap-1.5 text-xs text-text-secondary"
                :class="{ 'pointer-events-none opacity-50': !missingCount }"
              >
                <input v-model="scope" type="radio" value="missing" class="h-3 w-3 accent-cyan-400" :disabled="!missingCount" />
                仅补缺失（{{ missingCount ?? 0 }}）
              </label>
              <label class="flex cursor-pointer items-center gap-1.5 text-xs text-text-secondary">
                <input v-model="scope" type="radio" value="all" class="h-3 w-3 accent-cyan-400" />
                全部重新生成（{{ totalCount ?? 0 }}）
              </label>
            </div>
            <p v-if="!templates.length" class="mt-3 rounded border border-amber-400/25 bg-amber-400/10 px-3 py-2 text-xs text-amber-200">
              没有类型为「资产提示词」的模板。请先在系统设置中创建（模板类型选择 asset-prompt）。
            </p>
            <div v-else class="mt-4 flex flex-col gap-1.5">
              <div class="flex items-center justify-between">
                <span class="text-xs text-text-secondary">最终发送的提示词（可在本次发送前修改）</span>
                <button class="text-xs text-cyan-400 hover:text-cyan-300" title="恢复系统拼装的提示词" @click="prompt = builtPrompt">重置</button>
              </div>
              <textarea
                v-model="prompt"
                class="custom-scrollbar h-[300px] w-full resize-none rounded-md border border-border-subtle bg-app-bg p-3 font-mono text-xs leading-6 text-text-primary outline-none focus:border-cyan-500/50"
                aria-label="最终发送提示词"
              />
            </div>
          </div>

          <footer class="flex shrink-0 items-center justify-between border-t border-border-subtle px-5 py-3">
            <p class="text-xs text-text-muted">{{ prompt.length.toLocaleString() }} 个字符</p>
            <div class="flex items-center gap-3">
              <button class="secondary-button" :disabled="busy" @click="handleClose">取消</button>
              <button class="primary-button h-9 px-4 text-xs" :disabled="!canConfirm || busy" @click="handleConfirm">
                <LoaderCircle v-if="busy" :size="15" class="animate-spin" />
                开始生成
              </button>
            </div>
          </footer>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
/**
 * 批量生成绘画提示词弹窗：选 LLM 模型 + asset-prompt 模板，预览/编辑最终 prompt 后执行。
 */
import { computed, ref, watch } from 'vue'
import { LoaderCircle, X } from 'lucide-vue-next'
import type { ModelConfig, PromptTemplate } from '@comic/types'

interface Props {
  modelValue: boolean
  llmModels: ModelConfig[]
  templates: PromptTemplate[]
  defaultModelId?: string
  defaultTemplateId?: string
  targetCount: number
  busy: boolean
  /** 由父组件构建的最终 prompt（基于当前模板与范围选择）。 */
  buildPrompt: (templateContent: string, scope?: 'missing' | 'all') => string
  /** 批量模式：允许选择生成范围（仅补缺失 / 全部重新生成）。 */
  allowScope?: boolean
  /** 缺少提示词的视觉状态数（allowScope 时展示）。 */
  missingCount?: number
  /** 全部视觉状态数（allowScope 时展示）。 */
  totalCount?: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'confirm', payload: { modelId: string; templateId: string; prompt?: string; scope?: 'missing' | 'all' }): void
}>()

const modelId = ref('')
const templateId = ref('')
const prompt = ref('')
/** 生成范围：仅补缺失（默认）/ 全部重新生成。 */
const scope = ref<'missing' | 'all'>('missing')

const isOverwrite = computed(() => Boolean(props.allowScope && scope.value === 'all'))
const effectiveCount = computed(() => {
  if (!props.allowScope) return props.targetCount
  return scope.value === 'missing' ? (props.missingCount ?? 0) : (props.totalCount ?? 0)
})
const builtPrompt = computed(() => {
  const template = props.templates.find((t) => t.id === templateId.value)
  if (!template) return ''
  return props.buildPrompt(template.content, props.allowScope ? scope.value : undefined)
})
const canConfirm = computed(() => Boolean(modelId.value && templateId.value && prompt.value.trim() && effectiveCount.value > 0))

watch(() => props.modelValue, (visible) => {
  if (!visible) return
  if (!modelId.value) modelId.value = props.defaultModelId || props.llmModels[0]?.id || ''
  if (!templateId.value) templateId.value = props.defaultTemplateId || props.templates[0]?.id || ''
  if (props.allowScope) scope.value = (props.missingCount ?? 0) > 0 ? 'missing' : 'all'
  prompt.value = builtPrompt.value
})

watch(builtPrompt, (value) => { prompt.value = value })

function handleConfirm() {
  if (!canConfirm.value || props.busy) return
  emit('confirm', { modelId: modelId.value, templateId: templateId.value, prompt: prompt.value, scope: props.allowScope ? scope.value : undefined })
}

function handleClose() {
  if (props.busy) return
  emit('update:modelValue', false)
}
</script>
