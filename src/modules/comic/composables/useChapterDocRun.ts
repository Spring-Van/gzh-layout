import { ref, type Ref } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import { buildAnalysisPrompt, buildScriptPrompt, runChapterDoc } from '@comic/services/chapterDocService'
import type {
  ChapterDocKind,
  ComicProject,
  LongChapterStage,
  LongProjectChapterDoc,
  ModelConfig,
  PromptTemplate,
} from '@comic/types'

/** 文档类型 → longProjectData 存储字段。 */
const docKey: Record<ChapterDocKind, 'chapterAnalyses' | 'chapterScripts'> = {
  analysis: 'chapterAnalyses',
  script: 'chapterScripts',
}

/** 阶段推进顺序：只升不降，避免重跑早期环节把后期阶段打回去。 */
const stageOrder: LongChapterStage[] = ['empty', 'source-ready', 'analysis-ready', 'script-ready', 'assets-ready', 'storyboard-ready', 'prompts-ready', 'completed']

/** 环节完成后的章节阶段。 */
const stageOnComplete: Record<ChapterDocKind, LongChapterStage> = {
  analysis: 'analysis-ready',
  script: 'script-ready',
}

function wordCount(content: string): number {
  return content.replace(/\s/g, '').length
}

/**
 * 章节级文档生成 composable：原文分析 / 漫画剧本两个环节的执行与持久化。
 * 文档每章一份（upsert 覆盖旧版），running → 调用模型 → completed/failed；
 * 同时推进章节 stage（只升不降）。模型/模板选择默认值也收编在此。
 */
export function useChapterDocRun(options: {
  project: Ref<ComicProject | null>
  mutateLongProjectData: (mutate: (data: NonNullable<ComicProject['longProjectData']>) => void) => Promise<void>
}) {
  const running = ref(false)
  const selectedModelByKind = ref<Record<ChapterDocKind, string>>({ analysis: '', script: '' })
  const selectedTemplateByKind = ref<Record<ChapterDocKind, string>>({ analysis: '', script: '' })

  /** 从模型/模板配置列表初始化两个环节的默认选择。 */
  function initDefaults(models: ModelConfig[], templates: PromptTemplate[]) {
    const defaultModelId = models.filter((model) => model.category === 'llm')[0]?.id ?? ''
    selectedModelByKind.value = { analysis: defaultModelId, script: defaultModelId }
    selectedTemplateByKind.value = {
      analysis: templates.find((template) => template.type === 'analysis')?.id ?? '',
      script: templates.find((template) => template.type === 'script')?.id ?? '',
    }
  }

  /** 获取指定章节的文档（每章一份，取当前生效版本）。 */
  function getDoc(kind: ChapterDocKind, chapterId: string): LongProjectChapterDoc | undefined {
    const docs = options.project.value?.longProjectData?.[docKey[kind]] ?? []
    return docs.find((doc) => doc.chapterId === chapterId)
  }

  /** 组装指定环节的最终发送提示词。 */
  function buildPrompt(kind: ChapterDocKind, templateContent: string, chapterContent: string, analysis?: string): string {
    return kind === 'analysis'
      ? buildAnalysisPrompt(templateContent, chapterContent)
      : buildScriptPrompt(templateContent, chapterContent, analysis)
  }

  /** 保存文档编辑内容（右侧编辑区失焦/切回预览时回写）。 */
  async function saveDocContent(kind: ChapterDocKind, chapterId: string, content: string) {
    await options.mutateLongProjectData((data) => {
      data[docKey[kind]] = (data[docKey[kind]] ?? []).map((item) =>
        item.chapterId === chapterId ? { ...item, content, updatedAt: Date.now() } : item)
    })
  }

  /**
   * 执行文档生成：先落一份 running 文档（页面刷新后可恢复为 failed），
   * 模型返回后回写内容并推进章节 stage；失败时记录错误信息。
   */
  async function runDoc(kind: ChapterDocKind, params: {
    chapterId: string
    model: ModelConfig
    templateId: string
    prompt: string
    sourceContent: string
  }) {
    if (running.value) return
    running.value = true
    const now = Date.now()
    const doc: LongProjectChapterDoc = {
      id: uuidv4(), chapterId: params.chapterId, content: '',
      modelId: params.model.id, templateId: params.templateId, prompt: params.prompt,
      sourceContent: params.sourceContent, sourceWordCount: wordCount(params.sourceContent),
      status: 'running', createdAt: now, updatedAt: now,
    }
    try {
      await options.mutateLongProjectData((data) => {
        const list = data[docKey[kind]] ?? []
        data[docKey[kind]] = [...list.filter((item) => item.chapterId !== params.chapterId), doc]
      })
      const content = await runChapterDoc({ model: params.model, prompt: params.prompt })
      await options.mutateLongProjectData((data) => {
        data[docKey[kind]] = (data[docKey[kind]] ?? []).map((item) =>
          item.id === doc.id ? { ...item, content, status: 'completed', error: undefined, updatedAt: Date.now() } : item)
        data.nodes = (data.nodes ?? []).map((node) => {
          if (node.id !== params.chapterId) return node
          const nextStage = stageOnComplete[kind]
          return stageOrder.indexOf(node.stage ?? 'empty') < stageOrder.indexOf(nextStage)
            ? { ...node, stage: nextStage, updatedAt: Date.now() }
            : { ...node, updatedAt: Date.now() }
        })
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : '生成失败，请重试'
      await options.mutateLongProjectData((data) => {
        data[docKey[kind]] = (data[docKey[kind]] ?? []).map((item) =>
          item.id === doc.id ? { ...item, status: 'failed', error: message, updatedAt: Date.now() } : item)
      })
      throw error
    } finally {
      running.value = false
    }
  }

  /** 异常恢复：页面加载时残留 running 的文档标记为失败，避免界面永远转圈。 */
  async function recoverInterrupted() {
    const hasRunning = (['analysis', 'script'] as const).some((kind) =>
      (options.project.value?.longProjectData?.[docKey[kind]] ?? []).some((doc) => doc.status === 'running'))
    if (!hasRunning) return
    await options.mutateLongProjectData((data) => {
      for (const kind of ['analysis', 'script'] as const) {
        data[docKey[kind]] = (data[docKey[kind]] ?? []).map((doc) =>
          doc.status === 'running'
            ? { ...doc, status: 'failed' as const, error: '上次生成被中断，请重新生成', updatedAt: Date.now() }
            : doc)
      }
    })
  }

  return { running, selectedModelByKind, selectedTemplateByKind, initDefaults, getDoc, buildPrompt, saveDocContent, runDoc, recoverInterrupted }
}
