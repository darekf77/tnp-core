import {
  _,
  //#region @backend
  path,
  fse,
  os,
  rimraf,
  child_process,
  crossPlatformPath,
  json5,
  chalk,
  dateformat,
  spawn,
  win32Path,
  //#endregion
} from './core-imports';
import { Helpers } from './index';
import { HelpersMessages } from './helpers-messages';
import { ExecuteOptions, RunOptions } from './core-models';

declare const global: any;
const encoding = 'utf8';

export interface RunSyncOrAsyncOptions {
  functionFn: Function,
  context?: object,
  arrayOfParams?: any[],
}

export class HelpersCore extends HelpersMessages {

  //#region singleton
  private static _instanceCore: HelpersCore;
  public static get InstanceCore() {
    if (!HelpersCore._instanceCore) {
      HelpersCore._instanceCore = new HelpersCore();
    }
    return HelpersCore._instanceCore;
  }
  //#endregion

  //#region @backend
  cleanExit() {
    Helpers.processes.forEach(p => {
      p.kill('SIGINT')
      p.kill('SIGTERM')
      Helpers.log(`Killing child process on ${p.pid}`)
    })
    Helpers.log(`Killing parent on ${process.pid}`)
    process.exit()
  };
  //#endregion

  readonly bigMaxBuffer = 2024 * 500;
  constructor() {
    super();
    // //#region @backend
    // process.on('SIGINT', this.cleanExit); // catch ctrl-c
    // process.on('SIGTERM', this.cleanExit); // catch kill
    // //#endregion
  }

  removeSlashAtEnd(s: string) {
    s = s?.endsWith(`/`) ? s.slice(0, s.length - 1) : s;
    return s;
  }

  removeSlashAtBegin(s: string) {
    s = s?.startsWith(`/`) ? s.slice(1) : s;
    return s;
  }

  stringify(inputObject: any): string {
    // if (_.isString(inputObject)) {
    //   return inputObject;
    // }
    // if (_.isObject(inputObject)) {
    //   config.log(inputObject)
    //   Helpers.error(`[tnp-helpers] trying to stringify not a object`, false, true);
    // }
    return JSON.stringify(inputObject, null, 2);
  }

  async runSyncOrAsync(fnOrOptions: Function | [string, object] | RunSyncOrAsyncOptions, ...firstArg: any[]) {
    if (_.isUndefined(fnOrOptions)) {
      return;
    }
    let promisOrValue: any;
    const optionsMode = _.isObject(fnOrOptions)
      && !_.isArray(fnOrOptions)
      && !_.isFunction(fnOrOptions)
      && !_.isNil(fnOrOptions)
      ;

    if (optionsMode) {
      const { functionFn, context, arrayOfParams } = fnOrOptions as RunSyncOrAsyncOptions;
      promisOrValue = functionFn.apply(context, arrayOfParams);
    } else {
      // @ts-ignore
      promisOrValue = _.isArray(fnOrOptions) ? fnOrOptions[1][fnOrOptions[0]](...firstArg) : fnOrOptions(...firstArg);
    }
    // let wasPromise = false;

    if (promisOrValue instanceof Promise) {
      // wasPromise = true;
      promisOrValue = Promise.resolve(promisOrValue)
    }
    // console.log('was promis ', wasPromise)
    return promisOrValue;
  }

  //#region @backend
  readonly processes: child_process.ChildProcess[] = [];
  //#endregion

