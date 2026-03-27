//#region imports
import 'reflect-metadata';
import { ChildProcess } from 'child_process';

import { config } from './config';
import { _, crossPlatformPath, chalk } from './core-imports';
import { spawn } from './core-imports';
import { Helpers } from './helpers';
import { UtilsSudo } from './utils';
//#endregion

/**
 * Async api for executing child processes
 * (proper handling of stdout / stderr and options)
 */
export namespace UtilsExecProc {
  //#region utils exec process / exec proc options and class
  interface ExecProcOptions {
    cwd?: string;
    /**
     * default true
     * true -> good for long outputs
     * false -> good for short outputs (speed things up)
     */
    biggerBuffer?: boolean;
    /**
     * default true
     */
    showOutputColor?: boolean;
    /**
     * default true
     */
    showOutput?: boolean | 'stdoutOnly' | 'stderrOnly';
    /**
     * default process.env
     */
    env?: { [key: string]: string };
  }
  //#endregion

  //#region utils exec process / exec proc wait until done or throw
  interface ExecProcWaitUntilDoneOrThrow {
    /**
     * default [0]
     */
    successCode?: number[];
    /**
     * in stdout or stderr
     */
    successOutputMessage?:
      | string
      | string[]
      | {
          stdout?: string | string[];
          stderr?: string | string[];
        };

    /**
     * in stdout or stderr
     */
    failOutputMessage?:
      | string
      | string[]
      | {
          stdout?: string | string[];
          stderr?: string | string[];
        };
  }
  //#endregion

  //#region utils exec process / exec proc result class
  /**
   * This class expose function that are usually needed when working
   * with child processes (without digging into low level child_process module)
   */
  class ExecProcResult {
    //#region fields & getters
    private stdoutFromCommand: string = '';

    private stderrFromCommand: string = '';

    private child: ChildProcess;

    //#region fields & getters / get max buffer
    private get maxBuffer(): number | undefined {
      //#region @backendFunc
      let maxBuffer = Helpers.bigMaxBuffer;
      if (
        _.isBoolean(this.execProcOptions?.biggerBuffer) &&
        !this.execProcOptions.biggerBuffer
      ) {
        maxBuffer = undefined;
      }
      return maxBuffer;
      //#endregion
    }
    //#endregion

    //#region fields & getters / get env
    private get env(): { [key: string]: string } {
      //#region @backendFunc
      let env = { ...process.env, FORCE_COLOR: '1', NODE_ENV: 'development' };
      if (
        _.isBoolean(this.execProcOptions.showOutputColor) &&
        !this.execProcOptions.showOutputColor
      ) {
        delete env.FORCE_COLOR;
        delete env.NODE_ENV;
      }
      if (this.execProcOptions.env) {
        env = { ...env, ...this.execProcOptions.env };
      }
      return env;
      //#endregion
    }
    //#endregion

    //#endregion

    //#region constructor
    constructor(
      protected readonly command: string,
      protected readonly args: string[],
      protected readonly execProcOptions: ExecProcOptions = {},
    ) {}
    //#endregion

    //#region get output
    public async getOutput(
      shell?: any,
    ): Promise<{ stdout: string; stderr: string }> {
      //#region @backendFunc

      let stdio: any = 'pipe';

      this.child = spawn(this.command, this.args, {
        stdio,
        env: this.env,
        maxBuffer: this.maxBuffer,
        shell,
        cwd: this.execProcOptions.cwd,
      });

      return await new Promise<{ stdout: string; stderr: string }>(
        (resolve, reject) => {
          this.child.stdout.on('data', data => {
            const strData = data?.toString() || '';
            this.stdoutFromCommand += strData;
            if (this.execProcOptions.showOutput) {
              process.stdout.write(strData);
            }
          });

          this.child.stderr.on('data', data => {
            const strData = data?.toString() || '';
            this.stderrFromCommand += strData;
            if (this.execProcOptions.showOutput) {
              process.stderr.write(strData);
            }
          });

          this.child.once('error', err => {
            config.frameworkName === 'tnp' && console.error(err);
            reject(err);
          });
          this.child.once('exit', () => {
            setTimeout(() => {
              resolve({
                stdout: this.stdoutFromCommand,
                stderr: this.stderrFromCommand,
              });
            }, 100); // ensure all data events are processed
          });
        },
      );
      //#endregion
    }
    //#endregion

