import type { CoreModels } from './core-models';

export const urlRepoTaon = 'https://github.com/darekf77/taon.git';
export const urlRepoTaonContainers = 'https://github.com/darekf77/taon-containers.git';

export const GlobalLibTypeName = {
  //#region @backend
  isomorphicLib: 'isomorphic-lib',
  container: 'container',
  docker: 'docker',
  unknowNpmProject: 'unknow-npm-project',
  vscodeExt: 'vscode-ext',
  chromeExt: 'chrome-ext',
  singleFileProject: 'single-file-project',
  navi: 'navi',
  scenario: 'scenario',
  //#endregion
};

export const LibTypeArr: CoreModels.LibType[] = [
  //#region @backend
  GlobalLibTypeName.isomorphicLib,
  GlobalLibTypeName.container,
  GlobalLibTypeName.docker,
  GlobalLibTypeName.unknowNpmProject,
  GlobalLibTypeName.vscodeExt,
  GlobalLibTypeName.chromeExt,
  GlobalLibTypeName.navi,
  GlobalLibTypeName.scenario,
  //#endregion
] as CoreModels.LibType[];

export const CoreLibCategoryArr: CoreModels.CoreLibCategory[] = [
  // TODO this is for what ?
  //#region @backend
  GlobalLibTypeName.isomorphicLib,
  GlobalLibTypeName.docker,
  'common',
  //#endregion
] as CoreModels.CoreLibCategory[];

//#region constants / files not allowed to clean
export const filesNotAllowedToClean = {
  //#region @backend
  _gitignore: '.gitignore',
  _npmrc: '.npmrc',
  _npmignore: '.npmignore',
  tslint_json: 'tslint.json',
  _editorconfig: '.editorconfig',
  _angularCli_json: '.angular-cli.json',
  _vscode_launch_json: '.vscode/launch.json',
  //#endregion
};
//#endregion

//#region constants / file (files aliases)
export const fileName = {
  _bowerrc: '.bowerrc',
  bower_json: 'bower.json',
  controllers_ts: 'controllers.ts',
  entities_ts: 'entities.ts',
  angular_json: 'angular.json',
  autob_actions_js: 'auto-actions.js',
  local_config_js: 'local-config.js',
  build_config_js: 'build-config.js',
  local_config: 'local-config',
  start_backend_ts: 'start.backend.ts',
  result_packages_json: 'result-packages.json',
  build_info_generated_ts: 'build-info._auto-generated_.ts',
  index_generated_ts: 'index._auto-generated_.ts',
  docs_config_jsonc: 'docs-config.jsonc',
  package_json: 'package.json',
  taon_jsonc: 'taon.jsonc',
  /**
   * @deprecated
   */
  firedev_jsonc: 'firedev.jsonc',
  /**
   * @deprecated
   */
  firedev_json: 'firedev.json',
  /**
   * @deprecated
   */
  package_json__tnp_json: 'package.json_tnp.json',
  /**
   * @deprecated
   */
  package_json__tnp_json5: 'package.json_tnp.json5',
  /**
   * @deprecated
   */
  package_json__devDependencies_json: 'package.json_devDependencies.json',
  /**
   * @deprecated
   */
  devDependencies_json: 'devDependencies.json',

  yarn_lock: 'yarn.lock',
  package_lock_json: 'package-lock.json',
  tnpEnvironment_json: 'tmp-environment.json',
  environment: 'environment',
  environment_js: 'environment.js',
  /**
   * @deprecated
   */
  tmp_transaction_pid_txt: 'tmp-transaction-pid.txt',
  manifest_webmanifest: 'manifest.webmanifest',
  public_api_d_ts: 'public-api.d.ts',
  public_api_ts: 'public-api.ts',
  public_api: 'public-api',
  _babelrc: '.babelrc',
  index: 'index',
  index_d_ts: 'index.d.ts',
  index_ts: 'index.ts',
  index_js: 'index.js',
  cli_js: 'cli.js',
  cli_ts: 'cli.ts',
  index_js_map: 'index.js.map',
  db_json: 'db.json',
  db_for_tests_json: 'db-for-tests.json',
  /**
   * @deprecated
   */
  tmpDockerImageId: 'tmp-docker-image-id',
  tmp_recent_json: 'recent.json',
  tmpIsomorphicPackagesJson: 'tmp-isomorphic-packages.json',
  tsconfig_json: 'tsconfig.json',
  tsconfig_lib_json: 'tsconfig.lib.json',
  README_MD: 'README.md',
  server_key: 'server.key',
  server_cert: 'server.cert',
  server_chain_cert: 'server-chain.cert',
  meta_config_md: 'meta-content.md',
  logo_png: 'logo.png',
  logo_svg: 'logo.svg',
  ric_proj_json: 'ric-project.json',
  linked_projects_json: 'linked-projects.json',
  docker_compose_yml: 'docker-compose.yml',
  compose_yml: 'docker-compose.yml',
  ...filesNotAllowedToClean,
};
//#endregion

