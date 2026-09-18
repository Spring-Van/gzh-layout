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
                  ? (isChapter
                      ? `将本章 ${totalCount ?? 0} 个分镜一次性交给模型，按【分镜N】分段输出${isOverwrite ? '（覆盖已有描述）' : ''}`
                      : `将依次推导 ${effectiveCount} 个分镜（一次只生成一条，前后分镜自动关联）${isOverwrite ? '（覆盖已有描述）' : ''}`)
                  : '一次只生成本分镜的画面描述，自动携带前文分镜上下文。' }}
              </p>
            </div>
            <button class="icon-button" title="关闭" @click="handleClose"><X :size="18" /></button>
          </header>

          <div class="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-5">
            <!-- 生成方式：逐镜依次 / 整章一次（两者的模板与变量不同，选哪边就用哪边的模板列表） -->
            <div v-if="isBatch" class="mb-4 flex items-center gap-4">
              <span class="text-xs text-text-secondary">生成方式</span>
              <label class="flex cursor-pointer items-center gap-1.5 text-xs text-text-secondary">
                <input v-model="source" type="radio" value="per-panel" class="h-3 w-3 accent-cyan-400" />
                逐镜依次
              </label>
              <label class="flex cursor-pointer items-center gap-1.5 text-xs text-text-secondary">
                <input v-model="source" type="radio" value="chapter" class="h-3 w-3 accent-cyan-400" />
                整章一次
              </label>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <label class="flex flex-col gap-1.5 text-xs text-text-secondary">
                LLM 模型
                <select v-model="modelId" class="h-9 w-full rounded-md border border-border-subtle bg-app-bg px-2.5 text-xs text-text-primary outline-none focus:border-cyan-500/50">
                  <option value="" disabled>选择模型</option>
                  <option v-for="model in llmModels" :key="model.id" :value="model.id">{{ model.name }}</option>
                </select>
              </label>
              <label class="flex flex-col gap-1.5 text-xs text-text-secondary">
                画面描述模板（{{ isChapter ? 'panel-prompt-chapter' : 'panel-prompt' }}）
                <select v-model="templateId" class="h-9 w-full rounded-md border border-border-subtle bg-app-bg px-2.5 text-xs text-text-primary outline-none focus:border-cyan-500/50">
                  <option value="" disabled>选择模板</option>
                  <option v-for="template in activeTemplates" :key="template.id" :value="template.id">{{ template.name }}</option>
                </select>
              </label>
            </div>

            <!-- 本环节没有内置模板：模板必须由用户自己建，这里给一键新建（内容 = 该类型的推荐模板） -->
            <div v-if="!activeTemplates.length" class="mt-3 rounded border border-border-subtle bg-app-bg px-3 py-2.5 text-xs text-text-muted">
              <p class="leading-relaxed">
                还没有{{ isChapter ? '「分镜画面描述（整章一次生成）」' : '「分镜画面描述」' }}模板。
                画面描述的拼法完全由模板决定，请新建一个（会填入推荐底稿，可随时在系统设置里改）。
              </p>
              <div class="mt-2 flex items-center gap-3">
                <button
                  type="button"
                  class="text-cyan-400 hover:text-cyan-300 disabled:opacity-50"
                  :disabled="creating"
                  @click="handleCreateTemplate"
                >{{ creating ? '创建中…' : '新建模板（填入推荐内容）' }}</button>
                <span class="text-[11px]">也可在系统设置 → 提示词模板 中创建，类型选 {{ isChapter ? 'panel-prompt-chapter' : 'panel-prompt' }}</span>
              </div>
            </div>

            <div v-if="isBatch && !isChapter" class="mt-4 flex items-center gap-4">
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

            <div class="mt-4 flex flex-col gap-1.5">
              <div class="flex items-center justify-between">
                <span class="text-xs text-text-secondary">
                  {{ isBatch ? (isChapter ? '整章提示词（一次发送，按【分镜N】分段产出）' : '首个目标分镜的提示词示例（批量时逐镜按模板重新拼装，此处仅预览）') : '最终发送的提示词（可在本次执行前修改）' }}
                </span>
                <div class="flex items-center gap-3">
                  <button
                    v-if="prompt"
                    class="text-xs text-cyan-400 hover:text-cyan-300"
                    :title="copyTitle"
                    @click="copyPrompt"
                  >{{ copied ? '已复制 ✓' : copyTitle }}</button>
                  <button v-if="!isBatch && builtPrompt" class="text-xs text-cyan-400 hover:text-cyan-300" title="恢复系统拼装的提示词" @click="prompt = builtPrompt">重置</button>
                </div>
              </div>
              <textarea
                v-if="!isBatch || prompt"
                v-model="prompt"
                class="custom-scrollbar h-[300px] w-full resize-none rounded-md border border-border-subtle bg-app-bg p-3 font-mono text-xs leading-6 text-text-primary outline-none focus:border-cyan-500/50"
                :readonly="isBatch"
                aria-label="提示词预览"
              />
              <p v-else class="flex h-[300px] items-center justify-center rounded-md border border-dashed border-border-subtle bg-app-bg text-xs text-text-muted">
                选择模板后这里会显示将发送给模型的完整提示词
              </p>
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
  /** panel-prompt 类型模板（逐镜）。本环节没有内置模板，必须由用户自己建。 */
  templates: PromptTemplate[]
  /** panel-prompt-chapter 类型模板（整章一次生成）。 */
  chapterTemplates?: PromptTemplate[]
  defaultModelId?: string
  defaultTemplateId?: string
  /** batch：批量（选生成方式与范围）；single：单镜（prompt 可编辑）。 */
  mode: 'batch' | 'single'
  panelOrder?: number
  missingCount?: number
  totalCount?: number
  busy: boolean
  /** 由父组件按模板拼装的最终 prompt；template 为 null（未选模板）时返回空串。 */
  buildPrompt: (template: PromptTemplate | null, scope?: 'missing' | 'all') => string
  /** 整章一次生成模式的 prompt 拼装（template 为 null 时返回空串）。 */
  buildChapterPrompt?: (template: PromptTemplate | null) => string
  /** 复制到外部 AI 用的文本（批量逐镜模式会拼接全章 + 输出格式要求）；缺省则复制预览框内容。 */
  buildCopyText?: (template: PromptTemplate | null, source: PromptSource) => string
  /** 一键新建模板（内容 = 该类型推荐模板），返回新建的模板；缺省则不显示新建入口。 */
  createTemplate?: (type: 'panel-prompt' | 'panel-prompt-chapter') => Promise<PromptTemplate | null>
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'confirm', payload: { modelId: string; templateId: string; scope?: 'missing' | 'all'; prompt?: string; source?: PromptSource }): void
}>()

