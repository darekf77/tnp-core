//#region imports & constants
import {
  areTrustedForPatchUpdate,
  fileName,
  filesNotAllowedToClean,
  folderName,
  isCloudflareWorker,
  tempFoldersName,
} from './constants';
import { path, fse, os, child_process } from './core-imports'; // @backend
import { CoreModels } from './core-models';
import { win32Path, crossPlatformPath } from './cross-platform-path';
import { frameworkName } from './framework-name';
//#endregion

declare const global: any;
//#region @backend
if (global && !global['ENV']) {
  global['ENV'] = {};
}
let DIRNAME_ROOT: string;
if (isCloudflareWorker) {
  globalThis.__dirname = '/'; // TODO QUICK_FIX
  DIRNAME_ROOT = '/'; // TODO QUICK_FIX
} else {
  DIRNAME_ROOT = __dirname;
}

//#endregion

//#region config

// console.log({
//   dirnameForTnp
// });
// process.exit(0)

export const config = {
  packagesThat: {
    areTrustedForPatchUpdate,
  },
  regexString: {
    pathPartStringRegex: `(\/([a-zA-Z0-9]|\\-|\\_|\\+|\\.)*)`,
  },
  placeholders: {
    forProjectsInEnvironmentFile: '//<PLACEHOLDER_FOR_PROJECTS>',
  },
  frameworkName,
  startPort: 6001,
  frameworks: ['bootstrap', 'ionic', 'material'] as CoreModels.UIFramework[],
  /**
   * @deprecated use folderName instead
   */
  folder: folderName,
  /**
   * @deprecated use tempFoldersName instead
   */
  tempFolders: tempFoldersName,
  // @ts-ignore
  filesNotAllowedToClean: Object.keys(filesNotAllowedToClean).map(
    key => filesNotAllowedToClean[key],
  ) as string[],
  /**
   * @deprecated use fileName instead
   */
  file: fileName,
  reservedArgumentsNamesUglify: ['reservedExpOne', 'reservedExpSec'],
  // environmentName,
  localLibs: [
    //#region @backend
    'eslint',
    'mkdirp',
    'gulp',
    'npm-run',
    'rimraf',
    'nodemon',
    'release-it',
    'tsc',
    'watch',
    'http-server',
    'ts-node',
    'sort-package-json',
    'concurrently',
    'sloc',
    //#endregion
  ],
  helpAlias: ['-h', '--help', '-help', 'help'],
};
//#endregion

//#region globa isomorphic deps
// export const GlobalIsomorphicDependencies: ConfigModels.GlobalDependencies = {
//   npm: [
//     { name: 'rimraf' },
//     { name: 'npm-run', version: '4.1.2' },
//     { name: 'cpr' },
//     { name: 'check-node-version' },
//     { name: 'vsce' },
//   ],
//   programs: [
//     // {
//     //   name: 'code',
//     //   website: 'https://code.visualstudio.com/'
//     // }
//   ] as { name: string; website: string }[]
// };
//#endregion
