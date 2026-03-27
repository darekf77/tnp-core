//#region imports
import 'reflect-metadata';
import type { Dirent } from 'fs';

import { CopyOptionsSync } from 'fs-extra';
import * as micromatch from 'micromatch'; // @backend

import {
  dotTaonFolder,
  dotTnpFolder,
  encoding,
  extAllowedToReplace,
} from './constants';
import { path, _, crossPlatformPath, os, json5 } from './core-imports';
import { fse } from './core-imports';
import { CoreModels } from './core-models';
import { UtilsTerminal } from './utils-terminal';

import { config, Helpers } from './index';
//#endregion

export namespace UtilsFilesFoldersSync {
  //#region utils files folders sync / ignore folder files patterns
  export const IGNORE_FOLDERS_FILES_PATTERNS = [
    // '**/node_modules/**/*.*',
    '**/node_modules/**',
    // '**/node_modules',
    // '**/git/**/*.*',
    '**/.git/**/**',
    // '**/.git',
    // `**/${dotTaonFolder}/**/*.*`,
    `**/${dotTaonFolder}/**`,
    // `**/${dotTaonFolder}`,
    // `**/${dotTnpFolder}/**/*.*`,
    `**/${dotTnpFolder}/**`,
    // `**/${dotTnpFolder}`,
    '**/tmp-*',
    // `**/tmp-*/**/*.*`,
    '**/tmp-*/**',
  ];
  //#endregion

  //#region utils files folders sync / read file
  export const readFile = (
    absoluteFilePath: string | string[], // @ts-ignore

    options?: {
      defaultValueWhenNotExists?: string | undefined;
      notTrim?: boolean;
      /**
       * Default false
       */
      readImagesWithoutEncodingUtf8?: boolean;
      /**
       * Default false
       */
      forceReadWithoutEncodingUtf8?: boolean;
    },
  ): string | undefined => {
    //#region @backendFunc
    options = options || {};
    absoluteFilePath = crossPlatformPath(absoluteFilePath);
    absoluteFilePath = absoluteFilePath as string;

    if (!fse.existsSync(absoluteFilePath)) {
      return options.defaultValueWhenNotExists;
    }
    if (fse.lstatSync(absoluteFilePath).isDirectory()) {
      return options.defaultValueWhenNotExists;
    }
    const optFs: {
      encoding?: BufferEncoding;
    } = {
      encoding,
    };

    let shouldBeReadWithoutEncoding = false;
    if (options.readImagesWithoutEncodingUtf8) {
      const ext = path.extname(absoluteFilePath).replace('.', '').toLowerCase();
      if (CoreModels.ImageFileExtensionArr.includes(ext as any)) {
        shouldBeReadWithoutEncoding = true;
        Helpers.logWarn(
          `File ${path.basename(
            absoluteFilePath,
          )} is read without utf8 encoding as it is an image file.`,
        );
        delete optFs.encoding;
      }
    }

    if (
      (options.readImagesWithoutEncodingUtf8 && shouldBeReadWithoutEncoding) ||
      options.forceReadWithoutEncodingUtf8
    ) {
      return fse.readFileSync(absoluteFilePath, optFs) as any; // TODO QUICK_FIX @LAST
    }

    if (options.notTrim) {
      return fse.readFileSync(absoluteFilePath, optFs).toString();
    }
    return fse.readFileSync(absoluteFilePath, optFs).toString().trim();
    //#endregion
  };
  //#endregion

