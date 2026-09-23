<template>
  <div class="flex h-full flex-col overflow-hidden">
    <div class="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-3">
      <!-- 底部：人物/场景/道具 tab 分组的缩略图墙，点击缩略图放大预览；抽屉由 tab 行右侧按钮打开 -->
      <div v-if="orderedEntries.length || pendingSlots.length || unmatchedEntries.length">
        <!-- Tab 切换：人物 / 场景 / 道具（与抽屉内 tab 同款样式）；右侧按钮打开参考图抽屉 -->
        <div class="mb-2.5 flex items-center gap-1 border-b border-border-subtle">
          <button
            v-for="tab in tabs"
            :key="tab.type"
            class="relative -mb-px border-b-2 px-3 py-1.5 text-xs font-medium transition-colors"
            :class="bottomTab === tab.type ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-text-secondary hover:text-text-primary'"
            @click="bottomTab = tab.type"
          >
            {{ tab.label }}
            <span class="ml-0.5 text-[10px]">({{ countOf(tab.type) }})</span>
          </button>
          <button
            class="ml-auto flex shrink-0 items-center gap-0.5 text-[11px] text-text-secondary transition-colors hover:text-cyan-400"
            title="打开参考图抽屉（切换视觉状态 / 参考图）"
            @click="openDrawer()"
          >更多<ChevronRight :size="13" /></button>
        </div>

        <!-- 缩略图墙：从左往右排列、自动换行；只显示缩略图，点击放大预览。
             同一「资产+状态」只出现一个缩略图（多次声明也只绑一张图）。 -->
        <div class="flex flex-wrap gap-2">
          <template v-for="entry in visibleBottomEntries" :key="entry.index">
            <button
              v-if="selectedImage(entry)"
              class="group relative block shrink-0 overflow-hidden rounded border border-border-subtle transition-colors hover:border-cyan-400"
              :title="`${entry.asset?.name ?? entry.binding.assetName} · ${currentVariantOf(entry)?.name ?? ''}（点击放大预览）`"
              @click="inspectEntry(entry)"
            >
              <img :src="selectedImage(entry)" class="h-16 w-16 object-cover" :alt="`${entry.binding.assetName}参考图`" />
              <span
                v-if="manifestIndexOf(entry) > 0"
                class="pointer-events-none absolute inset-x-0 bottom-0 bg-black/60 px-0.5 text-center text-[9px] leading-4 text-white"
              >图{{ manifestIndexOf(entry) }}</span>
            </button>
            <button
              v-else
              class="flex h-16 w-16 shrink-0 items-center justify-center rounded border border-dashed border-border-subtle text-[10px] text-text-muted transition-colors hover:border-cyan-400 hover:text-cyan-400"
              :title="`${entry.asset?.name ?? entry.binding.assetName}：无参考图（点击打开参考图抽屉）`"
              @click="openDrawer(bottomTab)"
            >无图</button>
          </template>

          <!-- 待绑定占位：出场资产有缺口时直接给空位，点一下按缺省状态绑定（幂等，连点不会重复添加） -->
          <button
            v-for="slot in tabPendingSlots"
            :key="slot.key"
            class="flex h-16 w-16 shrink-0 flex-col items-center justify-center gap-0.5 rounded border border-dashed border-cyan-400/50 text-cyan-400 transition-colors hover:border-cyan-400 hover:bg-cyan-400/5"
            :title="slot.title"
            @click="runSlot(slot)"
          >
            <Plus :size="14" />
            <span class="w-full truncate px-0.5 text-center text-[9px] leading-3">{{ slot.label }}</span>
          </button>

          <!-- 未匹配绑定（资产库中找不到）：每个 tab 都显示虚线占位，点击打开抽屉换绑（与缩略图同行排，放不下才换行） -->
          <button
            v-for="entry in unmatchedEntries"
            :key="`unmatched-${entry.index}`"
            class="flex h-16 w-16 shrink-0 flex-col items-center justify-center gap-0.5 rounded border border-dashed border-amber-400/60 text-amber-500 transition-colors hover:border-amber-400 hover:bg-amber-400/5"
            :title="`「${entry.binding.assetName}」不在资产库中，点击打开抽屉换绑`"
            @click="openDrawer(bottomTab, entry.index)"
          >
            <Plus :size="14" />
            <span class="w-full truncate px-0.5 text-center text-[9px] leading-3">{{ entry.binding.assetName }}</span>
          </button>
        </div>

        <p
          v-if="!visibleBottomEntries.length && !tabPendingSlots.length && !unmatchedEntries.length"
          class="rounded-lg border border-dashed border-border-subtle px-3 py-4 text-center text-xs text-text-muted"
        >本分镜未绑定{{ assetTypeLabel(bottomTab) }}资产</p>
      </div>
      <p v-else class="rounded-lg border border-dashed border-border-subtle px-3 py-4 text-center text-xs text-text-muted">本分镜未绑定资产</p>
    </div>

    <!-- 参考图抽屉（左侧滑出，样式对齐 ImageConfigDrawer）：按 人物/场景/道具 tab 组织，
         视觉状态与参考图切换都在抽屉内本地预选，点「保存」一次性写库（避免逐次写盘卡顿）。
         Teleport 到 body —— 中栏是固定高度 + overflow 容器，留在原地会被裁掉。 -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="drawerVisible" class="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm" @click="closeDrawer" />
      </Transition>
      <Transition name="slide-left">
        <div v-if="drawerVisible" class="fixed left-0 top-0 bottom-0 z-[101] w-[min(440px,94vw)] flex flex-col overflow-hidden p-4">
          <div class="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border-subtle bg-surface shadow-2xl shadow-black/40 dark:bg-slate-800">
            <!-- 头部 -->
            <div class="flex shrink-0 items-center justify-between border-b border-border-subtle px-5 py-3.5">
              <div class="flex items-center gap-2">
                <h2 class="text-sm font-semibold text-text-primary">本镜参考图 · 第 {{ panel.order }} 镜</h2>
              </div>
              <button
                class="flex h-7 w-7 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-elevated hover:text-text-primary"
                @click="closeDrawer"
              ><X :size="15" /></button>
            </div>

            <!-- Tab 切换：人物 / 场景 / 道具 -->
            <div class="flex shrink-0 items-center gap-1 border-b border-border-subtle px-5 pb-0 pt-3">
              <button
                v-for="tab in tabs"
                :key="tab.type"
                class="relative -mb-px border-b-2 px-3.5 py-2 text-xs font-medium transition-colors"
                :class="drawerTab === tab.type ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-text-secondary hover:text-text-primary'"
                @click="drawerTab = tab.type"
              >
                {{ tab.label }}
                <span class="ml-0.5 text-[10px]">({{ countOf(tab.type) }})</span>
              </button>
            </div>

            <!-- 内容区 -->
            <div class="custom-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
              <template v-if="drawerEntries.length">
                <div
                  v-for="entry in drawerEntries"
                  :key="entry.index"
                  class="space-y-2.5 rounded-xl border p-3"
                  :class="focusedEntryIndex === entry.index ? 'border-cyan-400 bg-cyan-400/5' : 'border-border-subtle bg-elevated'"
                >
                  <div class="flex items-center gap-1.5">
                    <AssetBindingTag class="min-w-0 justify-start" :binding="entry.binding" :assets="assets" @inspect="inspectEntry(entry)">
                      <template #trailing>
                        <span class="shrink-0 opacity-85">· {{ drawerVariantOf(entry)?.name || '默认' }}</span>
                      </template>
                    </AssetBindingTag>
                  </div>

                  <!-- 未匹配绑定（资产库中找不到）：在抽屉里换绑到真实资产，换绑后缩略图出现在对应类型下 -->
                  <div v-if="!entry.asset" class="flex items-center gap-1.5">
                    <select
                      class="min-w-0 flex-1 rounded border border-border-subtle bg-transparent px-1.5 py-1 text-[10px] text-text-primary outline-none"
                      value=""
                      @change="onRebindSelect(entry, $event)"
                    >
                      <option value="" disabled>「{{ entry.binding.assetName }}」不在资产库中，换绑到…</option>
                      <option v-for="candidate in assets" :key="candidate.id" :value="candidate.id">{{ candidate.name }}</option>
                    </select>
                    <button
                      class="shrink-0 rounded border border-red-500/30 px-2 py-1 text-[10px] text-red-600 transition-colors hover:bg-red-500/10 dark:text-red-400"
                      @click="emitRemoveEntry(entry)"
                    >移除</button>
                  </div>

                  <template v-else>
                    <!-- 使用位置：该状态在本镜的哪些格出现（格级声明解析）；页级整镜声明显示「整镜」 -->
                    <p v-if="variantUsageLabel(entry)" class="text-[10px] text-text-muted">使用位置：{{ variantUsageLabel(entry) }}</p>

                    <!-- 视觉状态切换：chip 本地预选 -->
                    <div v-if="(entry.asset?.variants.length ?? 0) > 1" class="flex flex-wrap gap-1.5">
                      <button
                        v-for="variant in entry.asset?.variants ?? []"
                        :key="variant.id"
                        class="drawer-chip"
                        :class="{ 'drawer-chip--active': variant.id === drawerVariantOf(entry)?.id }"
                        :title="variantTip(variant)"
                        @click="pickDrawerVariant(entry, variant)"
                      >{{ variant.name }}</button>
                    </div>

                    <!-- 多状态管理：同一资产在本镜可同时持有多个视觉状态（各出各的参考图） -->
                    <div v-if="canAddState(entry) || canRemoveState(entry)" class="flex items-center gap-1.5">
                      <button
                        v-if="canAddState(entry)"
                        class="drawer-chip"
                        title="同一镜可以同时使用该资产的多个视觉状态，各出各的参考图"
                        @click="addState(entry)"
                      >+ 添加状态</button>
                      <button
                        v-if="canRemoveState(entry)"
                        class="drawer-chip"
                        title="移除这一条状态绑定（随时可以再加回）"
                        @click="removeState(entry)"
                      >移除此状态</button>
                    </div>

                    <!-- 参考图切换：本地预选，选第一张 = 恢复默认 -->
                    <div v-if="drawerImages(entry).length" class="flex flex-wrap gap-2">
                      <button v-for="image in drawerImages(entry)" :key="image" class="relative" @click="pickDrawerImage(entry, image)">
                        <img
                          :src="image"
                          class="h-16 w-16 rounded border object-cover"
                          :class="drawerSelected(entry) === image ? 'border-cyan-400' : 'border-border-subtle opacity-60 hover:opacity-90'"
                          :alt="`${entry.binding.assetName}候选图`"
                        />
                        <span
                          v-if="drawerSelected(entry) === image"
                          class="pointer-events-none absolute -left-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-cyan-400 text-slate-900"
                        ><Check :size="10" /></span>
                        <span
                          v-if="drawerSelected(entry) === image && manifestIndexOf(entry) > 0"
                          class="pointer-events-none absolute inset-x-0 bottom-0 rounded-b bg-black/60 px-0.5 text-center text-[9px] leading-4 text-white"
                        >图{{ manifestIndexOf(entry) }}</span>
                      </button>
                      <p class="w-full text-[10px] leading-4 text-text-muted">选第一张 = 恢复默认（资产换图后自动跟随）</p>
                    </div>
                    <p v-else class="text-[10px] text-text-muted">该视觉状态暂无生成图（去资产工作台生成；上传的参考图不进分镜）</p>
                  </template>
                </div>
              </template>
              <p v-else class="rounded-lg border border-dashed border-border-subtle px-3 py-8 text-center text-xs text-text-muted">
                本分镜未绑定{{ assetTypeLabel(drawerTab) }}资产
              </p>
            </div>

            <!-- 底部操作 -->
            <div class="flex shrink-0 items-center justify-end gap-3 border-t border-border-subtle px-5 py-3.5">
              <button
                class="rounded-lg px-4 py-2 text-xs text-text-secondary transition-colors hover:bg-elevated hover:text-text-primary"
                @click="closeDrawer"
              >取消</button>
              <button
                class="rounded-lg bg-cyan-500 px-5 py-2 text-xs font-medium text-white shadow-lg shadow-cyan-500/20 transition-opacity hover:opacity-90"
                @click="saveDrawer"
              >保存</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
