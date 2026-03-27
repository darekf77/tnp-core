//#region imports
import 'reflect-metadata';
import { ChildProcess } from 'child_process';
import * as crypto from 'crypto'; // @backend
import type { WriteStream } from 'fs';

import { _, crossPlatformPath } from './core-imports';
import { fse } from './core-imports';
import { FilePathMetaData } from './utils';
import { UtilsOs } from './utils-os';
import { UtilsTerminal } from './utils-terminal';

import { Helpers } from './index';

//#endregion

/**
 * Utils for logging ChildProcess output to files.
 * - logging stdout and stderr to files
 * - real-time monitoring of output
 * - special event callbacks on specific output strings
 * - caching last N lines of output for quick access
 */
export namespace UtilsProcessLogger {
  //#region utils process / process file logger options
  export interface ProcessFileLoggerOptions extends Record<
    string,
    string | number | boolean | undefined
  > {
    name: string;
    id?: string | number;
    pid?: number;
    ppid?: number;
    hash?: string;
    utime?: string;
  }
  //#endregion

  //#region utils process / special event in process logger
  export interface SpecialEventInProcessLogger {
    stdout?: {
      stringInStream: string;
      callback: (data: string) => void;
    }[];
    stderr?: {
      stringInStream: string;
      callback: (data: string) => void;
    }[];
  }
  //#endregion

  //#region utils process / constants
  const dummyFilename = 'file.log';

  export const baseDirTaonProcessLogs = () =>
    crossPlatformPath([UtilsOs.getRealHomeDir(), '.taon', 'log-files-for']);
  //#endregion

  //#region utils process / get log files
  export const getLogsFiles = <
    T extends ProcessFileLoggerOptions = ProcessFileLoggerOptions,
  >(
    options: T,
    baseDir: string,
  ): string[] => {
    //#region @backendFunc
    if (!fse.existsSync(baseDir)) return [];
    const files = fse.readdirSync(baseDir);
    return files
      .filter(filesBasename => {
        const processName = FilePathMetaData.embedData(options, dummyFilename, {
          skipAddingBasenameAtEnd: true,
        });

        return (
          filesBasename.startsWith(processName) &&
          filesBasename.endsWith('.log')
        );
      })
      .map(f => crossPlatformPath([baseDir, f]));
    //#endregion
  };
  //#endregion

  //#region utils process / process file logger class
  /**
   * Logs the stdout and stderr of a ChildProcess to a file.
   */
  export class ProcessFileLogger<
    T extends ProcessFileLoggerOptions = ProcessFileLoggerOptions,
  > {
    //#region fields & getters
    private _logFilePath: string | null = null;

    private writeStream: WriteStream | null = null;

    private _processLogFilename: string | null = null;

    private lastNLinesFromStderr: string[] = [];

    private lastNLinesFromStdout: string[] = [];

    private lastNLinesFromOfOutput: string[] = [];

    public get processLogFilename(): string | null {
      return this._processLogFilename;
    }

    public get processLogAbsFilePath(): string | null {
      return this._logFilePath;
    }
    //#endregion

    //#region constructor
    constructor(
      /**
       * Options used to generate the log file name.
       */
      private dataForFilename: T,
      private options?: {
        baseDir?: string;
        specialEvent?: SpecialEventInProcessLogger;
      },
    ) {
      //#region @backend
      this.options = options || {};
      this.options.baseDir = this.options.baseDir || baseDirTaonProcessLogs();

      try {
        fse.mkdirSync(this.options.baseDir, { recursive: true });
      } catch (error) {
        Helpers.warn(
          `[ProcessFileLogger]: Could not create log directory: ${this.options.baseDir}`,
        );
      }
      //#endregion
    }
    //#endregion

    //#region start logging
    startLogging(
      proc: ChildProcess,
      cacheCallback?: {
        /**
         * @default 40
         */
        cacheLinesMax?: number;
        /**
         * Throttle in ms for callback update()
         */
        throttleMs?: number;
        /**
         * Special callback function for saving stuff in db/memory or elsewhere
         */
        update: (opt: {
          outputLines: string;
          stderrLines: string;
          stdoutLines: string;
        }) => void;
      },
    ): void {
      //#region @backendFunc
      const options = _.cloneDeep(this.dataForFilename);
      const utime = options.utime
        ? options.utime
        : new Date().toISOString().replace(/[:.]/g, '-');

      const hash = options.hash
        ? options.hash
        : crypto.randomBytes(4).toString('hex');

      options.utime = utime;
      options.hash = hash;

      const filenameWithMetadata = FilePathMetaData.embedData(
        options,
        dummyFilename,
        {
          skipAddingBasenameAtEnd: true,
        },
      );

      this._processLogFilename = `${filenameWithMetadata}.log`;
      this._logFilePath = crossPlatformPath([
        this.options.baseDir,
        this._processLogFilename,
      ]);

      this.writeStream = fse.createWriteStream(this._logFilePath, {
        flags: 'a',
      });

      if (cacheCallback) {
        cacheCallback.cacheLinesMax = cacheCallback.cacheLinesMax || 40;
        cacheCallback.throttleMs = cacheCallback.throttleMs || 1000;
        this.lastNLinesFromOfOutput = [];
        this.lastNLinesFromStderr = [];
        this.lastNLinesFromStdout = [];
      }

      const throttledUpdate = cacheCallback
        ? _.throttle(() => {
            cacheCallback.update({
              outputLines: this.lastNLinesFromOfOutput.join(''),
              stderrLines: this.lastNLinesFromStderr.join(''),
              stdoutLines: this.lastNLinesFromStdout.join(''),
            });
          }, cacheCallback.throttleMs)
        : null;

      const update = (data: Buffer | string, type: 'stdout' | 'stderr') => {
        if (cacheCallback) {
          this.lastNLinesFromOfOutput.push(data.toString());
          if (type === 'stdout') {
            this.lastNLinesFromStdout.push(data.toString());
          }
          if (type === 'stderr') {
            this.lastNLinesFromStderr.push(data.toString());
          }

          // trim stuff
          this.lastNLinesFromOfOutput = this.lastNLinesFromOfOutput.slice(
            -cacheCallback.cacheLinesMax,
          );
          this.lastNLinesFromStdout = this.lastNLinesFromStdout.slice(
            -cacheCallback.cacheLinesMax,
          );
          this.lastNLinesFromStderr = this.lastNLinesFromStderr.slice(
            -cacheCallback.cacheLinesMax,
          );
          throttledUpdate();
        }

        if (!this.writeStream) return;

        if (type === 'stdout') {
          // ! TODO @LAST add throttled for this
          for (const c of this.options.specialEvent?.stdout || []) {
            if (data?.toString().includes(c.stringInStream || '')) {
              c.callback && c.callback(data.toString());
            }
          }
        }

        if (type === 'stderr') {
          // ! TODO @LAST add throttled for this
          for (const c of this.options.specialEvent?.stderr || []) {
            if (data?.toString().includes(c.stringInStream || '')) {
              c.callback && c.callback(data.toString());
            }
          }
        }

        this.writeStream.write(
          `[${new Date().toISOString()}] [${type}] ${data.toString()}`,
        );
      };

      proc.stdout?.on('data', d => update(d, 'stdout'));
      proc.stderr?.on('data', d => update(d, 'stderr'));

      // prevent leaks
      proc.on('close', () => this.stopLogging());
      proc.on('exit', () => this.stopLogging());
      proc.on('error', () => this.stopLogging());
      //#endregion
    }
    //#endregion

    //#region stop logging
    stopLogging(): void {
      //#region @backendFunc
      if (this.writeStream) {
        this.writeStream.end();
        this.writeStream = null;
      }
      //#endregion
    }
    //#endregion

    //#region external update
    /**
     * Externally update the log file with additional stdout/stderr data.
     */
    update(stdout: string, stderr?: string): void {
      //#region @backendFunc
      if (!this.writeStream) return;
      if (stdout)
        this.writeStream.write(
          `[${new Date().toISOString()}] [stdout] ${stdout}\n`,
        );
      if (stderr)
        this.writeStream.write(
          `[${new Date().toISOString()}] [stderr] ${stderr}\n`,
        );
      //#endregion
    }
    //#endregion
  }
  //#endregion

