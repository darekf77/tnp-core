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
import { RunOptions } from './core-models';

declare const global: any;
const encoding = 'utf8';

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

  async runSyncOrAsync(fn: Function | [string, object], ...firstArg: any[]) {
    if (_.isUndefined(fn)) {
      return;
    }
    // let wasPromise = false;
    // @ts-ignore
    let promisOrValue = _.isArray(fn) ? fn[1][fn[0]](...firstArg) : fn(...firstArg);
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
      /**
       * only if you know that symlink can be created
       */
      speedUpProcess?: boolean;
    }) {
    existedFileOrFolder = crossPlatformPath(existedFileOrFolder);
    destinationPath = crossPlatformPath(destinationPath);

    Helpers.log(`[tnp-helpers][create link] exited -> dest
    ${existedFileOrFolder} ${destinationPath}`);

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
    const { continueWhenExistedFolderDoesntExists, windowsHardLink, speedUpProcess } = options;

    // console.log('Create link!')


    let target = existedFileOrFolder;
    let link = destinationPath;

    if (!fse.existsSync(existedFileOrFolder)) {
      if (continueWhenExistedFolderDoesntExists) {
        // just continue and create link to not existed folder
      } else {
        Helpers.error(`[helpers.createLink] target path doesn't exist: ${existedFileOrFolder}`)
      }
    }

    /**
     * support for
     * pwd -> /mysource
     * ln -s . /test/inside -> /test/inside/mysource
     * ln -s ./ /test/inside -> /test/inside/mysource
     */
    if (link === '.' || link === './') {
      link = crossPlatformPath(process.cwd());
    }

    if (!path.isAbsolute(link)) {
      link = crossPlatformPath(path.join(crossPlatformPath(process.cwd()), link));
    }

    if (!path.isAbsolute(target)) {
      target = crossPlatformPath(path.join(crossPlatformPath(process.cwd()), target));
    }

    if (link.endsWith('/')) {
      link = crossPlatformPath(path.join(link, path.basename(target)))
    }

    if (!fse.existsSync(path.dirname(link))) {
      Helpers.mkdirp(path.dirname(link))
    }

    const resolvedLink = crossPlatformPath(path.resolve(link));
    const resolvedTarget = crossPlatformPath(path.resolve(target));
    const targetIsFile = Helpers.isFile(resolvedTarget);

    if (!speedUpProcess) {
      const exactSameLocations = (resolvedLink === resolvedTarget);
      // const tagetIsLink = Helpers.isLink(resolvedTarget);
      // const exactSameLinks = (tagetIsLink && (fse.readlinkSync(resolvedTarget) === resolvedLink));
      // const exactSameOverrideTargetLink = (tagetIsLink && (fse.readlinkSync(resolvedTarget) === resolvedTarget));

      const targetIsLink = Helpers.isLink(resolvedTarget);

      const exactSameOVerrideTarget = (
        !Helpers.isLink(resolvedLink)
        && Helpers.exists(resolvedLink)
        && !targetIsLink
        && Helpers.exists(resolvedTarget)
        && Helpers.isFile(resolvedLink)
        && targetIsFile // TODO refactor this
        && Helpers.readFile(resolvedLink) === Helpers.readFile(resolvedTarget)
      );
      if (exactSameLocations) {
        Helpers.warn(`[createSymLink] Trying to link same location`);
        return;
      }
      // if (exactSameLinks) {
      //   Helpers.warn(`[createSymLink] Trying to link same link`);
      //   return;
      // }
      // if (exactSameOverrideTargetLink) {
      //   Helpers.warn(`[createSymLink] Trying to override same link with link to itself`);
      //   return;
      // }
      if (exactSameOVerrideTarget) {
        const linkContainerLink = Helpers.pathContainLink(resolvedLink);
        const targetContainerLink = Helpers.pathContainLink(resolvedTarget);
        if (
          (!linkContainerLink && targetContainerLink)
          || (linkContainerLink && !targetContainerLink)
        ) {
          Helpers.warn(`[createSymLink] Trying to override same file with link to itself:
          ${resolvedLink}
          to
          ${resolvedTarget}
          `);
          return;
        }
      }


      rimraf.sync(link);
    }

    if (process.platform === 'win32') {
      if (Helpers.isLink(target)) {
        Helpers.info(`FIXING TARGET FOR WINDOWS`)
        target = crossPlatformPath(fse.realpathSync(target));
        // TODO QUICK_FIX on windows you can't create link to link
      }
      target = path.win32.normalize(target).replace(/\\$/, '');
      link = path.win32.normalize(link).replace(/\\$/, '');

      // const winLinkCommand = `cmd  /c "mklink /D ${link} ${target}"`;
      // const winLinkCommand = `export MSYS=winsymlinks:nativestrict && ln -s ${target} ${link}`;
      const winLinkCommand = `mklink ${windowsHardLink ? '/D' : (targetIsFile ? '/H' : '/j')} "${link}" "${target}"`;
      Helpers.log(`windows link: lnk ${target} ${link}

      "${winLinkCommand}'
      `);
      try {
        Helpers.run(winLinkCommand, { biggerBuffer: false }).sync();
      } catch (error) {
        Helpers.error(error, true, false);
        Helpers.error(`
        command: "${winLinkCommand}"
        [tnp-helpers] windows link error
        target: "${target}"
        link: "${link}"
        command: "${winLinkCommand}"
        `, true, false)
      }
    } else {
      fse.symlinkSync(target, link)
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
      fse.mkdirpSync(folderPath);
    }
  }
  //#endregion

  //#region @backend
  /**
   * @param existedLink check if source of link exists
   */
  isLink(filePath: string, existedLink = false) {
    if (!fse.existsSync(filePath)) {
      return false;
    }
    filePath = Helpers.removeSlashAtEnd(filePath);
    let isLink = false;
    if (process.platform === 'win32') {
      filePath = path.win32.normalize(filePath);
      // console.log('extename: ', path.extname(filePath))
      isLink = fse.lstatSync(filePath).isSymbolicLink() || path.extname(filePath) === '.lnk';
    } else {
      if (process.platform === 'darwin') {
        isLink = fse.lstatSync(filePath).isSymbolicLink();
        // try { // TODO Why would I want that ?
        //   const command = `[[ -L "${filePath}" && -d "${filePath}" ]] && echo "symlink"`;
        //   // console.log(command)
        //   const res = Helpers.run(command, { output: false, biggerBuffer: false }).sync().toString()
        //   return res.trim() === 'symlink'
        // } catch (error) {
        //   return false;
        // }
      } else { // TODO QUICK FIX
        isLink = fse.lstatSync(filePath).isSymbolicLink();
      }
    }
    if (existedLink) {
      const realPath = fse.realpathSync(filePath);
      return Helpers.exists(realPath);
    }
    return isLink;
  }
  //#endregion

  //#region @backend
  pathContainLink(p: string) {
    let previous: string;
    while (true) {
      p = crossPlatformPath(path.dirname(p));
      if (p === previous) {
        return false;
      }
      if (Helpers.isLink(p)) {
        return true;
      }
      if (!Helpers.exists(p)) {
        return false;
      }
      previous = p;
    }
  }
  //#endregion

  //#region @backend
  exists(folderOrFilePath: string | string[], allowUnexistedLinks = false) {
    if (_.isArray(folderOrFilePath)) {
      folderOrFilePath = path.join(...folderOrFilePath);
    }
    if (!folderOrFilePath) {
      Helpers.warn(`[helpers][exists] Path is not a string, abort.. "${folderOrFilePath}"`, true);
      return false;
    }
    if (!path.isAbsolute(folderOrFilePath)) {
      Helpers.warn(`[helpers][exists] Path is not absolute, abort.. ${folderOrFilePath}`, true);
      return false;
    }
    return fse.existsSync(folderOrFilePath);
  }
  //#endregion

  run(command: string,
    options?: RunOptions) {

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
            if (!isResolved) {
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
            if (!isResolved) {
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
      output, silence,
      // pipeToParentProcerss = false,
      // inheritFromParentProcerss = false
    } = options;
    let stdio = output ? [0, 1, 2] : ((_.isBoolean(silence) && silence) ? 'ignore' : undefined);
    // if (pipeToParentProcerss) {
    //   stdio = ['pipe', 'pipe', 'pipe'] as any;
    // }
    // if (inheritFromParentProcerss) {
    //   stdio = ['inherit', 'inherit', 'inherit'] as any;
    // }
    return stdio;
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
      console.log(`cmd: "${cmd}",  args: "${argsForCmd.join(' ')}"`)
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
      console.log(`

      DETACHED PROCESS IS WORKING ON PID: ${proc.pid}

      `)
      // proc = child.exec(`${command} &`, { cwd, maxBuffer, });
    } else {
      // Helpers.log(`Command to execture: ${command}`)
      const env = { ...process.env, FORCE_COLOR: '1' };
      proc = child_process.exec(command, { cwd, maxBuffer, env });
    }
    return Helpers.logProc(proc,
      detach ? true : output,
      detach ? void 0 : stdio,
      outputLineReplace, options.prefix, extractFromLine);
  }
  //#endregion

  //#region @backend
  logProc(proc: child_process.ChildProcess, output = true, stdio,
    outputLineReplace: (outputLine: string) => string, prefix: string,
    extractFromLine?: (string | Function)[]) {
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
        process.stdout.write(Helpers.modifyLineByLine(data, outputLineReplace, prefix, extractFromLine))
      })

      proc.stdout.on('error', (data) => {
        console.log(Helpers.modifyLineByLine(data, outputLineReplace, prefix, extractFromLine));
      })

      proc.stderr.on('data', (data) => {
        process.stderr.write(Helpers.modifyLineByLine(data, outputLineReplace, prefix, extractFromLine))
      })

      proc.stderr.on('error', (data) => {
        console.log(Helpers.modifyLineByLine(data, outputLineReplace, prefix, extractFromLine));
      })

    }

    return proc;
  }

  logProc2(proc: child_process.ChildProcess, stdoutMsg?: string | string[], stderMsg?: string | string[]) {
    // processes.push(proc);
    let isResolved = false;

    if (_.isString(stdoutMsg)) {
      stdoutMsg = [stdoutMsg];
    }
    if (_.isString(stderMsg)) {
      stderMsg = [stderMsg];
    }

    return new Promise((resolve, reject) => {

      // let stdio = [0,1,2]
      proc.stdout.on('data', (message) => {
        process.stdout.write(message);
        const data: string = message.toString().trim();

        if (!isResolved && _.isArray(stdoutMsg)) {
          for (let index = 0; index < stdoutMsg.length; index++) {
            const m = stdoutMsg[index];
            if ((data.search(m) !== -1)) {
              // Helpers.info(`[unitlOutputContains] Move to next step...`)
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
              // Helpers.info(`[unitlOutputContains] Rejected move to next step...`);
              isResolved = true;
              reject();
              proc.kill('SIGINT');
              break;
            }
          }
        }

        // console.log(data.toString());
      })

      proc.stdout.on('error', (data) => {
        process.stdout.write(JSON.stringify(data))
        // console.log(data);
      })

      proc.stderr.on('data', (message) => {
        process.stderr.write(message);
        // console.log(data.toString());
        const data: string = message.toString().trim();
        if (!isResolved && _.isArray(stderMsg)) {
          for (let index = 0; index < stderMsg.length; index++) {
            const rejectm = stderMsg[index];
            if ((data.search(rejectm) !== -1)) {
              // Helpers.info(`[unitlOutputContains] Rejected move to next step...`);
              isResolved = true;
              reject();
              proc.kill('SIGINT');
              break;
            }
          }
        }

      })

      proc.stderr.on('error', (data) => {
        process.stderr.write(JSON.stringify(data))
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
      data = data.split(/\r?\n/).map(line => outputLineReplace(line)).join('\n');
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
  isFile(pathToFileOrMaybeFolder: string) {
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
      Helpers.log(chalk.red(error));
      Helpers.log(`${currentDate()} ${executionType} ${taskName} ERROR`);
      process.exit(1);
    }

  }
  //#endregion

  //#region @backend
  /**
   * wrapper for fs.writeFileSync
   */
  writeFile(absoluteFilePath: string | (string[]), input: string | object, dontWriteSameFile = true): boolean {
    if (_.isArray(absoluteFilePath)) {
      absoluteFilePath = path.join.apply(this, absoluteFilePath);
    }
    absoluteFilePath = absoluteFilePath as string;
    if (Helpers.isLink(absoluteFilePath as any)) {
      Helpers.warn(`WRITTING JSON into real path`);
      absoluteFilePath = fse.realpathSync(absoluteFilePath as any);
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
  writeJson(absoluteFilePath: string | (string[]), input: object): boolean {
    if (_.isArray(absoluteFilePath)) {
      absoluteFilePath = path.join.apply(this, absoluteFilePath);
    }
    absoluteFilePath = absoluteFilePath as string;

    if (!Helpers.exists(path.dirname(absoluteFilePath))) {
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
  linksFrom(
    pathToFolder: string | string[],
    options?: {
      onlyLinksToExistedFilesOrFolder?: boolean;
      linksOnlyTo: 'files' | 'folders' | 'both'
    }
  ): string[] {
    options = (options || {}) as any;
    if (_.isUndefined(options.linksOnlyTo)) {
      options.linksOnlyTo = 'both';
    }
    if (_.isUndefined(options.onlyLinksToExistedFilesOrFolder)) {
      options.onlyLinksToExistedFilesOrFolder = true;
    }
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
        if (Helpers.isLink(f)) {
          res = !options.onlyLinksToExistedFilesOrFolder;
          const realPath = fse.realpathSync(f);
          if (Helpers.exists(realPath)) {
            res = true;
            if (options.linksOnlyTo === 'folders') {
              res = Helpers.isFolder(realPath)
            }
            if (options.linksOnlyTo === 'files') {
              res = Helpers.isFile(realPath)
            }
          }
        }
        return res;
      });
  }
  //#endregion

  //#region @backend
  /**
   * return absolute paths for folders inside folders
   */
  filesFrom(pathToFolder: string | string[]) {
    if (_.isArray(pathToFolder)) {
      pathToFolder = path.join(...pathToFolder) as string;
    }
    if (!Helpers.exists(pathToFolder)) {
      return [];
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