/**
 * 分镜生图工作台中栏底部：按 人物 / 场景 / 道具 **三个 tab** 分组展示当前分镜的资产绑定与参考图缩略图。
 *
 * **底部只显示缩略图墙**：每个 tab 下候选图从左往右排列、自动换行（无图显示「无图」占位，悬浮提示资产名）；
 * 点击缩略图放大预览；tab 行右侧「参考图抽屉」按钮打开左侧抽屉
 * （样式对齐 ImageConfigDrawer：遮罩 z-[100] + 面板 z-[101] + 人物/场景/道具 tab + 底部保存）：
 * - **切视觉状态**：chip 本地预选；**切参考图**：缩略图本地预选（选第一张 = 恢复默认）；
 * - 点「保存」一次性写库（set-binding-variant + set-binding-images）—— 逐次点击立即写盘是之前切换卡顿的根因；
 * - 点「取消」/ 遮罩 / Esc 关闭，丢弃未保存的预选。
 *
 * 有效参考图口径走 `effectiveVariantRefImages`：只取生成图（generatedImageIds）。
 * 用户上传的参考图只发给该视觉状态自己的生图，不进分镜。
 *
 * 「图N」来自生图清单（`buildPanelRefManifest`，全项目唯一图号来源）：编号覆盖前置共用属性图 +
 * 各资产参考图的最终生图顺序，与生图 / 右栏分组 / 画面描述提示词同一口径。
 *
 * ⚠️ 取图口径必须与生图时（`LongProjectStoryboardTab.currentRefGroups`）、工作台引用角标
 * （`assetUsageService`）三处一致，统一走 `resolvePanelRefImage`，否则会「标了在用其实没用」。
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Check, ChevronRight, Plus, X } from 'lucide-vue-next'
import type { LongProjectAsset, LongProjectAssetType, LongProjectAssetVariant, LongProjectStoryboardAssetBinding, LongProjectStoryboardPanel } from '@comic/types'
import { effectiveVariantRefImages, resolvePanelBindings, resolvePanelRefImage, type RuntimeRefManifest } from '@comic/services/panelPromptService'
import { bindingIdentityKey, type PanelBindingFix } from '@comic/services/promptAssetService'
import { defaultVariant } from '@comic/services/storyboardService'
import { ASSET_TYPE_ORDER, assetTypeLabel } from '@comic/utils/assetTypeTheme'
import AssetBindingTag from '@comic/components/AssetBindingTag.vue'

type BindingEntry = { index: number; binding: LongProjectStoryboardAssetBinding; asset?: LongProjectAsset }

const props = defineProps<{
  panel: LongProjectStoryboardPanel
  /** 本章可用资产（含全部视觉状态）。 */
  assets: LongProjectAsset[]
  /** 当前章节 ID（待核对项的缺省状态按章节范围推导用）。 */
  chapterId?: string
  /** 章节顺序表（章节 ID → 序号），用于视觉状态的章节范围悬浮提示。 */
  chapterOrders?: Record<string, number>
  /** 当前分镜的生图参考图清单（唯一图号来源 buildPanelRefManifest），「图N」角标由此对齐。 */
  /**
   * 本镜生图参考图清单：父级已按当前选中提示词条的开关裁剪并重编图号，
   * 所以这里读到的 `index` 就是这次实际发送的「图N」（`images[i]` = 图 i+1）。
   * 用最小结构而非完整 PanelRefManifest：本组件只读 entries 的 index/source/variantId。
   */
  refManifest?: RuntimeRefManifest
  /** 本镜绑定待核对项（父组件用审计算出，含画面描述参与判断）。 */
  bindingFixes?: PanelBindingFix[]
}>()

