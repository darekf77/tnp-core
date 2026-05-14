import { EventEmitter, once } from 'node:events'; // @backend

export namespace UtilsWaitNotifier {
  export interface NotifierOptions {
    checkIfAwakeEveryMS?: number;
    exitTimeoutMs?: number | 'Infinite';
  }

  export function getNotifier(options: NotifierOptions = {}) {
    //#region @backend
    const { checkIfAwakeEveryMS = 5000, exitTimeoutMs = 'Infinite' } = options;

    const emitter = new EventEmitter();

    let isWaiting = false;
    let keepAliveInterval: NodeJS.Timeout | undefined;
    let timeout: NodeJS.Timeout | undefined;

    function cleanup() {
      isWaiting = false;

      if (keepAliveInterval) {
        clearInterval(keepAliveInterval);
        keepAliveInterval = undefined;
      }

      if (timeout) {
        clearTimeout(timeout);
        timeout = undefined;
      }
    }
    //#endregion

    return {
      next(): void {
        //#region @backendFunc
        if (!isWaiting) {
          return;
        }

        emitter.emit('notify');
        //#endregion
      },

      async wait(): Promise<void> {
        //#region @backendFunc
        if (isWaiting) {
          throw new Error('Notifier is already waiting');
        }

        isWaiting = true;

        keepAliveInterval = setInterval(() => {
          // intentionally empty
          // keeps Node.js event loop alive
        }, checkIfAwakeEveryMS);

        try {
          if (exitTimeoutMs === 'Infinite') {
            await once(emitter, 'notify');
            return;
          }

          await Promise.race([
            once(emitter, 'notify'),
            new Promise<never>((_, reject) => {
              timeout = setTimeout(() => {
                reject(
                  new Error(`Notifier wait timeout after ${exitTimeoutMs}ms`),
                );
              }, exitTimeoutMs);
            }),
          ]);
        } finally {
          cleanup();
        }
        //#endregion
      },

      get isWaiting(): boolean {
        //#region @backendFunc
        return isWaiting;
        //#endregion
      },
    };
  }
}