    //#region get stdout without showing or throw
    public async getStdoutWithoutShowingOrThrow(): Promise<string> {
      const { stdout } = await this.getOutput();
      return stdout;
    }
    //#endregion

    //#region exec proc wait until done or throw
    public async waitUntilDoneOrThrow(
      options?: ExecProcWaitUntilDoneOrThrow,
    ): Promise<boolean> {
      //#region @backendFunc
      options = options || {};
      options.successCode = options.successCode || [0];
      let isRejected = false;

      let stdio: any = 'inherit';
      if (this.execProcOptions.showOutput === false) {
        stdio = 'ignore';
      } else if (this.execProcOptions.showOutput === 'stdoutOnly') {
        stdio = ['inherit', 'inherit', 'ignore'];
      } else if (this.execProcOptions.showOutput === 'stderrOnly') {
        stdio = ['inherit', 'ignore', 'inherit'];
      }

      Helpers.logInfo(`Executing
        command: [${this.command} ${this.args.join(' ')}]
        insid: ${this.execProcOptions.cwd}
        `);

      this.child = spawn(this.command, this.args, {
        stdio,
        env: this.env,
        maxBuffer: this.maxBuffer,
        cwd: this.execProcOptions.cwd,
      });

      //#region prepare success / fail output messages
      const successOutputMessageStdout: string[] = Array.isArray(
        options.successOutputMessage,
      )
        ? options.successOutputMessage
        : typeof options.successOutputMessage === 'string'
          ? [options.successOutputMessage]
          : options.successOutputMessage &&
              Array.isArray(options.successOutputMessage.stdout)
            ? options.successOutputMessage.stdout
            : options.successOutputMessage &&
                typeof options.successOutputMessage.stdout === 'string'
              ? [options.successOutputMessage.stdout]
              : [];

      const successOutputMessageStderr: string[] = Array.isArray(
        options.successOutputMessage,
      )
        ? options.successOutputMessage
        : typeof options.successOutputMessage === 'string'
          ? [options.successOutputMessage]
          : options.successOutputMessage &&
              Array.isArray(options.successOutputMessage.stderr)
            ? options.successOutputMessage.stderr
            : options.successOutputMessage &&
                typeof options.successOutputMessage.stderr === 'string'
              ? [options.successOutputMessage.stderr]
              : [];

      const failOutputMessageStdout: string[] = Array.isArray(
        options.failOutputMessage,
      )
        ? options.failOutputMessage
        : typeof options.failOutputMessage === 'string'
          ? [options.failOutputMessage]
          : options.failOutputMessage &&
              Array.isArray(options.failOutputMessage.stdout)
            ? options.failOutputMessage.stdout
            : options.failOutputMessage &&
                typeof options.failOutputMessage.stdout === 'string'
              ? [options.failOutputMessage.stdout]
              : [];

      const failOutputMessageStderr: string[] = Array.isArray(
        options.failOutputMessage,
      )
        ? options.failOutputMessage
        : typeof options.failOutputMessage === 'string'
          ? [options.failOutputMessage]
          : options.failOutputMessage &&
              Array.isArray(options.failOutputMessage.stderr)
            ? options.failOutputMessage.stderr
            : options.failOutputMessage &&
                typeof options.failOutputMessage.stderr === 'string'
              ? [options.failOutputMessage.stderr]
              : [];

      //#endregion

      return new Promise((resolve, reject) => {
        // when ignored in stdio, these will be null
        this.child.stdout?.on('data', data => {
          const strData = data?.toString() || '';
          for (const successMsg of successOutputMessageStdout) {
            if (strData.includes(successMsg)) {
              resolve(true);
              return;
            }
          }
          if (!isRejected) {
            isRejected = true;
            for (const failMsg of failOutputMessageStdout) {
              if (strData.includes(failMsg)) {
                return reject(
                  new Error(`
[waitUntilDoneOrThrow][stdout] Execution failed. Command:
              ${chalk.bold(`${this.command} ${this.args.join(' ')}`)}

              Fail message found in stdout: ${chalk.bold(failMsg)}`),
                );
              }
            }
          }
        });

        // when ignored in stdio, these will be null
        this.child.stderr?.on('data', data => {
          const strData = data?.toString() || '';
          for (const successMsg of successOutputMessageStderr) {
            if (strData.includes(successMsg)) {
              resolve(true);
              return;
            }
          }
          if (!isRejected) {
            isRejected = true;
            for (const failMsg of failOutputMessageStderr) {
              if (strData.includes(failMsg)) {
                return reject(
                  new Error(`
[waitUntilDoneOrThrow][stderr] Execution failed. Command:
              ${chalk.bold(`${this.command} ${this.args.join(' ')}`)}

              Fail message found in stderr: ${chalk.bold(failMsg)}`),
                );
              }
            }
          }
        });

        this.child.once('error', (...args) => {
          if (!isRejected) {
            isRejected = true;
            reject(...args);
          }
        });
        this.child.once('exit', code => {
          if (options.successCode.includes(code)) {
            resolve(true);
            return;
          }
          if (!isRejected) {
            isRejected = true;
            reject(
              new Error(`
[waitUntilDoneOrThrow][exit] Execution failed. Command:
            ${chalk.bold(`${this.command} ${this.args.join(' ')}`)}

[waitUntilDoneOrThrow]Process exited with code ${code}`),
            );
          }
        });
      });
      //#endregion
    }
    //#endregion
  }
  //#endregion