const emit = defineEmits<{
  /** 设定某条绑定（资产+状态）的本镜参考图（单选；空数组 = 恢复"未选"，即取第一张）。 */
  (e: 'set-binding-images', payload: { panelId: string; assetId: string; variantId?: string; imageIds: string[] }): void
  /** 查看资产图大图：`removable: false` —— 中栏只是查看，图由资产页维护（不提供删除）。 */
  (e: 'preview', payload: { images: string[]; index: number; removable: false }): void
  /** 手动切换某条绑定的视觉状态（fromVariantId 定位要改的那条；多状态下同一资产可有多条绑定）。 */
  (e: 'set-binding-variant', payload: { panelId: string; assetId: string; variantId: string; fromVariantId?: string }): void
  /** 处理一条绑定待核对项 / 增删状态：补绑 / 选状态 / 状态落定 / 换绑 / 移除（父组件统一写库并重算延续链）。 */
  (e: 'fix-binding', payload: {
    panelId: string
    action: 'add' | 'set-variant' | 'resolve' | 'rebind' | 'remove'
    assetId?: string
    variantId?: string
    fromVariantId?: string
    bindingIndex?: number
  }): void
}>()

const tabs = ASSET_TYPE_ORDER.map((type) => ({ type, label: assetTypeLabel(type) }))