  //#region @backend
  createSymLink(existedFileOrFolder: string, destinationPath: string,
    options?: {
      continueWhenExistedFolderDoesntExists?: boolean;
      windowsHardLink?: boolean;
      dontRenameWhenSlashAtEnd?: boolean;
      allowNotAbsolutePathes?: boolean;
      /**
       * only if you know that symlink can be created
       */
      speedUpProcess?: boolean;
    }) {

    //#region fix parameters
    existedFileOrFolder = crossPlatformPath(existedFileOrFolder);
    destinationPath = crossPlatformPath(destinationPath);

    Helpers.log(`[tnp-code][create link] exited -> dest
    ${existedFileOrFolder} ${destinationPath}`, 1);

    options = options ? options : {};
    if (_.isUndefined(options.continueWhenExistedFolderDoesntExists)) {
      options.continueWhenExistedFolderDoesntExists = false;
    }
    if (_.isUndefined(options.dontRenameWhenSlashAtEnd)) {
      options.dontRenameWhenSlashAtEnd = false;
    }
    if (_.isUndefined(options.windowsHardLink)) {
      options.windowsHardLink = false;
    }
    if (_.isUndefined(options.speedUpProcess)) {
      options.speedUpProcess = false;
    }
    if (_.isUndefined(options.allowNotAbsolutePathes)) {
      options.allowNotAbsolutePathes = false;
    }
    //#endregion

    const { continueWhenExistedFolderDoesntExists, windowsHardLink, speedUpProcess } = options;

    // console.log('Create link!')


    let targetExisted = existedFileOrFolder;
    let linkDest = destinationPath;

    if (!fse.existsSync(existedFileOrFolder)) {
      if (continueWhenExistedFolderDoesntExists) {
        // just continue and create link to not existed folder
      } else {
        Helpers.error(`[helpers.createLink] target path doesn't exist: ${existedFileOrFolder}
          use option "continueWhenExistedFolderDoesntExists" to fix this if you know that
          file will be eventually in place
        `)
      }
    }

    /**
     * support for
     * pwd -> /mysource
     * ln -s . /test/inside -> /test/inside/mysource
     * ln -s ./ /test/inside -> /test/inside/mysource
     */
    if (options.allowNotAbsolutePathes) {

      if (linkDest === '.' || linkDest === './') {
        linkDest = crossPlatformPath(process.cwd());
      }

      if (!path.isAbsolute(linkDest)) {
        linkDest = crossPlatformPath(path.join(crossPlatformPath(process.cwd()), linkDest));
      }

      if (!path.isAbsolute(targetExisted)) {
        targetExisted = crossPlatformPath(path.join(crossPlatformPath(process.cwd()), targetExisted));
      }
    } else {
      if (!path.isAbsolute(linkDest)) {
        Helpers.error(`[createsymlink] path is not absolute:
        targetExisted: ${targetExisted}
        linkDest: ${linkDest}
        `)
      }
      if (!path.isAbsolute(targetExisted)) {
        Helpers.error(`[createsymlink] path is not absolute:
        targetExisted: ${targetExisted}
        linkDest: ${linkDest}
        `)
      }
    }


    if (linkDest.endsWith('/')) {
      linkDest = crossPlatformPath(path.join(linkDest, path.basename(targetExisted)))
    }

    const parentFolderLinkDest = path.dirname(linkDest);

    if (Helpers.isSymlinkFileExitedOrUnexisted(parentFolderLinkDest)) {
      fse.unlinkSync(parentFolderLinkDest)
    }

    if (!Helpers.isFolder(parentFolderLinkDest)) {
      rimraf.sync(parentFolderLinkDest);
      Helpers.mkdirp(parentFolderLinkDest);
    }

    if (!speedUpProcess) {
      rimraf.sync(linkDest);
    }

    if (process.platform === 'win32') {

      // const resolvedTarget = crossPlatformPath(path.resolve(targetExisted));

      // console.log(`resolved target from ${targetExisted} = ${resolvedTarget}, isFile: ${targetIsFile}`)
      if (Helpers.isSymlinkFileExitedOrUnexisted(targetExisted)) {
        //   Helpers.info(`FIXING TARGET FOR WINDOWS`)
        targetExisted = crossPlatformPath(fse.realpathSync(targetExisted));
        // TODO QUICK_FIX on windows you can't create link to link
      }
      // targetExisted = path.win32.normalize(targetExisted).replace(/\\$/, '');
      // linkDest = path.win32.normalize(linkDest).replace(/\\$/, '');
      const targetIsFile = Helpers.isFile(targetExisted);

      // const destIsLink = Helpers.isExistedSymlink(linkDest) || Helpers.isUnexistedLink(linkDest)

      // console.log({
      //   targetExisted,
      //   linkDest,
      //   destIsLink
      // });

      // if (destIsLink) {
      //   fse.unlinkSync(linkDest)
      // }

      if (windowsHardLink) { // ADMIN RIGHT REQURED??
        fse.symlinkSync(targetExisted, linkDest, 'dir')
      } else {
        if (targetIsFile) {
          fse.linkSync(targetExisted, linkDest)
        } else {
          fse.symlinkSync(targetExisted, linkDest, 'junction')
        }
      }

      //#region old windows linking
      /*
      // const winLinkCommand = `cmd  /c "mklink /D ${link} ${target}"`;
      // const winLinkCommand = `export MSYS=winsymlinks:nativestrict && ln -s ${target} ${link}`;
      const winLinkCommand = `mklink ${windowsHardLink ? '/D' : (targetIsFile ? '/H' : '/j')} "${linkDest}" "${targetExisted}"`;
      Helpers.log(`windows link: lnk ${targetExisted} ${linkDest}


      "${winLinkCommand}'
      `);
      try {
        Helpers.run(winLinkCommand, { biggerBuffer: false }).sync();
      } catch (error) {
        Helpers.error(error, true, false);
        Helpers.error(`
        command: "${winLinkCommand}"
        [tnp-helpers] windows link error
        target: "${targetExisted}"
        link: "${linkDest}"
        command: "${winLinkCommand}"
        `, true, false)
      }
      */
      //#endregion
    } else {
      fse.symlinkSync(targetExisted, linkDest)
    }

  }


  //#endregion

  //#region @backend
  mkdirp(folderPath: string | string[]) {
    if (_.isArray(folderPath)) {
      folderPath = path.join(...folderPath);
    }
    if (!path.isAbsolute(folderPath)) {
      Helpers.warn(`[helpers][mkdirp] Path is not absolute, abort ${folderPath}`, true);
      return;
    }
    if (_.isString(folderPath) && folderPath.startsWith('/tmp ') && os.platform() === 'darwin') {
      Helpers.warn(`[helpers][mkdirp] On mac osx /tmp is changed to /private/tmp`, false);
      folderPath = folderPath.replace(`/tmp/`, '/private/tmp/');
    }
    if (fse.existsSync(folderPath)) {
      Helpers.warn(`[helpers][mkdirp] folder path already exists: ${folderPath}`, false);
    } else {
      Helpers.log(`[tnp-core][mkdirp] ${folderPath}`, 1)
      fse.mkdirpSync(folderPath);
    }
  }
  //#endregion


