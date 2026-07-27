import {
  exec,
  type ChildProcess,
  type ExecException,
  type ExecOptions,
} from 'node:child_process';

import type { CancellationToken, OutputChannel, Progress } from 'vscode';

import { UtilsProgress } from './utils-progress';

export type ExecVscodeProgress = {
  value?: number;
  message?: string;
  type?: 'info' | 'warning' | 'error' | 'event';
};

export type ExecAsyncVscodeOptions = {
  command: string;
  cwd?: string;
  env?: NodeJS.ProcessEnv;

  outputChannel?: OutputChannel;

  progress?: Progress<{
    message?: string;
    increment?: number;
  }>;

  cancellationToken?: CancellationToken;

  showCommand?: boolean;
  showOutput?: boolean;

  /**
   * Maximum stdout or stderr buffered by exec().
   *
   * exec() can terminate the child when this is exceeded.
   */
  maxBuffer?: number;

  /**
   * Called for every ordinary stdout line.
   */
  onStdoutLine?: (line: string) => void;

  /**
   * Called for every ordinary stderr line.
   */
  onStderrLine?: (line: string) => void;

  /**
   * Parses a structured progress line.
   *
   * Return undefined when the line is ordinary output.
   */
  parseProgress?: (line: string) => ExecVscodeProgress | undefined;
};

export type ExecAsyncVscodeResult = {
  stdout: string;
  stderr: string;
  exitCode: number;
};

export class ExecAsyncVscodeError extends Error {
  public readonly command: string;

  public readonly cwd?: string;

  public readonly stdout: string;

  public readonly stderr: string;

  public readonly exitCode?: number;

  public readonly signal?: NodeJS.Signals;

  constructor(options: {
    command: string;
    cwd?: string;
    stdout: string;
    stderr: string;
    exitCode?: number;
    signal?: NodeJS.Signals;
    cause?: unknown;
  }) {
    const details = [
      `Command failed: ${options.command}`,
      options.cwd ? `cwd: ${options.cwd}` : undefined,
      typeof options.exitCode === 'number'
        ? `exit code: ${options.exitCode}`
        : undefined,
      options.signal ? `signal: ${options.signal}` : undefined,
      options.stderr.trim() ? `stderr:\n${options.stderr.trim()}` : undefined,
    ]
      .filter(Boolean)
      .join('\n');

    super(details, {
      cause: options.cause,
    });

    this.name = 'ExecAsyncVscodeError';
    this.command = options.command;
    this.cwd = options.cwd;
    this.stdout = options.stdout;
    this.stderr = options.stderr;
    this.exitCode = options.exitCode;
    this.signal = options.signal;
  }
}

export function execAsyncVscode(
  options: ExecAsyncVscodeOptions,
): Promise<ExecAsyncVscodeResult> {
  const {
    command,
    cwd,
    outputChannel,
    progress,
    cancellationToken,
    showCommand = true,
    showOutput = true,
    maxBuffer = 100 * 1024 * 1024,
    parseProgress = UtilsProgress.parseTaonProgressLine,
  } = options;

  return new Promise((resolve, reject) => {
    let stdout = '';
    let stderr = '';

    let previousProgress = 0;
    let settled = false;

    if (showCommand) {
      outputChannel?.appendLine(`> ${command}`);

      if (cwd) {
        outputChannel?.appendLine(`cwd: ${cwd}`);
      }
    }

    const execOptions: ExecOptions = {
      cwd,
      env: {
        ...process.env,
        ...options.env,
      },
      windowsHide: true,
      maxBuffer,
    };

    const proc = exec(
      command,
      execOptions,
      (
        error: ExecException | null,
        finalStdout: string,
        finalStderr: string,
      ) => {
        if (settled) {
          return;
        }

        settled = true;
        cancellationSubscription?.dispose();

        /*
         * The data listeners normally filled these already. Using the callback
         * values as a fallback also covers unusual stream situations.
         */
        stdout ||= finalStdout ?? '';
        stderr ||= finalStderr ?? '';

        if (error) {
          reject(
            new ExecAsyncVscodeError({
              command,
              cwd,
              stdout,
              stderr,
              exitCode: typeof error.code === 'number' ? error.code : undefined,
              signal: error.signal ?? undefined,
              cause: error,
            }),
          );

          return;
        }

        resolve({
          stdout,
          stderr,
          exitCode: 0,
        });
      },
    );

    const stdoutReader = createLineReader(line => {
      stdout += `${line}\n`;

      const progressData = parseProgress?.(line);

      if (progressData) {
        reportProgress(progressData);
        return;
      }

      options.onStdoutLine?.(line);

      if (showOutput && line) {
        outputChannel?.appendLine(line);
      }
    });

    const stderrReader = createLineReader(line => {
      stderr += `${line}\n`;

      const progressData = parseProgress?.(line);

      if (progressData) {
        reportProgress(progressData);
        return;
      }

      options.onStderrLine?.(line);

      if (showOutput && line) {
        outputChannel?.appendLine(`[stderr] ${line}`);
      }
    });

    proc.stdout?.setEncoding('utf8');
    proc.stderr?.setEncoding('utf8');

    proc.stdout?.on('data', stdoutReader.push);
    proc.stderr?.on('data', stderrReader.push);

    proc.stdout?.on('end', stdoutReader.flush);
    proc.stderr?.on('end', stderrReader.flush);

    proc.stdout?.on('error', error => {
      outputChannel?.appendLine(
        `[stdout stream error] ${error.stack ?? error.message}`,
      );
    });

    proc.stderr?.on('error', error => {
      outputChannel?.appendLine(
        `[stderr stream error] ${error.stack ?? error.message}`,
      );
    });

    proc.once('error', error => {
      outputChannel?.appendLine(
        `[process error] ${error.stack ?? error.message}`,
      );
    });

    const cancellationSubscription = cancellationToken?.onCancellationRequested(
      () => {
        if (settled) {
          return;
        }

        outputChannel?.appendLine(`Cancelling command: ${command}`);

        terminateChild(proc);
      },
    );

    function reportProgress(data: ExecVscodeProgress): void {
      const message = data.message?.trim();

      if (typeof data.value === 'number') {
        const currentProgress = Math.max(
          previousProgress,
          Math.min(100, data.value),
        );

        progress?.report({
          message,
          increment: currentProgress - previousProgress,
        });

        previousProgress = currentProgress;
      } else if (message) {
        progress?.report({
          message,
        });
      }

      if (message && showOutput) {
        outputChannel?.appendLine(`[${data.type ?? 'event'}] ${message}`);
      }
    }
  });
}

function terminateChild(proc: ChildProcess): void {
  if (!proc.pid || proc.killed) {
    return;
  }

  if (process.platform === 'win32') {
    /*
     * exec() creates a shell. Killing only proc.kill() can leave descendants
     * such as Node/ONNX alive, so terminate the process tree.
     */
    exec(
      `taskkill /pid ${proc.pid} /t /f`,
      {
        windowsHide: true,
      },
      () => undefined,
    );

    return;
  }

  proc.kill('SIGTERM');
}

function createLineReader(onLine: (line: string) => void): {
  push: (chunk: string | Buffer) => void;
  flush: () => void;
} {
  let pending = '';

  const push = (chunk: string | Buffer): void => {
    pending += chunk.toString();

    const lines = pending.split(/\r\n|\n|\r/);
    pending = lines.pop() ?? '';

    for (const line of lines) {
      onLine(line);
    }
  };

  const flush = (): void => {
    if (!pending) {
      return;
    }

    onLine(pending);
    pending = '';
  };

  return {
    push,
    flush,
  };
}
