import { ref } from 'vue'
import { comicDb } from '@/api/comic'
import type { ComicProject } from '@comic/types'

/**
 * 长篇项目持久化 composable：串行队列 + 队列内 read-modify-write。
 *
 * 两个长篇页面（主页面 / 生图工作台）都被 keep-alive 缓存，各自持有 project ref；
 * 若基于各自缓存快照整体写库会互相覆盖（后写赢）。核心改进：
 * 每次任务在队列内先从 DB 读最新项目数据，在其上应用局部修改后再写回，
 * 并同步刷新本地缓存。页面 onActivated 时应调用 loadProject 重载。
 */

/** 创建长篇项目持久化实例（每个页面一个）。 */
export function useLongProjectPersistence(projectId: string) {
  const project = ref<ComicProject | null>(null)
  const loading = ref(true)

  /** 串行队列：并发 saveProject 会互相覆盖（后写赢），批量回写必须串行。 */
  let persistQueue: Promise<unknown> = Promise.resolve()
  const runPersistTask = (task: () => Promise<void>): Promise<void> => {
    // 前一个任务失败也继续执行后续任务，失败只抛给当次调用方
    const run = persistQueue.then(task, task)
    persistQueue = run.then(() => undefined, () => undefined)
    return run
  }

  /** 从 DB 加载项目（页面挂载 / keep-alive 激活时刷新缓存）。 */
  const loadProject = async (): Promise<ComicProject | null> => {
    const latest = await comicDb.getProject(projectId)
    project.value = latest
    return latest
  }

  /**
   * 队列内 read-modify-write：先读 DB 最新数据，应用局部修改后写回。
   * patch 在队列任务内基于最新数据计算，避免跨页旧快照覆盖。
   */
  const mutateLongProjectData = (mutate: (data: NonNullable<ComicProject['longProjectData']>) => void) =>
    runPersistTask(async () => {
      // 队列内重读最新数据，合并其他页面已写入的变更
      const latest = (await comicDb.getProject(projectId)) ?? project.value
      if (!latest) return
      const current = latest.longProjectData ?? { nodes: [] }
      // 先克隆出纯数据草稿，patch 后再次序列化以剥离 reactive proxy（IPC 安全）
      const draft = JSON.parse(JSON.stringify(current)) as NonNullable<ComicProject['longProjectData']>
      mutate(draft)
      const updated: ComicProject = {
        ...latest,
        longProjectData: JSON.parse(JSON.stringify(draft)),
        updatedAt: Date.now(),
      }
      await comicDb.saveProject(updated)
      project.value = updated
    })

  /** 整块字段覆盖式持久化（如 storyboardRuns / assets 等数组整体替换）。 */
  const persistLongProjectData = (changes: Partial<NonNullable<ComicProject['longProjectData']>>) =>
    mutateLongProjectData((data) => { Object.assign(data, changes) })

  return { project, loading, loadProject, mutateLongProjectData, persistLongProjectData }
}
