import { LONG_CHAPTER_STAGE_ORDER, type LongChapterStage } from '@comic/types'

/**
 * 章节阶段（`node.stage`）的推进口径：**只升不降**。
 *
 * 为什么需要它：`stage` 是「这一章走到哪一步」的进度标记，写入点分散在各环节的
 * composable / 组件里。若某个写入点按「当前输入有什么」直接赋一个新值，就会把已经
 * 走远的阶段**降级** —— 典型例子是原文正文的自动保存：一个已经生成过分镜的章节，
 * 回头改一个错别字就把 stage 打回 `source-ready`，而且其它写入点都被「只升不降」
 * 守卫挡着，没有任何路径能把它补回 `assets-ready`。
 *
 * 所以凡是写 `stage` 的地方，都要先经过这里算出目标阶段，不要直接赋值。
 */

/** 阶段在流水线中的序号（未知/缺省按最靠前的 `empty` 处理）。 */
export function chapterStageIndex(stage?: LongChapterStage | null): number {
  return LONG_CHAPTER_STAGE_ORDER.indexOf(stage ?? 'empty')
}

/** 当前阶段是否已达到（含等于）目标阶段。 */
export function chapterStageAtLeast(stage: LongChapterStage | undefined, target: LongChapterStage): boolean {
  return chapterStageIndex(stage) >= chapterStageIndex(target)
}

/**
 * 原文正文编辑（手动保存 / 防抖自动保存）后的目标阶段：
 * - 有正文 → 至少 `source-ready`，但**不低于原阶段**（改个错别字不动进度）；
 * - 正文被清空 → 只在**还停在 `source-ready` 或更早**时退回 `empty`；一旦分析/剧本/
 *   资产/分镜已经产出（阶段已越过 `source-ready`），说明后续产物独立存在，不回退。
 *
 * 新建章节（无原阶段）传入 `undefined` 时，等价于原来的 `有正文 ? source-ready : empty`。
 */
export function stageAfterSourceEdit(current: LongChapterStage | undefined, hasContent: boolean): LongChapterStage {
  const currentStage = current ?? 'empty'
  if (hasContent) return chapterStageAtLeast(currentStage, 'source-ready') ? currentStage : 'source-ready'
  return chapterStageAtLeast(currentStage, 'script-ready') ? currentStage : 'empty'
}
