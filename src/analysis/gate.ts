/**
 * A two-priority serial gate for engine work. Background analysis shares one
 * engine worker with everything the user is waiting on (opening a review,
 * deepening a position), so all analysis engine calls flow through here one
 * at a time — and user-priority work always runs before queued background
 * work. The opponent's own calls do not pass through this gate: they go
 * straight to the worker, waiting behind at most the one in-flight analysis
 * call (the queue yields between calls by design).
 */

export type AnalysisPriority = 'user' | 'background';

export interface PriorityGate {
  run<T>(priority: AnalysisPriority, work: () => Promise<T>): Promise<T>;
}

interface Task {
  readonly work: () => Promise<unknown>;
  readonly resolve: (value: unknown) => void;
  readonly reject: (error: unknown) => void;
}

export function createPriorityGate(): PriorityGate {
  const user: Task[] = [];
  const background: Task[] = [];
  let pumping = false;

  async function pump(): Promise<void> {
    if (pumping) {
      return;
    }
    pumping = true;
    try {
      for (;;) {
        const task = user.shift() ?? background.shift();
        if (!task) {
          return;
        }
        try {
          task.resolve(await task.work());
        } catch (error) {
          task.reject(error);
        }
      }
    } finally {
      pumping = false;
    }
  }

  return {
    run<T>(priority: AnalysisPriority, work: () => Promise<T>): Promise<T> {
      return new Promise<T>((resolve, reject) => {
        const queue = priority === 'user' ? user : background;
        queue.push({
          work,
          resolve: (value) => resolve(value as T),
          reject,
        });
        void pump();
      });
    },
  };
}