  /**
   * symlink may have existed or unexisted destiantion url
   * @param destUrl M
   */
  isSymlinkThatMatchesUrl(possibleSymlink: string, destUrl: string, absoluteFileMatch = false): boolean {
    //#region @backendFunc
    destUrl = crossPlatformPath(destUrl);

    if (Helpers.exists(possibleSymlink)) {
      if (Helpers.isExistedSymlink(possibleSymlink)) {
        let fileLink = fse.readlinkSync(possibleSymlink);
        if (absoluteFileMatch) {
          fileLink = fse.realpathSync(fileLink);
        }
        fileLink = crossPlatformPath(fileLink)
        return fileLink === destUrl;
      }
      if (Helpers.isFolder(possibleSymlink)) {
        return false;
      }
    }

    try {
      const linkToUnexitedLink = fse.lstatSync(possibleSymlink).isSymbolicLink();
      if (linkToUnexitedLink) {
        let fileLink = fse.readlinkSync(possibleSymlink);
        if (absoluteFileMatch) {
          fileLink = fse.realpathSync(fileLink);
        }
        fileLink = crossPlatformPath(fileLink)
        return (fileLink === destUrl);
      }
      return false;
    } catch (error) {
      return false;
    }
    //#endregion
  }

  isSymlinkFileExitedOrUnexisted(filePath: string): boolean {
    //#region @backendFunc
    try {
      const linkToUnexitedLink = fse.lstatSync(filePath).isSymbolicLink();
      return linkToUnexitedLink;
    } catch (error) {
      return false;
    }
    //#endregion
  }

  /**
   * If symbolnk link that target file does not exits
   */
  isUnexistedLink(filePath: string): boolean {
    //#region @backendFunc
    filePath = Helpers.removeSlashAtEnd(filePath);
    if (process.platform === 'win32') {
      filePath = path.win32.normalize(filePath);
    }

    try {
      const linkToUnexitedLink = fse.lstatSync(filePath).isSymbolicLink();
      return linkToUnexitedLink && !fse.existsSync(fse.readlinkSync(filePath));
    } catch (error) {
      return false;
    }
    //#endregion
  }

  /**
   * @param existedLink check if source of link exists
   */
  isExistedSymlink(filePath: string): boolean {

    //#region @backendFunc
    filePath = Helpers.removeSlashAtEnd(filePath);
    if (process.platform === 'win32') {
      filePath = path.win32.normalize(filePath);
    }

    try {
      const linkToUnexitedLink = fse.lstatSync(filePath).isSymbolicLink();
      return linkToUnexitedLink && fse.existsSync(fse.readlinkSync(filePath));
    } catch (error) {
      return false;
    }
    //#endregion
  }

  //#region @backend
  pathContainLink(p: string) {
    let previous: string;
    while (true) {
      p = crossPlatformPath(path.dirname(p));
      if (p === previous) {
        return false;
      }
      if (Helpers.isExistedSymlink(p)) {
        return true;
      }
      if (!Helpers.exists(p)) {
        return false;
      }
      previous = p;
    }
  }
  //#endregion


  exists(folderOrFilePath: string | string[]
    // , allowUnexistedLinks = false
  ) {
    //#region @backendFunc
    if (_.isArray(folderOrFilePath)) {
      folderOrFilePath = path.join(...folderOrFilePath);
    }
    if (!folderOrFilePath) {
      Helpers.warn(`[helpers][exists] Path is not a string, abort.. "${folderOrFilePath}"`, true);
      return false;
    }
    if (!path.isAbsolute(folderOrFilePath)) {
      Helpers.warn(`

      ${folderOrFilePath}

      `, true);
      return false;
    }


    return fse.existsSync(folderOrFilePath);
    //#endregion
  }

  command(command: string) {
    // console.log({ command })

    return {
      //#region @backend
      getherOutput(options?: {
        ommitStder: boolean;
        cwd: string;
        biggerBuffer: boolean;
        gatherColors: boolean;
      }) {
        if (!options) {
          options = {} as any;
        }
        return new Promise<string>((resolve) => {
          let { ommitStder, cwd, biggerBuffer, gatherColors } = options;
          if (!cwd) {
            cwd = process.cwd()
          }
          const maxBuffer = biggerBuffer ? Helpers.bigMaxBuffer : void 0;

          const env = gatherColors ? { ...process.env, FORCE_COLOR: '1' } : {};
          const proc = child_process.exec(command, {
            cwd,
            maxBuffer,
            env
          });
          let gatheredData = '';

          proc.on('exit', (code) => {
            resolve(gatheredData);
          });

          proc.stdout.on('data', (data) => {
            gatheredData = `${gatheredData}${data?.toString() || ''}`;
          })

          proc.stdout.on('error', (data) => {
            gatheredData = `${gatheredData}${data?.toString() || ''}`;
          })

          if (!ommitStder) {
            proc.stderr.on('data', (data) => {
              gatheredData = `${gatheredData}${data?.toString() || ''}`;
            })

            proc.stderr.on('error', (data) => {
              gatheredData = `${gatheredData}${data?.toString() || ''}`;
            })
          }

        })

      }
      //#endregion
    }
  }


