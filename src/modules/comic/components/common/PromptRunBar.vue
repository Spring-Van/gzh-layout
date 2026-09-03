<template>
  <!-- 容器查询：宽度 ≥600px 平铺原始布局；不足时折叠为配置按钮 + 向上弹层 -->
  <div class="@container flex w-full items-center gap-2">
    <!-- 窄形态：配置按钮（模型 · 模板 摘要，点击向上弹出配置面板） -->
    <div class="relative min-w-0 flex @min-[600px]:hidden">
      <button
        class="secondary-button h-9 min-w-0 max-w-full gap-1.5 px-3 text-xs"
        :class="missingConfig ? 'text-amber-300' : ''"
        :title="missingConfig ? '请选择大模型与提示词模板' : `${modelName} · ${templateName}`"
        @click.stop="configOpen = !configOpen"
      >
        <SlidersHorizontal :size="14" class="shrink-0" :class="missingConfig ? 'text-amber-400' : 'text-cyan-400'" />
        <span class="truncate">{{ configSummary }}</span>
        <ChevronDown :size="13" class="shrink-0 text-text-muted transition-transform" :class="configOpen ? 'rotate-180' : ''" />
      </button>

      <!-- 点击外部关闭 -->
      <div v-if="configOpen" class="fixed inset-0 z-40" @click="configOpen = false" />
      <Transition name="fade">
        <div
          v-if="configOpen"
          class="absolute bottom-full left-0 z-50 mb-2 w-80 rounded-lg border border-border-subtle bg-surface p-3 shadow-xl shadow-black/25"
          @click.stop
        >
          <label class="block">
            <span class="mb-1 block text-[11px] text-text-muted">大模型</span>
            <select class="run-select w-full" :value="modelId" @change="emit('update:modelId', ($event.target as HTMLSelectElement).value)">
              <option value="" disabled>选择模型</option>
              <option v-for="model in models" :key="model.id" :value="model.id">{{ model.name }}</option>
            </select>
          </label>
          <label class="mt-2.5 block">
            <span class="mb-1 block text-[11px] text-text-muted">提示词模板</span>
            <select class="run-select w-full" :value="templateId" @change="emit('update:templateId', ($event.target as HTMLSelectElement).value)">
              <option value="" disabled>选择提示词模板</option>
              <option v-for="template in templates" :key="template.id" :value="template.id">{{ template.name }}</option>
            </select>
          </label>
          <label class="mt-3 flex cursor-pointer items-center gap-2 text-xs text-text-secondary" title="执行前查看并编辑最终发送给模型的提示词">
            <input v-model="confirmBeforeRun" type="checkbox" class="h-3.5 w-3.5 accent-cyan-400" @change="saveConfirmPreference" />
            发送前确认
          </label>
        </div>
      </Transition>
    </div>

    <!-- 宽形态：模型 / 模板 / 发送前确认 平铺一行（原始布局） -->
    <div class="hidden min-w-0 flex-1 items-center gap-3 @min-[600px]:flex">
      <label class="h-9 w-44 min-w-32 max-w-60 grow">
        <span class="sr-only">选择模型</span>
        <select class="run-select" :value="modelId" @change="emit('update:modelId', ($event.target as HTMLSelectElement).value)">
          <option value="" disabled>选择模型</option>
          <option v-for="model in models" :key="model.id" :value="model.id">{{ model.name }}</option>
        </select>
      </label>
      <label class="h-9 w-44 min-w-32 max-w-60 grow">
        <span class="sr-only">选择提示词模板</span>
        <select class="run-select" :value="templateId" @change="emit('update:templateId', ($event.target as HTMLSelectElement).value)">
          <option value="" disabled>选择提示词模板</option>
          <option v-for="template in templates" :key="template.id" :value="template.id">{{ template.name }}</option>
        </select>
      </label>
      <label class="flex h-9 shrink-0 cursor-pointer items-center gap-2 px-1 text-xs text-text-secondary" title="执行前查看并编辑最终发送给模型的提示词">
        <input v-model="confirmBeforeRun" type="checkbox" class="h-3.5 w-3.5 accent-cyan-400" @change="saveConfirmPreference" />
        发送前确认
      </label>
    </div>

    <button class="primary-button ml-auto shrink-0 px-4" :disabled="disabled || busy" @click="handleRun">
      <LoaderCircle v-if="busy" :size="15" class="animate-spin" />
      <ArrowRight v-if="!busy" :size="15" />
      {{ actionLabel }}
    </button>

    <!-- 发送前确认：可临时修改最终提示词 -->
    <PromptPreviewDialog :visible="previewVisible" :content="previewContent" @update:content="previewContent = $event" @confirm="handleConfirm" @close="previewVisible = false" />
  </div>
