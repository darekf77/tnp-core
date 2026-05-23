//#region utils process  / start async

import { ChildProcess } from 'child_process';

import { Observable } from 'rxjs';

import { chalk, child_process } from './core-imports';
import { CoreModels } from './core-models';
import { Helpers } from './helpers';
import { _ } from './lodash.namespace';

export interface ProcessStartOptions {
  /**
   * unique name for the process
   */
  uniqueName?: string;
  /**
   * by default is process.cwd();
   */
  cwd?: string;
  /**
   * by default is false
   */
  showCommand?: boolean;
  /**
   * Line by line check and remove not needed stuff
   */
  extractFromLine?: (string | Function)[];
  /**
   * Modify output line by line
   */
  outputLineReplace?: (outputLineStderOrStdout: string) => string;
  resolvePromiseMsg_stdout: string | string[];
  resolvePromiseMsg_stderr: string | string[];
  resolvePromiseMsgCallback_stdout: () => void | Promise<void>;
  resolvePromiseMsgCallback_stderr: () => void | Promise<void>;
  resolvePromiseMsgCallback_anystd: () => void | Promise<void>;
  /**
   * Exit with
   */
  onExitCallback?: (
    code?: number,
    resolve?: () => any,
    reject?: () => any,
  ) => void | Promise<void>;

  hideOutput_stdout?: boolean;
  hideOutput_stderr?: boolean;

  env: any;

  /**
   * Prefix messages output from child_process
   */
  prefix?: string;

  /**
   * Try command again after fail after n milliseconds
   */
  tryAgainWhenFailAfter?: number;
  askToTryAgainOnError?: boolean;

  /**
   * Use big buffer for big webpack logs
   * (it may slow down smaller processes execution)
   */
  biggerBuffer?: boolean;
  rebuildOnChange?: Observable<any>;

  /**
   * todo implement
   */
  similarProcessKey?: string;
  onChildProcessChange?: (childProcess: ChildProcess) => void;
  /**
   * TODO do I need this ?
   */
  outputBuffer?: string[];
  outputBufferMaxSize?: number;
}
//#endregion

/**
 * TODO IMPLEMENT
 * start async node process
 */
