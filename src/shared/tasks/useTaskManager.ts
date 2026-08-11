import { computed, reactive } from 'vue';

export type LongTaskStatus = 'running' | 'completed' | 'failed' | 'cancelled';

export interface LongTask {
  id: string;
  title: string;
  status: LongTaskStatus;
  completed: number;
  total: number;
  message?: string;
  error?: string;
  startedAt: number;
  finishedAt?: number;
  cancellable: boolean;
}

const tasks = reactive(new Map<string, LongTask>());
const controllers = new Map<string, AbortController>();

export function useTaskManager() {
  const activeTasks = computed(() => [...tasks.values()].filter(task => task.status === 'running'));

  function start(input: { id: string; title: string; total?: number; cancellable?: boolean }) {
    controllers.get(input.id)?.abort();
    const controller = new AbortController();
    controllers.set(input.id, controller);
    tasks.set(input.id, {
      id: input.id,
      title: input.title,
      status: 'running',
      completed: 0,
      total: input.total ?? 0,
      startedAt: Date.now(),
      cancellable: input.cancellable ?? true,
    });
    return controller.signal;
  }

  function update(id: string, patch: Partial<Pick<LongTask, 'completed' | 'total' | 'message'>>) {
    const task = tasks.get(id);
    if (task?.status === 'running') Object.assign(task, patch);
  }

  function complete(id: string, message?: string) {
    finish(id, 'completed', { message });
  }

  function fail(id: string, error: unknown) {
    finish(id, 'failed', { error: error instanceof Error ? error.message : String(error) });
  }

  function cancel(id: string) {
    const task = tasks.get(id);
    if (!task || task.status !== 'running' || !task.cancellable) return false;
    controllers.get(id)?.abort();
    finish(id, 'cancelled');
    return true;
  }

  function remove(id: string) {
    controllers.delete(id);
    tasks.delete(id);
  }

  function get(id: string) {
    return tasks.get(id);
  }

  function finish(id: string, status: Exclude<LongTaskStatus, 'running'>, patch: Partial<LongTask> = {}) {
    const task = tasks.get(id);
    if (!task) return;
    Object.assign(task, patch, { status, finishedAt: Date.now() });
    controllers.delete(id);
  }

  return { tasks, activeTasks, start, update, complete, fail, cancel, remove, get };
}