  //#region utils files folders sync / write file
  export const writeFile = (
    absoluteFilePath: string | string[],
    input: string | object | Buffer,
    options?: {
      /**
       * Default false
       * by default it will not write the file if the content is exactly the same
       */
      overrideSameFile?: boolean;
      preventParentFile?: boolean;
      /**
       * Default false
       */
      writeImagesWithoutEncodingUtf8?: boolean;
      /**
       * Default false
       */
      forceReadWithoutEncodingUtf8?: boolean;
    },
  ): boolean => {
    //#region @backendFunc
    options = options || {};
    absoluteFilePath = crossPlatformPath(absoluteFilePath) as string;
    const dontWriteSameFile = !options.overrideSameFile;

    //#region writing into link - make sense or not TODO
    // Helpers.info(`[taon-core] writeFile: ${absoluteFilePath}`);
    // debugger
    // if (Helpers.isExistedSymlink(absoluteFilePath as any)) {
    //   const beforePath = absoluteFilePath;
    //   absoluteFilePath = fse.realpathSync(absoluteFilePath as any);
    //   // Helpers.logWarn(
    //   //   `[taon-core] WRITTING JSON into real path:
    //   // original: ${beforePath}
    //   // real    : ${absoluteFilePath}
    //   // `,
    //   //   forceTrace,
    //   // );
    // }
    //#endregion

    //#region prevent parent file
    if (options.preventParentFile) {
      if (
        Helpers.isFile(path.dirname(absoluteFilePath as string)) &&
        fse.existsSync(path.dirname(absoluteFilePath as string))
      ) {
        fse.unlinkSync(path.dirname(absoluteFilePath as string));
      }
    }
    //#endregion

    //#region check if file is directory
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
    //#endregion

    //#region create parent folder if not exists
    if (!fse.existsSync(path.dirname(absoluteFilePath as string))) {
      try {
        Helpers.mkdirp(path.dirname(absoluteFilePath as string));
      } catch (error) {
        Helpers.error(
          `Not able to create directory: ${path.dirname(
            absoluteFilePath as string,
          )}`,
        );
      }
    }
    //#endregion

    //#region write buffer without encoding
    if (Helpers.isBuffer(input)) {
      fse.writeFileSync(absoluteFilePath, input);
      return true;
    }
    //#endregion

    if (_.isObject(input)) {
      input = Helpers.stringify(input);
    } else if (!_.isString(input)) {
      input = '';
    }

    //#region avoid writing same file content
    if (dontWriteSameFile) {
      if (fse.existsSync(absoluteFilePath)) {
        const existedInput = Helpers.readFile(absoluteFilePath);
        if (input === existedInput) {
          // Helpers.log(`[helpers][writeFile] not writing same file (good thing): ${absoluteFilePath}`);
          return false;
        }
      }
    }
    //#endregion

    const fsOps: {
      encoding?: BufferEncoding;
    } = {
      encoding,
    };

    if (options.writeImagesWithoutEncodingUtf8) {
      const ext = path.extname(absoluteFilePath).replace('.', '').toLowerCase();
      if (CoreModels.ImageFileExtensionArr.includes(ext as any)) {
        Helpers.logWarn(
          `File ${path.basename(
            absoluteFilePath,
          )} is written without utf8 encoding as it is an image file.`,
        );
        delete fsOps.encoding;
      }
    }
    if (options.forceReadWithoutEncodingUtf8) {
      delete fsOps.encoding;
    }

    fse.writeFileSync(absoluteFilePath, input, fsOps);
    return true;
    //#endregion
  };
  //#endregion

  //#region utils files folders sync / get files or folder

  export interface UtilsFilesFoldersSyncGetFilesFromOptions {
    recursive?: boolean;
    followSymlinks?: boolean;
    /**
     * glob patterns to omit from result
     */
    omitPatterns?: string[];
  }

