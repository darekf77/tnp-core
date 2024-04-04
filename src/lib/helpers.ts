//#region import
import {
  _,
  path,
  //#region @backend
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
  glob,
  //#endregion
} from './core-imports';
//#region @backend
import { Blob } from 'buffer';
//#endregion

import { Helpers } from './index';
import { HelpersMessages } from './helpers-messages';
import { CoreModels } from './core-models';
import { frameworkName } from './framework-name';
//#region @browser
import { Subject, Subscription } from 'rxjs';
//#endregion
//#endregion

//#region constants
declare const global: any;
const encoding = 'utf8';
//#region @backend
const forceTrace = !global.hideLog;
const prompts = require('prompts');
//#endregion
const WEBSQL_PROC_MOCK_PROCESSES_PID = {};
const WEBSQL_PROC_MOCK_PROCESSES_PPID = {};

//#endregion

//#region models
export interface RunSyncOrAsyncOptions {
  functionFn: Function,
  context?: object,
  arrayOfParams?: any[],
}

export interface CommandOutputOptions {
  biggerBuffer?: boolean,
  showWholeCommandNotOnlyLastLine?: boolean,
  showStder?: boolean;
  gatherColors?: boolean;
  showErrorWarning?: boolean,
}
//#endregion

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

  //#region fields / getters
  //#region @backend
  readonly processes: child_process.ChildProcess[] = [];
  //#endregion
  readonly bigMaxBuffer = 2024 * 500;

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
  //#endregion

  //#region constructor
  constructor() {
    super();
    // //#region @backend
    // process.on('SIGINT', this.cleanExit); // catch ctrl-c
    // process.on('SIGTERM', this.cleanExit); // catch kill
    // //#endregion
  }
  //#endregion

  //#region methods

  mediaTypeFromSrc(src: string): CoreModels.MediaType {
    const ext = path.extname(src);
    const media = CoreModels.mimeTypes[ext];
    return _.first(media?.split('/'));
  }

  //#region methods / remove file or folder
  //#region @backend
  remove(fileOrFolderPathOrPatter: string | string[], exactFolder = false) {
    if (Array.isArray(fileOrFolderPathOrPatter)) {
      fileOrFolderPathOrPatter = path.join(...fileOrFolderPathOrPatter);
    }
    Helpers.log(`[firedev-core][remove]: ${fileOrFolderPathOrPatter}`, 1);
    if (exactFolder) {
      rimraf.sync(fileOrFolderPathOrPatter, { glob: false, disableGlob: true, });
      return;
    }
    rimraf.sync(fileOrFolderPathOrPatter);
  }
  //#endregion
  //#endregion

  //#region methods / clean exit proces
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
  //#endregion

  /**
   * check if function is class
   */
  isClass(funcOrClass: any): boolean {
    let isClass = false;
    if (typeof funcOrClass === 'function') {
      // Check if it has a prototype property
      // console.log('Object.getOwnPropertyNames(funcOrClass.prototype)', Object.getOwnPropertyNames(funcOrClass.prototype).filter(f => f !== 'constructor'))
      isClass = !!funcOrClass.prototype && Object.getOwnPropertyNames(funcOrClass.prototype).filter(f => f !== 'constructor').length > 0;
    }
    // console.log('is class: ' + isClass, funcOrClass)
    return isClass;
  }


  //#region methods / is blob
  /**
   * check if data is nodejs/browser blob
   *
   * @param maybeBlob
   * @returns
   */
  public isBlob(maybeBlob): maybeBlob is Blob {
    // TODO is this needed hmmmm
    return maybeBlob instanceof Blob; // || toString.call(maybeBlob) === '[object Blob]';
  }
  //#endregion

  //#region methods / is buffer
  /**
   * Check if data is nodejs buffer
   *
   * @param maybeNodejsBuffer
   * @returns
   */
  //#region @backend
  public isBuffer(maybeNodejsBuffer): maybeNodejsBuffer is Buffer {
    return Buffer.isBuffer(maybeNodejsBuffer);
  }
  //#endregion
  //#endregion

  //#region methods / remove slash at the end of string
  public removeSlashAtEnd(s: string): string {
    s = s?.endsWith(`/`) ? s.slice(0, s.length - 1) : s;
    return s;
  }
  //#endregion

  //#region methods / remove slash at the begin of string
  public removeSlashAtBegin(s: string): string {
    s = s?.startsWith(`/`) ? s.slice(1) : s;
    return s;
  }
  //#endregion

  //#region methods / stringify object pretty format
  /**
   * stringify to pretty json string
   */
  public stringify(inputObject: any): string {
    // if (_.isString(inputObject)) {
    //   return inputObject;
    // }
    // if (_.isObject(inputObject)) {
    //   config.log(inputObject)
    //   Helpers.error(`[tnp-helpers] trying to stringify not a object`, false, true);
    // }
    return JSON.stringify(inputObject, null, 2);
  }
  //#endregion

  //#region methods / run sync or async
  public async runSyncOrAsync<FUNCTION_RETURN_TYPE = any>(
    fnOrOptions: RunSyncOrAsyncOptions): Promise<FUNCTION_RETURN_TYPE> {
    if (_.isUndefined(fnOrOptions)) {
      return void 0 as any;
    }
    let promisOrValue: any;
    // const optionsMode = _.isObject(fnOrOptions)
    //   && !_.isArray(fnOrOptions)
    //   && !_.isFunction(fnOrOptions)
    //   && !_.isNil(fnOrOptions)
    //   ;

    // if (optionsMode) {
    const { functionFn, context, arrayOfParams } = fnOrOptions;
    promisOrValue = functionFn.apply(context, arrayOfParams);
    // } else {
    //   // @ts-ignore
    //   promisOrValue = _.isArray(fnOrOptions) ? fnOrOptions[1][fnOrOptions[0]](...firstArg) : fnOrOptions(...firstArg);
    // }
    // let wasPromise = false;

    if (promisOrValue instanceof Promise) {
      // wasPromise = true;
      promisOrValue = Promise.resolve(promisOrValue)
    }
    // console.log('was promis ', wasPromise)
    return promisOrValue;
  }
  //#endregion

  //#region methods / create symlink
  //#region @backend
  public createSymLink(existedFileOrFolder: string, destinationPath: string,
    options?: {
      continueWhenExistedFolderDoesntExists?: boolean;
      windowsHardLink?: boolean;
      dontRenameWhenSlashAtEnd?: boolean;
      allowNotAbsolutePathes?: boolean;
      /**
       * only if you know that symlink can be created
       */
      speedUpProcess?: boolean;
    }): void {

    //#region fix parameters
    existedFileOrFolder = crossPlatformPath(existedFileOrFolder);
    destinationPath = crossPlatformPath(destinationPath);
    // console.trace(`Creating link:
    // from: ${existedFileOrFolder},
    // to: ${destinationPath},
    // `)

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
          if (
            (path.basename(path.dirname(targetExisted)) === '.bin') // TODO QUICK_FIX MEGA HACK
            && (path.basename(path.dirname(path.dirname(targetExisted))) === 'node_modules')
          ) {
            fse.linkSync(targetExisted, linkDest)
          } else {
            const winLinkCommand = `mklink ${windowsHardLink ? '/D' : (targetIsFile ? '/H' : '/j')} "${linkDest}" "${targetExisted}"`;
            const showSymlinkOutputOnWindows = forceTrace;
            Helpers.run(winLinkCommand, {
              biggerBuffer: false,
              output: showSymlinkOutputOnWindows,
              silence: !showSymlinkOutputOnWindows,
            }).sync();
          }
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
  //#endregion

  //#region methods / mkdirp
  //#region @backend
  public mkdirp(folderPath: string | string[]): void {
    if (_.isArray(folderPath)) {
      folderPath = path.join(...folderPath);
    }
    if (!path.isAbsolute(folderPath)) {
      Helpers.warn(`[firedev-core][mkdirp] Path is not absolute, abort ${folderPath}`, true);
      return;
    }
    if (_.isString(folderPath) && folderPath.startsWith('/tmp ') && os.platform() === 'darwin') {
      Helpers.warn(`[firedev-core][mkdirp] On mac osx /tmp is changed to /private/tmp`, false);
      folderPath = folderPath.replace(`/tmp/`, '/private/tmp/');
    }

    if (Helpers.isUnexistedLink(folderPath)) {
      Helpers.remove(folderPath);
    }

    if (fse.existsSync(folderPath)) {
      Helpers.log(`[firedev-core][mkdirp] folder path already exists: ${folderPath}`);
    } else {
      // if(Helpers.isSymlinkFileExitedOrUnexisted(folderPath)) {
      //   Helpers.error(`Folder is symlink.. can't recreate`)
      // }
      Helpers.log(`[firedev-core][mkdirp] ${folderPath}`, 1)
      fse.mkdirpSync(folderPath);
    }
  }
  //#endregion
  //#endregion

  //#region methods / is symlink that matches url
  /**
   * symlink may have existed or unexisted destiantion url
   * @param destUrl M
   */
  public isSymlinkThatMatchesUrl(
    possibleSymlink: string,
    destUrl: string,
    absoluteFileMatch = false,
  ): boolean {
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
  //#endregion

  //#region methods / is symlink file existed or unexisted
  public isSymlinkFileExitedOrUnexisted(filePath: string): boolean {
    //#region @backendFunc
    try {
      const linkToUnexitedLink = fse.lstatSync(filePath).isSymbolicLink();
      return linkToUnexitedLink;
    } catch (error) {
      return false;
    }
    //#endregion
  }
  //#endregion

  //#region methods / is unexisted link
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
  //#endregion

  //#region methods / is exited symlink
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
  //#endregion

  //#region methods / path contain link
  //#region @backend
  public pathContainLink(p: string) {
    let previous: string;
    while (true) {
      p = crossPlatformPath(path.dirname(p));
      // @ts-ignore
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
  //#endregion

  //#region methods / exists
  public exists(folderOrFilePath: string | string[]
    // , allowUnexistedLinks = false
  ) {
    //#region @backendFunc
    if (_.isArray(folderOrFilePath)) {
      folderOrFilePath = path.join(...folderOrFilePath);
    }
    if (!folderOrFilePath) {
      Helpers.warn(`[firedev-core][exists] Path is not a string, abort.. "${folderOrFilePath}"`, true);
      return false;
    }
    if (!path.isAbsolute(folderOrFilePath)) {
      Helpers.warn(`[firedev-core]
      File path is not absolute:
      ${folderOrFilePath}

      `, true);
      return false;
    }


    return fse.existsSync(folderOrFilePath);
    //#endregion
  }
  //#endregion

  //#region methods / fix command
  /**
   * this is HACK for running procesess inside processes
   */
  public _fixCommand(command: string): string {
    if (
      (command.startsWith('tnp ') || command.startsWith('firedev ')) // TODO every cli projects here that uses run and need to kill process easly!
      &&
      (command.search('-spinner=false') === -1) && (command.search('-spinner=off') === -1)) {
      command = `${command} -spinner=false`
    }

    if (global.skipCoreCheck && (command.startsWith('tnp ') || command.startsWith('firedev '))) {
      command = `${command} --skipCoreCheck`
    }
    return command
  }
  //#endregion

  //#region methods / command
  public command(command: string) {
    // console.log({ command })
    command = Helpers._fixCommand(command);

    return {
      //#region @backend
      getherOutput(options?: {
        ommitStder?: boolean;
        cwd?: string;
        biggerBuffer?: boolean;
        gatherColors?: boolean;
      }) {
        if (!options) {
          options = {} as any;
        }
        return new Promise<string>((resolve) => {
          // @ts-ignore
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

          // @ts-ignore
          proc.stdout.on('data', (data) => {
            gatheredData = `${gatheredData}${data?.toString() || ''}`;
          })

          // @ts-ignore
          proc.stdout.on('error', (data) => {
            gatheredData = `${gatheredData}${data?.toString() || ''}`;
          })

          if (!ommitStder) {
            // @ts-ignore
            proc.stderr.on('data', (data) => {
              gatheredData = `${gatheredData}${data?.toString() || ''}`;
            })

            // @ts-ignore
            proc.stderr.on('error', (data) => {
              gatheredData = `${gatheredData}${data?.toString() || ''}`;
            })
          }

        })

      }
      //#endregion
    }
  }
  //#endregion

  //#region methods / wait
  public wait(second: number): Promise<void> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve(void 0);
      }, second * 1000);
    })
  }
  //#endregion

  //#region methods / command output as string async
  //#region @backend
  async commnadOutputAsStringAsync(
    command: string,
    cwd = crossPlatformPath(process.cwd()),
    options?: CommandOutputOptions,
  ): Promise<string> {
    command = Helpers._fixCommand(command);
    const opt = (options || {}) as typeof options;
    let output = '';
    try {
      output = await Helpers.command(command).getherOutput({
        cwd, // @ts-ignore
        biggerBuffer: opt.biggerBuffer,// @ts-ignore
        ommitStder: !opt.showStder,// @ts-ignore
        gatherColors: opt.gatherColors,
      });
      // console.log({
      //   output
      // })
      // @ts-ignore
      if (opt.showWholeCommandNotOnlyLastLine) {
        // console.log('SHHOW WOLE', output)
        return output.replace(/[^\x00-\xFF]/g, '')
      }
      const splited = (output || '').split('\n');
      output = (splited.pop() || '').replace(/[^\x00-\xFF]/g, '');
    } catch (e) {
      // @ts-ignore
      if (opt.showErrorWarning) {
        Helpers.warn(`[firedev-helepr] Not able to get output from command:
        "${command}"
        `);
      }
    }
    return output;
  }
  //#endregion
  //#endregion

  //#region methods / command output as string
  //#region @backend
  commnadOutputAsString(
    command: string,
    cwd = crossPlatformPath(process.cwd()),
    options?: CommandOutputOptions,
  ): string {
    command = Helpers._fixCommand(command);
    const opt = (options || {}) as typeof options;
    let output = '';
    try {
      // @ts-ignore
      const env = opt.gatherColors ? { ...process.env, FORCE_COLOR: '1' } : {};
      // output = Helpers.run(command, { output: false, cwd, biggerBuffer }).sync().toString().trim()
      output = (child_process.execSync(command, {
        cwd, // @ts-ignore
        stdio: ['ignore', 'pipe', opt.showStder ? 'pipe' : 'ignore'], // @ts-ignore
        maxBuffer: opt.biggerBuffer ? Helpers.bigMaxBuffer : void 0,
        env,
      })?.toString() || '').trim();
      // console.log({
      //   output
      // })
      // @ts-ignore
      if (opt.showWholeCommandNotOnlyLastLine) {
        return output.replace(/[^\x00-\xFF]/g, '')
      }
      const splited = (output || '').split('\n');
      output = (splited.pop() || '').replace(/[^\x00-\xFF]/g, '');
    } catch (e) {
      // @ts-ignore
      if (opt.showErrorWarning) {
        Helpers.warn(`[firedev-helpers] Not able to get output from command:
      "${command}"
      cwd: ${cwd}
      `);
      }
    }
    return output;
  }
  //#endregion
  //#endregion

  //#region methods / kill process
  public killProcess(byPid: number) {
    //#region @backend
    // Helpers.run(`kill -9 ${byPid}`).sync()
    //#endregion
    //#region @backend
    Helpers.run(`fkill --force ${byPid}`).sync()
    // return;
    //#endregion
    //#region @websqlOnly
    if (WEBSQL_PROC_MOCK_PROCESSES_PID[byPid]) {
      const ppid = WEBSQL_PROC_MOCK_PROCESSES_PID[byPid].ppid;
      if (WEBSQL_PROC_MOCK_PROCESSES_PPID[ppid]) {
        const allChilds = WEBSQL_PROC_MOCK_PROCESSES_PPID[ppid].childProcesses as number[];
        WEBSQL_PROC_MOCK_PROCESSES_PPID[ppid].childProcesses = allChilds.filter(p => p !== byPid);
      }
      delete WEBSQL_PROC_MOCK_PROCESSES_PID[byPid];
    }

    if (WEBSQL_PROC_MOCK_PROCESSES_PPID[byPid]) {
      const childs = WEBSQL_PROC_MOCK_PROCESSES_PPID[byPid].childProcesses as number[];
      for (let index = 0; index < childs.length; index++) {
        const childPid = childs[index];
        delete WEBSQL_PROC_MOCK_PROCESSES_PID[childPid];
      }
      delete WEBSQL_PROC_MOCK_PROCESSES_PPID[byPid];
    }
    //#endregion
  }
  //#endregion

  //#region methods / run
  public run(command: string,
    options?: CoreModels.RunOptions) {
    command = Helpers._fixCommand(command);

    // console.log({ command })

    //#region @backend
    if (!options) options = {};
    if (options.output === void 0) options.output = true;
    if (options.biggerBuffer === void 0) options.biggerBuffer = false;
    if (options.cwd === void 0) options.cwd = crossPlatformPath(process.cwd())
    if (!_.isString(command)) {
      Helpers.error(`[firedev-helpers] command is not a string`)
    }
    //#endregion
    return {

      //#region @backend
      sync() { // TODO buffer

        // @ts-ignore
        if (_.isArray(options.extractFromLine)) {
          Helpers.error(`[tnp-helper] extractFromLine only for:
          - asyncAsPromise
          - async
          - unitlOutputContains

          `, false, true);
        }

        // @ts-ignore
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
      //#endregion

      //#region websql
      async(detach = false,
        //#region @browser
        mockFun?: (stdoutCallback: (dataForStdout: any) => any, stdErrcCallback: (dataForStder: any) => any, shouldProcesBeDead?: () => boolean) => Promise<number> | number
        //#endregion
      )
        //#region @backend
        : child_process.ChildProcess
      //#endregion
      {
        //#region mock of process
        //#region @browser
        if (mockFun) {
          const subStdoutSub = new Subject();
          const subStderSub = new Subject();
          const exitSub = new Subject();
          const subscribtions: Subscription[] = [];


          const procDummy = {
            stdout: {
              on(action: 'data', stdoutCallback: any) {
                if (action == 'data') {
                  subscribtions.push(subStdoutSub.subscribe(d => {
                    stdoutCallback(d);
                  }))
                }
              }
            },
            stderr: {
              on(action: 'data', stdoutCallback: any) {
                if (action == 'data') {
                  subscribtions.push(subStderSub.subscribe(d => {
                    stdoutCallback(d);
                  }))
                }
              }
            },
            on(action: 'exit', exitFun: any) {
              if (action == 'exit') {
                subscribtions.push(exitSub.subscribe(d => {
                  exitFun(d);
                }))
              }
            }, // @ts-ignore
            ppid: void 0 as number, // @ts-ignore
            pid: void 0 as number,
          };

          procDummy.pid = Math.round(Math.random() * (1000 - 100)) + 100;
          procDummy.ppid = procDummy.pid + 9999;


          WEBSQL_PROC_MOCK_PROCESSES_PID[procDummy.pid] = procDummy;
          if (!WEBSQL_PROC_MOCK_PROCESSES_PPID[procDummy.ppid]) {
            WEBSQL_PROC_MOCK_PROCESSES_PPID[procDummy.ppid] = {
              childProcesses: [],
            };
          }
          WEBSQL_PROC_MOCK_PROCESSES_PPID[procDummy.ppid].childProcesses.push(procDummy.pid);


          const checkIfProcessShouldBeDead = () => {
            return _.isNil(WEBSQL_PROC_MOCK_PROCESSES_PID[procDummy.pid]) || _.isNil(WEBSQL_PROC_MOCK_PROCESSES_PPID[procDummy.ppid])
          };

          const f = Helpers.runSyncOrAsync({
            functionFn: mockFun,
            arrayOfParams: [
              (d) => {
                setTimeout(() => {
                  subStdoutSub.next(d);
                });
              }, (d) => {
                setTimeout(() => {
                  subStderSub.next(d);
                });
              }, () => {
                const shouldBeDead = checkIfProcessShouldBeDead();
                return shouldBeDead;
              }
            ]
          });
          f.then(exitCode => {
            if (_.isNil(exitCode)) {
              exitCode = 0;
            }
            setTimeout(() => {
              exitSub.next(exitCode);
              subscribtions.forEach(s => s.unsubscribe());
            })
          }).catch((e) => {
            console.error(e);
            console.error(`Something wrong with your mock funciton`)
            exitSub.next(1);
            subscribtions.forEach(s => s.unsubscribe());
          })
          return procDummy as any;
        }
        //#endregion
        //#endregion
        //#region @backendFunc
        // @ts-ignore
        options.detach = detach;
        return Helpers.runAsyncIn(command, options);
        //#endregion
      },
      //#endregion

      //#region @backend
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
      //#endregion

      //#region @backend
      unitlOutputContains(stdoutMsg: string | string[], stderMsg?: string | string[], timeout = 0) {

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
          // @ts-ignore
          proc.stderr.on('data', (message) => {
            const data: string = message.toString().trim();
            if (!isResolved && _.isArray(stderMsg)) {
              for (let index = 0; index < stderMsg.length; index++) {
                const rejectm = stderMsg[index];
                if ((data.search(rejectm) !== -1)) {
                  Helpers.info(`[unitlOutputContains] Rejected move to next step...`);
                  isResolved = true;
                  setTimeout(() => {
                    reject();
                    proc.kill('SIGINT');
                  }, timeout);
                  break;
                }
              }
            }
          });

          // @ts-ignore
          proc.stdout.on('data', (message) => {
            const data: string = message.toString().trim();

            if (!isResolved) {
              for (let index = 0; index < stdoutMsg.length; index++) {
                const m = stdoutMsg[index];
                if ((data.search(m) !== -1)) {
                  Helpers.info(`[unitlOutputContains] Move to next step...`)
                  isResolved = true;
                  setTimeout(() => {
                    resolve(void 0);
                  }, timeout);
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
                  setTimeout(() => {
                    reject();
                    proc.kill('SIGINT');
                  }, timeout);
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
  //#endregion

  async questionYesNo(message: string,
    callbackTrue?: () => any, callbackFalse?: () => any, defaultValue = true) {
    //#region @backendFunc
    let response = {
      value: defaultValue
    };
    if (global.tnpNonInteractive) {
      Helpers.info(`${message} - AUTORESPONSE: ${defaultValue ? 'YES' : 'NO'}`);
    } else {
      response = await prompts({
        type: 'toggle',
        name: 'value',
        message,
        initial: defaultValue,
        active: 'yes',
        inactive: 'no'
      });
    }
    if (response.value) {
      if (callbackTrue) {
        await Helpers.runSyncOrAsync({ functionFn: callbackTrue });
      }
    } else {
      if (callbackFalse) {
        await Helpers.runSyncOrAsync({ functionFn: callbackFalse });
      }
    }
    return response.value;
    //#endregion
  }

  //#region methods / get stdio
  //#region @backend
  public getStdio(options?: CoreModels.RunOptions) {
    const { // @ts-ignore
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
  //#endregion

  //#region methods / run sync in
  //#region @backend
  public runSyncIn(command: string, options?: CoreModels.RunOptions) {
    // @ts-ignore
    const { cwd, biggerBuffer } = options;
    const maxBuffer = biggerBuffer ? Helpers.bigMaxBuffer : undefined;
    let stdio = Helpers.getStdio(options)
    Helpers.checkProcess(cwd, command);
    return child_process.execSync(command, { stdio, cwd, maxBuffer } as any)
  }
  //#endregion
  //#endregion

  //#region methods / run async in
  //#region @backend
  public runAsyncIn(command: string, options?: CoreModels.RunOptions) {
    // @ts-ignore
    const { output, cwd, biggerBuffer, outputLineReplace, extractFromLine, detach } = options;
    const maxBuffer = biggerBuffer ? Helpers.bigMaxBuffer : undefined;
    let stdio = Helpers.getStdio(options)
    Helpers.checkProcess(cwd, command);


    let proc: child_process.ChildProcess;
    if (detach) {
      //#region detached
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
        // @ts-ignore
        proc = child_process.spawn(cmd, argsForCmd, { cwd, detached: true });
      }
      Helpers.log(`

      DETACHED PROCESS IS WORKING ON PID: ${proc.pid}

      `)
      // proc = child.exec(`${command} &`, { cwd, maxBuffer, });
      //#endregion
    } else {
      // Helpers.log(`Command to execture: ${command}`)
      const env = { ...process.env, FORCE_COLOR: '1' };
      proc = child_process.exec(command, { cwd, maxBuffer, env });
      // if (global.globalSystemToolMode) {
      //   proc.on('exit', (code) => {
      //     Helpers.log('EXITING BIG PROCESS');
      //     debugger
      //     if (options?.exitOnError && code !== 0) {
      //       // @ts-ignore
      //       process.exit(code);
      //     }
      //   });
      // }
    }
    return Helpers.logProc(proc,
      detach ? true : output,
      detach ? void 0 : stdio,
      outputLineReplace,// @ts-ignore
      options.prefix,
      extractFromLine,
    );
  }
  //#endregion
  //#endregion

  //#region methods / log process
  //#region @backend
  logProc(proc: child_process.ChildProcess,
    output = true,
    stdio,
    outputLineReplace: (outputLine: string) => string,
    prefix: string,
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
      // @ts-ignore
      proc.stdout.on('data', (data) => {
        // if (data?.toString().search('was unexpected at this time') !== -1) {
        //   console.log('!!!COMMAND',command)
        // }

        process.stdout.write(Helpers.modifyLineByLine(data, outputLineReplace, prefix, extractFromLine))
      })

      // @ts-ignore
      proc.stdout.on('error', (data) => {
        // if (data?.toString().search('was unexpected at this time') !== -1) {
        //   console.log('!!!COMMAND',command)
        // }

        console.log(Helpers.modifyLineByLine(data, outputLineReplace, prefix, extractFromLine));
      })

      // @ts-ignore
      proc.stderr.on('data', (data) => {
        // if (data?.toString().search('was unexpected at this time') !== -1) {
        //   console.log('!!!COMMAND',command)
        // }
        process.stderr.write(Helpers.modifyLineByLine(data, outputLineReplace, prefix, extractFromLine))
      })

      // @ts-ignore
      proc.stderr.on('error', (data) => {
        // if (data?.toString().search('was unexpected at this time') !== -1) {
        //   console.log('!!!COMMAND',command)
        // }
        console.log(Helpers.modifyLineByLine(data, outputLineReplace, prefix, extractFromLine));
      })

    }

    return proc;
  }

  async execute(
    command: string,
    cwd: string,
    options?: Omit<CoreModels.ExecuteOptions, 'tryAgainWhenFailAfter'>
  ) {
    //#region options
    let {
      hideOutput,
      resolvePromiseMsg,
      outputLineReplace,
      prefix,
      extractFromLine,
      exitOnErrorCallback,
      askToTryAgainOnError,
    } = options || {};
    //#endregion

    command = Helpers._fixCommand(command);

    let childProcess: child_process.ChildProcess;
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

    const handlProc = (proc: child_process.ChildProcess) => {
      return new Promise((resolve, reject) => {

        //#region handle stdout data
        proc.stdout.on('data', (rawData) => {
          let data = (rawData?.toString() || '');

          data = Helpers.modifyLineByLine(
            data, // @ts-ignore
            outputLineReplace,
            prefix,
            extractFromLine
          );

          if (!hideOutput.stdout) {
            process.stdout.write(data);
          }


          if (!isResolved && _.isArray(resolvePromiseMsg.stdout)) { // @ts-ignore
            for (let index = 0; index < resolvePromiseMsg.stdout.length; index++) { // @ts-ignore
              const m = resolvePromiseMsg.stdout[index];
              if ((data.search(m) !== -1)) {
                // Helpers.info(`[unitlOutputContains] Move to next step...`)
                isResolved = true;
                resolve(void 0);
                break;
              }
            }
          }

          if (!isResolved && _.isArray(resolvePromiseMsg.stderr)) { // @ts-ignore
            for (let index = 0; index < resolvePromiseMsg.stderr.length; index++) { // @ts-ignore
              const rejectm = resolvePromiseMsg.stderr[index];
              if ((data.search(rejectm) !== -1)) {
                // Helpers.info(`[unitlOutputContains] Rejected move to next step...`);
                isResolved = true;
                reject();
                proc.kill('SIGINT');
                break;
              }
            }
          }

        });
        //#endregion

        //#region handle exit process
        proc.on('exit', async (code) => {
          // console.log(`Command exit code: ${code}`)
          if (hideOutput.acceptAllExitCodeAsSuccess) {
            resolve(void 0);
          } else {

            if (code !== 0) {
              if (_.isFunction(exitOnErrorCallback)) {
                try {
                  await this.runSyncOrAsync({
                    functionFn: exitOnErrorCallback,
                    arrayOfParams: [code],
                  });
                  reject(`Command failed with code=${code}`);
                } catch (error) {
                  reject(error);
                }
              } else {
                reject(`Command failed with code=${code}`);
              }
            } else {
              resolve(void 0);
            }
          }


        });
        //#endregion

        //#region handle stdout error
        proc.stdout.on('error', (rawData) => {
          let data = (rawData?.toString() || '');
          data = Helpers.modifyLineByLine(
            data, // @ts-ignore
            outputLineReplace,
            prefix,
            extractFromLine
          );

          if (!hideOutput.stdout) {
            process.stdout.write(JSON.stringify(data))
          }

          // console.log(data);
        })
        //#endregion

        //#region handle stder data
        proc.stderr.on('data', (rawData) => {
          let data = (rawData?.toString() || '');
          data = Helpers.modifyLineByLine(
            data, // @ts-ignore
            outputLineReplace,
            prefix,
            extractFromLine
          );

          if (!hideOutput.stderr) {
            process.stderr.write(data);
          }

          if (!isResolved && _.isArray(resolvePromiseMsg.stderr)) { // @ts-ignore
            for (let index = 0; index < resolvePromiseMsg.stderr.length; index++) { // @ts-ignore
              const rejectm = resolvePromiseMsg.stderr[index];
              if ((data.search(rejectm) !== -1)) {
                // Helpers.info(`[unitlOutputContains] Rejected move to next step...`);
                isResolved = true;
                reject();
                proc.kill('SIGINT');
                break;
              }
            }
          }

        });
        //#endregion

        //#region handle stder error
        proc.stderr.on('error', (rawData) => {
          let data = (rawData?.toString() || '');
          data = Helpers.modifyLineByLine(
            data, // @ts-ignore
            outputLineReplace,
            prefix,
            extractFromLine
          );

          // @ts-ignore
          if (!hideOutput.stderr) {
            process.stderr.write(JSON.stringify(data))
          }
          // console.log(data);
        });
        //#endregion
      });
    };

    while (true) {
      childProcess = child_process.exec(command, { cwd });
      try {
        await handlProc(childProcess);
        break;
      } catch (error) {
        Helpers.error(`Command failed:

${command}

in location: ${cwd}

        `, true, true);
        if (askToTryAgainOnError) {
          if (!(await Helpers.questionYesNo(`Try again this command ?`))) {
            throw error;
          }
        } else {
          throw error;
        }
      }
    }
  }
  //#endregion
  //#endregion

  //#region methods / check process
  //#region @backend
  /**
   * @deprecated
   */
  public checkProcess(dirPath: string, command: string) {
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
  //#endregion

  //#region methods / modify line by line
  //#region @backend
  public modifyLineByLine(
    data: string | Buffer | Error,
    outputLineReplace: (outputLine: string) => string,
    prefix: string,
    extractFromLine?: (string | Function)[],
  ): string {
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
  //#endregion

  //#region methods / is folder
  //#region @backend
  public isFolder(pathToFileOrMaybeFolder: string): boolean {
    return !!(
      pathToFileOrMaybeFolder &&
      fse.existsSync(pathToFileOrMaybeFolder) &&
      fse.lstatSync(pathToFileOrMaybeFolder).isDirectory()
    );
  }
  //#endregion
  //#endregion

  //#region methods / values
  /**
   * Quick fix for object values
   * @deprecated
   */
  public values(obj: any) {
    if (_.isObject(obj) && !Array.isArray(obj)) {
      const values = [];
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          // @ts-ignore
          values.push(obj[key]);
        }
      }
      return values;
    }
    return [];
  }
  //#endregion

  //#region methods / is file
  //#region @backend
  /**
   * does not make sense
   * @deprecated
   */
  private isFile(pathToFileOrMaybeFolder: string) {
    return pathToFileOrMaybeFolder && fse.existsSync(pathToFileOrMaybeFolder) &&
      !fse.lstatSync(pathToFileOrMaybeFolder).isDirectory();
  }
  //#endregion
  //#endregion

  //#region methods / read file
  //#region @backend

  async tryReadFile(absoluteFilePath: string | string[], // @ts-ignore
    defaultValueWhenNotExists = void 0 as string,
    notTrim = false,
  ): Promise<string | undefined> {

    if (process.platform === 'win32') {
      while (true) {
        try {
          const fileContent = Helpers.readFile(absoluteFilePath, defaultValueWhenNotExists, notTrim);
          return fileContent;
        } catch (error) {
          Helpers.error(`Not able to read locked file: ${absoluteFilePath}`, true, true);
          await Helpers.wait(2);
        }
      }

    }
    return Helpers.readFile(absoluteFilePath, defaultValueWhenNotExists, notTrim);
  }

  /**
  * wrapper for fs.readFileSync
  */
  readFile(
    absoluteFilePath: string | string[], // @ts-ignore
    defaultValueWhenNotExists = void 0 as string,
    notTrim = false,
  ): string | undefined {
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
    if (notTrim) {
      return fse.readFileSync(absoluteFilePath, {
        encoding
      }).toString();
    }
    return fse.readFileSync(absoluteFilePath, {
      encoding
    }).toString().trim();
  }
  //#endregion
  //#endregion

  //#region methods / read json
  //#region @backend
  /**
   * read json from absolute path
   * @returns json object
   */
  public readJson(absoluteFilePath: string | string[], defaultValue = {}, useJson5 = false): any {
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
      // @ts-ignore
      json = Helpers.parse(fileContent, useJson5 || absoluteFilePath.endsWith('.json5'));
      return json;
    } catch (error) {
      return defaultValue;
    }
  }
  //#endregion
  //#endregion

  //#region methods / parse
  //#region @backend
  /**
   * parse json from string
   * @returns parse json object
   */
  public parse<T = any>(jsonInstring: string, useJson5 = false): any {
    if (!_.isString(jsonInstring)) {
      Helpers.log(jsonInstring)
      Helpers.warn(`[firedev-core] Trying to parse no a string...`)
      return jsonInstring;
    }
    return (useJson5 ? json5.parse(jsonInstring) : JSON.parse(jsonInstring)) as T;
  }
  //#endregion
  //#endregion

  //#region methods / compilation wrapper
  //#region @backend
  public async compilationWrapper(fn: () => void, taskName: string = 'Task',
    executionType: 'Compilation of' | 'Code execution of' | 'Event:' = 'Compilation of') {

    // global?.spinner?.start();
    function currentDate() {
      return `[${dateformat(new Date(), 'HH:MM:ss')}]`;
    }
    if (!fn || !_.isFunction(fn)) {
      Helpers.error(`${executionType} wrapper: "${fn}" is not a function.`)
      process.exit(1)
    }

    Helpers.log(`${currentDate()} ${executionType} "${taskName}" Started..`)
    await Helpers.runSyncOrAsync({ functionFn: fn });
    Helpers.log(`${currentDate()} ${executionType} "${taskName}" Done\u2713`)

    // global?.spinner?.stop();
  }
  //#endregion
  //#endregion

  //#region methods / write file
  //#region @backend
  /**
   * wrapper for fs.writeFileSync
   */
  writeFile(absoluteFilePath: string | (string[]), input: string | object
    //#region @backend
    | Buffer
    //#endregion
    ,
    options?: { overrideSameFile?: boolean; preventParentFile?: boolean; }): boolean {

    if (_.isArray(absoluteFilePath)) {
      absoluteFilePath = path.join.apply(this, absoluteFilePath);
    }
    absoluteFilePath = absoluteFilePath as string;
    if (Helpers.isExistedSymlink(absoluteFilePath as any)) {
      const beforePath = absoluteFilePath;
      absoluteFilePath = fse.realpathSync(absoluteFilePath as any);
      Helpers.warn(`[firedev-core] WRITTING JSON into real path:
      original: ${beforePath}
      real    : ${absoluteFilePath}
      `, forceTrace);
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

    if (Helpers.isBuffer(input)) {
      fse.writeFileSync(absoluteFilePath, input);
      return true;
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
  //#endregion

  //#region methods / write json
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
  //#endregion

  //#region methods / folders from
  //#region @backend
  /**
   * return absolute paths for folders inside folders
   * @returns absoulte pathes to folders from path
   */
  public foldersFrom(pathToFolder: string | string[]): string[] {
    if (_.isArray(pathToFolder)) {
      pathToFolder = path.join(...pathToFolder) as string;
    }
    if (!Helpers.exists(pathToFolder)) {
      return [];
    }
    return fse.readdirSync(pathToFolder)
      .map(f => crossPlatformPath(path.join(pathToFolder as string, f)))
      .filter(f => fse.lstatSync(f).isDirectory())
      ;
  }
  //#endregion
  //#endregion

  //#region methods / links from
  //#region @backend
  /**
   * @returns absolute pathes to links from path
   */
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
      }).filter(f => !!f)
      // @ts-ignore
      .map(f => crossPlatformPath(f));
  }
  //#endregion
  //#endregion

  //#region methods / links to folders from path
  //#region @backend
  /**
   * @returns absolute paths for folders inside folders
   */
  public linksToFolderFrom(
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
      })
      .map(f => crossPlatformPath(f));
  }
  //#endregion
  //#endregion

  //#region methods / files from
  //#region @backend
  /**
   * return absolute paths for folders inside folders
   */
  public filesFrom(
    pathToFolder: string | string[],
    recrusive = false,
    incudeUnexistedLinks = false,
  ): string[] {
    if (_.isArray(pathToFolder)) {
      pathToFolder = path.join(...pathToFolder) as string;
    }
    if (!Helpers.exists(pathToFolder)) {
      return [];
    }

    if (recrusive && incudeUnexistedLinks) {
      return glob.sync(`${pathToFolder}/**/*.*`);
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
      ].map(f => crossPlatformPath(f));
    }
    return fse.readdirSync(pathToFolder)
      .map(f => crossPlatformPath(path.join(pathToFolder as string, f)))
      .filter(f => {
        return !fse.lstatSync(f).isDirectory()
      })
  }
  //#endregion
  //#endregion

  //#region methods / open folder in file explorer
  //#region @backend
  public openFolderInFileExploer(folderPath: string): void {
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
  //#endregion

  //#endregion
}
