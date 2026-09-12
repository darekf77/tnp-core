import type { ChildProcess } from 'child_process';

import { Observable } from 'rxjs';

import { LibTypeNames } from './constants';
import { UtilsHttp } from './utils-http';

export namespace CoreModels {
  //#region package
  export interface Package {
    name: string;
    version?: string;
    installType?: InstalationType;
  }
  //#endregion

  //#region npm install options
  export interface NpmInstallOptions {
    NODE_TLS_REJECT_UNAUTHORIZED?: boolean;
    pkg?: CoreModels.Package;
    /**
     * false by default
     */
    silent?: boolean;
    /**
     * false by default
     */
    useYarn?: boolean;
    /**
     * false by default
     */
    force?: boolean;
    /**
     * Reason for installing package(s)
     */
    reason?: string;
    /**
     * true by default
     */
    removeYarnOrPackageJsonLock?: boolean;
    /**
     * false by default
     */
    generateYarnOrPackageJsonLock?: boolean;
    /**
     * false by default
     */
    skipRemovingNodeModules?: boolean;
  }
  //#endregion

  //#region installation type
  export type InstalationType = '-g' | '--save' | '--save-dev' | 'remove';

  export const InstalationTypeArr = ['-g', '--save', '--save-dev'];
  //#endregion

  //#region npm models
  export interface NpmPublishOptions {
    registry?: string;
    skipQuestionsToUser?: boolean;
  }

  export type ReleaseVersionType = 'major' | 'minor' | 'patch';

  export enum ReleaseVersionTypeEnum {
    MAJOR = 'major',
    MINOR = 'minor',
    PATCH = 'patch',
  }

  export type PreReleaseVersionTag = 'alpha' | 'beta' | 'rc' | 'next';
  export const NpmSpecialVersions = [
    'latest',
    'next',
    'beta',
    'alpha',
    'rc',
    'lts',
  ];
  //#endregion

  //#region progress data type
  export type PROGRESS_DATA_TYPE = 'info' | 'error' | 'warning' | 'event';
  //#endregion

  //#region environment name

  //#region push type
  export type PUSHTYPE =
    | 'feat'
    | 'chore'
    | 'feature'
    | 'refactor'
    | 'perf'
    | 'styles'
    | 'ci'
    | 'build'
    | 'fix'
    | 'bugfix'
    | 'release'
    | 'docs';
  //#endregion

  //#region ui framework
  /**
   * @deprecated
   */
  export type UIFramework = 'bootstrap' | 'material' | 'ionic';
  //#endregion

  //#region git connection models
  export type GitConnection = 'https' | 'ssh';
  export const GitConnectionArr = ['https', 'ssh'] as GitConnection[];
  //#endregion

  //#region framework version
  export type FrameworkVersion =
    | 'v1'
    | 'v2'
    | 'v3'
    | 'v4'
    | 'v16'
    | 'v18'
    | 'v19'
    | 'v20'
    | 'v21'
    | 'v22';
  //#endregion

  //#region cuttable file exitension
  export type CutableFileExt =
    | 'scss'
    | 'css'
    | 'less'
    | 'sass'
    | 'html'
    | 'ts'
    | 'tsx'
    | 'js';
  //#endregion

  //#region file extension
  export type ImageFileExtension = 'jpg' | 'jpeg' | 'png' | 'svg';
  export const ImageFileExtensionArr: CoreModels.ImageFileExtension[] = [
    'jpg',
    'jpeg',
    'png',
    'svg',
  ];
  //#endregion

  //#region file extension
  export type FileExtension =
    | 'json'
    | 'html'
    | ImageFileExtension
    | 'txt'
    | 'md'
    | CutableFileExt;
  //#endregion

  //#region http status codes
  /**
   * @deprecated use UtilsHttp.Code;
   * known http code
   */
  export type HttpCode = UtilsHttp.Code;
  //#endregion

  //#region http method
  /**
   * @deprecated use vUtilsHttp.Method
   */
  export type HttpMethod = UtilsHttp.Method;

  /**
   * @deprecated use tilsHttp.HttpMethodArr
   */
  export const HttpMethodArr = UtilsHttp.HttpMethodArr;
  //#endregion

  //#region http status code
  /**
   * @deprecated use UtilsHttp.ParamType
   */
  export type ParamType = UtilsHttp.ParamType;
  //#endregion

  //#region ts usage
  export type TsUsage = 'import' | 'export';
  //#endregion

  //#region base project type
  export type BaseProjectType =
    | 'typescript'
    | 'angular'
    | 'angular-lib'
    | 'unknown'
    | 'unknown-npm-project';
  //#endregion

  //#region base project type arr
  export const BaseProjectTypeArr = [
    'typescript',
    'angular',
    'angular-lib',
    'unknown',
    'unknown-npm-project',
  ];
  //#endregion

  //#region lib type
  export type LibType = BaseProjectType | LibTypeNames;

  //#endregion

  //#region new factory type
  /**
   * @deprecated
   */
  export type NewFactoryType = LibType | 'model' | 'single-file-project';
  //#endregion

  //#region core lib category
  /**
   * @deprecated
   */
  export type CoreLibCategory = LibType | 'common';
  //#endregion

  //#region file event
  export type FileEvent = 'created' | 'changed' | 'removed' | 'rename';
  //#endregion

  //#region out folder
  /**
   * @deprecated
   */
  export type OutFolder = 'dist' | 'browser';
  //#endregion

  //#region database type
  export type DatabaseType = ':inmemory' | 'mysql' | 'sqljs';
  //#endregion

  //#region run options process
  /**
   * @deprecated
   */
  export interface RunOptions {
    showCommand?: boolean;

