/**
 * TODO WIP
 * refactor:
 * 1. typescript-class-helpers
 * 2. ng2-rest
 * 3. ng2-logger
 */
class GlobalStorageClass {
  private static instance: GlobalStorageClass;

  private store = new Map<string, any>();

  private constructor() {}

  static getInstance(): GlobalStorageClass {
    if (!this.instance) {
      this.instance = new GlobalStorageClass();
    }
    return this.instance;
  }

  set<T>(path: string, value: T): void {
    this.store.set(path, value);
  }

  get<T>(path: string): T | undefined {
    return this.store.get(path);
  }

  update<T>(path: string, updater: (prev: T | undefined) => T): T {
    const prev = this.store.get(path);
    const next = updater(prev);
    this.store.set(path, next);
    return next;
  }
}

export const GlobalStorage = GlobalStorageClass.getInstance();
