<template>
  <!--
    纯图片墙：只显示本章资产已生成的成品图，没有生成图的资产不出任何占位卡。
    页面上**只保留折叠态**：一个资产收成一叠斜向错位的卡片（只露边缘、像一个牌堆），
    点击后打开弹窗，在弹窗里按原始比例瀑布流看这个资产的全部图（AssetShotsWallModal）。
  -->
  <div class="px-5 py-4">
    <div v-if="groups.length" class="flex flex-wrap items-start gap-x-7 gap-y-8">
      <section v-for="group in groups" :key="group.assetId" class="min-w-0">
        <button
          class="deck text-left"
          :style="`padding-right: ${(group.shots.length - 1) * PEEK}px; --peek: ${PEEK}px`"
          :title="`查看 ${group.assetName} 的全部生成图（${group.shots.length} 张）`"
          @click="openGroup(group.assetId)"
        >
          <span
            v-for="(shot, index) in group.shots"
            :key="shot.key"
            class="deck-card border border-border-subtle bg-elevated"
            :style="`--i: ${index}; z-index: ${group.shots.length - index}`"
          >
            <img
              :src="toFastDisplayImageUrl(shot.url)"
              class="block h-48 w-auto max-w-none lg:h-56"
              loading="lazy"
              decoding="async"
              :alt="shot.alt"
            />
          </span>
        </button>
        <div class="flex w-full items-center gap-1.5 pt-1.5 text-[11px] leading-4 text-text-secondary">
          <span class="min-w-0 truncate">{{ group.assetName }}</span>
          <span v-if="group.shots.length > 1" class="shrink-0 text-text-muted">{{ group.shots.length }}</span>
        </div>
      </section>
    </div>

    <!-- 一张生成图都没有时：保持空白，只留一行极轻的说明，避免看起来像页面坏了 -->
    <p v-else class="py-24 text-center text-xs text-text-muted">本章暂无生成图</p>

    <AssetShotsWallModal
      v-model="wallVisible"
      :asset-name="activeGroup?.assetName ?? ''"
      :shots="activeGroup?.shots ?? []"
    />
  </div>
</template>

<script setup lang="ts">
/**
 * 章节资产的「图片」视图（资产页签第三个 tab）：**只做浏览，不做建档**。
 *
 * 口径：本章 `chapterAssets` 引用到的资产 × 视觉状态的 `generatedImageIds`（AI 生成图）。
 * - 没有生成图的资产/状态**一张卡都不出**（旧版的「名称 + 状态 + 描述 + tags」信息卡片已推翻）；
 * - 不再过滤地址前缀：外部化后生成图是 `app-image://comic/…`，
 *   旧版 `isImageSource` 白名单不含该协议，会把图整批吞掉。
 *
 * 🔴 **布局定稿：折叠叠牌 + 点击开弹窗**（2026-10-24，四次返工后）：
 * 1. `columns` 瀑布流 —— 同资产的图竖着堆在一列，要上下扫；
 * 2. 一个资产一行横排 —— 方向对了，但固定图高把图压得太小，状态多的资产占满整屏；
 * 3. 原地展开 + 收起 —— 图够大了，但展开会把其它资产挤走，还要多点一次「收起」；
 * 4. **现在**：页面只留折叠堆，点击开 `AssetShotsWallModal` 看瀑布流大图。
 *
 * 下载、大图预览、hover 信息条都在弹窗里 —— 折叠堆本身是个按钮，不该再塞嵌套按钮。
 */
import { computed, ref } from 'vue'
import AssetShotsWallModal from './AssetShotsWallModal.vue'
import { toFastDisplayImageUrl } from '@/shared/image/imageUrl'
import { buildChapterAssetShots, groupChapterAssetShots, type ChapterAssetShot } from '@comic/services/chapterAssetShots'
import type { LongProjectAsset, LongProjectChapterAsset } from '@comic/types'

const props = defineProps<{ entries: LongProjectChapterAsset[]; assets: LongProjectAsset[] }>()

/**
 * 一张图 = 一项。排序（同一资产的图必须挨在一起）在 `chapterAssetShots` 里做，
 * 那边有单测守着；组件只负责铺版与交互。
 */
const shots = computed<ChapterAssetShot[]>(() => buildChapterAssetShots(props.entries, props.assets))

/** 按资产分组；排序同上，直接顺次切分，不另算一套顺序。 */
const groups = computed(() => groupChapterAssetShots(shots.value))

// ========== 折叠 / 打开弹窗 ==========
/** 折叠态每一张卡片向右露出的宽度（px）。改这里即可调整「牌堆」的疏密。 */
const PEEK = 26

const wallVisible = ref(false)
/** 存 id 而不是对象：弹窗开着时该资产的图有变动（重新生成/删除），弹窗里能跟着刷新。 */
const activeAssetId = ref('')

const activeGroup = computed(() => groups.value.find((group) => group.assetId === activeAssetId.value) ?? null)

function openGroup(assetId: string) {
  activeAssetId.value = assetId
  wallVisible.value = true
}
</script>

<style scoped>
/*
 * 折叠态的「牌堆」：所有卡片叠在同一位置，按序号向右错开 PEEK、向下 1.5px、顺时针 1.2°，
 * 只有第一张占位撑开尺寸，其余绝对定位 —— 所以宽度永远等于「第一张宽 + 露出的边缘」，
 * 不依赖图片本身宽高比，横图竖图都不会把牌堆撑爆。
 *
 * ⚠️ 牌堆宽度必须用 `padding-right: (n-1) * PEEK` 补出来（模板里算），
 * 否则后面几张是绝对定位、不占布局，会盖到右边那个资产身上。
 */
.deck {
  position: relative;
  display: block;
  padding: 0;
  border: 0;
  background: none;
  cursor: pointer;
  /* `--peek` 由模板按 PEEK 常量写入，这里是兜底；
     `--grow` 让整叠在悬停时再散开一点，暗示「可以打开」 */
  --peek: 26px;
  --grow: 0px;
}
.deck:hover { --grow: 7px; }

.deck-card {
  position: absolute;
  top: 0;
  left: 0;
  display: block;
  overflow: hidden;
  border-radius: 8px;
  transform-origin: bottom left;
  transform: translate(
      calc(var(--i) * var(--peek) + var(--i) * var(--grow)),
      calc(var(--i) * 1.5px)
    )
    rotate(calc(var(--i) * 1.2deg));
  box-shadow: 0 1px 4px rgb(2 6 23 / 0.18);
  transition: transform 0.18s ease;
}
/* 第一张留在文档流里，负责撑开整个牌堆的尺寸 */
.deck-card:first-child { position: relative; }
</style>