  run(command: string,
    options?: RunOptions) {

    // console.log({ command })

    //#region @backend
    if (!options) options = {};
    if (options.output === undefined) options.output = true;
    if (options.biggerBuffer === undefined) options.biggerBuffer = false;
    if (options.cwd === undefined) options.cwd = crossPlatformPath(process.cwd())
    if (!_.isString(command)) {
      Helpers.error(`[tnp-helper] command is not a string`)
    }
    //#endregion
    return {
      //#region @backend
      sync() { // TODO buffer

        if (_.isArray(options.extractFromLine)) {
          Helpers.error(`[tnp-helper] extractFromLine only for:
          - asyncAsPromise
          - async
          - unitlOutputContains

          `, false, true);
        }
        if (_.isNumber(options.tryAgainWhenFailAfter) && options.tryAgainWhenFailAfter > 0) {
          // TODO try again when fail
          // try {
          const proc = Helpers.runSyncIn(command, options);
          return proc;
          // } catch (error) {

          //  TODO: WAIT FUNCTION HERE
          //   return Helpers.run(command, options).sync()
          // }
        }
        return Helpers.runSyncIn(command, options);
      },
      async(detach = false) {

        options.detach = detach;
        return Helpers.runAsyncIn(command, options);

      },
      asyncAsPromise(): any { // TODO Promise<void>

        let isResolved = false;
        return new Promise<any>((resolve, reject) => {
          const proc = Helpers.runAsyncIn(command, options);
          proc.on('exit', () => {
            if (!isResolved) {
              isResolved = true;
              resolve(void 0);
            }

          });
          proc.on('error', () => {
            if (!isResolved) {
              isResolved = true;
              reject();
            }
          });
        });

      },
      unitlOutputContains(stdoutMsg: string | string[], stderMsg?: string | string[]) {

        let isResolved = false;
        return new Promise<any>((resolve, reject) => {

          if (_.isString(stdoutMsg)) {
            stdoutMsg = [stdoutMsg];
          }
          if (_.isString(stderMsg)) {
            stderMsg = [stderMsg];
          }
          if (!_.isArray(stdoutMsg)) {
            reject(`[unitlOutputContains] Message not a array`);
          }

          const proc = Helpers.runAsyncIn(command, options);
          proc.stderr.on('data', (message) => {
            const data: string = message.toString().trim();
            if (!isResolved && _.isArray(stderMsg)) {
              for (let index = 0; index < stderMsg.length; index++) {
                const rejectm = stderMsg[index];
                if ((data.search(rejectm) !== -1)) {
                  Helpers.info(`[unitlOutputContains] Rejected move to next step...`);
                  isResolved = true;
                  reject();
                  proc.kill('SIGINT');
                  break;
                }
              }
            }
          });

          proc.stdout.on('data', (message) => {
            const data: string = message.toString().trim();

            if (!isResolved) {
              for (let index = 0; index < stdoutMsg.length; index++) {
                const m = stdoutMsg[index];
                if ((data.search(m) !== -1)) {
                  Helpers.info(`[unitlOutputContains] Move to next step...`)
                  isResolved = true;
                  resolve(void 0);
                  break;
                }
              }
            }
            if (!isResolved && _.isArray(stderMsg)) {
              for (let index = 0; index < stderMsg.length; index++) {
                const rejectm = stderMsg[index];
                if ((data.search(rejectm) !== -1)) {
                  Helpers.info(`[unitlOutputContains] Rejected move to next step...`);
                  isResolved = true;
                  reject();
                  proc.kill('SIGINT');
                  break;
                }
              }
            }

          });
        });

      }
      //#endregion
    }
  }
  //#region @backend
  get isRunningIn() {
    return {
      mochaTest() {
        return (typeof global['it'] === 'function');
      },
      cliMode() {
        return !!global['globalSystemToolMode'];
      },
    }
  }
  //#endregion

  //#region @backend
  getStdio(options?: RunOptions) {
    const {
      output, silence, stdio
      // pipeToParentProcerss = false,
      // inheritFromParentProcerss = false
    } = options;
    if (typeof stdio !== 'undefined') {
      return stdio;
    }
    let resstdio = output ? [0, 1, 2] : ((_.isBoolean(silence) && silence) ? 'ignore' : undefined);
    // if (pipeToParentProcerss) {
    //   stdio = ['pipe', 'pipe', 'pipe'] as any;
    // }
    // if (inheritFromParentProcerss) {
    //   stdio = ['inherit', 'inherit', 'inherit'] as any;
    // }
    return resstdio;
  }
  //#endregion

