//#region import
//#region @backend
import {
  fse,
  os,
  rimraf,
  child_process,
  json5,
  chalk,
  dateformat,
  spawn,
  win32Path,
  glob,
  fkill,
} from './core-imports';
import * as json5Write from 'json10-writer/src';
import { Blob } from 'buffer'; // @backend
import { Dirent, Stats } from 'fs-extra';
//#endregion
//#region @browser
import { Subject, Subscription } from 'rxjs';
//#endregion
import { _, path, crossPlatformPath } from './core-imports';
import { UtilsJson, UtilsProcess, UtilsTerminal } from './utils';
import { Helpers, Utils, UtilsOs } from './index';
import { HelpersMessages } from './helpers-messages';
import { CoreModels } from './core-models';

import type { ChildProcess } from 'child_process';
//#endregion

//#region constants
declare const global: any;
const encoding = 'utf8';
//#region @backend
const forceTrace = !global.hideLog;
//#endregion
const WEBSQL_PROC_MOCK_PROCESSES_PID = {};
const WEBSQL_PROC_MOCK_PROCESSES_PPID = {};

//#endregion

//#region models
export interface RunSyncOrAsyncOptions {
  functionFn: Function;
  context?: object;
  arrayOfParams?: any[];
}

export interface CommandOutputOptions {
  biggerBuffer?: boolean;
  showOnlyLastLine?: boolean;
  showStder?: boolean;
  gatherColors?: boolean;
  showErrorWarning?: boolean;
}
//#endregion

