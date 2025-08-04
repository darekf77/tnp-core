import type { ChildProcess } from 'child_process';

import { PackageJson } from 'type-fest';

export namespace CoreModels {
  //#region package
  export type Package = {
    name: string;
    version?: string;
    installType?: InstalationType;
  };
  //#endregion

  //#region npm install options
  export type NpmInstallOptions = {
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
  };
  //#endregion

  //#region installation type
  export type InstalationType = '-g' | '--save' | '--save-dev' | 'remove';

  export const InstalationTypeArr = ['-g', '--save', '--save-dev'];
  //#endregion

  export type ReleaseVersionType = 'major' | 'minor' | 'patch';
  export type PreReleaseVersionTag = 'alpha' | 'beta' | 'rc' | 'next';
  export const NpmSpecialVersions = [
    'latest',
    'next',
    'beta',
    'alpha',
    'rc',
    'lts',
  ];

  //#region progress data type
  export type PROGRESS_DATA_TYPE = 'info' | 'error' | 'warning' | 'event';
  //#endregion

  //#region environment name
  /**
   * Available application environments.
   */
  export const EnvironmentName = Object.freeze({
    /**
     * Default environment, typically for artifact without application
     * or for storing common data
     */
    __: '__',

    /**
     * Local development environment, typically the developer's machine.
     */
    LOCALHOST: 'localhost',

    /**
     * Development environment used by engineers to deploy and test new features.
     */
    DEV: 'dev',

    /**
     * Staging environment used for final validations before production.
     */
    STAGE: 'stage',

    /**
     * Production environment serving live users.
     */
    PROD: 'prod',

    /**
     * Automated test environment for running unit, integration, or automated tests.
     */
    TEST: 'test',

    /**
     * Quality assurance environment designated for manual and exploratory testing.
     */
    QA: 'qa',

    /**
     * Sandbox environment for experimenting and integration without affecting other environments.
     */
    SANDBOX: 'sandbox',

    /**
     * User Acceptance Testing environment where clients or stakeholders validate the release candidate.
     */
    UAT: 'uat',

    /**
     * Pre-production environment, closely mirroring production for final testing and validation.
     */
    PREPROD: 'preprod',

    /**
     * Demonstration environment specifically configured for client presentations and demos.
     */
    DEMO: 'demo',

    /**
     * Documentation environment for hosting and managing project documentation.
     */
    DOCS: 'docs',

    /**
     * Demonstration environment ONLY html files, typically used for static pages or documentation.
     * This environment is not intended for dynamic content or server-side processing.
     * Perfect to github pages or similar.
     * It is not intended for production use and should not be used for any critical applications or services.
     */
    STATIC_PAGES: 'static-pages',

    /**
     * Continuous Integration environment used by CI/CD pipelines for automated builds and deployments.
     */
    CI: 'ci',

    /**
     * Training environment dedicated to internal team onboarding and training activities.
     */
    TRAINING: 'training',
  });

  export type EnvironmentNameTaon =
    (typeof EnvironmentName)[keyof typeof EnvironmentName];

  //#endregion

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

  //#region http method
  export type HttpMethod =
    | 'get'
    | 'post'
    | 'put'
    | 'delete'
    | 'patch'
    | 'head'
    | 'jsonp';
  //#endregion

  //#region http status code
  export type ParamType = 'Path' | 'Query' | 'Cookie' | 'Header' | 'Body';
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
  export type LibType =
    | BaseProjectType
    | 'isomorphic-lib' // + https://github.com/maximegris/angular-electron
    | 'container'
    | 'unknown-npm-project';
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

  //#region uploaded backend file
  export interface UploadedBackendFile {
    data:
      | any
      //#region @backend
      | Buffer;
    //#endregion
    encoding: string;
    md5: string;
    tempFilePath: string;
    mimetype: ContentType;
    mv: (path, callback) => any;
    name: string;
    truncated: boolean;
  }
  //#endregion

  //#region execute options process
  /**
   * @deprecated
   */
  export interface ExecuteOptions {
    /** Extract string from line */
    extractFromLine?: (string | Function)[];
    /**
     * Modify output line by line
     */
    outputLineReplace?: (outputLine: string) => string;
    resolvePromiseMsg?: {
      stdout?: string | string[];
      stderr?: string | string[];
    };
    resolvePromiseMsgCallback?: {
      stdout?: () => any;
      stderr?: () => any;
      exitCode?: (exitCode: number) => any;
    };
    prefix?: string;
    detach?: boolean;
    /**
     * Try command again after fail after n miliseconds
     */
    tryAgainWhenFailAfter?: number;
    /**
     *  TODO @LAST implement this
     *
     * Output from processe with this key
     * will not be displayed twice when
     * 2 processes are running at the same time
     */
    similarProcessKey?: string;

    /**
     * Use big buffer for big webpack logs
     */
    biggerBuffer?: boolean;
    env?: any;
    askToTryAgainOnError?: boolean;
    onChildProcessChange?: (childProcess: ChildProcess) => void;
    exitOnErrorCallback?: (code: number) => void;
    /**
     * From displaying in console
     */
    hideOutput?: {
      stdout?: boolean;
      stderr?: boolean;
      acceptAllExitCodeAsSuccess?: boolean;
    };
    outputBuffer?: string[];
    outputBufferMaxSize?: number;
  }
  //#endregion

  //#region run options process
  /**
   * @deprecated
   */
  export interface RunOptions extends ExecuteOptions {
    showCommand?: boolean;