  //#region @backend
  runSyncIn(command: string, options?: RunOptions) {
    const { cwd, biggerBuffer } = options;
    const maxBuffer = biggerBuffer ? Helpers.bigMaxBuffer : undefined;
    let stdio = Helpers.getStdio(options)
    Helpers.checkProcess(cwd, command);
    return child_process.execSync(command, { stdio, cwd, maxBuffer } as any)
  }
  //#endregion

  //#region @backend
  runAsyncIn(command: string, options?: RunOptions) {
    const { output, cwd, biggerBuffer, outputLineReplace, extractFromLine, detach } = options;
    const maxBuffer = biggerBuffer ? Helpers.bigMaxBuffer : undefined;
    let stdio = Helpers.getStdio(options)
    Helpers.checkProcess(cwd, command);


    let proc: child_process.ChildProcess;
    if (detach) {
      const cmd = _.first(command.split(' '));
      const argsForCmd = command.split(' ').slice(1);
      Helpers.log(`cmd: "${cmd}",  args: "${argsForCmd.join(' ')}"`)
      if (process.platform === 'win32') {
        proc = spawn(cmd, argsForCmd, { cwd, detached: true });

        // proc = child_process.spawn(cmd, argsForCmd, {
        //   cwd,
        //   detached: true,
        //   // windowsVerbatimArguments: true,
        //   shell: true,
        //   // env: {
        //     // NODE_ENV: 'production',
        //   //   PATH: process.env.PATH
        //   // }
        // });
      } else {
        proc = child_process.spawn(cmd, argsForCmd, { cwd, detached: true });
      }
      Helpers.log(`

      DETACHED PROCESS IS WORKING ON PID: ${proc.pid}

      `)
      // proc = child.exec(`${command} &`, { cwd, maxBuffer, });
    } else {
      // Helpers.log(`Command to execture: ${command}`)
      const env = { ...process.env, FORCE_COLOR: '1' };
      proc = child_process.exec(command, { cwd, maxBuffer, env });
      if (global.globalSystemToolMode) {
        proc.on('exit', (code) => {
          Helpers.log('EXITING BIG PROCESS')
          process.exit(code);
        });
      }
    }
    return Helpers.logProc(proc,
      detach ? true : output,
      detach ? void 0 : stdio,
      outputLineReplace,
      options.prefix,
      extractFromLine,
      command,
    );
  }
  //#endregion

  //#region @backend
  logProc(proc: child_process.ChildProcess,
    output = true,
    stdio,
    outputLineReplace: (outputLine: string) => string,
    prefix: string,
    extractFromLine?: (string | Function)[],
    command?: string,
  ) {
    Helpers.processes.push(proc);

    if (stdio) {
      // @ts-ignore
      proc.stdio = stdio;
    }


    if (!prefix) {
      prefix = '';
    }

    if (output) {
      proc.stdout.on('data', (data) => {
        // if (data?.toString().search('was unexpected at this time') !== -1) {
        //   console.log('!!!COMMAND',command)
        // }

        process.stdout.write(Helpers.modifyLineByLine(data, outputLineReplace, prefix, extractFromLine))
      })

      proc.stdout.on('error', (data) => {
        // if (data?.toString().search('was unexpected at this time') !== -1) {
        //   console.log('!!!COMMAND',command)
        // }

        console.log(Helpers.modifyLineByLine(data, outputLineReplace, prefix, extractFromLine));
      })

      proc.stderr.on('data', (data) => {
        // if (data?.toString().search('was unexpected at this time') !== -1) {
        //   console.log('!!!COMMAND',command)
        // }
        process.stderr.write(Helpers.modifyLineByLine(data, outputLineReplace, prefix, extractFromLine))
      })

      proc.stderr.on('error', (data) => {
        // if (data?.toString().search('was unexpected at this time') !== -1) {
        //   console.log('!!!COMMAND',command)
        // }
        console.log(Helpers.modifyLineByLine(data, outputLineReplace, prefix, extractFromLine));
      })

    }

    return proc;
  }

