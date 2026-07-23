import * as util from 'node:util'; // @backend

import { fse, path, os } from './core-imports';

export namespace UtilsStdinStdoutLogger {
  export interface RegisteredAppLogging {
    logFilePath: string;
    unregister: () => void;
  }

  //#region register loggin app
  export const registerFor = (
    workerName: string,
    groupName: string,
  ): RegisteredAppLogging => {
    //#region @backendFunc
    const safeWorkerName = sanitizeFileName(workerName);
    const safeGroupName = sanitizeFileName(groupName);

    const logDirectory = path.join(
      os.homedir(),
      '.taon',
      'log-files-for',
      safeGroupName,
    );

    fse.mkdirSync(logDirectory, {
      recursive: true,
    });

    const logFilePath = path.join(logDirectory, `${safeWorkerName}.log`);

    const originalConsole = {
      log: console.log.bind(console),
      info: console.info.bind(console),
      warn: console.warn.bind(console),
      error: console.error.bind(console),
      debug: console.debug.bind(console),
      trace: console.trace.bind(console),
    };

    const originalStdoutWrite = process.stdout.write.bind(process.stdout);
    const originalStderrWrite = process.stderr.write.bind(process.stderr);

    let writingToLogFile = false;
    let unregistered = false;

    const appendSynchronously = (
      stream: 'stdout' | 'stderr' | 'system',
      content: string,
    ): void => {
      if (writingToLogFile || unregistered || content.length === 0) {
        return;
      }

      writingToLogFile = true;

      try {
        const timestamp = new Date().toISOString();

        const normalizedContent = content.endsWith('\n')
          ? content.slice(0, -1)
          : content;

        const lines = normalizedContent.split(/\r?\n/);

        const formatted = lines
          .map(line => `[${timestamp}] [${stream}] ${line}`)
          .join('\n');

        fse.appendFileSync(logFilePath, `${formatted}\n`, {
          encoding: 'utf8',
          flag: 'a',
        });
      } catch (error) {
        // Do not use console here because console is patched.
        originalStderrWrite(
          `Could not write to log file "${logFilePath}": ${String(error)}\n`,
        );
      } finally {
        writingToLogFile = false;
      }
    };

    const formatConsoleArguments = (args: unknown[]): string => {
      return util.formatWithOptions(
        {
          colors: false,
          depth: 10,
          maxArrayLength: 1_000,
          maxStringLength: 100_000,
          breakLength: 160,
          compact: 3,
        },
        ...args,
      );
    };

    const patchConsoleMethod = (
      level: keyof typeof originalConsole,
      stream: 'stdout' | 'stderr',
    ): void => {
      console[level] = (...args: unknown[]): void => {
        appendSynchronously(
          stream,
          `[console.${level}] ${formatConsoleArguments(args)}`,
        );

        originalConsole[level](...args);
      };
    };

    patchConsoleMethod('log', 'stdout');
    patchConsoleMethod('info', 'stdout');
    patchConsoleMethod('debug', 'stdout');
    patchConsoleMethod('warn', 'stderr');
    patchConsoleMethod('error', 'stderr');
    patchConsoleMethod('trace', 'stderr');

    process.stdout.write = createPatchedWrite(
      'stdout',
      originalStdoutWrite,
      appendSynchronously,
    );

    process.stderr.write = createPatchedWrite(
      'stderr',
      originalStderrWrite,
      appendSynchronously,
    );

    const uncaughtExceptionHandler = (error: Error): void => {
      appendSynchronously(
        'system',
        `[uncaughtException]\n${error.stack || error.message || String(error)}`,
      );
    };

    const unhandledRejectionHandler = (reason: unknown): void => {
      appendSynchronously(
        'system',
        `[unhandledRejection]\n${formatConsoleArguments([reason])}`,
      );
    };

    process.on('uncaughtExceptionMonitor', uncaughtExceptionHandler);
    process.on('unhandledRejection', unhandledRejectionHandler);

    appendSynchronously(
      'system',
      [
        'Logging registered',
        `worker=${workerName}`,
        `pid=${process.pid}`,
        `cwd=${process.cwd()}`,
        `node=${process.version}`,
      ].join(' '),
    );

    const unregister = (): void => {
      if (unregistered) {
        return;
      }

      appendSynchronously(
        'system',
        `Logging unregistered worker=${workerName} pid=${process.pid}`,
      );

      console.log = originalConsole.log;
      console.info = originalConsole.info;
      console.warn = originalConsole.warn;
      console.error = originalConsole.error;
      console.debug = originalConsole.debug;
      console.trace = originalConsole.trace;

      process.stdout.write = originalStdoutWrite;
      process.stderr.write = originalStderrWrite;

      process.off('uncaughtExceptionMonitor', uncaughtExceptionHandler);
      process.off('unhandledRejection', unhandledRejectionHandler);

      unregistered = true;
    };

    return {
      logFilePath,
      unregister,
    };
    //#endregion
  };

  //#region create patched write
  const createPatchedWrite = (
    stream: 'stdout' | 'stderr',
    originalWrite: typeof process.stdout.write,
    appendSynchronously: (
      stream: 'stdout' | 'stderr' | 'system',
      content: string,
    ) => void,
  ): typeof process.stdout.write => {
    //#region @backendFunc
    return function patchedWrite(
      chunk: Uint8Array | string,
      encodingOrCallback?: BufferEncoding | ((error?: Error | null) => void),
      callback?: (error?: Error | null) => void,
    ): boolean {
      const encoding =
        typeof encodingOrCallback === 'string' ? encodingOrCallback : undefined;

      const content =
        typeof chunk === 'string'
          ? chunk
          : Buffer.from(chunk).toString(encoding ?? 'utf8');

      appendSynchronously(stream, content);

      if (typeof encodingOrCallback === 'function') {
        return originalWrite(chunk, encodingOrCallback);
      }

      if (encodingOrCallback !== undefined) {
        return originalWrite(chunk, encodingOrCallback, callback);
      }

      return originalWrite(chunk, callback);
    } as typeof process.stdout.write;
    //#endregion
  };
  //#endregion

  //#region sanitize filename
  const sanitizeFileName = (value: string): string => {
    const sanitized = value
      .trim()
      .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');

    return sanitized || 'unnamed-worker';
  };
  //#endregion
}