  //#region utils files folders sync / walk fs tree
  const walkFsTree = (
    root: string,
    options: {
      recursive: boolean;
      followSymlinks: boolean;
      omitPatterns?: string[];
      onFile?: (path: string) => void;
      onDirectory?: (path: string) => void;
    },
  ): void => {
    //#region @backendFunc
    const visitedRealPaths = new Set<string>();

    const allowedInResult = (pathToFileOrFolder: string) => {
      pathToFileOrFolder = crossPlatformPath(pathToFileOrFolder);
      if (options.omitPatterns.length === 0) {
        return true;
      }

      // const exclude = anymatch(options.omitPatterns, pathToFileOrFolder);

      const exclude = micromatch.isMatch(
        pathToFileOrFolder,
        options.omitPatterns,
        {
          dot: true,
        },
      );

      // if (!exclude
      //   //  && pathToFileOrFolder.includes('node_modules')
      //   ) {
      //   console.log(pathToFileOrFolder)
      // }

      return !exclude;
    };

    const scan = (dir: string) => {
      let realDir: string;
      try {
        realDir = fse.realpathSync(dir);
      } catch {
        return;
      }

      if (visitedRealPaths.has(realDir)) return;
      visitedRealPaths.add(realDir);

      let entries: Dirent[];
      try {
        entries = fse.readdirSync(dir, { withFileTypes: true });
      } catch {
        return;
      }

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        // ─────────────── symlink ───────────────
        if (entry.isSymbolicLink()) {
          let realPath: string;
          try {
            realPath = fse.realpathSync(fullPath);
          } catch {
            continue;
          }

          let stats;
          try {
            stats = fse.statSync(realPath);
          } catch {
            continue;
          }

          if (stats.isDirectory()) {
            if (options.onDirectory && allowedInResult(fullPath)) {
              options.onDirectory(fullPath);
            }
            if (options.followSymlinks && options.recursive) {
              scan(realPath);
            }
          } else if (stats.isFile()) {
            if (options.onFile && allowedInResult(fullPath)) {
              options.onFile(fullPath);
            }
          }

          continue;
        }

        // ─────────────── directory ───────────────
        if (entry.isDirectory()) {
          if (options.onDirectory && allowedInResult(fullPath)) {
            options.onDirectory(fullPath);
          }
          if (options.recursive) {
            scan(fullPath);
          }
          continue;
        }

        // ─────────────── file ───────────────
        if (entry.isFile()) {
          if (options.onFile && allowedInResult(fullPath)) {
            options.onFile(fullPath);
          }
        }
      }
    };

    scan(path.resolve(root));

