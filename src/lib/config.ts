//#region imports & constants
import {
  areTrustedForPatchUpdate,
  fileName,
  filesNotAllowedToClean,
  folderName,
  tempFoldersName,
} from './constants';
import {
  path,
  fse,
  os,
  child_process,
  crossPlatformPath,
} from './core-imports'; // @backend
import { CoreModels } from './core-models';
import { frameworkName } from './framework-name';
//#endregion

declare const global: any;
//#region @backend
if (global && !global['ENV']) {
  global['ENV'] = {};
}
//#endregion

//#region resolve tnp location
// @LAST RESOLVE TNP LOCATION !!! for each context and RELEASE TNP-CONFIG
let dirnameForTnp: string;
//#region @backend
dirnameForTnp = crossPlatformPath(path.resolve(__dirname, '..'));

if (process.platform === 'win32' && dirnameForTnp.endsWith('dist')) {
  // TODO QUICK_FIX for windows
  dirnameForTnp = crossPlatformPath(path.dirname(dirnameForTnp));
}

if (dirnameForTnp.endsWith(`/tnp-core/dist`)) {
  // local folder with tnp
  dirnameForTnp = dirnameForTnp.replace(`/tnp-core/dist`, '/tnp');
} else if (dirnameForTnp.endsWith(`/tnp/node_modules/tnp-core`)) {
  // local folder with tnp
  dirnameForTnp = dirnameForTnp.replace(`/tnp/node_modules/tnp-core`, '/tnp');
} else {
  // global tnp node_modules being use in firedev case
  dirnameForTnp = dirnameForTnp.replace(/\/tnp\-core$/, '/tnp');
}
global.dirnameForTaon = dirnameForTnp;

if (path.basename(dirnameForTnp) === 'node_modules') {
  dirnameForTnp = crossPlatformPath(path.join(dirnameForTnp, 'tnp'));
}

if (
  frameworkName === 'tnp' &&
  dirnameForTnp.endsWith('/local_release/npm-lib-and-cli-tool')
) {
  dirnameForTnp = dirnameForTnp.replace(
    '/local_release/npm-lib-and-cli-tool',
    '',
  );
}

//#endregion
//#endregion

//#region config

// console.log({
//   dirnameForTnp
// });
// process.exit(0)

export const config = {
  dirnameForTnp,
  packagesThat: {
    areTrustedForPatchUpdate,
  },
  regexString: {
    pathPartStringRegex: `(\/([a-zA-Z0-9]|\\-|\\_|\\+|\\.)*)`,
  },
  placeholders: {
    forProjectsInEnvironmentFile: '//<PLACEHOLDER_FOR_PROJECTS>',
  },
  array: {
    isomorphicPackages: 'isomorphicPackages',
  },
  frameworkName,
  /**
   * @deprecated pacakge json will be generated
   */
  packageJsonFrameworkKey: 'tnp',
  frameworkNames: {
    productionFrameworkName: 'taon',
    developmentFrameworkName: 'tnp',
  },
  startPort: 6001,
  frameworks: ['bootstrap', 'ionic', 'material'] as CoreModels.UIFramework[],
  //#region @backend
  tempFiles: {
    FILE_NAME_ISOMORPHIC_PACKAGES: 'tmp-isomorphic-packages.json',
  },
  pathes: {
    logoSvg: 'logo.svg',
    logoPng: 'logo.png',
  },
  //#endregion
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
  filesExtensions: {
    filetemplate: 'filetemplate',
  },
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