  //#region utils process / create sticky top box
  /**
   * Perfect for real-time logs with a sticky top box message.
   *
   * Example:
   * const stickyBox = UtilsProcessLogger.createStickyTopBox('My Sticky Message');
   * stickyBox.update('Initial log content...');
   *
   * // Later updates
   * stickyBox.update('More log content...');
   *
   * // To clear the sticky box and logs
   * stickyBox.clear();
   */
  export const createStickyTopBox = (message: string) => {
    //#region @backendFunc
    const readline = require('readline');
    const boxLines = buildBox(message);
    let logBuffer: string[] = [];
    let terminalHeight = UtilsTerminal.getTerminalHeight();

    // auto update height when user resizes terminal
    process.stdout.on('resize', () => {
      terminalHeight = UtilsTerminal.getTerminalHeight();
      render();
    });

    function update(content: string): void {
      logBuffer = content.split(/\r?\n/);
      render();
    }

    function render(): void {
      const width = process.stdout.columns || 80;
      const height = Math.max(UtilsTerminal.getTerminalHeight(), 10);
      const boxHeight = boxLines.length + 2; // header + blank line
      const availableHeight = Math.max(1, height - boxHeight - 1);

      // split logs into visual lines based on terminal width
      const wrapped: string[] = [];
      for (const line of logBuffer) {
        if (line.length <= width) {
          wrapped.push(line);
        } else {
          // wrap very long lines manually
          for (let i = 0; i < line.length; i += width) {
            wrapped.push(line.slice(i, i + width));
          }
        }
      }

      // keep only what fits vertically
      const visibleLogs = wrapped.slice(-availableHeight);

      const readline = require('readline');
      readline.cursorTo(process.stdout, 0, 0);
      readline.clearScreenDown(process.stdout);

      process.stdout.write(boxLines.join('\n') + '\n\n');
      process.stdout.write(visibleLogs.join('\n') + '\n');
    }

    function clear(): void {
      readline.cursorTo(process.stdout, 0, 0);
      readline.clearScreenDown(process.stdout);
    }

    return { update, clear };
    //#endregion
  };

  const buildBox = (message: string): string[] => {
    //#region @backendFunc
    const width = process.stdout.columns || 80;
    const topBottom = '─'.repeat(width);

    const messageLines = message.split(/\r?\n/).map(line => {
      const inner = ` ${line.trim()} `;
      const pad = Math.max(0, width - inner.length - 2);
      return `│${inner}${' '.repeat(pad)}│`;
    });

    return [topBottom, ...messageLines, topBottom];
    //#endregion
  };
  //#endregion
}