/** 全部绑定（带原始下标）+ 资产分类信息。同一「资产+状态」只保留首个 —— 重复声明只算一次、只绑一张图。 */
const entries = computed<BindingEntry[]>(() => {
  const seen = new Set<string>()
  const result: BindingEntry[] = []
  props.panel.assetBindings.forEach((binding, index) => {
    const key = bindingIdentityKey(binding)
    if (seen.has(key)) return
    seen.add(key)
    result.push({ index, binding, asset: props.assets.find((item) => item.id === binding.assetId) })
  })
  return result
})

/** tab 计数 = 该类型下的绑定条数（同资产多状态各算一条，P09 魔石碑两条状态 → 计 2）。 */
function countOf(type: LongProjectAssetType): number {
  return entries.value.filter((entry) => entry.asset?.type === type).length
}

/* ===== 待绑定占位：绑定有缺口时在缩略图墙里给空位，点一下即完成绑定 ===== */

/** 待核对项（父组件未传时为空，模板无需判空）。 */
const fixes = computed<PanelBindingFix[]>(() => props.bindingFixes ?? [])

/** 待核对项的资产：从 assets 实时取（核对期间资产可能被改名 / 改状态）。 */
function fixAssetOf(fix: PanelBindingFix): LongProjectAsset | undefined {
  const id = fix.asset?.id
  return id ? props.assets.find((item) => item.id === id) : undefined
}