    /**
     * Show process output
     */
    output?: boolean;

    silence?: boolean;
    stdio?: any;

    // detached?: boolean;
    cwd?: string;
    biggerBuffer?: boolean;
    tryAgainWhenFailAfter?: boolean;
    env?: any;
    detach?: boolean;
    outputLineReplace?: (outputLineStderOrStdout: string) => string;
    extractFromLine?: (string | Function)[];
  }
  //#endregion

  //#region mime types / content type

  /**
   * @deprecated use UtilsHttp.mimeTypes
   */
  export const mimeTypes = UtilsHttp.mimeTypes;

  /**
   * @deprecated use UtilsHttp.ContentTypeKeys
   */
  export type ContentTypeKeys = UtilsHttp.ContentTypeKeys;

  /**
   * @deprecated use UtilsHttp.ContentType
   */
  export type ContentType = UtilsHttp.ContentType;

  /**
   * @deprecated use  UtilsHttp.MediaType
   */
  export type MediaType = UtilsHttp.MediaType;

  /**
   * @deprecated use  UtilsHttp.MediaTypeAllArr
   */
  export const MediaTypeAllArr = UtilsHttp.MediaTypeAllArr;

  //#endregion

  //#region  pwa
  export interface ManifestIcon {
    src: string; // "assets/icons/icon-96x96.png",
    sizes: string; // "96x96",
    type: string; // "image/png",
    purpose: string; // "maskable any"
  }

  export interface PwaManifest {
    name: string; //  "app",
    short_name: string; //  "app",
    theme_color: string; // "#1976d2",
    background_color: string; //  "#fafafa",
    display: 'standalone';
    scope: string; // "./",
    start_url: string; //  "start_url": "./", => "start_url" "https://darekf77.github.io/bs4-breakpoint/"
    icons: ManifestIcon[];
  }
  //#endregion

  //#region vscode
  export interface VSCodeSettings {
    'files.exclude': { [files: string]: boolean };
    'workbench.colorTheme': 'Default Light+' | 'Kimbie Dark';
    'workbench.colorCustomizations': {
      'activityBar.background'?: string;
      'activityBar.foreground'?: string;
      'statusBar.background'?: string;
    };
  }
  //#endregion

  //#region position
  /**
   * @deprecated
   */
  export interface Position {
    x: number;
    y: number;
  }
  //#endregion

  //#region size
  /**
   * @deprecated
   */
  export interface Size {
    w: number;
    h: number;
  }
  //#endregion

  //#region global npm dependency
  interface GlobalNpmDependency {
    name: string;
    installName?: string;
    version?: string | number;
  }

  interface GlobalCommandLineProgramDependency {
    name: string;
    website: string;
    version?: string;
  }
  export interface GlobalDependencies {
    npm?: GlobalNpmDependency[];
    programs?: GlobalCommandLineProgramDependency[];
  }
  //#endregion

  export type BuildWatcherType =
    | 'browser-watcher'
    | 'websql-watcher'
    | 'backend-watcher';

  export type BuildWatcherErrorType = `${BuildWatcherType}-error`;

  export const BuildWatcherTypeArr = [
    'browser-watcher',
    'websql-watcher',
    'backend-watcher',
  ] as BuildWatcherType[];

  export const buildTypeToWatcherFn = (
    buildType: BuildType,
  ): BuildWatcherType | undefined => {
    if (
      (
        ['backend-cjs', 'backend-esm', 'backend-js-maps'] as BuildType[]
      ).includes(buildType)
    ) {
      return 'backend-watcher';
    }
    if (buildType === 'browser') {
      return 'browser-watcher';
    }
    if (buildType === 'websql') {
      return 'websql-watcher';
    }
  };

  //#region build type
  /**
   * 3 base build types for taon
   */
  export type BuildType =
    // | 'isomorphic' not needed for now - code change enought
    'browser' | 'websql' | 'backend-js-maps' | 'backend-esm' | 'backend-cjs';
  // | 'copy-manager'; not needed for now - debounce enought
  export const BuildTypeArr: BuildType[] = [
    // 'isomorphic',
    'backend-cjs',
    'backend-esm',
    'backend-js-maps',
    'browser',
    'websql',
    // 'copy-manager',
  ];
  //#endregion

  //#region cfont style
  export type CfontStyle =
    | 'block'
    | 'slick'
    | 'tiny'
    | 'grid'
    | 'pallet'
    | 'shade'
    | 'chrome'
    | 'simple'
    | 'simpleBlock'
    | '3d'
    | 'simple3d'
    | 'huge';

  export type CfontAlign = 'left' | 'center' | 'right' | 'block';
  //#endregion

  //#region constants
  export const tagForTaskName = '@updateValueWithPortNumForTaskName';

  /**
   * This is for storiginal class function (needed for typeorm/taon)
   */
  export const OrignalClassKey = '$$originalClass$$';

  /**
   * This is for storing class name inside special static property
   */
  export const ClassNameStaticProperty = '$$className$$';

  export const localhostIp127 = '127.0.0.1';
  export const localhostDomain = 'localhost';

  export const SPECIAL_WORKER_READY_MESSAGE = '$$$ WORKER_READY $$$';
  export const SPECIAL_APP_READY_MESSAGE = '$$$ APP_READY $$$';

  export const TaonHttpErrorCustomProp = '$$taonError$$';

  /**
   * Absolute path to project children;
   */
  export const pathToChildren = 'path-to-children';

  /**
   * Absolute path to project parent;
   */
  export const parentLocation = 'parent-location';

  export const hasExitCleaningFunction = 'has-exit-cleaning-function-for';

  //#endregion

  export type DeepPartial<T> = {
    [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
  };
}
