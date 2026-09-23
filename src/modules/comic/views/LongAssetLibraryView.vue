<template>
  <div class="flex h-full min-h-0 flex-col bg-app-bg">
    <!-- 筛选区：类别 / 项目 / 章节 + 搜索（影视筛选式漏斗） -->
    <div class="shrink-0 space-y-2 border-b border-border-subtle bg-surface px-5 py-3">
      <!-- 行1 类别 + 搜索 -->
      <div class="flex items-center gap-1.5">
        <span class="w-9 shrink-0 text-[11px] text-text-muted">类别</span>
        <button v-for="item in categoryChips" :key="item.key ?? 'all'" :class="chipClass(category === item.key)" @click="selectCategory(item.key)">
          {{ item.label }}<span class="ml-1 text-[10px] opacity-70">{{ item.count }}</span>
        </button>
        <div class="relative ml-auto">
          <Search :size="13" class="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            v-model="keyword"
            type="text"
            placeholder="搜索资产名 / 别名"
            class="h-7 w-44 rounded border border-border-subtle bg-input-bg pl-7 pr-2 text-xs text-text-primary placeholder-text-muted outline-none focus:border-cyan-500/50"
          />
        </div>
      </div>
      <!-- 行2 项目 -->
      <div class="flex items-center gap-1.5">
        <span class="w-9 shrink-0 text-[11px] text-text-muted">项目</span>
        <button :class="chipClass(selectedProjectId === null)" @click="selectProject(null)">全部<span class="ml-1 text-[10px] opacity-70">{{ index.entries.length }}</span></button>
        <button
          v-for="option in index.projects"
          :key="option.projectId"
          :class="chipClass(selectedProjectId === option.projectId)"
          @click="selectProject(option.projectId)"
        >
          {{ option.projectName }}<span class="ml-1 text-[10px] opacity-70">{{ projectCounts.get(option.projectId) ?? 0 }}</span>
        </button>
      </div>
      <!-- 行3 章节：跨项目无章节归属，只在选中单个项目时可选 -->
      <div class="flex items-center gap-1.5">
        <span class="w-9 shrink-0 text-[11px] text-text-muted">章节</span>
        <template v-if="selectedProjectId">
          <button :class="chipClass(selectedChapterId === null)" @click="selectedChapterId = null">全部</button>
          <button
            v-for="chapter in visibleChapters"
            :key="chapter.id"
            :class="chipClass(selectedChapterId === chapter.id)"
            @click="selectedChapterId = chapter.id"
          >{{ chapter.name }}</button>
        </template>
        <span v-else class="text-[11px] text-text-muted">选中单个项目后可按章节筛选</span>
      </div>
    </div>

    <!-- 内容：加载 / 详情 / 瀑布流卡片 -->
    <div class="custom-scrollbar min-h-0 flex-1 overflow-y-auto">
      <div v-if="loading" class="flex h-full items-center justify-center text-sm text-text-secondary">正在加载资产库...</div>

      <!-- 详情：点卡片进入，页内切换 -->
      <div v-else-if="selectedEntry" class="mx-auto max-w-3xl px-8 py-6">
        <button class="mb-4 flex items-center gap-1 text-xs text-text-secondary transition-colors hover:text-text-primary" @click="selectedEntry = null">
          <ChevronLeft :size="14" />返回列表
        </button>
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <span :class="assetTagClass(selectedEntry.asset.type)">{{ assetTypeLabel(selectedEntry.asset.type) }}</span>
              <h2 class="truncate text-xl font-semibold text-text-primary">{{ selectedEntry.asset.name }}</h2>
            </div>
            <p class="mt-1 text-xs text-text-muted">
              项目「{{ selectedEntry.projectName }}」
              <template v-if="selectedEntry.asset.aliases.length"> · 别名：{{ selectedEntry.asset.aliases.join('、') }}</template>
            </p>
          </div>
          <button class="shrink-0 rounded px-2.5 py-1.5 text-xs text-text-secondary transition-colors hover:bg-elevated hover:text-text-primary" @click="router.push(`/comic/long-project/${selectedEntry.projectId}`)">
            打开项目<ArrowRight :size="13" class="ml-1 inline" />
          </button>
        </div>

        <!-- 参考图用途描述：覆盖项目级按类型的默认文案；留空即沿用默认 -->
        <div class="mt-6 border-t border-border-subtle pt-5">
          <div class="flex items-baseline justify-between gap-3">
            <p class="text-sm font-medium text-text-primary">参考图用途描述（可选）</p>
            <span class="shrink-0 text-[11px] text-text-muted">留空即用项目默认</span>
          </div>
          <p class="mt-1 text-[11px] leading-relaxed text-text-muted">
            「动态参考图」清单里「资产名（状态）」之后那整句，图号与资产名由系统自动生成。可用 {类型}（人物 / 场景 / 道具）与 {格号}（第1、3格 / 整镜）占位符；{格号} 自带「第1、3格」，别再写成「第{格号}格」。
          </p>
          <textarea
            :value="selectedEntry.asset.refUsage ?? ''"
            rows="2"
            class="custom-scrollbar mt-2 w-full resize-none rounded border border-border-subtle bg-input-bg px-3 py-2 text-xs leading-relaxed text-text-primary outline-none focus:border-cyan-500/50"
            :placeholder="defaultUsagePlaceholder"
            @change="commitRefUsage"
          />
        </div>

        <div v-if="visibleAttributes.length" class="mt-6 border-t border-border-subtle pt-5">
          <p class="text-sm font-medium text-text-primary">补充信息</p>
          <dl class="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <template v-for="field in visibleAttributes" :key="field.key">
              <div><dt class="text-xs text-text-muted">{{ field.label }}</dt><dd class="mt-1 text-sm text-text-primary">{{ attributeText(field.value) }}</dd></div>
            </template>
          </dl>
        </div>

        <div class="mt-6 border-t border-border-subtle pt-5">
          <div class="flex items-center justify-between">
            <p class="text-sm font-medium text-text-primary">视觉状态</p>
            <span class="text-xs text-text-muted">{{ selectedEntry.asset.variants.length }} 个</span>
          </div>
          <div v-if="selectedEntry.asset.variants.length" class="mt-3 grid gap-2 sm:grid-cols-2">
            <article v-for="variant in selectedEntry.asset.variants" :key="variant.id" class="rounded border border-border-subtle bg-surface px-4 py-3">
              <div class="flex items-center justify-between gap-2">
                <p class="text-sm font-medium text-text-primary">{{ variant.name }}</p>
                <span class="shrink-0 text-[11px] text-text-muted">{{ chapterRangeText(selectedEntry.projectId, variant) }}</span>
              </div>
              <p class="mt-1 text-xs leading-5 text-text-secondary">{{ variant.description || '暂无视觉描述' }}</p>
              <p v-if="variant.tags?.length" class="mt-2 text-[11px] text-violet-700 dark:text-violet-300">{{ variant.tags.join(' · ') }}</p>
              <p class="mt-3 text-[11px] text-text-muted">{{ effectiveVariantRefImages(variant).length }} 张参考图</p>
            </article>
          </div>
          <p v-else class="mt-3 text-xs text-text-muted">尚未整理视觉状态与参考图。</p>
        </div>

        <div class="mt-6 border-t border-border-subtle pt-5">
          <p class="text-sm font-medium text-text-primary">来源章节</p>
          <p class="mt-2 text-xs text-text-secondary">{{ sourceChapterText }}</p>
        </div>
      </div>

      <!-- 瀑布流卡片：靠左铺满；点图放大预览，点信息条进详情 -->
      <template v-else-if="filteredEntries.length">
        <div class="px-6 py-5">
          <div class="columns-2 gap-3 sm:columns-3 lg:columns-4 xl:columns-5">
            <div
              v-for="entry in filteredEntries"
              :key="`${entry.projectId}:${entry.asset.id}`"
              class="mb-3 block w-full break-inside-avoid overflow-hidden rounded border border-border-subtle bg-surface transition-colors hover:border-cyan-500/40"
            >
              <button class="relative block w-full cursor-zoom-in bg-app-bg" title="点击放大查看" @click="openPreview(entry)">
                <img v-if="thumbs.get(entryKey(entry))" :src="thumbs.get(entryKey(entry))" class="h-auto w-full" loading="lazy" :alt="entry.asset.name" />
                <div v-else class="flex aspect-[4/3] w-full items-center justify-center text-text-muted"><ImageOff :size="22" /></div>
              </button>
              <button class="block w-full px-2.5 py-2 text-left transition-colors hover:bg-elevated" title="查看详情" @click="selectedEntry = entry">
                <p class="truncate text-sm font-medium text-text-primary">{{ entry.asset.name }}</p>
                <p class="mt-0.5 text-[11px] text-text-muted">{{ entry.asset.variants.length }} 状态 · {{ entry.asset.sourceChapterIds.length }} 章节</p>
                <p v-if="selectedProjectId === null" class="truncate text-[11px] text-text-muted">{{ entry.projectName }}</p>
              </button>
            </div>
          </div>
        </div>
      </template>

      <!-- 空态 -->
      <div v-else-if="index.entries.length" class="flex h-full flex-col items-center justify-center gap-2 py-20 text-text-muted">
        <ImageOff :size="24" />
        <p class="text-sm">没有符合条件的资产</p>
        <p class="text-xs">换个类别 / 章节，或清空搜索关键词试试</p>
      </div>
      <div v-else class="flex h-full flex-col items-center justify-center gap-2 py-20 text-text-muted">
        <Boxes :size="24" />
        <p class="text-sm">还没有项目级资产</p>
        <p class="text-xs">在长篇项目的「资产」页签确认章节提取结果后，会汇总到这里</p>
      </div>
    </div>

    <!-- 大图预览：纯查看（无删除操作），可左右切换该资产的全部有效参考图 -->
    <AssetImagePreviewModal v-model="previewVisible" :images="previewImages" :image-index="previewIndex" :alt="previewAlt" :removable="false" />
  </div>
