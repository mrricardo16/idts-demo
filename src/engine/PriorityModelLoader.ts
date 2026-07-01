import type { PriorityModelLoadJob, PriorityModelLoadPriority } from "../types/twin";

const priorityWeight: Record<PriorityModelLoadPriority, number> = {
  "selected-device": 0,
  "visible-area": 1,
  "neighbor-prefetch": 2,
  background: 3,
};

export class PriorityModelLoader {
  private queue: PriorityModelLoadJob[] = [];

  enqueue(job: PriorityModelLoadJob): void {
    this.queue = this.queue.filter((item) => item.jobId !== job.jobId);
    this.queue.push(job);
    this.queue.sort((a, b) => priorityWeight[a.priority] - priorityWeight[b.priority]);
  }

  enqueueMany(jobs: PriorityModelLoadJob[]): void {
    for (const job of jobs) {
      this.enqueue(job);
    }
  }

  next(): PriorityModelLoadJob | undefined {
    return this.queue.shift();
  }

  clear(): void {
    this.queue = [];
  }

  snapshot(): PriorityModelLoadJob[] {
    return [...this.queue];
  }
}
