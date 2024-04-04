export namespace CoreModels {
  export type ReleaseType = 'major' | 'minor' | 'patch';
  export type PROGRESS_DATA_TYPE = 'info' | 'error' | 'warning' | 'event';
  export type EnvironmentName = 'local' | 'static' | 'dev' | 'stage' | 'prod' | 'online' | 'test' | 'qa' | 'custom';
  export type PUSHTYPE =
    'feat'
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
    | 'docs'
    ;

  export type UIFramework = 'bootstrap' | 'material' | 'ionic';
  export type FrameworkVersion = 'v1' | 'v2' | 'v3' | 'v4' | 'v5' | 'v6' | 'v7' | 'v8' | 'v9';
  export type CutableFileExt = 'scss' | 'css' | 'sass' | 'html' | 'ts';
  export type ImageFileExtension = 'jpg' | 'jpeg' | 'png' | 'svg';
  export type FileExtension = 'ts' | 'js' | 'json' | 'html' | ImageFileExtension | 'txt' | CutableFileExt;


  export type HttpMethod = 'get' | 'post' | 'put' | 'delete' | 'patch' | 'head' | 'jsonp';
  export type ParamType = 'Path' | 'Query' | 'Cookie' | 'Header' | 'Body';
  export type TsUsage = 'import' | 'export';

  export type LibType = 'unknow'
    | 'isomorphic-lib' // + https://github.com/maximegris/angular-electron
    | 'container'
    | 'docker'
    | 'vscode-ext'
    | 'chrome-ext'
    | 'unknow-npm-project'
    ;

  export type NewFactoryType = LibType | 'model' | 'single-file-project';
  export type CoreLibCategory = LibType | 'common';

  export type FileEvent = 'created' | 'changed' | 'removed' | 'rename';

  /**
   * @deprecated
   */
  export type OutFolder = 'dist' | 'browser';

  export type DatabaseType = 'better-sqlite3' | 'mysql';


  //#region uploaded backend file
  export interface UploadedBackendFile {
    data: any
    //#region @backend
    | Buffer
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
    }
    prefix?: string;
    detach?: boolean;
    /**
     * Try command again after fail after n miliseconds
     */
    tryAgainWhenFailAfter?: number;

    /**
     * Use big buffer for big webpack logs
     */
    biggerBuffer?: boolean;
    askToTryAgainOnError?: boolean;
    exitOnErrorCallback?: (code: number) => void;
    /**
     * From displaying in console
     */
    hideOutput?: {
      stdout?: boolean;
      stderr?: boolean;
      acceptAllExitCodeAsSuccess?: boolean;
    }
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
    ".aac": "audio/aac",
    ".abw": "application/x-abiword",
    ".arc": "application/x-freearc",
    ".avi": "video/x-msvideo",
    ".azw": "application/vnd.amazon.ebook",
    ".bin": "application/octet-stream",
    ".bmp": "image/bmp",
    ".bz": "application/x-bzip",
    ".bz2": "application/x-bzip2",
    ".csh": "application/x-csh",
    ".css": "text/css",
    ".csv": "text/csv",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".eot": "application/vnd.ms-fontobject",
    ".epub": "application/epub+zip",
    ".gz": "application/gzip",
    ".gif": "image/gif",
    ".htm": "text/html",
    ".html": "text/html",
    ".ico": "image/vnd.microsoft.icon",
    ".ics": "text/calendar",
    ".jar": "application/java-archive",
    ".jpeg": "image/jpeg",
    ".jpg": "image/jpeg",
    ".js": "text/javascript",
    ".json": "application/json",
    ".jsonld": "application/ld+json",
    ".mid": "application/midi",
    ".midi": "application/midi",
    ".mjs": "text/javascript",
    ".mp3": "audio/mpeg",
    ".mp4": "video/mp4",
    ".mpeg": "video/mpeg",
    ".mpkg": "application/vnd.apple.installer+xml",
    ".odp": "application/vnd.oasis.opendocument.presentation",
    ".ods": "application/vnd.oasis.opendocument.spreadsheet",
    ".odt": "application/vnd.oasis.opendocument.text",
    ".oga": "audio/ogg",
    ".ogg": "audio/ogg",
    ".ogv": "video/ogg",
    ".ogx": "application/ogg",
    ".opus": "audio/opus",
    ".otf": "font/otf",
    ".png": "image/png",
    ".pdf": "application/pdf",
    ".php": "application/php",
    ".ppt": "application/vnd.ms-powerpoint",
    ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ".rar": "application/vnd.rar",
    ".rtf": "application/rtf",
    ".sh": "application/x-sh",
    ".svg": "image/svg+xml",
    ".swf": "application/x-shockwave-flash",
    ".tar": "application/x-tar",
    ".tif": "image/tiff",
    ".tiff": "image/tiff",
    ".ts": "video/mp2t",
    ".ttf": "font/ttf",
    ".txt": "text/plain",
    ".vsd": "application/vnd.visio",
    ".wav": "audio/wav",
    ".weba": "audio/webm",
    ".webm": "video/webm",
    ".webp": "image/webp",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".xhtml": "application/xhtml+xml",
    ".xls": "application/vnd.ms-excel",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".xml": "application/xml",
    ".xul": "application/vnd.mozilla.xul+xml",
    ".zip": "application/zip",
    ".3gp": "video/3gpp",
    ".3g2": "video/3gpp2",
    ".7z": "application/x-7z-compressed"
  } as const;

  export type ContentTypeKeys = keyof typeof mimeTypes;
  export type ContentType = typeof mimeTypes[ContentTypeKeys] | 'multipart/form-data';
  type ContentType_ = ContentType;

  /**
   * https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types
   */
  export type MediaType =
    'text' | 'image' | 'audio' | 'font'
    | 'video' | 'application' | 'multipart' | 'message' | 'model';

  export const MediaTypeAllArr = [
    'text', 'image', 'audio', 'video', 'font',
    'application', 'multipart', 'message', 'model'
  ] as MediaType[]

  export type MimeType = keyof typeof mimeTypes;
  export const MimeTypesObj = mimeTypes;
  //#endregion

  //#region  pwa
  export interface ManifestIcon {
    "src": string; // "assets/icons/icon-96x96.png",
    "sizes": string; // "96x96",
    "type": string; // "image/png",
    "purpose": string; // "maskable any"
  }

  export interface PwaManifest {
    "name": string;//  "app",
    "short_name": string;//  "app",
    "theme_color": string;// "#1976d2",
    "background_color": string;//  "#fafafa",
    "display": "standalone",
    "scope": string;// "./",
    "start_url": string;//  "start_url": "./", => "start_url" "https://darekf77.github.io/bs4-breakpoint/"
    icons: ManifestIcon[];
  };
  //#endregion

  //#region vscode
  export interface VSCodeSettings {
    'files.exclude': { [files: string]: boolean; };
    'workbench.colorTheme': 'Default Light+' | 'Kimbie Dark',
    'workbench.colorCustomizations': {
      'activityBar.background'?: string;
      'activityBar.foreground'?: string;
      'statusBar.background'?: string;
    }
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
    name: string; installName?: string; version?: string | number;
  }

  interface GlobalCommandLineProgramDependency {
    name: string; website: string; version?: string;
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
    paths: { [fullPackageName: string]: string[]; };
    useDefineForClassFields: boolean;
  }
  export interface TsConfigJson {
    extends: string;
    exclude: string[];
    compileOnSave: boolean;
    compilerOptions: CompilerOptions;
    angularCompilerOptions: AngularCompilerOptions;
  }
  //#endregion




}

