import { dateformat } from './core-imports';
import { GlobalSpinner } from './global-spinner';
import { Helpers } from './helpers';

export interface TaskStats {
  name: string;
  startedAt: number;
  finishedAt?: number;
  totalExpectedSuccessActions: number | undefined;
  successActions: number;
}

export class GlobalTaskManagerClass {
  private static instance: GlobalTaskManagerClass;

  private constructor() {}

  static getInstance(): GlobalTaskManagerClass {
    if (!this.instance) {
      this.instance = new GlobalTaskManagerClass();
    }
    return this.instance;
  }

  private tasks = new Map<string, TaskStats>();

  start(name: string, totalExpectedSuccessActions?: number): void {
    GlobalSpinner.start();
    this.tasks.set(name, {
      name,
      startedAt: Date.now(),
      totalExpectedSuccessActions,
      successActions: 0,
    });
  }

  addProgress(name: string): void {
    this.progress(name, 1);
  }

  protected progress(name: string, bytes: number): void {
    const task = this.tasks.get(name);
    if (!task) return;

    task.successActions += bytes;
  }

  stop(name: string): void {
    GlobalSpinner.stop();
    const task = this.tasks.get(name);
    if (!task) return;

    task.finishedAt = Date.now();

    Helpers.logInfo(`

      [${dateformat(new Date(task.finishedAt))}]
      Process done: ${name}
      Success actions: ${task.successActions}

      `);
  }

  get(name: string): TaskStats {
    return this.tasks.get(name);
  }

  getAll(): TaskStats[] {
    return Array.from(this.tasks.values());
  }
}

export const GlobalTaskManager = GlobalTaskManagerClass.getInstance();
