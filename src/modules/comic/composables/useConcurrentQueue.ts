/**
 * 并发队列 Hook
 * 支持可控并发数的批量任务执行
 *
 * @param concurrency - 最大并发数
 */
export function useConcurrentQueue(concurrency: number) {
  /**
   * 批量执行任务，保持最多 concurrency 个任务同时运行
   * @param tasks - 任务工厂函数数组，每个函数返回一个 Promise
   * @param onProgress - 每完成一个任务时的回调
   */
  const execute = async <T>(
    tasks: (() => Promise<T>)[],
    onProgress?: (completed: number, total: number) => void,
  ): Promise<T[]> => {
    const total = tasks.length;
    const results: T[] = new Array(total);
    let index = 0;
    let completed = 0;

    const worker = async (): Promise<void> => {
      while (index < total) {
        const currentIndex = index++;
        results[currentIndex] = await tasks[currentIndex]();
        completed++;
        onProgress?.(completed, total);
      }
    };

    const workers = Array.from(
      { length: Math.min(concurrency, total) },
      () => worker(),
    );

    await Promise.all(workers);
    return results;
  };

  return { execute };
}