</template>

<script setup lang="ts">
/**
 * 资产库筛选视图：跨长篇项目聚合的项目级资产，影视筛选式三行筛选 + 瀑布流卡片。
 * 不作为独立路由页面 —— 嵌在 LongProject 侧栏 tree 右侧的主区渲染，
 * `defaultProjectId` 传入当前项目时默认选中（项目行仍可切换查看其他项目）。
 */
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowRight, Boxes, ChevronLeft, ImageOff, Search } from 'lucide-vue-next'
import { comicDb } from '@/api/comic'
import type { ComicProject, LongProjectAssetType, LongProjectAssetVariant } from '@comic/types'
import { DEFAULT_REF_USAGE } from '@comic/services/refUsage'
import { effectiveVariantRefImages } from '@comic/services/panelPromptService'
import {
  assetCardThumbnail,
  collectLongAssetLibrary,
  countByCategory,
  countByProject,
  filterLibraryEntries,
  type LongAssetLibraryEntry,
  type LongAssetLibraryFilters,
  type LongAssetLibraryIndex,
} from '@comic/services/longAssetLibraryService'
import { assetTagClass, assetTypeLabel, ASSET_TYPE_ORDER } from '@comic/utils/assetTypeTheme'
import { useToast } from '@comic/composables/useToast'
import AssetImagePreviewModal from '@comic/components/AssetImagePreviewModal.vue'

