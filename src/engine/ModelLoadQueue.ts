export class ModelLoadQueue {
  constructor(private readonly concurrency = 1) {}

  async run<T>(tasks: Array<() => Promise<T>>): Promise<T[]> {
    const results: T[] = [];
    const workers = Array.from(
      { length: Math.max(1, this.concurrency) },
      async () => {
        while (tasks.length > 0) {
          const task = tasks.shift();
          if (!task) {
            return;
          }

          results.push(await task());
        }
      },
    );

    await Promise.all(workers);
    return results;
  }
}
