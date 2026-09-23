import type { GenPromptSlot } from '@comic/types'

/**
 * 候选提示词条（`GenPromptSlot`）的读取口径。
 *
 * 界面（编辑态）与生图（只读态）都要「知道现在选的是哪一条」，两边的兜底必须一致，
 * 否则会出现「界面显示第 1 条、发出去的是另一条」这种最难查的错位。
 */

/** 新建一条候选提示词（开关默认全开）。 */
export function createGenPromptSlot(id: string, text: string): GenPromptSlot {
  return { id, text, attachShared: true, useAssetRefs: true, uploadedRefs: [] }
}

/**
 * 归一一条候选提示词。
 *
 * **必须在读入时调用**：中间态数据里 `text` 可能是 `null`（旧版本写入 / 手改过的库），
 * 而模板里对提示词正文做了 `.trim()` —— 一条 null 就会让整个右栏渲染抛错、空白，
 * 且会连累父页面补丁（页签藏不住、下拉菜单关不掉）。开关同理，缺省一律按「开」。
 */
export function normalizeGenPromptSlot(slot: GenPromptSlot): GenPromptSlot {
  return {
    id: slot.id,
    text: typeof slot.text === 'string' ? slot.text : '',
    attachShared: slot.attachShared !== false,
    useAssetRefs: slot.useAssetRefs !== false,
    uploadedRefs: [...(slot.uploadedRefs ?? [])],
  }
}

/**
 * 取当前选中的候选提示词条。**没有 `genPrompts` 时返回一条「全开」的虚拟条**，
 * 正文取 `imagePrompt` —— 老数据的行为与单输入框时代完全一致（不会变成什么都不发）。
 *
 * 只读兜底：虚拟条的 `id` 为空串，调用方不要拿它当可写标识。
 */
export function resolveActiveGenSlot(
  source: { genPrompts?: GenPromptSlot[]; activeGenPromptId?: string; imagePrompt?: string } | undefined | null,
): GenPromptSlot {
  const stored = source?.genPrompts ?? []
  const active = source?.activeGenPromptId
    ? stored.find((slot) => slot.id === source.activeGenPromptId)
    : undefined
  const picked = active ?? stored[0]
  if (picked) return normalizeGenPromptSlot(picked)
  return {
    id: '',
    text: source?.imagePrompt ?? '',
    attachShared: true,
    useAssetRefs: true,
    uploadedRefs: [],
  }
}

/** 开关缺省一律按「开」判定（旧数据没有这两个字段）。 */
export function slotAttachShared(slot?: GenPromptSlot | null): boolean {
  return slot?.attachShared !== false
}

export function slotUseAssetRefs(slot?: GenPromptSlot | null): boolean {
  return slot?.useAssetRefs !== false
}