/** 候选资产的缺省视觉状态：按章节范围推导，推不出用第一个状态。 */
function fixDefaultVariantId(asset: LongProjectAsset): string | undefined {
  return defaultVariant(asset, props.chapterId ?? '', props.chapterOrders ?? {})?.id ?? asset.variants[0]?.id
}

/** 可一键绑定的占位（缺省状态兜底；歧义名每个候选各一个占位）。 */
interface PendingSlot {
  key: string
  type: LongProjectAssetType
  label: string
  title: string
  fix: PanelBindingFix
  candidate?: LongProjectAsset
}

const pendingSlots = computed<PendingSlot[]>(() => {
  const slots: PendingSlot[] = []
  for (const fix of fixes.value) {
    if (fix.reason === 'missing-binding' || fix.reason === 'missing-variant') {
      const asset = fixAssetOf(fix)
      if (!asset) continue
      slots.push({
        key: fix.id,
        type: asset.type,
        label: asset.name,
        title: fix.reason === 'missing-variant'
          ? `${asset.name}：视觉状态未定，点击按缺省状态完成绑定`
          : `${asset.name}：点击绑定（按章节范围取缺省状态）`,
        fix,
      })
      continue
    }
    if (fix.reason === 'ambiguous-name') {
      for (const candidate of fix.candidates ?? []) {
        slots.push({
          key: `${fix.id}:${candidate.id}`,
          type: candidate.type,
          label: candidate.name,
          title: `「${fix.label}」有同名资产，点击绑定为「${candidate.name}」`,
          fix,
          candidate,
        })
      }
    }
  }
  return slots
})

/** 当前 tab 下的待绑定占位。 */
const tabPendingSlots = computed(() => pendingSlots.value.filter((slot) => slot.type === bottomTab.value))

/** 未匹配绑定（资产库中找不到，asset 解析不出来）：在每个 tab 都以虚线占位呈现，点击打开抽屉换绑。 */
const unmatchedEntries = computed<BindingEntry[]>(() => entries.value.filter((entry) => !entry.asset))

/** 点击占位：按缺省状态一次性绑定成功；重复点击由父级「已存在即跳过」兜底，不会重复添加。 */
function runSlot(slot: PendingSlot) {
  const asset = slot.candidate ?? fixAssetOf(slot.fix)
  if (!asset) return
  // 状态未定 → resolve：页级 + 格级的无状态绑定一并落定（只修页级时格级会让占位框永远点不掉）
  const isResolve = slot.fix.reason === 'missing-variant'
  emit('fix-binding', {
    panelId: props.panel.id,
    action: isResolve ? 'resolve' : 'add',
    assetId: asset.id,
    variantId: fixDefaultVariantId(asset),
  })
}

/** 移除一条绑定（按页级下标；用于未匹配绑定的「移除」）。 */
function emitRemoveEntry(entry: BindingEntry) {
  emit('fix-binding', { panelId: props.panel.id, action: 'remove', bindingIndex: entry.index })
}

/** 换绑：把未匹配绑定指向选定的真实资产（状态按章节范围取缺省；格级同名声明随之修正）。 */
function onRebindSelect(entry: BindingEntry, event: Event) {
  const select = event.target as HTMLSelectElement
  const assetId = select.value
  select.value = ''
  if (!assetId) return
  const asset = props.assets.find((item) => item.id === assetId)
  emit('fix-binding', {
    panelId: props.panel.id,
    action: 'rebind',
    assetId,
    variantId: asset ? fixDefaultVariantId(asset) : undefined,
    bindingIndex: entry.index,
  })
}

/** 底部卡片排序：人物 → 场景 → 道具（与生图清单的资产顺序一致）。 */
const orderedEntries = computed<BindingEntry[]>(() =>
  ASSET_TYPE_ORDER.flatMap((type) => entries.value.filter((entry) => entry.asset?.type === type)),
)

/* ===== 底部 tab：人物 / 场景 / 道具 ===== */

const bottomTab = ref<LongProjectAssetType>('character')