// TODO UNCOMMENT
// const globalProcessStdout = {};
// const globalProcessStder = {};
// const maxProcessHistoryLinesChekc = 20;

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
  readonly processes: ChildProcess[] = [];
  //#endregion
  readonly bigMaxBuffer = 2024 * 500;

  //#region @backend
  /**
   * @deprecated use UtilsOs
   */
  get isRunningIn() {
    return {
      /**
       * @deprecated use UtilsOs.isRunningInMochaTest()
       */
      mochaTest() {
        return UtilsOs.isRunningInMochaTest();
      },
      /**
       * @deprecated use UtilsOs.isRunningInCliMode()
       */
      cliMode() {
        return UtilsOs.isRunningInCliMode();
      },
    };
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

  //#region methods / is wsl
  /**
   * @deprecated use UtilsOs.isRunningInsideWsl()
   */
  get isWsl() {
    return UtilsOs.isRunningInWsl();
  }
  //#endregion

  //#region methods / is running in docker
  /**
   * @deprecated use UtilsOs.isRunningInDocker
   */
  isRunningInDocker() {
    return UtilsOs.isRunningInDocker();
  }
  //#endregion

  //#region methods / is running in docker
  /**
   * @deprecated use UtilsOs.isRunningInLinuxGraphicEnvironment
   */
  isRunningInLinuxGraphicsCapableEnvironment() {
    return UtilsOs.isRunningInLinuxGraphicsCapableEnvironment();
  }
  //#endregion

  //#region clear console
  /**
   * @deprecated use UtilsTerminal.clearConsole
   */
  clearConsole() {
    return UtilsTerminal.clearConsole();
  }
  //#endregion

  //#region methods / media from type
  mediaTypeFromSrc(src: string): CoreModels.MediaType {
    const ext = path.extname(src);
    const media = CoreModels.mimeTypes[ext];
    return _.first(media?.split('/'));
  }
  //#endregion

  //#region methods / sleep
  /**
   * @deprecated use async Utils.wait
   *
   * Helpers.sleep(2)  => await Utils.wait(2)
   */
  sleep(seconds = 1) {
    //#region @backendFunc
    if (UtilsOs.isRunningInWindowsCmd()) {
      Helpers.run(`timeout /t ${seconds} >nul`).sync();
      return;
    }
    if (UtilsOs.isRunningInWindowsPowerShell()) {
      Helpers.run(
        `powershell -Command "Start-Sleep -Seconds ${seconds}"`,
      ).sync();
      return;
    }
    Helpers.run(`sleep ${seconds}`).sync();
    //#endregion
  }
  //#endregion

  //#region methods / remove if exists
  removeIfExists(absoluteFileOrFolderPath: string | string[]) {
    //#region  @backendFunc
    if (Array.isArray(absoluteFileOrFolderPath)) {
      absoluteFileOrFolderPath = crossPlatformPath(absoluteFileOrFolderPath);
    }
    if (process.platform === 'win32') {
      rimraf.sync(absoluteFileOrFolderPath);
      return;
    }
    try {
      fse.unlinkSync(absoluteFileOrFolderPath);
    } catch (error) {}
    if (fse.existsSync(absoluteFileOrFolderPath)) {
      if (fse.lstatSync(absoluteFileOrFolderPath).isDirectory()) {
        fse.removeSync(absoluteFileOrFolderPath);
      } else {
        fse.unlinkSync(absoluteFileOrFolderPath);
      }
    }
    //#endregion
  }
  //#endregion

  //#region methods / relative
  /**
   * path.relative that return cross platform path
   */
  relative(cwd: string, to: string) {
    return crossPlatformPath(path.relative(cwd, to));
  }
  //#endregion

  //#region methods / remove file if exists
  removeFileIfExists(absoluteFilePath: string | string[]) {
    //#region @backendFunc
    if (Array.isArray(absoluteFilePath)) {
      absoluteFilePath = crossPlatformPath(absoluteFilePath);
    }
    if (process.platform === 'win32') {
      rimraf.sync(absoluteFilePath);
      return;
    }
    // console.log(`removeFileIfExists: ${absoluteFilePath}`)

    if (fse.existsSync(absoluteFilePath)) {
      fse.unlinkSync(absoluteFilePath);
    }
    //#endregion
  }
  //#endregion

  //#region methods / remove folder if exists
  removeFolderIfExists(absoluteFolderPath: string | string[]) {
    //#region @backendFunc
    if (Array.isArray(absoluteFolderPath)) {
      absoluteFolderPath = crossPlatformPath(absoluteFolderPath);
    }
    Helpers.log(`[helpers] Remove folder: ${absoluteFolderPath}`);
    if (process.platform === 'win32') {
      // rimraf.sync(absoluteFolderPath);
      this.tryRemoveDir(absoluteFolderPath, false, true);
      return;
    }

    if (fse.existsSync(absoluteFolderPath)) {
      fse.removeSync(absoluteFolderPath);
    }
    //#endregion
  }
  //#endregion

  //#region methods / remove empty line from string
  /**
   * leave max 1 empty line
   */
  removeEmptyLineFromString(str: string) {
    const lines = (str || '').split('\n');
    let previousWasEmpty = false;

    return lines
      .filter(line => {
        if (line.trim() === '') {
          if (previousWasEmpty) {
            // Skip this line because the previous line was also empty
            return false;
          } else {
            // Allow this line, but set flag that next empty line should be skipped
            previousWasEmpty = true;
            return true;
          }
        } else {
          // Reset flag if the line is not empty
          previousWasEmpty = false;
          return true;
        }
      })
      .join('\n');
  }
  //#endregion

  //#region methods / try remove empty dir
  /**
   * @deprecated
   */
  tryRemoveDir(
    dirpath: string,
    contentOnly = false,
    omitWarningNotExisted = false,
  ) {
    //#region @backendFunc
    if (!fse.existsSync(dirpath)) {
      if (!omitWarningNotExisted) {
        Helpers.warn(
          `[taon-helper][tryRemoveDir] Folder ${path.basename(dirpath)} doesn't exist.`,
        );
      }
      return;
    }
    Helpers.log(`[taon-helpers][tryRemoveDir]: ${dirpath}`);

    try {
      if (contentOnly) {
        rimraf.sync(`${dirpath}/*`);
      } else {
        rimraf.sync(dirpath);
      }
      Helpers.log(`Remove done: ${dirpath}`);
      return;
    } catch (e) {
      Helpers.warn(`

      Trying to remove directory: ${dirpath}


      (USER ACTION REQUIRED!!!)
      Please check if you did't open
      ${dirpath}
      in windows explorer

      or try to unlock file with app Unlocker or File Locksmith (from power tools)

      `);
      Helpers.sleep(1);
      Helpers.tryRemoveDir(dirpath, contentOnly);
    }
    //#endregion
  }
  //#endregion

  //#region methods / remove file or folder

  removeSymlinks(
    dirPath: string | string[],
    options?: {
      dryRun?: boolean;
    },
  ): void {
    //#region @backendFunc
    // Helpers.taskStarted(`Remove symlinks in directory ${path.basename(crossPlatformPath(dirPath))}`);
    if (_.isArray(dirPath)) {
      dirPath = crossPlatformPath(dirPath);
    }
    options = options || {};
    if (this.isUnexistedLink(dirPath)) {
      if (options.dryRun) {
        Helpers.log(`[taon-core][remove symlinks] Dry run: unlink ${dirPath}`);
      } else {
        try {
          fse.unlinkSync(dirPath);
        } catch (error) {}
      }
    }

    if (!fse.existsSync(dirPath)) {
      console.warn(
        `[taon-core][remove symlinks] Directory not found: ${dirPath}`,
      );
      return;
    }

    const entries = fse.readdirSync(dirPath);

    for (const entry of entries) {
      const fullPath = crossPlatformPath([dirPath, entry]);
      let stats: Stats;

      try {
        stats = fse.lstatSync(fullPath);
      } catch (err) {
        console.error(
          `[taon-core][remove symlinks] Error accessing ${fullPath}:`,
          err,
        );
        continue;
      }

      if (stats.isSymbolicLink()) {
        try {
          if (options.dryRun) {
            Helpers.log(
              `[taon-core][remove symlinks] Dry run: unlink ${fullPath}`,
            );
          } else {
            fse.unlinkSync(fullPath);
          }
        } catch (err) {
          console.error(
            `[taon-core][remove symlinks] Failed to remove symlink ${fullPath}:`,
            err,
          );
        }
      } else if (stats.isDirectory()) {
        // Recursively process subdirectories
        this.removeSymlinks(fullPath, options);
      }
      // Helpers.taskDone(`Remove symlinks in directory ${path.basename(crossPlatformPath(dirPath))}`);
      // Files that are not symlinks are left untouched
    }
    //#endregion
  }

  // /**
  //  * TODO replacement for remove/rimraf.sync
  //  * save remove file or folder
  //  */
  // safeRemove(
  //   targetPath: string,
  //   options?: {
  //     // usePattern?: boolean;
  //   },
  // ): void {
  //   targetPath = crossPlatformPath(targetPath);
  //   try {
  //     const stats = fse.lstatSync(targetPath);

  //     if (stats.isSymbolicLink()) {
  //       // Remove the symlink without following it
  //       fse.unlinkSync(targetPath);
  //     } else if (stats.isDirectory()) {
  //       // Recursively remove directory contents
  //       const entries = fse.readdirSync(targetPath);
  //       for (const entry of entries) {
  //         this.safeRemove(crossPlatformPath([targetPath, entry]), options);
  //       }
  //       fse.rmdirSync(targetPath);
  //     } else {
  //       // Remove file
  //       fse.unlinkSync(targetPath);
  //     }
  //   } catch (err) {
  //     console.error(`Error removing ${targetPath}:`, err);
  //   }
  // }

  /**
   * @deprecated use safeRemove
   */
  remove(fileOrFolderPathOrPatter: string | string[], exactFolder = false) {
    //#region @backendFunc
    if (Array.isArray(fileOrFolderPathOrPatter)) {
      fileOrFolderPathOrPatter = crossPlatformPath(fileOrFolderPathOrPatter);
    }
    Helpers.log(`[taon-core][remove]: ${fileOrFolderPathOrPatter}`, 1);
    if (exactFolder) {
      Helpers.log(`Removing folder ${fileOrFolderPathOrPatter}`);
      rimraf.sync(fileOrFolderPathOrPatter, { glob: false, disableGlob: true });
      Helpers.log(`Done removing folder ${fileOrFolderPathOrPatter}`);
      return;
    }
    rimraf.sync(fileOrFolderPathOrPatter);
    //#endregion
  }
  //#endregion

  //#region methods / clean exit process
  //#region @backend
  cleanExit() {
    Helpers.processes.forEach(p => {
      p.kill('SIGINT');
      p.kill('SIGTERM');
      Helpers.log(`Killing child process on ${p.pid}`);
    });
    Helpers.log(`Killing parent on ${process.pid}`);
    process.exit();
  }
  //#endregion
  //#endregion

  //#region methods / is running in git bash
  get isRunningInGitBash(): boolean {
    //#region @backendFunc
    // console.log('TERM', process.env.TERM);
    // console.log('MSYSTEM', process.env.MSYSTEM);
    return (
      (process.env?.TERM?.search('cygwin') !== -1 ||
        process.env?.TERM?.search('xterm') !== -1) &&
      !!process.env?.MSYSTEM
    );
    //#endregion
  }
  //#endregion

  //#region methods / check if projects is running in supported terminal
  /**
   * Check if the current shell is supported by Taon framework.
   */
  get isSupportedTaonTerminal(): boolean {
    //#region @browser
    return false;
    //#endregion
    //#region @backendFunc
    if (process.platform === 'win32') {
      if (UtilsOs.isRunningInWindowsCmd()) {
        return false;
      }
      if (UtilsOs.isRunningInWindowsPowerShell()) {
        return true;
      }
    }
    return true;
    //#endregion
  }
  //#endregion

  //#region methods / check if function is class
  /**
   * check if function is class
   */
  isClass(funcOrClass: any): boolean {
    let isClass = false;
    if (typeof funcOrClass === 'function') {
      // Check if it has a prototype property
      // console.log('Object.getOwnPropertyNames(funcOrClass.prototype)', Object.getOwnPropertyNames(funcOrClass.prototype).filter(f => f !== 'constructor'))
      isClass =
        !!funcOrClass.prototype &&
        Object.getOwnPropertyNames(funcOrClass.prototype).filter(
          f => f !== 'constructor',
        ).length > 0;
    }
    // console.log('is class: ' + isClass, funcOrClass)
    return isClass;
  }
  //#endregion

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
    fnOrOptions: RunSyncOrAsyncOptions,
  ): Promise<FUNCTION_RETURN_TYPE> {
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
      promisOrValue = Promise.resolve(promisOrValue);
    }
    // console.log('was promis ', wasPromise)
    return promisOrValue;
  }
  //#endregion

  //#region methods / create symlink
  //#region @backend
  public createSymLink(
    existedFileOrFolder: string,
    destinationPath: string,
    options?: {
      /**
       * try to remove destination path before create link
       */
      tryRemoveDesPath?: boolean;
      /**
       * if folder doesn't exist, just continue
       */
      continueWhenExistedFolderDoesntExists?: boolean;
      /**
       * create windows hard link instead of symlink
       */
      windowsHardLink?: boolean;
      /**
       * don't rename destination path when slash at the end
       */
      dontRenameWhenSlashAtEnd?: boolean;
      allowNotAbsolutePathes?: boolean;
      /**
       * only if you know that symlink can be created
       */
      speedUpProcess?: boolean;
    },
  ): void {
    //#region fix parameters
    existedFileOrFolder = crossPlatformPath(existedFileOrFolder);
    destinationPath = crossPlatformPath(destinationPath);
    // console.trace(`Creating link:
    // from: ${existedFileOrFolder},
    // to: ${destinationPath},
    // `)

    Helpers.log(
      `[tnp-code][create link] exited -> dest
    ${existedFileOrFolder} ${destinationPath}`,
      1,
    );

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

    if (options.dontRenameWhenSlashAtEnd) {
      destinationPath = Helpers.removeSlashAtEnd(destinationPath);
    }

    if (options.tryRemoveDesPath) {
      try {
        fse.unlinkSync(destinationPath);
      } catch (error) {
        try {
          fse.removeSync(destinationPath);
        } catch (error) {}
      }
    }

    //#endregion

    const {
      continueWhenExistedFolderDoesntExists,
      windowsHardLink,
      speedUpProcess,
    } = options;

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
        `);
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
        linkDest = crossPlatformPath(
          path.join(crossPlatformPath(process.cwd()), linkDest),
        );
      }

      if (!path.isAbsolute(targetExisted)) {
        targetExisted = crossPlatformPath(
          path.join(crossPlatformPath(process.cwd()), targetExisted),
        );
      }
    } else {
      if (!path.isAbsolute(linkDest)) {
        Helpers.error(`[createsymlink] path is not absolute:
        targetExisted: ${targetExisted}
        linkDest: ${linkDest}
        `);
      }
      if (!path.isAbsolute(targetExisted)) {
        Helpers.error(`[createsymlink] path is not absolute:
        targetExisted: ${targetExisted}
        linkDest: ${linkDest}
        `);
      }
    }

    if (linkDest.endsWith('/')) {
      linkDest = crossPlatformPath(
        path.join(linkDest, path.basename(targetExisted)),
      );
    }

    const parentFolderLinkDest = path.dirname(linkDest);

    if (Helpers.isSymlinkFileExitedOrUnexisted(parentFolderLinkDest)) {
      fse.unlinkSync(parentFolderLinkDest);
    }

    if (!Helpers.isFolder(parentFolderLinkDest)) {
      rimraf.sync(parentFolderLinkDest);
      Helpers.mkdirp(parentFolderLinkDest);
    }

    if (!speedUpProcess) {
      rimraf.sync(linkDest);
    }

    // console.log({ targetExisted, linkDest });

    if (process.platform === 'win32') {
      // const resolvedTarget = crossPlatformPath(path.resolve(targetExisted));

      // console.log(`resolved target from ${targetExisted} = ${resolvedTarget}, isFile: ${targetIsFile}`)
      if (Helpers.isSymlinkFileExitedOrUnexisted(targetExisted)) {
        //   Helpers.info(`FIXING TARGET FOR WINDOWS`)
        try {
          targetExisted = crossPlatformPath(fse.realpathSync(targetExisted));
        } catch (error) {
          Helpers.warn(
            `[tnp-helpers] Error while resolving target for windows link
          target: "${targetExisted}"
          link: "${linkDest}"
          `,
            true,
          );
        }

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

      if (windowsHardLink) {
        // ADMIN RIGHT REQURED??
        fse.symlinkSync(targetExisted, linkDest, 'dir');
      } else {
        if (targetIsFile) {
          const winLinkCommand = `mklink ${windowsHardLink ? '/D' : targetIsFile ? '/H' : '/j'} "${linkDest}" "${targetExisted}"`;
          const showSymlinkOutputOnWindows = forceTrace;
          Helpers.run(winLinkCommand, {
            biggerBuffer: false,
            output: showSymlinkOutputOnWindows,
            silence: !showSymlinkOutputOnWindows,
          }).sync();
        } else {
          fse.symlinkSync(targetExisted, linkDest, 'junction');
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
      fse.symlinkSync(targetExisted, linkDest);
    }
  }
  //#endregion
  //#endregion

  //#region methods / mkdirp
  //#region @backend
  public createFolder(folderPath: string | string[]): void {
    return Helpers.mkdirp(folderPath);
  }

  public mkdirp(folderPath: string | string[]): void {
    if (_.isArray(folderPath)) {
      folderPath = crossPlatformPath(folderPath);
    }
    if (!path.isAbsolute(folderPath)) {
      Helpers.warn(
        `[taon-core][mkdirp] Path is not absolute, abort ${folderPath}`,
        true,
      );
      return;
    }
    if (
      _.isString(folderPath) &&
      folderPath.startsWith('/tmp ') &&
      os.platform() === 'darwin'
    ) {
      Helpers.warn(
        `[taon-core][mkdirp] On mac osx /tmp is changed to /private/tmp`,
        false,
      );
      folderPath = folderPath.replace(`/tmp/`, '/private/tmp/');
    }

    if (Helpers.isUnexistedLink(folderPath)) {
      Helpers.remove(folderPath);
    }

    if (fse.existsSync(folderPath)) {
      Helpers.log(
        `[taon-core][mkdirp] folder path already exists: ${folderPath}`,
      );
    } else {
      // if (Helpers.isSymlinkFileExitedOrUnexisted(path.dirname(folderPath))) {
      //   // TODO SUPER HACK
      //   try {
      //     Helpers.removeFileIfExists(path.dirname(folderPath));
      //   } catch (error) {}
      // }
      // console.log({
      //   folderPath
      // })
      // Helpers.info(`[taon-core][mkdirp] "${folderPath}"`);
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
        fileLink = crossPlatformPath(fileLink);
        return fileLink === destUrl;
      }
      if (Helpers.isFolder(possibleSymlink)) {
        return false;
      }
    }

    try {
      const linkToUnexitedLink = fse
        .lstatSync(possibleSymlink)
        .isSymbolicLink();
      if (linkToUnexitedLink) {
        let fileLink = fse.readlinkSync(possibleSymlink);
        if (absoluteFileMatch) {
          fileLink = fse.realpathSync(fileLink);
        }
        fileLink = crossPlatformPath(fileLink);
        return fileLink === destUrl;
      }
      return false;
    } catch (error) {
      return false;
    }
    //#endregion
  }
  //#endregion

  //#region methods / is symlink file existed or unexisted
  public isSymlinkFileExitedOrUnexisted(filePath: string | string[]): boolean {
    //#region @backendFunc
    if (_.isArray(filePath)) {
      filePath = crossPlatformPath(path.join(...filePath));
    }
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
  isUnexistedLink(filePath: string | string[]): boolean {
    //#region @backendFunc
    if (_.isArray(filePath)) {
      filePath = crossPlatformPath(filePath);
    }
    filePath = Helpers.removeSlashAtEnd(filePath);
    if (process.platform === 'win32') {
      filePath = path.win32.normalize(filePath);
    }

    try {
      const linkToUnexitedLink = fse
        .lstatSync(filePath as string)
        .isSymbolicLink();
      return (
        linkToUnexitedLink &&
        !fse.existsSync(fse.readlinkSync(filePath as string))
      );
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
  isExistedSymlink(filePath: string | string[]): boolean {
    //#region @backendFunc
    if (_.isArray(filePath)) {
      filePath = crossPlatformPath(filePath);
    }

    filePath = Helpers.removeSlashAtEnd(filePath);

    if (process.platform === 'win32') {
      filePath = path.win32.normalize(filePath);
    }

    try {
      const linkToUnexitedLink = fse
        .lstatSync(filePath as string)
        .isSymbolicLink();
      return (
        linkToUnexitedLink &&
        fse.existsSync(fse.readlinkSync(filePath as string))
      );
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
  public exists(
    folderOrFilePath: string | string[],
    // , allowUnexistedLinks = false
  ) {
    //#region @backendFunc
    if (_.isArray(folderOrFilePath)) {
      folderOrFilePath = crossPlatformPath(folderOrFilePath);
    }
    if (!folderOrFilePath) {
      Helpers.warn(
        `[taon-core][exists] Path is not a string, abort.. "${folderOrFilePath}"`,
        true,
      );
      return false;
    }
    if (!path.isAbsolute(folderOrFilePath)) {
      Helpers.warn(
        `[taon-core]
      File path is not absolute:
      ${folderOrFilePath}

      `,
        true,
      );
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
      (command.startsWith('tnp ') || command.startsWith('taon ')) && // TODO every cli projects here that uses run and need to kill process easly!
      command.search('-spinner=false') === -1 &&
      command.search('-spinner=off') === -1
    ) {
      command = `${command} -spinner=false`;
    }

    if (
      global.skipCoreCheck &&
      (command.startsWith('tnp ') || command.startsWith('taon '))
    ) {
      command = `${command} --skipCoreCheck`;
    }
    return command;
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
        return new Promise<string>(resolve => {
          // @ts-ignore
          let { ommitStder, cwd, biggerBuffer, gatherColors } = options;
          if (!cwd) {
            cwd = process.cwd();
          }
          const maxBuffer = biggerBuffer ? Helpers.bigMaxBuffer : void 0;

          const env = gatherColors ? { ...process.env, FORCE_COLOR: '1' } : {};
          const proc = child_process.exec(command, {
            cwd, // @ts-ignore
            maxBuffer,
            env: env as any,
          } as any);
          let gatheredData = '';

          proc.on('exit', code => {
            resolve(gatheredData);
          });

          // @ts-ignore
          proc.stdout.on('data', data => {
            gatheredData = `${gatheredData}${data?.toString() || ''}`;
          });

          // @ts-ignore
          proc.stdout.on('error', data => {
            gatheredData = `${gatheredData}${data?.toString() || ''}`;
          });

          if (!ommitStder) {
            // @ts-ignore
            proc.stderr.on('data', data => {
              gatheredData = `${gatheredData}${data?.toString() || ''}`;
            });

            // @ts-ignore
            proc.stderr.on('error', data => {
              gatheredData = `${gatheredData}${data?.toString() || ''}`;
            });
          }
        });
      },
      //#endregion
    };
  }
  //#endregion

  //#region methods / wait
  /**
   * @deprecated use UtilsTerminal.wait
   */
  public async wait(second: number): Promise<void> {
    await UtilsTerminal.wait(second);
  }

  public async timeout(seconds: number): Promise<void> {
    return await Helpers.wait(seconds);
  }

  //#endregion

  //#region methods / command output as string async

  async commandOutputAsStringAsync(
    command: string,
    cwd = crossPlatformPath(process.cwd()),
    options?: CommandOutputOptions,
  ): Promise<string> {
    //#region @backendFunc
    command = Helpers._fixCommand(command);
    const opt = (options || {}) as typeof options;
    let output = '';
    try {
      output = await Helpers.command(command).getherOutput({
        cwd, // @ts-ignore
        biggerBuffer: opt.biggerBuffer, // @ts-ignore
        ommitStder: !opt.showStder, // @ts-ignore
        gatherColors: opt.gatherColors,
      });
      // console.log({
      //   output
      // })
      // @ts-ignore
      if (!opt.showOnlyLastLine) {
        return output.replace(/[^\x00-\xFF]/g, '');
      }
      const splited = (output || '').split('\n');
      output = (splited.pop() || '').replace(/[^\x00-\xFF]/g, '');
    } catch (e) {
      // @ts-ignore
      if (opt.showErrorWarning) {
        Helpers.warn(`[taon-helepr] Not able to get output from command:
        "${command}"
        `);
      }
    }
    return output;
    //#endregion
  }
  //#endregion

  //#region methods / command output as string

  commandOutputAsString(
    command: string,
    cwd = crossPlatformPath(process.cwd()),
    options?: CommandOutputOptions,
  ): string {
    //#region @backendFunc
    command = Helpers._fixCommand(command);
    const opt = (options || {}) as typeof options;
    let output = '';
    try {
      // @ts-ignore
      const env = opt.gatherColors ? { ...process.env, FORCE_COLOR: '1' } : {};
      // output = Helpers.run(command, { output: false, cwd, biggerBuffer }).sync().toString().trim()
      output = (
        child_process
          .execSync(command, {
            cwd, // @ts-ignore
            stdio: ['ignore', 'pipe', opt.showStder ? 'pipe' : 'ignore'], // @ts-ignore
            maxBuffer: opt.biggerBuffer ? Helpers.bigMaxBuffer : void 0,
            env: env as any,
          })
          ?.toString() || ''
      ).trim();
      // console.log({
      //   output
      // })
      // @ts-ignore
      if (!opt.showOnlyLastLine) {
        return output.replace(/[^\x00-\xFF]/g, '');
      }
      const splited = (output || '').split('\n');
      output = (splited.pop() || '').replace(/[^\x00-\xFF]/g, '');
    } catch (e) {
      // @ts-ignore
      if (opt.showErrorWarning) {
        Helpers.warn(`[taon-helpers] Not able to get output from command:
      "${command}"
      cwd: ${cwd}
      `);
      }
    }
    return output;
    // #endregion
  }

  //#endregion

  //#region methods / kill process by port
  /**
   * @deprecated use UtilsProcess.killProcessOnPort
   */
  async killProcessByPort(
    portOrPortsToKill: number | number[],
    options?: {
      silent?: boolean;
    },
  ) {
    //#region @backendFunc
    const showOutoput = !options || !options.silent;
    if (!_.isArray(portOrPortsToKill)) {
      portOrPortsToKill = [portOrPortsToKill];
    }
    for (let index = 0; index < portOrPortsToKill.length; index++) {
      let port = portOrPortsToKill[index];
      Helpers.info(`[taon-helpers] Killing process on port: ${port}`);
      const org = port;
      port = Number(port);
      if (!_.isNumber(port)) {
        showOutoput &&
          Helpers.warn(`[taon-helpers] Can't kill on port: "${org}"`);
        return;
      }
      try {
        await fkill(`:${port}`, { force: true });
        // run(`fkill -f :${port} &> /dev/null`, { output: false }).sync()
        showOutoput &&
          Helpers.info(
            `[taon-helpers] Processs killed successfully on port: ${port}`,
          );
      } catch (e) {
        showOutoput &&
          Helpers.warn(
            `[taon-helpers] No process to kill  on port: ${port}... `,
            false,
          );
      }

      // console.log(`Killing process on port ${port} in progress`);
      // try {
      //   if (os.platform() === 'linux') {
      //     run(`lsof -i:${port}`, { output: false }).sync()
      //   } else if (os.platform() === 'darwin') {
      //     run(`lsof -P | grep ':${port}' | awk '{print $2}' | xargs kill -9 `, { output: false }).sync()
      //   }
      //   info(`Process killed on port: ${port}`)
      // } catch (e) {
      //   error(`Problem with killing process on port ${port}:
      //   ${e}
      //   `, true)
      // }
    }
    //#endregion
  }
  //#endregion

  //#region methods / kill on port
  async killOnPort(
    portOrPortsToKill: number | number[],
    options?: {
      silent?: boolean;
    },
  ) {
    return await Helpers.killProcessByPort(portOrPortsToKill, options);
  }
  //#endregion

  //#region methods / kill process
  /**
   * @deprecated use UtilsProcess.killProcess
   */
  public killProcess(byPid: number) {
    //#region @backend
    // Helpers.run(`kill -9 ${byPid}`).sync()
    //#endregion
    //#region @backend
    Helpers.run(`fkill --force ${byPid}`).sync();
    // return;
    //#endregion
    //#region @websqlOnly
    if (WEBSQL_PROC_MOCK_PROCESSES_PID[byPid]) {
      const ppid = WEBSQL_PROC_MOCK_PROCESSES_PID[byPid].ppid;
      if (WEBSQL_PROC_MOCK_PROCESSES_PPID[ppid]) {
        const allChilds = WEBSQL_PROC_MOCK_PROCESSES_PPID[ppid]
          .childProcesses as number[];
        WEBSQL_PROC_MOCK_PROCESSES_PPID[ppid].childProcesses = allChilds.filter(
          p => p !== byPid,
        );
      }
      delete WEBSQL_PROC_MOCK_PROCESSES_PID[byPid];
    }

    if (WEBSQL_PROC_MOCK_PROCESSES_PPID[byPid]) {
      const childs = WEBSQL_PROC_MOCK_PROCESSES_PPID[byPid]
        .childProcesses as number[];
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
  /**
   * @deprecated use UtilsProcess
   * or native child_process exec, spawn
   */
  public run(command: string, options?: CoreModels.RunOptions) {
    command = Helpers._fixCommand(command);

    // console.log({ command })

    //#region @backend
    if (!options) options = {};
    if (options.output === void 0) options.output = true;
    if (options.biggerBuffer === void 0) options.biggerBuffer = false;
    if (options.cwd === void 0) options.cwd = crossPlatformPath(process.cwd());
    if (!_.isString(command)) {
      Helpers.error(`[taon-helpers] command is not a string`);
    }
    //#endregion
    return {
      /**
       * start command as synchronous nodej proces
       */

      sync() {
        // TODO buffer
        //#region @backendFunc
        // @ts-ignore
        if (_.isArray(options.extractFromLine)) {
          Helpers.error(
            `[tnp-helper] extractFromLine only for:
          - asyncAsPromise
          - async
          - unitlOutputContains

          `,
            false,
            true,
          );
        }

        // @ts-ignore
        if (
          _.isNumber(options.tryAgainWhenFailAfter) &&
          options.tryAgainWhenFailAfter > 0
        ) {
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
        //#endregion
      },

      /**
       * start command as asynchronous nodej proces
       * @param detach (default: false) - if true process will be detached
       */
      async(
        detach = false,
        //#region @browser
        mockFun?: (
          stdoutCallback: (dataForStdout: any) => any,
          stdErrcCallback: (dataForStder: any) => any,
          shouldProcesBeDead?: () => boolean,
        ) => Promise<number> | number,
        //#endregion
      ): ChildProcess {
        //#region websqlFunc
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
                  subscribtions.push(
                    subStdoutSub.subscribe(d => {
                      stdoutCallback(d);
                    }),
                  );
                }
              },
            },
            stderr: {
              on(action: 'data', stdoutCallback: any) {
                if (action == 'data') {
                  subscribtions.push(
                    subStderSub.subscribe(d => {
                      stdoutCallback(d);
                    }),
                  );
                }
              },
            },
            on(action: 'exit', exitFun: any) {
              if (action == 'exit') {
                subscribtions.push(
                  exitSub.subscribe(d => {
                    exitFun(d);
                  }),
                );
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
          WEBSQL_PROC_MOCK_PROCESSES_PPID[procDummy.ppid].childProcesses.push(
            procDummy.pid,
          );

          const checkIfProcessShouldBeDead = () => {
            return (
              _.isNil(WEBSQL_PROC_MOCK_PROCESSES_PID[procDummy.pid]) ||
              _.isNil(WEBSQL_PROC_MOCK_PROCESSES_PPID[procDummy.ppid])
            );
          };

          const f = Helpers.runSyncOrAsync({
            functionFn: mockFun,
            arrayOfParams: [
              d => {
                setTimeout(() => {
                  subStdoutSub.next(d);
                });
              },
              d => {
                setTimeout(() => {
                  subStderSub.next(d);
                });
              },
              () => {
                const shouldBeDead = checkIfProcessShouldBeDead();
                return shouldBeDead;
              },
            ],
          });
          f.then(exitCode => {
            if (_.isNil(exitCode)) {
              exitCode = 0;
            }
            setTimeout(() => {
              exitSub.next(exitCode);
              subscribtions.forEach(s => s.unsubscribe());
            });
          }).catch(e => {
            console.error(e);
            console.error(`Something wrong with your mock funciton`);
            exitSub.next(1);
            subscribtions.forEach(s => s.unsubscribe());
          });
          return procDummy as any;
        }
        //#endregion
        //#endregion
        //#region @backendFunc
        // @ts-ignore
        options.detach = detach;
        return Helpers.runAsyncIn(command, options);
        //#endregion
        //#endregion
      },

      /**
       * start command as asynchronous nodej proces inside promise
       */
      asyncAsPromise(): Promise<void> {
        //#region @backendFunc
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
        //#endregion
      },

      unitlOutput(optionsOutput: {
        stdoutMsg: string | string[];
        stderMsg?: string | string[];
        timeout?: number;
        stdoutOutputContainsCallback?: () => any;
        outputLineReplace?: (outputLine: string) => string;
      }): Promise<void> {
        //#region @backendFunc
        optionsOutput = optionsOutput || ({} as any);
        let { stdoutMsg, stderMsg, timeout, stdoutOutputContainsCallback } =
          optionsOutput;
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

          proc.on('exit', () => {
            console.info(`EXIT OF PROCESS`);
          });

          //#region stderr
          // @ts-ignore
          proc.stderr.on('data', message => {
            const data: string = message.toString().trim();
            if (!isResolved && _.isArray(stderMsg)) {
              for (let index = 0; index < stderMsg.length; index++) {
                const rejectm = stderMsg[index];
                if (data.search(rejectm) !== -1) {
                  console.info(
                    `[unitlOutputContains] Rejected move to next step...`,
                  );
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
          //#endregion

          //#region stdout
          // @ts-ignore
          proc.stdout.on('data', message => {
            const data: string = message.toString().trim();
            if (isResolved) {
              for (let index = 0; index < stdoutMsg.length; index++) {
                const m = stdoutMsg[index];
                if (data.search(m) !== -1) {
                  console.info(
                    `[unitlOutputContains][is resolved] Move to next step...`,
                  );
                  stdoutOutputContainsCallback &&
                    stdoutOutputContainsCallback();
                  break;
                }
              }
            } else {
              for (let index = 0; index < stdoutMsg.length; index++) {
                const m = stdoutMsg[index];
                if (data.search(m) !== -1) {
                  console.info(`[unitlOutputContains] Move to next step...`);
                  stdoutOutputContainsCallback &&
                    stdoutOutputContainsCallback();
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
                if (data.search(rejectm) !== -1) {
                  console.info(
                    `[unitlOutputContains] Rejected move to next step...`,
                  );
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
          //#endregion
        });
        //#endregion
      },

      /**
       * @deprecated use unitlOutput
       * start command as asynchronous nodej proces inside promise
       * and wait until output contains some string
       */
      unitlOutputContains(
        stdoutMsg: string | string[],
        stderMsg?: string | string[],
        timeout = 0,
        stdoutOutputContainsCallback?: () => any,
      ) {
        //#region @backendFunc
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
          proc.stderr.on('data', message => {
            const data: string = message.toString().trim();
            if (!isResolved && _.isArray(stderMsg)) {
              for (let index = 0; index < stderMsg.length; index++) {
                const rejectm = stderMsg[index];
                if (data.search(rejectm) !== -1) {
                  Helpers.info(
                    `[unitlOutputContains] Rejected move to next step...`,
                  );
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
          proc.stdout.on('data', message => {
            const data: string = message.toString().trim();
            if (isResolved) {
              for (let index = 0; index < stdoutMsg.length; index++) {
                const m = stdoutMsg[index];
                if (data.search(m) !== -1) {
                  stdoutOutputContainsCallback &&
                    stdoutOutputContainsCallback();
                  break;
                }
              }
            } else {
              for (let index = 0; index < stdoutMsg.length; index++) {
                const m = stdoutMsg[index];
                if (data.search(m) !== -1) {
                  Helpers.info(`[unitlOutputContains] Move to next step...`);
                  stdoutOutputContainsCallback &&
                    stdoutOutputContainsCallback();
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
                if (data.search(rejectm) !== -1) {
                  Helpers.info(
                    `[unitlOutputContains] Rejected move to next step...`,
                  );
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
        //#endregion
      },
    };
  }
  //#endregion

  //#region methods / question yest no
  /**
   * @deprecated use UtilsTerminal.confirm
   */
  async questionYesNo(
    message: string,
    callbackTrue?: () => any,
    callbackFalse?: () => any,
    defaultValue = true,
  ) {
    //#region @backendFunc
    return await UtilsTerminal.confirm({
      message,
      callbackTrue,
      callbackFalse,
      defaultValue,
    });
    //#endregion
  }
  //#endregion

  //#region methods / get stdio
  //#region @backend
  public getStdio(options?: CoreModels.RunOptions) {
    const {
      // @ts-ignore
      output,
      silence,
      stdio,
      // pipeToParentProcerss = false,
      // inheritFromParentProcerss = false
    } = options;
    if (typeof stdio !== 'undefined') {
      return stdio;
    }
    let resstdio = output
      ? [0, 1, 2]
      : _.isBoolean(silence) && silence
        ? 'ignore'
        : undefined;
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
    const { cwd, biggerBuffer, env } = options;
    const maxBuffer = biggerBuffer ? Helpers.bigMaxBuffer : undefined;
    let stdio = Helpers.getStdio(options);
    Helpers.checkProcess(cwd, command);
    const optionsDest = { stdio, cwd, maxBuffer } as any;
    if (_.isObject(env)) {
      optionsDest.env = { ...process.env, ...(env || {}) };
    }
    return child_process.execSync(command, optionsDest);
  }
  //#endregion
  //#endregion

  //#region methods / run async in
  //#region @backend
  public runAsyncIn(command: string, options?: CoreModels.RunOptions) {
    // @ts-ignore
    const {
      output,
      cwd,
      biggerBuffer,
      outputLineReplace,
      extractFromLine,
      detach,
    } = options;
    const maxBuffer = biggerBuffer ? Helpers.bigMaxBuffer : undefined;
    let stdio = Helpers.getStdio(options);
    Helpers.checkProcess(cwd, command);

    let proc: ChildProcess;
    if (detach) {
      //#region detached
      const cmd = _.first(command.split(' '));
      const argsForCmd = command.split(' ').slice(1);
      Helpers.log(`cmd: "${cmd}",  args: "${argsForCmd.join(' ')}"`);
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

      `);
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
    return Helpers.logProc(
      proc,
      detach ? true : output,
      detach ? void 0 : stdio,
      outputLineReplace, // @ts-ignore
      options.prefix,
      extractFromLine,
    );
  }
  //#endregion
  //#endregion

  //#region methods / log process
  //#region @backend

  //#region log process
  logProc(
    proc: ChildProcess,
    output = true,
    stdio,
    outputLineReplace: (outputLine: string) => string,
    prefix: string,
    extractFromLine?: (string | Function)[],
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
      // @ts-ignore
      proc.stdout.on('data', data => {
        // if (data?.toString().search('was unexpected at this time') !== -1) {
        //   console.log('!!!COMMAND',command)
        // }

        process.stdout.write(
          Helpers.modifyLineByLine(
            data,
            outputLineReplace,
            prefix,
            extractFromLine,
          ),
        );
      });

      // @ts-ignore
      proc.stdout.on('error', data => {
        // if (data?.toString().search('was unexpected at this time') !== -1) {
        //   console.log('!!!COMMAND',command)
        // }

        console.log(
          Helpers.modifyLineByLine(
            data,
            outputLineReplace,
            prefix,
            extractFromLine,
          ),
        );
      });

      // @ts-ignore
      proc.stderr.on('data', data => {
        // if (data?.toString().search('was unexpected at this time') !== -1) {
        //   console.log('!!!COMMAND',command)
        // }
        process.stderr.write(
          Helpers.modifyLineByLine(
            data,
            outputLineReplace,
            prefix,
            extractFromLine,
          ),
        );
      });

      // @ts-ignore
      proc.stderr.on('error', data => {
        // if (data?.toString().search('was unexpected at this time') !== -1) {
        //   console.log('!!!COMMAND',command)
        // }
        console.log(
          Helpers.modifyLineByLine(
            data,
            outputLineReplace,
            prefix,
            extractFromLine,
          ),
        );
      });
    }

    return proc;
  }
  //#endregion

  /**
   * @deprecated use UtilsProcess.startAsync
   */
  async execute(
    command: string,
    cwd: string,
    options?: Omit<CoreModels.ExecuteOptions, 'tryAgainWhenFailAfter'>,
  ) {
    return UtilsProcess.startAsync(command, cwd, options);
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
    const checkExtract =
      _.isArray(extractFromLine) && extractFromLine.length > 0;
    let modifyOutput = _.isFunction(outputLineReplace);
    if (modifyOutput && _.isString(data)) {
      data = data
        .split(/\r?\n/)
        .map(line =>
          outputLineReplace(
            line, // .replace(chalkCharactersRegex, '')
          ),
        )
        .join('\n');
    }
    if (prefix && _.isString(data)) {
      return data
        .split('\n')
        .map(singleLine => {
          if (
            !singleLine ||
            singleLine.trim().length === 0 ||
            singleLine.trim() === '.'
          ) {
            return singleLine;
          }
          if (checkExtract) {
            const sFuncs = extractFromLine.filter(f => _.isString(f));
            if (
              sFuncs.filter(f => singleLine.search(f as string) !== -1)
                .length === sFuncs.length
            ) {
              const fun = extractFromLine.find(f => _.isFunction(f));
              if (fun) {
                let s = singleLine;
                sFuncs.forEach(f => {
                  s = s.replace(f as string, '');
                });
                (fun as Function)(s.trim());
              }
            }
          }
          return `${prefix} ${singleLine}`;
        })
        .join('\n');
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
  /**
   * does not make sense
   * @deprecated
   */
  private isFile(pathToFileOrMaybeFolder: string) {
    //#region @backendFunc
    return (
      pathToFileOrMaybeFolder &&
      fse.existsSync(pathToFileOrMaybeFolder) &&
      !fse.lstatSync(pathToFileOrMaybeFolder).isDirectory()
    );
    //#endregion
  }
  //#endregion

  //#region methods / read file
  async tryReadFile(
    absoluteFilePath: string | string[], // @ts-ignore
    defaultValueWhenNotExists = void 0 as string,
    notTrim = false,
  ): Promise<string | undefined> {
    //#region @backendFunc
    if (process.platform === 'win32') {
      while (true) {
        try {
          const fileContent = Helpers.readFile(
            absoluteFilePath,
            defaultValueWhenNotExists,
            notTrim,
          );
          return fileContent;
        } catch (error) {
          Helpers.error(
            `Not able to read locked file: ${absoluteFilePath}`,
            true,
            true,
          );
          await Helpers.wait(2);
        }
      }
    }
    return Helpers.readFile(
      absoluteFilePath,
      defaultValueWhenNotExists,
      notTrim,
    );
    //#endregion
  }

  /**
   * wrapper for fs.readFileSync
   */
  readFile(
    absoluteFilePath: string | string[], // @ts-ignore
    defaultValueWhenNotExists = void 0 as string,
    notTrim = false,
  ): string | undefined {
    //#region @backendFunc
    absoluteFilePath = crossPlatformPath(absoluteFilePath);
    absoluteFilePath = absoluteFilePath as string;

    if (!fse.existsSync(absoluteFilePath)) {
      return defaultValueWhenNotExists;
    }
    if (fse.lstatSync(absoluteFilePath).isDirectory()) {
      return defaultValueWhenNotExists;
    }
    if (notTrim) {
      return fse
        .readFileSync(absoluteFilePath, {
          encoding,
        })
        .toString();
    }
    return fse
      .readFileSync(absoluteFilePath, {
        encoding,
      })
      .toString()
      .trim();
    //#endregion
  }
  //#endregion

  //#region methods / read json
  /**
   * @deprecated use UtilsJson.readJson or UtilsJson.readJson5
   */
  public readJson(
    absoluteFilePath: string | string[],
    defaultValue = {},
    useJson5 = false,
  ): any {
    return UtilsJson.readJson(absoluteFilePath, defaultValue, useJson5);
  }

  /**
   * @deprecated use UtilsJson.readJsonWithComments
   */
  public readJson5(
    absoluteFilePath: string | string[],
    defaultValue: any = {},
  ): any {
    return UtilsJson.readJsonWithComments(absoluteFilePath, defaultValue);
  }

  /**
   * @deprecated use UtilsJson.readJsonWithComments
   */
  public readJsonC(
    absoluteFilePath: string | string[],
    defaultValue: any = {},
  ): any {
    return UtilsJson.readJsonWithComments(absoluteFilePath, defaultValue);
  }

  //#endregion

  //#region methods / parse
  //#region @backend
  /**
   * parse json from string
   * @returns parse json object
   */
  public parse<T = any>(jsonInstring: string, useJson5 = false): any {
    if (!_.isString(jsonInstring)) {
      Helpers.log(jsonInstring);
      Helpers.warn(`[taon-core] Trying to parse no a string...`);
      return jsonInstring;
    }
    return (
      useJson5 ? json5.parse(jsonInstring) : JSON.parse(jsonInstring)
    ) as T;
  }
  //#endregion
  //#endregion

  //#region methods / compilation wrapper
  //#region @backend
  public async compilationWrapper(
    fn: () => void,
    taskName: string = 'Task',
    executionType:
      | 'Compilation of'
      | 'Code execution of'
      | 'Event:' = 'Compilation of',
  ) {
    // global?.spinner?.start();
    function currentDate() {
      return `[${dateformat(new Date(), 'HH:MM:ss')}]`;
    }
    if (!fn || !_.isFunction(fn)) {
      Helpers.error(`${executionType} wrapper: "${fn}" is not a function.`);
      process.exit(1);
    }

    Helpers.log(`${currentDate()} ${executionType} "${taskName}" Started..`);
    await Helpers.runSyncOrAsync({ functionFn: fn });
    Helpers.log(`${currentDate()} ${executionType} "${taskName}" Done\u2713`);

    // global?.spinner?.stop();
  }
  //#endregion
  //#endregion

  //#region methods / replace in line
  replaceLinesInFile(
    absoluteFilePath: string | string[],
    lineReplaceFn: (line: string) => string,
  ) {
    //#region @backend
    const file = Helpers.readFile(absoluteFilePath) || '';
    Helpers.writeFile(
      absoluteFilePath,
      file.split('\n').map(lineReplaceFn).join('\n'),
    );
    //#endregion
  }
  //#endregion

  //#region methods / write file
  //#region @backend
  /**
   * wrapper for fs.writeFileSync
   */
  writeFile(
    absoluteFilePath: string | string[],
    input:
      | string
      | object
      //#region @backend
      | Buffer,
    //#endregion
    options?: { overrideSameFile?: boolean; preventParentFile?: boolean },
  ): boolean {
    if (_.isArray(absoluteFilePath)) {
      absoluteFilePath = path.join.apply(this, absoluteFilePath);
    }
    absoluteFilePath = absoluteFilePath as string;
    // Helpers.info(`[taon-core] writeFile: ${absoluteFilePath}`);
    // debugger
    if (Helpers.isExistedSymlink(absoluteFilePath as any)) {
      const beforePath = absoluteFilePath;
      absoluteFilePath = fse.realpathSync(absoluteFilePath as any);
      // Helpers.logWarn(
      //   `[taon-core] WRITTING JSON into real path:
      // original: ${beforePath}
      // real    : ${absoluteFilePath}
      // `,
      //   forceTrace,
      // );
    }

    const { preventParentFile, overrideSameFile } = options || {};
    const dontWriteSameFile = !overrideSameFile;

    if (preventParentFile) {
      if (
        Helpers.isFile(path.dirname(absoluteFilePath as string)) &&
        fse.existsSync(path.dirname(absoluteFilePath as string))
      ) {
        fse.unlinkSync(path.dirname(absoluteFilePath as string));
      }
    }

    if (
      fse.existsSync(absoluteFilePath) &&
      fse.lstatSync(absoluteFilePath).isDirectory()
    ) {
      Helpers.warn(
        `[taon-core] Trying to write file content into directory:
        ${absoluteFilePath}
        `,
      );
      return false;
    }

    if (!fse.existsSync(path.dirname(absoluteFilePath as string))) {
      try {
        Helpers.mkdirp(path.dirname(absoluteFilePath as string));
      } catch (error) {
        Helpers.error(
          `Not able to create directory: ${path.dirname(absoluteFilePath as string)}`,
        );
      }
    }

    if (Helpers.isBuffer(input)) {
      fse.writeFileSync(absoluteFilePath, input);
      return true;
    }

    if (_.isObject(input)) {
      input = Helpers.stringify(input);
    } else if (!_.isString(input)) {
      input = '';
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
      encoding,
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
  writeJson(
    absoluteFilePath: string | string[],
    input: object,
    optoins?: { preventParentFile?: boolean; writeJson5?: boolean },
  ): boolean {
    if (_.isArray(absoluteFilePath)) {
      absoluteFilePath = path.join.apply(this, absoluteFilePath);
    }
    absoluteFilePath = absoluteFilePath as string;
    const { preventParentFile, writeJson5 } = optoins || {};

    if (preventParentFile) {
      if (
        Helpers.isFile(path.dirname(absoluteFilePath)) &&
        fse.existsSync(path.dirname(absoluteFilePath))
      ) {
        fse.unlinkSync(path.dirname(absoluteFilePath));
      }
    }

    if (!fse.existsSync(path.dirname(absoluteFilePath))) {
      Helpers.mkdirp(path.dirname(absoluteFilePath));
    }

    if (writeJson5) {
      const existedContent = Helpers.readFile(absoluteFilePath) || '{}';
      try {
        var writer = json5Write.load(existedContent);
      } catch (error) {
        console.error(error?.message);
        Helpers.error(
          `Pleas fix your jsonc file (json with comments) in
        ${absoluteFilePath}`,
          false,
          true,
        );
      }

      writer.write(input);
      Helpers.writeFile(
        absoluteFilePath,
        this.removeEmptyLineFromString(
          writer.toSource({
            quote: 'double',
            trailingComma: false,
            quoteKeys: true,
          }),
        ),
      );
    } else {
      fse.writeJSONSync(absoluteFilePath, input, {
        encoding,
        spaces: 2,
      });
    }
    return true;
  }
  writeJson5(absoluteFilePath: string | string[], input: object) {
    return Helpers.writeJson(absoluteFilePath, input, { writeJson5: true });
  }

  writeJsonC(absoluteFilePath: string | string[], input: object) {
    return this.writeJson5(absoluteFilePath, input);
  }
  //#endregion
  //#endregion

  //#region methods / folders from
  //#region @backend
  /**
   * return absolute paths for folders inside folders
   * @returns absoulte pathes to folders from path
   */
  public foldersFrom(
    pathToFolder: string | string[],
    options?: {
      recursive?: boolean;
      omitRootFolders?: string[];
      omitRootFoldersThatStartWith?: string[];
    },
  ): string[] {
    if (_.isArray(pathToFolder)) {
      pathToFolder = crossPlatformPath(pathToFolder) as string;
    }
    if (!Helpers.exists(pathToFolder)) {
      return [];
    }
    const { recursive } = options || {};
    const omitRootFolders = options?.omitRootFolders || [];
    const omitRootFoldersThatStartWith =
      options?.omitRootFoldersThatStartWith || [];
    let directories: string[] = [];

    // Helper function to read a directory
    const readDirectory = (folderPath: string): void => {
      try {
        const files = fse.readdirSync(folderPath, { withFileTypes: true });
        for (const file of files) {
          if (omitRootFolders) {
            if (omitRootFolders.includes(file.name)) {
              continue;
            }
          }
          if (omitRootFoldersThatStartWith) {
            if (
              omitRootFoldersThatStartWith.some(prefix =>
                file.name.startsWith(prefix),
              )
            ) {
              continue;
            }
          }
          if (
            file.isDirectory() &&
            !Helpers.isSymlinkFileExitedOrUnexisted([folderPath, file.name])
          ) {
            const dirPath = crossPlatformPath([folderPath, file.name]);
            // console.log('dirPath', dirPath)
            directories.push(dirPath);
            // If recursive, read the directory found
            if (recursive) {
              readDirectory(dirPath);
            }
          }
        }
      } catch (err) {
        Helpers.error(`Error reading directory ${folderPath}: ${err}`);
      }
    };

    // Start reading from the initial folder
    readDirectory(pathToFolder);
    return directories;
  }

  //#endregion
  //#endregion

  //#region methods / links from
  //#region @backend
  /**
   * @returns absolute pathes to links from path
   */
  linksToFoldersFrom(
    pathToFolder: string | string[],
    outputRealPath: boolean = false,
  ): string[] {
    if (_.isArray(pathToFolder)) {
      pathToFolder = path.join(...pathToFolder) as string;
    }
    if (!Helpers.exists(pathToFolder)) {
      return [];
    }
    return (
      fse
        .readdirSync(pathToFolder)
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
        })
        .filter(f => !!f)
        // @ts-ignore
        .map(f => crossPlatformPath(f))
    );
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
    return fse
      .readdirSync(pathToFolder)
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

  getFilesFrom(
    folderOrLinkToFolder: string | string[],
    options: {
      recursive?: boolean;
      followSymlinks?: boolean;
    } = {},
  ): string[] {
    //#region @backendFunc
    folderOrLinkToFolder = crossPlatformPath(folderOrLinkToFolder) as string;
    const { recursive = false, followSymlinks = true } = options;

    const visited = new Set<string>();
    const results: string[] = [];

    const scan = (dir: string) => {
      if (visited.has(dir)) return;
      visited.add(dir);

      let entries: Dirent[];

      try {
        entries = fse.readdirSync(dir, { withFileTypes: true });
      } catch (e) {
        return; // Skip folders we cannot access
      }

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isSymbolicLink()) {
          let realPath: string;
          try {
            realPath = fse.realpathSync(fullPath);
          } catch (e) {
            continue; // Broken symlink – skip
          }

          const stats = fse.statSync(realPath);
          if (stats.isDirectory()) {
            if (followSymlinks && recursive) {
              scan(realPath);
            }
          } else if (stats.isFile()) {
            results.push(fullPath);
          }
        } else if (entry.isDirectory()) {
          if (recursive) {
            scan(fullPath);
          }
        } else if (entry.isFile()) {
          results.push(fullPath);
        }
      }
    };

    scan(path.resolve(folderOrLinkToFolder));

    return results.map(crossPlatformPath);
    //#endregion
  }

  //#region methods / files from
  //#region @backend
  /**
   * @deprecated use getFilesFrom
   * return absolute paths for folders inside folders
   */
  public filesFrom(
    pathToFolder: string | string[],
    recrusive: boolean = false,
    incudeUnexistedLinks: boolean = false,
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
      const all = fse
        .readdirSync(pathToFolder)
        .map(f => crossPlatformPath([pathToFolder as string, f]));
      const folders = [] as string[];
      const files = all.filter(f => {
        if (fse.lstatSync(f).isDirectory()) {
          folders.push(f);
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
    return fse
      .readdirSync(pathToFolder)
      .map(f => crossPlatformPath(path.join(pathToFolder as string, f)))
      .filter(f => {
        return !fse.lstatSync(f).isDirectory();
      });
  }
  //#endregion
  //#endregion

  //#region methods / open folder in file explorer
  //#region @backend
  /**
   * @deprecated use UtilsOs.openFolderInFileExplorer
   * @param folderPath
   */
  public openFolderInFileExplorer(folderPath: string): void {
    UtilsOs.openFolderInFileExplorer(folderPath);
  }
  //#endregion
  //#endregion

  //#region methods / hide node warnings
  hideNodeWarnings() {
    //#region @backend
    const process = require('process');
    process.removeAllListeners('warning');
    //#endregion
  }
  //#endregion
}
