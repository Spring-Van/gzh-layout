<template>
  <div class="flex h-full flex-col overflow-hidden">
    <!-- 内容区：圆角卡片输入框（与提示词模式一致，单一输入框呈现整页） -->
    <div class="flex min-h-0 flex-1 flex-col overflow-hidden p-3">
      <div class="relative min-h-0 flex-1 rounded-xl border border-border-subtle bg-surface p-4 shadow-sm shadow-black/10">
        <textarea
          v-if="panel"
          v-model="draftText"
          class="custom-scrollbar relative h-full w-full resize-none bg-transparent text-xs leading-relaxed text-text-primary caret-cyan-400 outline-none placeholder:text-text-muted focus:outline-none"
          placeholder="一页一块，一格一段，行序即页序：&#10;第1格&#10;景别：近景&#10;镜头：……&#10;画面：本格画面内容。&#10;人物：角色A&#10;动作：……&#10;表情：……&#10;台词：角色A：“本格台词”&#10;（本编辑框填写格内普通文本；整章模型返回时才使用 ## 分镜 N 页级标题；台词类字段有 台词 / 心声 / 画外 / 旁白，同一格只写一个）"
          @blur="commitDraft"
        />

        <!-- 空态 -->
        <div v-else class="flex h-full flex-col items-center justify-center text-center">
          <ListTree :size="26" class="text-text-muted" />
          <h3 class="mt-3 text-sm font-medium text-text-primary">{{ runStatus === 'running' ? '分镜生成中' : '本章尚未生成分镜' }}</h3>
          <p class="mt-2 max-w-sm text-xs leading-5 text-text-secondary">在顶部选择模型与模板执行「生成分镜」，按漫画剧本拆出一页页分镜（一页 = 一张漫画图，页内可 1~4 格），生成后在此逐页编辑。</p>
        </div>
      </div>
    </div>

    <!-- 底部本页操作：与「提示词」模式的「单镜操作」同款卡片，只保留 AI 优化；
         结构操作（新增页 / 上移 / 下移 / 合并 / 拆分 / 删除）统一收在左栏右键菜单 -->
    <div v-if="panel" class="shrink-0 border-t border-border-subtle p-3">
      <div class="rounded-xl border border-border-subtle bg-surface p-3 shadow-sm shadow-black/10">
        <div class="mb-2">
          <span class="text-[11px] font-medium text-text-secondary">本页操作</span>
        </div>
        <div class="flex items-center justify-between gap-2">
          <p class="min-w-0 truncate text-[10px] text-text-muted">分镜 {{ panel.order }} · {{ cellCount }} 格 · 修改自动保存</p>
          <!-- AI 优化本页：按分镜协议规整这一页（补镜头、拆台词、补说话人），不改剧情事实 -->
          <button
            class="flex items-center gap-1.5 rounded-lg border border-purple-500/30 px-3 py-1.5 text-[11px] text-purple-400 transition-colors hover:bg-purple-500/10 disabled:cursor-not-allowed disabled:opacity-40"
            :disabled="disabled"
            title="按分镜协议规整这一页（补镜头 / 拆超长台词 / 补说话人），不改动剧情与台词文字"
            @click="emit('optimize', draftText)"
          >
            <LoaderCircle v-if="optimizeBusy" :size="14" class="animate-spin" />
            <WandSparkles v-else :size="14" />
            AI 优化
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 生图工作台右栏「分镜内容」模式（分镜阶段）：
 * 主体为当前分镜的**单一文本编辑框**，内容即页块文本（`第X格` 标题 + `景别：内容` 等字段行）。
 *
 * **文本以原文为准（2026-09-22 改）**：编辑框显示与保存的都是 `panel.blockText`（用户写的原文），
 * 不再把解析结果按字段顺序重排回文本 —— 用户怎么改就怎么存。解析出的 `cells` 只作派生数据
 * （绑定、格数、台词）参与后续环节；文字本身不会被程序改写，唯一的例外是程序改绑定时
 * 会**定点重写「出场资产：」行**（见 `panelBlockText` / `patchBlockTextAssetLines`）。
 *
 * 2026-09-22 简化：文本框内的资产名着色高亮已移除（连同提示词框的点击看大图），
 * 编辑区回到「纯文本 + 正常字色」。
 *
 * 底部为**本页操作**（与「提示词」模式的「单镜操作」同款卡片），只保留 AI 优化
 * （按分镜协议规整这一页：补景别 / 拆超长台词 / 补说话人，不改剧情与台词文字）。
 * 结构操作（新增页、上移下移、合并、拆分、删除）已统一收进左栏分镜列表的右键菜单，不在此处。
 */
import { computed, ref, watch } from 'vue'
import { ListTree, LoaderCircle, WandSparkles } from 'lucide-vue-next'
import { panelBlockText, parsePanelBlock } from '@comic/services/storyboardService'
import type { LongProjectStoryboardCell, LongProjectStoryboardPanel } from '@comic/types'

/** 分镜编辑保存结果：原文 + 解析出的格列表（页级字段由父级汇总）。 */
export interface PanelEditPayload {
  panelId: string
  /** 编辑框里的原文（逐字保存，父级不再重排） */
  text: string
  cells: LongProjectStoryboardCell[]
}

const props = defineProps<{
  /** 当前选中的分镜（可能不存在：尚未生成分镜） */
  panel?: LongProjectStoryboardPanel
  /** 本章最近一次分镜 run 状态（仅用于空态提示） */
  runStatus?: 'running' | 'completed' | 'failed'
  /** 批量任务或分镜生成进行中：锁定本页操作 */
  opsLocked?: boolean
  /** AI 优化进行中（当前页） */
  optimizeBusy?: boolean
}>()

const emit = defineEmits<{
  (e: 'save-panel', payload: PanelEditPayload): void
  /** AI 优化本页：携带输入框当前文本（避免未失焦的编辑丢失） */
  (e: 'optimize', text: string): void
}>()

/** 本页格数（旧数据无 cells 时按单格计）。 */
const cellCount = computed(() => props.panel?.cells?.length ?? 1)

/** 批量任务 / AI 优化进行中统一禁用本页操作。 */
const disabled = computed(() => Boolean(props.opsLocked || props.optimizeBusy))

// ========== 页块文本草稿（切换分镜/失焦时提交保存） ==========

const draftText = ref('')
/** 草稿对应的分镜 ID（用于切换后回写旧分镜）。 */
const draftPanelId = ref('')
/** 加载草稿时的文本快照（比对是否发生变化，避免无效写入）。 */
let loadedSnapshot = ''

watch(() => props.panel, (panel) => {
  commitDraft()
  draftPanelId.value = panel?.id ?? ''
  loadedSnapshot = panel ? panelBlockText(panel) : ''
  draftText.value = loadedSnapshot
}, { immediate: true })

/** 提交当前草稿（失焦或切换分镜时触发，仅在有修改时反解析并 emit）。 */
function commitDraft() {
  const id = draftPanelId.value
  if (!id || draftText.value === loadedSnapshot) return
  loadedSnapshot = draftText.value
  emit('save-panel', { panelId: id, text: draftText.value, cells: parsePanelBlock(draftText.value) })
}
</script>