/** 生成方式：逐镜依次 / 整章一次（两者的模板类型与变量不同）。 */
export type PromptSource = 'per-panel' | 'chapter'

const modelId = ref('')
const templateId = ref('')
const prompt = ref('')
const scope = ref<'missing' | 'all'>('missing')
const source = ref<PromptSource>('per-panel')
const creating = ref(false)

const isBatch = computed(() => props.mode === 'batch')
const isChapter = computed(() => isBatch.value && source.value === 'chapter')
const isOverwrite = computed(() => isBatch.value && !isChapter.value && scope.value === 'all')
const effectiveCount = computed(() => {
  if (!isBatch.value) return 1
  if (isChapter.value) return props.totalCount ?? 0
  return scope.value === 'missing' ? (props.missingCount ?? 0) : (props.totalCount ?? 0)
})
/** 当前生成方式对应的模板列表。 */
const activeTemplates = computed(() => (isChapter.value ? (props.chapterTemplates ?? []) : props.templates))
const selectedTemplate = computed(() => activeTemplates.value.find((t) => t.id === templateId.value) ?? null)
const builtPrompt = computed(() => {
  if (!selectedTemplate.value) return ''
  if (isChapter.value) return props.buildChapterPrompt?.(selectedTemplate.value) ?? ''
  return props.buildPrompt(selectedTemplate.value, isBatch.value ? scope.value : undefined)
})
/** 模板必选：本环节没有内置模板，没选模板就不该能开始（单镜模式允许直接手写/粘贴 prompt）。 */
const canConfirm = computed(() => {
  if (!modelId.value || !prompt.value.trim() || effectiveCount.value <= 0) return false
  return isBatch.value ? Boolean(templateId.value) : true
})

watch(() => props.modelValue, (visible) => {
  if (!visible) return
  if (!modelId.value) modelId.value = props.defaultModelId || props.llmModels[0]?.id || ''
  // 模板记忆按类型隔离：只有记忆里的模板属于当前生成方式时才回填
  templateId.value = activeTemplates.value.some((t) => t.id === props.defaultTemplateId) ? (props.defaultTemplateId ?? '') : ''
  if (isBatch.value) {
    scope.value = (props.missingCount ?? 0) > 0 ? 'missing' : 'all'
    source.value = 'per-panel'
  }
  prompt.value = builtPrompt.value
})

// 生成方式 / 范围 / 模板任一变化 → 重新拼装预览
watch(builtPrompt, (value) => { prompt.value = value })

/** 一键新建模板：建好后直接选中（父组件会把新模板推回列表）。 */
async function handleCreateTemplate() {
  if (!props.createTemplate || creating.value) return
  creating.value = true
  try {
    const created = await props.createTemplate(isChapter.value ? 'panel-prompt-chapter' : 'panel-prompt')
    if (created) {
      templateId.value = created.id
      prompt.value = builtPrompt.value || prompt.value
    }
  } finally {
    creating.value = false
  }
}

function handleConfirm() {
  if (!canConfirm.value || props.busy) return
  emit('confirm', {
    modelId: modelId.value,
    templateId: templateId.value,
    scope: isBatch.value && !isChapter.value ? scope.value : undefined,
    prompt: isBatch.value ? undefined : prompt.value,
    source: isBatch.value ? source.value : 'per-panel',
  })
}

/** 复制按钮文案（按生成方式变化）。 */
const copyTitle = computed(() => {
  if (!isBatch.value) return '复制本镜提示词'
  return isChapter.value ? '复制整章提示词' : '复制全章提示词（逐镜拼接）'
})

const copied = ref(false)
let copiedTimer: ReturnType<typeof setTimeout> | null = null

/** 复制提示词到剪贴板：批量模式复制「可直接丢给外部 AI 的完整文本」，单镜模式复制预览框内容。 */
async function copyPrompt() {
  const template = selectedTemplate.value
  const text = (isBatch.value && props.buildCopyText && template
    ? props.buildCopyText(template, source.value)
    : prompt.value
  ).trim()
  if (!text) return
  try {
    await navigator.clipboard.writeText(text)
    copied.value = true
    if (copiedTimer) clearTimeout(copiedTimer)
    copiedTimer = setTimeout(() => { copied.value = false }, 1600)
  } catch {
    // 剪贴板不可用（无权限等）：不弹错，用户仍可手动选择文本复制
  }
}

function handleClose() {
  if (props.busy) return
  emit('update:modelValue', false)
}
</script>
