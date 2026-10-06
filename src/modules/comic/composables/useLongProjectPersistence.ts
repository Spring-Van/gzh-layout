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

/**
 * 提交项目数据到主进程，并返回**主进程落库后的对象**。
 *
 * 以前在写库前无条件 `JSON.parse(JSON.stringify(...))` 剥离 Vue 的 reactive Proxy：
 * 长篇项目的 longProjectData 可达上百 MB（其中绝大多数是内联图片 base64），
 * 这一次全量序列化是秒级的同步阻塞，而绝大多数调用方塞进 draft 的都是纯对象——
 * 正常路径上它是纯粹的浪费。
 *
 * 现在改为：先原样提交，只有 IPC 真的因 Proxy 拒绝克隆时才回退到深克隆重试一次。
 * 异常回退路径与旧行为完全一致，安全网不变。
 *
 * 返回值必须用起来：主进程写盘前会把内联 base64 外置成 `app-image://` 引用，
 * 只有把返回的对象赋回 `project.value`，渲染层内存才会同步瘦身 —— 否则下一次操作
 * 照样要搬运几百 MB（这是「图片外置」能不能真正生效的关键一步）。
 */
async function submitProject(next: ComicProject, plainFallback: () => ComicProject): Promise<ComicProject> {
  try {
    return await saveProjectAndReadBack(next)
  } catch (error) {
    if (!isCloneError(error)) throw error
    return await saveProjectAndReadBack(plainFallback())
  }
}

/** 写库并取回主进程落库后的对象（老版本主进程没有返回值时回落为传入值）。 */
async function saveProjectAndReadBack(project: ComicProject): Promise<ComicProject> {
  const result = await comicDb.saveProject(project)
  return result?.project ?? project
}

/** IPC 是否因「对象不可结构化克隆」失败（Vue 的 reactive Proxy 无法跨越 IPC 边界）。 */
function isCloneError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return /could not be cloned|DataCloneError|not cloneable/i.test(message)
}

/** 单条 longProjectData 修改函数。 */
type LongProjectDataMutator = (data: NonNullable<ComicProject['longProjectData']>) => void

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

  /**
   * 同一轮事件循环里排队的 mutator 攒成一批，**一次** read-modify-write 写回。
   *
   * 为什么必要：单次写库要序列化整个项目（长篇项目含内联图片，实测 86MB → 序列化 1.3s +
   * 写盘 0.3s + 一次 IPC 结构克隆），而业务上「批量回填」几乎都写成 for 循环逐条 emit ——
   * 10 条提示词 = 10 次全量写盘（≈25s 卡死），而且每次都替换 project ref、让整棵组件树重渲染。
   * 攒批后同样的 10 次调用只产生 1 次写盘与 1 次重渲染。
   *
   * 语义等价：mutator 仍按入队顺序依次作用在**同一份最新草稿**上（后一个能看到前一个的修改），
   * 只是把「读—改—写」三段的重复部分省掉。
   */
  interface PendingMutation {
    mutate: LongProjectDataMutator
    resolve: () => void
    reject: (error: unknown) => void
  }
  let pendingMutations: PendingMutation[] = []
  let flushScheduled = false

  const flushPendingMutations = () => runPersistTask(async () => {
    const batch = pendingMutations
    pendingMutations = []
    if (!batch.length) return
    try {
      // 队列内重读最新数据，合并其他页面已写入的变更
      const latest = (await comicDb.getProject(projectId)) ?? project.value
      if (!latest) {
        batch.forEach((item) => item.resolve())
        return
      }
      const current = latest.longProjectData ?? { nodes: [] }
      const fromDb = latest !== project.value
      // 回落到本地 project.value（reactive proxy）时才需要克隆剥离 proxy
      const draft = fromDb
        ? current
        : (JSON.parse(JSON.stringify(current)) as NonNullable<ComicProject['longProjectData']>)
      for (const item of batch) item.mutate(draft)
      const updatedAt = Date.now()
      const updated = await submitProject(
        { ...latest, longProjectData: draft, updatedAt },
        () => ({ ...latest, longProjectData: JSON.parse(JSON.stringify(draft)), updatedAt }),
      )
      project.value = updated
      batch.forEach((item) => item.resolve())
    } catch (error) {
      for (const item of batch) item.reject(error)
    }
  })

  const scheduleFlush = () => {
    if (flushScheduled) return
    flushScheduled = true
    // 微任务排在当前同步块之后 —— 循环里的多次调用会被一次性收走
    queueMicrotask(() => {
      flushScheduled = false
      void flushPendingMutations()
    })
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
   * 同一轮事件循环内的多次调用会合并为一次写库（见 flushPendingMutations）。
   */
  const mutateLongProjectData = (mutate: LongProjectDataMutator): Promise<void> =>
    new Promise<void>((resolve, reject) => {
      pendingMutations.push({ mutate, resolve, reject })
      scheduleFlush()
    })

  /** 整块字段覆盖式持久化（如 storyboardRuns / assets 等数组整体替换）。 */
  const persistLongProjectData = (changes: Partial<NonNullable<ComicProject['longProjectData']>>) =>
    mutateLongProjectData((data) => { Object.assign(data, changes) })

  /**
   * 项目根级 read-modify-write（imageGenConfig 等挂在 ComicProject 根上、不在 longProjectData 里）。
   * 与 mutateLongProjectData 同一串行队列，写回后刷新 project ref，保证全页响应式同步。
   */
  const mutateProject = (mutate: (project: ComicProject) => void) =>
    runPersistTask(async () => {
      const latest = (await comicDb.getProject(projectId)) ?? project.value
      if (!latest) return
      const fromDb = latest !== project.value
      const draft = fromDb
        ? latest
        : (JSON.parse(JSON.stringify(latest)) as ComicProject)
      mutate(draft)
      const updatedAt = Date.now()
      const updated = await submitProject(
        { ...draft, updatedAt },
        // 回退分支必须做全量深克隆，浅拷贝剥不掉嵌套的 proxy
        () => ({ ...(JSON.parse(JSON.stringify(draft)) as ComicProject), updatedAt }),
      )
      project.value = updated
    })

  return { project, loading, loadProject, mutateLongProjectData, mutateProject, persistLongProjectData }
}