const props = defineProps<{ defaultProjectId?: string }>()

const router = useRouter()
const toast = useToast()

const index = ref<LongAssetLibraryIndex>({ entries: [], projects: [] })
const loading = ref(true)
/** null = 全部。defaultProjectId 存在时默认选中该项目。 */
const category = ref<LongProjectAssetType | null>(null)
const selectedProjectId = ref<string | null>(null)
const selectedChapterId = ref<string | null>(null)
const keyword = ref('')
/** 非空 = 详情视图（页内切换，不弹窗）。 */
const selectedEntry = ref<LongAssetLibraryEntry | null>(null)

const filters = computed<LongAssetLibraryFilters>(() => ({
  category: category.value,
  projectId: selectedProjectId.value,
  chapterId: selectedChapterId.value,
  keyword: keyword.value,
}))
const filteredEntries = computed(() => filterLibraryEntries(index.value.entries, filters.value))
const visibleChapters = computed(() => index.value.projects.find((option) => option.projectId === selectedProjectId.value)?.chapters ?? [])

/** 徽标计数：排除自身维度后的命中数（与影视筛选一致，所见即所选）。 */
const categoryChips = computed(() => {
  const counts = countByCategory(filterLibraryEntries(index.value.entries, { ...filters.value, category: null }))
  const chips: { key: LongProjectAssetType | null; label: string; count: number }[] = [
    { key: null, label: '全部', count: counts.all },
    ...ASSET_TYPE_ORDER.map((type) => ({ key: type as LongProjectAssetType, label: assetTypeLabel(type), count: counts[type] })),
  ]
  return chips
})
const projectCounts = computed(() => countByProject(filterLibraryEntries(index.value.entries, { ...filters.value, projectId: null })))

const entryKey = (entry: LongAssetLibraryEntry) => `${entry.projectId}:${entry.asset.id}`
const thumbs = computed(() => {
  const map = new Map<string, string | undefined>()
  for (const entry of index.value.entries) map.set(entryKey(entry), assetCardThumbnail(entry.asset))
  return map
})

/**
 * 选中态 = 底色 + 边框（透明边框常驻占位，切换时宽度不变、文字不跳动）；不用紫色、不加粗。
 */
const chipClass = (active: boolean) => [
  'rounded border border-transparent px-2.5 py-1 text-xs transition-colors',
  active ? 'border-border-subtle bg-elevated text-text-primary' : 'text-text-secondary hover:bg-elevated hover:text-text-primary',
]

