import type { ChildProcess } from 'child_process';

import { Observable } from 'rxjs';
import { Helpers } from './helpers';
import { chalk, child_process } from './core-imports';

export interface StartAsyncProcOptions {
  uniqueName?: string;
  cwd?: string;
  showCommand?: boolean;
  extractFromLine?: (string | Function)[];
  outputLineReplace?: (line: string) => string;

  resolvePromiseMsg_stdout?: string | string[];
  resolvePromiseMsg_stderr?: string | string[];
  resolvePromiseMsgCallback_stdout?: () => void | Promise<void>;
  resolvePromiseMsgCallback_stderr?: () => void | Promise<void>;
  resolvePromiseMsgCallback_anystd?: () => void | Promise<void>;

  hideOutput_stdout?: boolean;
  hideOutput_stderr?: boolean;
  env?: NodeJS.ProcessEnv;
  prefix?: string | boolean;

  tryAgainWhenFailAfter?: number;
  askToTryAgainOnError?: boolean;
  biggerBuffer?: boolean; // Legacy, ignored by spawn()
  rebuildOnChange?: Observable<any>;

  onChildProcessChange?: (childProcess: ChildProcess) => void;
  outputBuffer?: string[];
  outputBufferMaxSize?: number;

  signal?: AbortSignal;
}

export type AsyncProcTask = Promise<void> & {
  cancel(): Promise<void>;
};

