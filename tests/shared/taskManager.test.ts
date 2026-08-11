import { beforeEach, describe, expect, it } from 'vitest';
import { useTaskManager } from '../../src/shared/tasks/useTaskManager';

describe('useTaskManager', () => {
  const manager = useTaskManager();

  beforeEach(() => {
    for (const id of [...manager.tasks.keys()]) manager.remove(id);
  });

  it('tracks progress and completion', () => {
    manager.start({ id: 'build', title: 'Build', total: 4 });
    manager.update('build', { completed: 2 });
    expect(manager.get('build')).toMatchObject({ status: 'running', completed: 2, total: 4 });
    manager.complete('build');
    expect(manager.get('build')?.status).toBe('completed');
  });

  it('aborts cancellable tasks', () => {
    const signal = manager.start({ id: 'batch', title: 'Batch' });
    expect(manager.cancel('batch')).toBe(true);
    expect(signal.aborted).toBe(true);
    expect(manager.get('batch')?.status).toBe('cancelled');
  });
});