  execute(childProcess: child_process.ChildProcess,
    options?: ExecuteOptions
  ) {
    let {
      hideOutput,
      resolvePromiseMsg,
      outputLineReplace,
      prefix,
      extractFromLine,
      exitOnError,
      exitOnErrorCallback,
    } = options || {};
    // let {
    //   stderMsgForPromiseResolve,
    //   stdoutMsgForPromiseResolve
    // } = resolvePromiseMsg || {};

    // processes.push(proc);
    if (!resolvePromiseMsg) {
      resolvePromiseMsg = {};
    }
    if (!hideOutput) {
      hideOutput = {};
    }

    let isResolved = false;

    if (_.isString(resolvePromiseMsg.stdout)) {
      resolvePromiseMsg.stdout = [resolvePromiseMsg.stdout];
    }
    if (_.isString(resolvePromiseMsg.stderr)) {
      resolvePromiseMsg.stderr = [resolvePromiseMsg.stderr];
    }

    return new Promise((resolve, reject) => {

      // let stdio = [0,1,2]
      childProcess.stdout.on('data', (rawData) => {
        let data = (rawData?.toString() || '');

        data = Helpers.modifyLineByLine(
          data,
          outputLineReplace,
          prefix,
          extractFromLine
        );

        if (!hideOutput.stdout) {
          process.stdout.write(data);
        }

        if (!isResolved && _.isArray(resolvePromiseMsg.stdout)) {
          for (let index = 0; index < resolvePromiseMsg.stdout.length; index++) {
            const m = resolvePromiseMsg.stdout[index];
            if ((data.search(m) !== -1)) {
              // Helpers.info(`[unitlOutputContains] Move to next step...`)
              isResolved = true;
              resolve(void 0);
              break;
            }
          }
        }
        if (!isResolved && _.isArray(resolvePromiseMsg.stderr)) {
          for (let index = 0; index < resolvePromiseMsg.stderr.length; index++) {
            const rejectm = resolvePromiseMsg.stderr[index];
            if ((data.search(rejectm) !== -1)) {
              // Helpers.info(`[unitlOutputContains] Rejected move to next step...`);
              isResolved = true;
              reject();
              childProcess.kill('SIGINT');
              break;
            }
          }
        }

        // console.log(data.toString());
      });

      childProcess.on('exit', async (code) => {
        if (exitOnError && code !== 0) {
          if (_.isFunction(exitOnErrorCallback)) {
            try {
              await this.runSyncOrAsync(exitOnErrorCallback, code);
            } catch (error) { }
          }
          process.exit(code);
        }
        resolve(void 0);
      });

      childProcess.stdout.on('error', (rawData) => {
        let data = (rawData?.toString() || '');
        data = Helpers.modifyLineByLine(
          data,
          outputLineReplace,
          prefix,
          extractFromLine
        );

        if (!hideOutput.stdout) {
          process.stdout.write(JSON.stringify(data))
        }

        // console.log(data);
      })

      childProcess.stderr.on('data', (rawData) => {
        let data = (rawData?.toString() || '');
        data = Helpers.modifyLineByLine(
          data,
          outputLineReplace,
          prefix,
          extractFromLine
        );

        if (!hideOutput.stderr) {
          process.stderr.write(data);
        }

        if (!isResolved && _.isArray(resolvePromiseMsg.stderr)) {
          for (let index = 0; index < resolvePromiseMsg.stderr.length; index++) {
            const rejectm = resolvePromiseMsg.stderr[index];
            if ((data.search(rejectm) !== -1)) {
              // Helpers.info(`[unitlOutputContains] Rejected move to next step...`);
              isResolved = true;
              reject();
              childProcess.kill('SIGINT');
              break;
            }
          }
        }

      })

      childProcess.stderr.on('error', (rawData) => {
        let data = (rawData?.toString() || '');
        data = Helpers.modifyLineByLine(
          data,
          outputLineReplace,
          prefix,
          extractFromLine
        );

        if (!hideOutput.stderr) {
          process.stderr.write(JSON.stringify(data))
        }
        // console.log(data);
      });


    });

  }
  //#endregion

  //#region @backend
  checkProcess(dirPath: string, command: string) {
    if (!fse.existsSync(dirPath)) {
      Helpers.error(`
Path for process cwd doesn't exist: ${dirPath}
command: ${command}
`);
    }
    if (!command) {
      Helpers.error(`Bad command: ${command}`);
    }
  }
  //#endregion

  //#region @backend

  modifyLineByLine(
    data: string | Buffer | Error,
    outputLineReplace: (outputLine: string) => string,
    prefix: string,
    extractFromLine?: (string | Function)[],
  ) {
    const checkExtract = (_.isArray(extractFromLine) && extractFromLine.length > 0);
    let modifyOutput = _.isFunction(outputLineReplace);
    if (modifyOutput && _.isString(data)) {
      data = data.split(/\r?\n/).map(line => outputLineReplace(
        line // .replace(chalkCharactersRegex, '')
      )).join('\n');
    }
    if (prefix && _.isString(data)) {
      return data.split('\n').map(singleLine => {
        if (!singleLine || singleLine.trim().length === 0 || singleLine.trim() === '.') {
          return singleLine;
        }
        if (checkExtract) {
          const sFuncs = extractFromLine
            .filter(f => _.isString(f))
          if (sFuncs.filter(f => (singleLine.search(f as string) !== -1)).length === sFuncs.length) {
            const fun = extractFromLine.find(f => _.isFunction(f));
            if (fun) {
              let s = singleLine;
              sFuncs.forEach(f => { s = s.replace(f as string, '') });
              (fun as Function)(s.trim());
            }
          }
        }
        return `${prefix} ${singleLine}`
      }).join('\n');
    }
    return data as string;
  }
  //#endregion

  //#region @backend
  isFolder(pathToFileOrMaybeFolder: string) {
    return pathToFileOrMaybeFolder && fse.existsSync(pathToFileOrMaybeFolder) &&
      fse.lstatSync(pathToFileOrMaybeFolder).isDirectory();
  }
  //#endregion