  //#region utils exec process / spawn async
  /**
   * @TODO @IN_PROGRESS
   */
  export const spawnAsync = (
    command: string,
    options?: ExecProcOptions,
  ): ExecProcResult => {
    command = command.trim();
    options = options || {};
    options.cwd = crossPlatformPath(options.cwd || process.cwd());
    const [cmd, ...args] = command.split(' ');
    return new ExecProcResult(cmd, args, options);
  };
  //#endregion

  //#region utils exec process / spawn admin sudo
  /**
   * @TODO @IN_PROGRESS
   */
  export const spawnAdminSudo = async (
    command: string,
    options?: ExecProcOptions,
  ): Promise<void> => {
    //#region @backendFunc
    options = options || {};
    const isSudoInProperModeForTaon = await UtilsSudo.isInProperModeForTaon({
      displayErrorMessage: true,
    });

    if (!isSudoInProperModeForTaon) {
      return;
    }
    command = `sudo ${command}`;
    const res = await spawnAsync(command);
    await res.waitUntilDoneOrThrow();
    //#endregion
  };
  //#endregion

  //#region utils exec process / execute until end or throw
  /**
   * @TODO @IN_PROGRESS
   */
  export const executeUntilEndOrThrow = async ({
    command,
    cwd,
  }: {
    command: string;
    cwd: string;
  }): Promise<void> => {
    //#region @backendFunc
    const child = spawnAsync(command, { cwd });
    await child.waitUntilDoneOrThrow();
    //#endregion
  };
  //#endregion

  //#region utils exec process / get stdout without showing or throw
  export const getStdoutWithoutShowingOrThrow = async ({
    command,
    cwd,
  }: {
    command: string;
    cwd: string;
  }): Promise<string> => {
    //#region @backendFunc
    const child = spawnAsync(command, { cwd });
    return await child.getStdoutWithoutShowingOrThrow();
    //#endregion
  };
  //#endregion
}
