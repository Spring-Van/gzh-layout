<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="modelValue" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-5 backdrop-blur-sm" @click.self="handleClose">
        <section class="flex h-[min(700px,calc(100vh-3rem))] w-[min(880px,100%)] flex-col overflow-hidden rounded-lg border border-border-subtle bg-surface shadow-2xl">
          <header class="flex shrink-0 items-center justify-between border-b border-border-subtle px-5 py-4">
            <div>
              <h2 class="text-base font-semibold text-text-primary">{{ isBatch ? '批量推导画面描述' : `推导分镜 ${panelOrder} 画面描述` }}</h2>
              <p class="mt-1 text-xs text-text-muted">
                {{ isBatch
                  ? `将依次推导 ${effectiveCount} 个分镜（一次只生成一条，前后分镜自动关联）${isOverwrite ? '（覆盖已有描述）' : ''}`
                  : '一次只生成本分镜的画面描述，自动携带前文分镜上下文。' }}
              </p>
            </div>
            <button class="icon-button" title="关闭" @click="handleClose"><X :size="18" /></button>
          </header>

          <div class="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-5">
            <div class="grid grid-cols-2 gap-4">
              <label class="flex flex-col gap-1.5 text-xs text-text-secondary">
                LLM 模型
                <select v-model="modelId" class="h-9 w-full rounded-md border border-border-subtle bg-app-bg px-2.5 text-xs text-text-primary outline-none focus:border-cyan-500/50">
                  <option value="" disabled>选择模型</option>
                  <option v-for="model in llmModels" :key="model.id" :value="model.id">{{ model.name }}</option>
                </select>
              </label>
              <label class="flex flex-col gap-1.5 text-xs text-text-secondary">
                画面描述模板（panel-prompt）
                <select v-model="templateId" class="h-9 w-full rounded-md border border-border-subtle bg-app-bg px-2.5 text-xs text-text-primary outline-none focus:border-cyan-500/50">
                  <option value="">内置默认模板</option>
                  <option v-for="template in templates" :key="template.id" :value="template.id">{{ template.name }}</option>
                </select>
              </label>
            </div>

            <div v-if="isBatch" class="mt-4 flex items-center gap-4">
              <span class="text-xs text-text-secondary">推导范围</span>
              <label class="flex items-center gap-1.5 text-xs text-text-secondary" :class="{ 'pointer-events-none opacity-50': !missingCount }">
                <input v-model="scope" type="radio" value="missing" class="h-3 w-3 accent-cyan-400" :disabled="!missingCount" />
                仅补缺失（{{ missingCount }}）
              </label>
              <label class="flex cursor-pointer items-center gap-1.5 text-xs text-text-secondary">
                <input v-model="scope" type="radio" value="all" class="h-3 w-3 accent-cyan-400" />
                全部重新推导（{{ totalCount }}）
              </label>
            </div>

            <p v-if="!templates.length" class="mt-3 rounded border border-border-subtle bg-app-bg px-3 py-2 text-xs text-text-muted">
              未找到「分镜画面描述」模板，将使用内置默认模板。可在系统设置中创建（类型选 panel-prompt）。
            </p>

            <div class="mt-4 flex flex-col gap-1.5">
              <div class="flex items-center justify-between">
                <span class="text-xs text-text-secondary">
                  {{ isBatch ? `首个目标分镜的提示词示例（批量时逐镜按模板重新拼装，此处仅预览）` : '最终发送的提示词（可在本次执行前修改）' }}
                </span>
                <button v-if="!isBatch" class="text-xs text-cyan-400 hover:text-cyan-300" title="恢复系统拼装的提示词" @click="prompt = builtPrompt">重置</button>
              </div>
              <textarea
                v-model="prompt"
                class="custom-scrollbar h-[300px] w-full resize-none rounded-md border border-border-subtle bg-app-bg p-3 font-mono text-xs leading-6 text-text-primary outline-none focus:border-cyan-500/50"
                :readonly="isBatch"
                aria-label="提示词预览"
              />
            </div>
          </div>

          <footer class="flex shrink-0 items-center justify-between border-t border-border-subtle px-5 py-3">
            <p class="text-xs text-text-muted">{{ prompt.length.toLocaleString() }} 个字符</p>
            <div class="flex items-center gap-3">
              <button class="secondary-button" :disabled="busy" @click="handleClose">取消</button>
              <button class="primary-button h-9 px-4 text-xs" :disabled="!canConfirm || busy" @click="handleConfirm">
                <LoaderCircle v-if="busy" :size="15" class="animate-spin" />
                开始推导
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
 * 分镜画面描述推导确认弹窗：单镜模式可编辑最终 prompt；批量模式选范围、预览首镜示例。
 */
import { computed, ref, watch } from 'vue'
import { LoaderCircle, X } from 'lucide-vue-next'
import type { ModelConfig, PromptTemplate } from '@comic/types'

const props = defineProps<{
  modelValue: boolean
  llmModels: ModelConfig[]
  /** panel-prompt 类型模板；为空时使用内置默认模板。 */
  templates: PromptTemplate[]
  defaultModelId?: string
  defaultTemplateId?: string
  /** batch：批量（选范围）；single：单镜（prompt 可编辑）。 */
  mode: 'batch' | 'single'
  panelOrder?: number
  missingCount?: number
  totalCount?: number
  busy: boolean
  /** 由父组件按模板内容与范围拼装的最终 prompt；templateContent 为空串表示内置默认模板。 */
  buildPrompt: (templateContent: string, scope?: 'missing' | 'all') => string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'confirm', payload: { modelId: string; templateId: string; scope?: 'missing' | 'all'; prompt?: string }): void
}>()

const modelId = ref('')
const templateId = ref('')
const prompt = ref('')
const scope = ref<'missing' | 'all'>('missing')

const isBatch = computed(() => props.mode === 'batch')
const isOverwrite = computed(() => isBatch.value && scope.value === 'all')
const effectiveCount = computed(() => {
  if (!isBatch.value) return 1
  return scope.value === 'missing' ? (props.missingCount ?? 0) : (props.totalCount ?? 0)
})
const builtPrompt = computed(() => {
  const template = props.templates.find((t) => t.id === templateId.value)
  return props.buildPrompt(template?.content ?? '', isBatch.value ? scope.value : undefined)
})
const canConfirm = computed(() => Boolean(modelId.value && prompt.value.trim() && effectiveCount.value > 0))

watch(() => props.modelValue, (visible) => {
  if (!visible) return
  if (!modelId.value) modelId.value = props.defaultModelId || props.llmModels[0]?.id || ''
  templateId.value = props.defaultTemplateId || ''
  if (isBatch.value) scope.value = (props.missingCount ?? 0) > 0 ? 'missing' : 'all'
  prompt.value = builtPrompt.value
})

watch(builtPrompt, (value) => { prompt.value = value })

function handleConfirm() {
  if (!canConfirm.value || props.busy) return
  emit('confirm', {
    modelId: modelId.value,
    templateId: templateId.value,
    scope: isBatch.value ? scope.value : undefined,
    prompt: isBatch.value ? undefined : prompt.value,
  })
}

function handleClose() {
  if (props.busy) return
  emit('update:modelValue', false)
}
</script>