    //#endregion
  };
  //#endregion

  //#region utils files folders sync / get files from
  /**
   * return absolute paths for files inside folder or link to folder
   */
  export const getFilesFrom = (
    folderOrLinkToFolder: string | string[],
    options?: UtilsFilesFoldersSyncGetFilesFromOptions,
  ): string[] => {
    //#region @backendFunc
    options = options || {};
    const { recursive = false, followSymlinks = true } = options;

    const results: string[] = [];

    walkFsTree(crossPlatformPath(folderOrLinkToFolder), {
      recursive,
      followSymlinks,
      omitPatterns: options.omitPatterns || [],
      onFile: file => results.push(file),
    });

    return results.map(crossPlatformPath);
    //#endregion
  };
  //#endregion

  //#region utils files and folder sync / get folders from
  /**
   * return absolute paths for folders inside folder or link to folder
   */
  export const getFoldersFrom = (
    folderOrLinkToFolder: string | string[],
    options?: UtilsFilesFoldersSyncGetFilesFromOptions,
  ): string[] => {
    //#region @backendFunc
    options = options || {};
    const { recursive = false, followSymlinks = true } = options;

    const results: string[] = [];

    walkFsTree(crossPlatformPath(folderOrLinkToFolder), {
      recursive,
      followSymlinks,
      omitPatterns: options.omitPatterns || [],
      onDirectory: dir => results.push(dir),
    });

    return results.map(crossPlatformPath);
    //#endregion
  };
  //#endregion

  //#endregion

  //#region utils files folders sync / copy
  export const copy = (
    sourceDir: string | string[],
    destinationDir: string | string[],
    options?: {
      filter?: any;
      overwrite?: boolean;
      recursive?: boolean;
      asSeparatedFiles?: boolean;
      asSeparatedFilesAllowNotCopied?: boolean;
      asSeparatedFilesSymlinkAsFile?: boolean;
      /**
       * folders to omit: example: ['src','node_modules']
       *
       * This option works only with omitFoldersBaseFolder
       */
      omitFolders?: string[];
      /**
       * absolute path for base folder for omitFolder option
       */
      omitFoldersBaseFolder?: string;
      copySymlinksAsFiles?: boolean;
      copySymlinksAsFilesDeleteUnexistedLinksFromSourceFirst?: boolean;
      useTempFolder?: boolean;
      dontAskOnError?: boolean;
    } & CopyOptionsSync,
  ): void => {
    //#region @backendFunc
    if (_.isArray(sourceDir)) {
      sourceDir = crossPlatformPath(sourceDir);
    }
    if (_.isArray(destinationDir)) {
      destinationDir = crossPlatformPath(destinationDir);
    }

    // sourceDir = sourceDir ? (sourceDir.replace(/\/$/, '')) : sourceDir;
    // destinationDir = destinationDir ? (destinationDir.replace(/\/$/, '')) : destinationDir;
    if (!fse.existsSync(sourceDir)) {
      Helpers.warn(
        `[taon-helper][copy] Source dir doesnt exist: ${sourceDir} for destination: ${destinationDir}`,
      );
      return;
    }
    if (!fse.existsSync(path.dirname(destinationDir))) {
      if (Helpers.isUnexistedLink(path.dirname(destinationDir))) {
        Helpers.removeFileIfExists(path.dirname(destinationDir));
      }
      Helpers.mkdirp(path.dirname(destinationDir));
    }
    if (!options) {
      options = {} as any;
    }
    if (_.isUndefined(options.overwrite)) {
      options.overwrite = true;
    }
    if (_.isUndefined(options.recursive)) {
      options.recursive = true;
    }

    if (_.isUndefined(options.useTempFolder)) {
      options.useTempFolder = false;
    }

    if (options.copySymlinksAsFiles) {
      options['dereference'] = true;
    }

    if (!options.omitFolders) {
      options.omitFolders = [];
    }

    if (options.asSeparatedFilesSymlinkAsFile) {
      options.asSeparatedFilesSymlinkAsFile = true;
    }

    // const [srcStat, destStat] = [
    //   fse.existsSync(sourceDir) && fse.statSync(sourceDir),
    //   fse.existsSync(destinationDir) && fse.statSync(destinationDir),
    // ];
    // if (destStat && destStat.ino && destStat.dev && destStat.ino === srcStat.ino && destStat.dev === srcStat.dev) {
    //   Helpers.warn(`[taon-helper][copy] Same location stats.. Trying to copy same source and destination:
    //   from: ${sourceDir}
    //   to: ${destinationDir}
    //   `);
    //   return;
    // }
    if (
      _.isArray(options.omitFolders) &&
      options.omitFolders.length >= 1 &&
      _.isNil(options.filter) &&
      _.isString(options.omitFoldersBaseFolder) &&
      path.isAbsolute(options.omitFoldersBaseFolder)
    ) {
      options.filter = filterDontCopy(
        options.omitFolders,
        options.omitFoldersBaseFolder,
      );
    }

    if (options.copySymlinksAsFilesDeleteUnexistedLinksFromSourceFirst) {
      Helpers.taskDone('Deleting unexisted symlinks from source before copy');
      const files = Helpers.getFilesFrom(sourceDir, {
        recursive: true,
        followSymlinks: false,
      }).filter(f => Helpers.isUnexistedLink(f));
      for (let index = 0; index < files.length; index++) {
        const file = files[index];
        Helpers.logWarn(`Removing link: ${file}`);
        try {
          fse.unlinkSync(file);
        } catch (error) {}
      }
      Helpers.taskDone(
        'Deleting unexisted symlinks from source before copy done',
      );
    }

    if (
      crossPlatformPath(sourceDir) === crossPlatformPath(destinationDir) ||
      crossPlatformPath(path.resolve(sourceDir)) ===
        crossPlatformPath(path.resolve(destinationDir))
    ) {
      Helpers.warn(`[taon-helper][copy] Trying to copy same source and destination
      from: ${sourceDir}
      to: ${destinationDir}
      `);
    } else {
      // Helpers.warn('filter', _.isFunction(options.filter));
      // Helpers.warn('sourceDir', sourceDir);
      // Helpers.warn('destinationDir', destinationDir);
      // Helpers.log(JSON.stringify(options))
      // try {

      if (options.useTempFolder) {
        let tempDestination = `${os.platform() === 'darwin' ? '/private/tmp' : '/tmp'}/${_.camelCase(destinationDir)}`;
        Helpers.removeFolderIfExists(tempDestination);
        fse.copySync(sourceDir, tempDestination, options);
        fse.copySync(tempDestination, destinationDir, options);
      } else {
        if (
          crossPlatformPath(sourceDir) ===
            crossPlatformPath(path.resolve(sourceDir)) &&
          Helpers.isExistedSymlink(sourceDir) &&
          !Helpers.exists(fse.readlinkSync(sourceDir))
        ) {
          Helpers.warn(`[taon-helpers] Not copying empty link from: ${sourceDir}
          `);
        } else {
          const copyFn = (): void => {
            try {
              if (options.asSeparatedFiles) {
                const copyRecFn = (cwdForFiles: string): void => {
                  const files = getFilesFrom(cwdForFiles, {
                    omitPatterns: options.omitFolders,
                  });
                  for (let index = 0; index < files.length; index++) {
                    const from = files[index];
                    const to = from.replace(sourceDir, destinationDir);

                    if (Helpers.isFolder(from)) {
                      if (
                        options.omitFolders.includes(
                          path.basename(path.dirname(from)),
                        ) ||
                        options.omitFolders.includes(path.basename(from))
                      ) {
                        continue;
                      } else {
                        copyRecFn(from);
                      }
                    } else {
                      const copyFileFn = () => {
                        if (
                          !options.asSeparatedFilesSymlinkAsFile &&
                          Helpers.isExistedSymlink(from)
                        ) {
                          Helpers.createSymLink(from, to);
                        } else {
                          copyFile(from, to);
                        }
                      };
                      if (options.asSeparatedFilesAllowNotCopied) {
                        try {
                          copyFileFn();
                        } catch (e) {}
                      } else {
                        copyFileFn();
                      }
                    }
                  }
                };
                copyRecFn(sourceDir);
              } else {
                fse.copySync(sourceDir, destinationDir, options);
              }
            } catch (error) {
              const exitOnError = global['tnpNonInteractive'];
              Helpers.log(error);
              if (!options!.dontAskOnError) {
                console.trace(`[taon-helper] Not able to copy folder`);
                Helpers.error(
                  `[taon-helper] Not able to copy folder:
                from: ${crossPlatformPath(sourceDir)}
                to: ${crossPlatformPath(destinationDir)}
                options: ${json5.stringify(options)}
                error: ${error?.message}
                `,
                  !exitOnError,
                );

                UtilsTerminal.pressKeyAndContinueSync(
                  `Press any key to repeat copy action...`,
                );
              }
              copyFn();
            }
          };
          if (process.platform === 'win32') {
            while (true) {
              try {
                copyFn();
                break;
              } catch (error) {
                Helpers.warn(`WARNING not able to copy .. trying again`);
                Helpers.sleep(1);
                continue;
              }
            }
          } else {
            copyFn();
          }
        }
      }

      // } catch (error) {
      //   console.trace(error);
      //   process.exit(0)
      // }
    }
    //#endregion
  };
  //#endregion

  //#region utils files folders sync / filter dont copy
  export const filterDontCopy = (
    basePathFoldersTosSkip: string[],
    projectOrBasepath: string,
  ) => {
    //#region @backendFunc
    return (src: string, dest: string): boolean => {
      // console.log('src', src)
      src = crossPlatformPath(src);
      const baseFolder = _.first(
        crossPlatformPath(src)
          .replace(crossPlatformPath(projectOrBasepath), '')
          .replace(/^\//, '')
          .split('/'),
      );

      // console.log('baseFolder', baseFolder)
      if (!baseFolder || baseFolder.trim() === '') {
        return true;
      }
      const isAllowed = _.isUndefined(
        basePathFoldersTosSkip.find(f =>
          baseFolder.startsWith(crossPlatformPath(f)),
        ),
      );

      // console.log('isAllowed', isAllowed)
      return isAllowed;
    };
    //#endregion
  };
  //#endregion

  //#region utils files folders sync / filter only copy
  export const filterOnlyCopy = (
    basePathFoldersOnlyToInclude: string[],
    projectOrBasepath: string,
  ) => {
    //#region @backendFunc
    return (src: string, dest: string): boolean => {
      src = crossPlatformPath(src);
      const baseFolder = _.first(
        crossPlatformPath(src)
          .replace(crossPlatformPath(projectOrBasepath), '')
          .replace(/^\//, '')
          .split('/'),
      );

      if (!baseFolder || baseFolder.trim() === '') {
        return true;
      }
      const isAllowed = !_.isUndefined(
        basePathFoldersOnlyToInclude.find(f =>
          baseFolder.startsWith(crossPlatformPath(f)),
        ),
      );

      return isAllowed;
    };
    //#endregion
  };
  //#endregion

  //#region utils files folders sync / copy file
  export const copyFile = (
    sourcePath: string | string[],
    destinationPath: string | string[],
    options?: {
      transformTextFn?: (input: string) => string;
      debugMode?: boolean;
      fast?: boolean;
      dontCopySameContent?: boolean;
    },
  ): boolean => {
    //#region @backendFunc
    sourcePath = crossPlatformPath(sourcePath);
    destinationPath = crossPlatformPath(destinationPath);
    if (_.isUndefined(options)) {
      options = {} as any;
    }
    if (_.isUndefined(options.debugMode)) {
      options.debugMode = false;
    }
    if (_.isUndefined(options.debugMode)) {
      options.fast = true;
    }
    if (_.isUndefined(options.dontCopySameContent)) {
      options.dontCopySameContent = true;
    }
    const { debugMode, fast, transformTextFn, dontCopySameContent } = options;
    if (_.isFunction(transformTextFn) && fast) {
      Helpers.error(
        `[taon-helpers][copyFile] You cannot use  transformTextFn in fast mode`,
      );
    }

    if (!fse.existsSync(sourcePath)) {
      Helpers.logWarn(
        `[taon-helpers][copyFile] No able to find source of ${sourcePath}`,
      );
      return false;
    }
    if (fse.lstatSync(sourcePath).isDirectory()) {
      Helpers.warn(
        `[taon-helpers][copyFile] Trying to copy directory as file: ${sourcePath}`,
        false,
      );
      return false;
    }

    if (sourcePath === destinationPath) {
      Helpers.warn(
        `[taon-helpers][copyFile] Trying to copy same file ${sourcePath}`,
      );
      return false;
    }
    let destDirPath = path.dirname(destinationPath);

    if (Helpers.isFolder(destinationPath)) {
      Helpers.removeFolderIfExists(destinationPath);
    }

    if (
      !Helpers.isSymlinkFileExitedOrUnexisted(destDirPath) &&
      !fse.existsSync(destDirPath)
    ) {
      Helpers.mkdirp(destDirPath);
    }

    //#region it is good code
    if (Helpers.isExistedSymlink(destDirPath)) {
      destDirPath = fse.realpathSync(destDirPath);
      const newDestinationPath = crossPlatformPath(
        path.join(destDirPath, path.basename(destinationPath)),
      );
      if (Helpers.isFolder(newDestinationPath)) {
        Helpers.removeFolderIfExists(newDestinationPath);
      }

      destinationPath = newDestinationPath;
    }
    //#endregion

    if (dontCopySameContent && fse.existsSync(destinationPath)) {
      const destinationContent = Helpers.readFile(destinationPath);
      const sourceContent = Helpers.readFile(sourcePath).toString();
      if (destinationContent === sourceContent) {
        // @REMEMBER uncomment if any problem
        // Helpers.log(`Destination has the same content as source: ${path.basename(sourcePath)}`);
        return false;
      }
    }

    debugMode &&
      Helpers.log(`path.extname(sourcePath) ${path.extname(sourcePath)}`);

    if (fast || !extAllowedToReplace.includes(path.extname(sourcePath))) {
      fse.copyFileSync(sourcePath, destinationPath);
    } else {
      let sourceData = Helpers.readFile(sourcePath).toString();
      if (_.isFunction(transformTextFn)) {
        sourceData = transformTextFn(sourceData);
      }

      debugMode &&
        Helpers.log(`
      [taon-helpers][copyFile] Write to: ${destinationPath} file:
============================================================================================
${sourceData}
============================================================================================
        `);

      Helpers.writeFile(destinationPath, sourceData);
    }

    return true;
    //#endregion
  };
  //#endregion

  //#region utils files folders sync / move
  /**
   * @deprecated use .copy and then .remove on
   * source folder..
   *
   * This method is messing with parcel watcher
   * (moved files are not detected)
   */
  export const move = (
    from: string,
    to: string,
    options?: {
      purpose?: string; // for logging purposes
    },
  ): void => {
    //#region @backendFunc
    options = options || {};
    if (!fse.existsSync(from)) {
      Helpers.warn(
        `[move]${options.purpose ? `[${options.purpose}]` : ''} File or folder doesnt not exists: ${from}`,
      );
      return;
    }
    if (!path.isAbsolute(from)) {
      Helpers.warn(
        `[move]${options.purpose ? `[${options.purpose}]` : ''} Source path is not absolute: ${from}`,
      );
      return;
    }
    if (!path.isAbsolute(to)) {
      Helpers.warn(
        `[move]${options.purpose ? `[${options.purpose}]` : ''} Destination path is not absolute: ${to}`,
      );
      return;
    }

    if (Helpers.isUnexistedLink(to)) {
      Helpers.remove(to);
    }

    if (Helpers.isUnexistedLink(path.dirname(to))) {
      Helpers.remove(path.dirname(to));
    }

    // if (!Helpers.exists(path.dirname(to))) {
    //   if (Helpers.isUnexistedLink(path.dirname(to))) {
    //     Helpers.remove(path.dirname(to));
    //   } else  {
    //     Helpers.remove(path.dirname(to));
    //     Helpers.mkdirp(path.dirname(to));
    //   }
    // }

    // if(Helpers.isSymlinkFileExitedOrUnexisted(to)) {
    //   Helpers.error(`You are trying to move into symlink location:
    //   from: ${from}
    //   to: ${to}
    //   `)
    // }

    while (true) {
      try {
        fse.moveSync(from, to, {
          overwrite: true,
        });
        break;
      } catch (error) {
        console.log(error);
        if (global['tnpNonInteractive']) {
          Helpers.error(`[${config.frameworkName}-helpers]${options.purpose ? `[${options.purpose}]` : ''} Not able to move files

from: ${from}
to: ${to}

          `);
        }

        Helpers.info(`[${config.frameworkName}-helpers]${options.purpose ? `[${options.purpose}]` : ''} Not able to move files
 Moving things:

from: ${from}
to: ${to}

        `);
        UtilsTerminal.pressKeyAndContinueSync(
          `${options.purpose ? `[${options.purpose}]` : ''} Press any to try again this action`,
        );
      }
    }
    //#endregion
  };
  //#endregion
}

/**
 * TODO @LAST @IN_PROGRESS
 * - utils for files and folders operations
 * - export when ready
 * - should be ready for everything async refactor
 */
export namespace UtilsFilesFolders {
  //#region utils files folders / ignore folder files patterns
  /**
   * Patterns that should be always ignored
   */
  export const IGNORE_FOLDERS_FILES_PATTERNS =
    UtilsFilesFoldersSync.IGNORE_FOLDERS_FILES_PATTERNS;
  //#endregion

  //#region utils files folders operations / remove options
  interface UtilsFilesFoldersOperationsRemoveOptions {
    recursive?: boolean;
    waitForUserActionOnError?: boolean;
  }
  //#endregion

  //#region utils files folders operations / remove file or folder or link
  /**
   * remove file or folder or link
   */
  const remove = async (
    absolutePath: string | string[],
    options?: UtilsFilesFoldersOperationsRemoveOptions,
  ): Promise<boolean> => {
    //#region @backendFunc
    try {
      // await fs.unlink(options.absolutePath);
    } catch (error) {}
    return void 0;
    //#endregion
  };
  //#endregion

  //#region utils files folders operations / remove file or folder or link
  /**
   * remove file or folder or link
   */
  const removeByPattern = async (
    globPattern: string | string[],
    options?: UtilsFilesFoldersOperationsRemoveOptions,
  ): Promise<boolean> => {
    //#region @backendFunc
    try {
      // await fs.unlink(options.absolutePath);
    } catch (error) {}
    return void 0;
    //#endregion
  };
  //#endregion

  //#region utils files folders operations / get files from
  async function getFilesFromAsync(
    folderOrLinkToFolder: string | string[],
    options: {
      recursive?: boolean;
      followSymlinks?: boolean;
    } = {},
  ): Promise<string[]> {
    return null;
    //#region @backendFunc
    // folderOrLinkToFolder = crossPlatformPath(folderOrLinkToFolder) as string;
    // const { recursive = false, followSymlinks = true } = options;

    // const visited = new Set<string>();
    // const results: string[] = [];

    // const scan = async (dir: string): Promise<void> => {
    //   if (visited.has(dir)) return;
    //   visited.add(dir);

    //   let entries: fs.Dirent[];
    //   try {
    //     entries = await fse.readdir(dir, { withFileTypes: true });
    //   } catch {
    //     return; // skip unreadable folders
    //   }

    //   for (const entry of entries) {
    //     const fullPath = path.join(dir, entry.name);

    //     if (entry.isSymbolicLink()) {
    //       let realPath: string;
    //       try {
    //         realPath = await fse.realpath(fullPath);
    //       } catch {
    //         continue; // broken symlink -> skip
    //       }

    //       let stats;
    //       try {
    //         stats = await fse.stat(realPath);
    //       } catch {
    //         continue; // can't stat -> skip
    //       }

    //       if (stats.isDirectory()) {
    //         if (recursive && followSymlinks) {
    //           await scan(realPath);
    //         }
    //       } else if (stats.isFile()) {
    //         results.push(fullPath);
    //       }
    //     } else if (entry.isDirectory()) {
    //       if (recursive) {
    //         await scan(fullPath);
    //       }
    //     } else if (entry.isFile()) {
    //       results.push(fullPath);
    //     }
    //   }
    // };

    // await scan(path.resolve(folderOrLinkToFolder));

    // return results.map(crossPlatformPath);
    //#endregion
  }
  //#endregion

  //#region utils files folders operations / read file
  /**
   * TODO @IN_PROGRESS
   */
  const readFileAsync = async (
    absoluteFilePath: string | string[],
    options?: {
      defaultValueWhenNotExists?: string | undefined;
      notTrim?: boolean;
    },
  ): Promise<string | undefined> => {
    return void 0;
  };
  //#endregion

  //#region utils files folders operations / write file
  type WriteFileAsyncInput =
    | string
    | object
    //#region @backend
    | Buffer;
  //#endregion

  /**
   * TODO @IN_PROGRESS
   */
  const writeFileAsync = async (
    absoluteFilePath: string | string[],
    input: WriteFileAsyncInput,
    options?: { overrideSameFile?: boolean; preventParentFile?: boolean },
  ): Promise<boolean> => {
    return void 0;
  };
  //#endregion

  //#region utils files folders operations / is existed symlink
  /**
   * TODO @IN_PROGRESS
   */
  const isExistedSymlink = async (
    absoluteFilePath: string | string[],
  ): Promise<boolean> => {
    return void 0;
  };
  //#endregion

  //#region utils files folders operations / is un existed link
  /**
   * TODO @IN_PROGRESS
   */
  const isUnExistedLink = async (
    absoluteFilePath: string | string[],
  ): Promise<boolean> => {
    return void 0;
  };
  //#endregion
}