export const startAsync = async (
  command: string,
  cwd: string,
  options?: Partial<ProcessStartOptions>,
): Promise<void> => {
  //#region @backendFunc

  //#region preapre options
  let {
    hideOutput_stdout,
    hideOutput_stderr,
    resolvePromiseMsgCallback_anystd,
    resolvePromiseMsgCallback_stderr,
    resolvePromiseMsgCallback_stdout,
    outputLineReplace,
    resolvePromiseMsg_stderr,
    resolvePromiseMsg_stdout,
    onExitCallback,
    prefix,
    extractFromLine,
    onChildProcessChange,
    outputBuffer,
    outputBufferMaxSize,
    askToTryAgainOnError,
    rebuildOnChange,
    uniqueName,
  } = options || {};

  outputBufferMaxSize = outputBufferMaxSize || 1000;

  command = Helpers._fixCommand(command);

  let childProcess: ChildProcess;



  if (_.isString(resolvePromiseMsg_stdout)) {
    resolvePromiseMsg_stdout = [resolvePromiseMsg_stdout];
  }
  if (_.isString(resolvePromiseMsg_stderr)) {
    resolvePromiseMsg_stderr = [resolvePromiseMsg_stderr];
  }

  //#endregion

  //#region handle process
  const handlProc = (proc: ChildProcess, skipExitProcessOnError = false) => {
    return new Promise((resolve, reject) => {
      //#region handle stdout data
      proc.stdout.on('data', rawData => {
        let data = rawData?.toString() || '';

        data = Helpers.modifyLineByLine(
          data,
          outputLineReplace,
          prefix,
          extractFromLine,
        );

        if (!_.isUndefined(outputBuffer)) {
          outputBuffer.push(data);
          if (outputBuffer.length > outputBufferMaxSize) {
            outputBuffer.shift();
          }
        }

        if (!hideOutput_stdout) {
          process.stdout.write(data);
        }

        //#region handle resovle stdout
        if (_.isArray(resolvePromiseMsg_stdout)) {
          for (
            let index = 0;
            index < resolvePromiseMsg_stdout.length;
            index++
          ) {
            // console.log(`DATA STDOUT: ${chalk.gray(data)}`);

            const resolveCompilationMessage = resolvePromiseMsg_stdout[index];
            if (data.search(resolveCompilationMessage) !== -1) {
              // Helpers.info(`[unitlOutputContains] AAA...`);

              resolvePromiseMsgCallback_stdout &&
                resolvePromiseMsgCallback_stdout();
              resolvePromiseMsgCallback_anystd &&
                resolvePromiseMsgCallback_anystd();
              resolve(void 0);
              break;
            }
          }
        }
        //#endregion
      });
      //#endregion

      //#region handle exit process
      proc.on('exit', async code => {
        if (onExitCallback) {
          await onExitCallback(code, resolve as any, reject);
        }
      });

      //#endregion

      //#region handle stdout error
      proc.stdout.on('error', rawData => {
        let data = rawData?.toString() || '';

        data = Helpers.modifyLineByLine(
          data,
          outputLineReplace,
          prefix,
          extractFromLine,
        );

        if (!_.isUndefined(outputBuffer)) {
          outputBuffer.push(data);
          if (outputBuffer.length > outputBufferMaxSize) {
            outputBuffer.shift();
          }
        }

        if (!hideOutput_stdout) {
          process.stdout.write(JSON.stringify(data));
        }
      });
      //#endregion

      //#region handle stder data
      proc.stderr.on('data', rawData => {
        let data = rawData?.toString() || '';
        data = Helpers.modifyLineByLine(
          data,
          outputLineReplace,
          prefix,
          extractFromLine,
        );

        if (!_.isUndefined(outputBuffer)) {
          outputBuffer.push(data);
          if (outputBuffer.length > outputBufferMaxSize) {
            outputBuffer.shift();
          }
        }

        if (!hideOutput_stderr) {
          process.stderr.write(data);
        }

        if (_.isArray(resolvePromiseMsg_stderr)) {
          for (
            let index = 0;
            index < resolvePromiseMsg_stderr.length;
            index++
          ) {
            const rejectm = resolvePromiseMsg_stderr[index];
            if (data.search(rejectm) !== -1) {
              // Helpers.info(`[unitlOutputContains] Rejected move to next step...`);
              resolvePromiseMsgCallback_stderr &&
                resolvePromiseMsgCallback_stderr();

              resolvePromiseMsgCallback_anystd &&
                resolvePromiseMsgCallback_anystd();

              resolve(void 0);
              break;
            }
          }
        }
      });
      //#endregion

      //#region handle stder error
      proc.stderr.on('error', rawData => {
        let data = rawData?.toString() || '';
        data = Helpers.modifyLineByLine(
          data,
          outputLineReplace,
          prefix,
          extractFromLine,
        );

        if (!_.isUndefined(outputBuffer)) {
          outputBuffer.push(data);
          if (outputBuffer.length > outputBufferMaxSize) {
            outputBuffer.shift();
          }
        }

        if (!hideOutput_stderr) {
          process.stderr.write(JSON.stringify(data));
        }
        // console.log(data);
      });
      //#endregion
    });
  };
  //#endregion

  //#region prepare env
  const maxBuffer = options?.biggerBuffer ? Helpers.bigMaxBuffer : void 0;
  let env = { ...process.env, FORCE_COLOR: '1', NODE_ENV: 'development' };
  if (options.env) {
    env = { ...env, ...options.env };
  }
  //#endregion

  //#region console process
  const terminalProcess = async () => {
    while (true) {
      childProcess = child_process.exec(command, { cwd, env, maxBuffer });
      onChildProcessChange && onChildProcessChange(childProcess);
      try {
        await handlProc(childProcess);
        try {
          resolvePromiseMsgCallback_anystd &&
            (await resolvePromiseMsgCallback_anystd());
          resolvePromiseMsgCallback_stderr &&
            (await resolvePromiseMsgCallback_stderr());
          resolvePromiseMsgCallback_stdout &&
            (await resolvePromiseMsgCallback_stdout());
        } catch (error) {}
        break;
      } catch (error) {
        Helpers.error(
          `Command failed:

${command}

in location: ${cwd}

        `,
          true,
          true,
        );
        if (askToTryAgainOnError) {
          if (!(await Helpers.questionYesNo(`Try again this command ?`))) {
            throw error;
          }
        } else {
          throw error;
        }
      }
    }
  };
  //#endregion

  // console.log('rebuild on change', rebuildOnChange);

  if (!_.isNil(rebuildOnChange)) {
    askToTryAgainOnError = false;
    command = command.replace('--watch', '').replace('-w', '');
    Helpers.log(`Executing command: ${command}

        in kill/watch mode...`);

    //#region kill current
    const killCurrent = async () => {
      if (childProcess?.pid) {
        // Helpers.logInfo('Killing current');
        const child = childProcess;
        childProcess = undefined;
        try {
          process.kill(-child.pid, 'SIGKILL');
        } catch (er) {
          // console.log('error during killing child proc');
          // console.error(er)
        }
      } else {
        // Helpers.logInfo('Not killing current');
      }
    };
    //#endregion

    await new Promise<void>((resolve, reject) => {
      let isFirstRun = true;
      let firstNormalBuildDone = false;
      let newChangesDuringBuild = false;
      let isBuilding = false;

      const rebuildNormal = async () => {
        isBuilding = true;
        let wasNewChangeDuringBuild = false;

        while (true) {
          let wasFirstRun = isFirstRun;
          if (isFirstRun) {
            isFirstRun = false;
          } else {
            await killCurrent();
          }

          Helpers.logInfo(
            `Rebuilding ${wasFirstRun ? '(first time)' : '(again)'}` +
              ` ${wasNewChangeDuringBuild ? '(new changes)' : '(normal)'}` +
              ` command:  ${uniqueName || command}`,
          );

          childProcess = child_process.exec(command, {
            cwd,
            env,
            maxBuffer,
          });
          onChildProcessChange && onChildProcessChange(childProcess);

          //#region build done resolve
          const buildDone = async () => {
            try {
              resolvePromiseMsgCallback_anystd &&
                (await resolvePromiseMsgCallback_anystd());
              resolvePromiseMsgCallback_stderr &&
                (await resolvePromiseMsgCallback_stderr());
              resolvePromiseMsgCallback_stdout &&
                (await resolvePromiseMsgCallback_stdout());
            } catch (error) {}

            Helpers.logInfo(
              chalk.green(`Next step.. ${chalk.bold(uniqueName || command)}`),
            );

            resolve();
          };
          //#endregion

          try {
            await handlProc(childProcess, true);
            await buildDone();
          } catch (error) {
            console.error(
              chalk.bold(
                `Error during ` + `${chalk.bold(uniqueName || command)}`,
              ),
            );
          }

          firstNormalBuildDone = true;

          if (newChangesDuringBuild) {
            newChangesDuringBuild = false;
            wasNewChangeDuringBuild = true;
            continue;
          }
          isBuilding = false;
          break;
        }
      };

      const rebuildDebounce = _.debounce(async () => {
        await rebuildNormal();
      }, 500);
      rebuildOnChange.subscribe(() => {
        // console.log(`Subscriber event! ${command}
        //   isBuilding=${isBuilding}
        //   newChangesDuringBuild=${newChangesDuringBuild}
        //   firstNormalBuildDone=${firstNormalBuildDone}
        //   `);
        if (isBuilding) {
          newChangesDuringBuild = true;
        }
        if (isFirstRun) {
          // console.log('Trigger normal rebuild');
          rebuildNormal();
        } else {
          if (!newChangesDuringBuild && firstNormalBuildDone) {
            // console.log('Trigger debounce rebuild');
            rebuildDebounce();
          }
        }
      });
    });
  } else {
    await terminalProcess();
  }

  //#endregion
};
//#endregion