  /**
   * Quick fix for object values
   */
  values(obj: any) {
    if (_.isObject(obj) && !Array.isArray(obj)) {
      const values = [];
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          values.push(obj[key]);
        }
      }
      return values;
    }
    return [];
  }

  //#region @backend
  /**
   * does not make sense
   */
  private isFile(pathToFileOrMaybeFolder: string) {
    return pathToFileOrMaybeFolder && fse.existsSync(pathToFileOrMaybeFolder) &&
      !fse.lstatSync(pathToFileOrMaybeFolder).isDirectory();
  }
  //#endregion

  //#region @backend
  /**
    * wrapper for fs.readFileSync
    */
  readFile(absoluteFilePath: string | string[], defaultValueWhenNotExists = void 0 as string): string | undefined {
    if (_.isArray(absoluteFilePath)) {
      absoluteFilePath = path.join.apply(this, absoluteFilePath);
    }
    absoluteFilePath = absoluteFilePath as string;

    if (absoluteFilePath.startsWith('/Users/dariusz/projects/npm/tnp-config/tmp-bundle-release/bundle/project/tnp-config/bundle/node_modules')) {
      debugger
    }

    if (!fse.existsSync(absoluteFilePath)) {
      return defaultValueWhenNotExists;
    }
    if (fse.lstatSync(absoluteFilePath).isDirectory()) {
      return defaultValueWhenNotExists;
    }
    return fse.readFileSync(absoluteFilePath, {
      encoding
    }).toString().trim();
  }
  //#endregion

  //#region @backend
  readJson(absoluteFilePath: string | string[], defaultValue = {}, useJson5 = false) {
    if (_.isArray(absoluteFilePath)) {
      absoluteFilePath = path.join.apply(this, absoluteFilePath);
    }
    absoluteFilePath = absoluteFilePath as string;

    if (!fse.existsSync(absoluteFilePath)) {
      return {};
    }
    try {
      const fileContent = Helpers.readFile(absoluteFilePath);
      let json;
      json = Helpers.parse(fileContent, useJson5 || absoluteFilePath.endsWith('.json5'));
      return json;
    } catch (error) {
      return defaultValue;
    }
  }
  //#endregion

  //#region @backend
  parse<T = any>(jsonInstring: string, useJson5 = false) {
    if (!_.isString(jsonInstring)) {
      Helpers.log(jsonInstring)
      Helpers.warn(`[tnp-helpers] Trying to parse no a string...`)
      return jsonInstring;
    }
    return (useJson5 ? json5.parse(jsonInstring) : JSON.parse(jsonInstring)) as T;
  }
  //#endregion

  //#region @backend
  async compilationWrapper(fn: () => void, taskName: string = 'Task',
    executionType: 'Compilation of' | 'Code execution of' | 'Event:' = 'Compilation of') {

    // global?.spinner?.start();
    function currentDate() {
      return `[${dateformat(new Date(), 'HH:MM:ss')}]`;
    }
    if (!fn || !_.isFunction(fn)) {
      Helpers.error(`${executionType} wrapper: "${fn}" is not a function.`)
      process.exit(1)
    }

    try {
      Helpers.log(`${currentDate()} ${executionType} "${taskName}" Started..`)
      await Helpers.runSyncOrAsync(fn)
      Helpers.log(`${currentDate()} ${executionType} "${taskName}" Done\u2713`)
    } catch (error) {
      Helpers.error(chalk.red(error), false, true);
      Helpers.log(`${currentDate()} ${executionType} ${taskName} ERROR`);
      process.exit(1);
    }
    // global?.spinner?.stop();
  }
  //#endregion

  //#region @backend
  /**
   * wrapper for fs.writeFileSync
   */
  writeFile(absoluteFilePath: string | (string[]), input: string | object,
    options?: { overrideSameFile?: boolean; preventParentFile?: boolean; }): boolean {

    if (_.isArray(absoluteFilePath)) {
      absoluteFilePath = path.join.apply(this, absoluteFilePath);
    }
    absoluteFilePath = absoluteFilePath as string;
    if (Helpers.isExistedSymlink(absoluteFilePath as any)) {
      const beforePath = absoluteFilePath;
      absoluteFilePath = fse.realpathSync(absoluteFilePath as any);
      Helpers.warn(`WRITTING JSON into real path:
      original: ${beforePath}
      real    : ${absoluteFilePath}
      `);
    }

    const { preventParentFile, overrideSameFile } = options || {};
    const dontWriteSameFile = !overrideSameFile;

    if (preventParentFile) {
      if (Helpers.isFile(path.dirname(absoluteFilePath)) && fse.existsSync(path.dirname(absoluteFilePath))) {
        fse.unlinkSync(path.dirname(absoluteFilePath));
      }
    }

    if (!fse.existsSync(path.dirname(absoluteFilePath))) {
      Helpers.mkdirp(path.dirname(absoluteFilePath));
    }

    if (_.isObject(input)) {
      input = Helpers.stringify(input);
    } else if (!_.isString(input)) {
      input = ''
    }
    if (dontWriteSameFile) {
      if (fse.existsSync(absoluteFilePath)) {
        const existedInput = Helpers.readFile(absoluteFilePath);
        if (input === existedInput) {
          // Helpers.log(`[helpers][writeFile] not writing same file (good thing): ${absoluteFilePath}`);
          return false;
        }
      }
    }

    fse.writeFileSync(absoluteFilePath, input, {
      encoding
    });
    return true;
  }
  //#endregion

  //#region @backend
  /**
   * wrapper for fs.writeFileSync
   */
  writeJson(absoluteFilePath: string | (string[]), input: object,
    optoins?: { preventParentFile?: boolean }): boolean {

    if (_.isArray(absoluteFilePath)) {
      absoluteFilePath = path.join.apply(this, absoluteFilePath);
    }
    absoluteFilePath = absoluteFilePath as string;
    const { preventParentFile } = optoins || {};

    if (preventParentFile) {
      if (Helpers.isFile(path.dirname(absoluteFilePath)) && fse.existsSync(path.dirname(absoluteFilePath))) {
        fse.unlinkSync(path.dirname(absoluteFilePath));
      }
    }

    if (!fse.existsSync(path.dirname(absoluteFilePath))) {
      Helpers.mkdirp(path.dirname(absoluteFilePath));
    }

    fse.writeJSONSync(absoluteFilePath, input, {
      encoding,
      spaces: 2
    });
    return true;
  }
  //#endregion

  //#region @backend
  /**
   * return absolute paths for folders inside folders
   */
  foldersFrom(pathToFolder: string | string[]) {
    if (_.isArray(pathToFolder)) {
      pathToFolder = path.join(...pathToFolder) as string;
    }
    if (!Helpers.exists(pathToFolder)) {
      return [];
    }
    return fse.readdirSync(pathToFolder)
      .map(f => path.join(pathToFolder as string, f))
      .filter(f => fse.lstatSync(f).isDirectory())
      ;
  }


  linksToFoldersFrom(pathToFolder: string | string[], outputRealPath = false) {
    if (_.isArray(pathToFolder)) {
      pathToFolder = path.join(...pathToFolder) as string;
    }
    if (!Helpers.exists(pathToFolder)) {
      return [];
    }
    return fse.readdirSync(pathToFolder)
      .map(f => path.join(pathToFolder as string, f))
      .filter(f => fse.existsSync(f) && fse.lstatSync(f).isSymbolicLink())
      .map(f => {
        const realPath = fse.realpathSync(f);
        const isFolder = Helpers.isFolder(realPath);
        if (isFolder) {
          if (outputRealPath) {
            return realPath;
          } else {
            return f;
          }
        }
      }).filter(f => !!f);
  }
  //#endregion

  //#region @backend
  /**
   * return absolute paths for folders inside folders
   */
  linksToFolderFrom(
    pathToFolder: string | string[],
    // options?: {
    //   linksOnlyTo: 'files' | 'folders' | 'both'
    // }
  ): string[] {
    // options = (options || {}) as any;
    // if (_.isUndefined(options.linksOnlyTo)) {
    //   options.linksOnlyTo = 'both';
    // }
    if (_.isArray(pathToFolder)) {
      pathToFolder = path.join(...pathToFolder) as string;
    }
    if (!Helpers.exists(pathToFolder)) {
      return [];
    }
    return fse.readdirSync(pathToFolder)
      .map(f => path.join(pathToFolder as string, f))
      .filter(f => {
        let res = false;
        if (Helpers.isExistedSymlink(f)) {
          const realPath = fse.realpathSync(f);
          return Helpers.isFolder(realPath);
        }
        return res;
      });
  }
  //#endregion

  //#region @backend
  /**
   * return absolute paths for folders inside folders
   */
  filesFrom(pathToFolder: string | string[], recrusive = false): string[] {
    if (_.isArray(pathToFolder)) {
      pathToFolder = path.join(...pathToFolder) as string;
    }
    if (!Helpers.exists(pathToFolder)) {
      return [];
    }
    if (recrusive) {
      const all = fse.readdirSync(pathToFolder)
        .map(f => path.join(pathToFolder as string, f));
      const folders = [] as string[];
      const files = all.filter(f => {
        if (fse.lstatSync(f).isDirectory()) {
          folders.push(f)
          return false;
        }
        return true;
      });

      return [
        ...files,
        ...folders
          .map(f => this.filesFrom(f, recrusive))
          .reduce((a, b) => {
            return a.concat(b);
          }, []),
      ]
    }
    return fse.readdirSync(pathToFolder)
      .map(f => path.join(pathToFolder as string, f))
      .filter(f => !fse.lstatSync(f).isDirectory())
      ;
  }



  //#endregion

  //#region @backend
  openFolderInFileExploer(folderPath: string) {
    if (process.platform === 'win32') {
      folderPath = win32Path(folderPath)
    }
    try {
      Helpers.info(`Opening path in file explorer: "${folderPath}"`)
      if (process.platform === 'win32') {
        Helpers.run(`explorer ${folderPath}`).sync();
        return;
      }
      if (process.platform === 'darwin') {
        Helpers.run(`open ${folderPath}`).sync();
        return;
      }
      Helpers.run(`xdg-open ${folderPath}`).sync();
    } catch (error) {
      if (process.platform !== 'win32') { // TODO QUICK fix explorer with path is triggering errro
        Helpers.error(`Not able to open in file explorer: "${folderPath}"`, false, true);
      }

    }

  }
  //#endregion

}
