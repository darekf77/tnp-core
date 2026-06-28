import { chalk } from './core-imports';
import { Helpers } from './helpers';

export namespace UtilsTime {
  //#region format duration
  export const formatDuration = (milliseconds: number): string => {
    const absMs = Math.abs(milliseconds);

    const ms = absMs % 1000;
    const totalSeconds = Math.floor(absMs / 1000);

    const seconds = totalSeconds % 60;
    const totalMinutes = Math.floor(totalSeconds / 60);

    const minutes = totalMinutes % 60;
    const hours = Math.floor(totalMinutes / 60);

    const parts: string[] = [];

    if (hours > 0) {
      parts.push(`${hours}h`);
    }

    if (minutes > 0) {
      parts.push(`${minutes}min`);
    }

    if (seconds > 0) {
      parts.push(`${seconds}s`);
    }

    // show ms:
    // - always when < 1s
    // - otherwise only if there is remainder
    if (ms > 0 || parts.length === 0) {
      parts.push(`${ms}ms`);
    }

    return parts.join(', ');
  };
  //#endregion

  //#region wait
  export const wait = (second: number): Promise<void> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve(void 0);
      }, second * 1000);
    });
  };
  //#endregion

  //#region wait miliseconds
  export const waitMilliseconds = (milliseconds: number): Promise<void> => {
    // Helpers.taskStarted(`Waiting ${milliseconds} milliseconds...`);
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // Helpers.taskDone(`Done waiting ${milliseconds} milliseconds`);
        resolve(void 0);
      }, milliseconds);
    });
  };
  //#endregion

  //#region  mesure execution helpers
  export interface MeasureOptions {
    hideLogs?: boolean;
  }

  export interface ExecutionTimeResult {
    readonly milliseconds: number;
    readonly seconds: number;
    readonly minutes: number;
    readonly human: string;
  }

  function createResult(
    description: string,
    durationMs: number,
    options?: MeasureOptions,
  ): ExecutionTimeResult {
    const seconds = durationMs / 1000;
    const minutes = seconds / 60;

    const human =
      durationMs < 1000
        ? `${durationMs.toFixed(2)}ms`
        : seconds < 60
          ? `${seconds.toFixed(2)}s`
          : `${minutes.toFixed(2)}min`;

    if (!options?.hideLogs) {
      Helpers.taskDone(
        `Execution time for "${chalk.bold(description)}": ${chalk.bold(human)}`,
      );
    }

    return {
      milliseconds: durationMs,
      seconds,
      minutes,
      human,
    };
  }
  //#endregion

  //#region mesure execution time
  export const mesureExecutionTime = async <T>(
    description: string,
    functionToExecute: () => Promise<T>,
    options?: MeasureOptions,
  ): Promise<ExecutionTimeResult> => {
    if (!options?.hideLogs) {
      Helpers.taskStarted(
        `Starting ${chalk.bold(description)} (measuring time)`,
      );
    }

    const start = process.hrtime.bigint();

    await functionToExecute();

    const end = process.hrtime.bigint();

    const durationMs = Number(end - start) / 1_000_000;

    return createResult(description, durationMs, options);
  };
  //#endregion

  //#region mesure execution time sync
  export const mesureExecutionTimeSync = <T>(
    description: string,
    functionToExecute: () => T,
    options?: MeasureOptions,
  ): ExecutionTimeResult => {
    if (!options?.hideLogs) {
      Helpers.taskStarted(
        `Starting ${chalk.bold(description)} (measuring time)`,
      );
    }

    const start = process.hrtime.bigint();

    functionToExecute();

    const end = process.hrtime.bigint();

    const durationMs = Number(end - start) / 1_000_000;

    return createResult(description, durationMs, options);
  };
  //#endregion
}