</template>

<script setup lang="ts">
/**
 * AI 任务执行底栏（容器查询自适应）：
 * 宽度 ≥600px：大模型 + 提示词模板 + 发送前确认 平铺一行（原始布局）；
 * 宽度不足：折叠为「⚙ 模型 · 模板」配置按钮，点击向上弹层选择。
 * 点击执行时通过 buildPrompt 回调生成最终提示词；勾选"发送前确认"则先弹窗可编辑，
 * 确认或未勾选都以最终提示词触发 run 事件。抽取自长篇项目主页面，供四个管线环节复用。
 */
import { computed, ref } from 'vue'
import { ArrowRight, ChevronDown, LoaderCircle, SlidersHorizontal } from 'lucide-vue-next'
import PromptPreviewDialog from '@comic/components/common/PromptPreviewDialog.vue'
import type { ModelConfig, PromptTemplate } from '@comic/types'

const props = defineProps<{
  models: ModelConfig[]
  templates: PromptTemplate[]
  /** 执行按钮文案，如"分析原文" / "生成剧本" */
  actionLabel: string
  disabled?: boolean
  busy?: boolean
  /** 发送前确认偏好按环节独立记忆的 localStorage key */
  confirmStorageKey: string
  /** 生成最终发送提示词（模板内容 + 各环节上下文拼装） */
  buildPrompt: () => string
  modelId: string
  templateId: string
}>()

const emit = defineEmits<{
  (e: 'update:modelId', value: string): void
  (e: 'update:templateId', value: string): void
  (e: 'run', prompt: string): void
}>()

const confirmBeforeRun = ref(localStorage.getItem(props.confirmStorageKey) !== 'false')
const previewVisible = ref(false)
const previewContent = ref('')
const configOpen = ref(false)

const modelName = computed(() => props.models.find((model) => model.id === props.modelId)?.name ?? '')
const templateName = computed(() => props.templates.find((template) => template.id === props.templateId)?.name ?? '')
const missingConfig = computed(() => !props.modelId || !props.templateId)
const configSummary = computed(() => {
  if (missingConfig.value) return '选择模型与模板'
  const parts = [modelName.value, templateName.value].filter(Boolean)
  return parts.join(' · ') || '选择模型与模板'
})

/** 持久化发送前确认偏好（按环节隔离） */
function saveConfirmPreference() { localStorage.setItem(props.confirmStorageKey, String(confirmBeforeRun.value)) }

/** 点击执行：生成最终提示词，按偏好决定是否先弹窗确认 */
function handleRun() {
  if (props.disabled || props.busy) return
  const prompt = props.buildPrompt()
  if (confirmBeforeRun.value) { previewContent.value = prompt; previewVisible.value = true; return }
  emit('run', prompt)
}

/** 弹窗确认后以（可能已修改的）最终提示词执行 */
function handleConfirm(content: string) { previewVisible.value = false; emit('run', content) }
</script>

<style scoped>
.run-select{width:100%;height:2.25rem;border:1px solid var(--border-subtle);border-radius:.375rem;background:var(--bg-app);padding:0 .625rem;color:var(--text-secondary);font-size:.75rem;outline:none}
.run-select:focus{border-color:rgba(34,211,238,.55);color:var(--text-primary)}
.primary-button{display:flex;height:2.25rem;align-items:center;justify-content:center;gap:.4rem;border-radius:.5rem;background:#06b6d4;font-size:.8125rem;font-weight:500;color:#020617;transition:background-color .15s ease}
.primary-button:hover{background:#22d3ee}
.primary-button:disabled{cursor:not-allowed;opacity:.4}
</style>