//#region constants / temp folders
export const tempFoldersName = {
  // DO NOT PUT ANYTHING SUPID HERE!!!
  vendor: 'vendor',
  docs: 'docs',
  dist: 'dist',
  tmp: 'tmp',
  tmpDistRelease: 'tmp-dist-release',
  tempSrc: 'tmp-src',
  tempSrcDist: 'tmp-src-dist',
  previewDistApp: 'dist-app',
  preview: 'preview',
  browser: 'browser',
  websql: 'websql',
  _browser: '.browser',
  module: 'module',
  backup: 'backup',
  node_modules: 'node_modules',
  local_release: 'local_release',
  client: 'client',
  tnp_tests_context: 'tmp-tests-context',
  tmpPackage: 'tmp-package',
  tmpScenarios: 'tmp-scenarios',
  tmpTestsEnvironments: 'tmp-tests-environments',
  testsEnvironments: 'tests-environments',
};
//#endregion

//#region constants / folder (folders aliases)
export const folderName = {
  scripts: 'scripts',
  scenarios: 'scenarios',
  bower: 'bower',
  src: 'src',
  out: 'out',
  app: 'app',
  lib: 'lib',
  libraries: 'libraries',
  libs: 'libs',
  source: 'source',
  custom: 'custom',
  migrations: 'migrations',
  components: 'components',
  assets: 'assets',
  generated: 'generated',
  apps: 'apps',
  shared: 'shared',
  container: 'container',
  bin: 'bin',
  _bin: '.bin',
  _vscode: '.vscode',
  project: 'project',
  projects: 'projects',
  external: 'external',
  tmpDist: 'tmp-dist',
  tmpFor(d: CoreModels.OutFolder) {
    return `tmp-src-${d}`;
  },
  targetProjects: {
    DEFAULT_PATH_GENERATED: 'tmp-target-projects/generated',
    DEFAULT_PATH_ORIGINS: 'tmp-target-projects/origins',
  },
  ...tempFoldersName,
};
//#endregion

//#region constants / trusted packages for update
export const areTrustedForPatchUpdate = [
  //#region @backend
  '@angular',
  '@ngrx',
  'rxjs',
  'zone.js',
  'tslib',
  'typescript',
  'webpack',
  //#endregion
];
//#endregion

export const extAllowedToExportAndReplaceTSJSCodeFiles = [
  'js',
  'ts',
  'tsx',
].map(ext => `.${ext}`);

export const extTemplatesFiles = ['html'].map(ext => `.${ext}`);

export const extForSassLikeFiles = ['scss', 'sass'].map(ext => `.${ext}`);

export const extForStyles = [
  ...extForSassLikeFiles,
  ...['css', 'less'].map(ext => `.${ext}`),
];

export const extAllowedToReplace = [
  ...extForStyles,
  ...extTemplatesFiles,
  ...extAllowedToExportAndReplaceTSJSCodeFiles,
];

export const REGEX_REGION = {
  TS_JS_SCSS_SASS: {
    START: new RegExp('\\/\\/\\s*\\#region'),
    END: new RegExp('\\/\\/\\s*\\#endregion'),
    EXT: [...extAllowedToExportAndReplaceTSJSCodeFiles, ...extForSassLikeFiles],
  },
  HTML: {
    START: new RegExp('\\<\\!\\-\\-\\s*\\#region'),
    END: new RegExp('\\<\\!\\-\\-\\s*\\#endregion'),
    EXT: extTemplatesFiles,
  },
  CSS: {
    START: new RegExp('\\/\\*\\s*\\#region'),
    END: new RegExp('\\/\\*\\s*\\#endregion'),
    EXT: extForStyles,
  },
};