/** 当前 tab 下的底部卡片。 */
const bottomEntries = computed<BindingEntry[]>(() =>
  orderedEntries.value.filter((entry) => entry.asset?.type === bottomTab.value),
)

/**
 * 缩略图墙实际渲染的卡片：
 * - 有「状态未定」待绑占位的绑定不重复渲染（占位框就是它的代表，绑定后缩略图顶上来）；
 * - 同一「资产+状态」只渲染一个（多次声明也只绑一张图）。
 */
const visibleBottomEntries = computed<BindingEntry[]>(() => {
  const hidden = new Set(
    fixes.value
      .filter((fix) => fix.reason === 'missing-variant' && fix.bindingIndex !== undefined)
      .map((fix) => fix.bindingIndex as number),
  )
  const seen = new Set<string>()
  return bottomEntries.value.filter((entry) => {
    if (hidden.has(entry.index)) return false
    const key = bindingIdentityKey(entry.binding)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
})

/** 切换分镜时：底部 tab 自动定位到第一个有绑定 / 待绑定占位的分类。 */
watch(
  () => props.panel.id,
  () => {
    bottomTab.value = ASSET_TYPE_ORDER.find((type) =>
      countOf(type) > 0 || pendingSlots.value.some((slot) => slot.type === type)) ?? 'character'
  },
  { immediate: true },
)

/** 页级绑定解析结果（绑定快照 → 当前资产/状态），本次渲染内复用，避免每个 helper 各算一遍。 */
const resolvedBindings = computed(() => resolvePanelBindings(props.panel, props.assets))

/** 绑定解析到的资产 + 当前生效状态（未命中资产时为 undefined）。按绑定对象引用匹配 —— 多状态下同一资产有多条绑定。 */
function resolvedOf(entry: BindingEntry) {
  return resolvedBindings.value.find((item) => item.binding === entry.binding)
}

/** 本镜实际使用的参考图：以 visualVersionId 实时查 variant（绑定快照仅作兜底）。 */
function selectedImage(entry: BindingEntry): string | undefined {
  const resolved = resolvedOf(entry)
  if (!resolved) return entry.binding.referenceImageIds?.[0]
  return resolvePanelRefImage(resolved.variant, resolved.binding)
}

/** 选中图在候选里的下标（点击资产 tag 预览时的定位）。 */
function selectedIndex(entry: BindingEntry): number {
  const images = effectiveImagesOf(entry)
  const index = images.indexOf(selectedImage(entry) ?? '')
  return index < 0 ? 0 : index
}

/** 该绑定实际生效（已落库）视觉状态的参考图列表（只含生成图）。 */
function effectiveImagesOf(entry: BindingEntry): string[] {
  const resolved = resolvedOf(entry)
  if (resolved) return effectiveVariantRefImages(resolved.variant)
  return entry.binding.referenceImageIds ?? []
}

/** 该绑定生效参考图在生图清单中的图号（1 起；该状态无图 / 不在清单时为 0）。 */
function manifestIndexOf(entry: BindingEntry): number {
  const variantId = currentVariantOf(entry)?.id
  if (!variantId) return 0
  return props.refManifest?.entries.find((item) => item.source === 'asset' && item.variantId === variantId)?.index ?? 0
}

/** 该绑定实际生效的视觉状态（绑定快照仅作兜底）。 */
function currentVariantOf(entry: BindingEntry): LongProjectAssetVariant | undefined {
  const resolved = resolvedOf(entry)
  return resolved?.variant ?? entry.asset?.variants.find((item) => item.id === entry.binding.visualVersionId)
}

/**
 * 该状态在本镜的**使用位置**（格级「出场资产」声明解析）：`用于第1、3格`。
 * 资产在格级有声明但本状态不在其中 → `整镜`（页级声明的语义）；资产完全无格级声明 → 不显示（避免噪音）。
 */
function variantUsageLabel(entry: BindingEntry): string {
  const asset = entry.asset
  const variant = currentVariantOf(entry)
  if (!asset || !variant) return ''
  const cellIndexes: number[] = []
  let hasCellDeclaration = false
  props.panel.cells?.forEach((cell, cellIndex) => {
    const bindings = cell.assetBindings ?? []
    if (!bindings.some((item) => entry.binding.assetId && item.assetId === entry.binding.assetId)) return
    hasCellDeclaration = true
    // 格级状态的解析口径与 resolveCellBindings 一致：id 优先 → 状态名 → 无状态回落第一个
    const hit = bindings.some((item) => {
      const resolved = asset.variants.find((v) => v.id === item.visualVersionId)
        ?? (!item.visualVersionId ? asset.variants.find((v) => v.name === item.visualVersionName) ?? asset.variants[0] : undefined)
      return resolved?.id === variant.id
    })
    if (hit) cellIndexes.push(cellIndex)
  })
  if (cellIndexes.length) return `用于第${cellIndexes.map((index) => index + 1).join('、')}格`
  return hasCellDeclaration ? '整镜' : ''
}

/** 状态的章节范围提示文案（无章节顺序表或无范围时返回 undefined）。 */
function chapterRangeLabel(variant: LongProjectAssetVariant): string | undefined {
  if (!props.chapterOrders || !variant.chapterRange) return undefined
  const start = props.chapterOrders[variant.chapterRange.startChapterId]
  if (start === undefined) return undefined
  const end = variant.chapterRange.endChapterId ? props.chapterOrders[variant.chapterRange.endChapterId] : undefined
  if (end === undefined) return `第 ${start} 章起`
  return end === start ? `第 ${start} 章` : `第 ${start}-${end} 章`
}

/** 状态提示：剧情锚点（或视觉描述）+ 章节范围。 */
function variantTip(variant: LongProjectAssetVariant): string {
  return [variant.anchor || variant.description || '', chapterRangeLabel(variant)].filter(Boolean).join(' · ')
}

/** 点击资产 tag：放大查看该视觉状态参考图（只查看，不提供删除）。 */
function inspectEntry(entry: BindingEntry) {
  const images = effectiveImagesOf(entry)
  if (images.length) emit('preview', { images, index: selectedIndex(entry), removable: false })
}

/* ===== 参考图抽屉：本地预选 + 保存一次性写库 ===== */

const drawerVisible = ref(false)
const drawerTab = ref<LongProjectAssetType>('character')
/** 抽屉内高亮的绑定下标（从缩略图墙的未匹配占位点进来时定位用）。 */
const focusedEntryIndex = ref<number | null>(null)
/** 预选的视觉状态（绑定下标 → variantId）。 */
const pendingVariants = ref<Record<string, string>>({})
/** 预选的参考图（绑定下标 → 图片地址；'' = 恢复默认第一张）。 */
const pendingImages = ref<Record<string, string>>({})

watch(() => props.panel.id, () => closeDrawer())

/** 打开抽屉：可指定定位到的分类 tab（缺省用底部当前 tab）与高亮的绑定。 */
function openDrawer(type?: LongProjectAssetType, focusIndex?: number) {
  drawerTab.value = type ?? bottomTab.value
  focusedEntryIndex.value = focusIndex ?? null
  pendingVariants.value = {}
  pendingImages.value = {}
  drawerVisible.value = true
}

function closeDrawer() {
  drawerVisible.value = false
  focusedEntryIndex.value = null
  pendingVariants.value = {}
  pendingImages.value = {}
}

/** 抽屉条目：当前 tab 的绑定 + 未匹配绑定（无类型，每个 tab 都显示，就地换绑）。 */
const drawerEntries = computed<BindingEntry[]>(() =>
  entries.value.filter((entry) => !entry.asset || entry.asset.type === drawerTab.value),
)

/** 预选键 = 绑定在页级列表里的下标：多状态下同一资产有多条绑定，按 assetId 存会互相覆盖。 */
function pendingKey(entry: BindingEntry): string {
  return String(entry.index)
}

/** 抽屉内该绑定展示的视觉状态：预选优先，未预选用当前生效状态。 */
function drawerVariantOf(entry: BindingEntry): LongProjectAssetVariant | undefined {
  const pendingId = pendingVariants.value[pendingKey(entry)]
  if (pendingId) return entry.asset?.variants.find((variant) => variant.id === pendingId)
  return currentVariantOf(entry)
}

/** 抽屉内候选图：跟随预选状态的生成图（上传参考图不进分镜）。 */
function drawerImages(entry: BindingEntry): string[] {
  const variant = drawerVariantOf(entry)
  return variant ? effectiveVariantRefImages(variant) : []
}

/** 抽屉内当前选中图：预选优先；未预选且换过状态 → 新状态第一张；否则跟随已落库选择。 */
function drawerSelected(entry: BindingEntry): string | undefined {
  const images = drawerImages(entry)
  if (!images.length) return undefined
  const key = pendingKey(entry)
  const pending = pendingImages.value[key]
  if (pending !== undefined) return images.includes(pending) ? pending : images[0]
  if (pendingVariants.value[key]) return images[0]
  const applied = selectedImage(entry)
  return applied && images.includes(applied) ? applied : images[0]
}

/** 预选视觉状态：清掉该条绑定的图片预选（新状态的候选图不同）。 */
function pickDrawerVariant(entry: BindingEntry, variant: LongProjectAssetVariant) {
  if (!entry.asset || drawerVariantOf(entry)?.id === variant.id) return
  const key = pendingKey(entry)
  pendingVariants.value = { ...pendingVariants.value, [key]: variant.id }
  const next = { ...pendingImages.value }
  delete next[key]
  pendingImages.value = next
}

/** 预选参考图：'' = 恢复默认（保存时写空数组）。 */
function pickDrawerImage(entry: BindingEntry, image: string) {
  pendingImages.value = { ...pendingImages.value, [pendingKey(entry)]: image }
}

/** 同一资产在本镜已绑定的状态 id 集合（多状态：判断还能加哪些状态）。 */
function boundVariantIdsOf(asset: LongProjectAsset): Set<string> {
  return new Set(
    entries.value
      .filter((entry) => entry.asset?.id === asset.id)
      .map((entry) => currentVariantOf(entry)?.id)
      .filter(Boolean) as string[],
  )
}

/** 该资产还有未绑定的状态 → 抽屉里显示「+ 添加状态」。 */
function canAddState(entry: BindingEntry): boolean {
  if (!entry.asset || entry.asset.variants.length < 2) return false
  return entry.asset.variants.some((variant) => !boundVariantIdsOf(entry.asset!).has(variant.id))
}

/** 该资产在本镜有多条绑定 → 允许移除其中一条（移除后可随时再加回）。 */
function canRemoveState(entry: BindingEntry): boolean {
  if (!entry.asset || entry.asset.variants.length < 2) return false
  return entries.value.filter((item) => item.asset?.id === entry.asset?.id).length > 1
}

/** 新增一条状态绑定：取该资产第一个尚未绑定的状态。 */
function addState(entry: BindingEntry) {
  const asset = entry.asset
  if (!asset) return
  const bound = boundVariantIdsOf(asset)
  const variant = asset.variants.find((item) => !bound.has(item.id))
  if (!variant) return
  emit('fix-binding', { panelId: props.panel.id, action: 'add', assetId: asset.id, variantId: variant.id })
}

/** 移除这一条状态绑定（按「资产+状态」定位）。 */
function removeState(entry: BindingEntry) {
  if (!entry.asset) return
  emit('fix-binding', {
    panelId: props.panel.id,
    action: 'remove',
    assetId: entry.asset.id,
    fromVariantId: currentVariantOf(entry)?.id ?? '',
  })
}

/** 保存：一次性把全部预选写库（先状态后图片），随后关闭抽屉。 */
function saveDrawer() {
  const panelId = props.panel.id
  for (const entry of entries.value) {
    if (!entry.asset) continue
    const key = pendingKey(entry)
    const pendingVariant = pendingVariants.value[key]
    if (pendingVariant && currentVariantOf(entry)?.id !== pendingVariant) {
      emit('set-binding-variant', { panelId, assetId: entry.asset.id, variantId: pendingVariant, fromVariantId: currentVariantOf(entry)?.id })
    }
    const pendingImage = pendingImages.value[key]
    if (pendingImage !== undefined) {
      emit('set-binding-images', {
        panelId,
        assetId: entry.asset.id,
        variantId: drawerVariantOf(entry)?.id,
        imageIds: pendingImage === '' ? [] : [pendingImage],
      })
    }
  }
  closeDrawer()
}

function onDrawerKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && drawerVisible.value) closeDrawer()
}

onMounted(() => window.addEventListener('keydown', onDrawerKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onDrawerKeydown))
</script>

<style scoped>
/* 抽屉内视觉状态 chip */
.drawer-chip {
  padding: 2px 8px;
  border: 1px solid var(--border-subtle);
  border-radius: 3px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 10px;
  line-height: 1.6;
  cursor: pointer;
  transition: background-color 0.12s ease, border-color 0.12s ease, color 0.12s ease;
}
.drawer-chip:hover {
  border-color: color-mix(in srgb, var(--accent) 40%, transparent);
  color: var(--text-primary);
}
.drawer-chip--active {
  border-color: var(--accent, #22d3ee);
  background: color-mix(in srgb, var(--accent, #22d3ee) 12%, transparent);
  color: var(--accent, #22d3ee);
}

/* 抽屉过渡：左侧滑入 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
.slide-left-enter-active,
.slide-left-leave-active {
  transition: transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}
.slide-left-enter-from,
.slide-left-leave-to {
  transform: translateX(-100%);
}
</style>