    /**
     * Show process output
     */
    output?: boolean;

    silence?: boolean;
    stdio?: any;

    // detached?: boolean;
    cwd?: string;
  }
  //#endregion

  //#region mime types / content type

  // https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types/Common_types
  export const mimeTypes = {
    '.aac': 'audio/aac',
    '.abw': 'application/x-abiword',
    '.arc': 'application/x-freearc',
    '.avi': 'video/x-msvideo',
    '.azw': 'application/vnd.amazon.ebook',
    '.bin': 'application/octet-stream',
    '.bmp': 'image/bmp',
    '.bz': 'application/x-bzip',
    '.bz2': 'application/x-bzip2',
    '.csh': 'application/x-csh',
    '.css': 'text/css',
    '.csv': 'text/csv',
    '.doc': 'application/msword',
    '.docx':
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.eot': 'application/vnd.ms-fontobject',
    '.epub': 'application/epub+zip',
    '.gz': 'application/gzip',
    '.gif': 'image/gif',
    '.htm': 'text/html',
    '.html': 'text/html',
    '.ico': 'image/vnd.microsoft.icon',
    '.ics': 'text/calendar',
    '.jar': 'application/java-archive',
    '.jpeg': 'image/jpeg',
    '.jpg': 'image/jpeg',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.jsonld': 'application/ld+json',
    '.mid': 'application/midi',
    '.midi': 'application/midi',
    '.mjs': 'text/javascript',
    '.mp3': 'audio/mpeg',
    '.mp4': 'video/mp4',
    '.mpeg': 'video/mpeg',
    '.mpkg': 'application/vnd.apple.installer+xml',
    '.odp': 'application/vnd.oasis.opendocument.presentation',
    '.ods': 'application/vnd.oasis.opendocument.spreadsheet',
    '.odt': 'application/vnd.oasis.opendocument.text',
    '.oga': 'audio/ogg',
    '.ogg': 'audio/ogg',
    '.ogv': 'video/ogg',
    '.ogx': 'application/ogg',
    '.opus': 'audio/opus',
    '.otf': 'font/otf',
    '.png': 'image/png',
    '.pdf': 'application/pdf',
    '.php': 'application/php',
    '.ppt': 'application/vnd.ms-powerpoint',
    '.pptx':
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.rar': 'application/vnd.rar',
    '.rtf': 'application/rtf',
    '.sh': 'application/x-sh',
    '.svg': 'image/svg+xml',
    '.swf': 'application/x-shockwave-flash',
    '.tar': 'application/x-tar',
    '.tif': 'image/tiff',
    '.tiff': 'image/tiff',
    '.ts': 'video/mp2t',
    '.ttf': 'font/ttf',
    '.txt': 'text/plain',
    '.vsd': 'application/vnd.visio',
    '.wav': 'audio/wav',
    '.weba': 'audio/webm',
    '.webm': 'video/webm',
    '.webp': 'image/webp',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.xhtml': 'application/xhtml+xml',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx':
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.xml': 'application/xml',
    '.xul': 'application/vnd.mozilla.xul+xml',
    '.zip': 'application/zip',
    '.3gp': 'video/3gpp',
    '.3g2': 'video/3gpp2',
    '.7z': 'application/x-7z-compressed',
  } as const;

  export type ContentTypeKeys = keyof typeof mimeTypes;
  export type ContentType =
    | (typeof mimeTypes)[ContentTypeKeys]
    | 'multipart/form-data';
  type ContentType_ = ContentType;

  /**
   * https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types
   */
  export type MediaType =
    | 'text'
    | 'image'
    | 'audio'
    | 'font'
    | 'video'
    | 'application'
    | 'multipart'
    | 'message'
    | 'model';

  export const MediaTypeAllArr = [
    'text',
    'image',
    'audio',
    'video',
    'font',
    'application',
    'multipart',
    'message',
    'model',
  ] as MediaType[];

  export type MimeType = keyof typeof mimeTypes;
  export const MimeTypesObj = mimeTypes;
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

  //#region tsconfig
  interface AngularCompilerOptions {
    fullTemplateTypeCheck: boolean;
    strictInjectionParameters: boolean;
    compilationMode: string;
    preserveSymlinks: boolean;
    enableIvy: boolean;
  }

  interface CompilerOptions {
    baseUrl: string;
    outDir: string;
    sourceMap: boolean;
    declaration: boolean;
    strictNullChecks: boolean;
    downlevelIteration: boolean;
    experimentalDecorators: boolean;
    emitDecoratorMetadata: boolean;
    esModuleInterop: boolean;
    module: string;
    moduleResolution: string;
    importHelpers: boolean;
    skipLibCheck: boolean;
    target: string;
    typeRoots: string[];
    types: string[];
    lib: string[];
    paths: { [fullPackageName: string]: string[] };
    useDefineForClassFields: boolean;
  }
  export interface TsConfigJson {
    extends: string;
    exclude: string[];
    compileOnSave: boolean;
    compilerOptions: CompilerOptions;
    angularCompilerOptions: AngularCompilerOptions;
  }

  export interface TscCompileOptions {
    cwd: string;
    watch?: boolean;
    outDir?: 'dist';
    generateDeclarations?: boolean;
    tsExe?: string;
    diagnostics?: boolean;
    hideErrors?: boolean;
    debug?: boolean;
  }
  //#endregion
}