export const backendNodejsOnlyFiles = [
  'backend.ts',
  // '.repository.ts', // deprecated in typeorm
].map(ext => `.${ext}`);

export const backendWebsqlNodejsFiles = ['subscriber.ts', 'test.ts'].map(
  ext => `.${ext}`,
);

export const frontendFiles = [
  'browser.ts',
  'component.ts',
  'container.ts',
  'directive.ts',
  'pipe.ts',
  'module.ts',
  'service.ts',
  'store.ts',
  'actions.ts',
  'action.ts',
  'effects.ts',
  'effect.ts',
  'reducers.ts',
  'reducer.ts',
  'selectors.ts',
  'selector.ts',
  'routes.ts',
  'resolver.ts',
  'resolvers.ts',
  'guard.ts',
  'guards.ts',
  'store.ts',
  'spec.ts',
  'e2e.ts',
  'cy.ts',
  'e2e-spec.ts',
].map(ext => `.${ext}`);

export const notNeededForExportFiles = ['routes.ts'].map(ext => `.${ext}`);

export const frontEndOnly = [
  ...extTemplatesFiles,
  ...extForStyles,
  ...frontendFiles,
];

export const appRelatedFiles = [
  ...extAllowedToReplace.map(ext => `app${ext}`),
  ...frontendFiles.map(ext => `app${ext}`),
  'app.models.ts',
  'app.env.ts',
  'app.constants.ts',
  'app.hosts.ts',
  'app.electron.ts',
  'app.vscode.ts',
  'app.mobile.ts',
  'app.context.ts',
  'app.worker.ts',
];

export const TAGS = {
  BACKEND: `@${'back' + 'end'}`,
  BACKEND_FUNC: `@${'back' + 'endFunc'}`,
  BROWSER: `@${'brow' + 'ser'}`,
  WEBSQL_ONLY: `@${'web' + 'sqlOnly'}`,
  WEBSQL: `@${'web' + 'sql'}`,
  WEBSQL_FUNC: `@${'web' + 'sqlFunc'}`,
  NOT_FOR_NPM: `@${'not' + 'ForNpm'}`,
  CUT_CODE_IF_TRUE: '@cutCode' + 'IfTrue',
  CUT_CODE_IF_FALSE: '@cutCode' + 'IfFalse',
  COMMENT_REGION: `//${'#reg' + 'ion'}`,
  COMMENT_END_REGION: `//${'#end' + 'region'}`,
};

export const BaselineSiteJoinprefix = '__';

export const PREFIXES = {
  BASELINE: BaselineSiteJoinprefix,
  DELETED: '____DELETED____',
  ORIGINAL: '____ORIGINAL____',
  RESTORE_NPM: '____',
};

export namespace FilesNames {
  export const tmpLastSelectedJsonFile = 'tmp-last-selected.json';
}

export const baseTaonDevProjectsNames = [
  'taon',
  'taon-simple-org',
  'taon-storage',
  'taon-type-sql',
  'taon-typeorm',
  'incremental-compiler',
  'isomorphic-region-loader',
  'json10',
  'json10-writer',
  'lodash-walk-object',
  'magic-renamer',
  'ng-talkback',
  'ng2-logger',
  'ng2-rest',
  'ng2-rest-swagger-generator',
  'node-cli-tester',
  'record-replay-req-res-scenario',
  'static-columns',
  'tnp',
  'tnp-config',
  'tnp-core',
  'tnp-helpers',
  'tnp-models',
  'typescript-class-helpers',
  'vpn-split',
];

export const notAllowedNames = [
  'copyto',
  'copy',
  'melt',
  'push',
  'pul',
  'soft',
  'pull',
  'app',
  'apps',
  'dist',
  'bundle',
  'libs',
  'lib',
  'src',
  'bin',
  'source',
  'migrations',
  'assets',
  'assets-for',
  'browser',
  'websql',
  'compiled',
  'docs',
  'environments',
  'env',
  'projects',
  'plugins',
  '_',
];

export const notAllowedProjectNames = [
  // TODO add all npm package names from core container
  ...notAllowedNames,
  ...backendNodejsOnlyFiles,
];
