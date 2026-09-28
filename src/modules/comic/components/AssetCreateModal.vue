<template>
  <Teleport to="body">
    <Transition name="confirm">
      <div
        v-if="modelValue"
        class="fixed inset-0 z-[130] flex items-center justify-center bg-black/60 backdrop-blur-sm"
        @click.self="close"
      >
        <div class="confirm-card flex max-h-[85vh] w-[520px] max-w-[92vw] flex-col rounded-xl border border-border-subtle bg-surface p-5 shadow-2xl shadow-black/40">
          <div class="flex shrink-0 items-center justify-between">
            <h3 class="text-base font-semibold text-text-primary">新建资产</h3>
            <button class="rounded-md p-1 text-text-muted transition-colors hover:text-text-primary" @click="close"><X :size="16" /></button>
          </div>
          <p class="mt-1 shrink-0 text-xs leading-5 text-text-muted">
            手动建立一条资产并归属当前章节，用于补录提取时漏掉的对象。建立后会自动生成一个默认视觉状态，可在生图工作台继续生成提示词与参考图。
          </p>

          <div class="custom-scrollbar mt-4 flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto">
            <!-- 类型：三选一，与左列表分组一一对应 -->
            <div class="flex flex-col gap-1.5">
              <span class="text-xs text-text-secondary">类型</span>
              <div class="flex gap-1.5">
                <button
                  v-for="option in TYPE_OPTIONS"
                  :key="option.value"
                  class="flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs transition-colors"
                  :class="type === option.value
                    ? 'border-cyan-500 bg-cyan-500/10 text-cyan-300'
                    : 'border-border-subtle text-text-muted hover:border-border-strong hover:text-text-secondary'"
                  @click="type = option.value"
                >
                  <component :is="option.icon" :size="13" class="shrink-0" />
                  {{ option.label }}
                </button>
              </div>
            </div>

            <label class="flex flex-col gap-1.5">
              <span class="text-xs text-text-secondary">名称</span>
              <input
                v-model="name"
                class="h-9 w-full rounded-lg border border-border-subtle bg-app-bg px-3 text-sm text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-cyan-500/60"
                placeholder="资产名称，如 萧炎 / 萧家广场 / 测验魔石碑"
                maxlength="80"
                @keyup.enter="confirm"
              />
            </label>

            <label class="flex flex-col gap-1.5">
              <span class="text-xs text-text-secondary">描述</span>
              <textarea
                v-model="description"
                class="custom-scrollbar min-h-[180px] w-full flex-1 resize-y rounded-lg border border-border-subtle bg-app-bg px-3 py-2 text-sm leading-6 text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-cyan-500/60"
                placeholder="该资产的视觉描述（可直接粘贴外部 AI 生成的资产描述，会作为资产「描述」写入）。留空则后续在工作台里补写。"
              />
            </label>
          </div>

          <div class="mt-4 flex shrink-0 items-center justify-between border-t border-border-subtle pt-3">
            <p class="text-[11px] text-text-muted">
              {{ name.trim() ? `将新建「${name.trim()}」（${typeLabel}）到本章` : '请填写资产名称' }}
            </p>
            <div class="flex gap-2">
              <button class="rounded-lg border border-border-subtle px-4 py-2 text-sm text-text-secondary transition-colors hover:border-border-strong hover:text-text-primary" @click="close">取消</button>
              <button
                class="rounded-lg bg-cyan-500/90 px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                :disabled="!canSubmit"
                @click="confirm"
              >创建</button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
/**
 * 「新建资产」弹窗：名称 + 类型 + 描述，确认后由容器写库（建资产 + 默认视觉状态 + 章节引用）。
 * 弹窗自己不做任何持久化，只负责收集输入并回传。
 */
import { computed, ref, watch } from 'vue'
import { MapPin, Package, UserRound, X } from 'lucide-vue-next'
import type { LongProjectAssetType } from '@comic/types'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  /** 确认创建：容器据此建资产与默认视觉状态。 */
  (e: 'confirm', payload: { type: LongProjectAssetType; name: string; description: string }): void
}>()

const TYPE_OPTIONS: Array<{ value: LongProjectAssetType; label: string; icon: typeof UserRound }> = [
  { value: 'character', label: '人物', icon: UserRound },
  { value: 'scene', label: '场景', icon: MapPin },
  { value: 'prop', label: '道具', icon: Package },
]

const type = ref<LongProjectAssetType>('character')
const name = ref('')
const description = ref('')

const typeLabel = computed(() => TYPE_OPTIONS.find((option) => option.value === type.value)?.label ?? '')
const canSubmit = computed(() => name.value.trim().length > 0)

// 每次打开重置输入，避免上次的残留内容被误提交
watch(() => props.modelValue, (visible) => {
  if (!visible) return
  type.value = 'character'
  name.value = ''
  description.value = ''
})

function close() {
  emit('update:modelValue', false)
}

function confirm() {
  if (!canSubmit.value) return
  emit('confirm', { type: type.value, name: name.value.trim(), description: description.value.trim() })
  emit('update:modelValue', false)
}
</script>

<style scoped>
.confirm-enter-active,
.confirm-leave-active {
  transition: opacity 0.18s ease;
}
.confirm-enter-active .confirm-card,
.confirm-leave-active .confirm-card {
  transition: opacity 0.18s ease, transform 0.18s ease;
}
.confirm-enter-from,
.confirm-leave-to {
  opacity: 0;
}
.confirm-enter-from .confirm-card,
.confirm-leave-to .confirm-card {
  opacity: 0;
  transform: scale(0.96);
}
</style>
