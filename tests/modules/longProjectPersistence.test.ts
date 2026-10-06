import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ComicProject, LongProjectNode } from '@comic/types'

/**
 * 长篇项目持久化：同 tick 内的多次 mutate 必须攒成一次 read-modify-write。
 *
 * 背景：单次写库要序列化整份项目（长篇项目含内联 base64 图片，实测 86MB → 序列化 1.3s + 写盘 0.3s），
 * 而「填充到资产」这类批量回填原先写成 for 循环逐条 emit，10 条就是 10 次全量写盘（≈25s 卡死）。
 * 本文件锁死「同 tick 攒批、跨 tick 各写一次」的行为，防止再退化。
 */

interface FakeDb {
  project: ComicProject
  getCalls: number
  saveCalls: number
}

/** 造一个最小可用的项目（只有 nodes，足以断言写入结果）。 */
function makeProject(nodes: Array<{ id: string; name: string }> = []): ComicProject {
  return {
    id: 'p1',
    name: '长篇',
    longProjectData: { nodes: nodes as unknown as LongProjectNode[] },
  } as unknown as ComicProject
}

const fake: FakeDb = { project: makeProject(), getCalls: 0, saveCalls: 0 }

vi.mock('@/api/comic', () => ({
  comicDb: {
    // 返回深拷贝，模拟 IPC 结构克隆（避免调用方直接改到「库里的对象」）
    getProject: async () => {
      fake.getCalls += 1
      return JSON.parse(JSON.stringify(fake.project)) as ComicProject
    },
    saveProject: async (project: ComicProject) => {
      fake.saveCalls += 1
      fake.project = JSON.parse(JSON.stringify(project)) as ComicProject
      return { success: true }
    },
  },
}))

const { useLongProjectPersistence } = await import('@comic/composables/useLongProjectPersistence')
const { comicDb } = await import('@/api/comic')

/** 从库里读回节点名（断言写入结果）。 */
function names(): string[] {
  const data = fake.project.longProjectData as unknown as { nodes: Array<{ name: string }> }
  return (data.nodes ?? []).map((node) => node.name)
}

describe('useLongProjectPersistence · 同 tick 写库合并', () => {
  beforeEach(() => {
    fake.project = makeProject()
    fake.getCalls = 0
    fake.saveCalls = 0
  })

  it('同一轮事件循环里的多次 mutate 只读一次、写一次', async () => {
    const { mutateLongProjectData } = useLongProjectPersistence('p1')

    // 模拟「填充到资产」的 for 循环：10 条 patch 同步连续提交
    const tasks = Array.from({ length: 10 }, (_, index) =>
      mutateLongProjectData((data) => {
        const node = { id: `n${index}`, name: `章节${index}` } as unknown as LongProjectNode
        data.nodes = [...(data.nodes ?? []), node]
      }))
    await Promise.all(tasks)

    expect(fake.getCalls).toBe(1)
    expect(fake.saveCalls).toBe(1)
    expect(names()).toEqual(Array.from({ length: 10 }, (_, index) => `章节${index}`))
  })

  it('跨 tick（await 之后）的 mutate 各自写一次', async () => {
    const { mutateLongProjectData } = useLongProjectPersistence('p1')

    await mutateLongProjectData((data) => {
      data.nodes = [{ id: 'a', name: 'A' } as unknown as LongProjectNode]
    })
    await mutateLongProjectData((data) => {
      data.nodes = [...(data.nodes ?? []), { id: 'b', name: 'B' } as unknown as LongProjectNode]
    })

    expect(fake.getCalls).toBe(2)
    expect(fake.saveCalls).toBe(2)
    expect(names()).toEqual(['A', 'B'])
  })

  it('后一个 mutator 能看到前一个在同一批里的修改', async () => {
    const { mutateLongProjectData } = useLongProjectPersistence('p1')

    const first = mutateLongProjectData((data) => {
      data.nodes = [{ id: 'a', name: 'A' } as unknown as LongProjectNode]
    })
    const second = mutateLongProjectData((data) => {
      const node = { id: 'b', name: `B·共${(data.nodes ?? []).length}` } as unknown as LongProjectNode
      data.nodes = [...(data.nodes ?? []), node]
    })
    await Promise.all([first, second])

    expect(names()).toEqual(['A', 'B·共1'])
  })

  it('写库失败时批内每个调用方都拿到 rejection', async () => {
    const { mutateLongProjectData } = useLongProjectPersistence('p1')
    const saveSpy = vi.spyOn(comicDb, 'saveProject').mockRejectedValue(new Error('write failed'))

    const a = mutateLongProjectData((data) => { data.nodes = [] })
    const b = mutateLongProjectData((data) => { data.nodes = [] })

    await expect(a).rejects.toThrow('write failed')
    await expect(b).rejects.toThrow('write failed')

    saveSpy.mockRestore()
  })
})