export const startAsyncProc = (
  command: string,
  cwd: string,
  options: Partial<StartAsyncProcOptions> = {},
): AsyncProcTask => {
  //#region @backendFunc

  const {
    uniqueName,
    showCommand = false,
    hideOutput_stdout = false,
    hideOutput_stderr = false,
    extractFromLine,
    outputLineReplace,
    resolvePromiseMsgCallback_stdout,
    resolvePromiseMsgCallback_stderr,
    resolvePromiseMsgCallback_anystd,
    onChildProcessChange,
    outputBuffer,
    rebuildOnChange,
    askToTryAgainOnError = false,
    tryAgainWhenFailAfter,
    signal,
  } = options;

  type StreamName = 'stdout' | 'stderr';

  const normalizeMessages = (value?: string | string[]): string[] =>
    (Array.isArray(value) ? value : value ? [value] : []).filter(Boolean);

  const stdoutMessages = normalizeMessages(options.resolvePromiseMsg_stdout);
  const stderrMessages = normalizeMessages(options.resolvePromiseMsg_stderr);

  const hasMessages = stdoutMessages.length > 0 || stderrMessages.length > 0;

  const maxMessageLength = Math.max(
    0,
    ...stdoutMessages.map(m => m.length),
    ...stderrMessages.map(m => m.length),
  );

  // Retain enough characters to detect matches spanning chunks.
  const matchTailLength = Math.max(0, maxMessageLength - 1);

  const outputBufferMaxSize = Math.max(1, options.outputBufferMaxSize ?? 1000);

  const env = {
    ...process.env,
    FORCE_COLOR: '1',
    NODE_ENV: 'development',
    ...options.env,
  };

  command = Helpers._fixCommand(command);

  const prefix =
    options.prefix === true
      ? chalk.bold.gray(`[${uniqueName || command.slice(0, 20)}]`)
      : typeof options.prefix === 'string'
        ? options.prefix
        : '';

  const abortController = new AbortController();
  const abortSignal = abortController.signal;

  const abortError = () => {
    const error = new Error(`Process cancelled: ${uniqueName || command}`);
    error.name = 'AbortError';
    return error;
  };

  const toError = (error: unknown): Error =>
    error instanceof Error ? error : new Error(String(error));

  const throwIfCancelled = () => {
    if (abortSignal.aborted) {
      throw abortError();
    }
  };

  const sleep = (ms: number): Promise<void> =>
    new Promise((resolve, reject) => {
      if (abortSignal.aborted) {
        reject(abortError());
        return;
      }

      const cleanup = () => {
        clearTimeout(timer);
        abortSignal.removeEventListener('abort', onAbort);
      };

      const onAbort = () => {
        cleanup();
        reject(abortError());
      };

      const timer = setTimeout(
        () => {
          cleanup();
          resolve();
        },
        Math.max(0, ms),
      );

      abortSignal.addEventListener('abort', onAbort, {
        once: true,
      });
    });

  const appendOutput = (data: string) => {
    if (!outputBuffer || !data) return;

    outputBuffer.push(data);

    if (outputBuffer.length > outputBufferMaxSize) {
      outputBuffer.splice(0, outputBuffer.length - outputBufferMaxSize);
    }
  };

  type RunHandle = {
    ready: Promise<void>;
    closed: Promise<void>;
    stop: () => Promise<void>;
  };

  let currentRun: RunHandle | undefined;
  let subscription: { unsubscribe(): void } | undefined;
  let debounceTimer: ReturnType<typeof setTimeout> | undefined;

  const spawnRun = (): RunHandle => {
    throwIfCancelled();

    if (showCommand) {
      Helpers.logInfo(`Executing: ${command}\nLocation: ${cwd}`);
    }

    const proc = child_process.spawn(command, {
      cwd,
      env,
      shell: true,
      detached: process.platform !== 'win32',
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let readySettled = false;
    let readinessClaimed = false;
    let closedSettled = false;
    let stopping = false;

    let stdoutTail = '';
    let stderrTail = '';

    let stdoutPending = '';
    let stderrPending = '';

    let resolveReady!: () => void;
    let rejectReady!: (error: Error) => void;
    let resolveClosed!: () => void;

    const ready = new Promise<void>((resolve, reject) => {
      resolveReady = resolve;
      rejectReady = reject;
    });

    // Prevent unhandled rejection when cancellation occurs
    // before the caller begins awaiting readiness.
    void ready.catch(() => {});

    const closed = new Promise<void>(resolve => {
      resolveClosed = resolve;
    });

    const settleReady = (error?: Error) => {
      if (readySettled) return;

      readySettled = true;

      if (error) {
        rejectReady(error);
      } else {
        resolveReady();
      }
    };

    const settleClosed = () => {
      if (closedSettled) return;
      closedSettled = true;
      resolveClosed();
    };

    const writeOutput = (rawText: string, stream: StreamName) => {
      if (!rawText) return;

      const data = Helpers.modifyLineByLine(
        rawText,
        outputLineReplace,
        prefix,
        extractFromLine,
      );

      if (!data) return;

      appendOutput(data);

      if (stream === 'stdout') {
        if (!hideOutput_stdout) {
          process.stdout.write(data);
        }
      } else {
        if (!hideOutput_stderr) {
          process.stderr.write(data);
        }
      }
    };

    const processLines = (rawText: string, stream: StreamName) => {
      const previous = stream === 'stdout' ? stdoutPending : stderrPending;

      const combined = previous + rawText;
      const lines = combined.split(/\r\n|\n|\r/);
      const remainder = lines.pop() ?? '';

      if (stream === 'stdout') {
        stdoutPending = remainder;
      } else {
        stderrPending = remainder;
      }

      for (const line of lines) {
        writeOutput(`${line}\n`, stream);
      }
    };

    const flushOutput = () => {
      writeOutput(stdoutPending, 'stdout');
      writeOutput(stderrPending, 'stderr');

      stdoutPending = '';
      stderrPending = '';
    };

    const handleMatch = async (stream: StreamName) => {
      try {
        if (stream === 'stdout') {
          await resolvePromiseMsgCallback_stdout?.();
        } else {
          await resolvePromiseMsgCallback_stderr?.();
        }

        await resolvePromiseMsgCallback_anystd?.();

        throwIfCancelled();

        if (stopping) {
          throw abortError();
        }

        settleReady();
      } catch (error) {
        settleReady(toError(error));
      }
    };

    const checkReadiness = (rawText: string, stream: StreamName) => {
      if (readinessClaimed || readySettled || stopping || abortSignal.aborted) {
        return;
      }

      const messages = stream === 'stdout' ? stdoutMessages : stderrMessages;

      if (messages.length === 0) return;

      const previous = stream === 'stdout' ? stdoutTail : stderrTail;

      const combined = previous + rawText;

      const matched = messages.some(message => combined.includes(message));

      const tail = matchTailLength > 0 ? combined.slice(-matchTailLength) : '';

      if (stream === 'stdout') {
        stdoutTail = tail;
      } else {
        stderrTail = tail;
      }

      if (!matched) return;

      // Claim synchronously BEFORE awaiting callbacks.
      readinessClaimed = true;

      void handleMatch(stream);
    };

    const handleData = (chunk: Buffer, stream: StreamName) => {
      const rawText = chunk.toString('utf8');

      checkReadiness(rawText, stream);
      processLines(rawText, stream);
    };

    proc.stdout?.on('data', chunk => {
      handleData(chunk, 'stdout');
    });

    proc.stderr?.on('data', chunk => {
      handleData(chunk, 'stderr');
    });

    proc.on('error', error => {
      settleReady(toError(error));
      // 'close' normally follows 'error'.
    });

    proc.on('close', (code, exitSignal) => {
      flushOutput();
      settleClosed();

      if (stopping || abortSignal.aborted) {
        settleReady(abortError());
        return;
      }

      if (readySettled) return;

      // A readiness callback may still be running.
      // Let it finish rather than settling twice.
      if (readinessClaimed) return;

      if (code !== 0) {
        settleReady(
          new Error(
            `Process failed (${code ?? exitSignal ?? 'unknown'}): ${command}`,
          ),
        );
        return;
      }

      if (hasMessages) {
        settleReady(
          new Error(
            `Process exited without expected readiness message: ${command}`,
          ),
        );
        return;
      }

      settleReady();
    });

    let stopPromise: Promise<void> | undefined;

    const stop = (): Promise<void> => {
      if (stopPromise) return stopPromise;

      stopping = true;

      // Settle readiness immediately, even if process
      // shutdown takes longer.
      settleReady(abortError());

      stopPromise = (async () => {
        if (closedSettled) return;

        try {
          if (proc.pid) {
            if (process.platform === 'win32') {
              // Windows requires taskkill to terminate
              // descendants of a shell process.
              const killer = child_process.spawn(
                'taskkill',
                ['/PID', String(proc.pid), '/T', '/F'],
                {
                  stdio: 'ignore',
                  windowsHide: true,
                },
              );

              await new Promise<void>(resolve => {
                killer.once('error', () => resolve());
                killer.once('close', () => resolve());
              });
            } else {
              // Kill the whole detached process group.
              process.kill(-proc.pid, 'SIGKILL');
            }
          }
        } catch {
          try {
            proc.kill('SIGKILL');
          } catch {
            // Already terminated.
          }
        }

        await closed;
      })();

      return stopPromise;
    };

    const run: RunHandle = {
      ready,
      closed,
      stop,
    };

    currentRun = run;

    try {
      onChildProcessChange?.(proc);
    } catch (error) {
      void stop();
      settleReady(toError(error));
    }

    return run;
  };

  const executeWithRetry = async (): Promise<RunHandle> => {
    while (true) {
      throwIfCancelled();

      let run: RunHandle | undefined;

      try {
        run = spawnRun();

        await run.ready;
        throwIfCancelled();

        return run;
      } catch (error) {
        if (run) {
          await run.stop();
        }

        throwIfCancelled();

        if (typeof tryAgainWhenFailAfter === 'number') {
          await sleep(tryAgainWhenFailAfter);
          continue;
        }

        if (askToTryAgainOnError) {
          const retry = await Helpers.questionYesNo(
            `Command failed: ${command}\nTry again?`,
          );

          throwIfCancelled();

          if (retry) continue;
        }

        throw error;
      }
    }
  };

  // Wake-up mechanism for rebuild events.
  let wakeRebuild: (() => void) | undefined;
  let rebuildRequested = false;

  const notifyRebuild = () => {
    rebuildRequested = true;

    if (wakeRebuild) {
      const wake = wakeRebuild;
      wakeRebuild = undefined;
      wake();
    }
  };

  const waitForRebuild = async (): Promise<void> => {
    throwIfCancelled();

    if (rebuildRequested) {
      rebuildRequested = false;
      return;
    }

    await new Promise<void>(resolve => {
      wakeRebuild = resolve;
    });

    throwIfCancelled();
    rebuildRequested = false;
  };

  let resolveTask!: () => void;
  let rejectTask!: (error: Error) => void;
  let taskSettled = false;

  const taskPromise = new Promise<void>((resolve, reject) => {
    resolveTask = resolve;
    rejectTask = reject;
  });

  const settleTask = (error?: Error) => {
    if (taskSettled) return;

    taskSettled = true;

    if (error) {
      rejectTask(error);
    } else {
      resolveTask();
    }
  };

  const cancel = async (): Promise<void> => {
    if (!abortSignal.aborted) {
      abortController.abort();
    }

    subscription?.unsubscribe();

    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = undefined;
    }

    // Wake the rebuild loop so it can exit.
    if (wakeRebuild) {
      const wake = wakeRebuild;
      wakeRebuild = undefined;
      wake();
    }

    // Cancellation before readiness rejects the task.
    // Cancellation after readiness leaves it resolved.
    settleTask(abortError());

    await currentRun?.stop();
  };

  const onExternalAbort = () => {
    void cancel();
  };

  if (signal) {
    if (signal.aborted) {
      void cancel();
    } else {
      signal.addEventListener('abort', onExternalAbort, {
        once: true,
      });
    }
  }

  const runMain = async () => {
    try {
      if (!rebuildOnChange) {
        await executeWithRetry();
        settleTask();
        return;
      }

      // Rebuild mode:
      // 1. Start immediately.
      // 2. Resolve task after first successful readiness.
      // 3. Keep listening for changes.
      // 4. Restart on subsequent changes.

      subscription = rebuildOnChange.subscribe({
        next: () => {
          if (abortSignal.aborted) return;

          if (debounceTimer) {
            clearTimeout(debounceTimer);
          }

          debounceTimer = setTimeout(() => {
            debounceTimer = undefined;
            notifyRebuild();
          }, 500);
        },
        error: error => {
          if (!taskSettled) {
            settleTask(toError(error));
          }
          void cancel();
        },
      });

      // Start first build immediately.
      while (!abortSignal.aborted) {
        if (currentRun) {
          await currentRun.stop();
          currentRun = undefined;
        }

        throwIfCancelled();

        try {
          await executeWithRetry();
          settleTask();
        } catch (error) {
          if (!taskSettled) {
            throw error;
          }

          if (!abortSignal.aborted) {
            console.error(`Rebuild failed: ${uniqueName || command}`, error);
          }
        }

        await waitForRebuild();
      }
    } catch (error) {
      if (!abortSignal.aborted) {
        settleTask(toError(error));
      }
    } finally {
      if (!taskSettled) {
        settleTask(abortError());
      }
    }
  };

  // Start asynchronously, without making the outer
  // function async (so the returned Promise keeps cancel()).
  void runMain();

  const task = taskPromise as AsyncProcTask;
  task.cancel = cancel;

  return task;

  //#endregion
};