function selectCategory(key: LongProjectAssetType | null) { category.value = key; selectedEntry.value = null }
function selectProject(projectId: string | null) {
  selectedProjectId.value = projectId
  selectedChapterId.value = null
  selectedEntry.value = null
}

/** 加载并聚合全部长篇项目；有 defaultProjectId 时预选（项目内入口）。 */
async function reload() {
  loading.value = true
  try {
    const nextIndex = collectLongAssetLibrary(await comicDb.getAllProjects())
    index.value = nextIndex
    if (props.defaultProjectId && nextIndex.projects.some((option) => option.projectId === props.defaultProjectId)) {
      selectedProjectId.value = props.defaultProjectId
    } else if (selectedProjectId.value && !nextIndex.projects.some((option) => option.projectId === selectedProjectId.value)) {
      selectProject(null)
    }
  } finally { loading.value = false }
}

onMounted(() => { void reload() })

/** 外部项目数据变化后（如 LongProject onActivated 重载）由父级调用刷新。 */
function refresh() { if (!loading.value) void reload() }
defineExpose({ refresh })

watch(() => props.defaultProjectId, (id) => {
  if (id && index.value.projects.some((option) => option.projectId === id)) selectProject(id)
})

/** 大图预览（点卡片图片打开）：展示该资产全部有效参考图，从缩略图那张起播。 */
const previewVisible = ref(false)
const previewImages = ref<string[]>([])
const previewIndex = ref(0)
const previewAlt = ref('图片')
function openPreview(entry: LongAssetLibraryEntry) {
  const images = entry.asset.variants.flatMap((variant) => effectiveVariantRefImages(variant))
  if (!images.length) return
  previewImages.value = images
  const first = thumbs.value.get(entryKey(entry)) ?? ''
  previewIndex.value = Math.max(0, images.indexOf(first))
  previewAlt.value = entry.asset.name
  previewVisible.value = true
}

// ===== 详情区 =====
const defaultUsagePlaceholder = computed(() => selectedEntry.value ? DEFAULT_REF_USAGE[selectedEntry.value.asset.type] : '')
const visibleAttributes = computed(() => Object.entries(selectedEntry.value?.asset.attributes ?? {}).map(([key, value]) => ({ key, label: key, value })))
function attributeText(value: string | string[] | number | undefined) { return Array.isArray(value) ? value.join('、') : String(value ?? '') }
function chapterRangeText(projectId: string, variant: LongProjectAssetVariant) { return variant.chapterRange?.endChapterId ? '跨章节状态' : chapterName(projectId, variant.firstAppearanceChapterId ?? '') || '本章首次出现' }
function chapterName(projectId: string, chapterId: string): string {
  return index.value.projects.find((option) => option.projectId === projectId)?.chapters.find((chapter) => chapter.id === chapterId)?.name ?? ''
}
const sourceChapterText = computed(() => {
  const entry = selectedEntry.value
  if (!entry) return ''
  const names = entry.asset.sourceChapterIds.map((chapterId) => chapterName(entry.projectId, chapterId)).filter(Boolean)
  return names.length ? `来自 ${names.join('、')} 的解析结果` : '无来源章节记录'
})

/**
 * 资产级 refUsage 写回：跨项目编辑必须基于 DB 最新数据做 read-modify-write（单字段），
 * 不能拿本页快照整写，否则会覆盖其他页面刚落库的变更。
 */
const savingRefUsage = ref(false)
async function commitRefUsage(event: Event) {
  const entry = selectedEntry.value
  if (!entry || savingRefUsage.value) return
  const value = (event.target as HTMLTextAreaElement).value
  if (value.trim() === (entry.asset.refUsage ?? '')) return
  savingRefUsage.value = true
  try {
    const latest = await comicDb.getProject(entry.projectId)
    if (!latest?.longProjectData) { toast.error('项目不存在，保存失败'); return }
    const draft = JSON.parse(JSON.stringify(latest)) as ComicProject
    if (!draft.longProjectData) { toast.error('项目数据异常，保存失败'); return }
    const trimmed = value.trim()
    let hit = false
    draft.longProjectData.assets = (draft.longProjectData.assets ?? []).map((asset) => {
      if (asset.id !== entry.asset.id) return asset
      hit = true
      return { ...asset, refUsage: trimmed || undefined, updatedAt: Date.now() }
    })
    if (!hit) { toast.error('资产不存在，保存失败'); return }
    await comicDb.saveProject(draft)
    entry.asset.refUsage = trimmed || undefined
    toast.success(trimmed ? '已保存参考图用途描述' : '已清除覆盖，改用项目默认')
  } catch (error) {
    console.error('保存参考图用途描述失败', error)
    toast.error('保存失败，请重试')
  } finally { savingRefUsage.value = false }
}
</script>
