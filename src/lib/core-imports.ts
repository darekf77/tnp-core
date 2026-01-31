// let forceTrace = false;
// QUICK_FIX for esm bundling
const REQUIRE_MAP = {
  jscodeshift: () => require('jscodeshift'),
  dateformat: () => require('dateformat'),
  ['body-parser']: () => require('body-parser'),
  ['cookie-parser']: () => require('cookie-parser'),
  ['cors']: () => require('cors'),
  ['express']: () => require('express'),
  ['method-override']: () => require('method-override'),
  ['express-session']: () => require('express-session'),
};
/**
 * use only in backend mode
 */
export function requireDefault<T>(id: keyof typeof REQUIRE_MAP): T {
  const m = REQUIRE_MAP[id]();
  return m?.default ?? m;
}
export { load } from './json10-writer';
//#region @backend
import * as fseBase from 'fs-extra';
import * as osBase from 'os';
import * as pathBase from 'path';
import chalkBase from 'chalk';
import * as cheerio from 'cheerio';
import * as child_processBase from 'child_process';
import * as httpBase from 'http';
import * as httpsBase from 'https';
const isRootBase = require('is-root');
const isAdminBase = require('is-admin');
const isElevatedBase = async (): Promise<boolean> => {
  return process.platform === 'win32' ? isAdminBase() : isRootBase();
};
import * as fkillBase from 'fkill';
import * as psListBase from 'ps-list';
import * as netBase from 'net';
import * as spawnBase from 'cross-spawn';
import * as globBase from 'glob';
import * as fgBase from 'fast-glob';
import * as rimrafBase from 'rimraf';
import * as chokidarBase from 'chokidar';
import * as mkdirpBase from 'mkdirp';
import * as ncpBase from 'copy-paste';
import * as psBase from 'ps-node';
//#endregion

//#region @browser
import jQuery from 'jquery';
import { chalk as chalkMock } from './node-chalk-mock';
import { path as pathMock } from './node-path-mock';
//#endregion
import { _ } from './lodash.namespace';
export { _ } from './lodash.namespace';
import * as q from 'q';
import { format } from 'date-fns';
let dateformat: typeof import('dateformat') = ((
  date: Date | number,
  mask: string,
): string => {
  return format(
    typeof date === 'number' ? new Date(date) : date,
    mask
      .replace(/mm/g, 'MM') // month
      .replace(/MM/g, 'mm'), // minutes
  );
}) as any;
//#region @backend
dateformat = requireDefault('dateformat');
//#endregion
import { Chalk } from 'chalk';
import * as json5 from 'json5';
import type jQueryType from 'jquery';
import type chalkBaseType from 'chalk';
import type * as pathBaseType from 'path';
import type * as globBaseType from 'glob';
import type * as fseBaseType from 'fs-extra';
import type * as osBaseType from 'os';
import type * as child_processType from 'child_process';
import type * as httpBaseType from 'http';
import type * as httpsBaseType from 'https';
import type * as fkillBaseType from 'fkill';
import type * as psListBaseType from 'ps-list';
import type * as netBaseType from 'net';
import type * as spawnBaseType from 'cross-spawn';
import type * as fgBaseType from 'fast-glob';
import type * as rimrafBaseType from 'rimraf';
import type * as chokidarBaseType from 'chokidar';
import type * as mkdirpBaseType from 'mkdirp';
import type * as ncpBaseType from 'copy-paste';
import type * as psBaseType from 'ps-node';
import { Helpers } from './index';

//#region set up browser mocks

//#region set up browser mocks / mock jquery
let $: jQueryType;
//#region @browser
$ = jQuery;
//#endregion
//#region @backend
$ = cheerio;
//#endregion
//#endregion

//#region set up browser mocks / mock path

let path = void 0 as typeof pathBaseType;
// #region @backend
path = pathBase;
//#endregion

//#region @browser
// @ts-ignore
path = pathMock;
//#endregion
//#endregion

//#region set up browser mocks / mock chalk

let chalk: Chalk = void 0 as typeof chalkBaseType;
// #region @backend
chalk = chalkBase as any;
//#endregion

//#region @browser
// @ts-ignore
chalk = chalkMock;
//#endregion
//#endregion

//#region set up browser mocks / mock glob
let glob = void 0 as typeof globBaseType;
//#region @backend
glob = globBase;
//#endregion
//#region @browser
// TODO: implement browser glob
//#endregion
//#endregion

//#region set up browser mocks / mock fse
let fse = void 0 as typeof fseBaseType;
//#region @backend
fse = fseBase;
//#endregion
//#region @browser
// TODO: implement browser fse
//#endregion
//#endregion

//#region set up browser mocks / mock os
let os = void 0 as typeof osBaseType;
//#region @backend
os = osBase;
//#endregion
//#region @browser
// TODO: implement browser os
//#endregion
//#endregion

//#region set up browser mocks / mock child_process
let child_process = void 0 as typeof child_processType;
//#region @backend
child_process = child_processBase;
//#endregion
//#endregion

//#region set up browser mocks / mock http
let http = void 0 as typeof httpBaseType;
//#region @backend
http = httpBase;
//#endregion
//#endregion

//#region set up browser mocks / mock https
let https = void 0 as typeof httpsBaseType;
//#region @backend
https = httpsBase;
//#endregion
//#endregion

//#region set up browser mocks / mock isRoot
let isRoot = void 0 as () => Promise<boolean>;
//#region @backend
isRoot = isRootBase;
//#endregion
//#endregion

//#region set up browser mocks / mock isAdmin
let isAdmin = void 0 as () => Promise<boolean>;
//#region @backend
isAdmin = isAdminBase;
//#endregion
//#endregion

//#region set up browser mocks / mock isElevated
/**
 * check if the current process is elevated
 * - sudo in unix/macos
 * - admin in windows
 */
let isElevated = void 0 as () => Promise<boolean>;
//#region @backend
isElevated = isElevatedBase;
//#endregion
//#endregion

//#region set up browser mocks / mock fkill
let fkill = void 0 as typeof fkillBaseType;
//#region @backend
fkill = fkillBase;
//#endregion
//#endregion

//#region set up browser mocks / mock psList
let psList = void 0 as typeof psListBaseType;
//#region @backend
psList = psListBase;
//#endregion
//#endregion

//#region set up browser mocks / mock net
let net = void 0 as typeof netBaseType;
//#region @backend
net = netBase;
//#endregion
//#endregion

//#region set up browser mocks / mock spawn
let spawn = void 0 as typeof spawnBaseType;
//#region @backend
spawn = spawnBase;
//#endregion
//#endregion

//#region set up browser mocks / mock rimraf
let rimraf = void 0 as typeof rimrafBaseType;
//#region @backend
rimraf = rimrafBase;
//#endregion
//#endregion

//#region set up browser mocks / mock chokidar
let chokidar = void 0 as typeof chokidarBaseType;
//#region @backend
chokidar = chokidarBase;
//#endregion
//#endregion

//#region set up browser mocks / mock mkdirp
let mkdirp = void 0 as typeof mkdirpBaseType;
//#region @backend
mkdirp = mkdirpBase;
//#endregion
//#endregion

//#region set up browser mocks / mock ncp
let ncp = void 0 as typeof ncpBaseType;
//#region @backend
ncp = ncpBase;
//#endregion
//#endregion

//#region set up browser mocks / mock ps
let ps = void 0 as typeof psBaseType;
//#region @backend
ps = psBase;
//#endregion
//#endregion

//#region set up browser mocks / mock fg
let fg = void 0 as typeof fgBaseType;
//#region @backend
fg = fgBase;
//#endregion
//#endregion

//#endregion

//#region crossPlatformPath

//#region transform unix path to win32 path
/**
 * transform unix path to win32 path
 */
const win32Path = (p: string): string => {
  //#region @backend
  if (process.platform !== 'win32') {
    return p;
  }
  //#endregion
  if (/^\/[a-z]\//.test(p)) {
    p = p.replace(/^\/[a-z]\//, `${p.charAt(1).toUpperCase()}:/`);
  }
  // return _.upperFirst(path.win32.normalize(p)); // TODO maybe not needed
  return path.win32.normalize(p);
};
//#endregion

/**
 * This funciton will replace // to /
 */
const crossPlatformPath = (
  pathStringOrPathParts: string | string[],
): string => {
  if (Array.isArray(pathStringOrPathParts)) {
    pathStringOrPathParts = pathStringOrPathParts.join('/');
  }

  if (typeof pathStringOrPathParts !== 'string') {
    return pathStringOrPathParts;
  }

  // debugger;

  if (
    typeof pathStringOrPathParts === 'string' &&
    /^[A-Z]\:/.test(pathStringOrPathParts)
  ) {
    pathStringOrPathParts = _.lowerFirst(pathStringOrPathParts);
  }

  const isExtendedLengthPath = /^\\\\\?\\/.test(pathStringOrPathParts);
  const hasNonAscii = /[^\u0000-\u0080]+/.test(pathStringOrPathParts); // eslint-disable-line no-control-regex
  if (isExtendedLengthPath) {
    console.warn(`[taon-core][crossPlatformPath]: Path starts with \\\\,
    this is not supported in crossPlatformPath`);
    //#region @backend
    if (global.hideLog === false) {
      console.trace(`path: "${pathStringOrPathParts}"`);
    }
    //#endregion
  }

  if (hasNonAscii) {
    const allNonAscii = pathStringOrPathParts.match(/[^\u0000-\u0080]+/g) || '';
    Helpers.logWarn(
      `[taon-core][crossPlatformPath]: path below contains non-ascii characters (${allNonAscii}):
"${pathStringOrPathParts}"`,
    );
    Helpers.logWarn(pathStringOrPathParts);
  }

  pathStringOrPathParts = (pathStringOrPathParts || '')
    .replace(/\\/g, '/')
    .replace(/\/\//g, '/')
    .replace(/\/\//g, '/'); // TODO probably not needed

  let isWindows = false;
  //#region @backend
  if (process.platform === 'win32') {
    isWindows = true;
  }
  //#endregion

  const regexWinPath1 = /^(\/)[a-zA-Z]\:/;
  // handle supported gitbash path
  // (nodejs require need to use /c/ instead of c:/)
  if (isWindows && regexWinPath1.test(pathStringOrPathParts)) {
    pathStringOrPathParts = pathStringOrPathParts.slice(1);
  }

  // let isUnixLike = !isWindows;

  // const regexWinPath2 = /^(\\)[a-zA-Z]\:/;
  // if (isUnixLike && regexWinPath2.test(pathStringOrPathParts)) {
  //   console.warn(
  //     `[taon-core][crossPlatformPath]: Path starts with \\ and not from /`,
  //   );
  //   console.trace(`path: "${pathStringOrPathParts}"`);
  // }

  return pathStringOrPathParts;
};
//#endregion

//#region exports
export {
  q,
  dateformat,
  crossPlatformPath,
  win32Path,
  path,
  chalk,
  json5,
  $,
  glob,
  fse,
  os,
  child_process,
  http,
  https,
  isElevated,
  fkill,
  psList,
  spawn,
  fg,
  chokidar,
  mkdirp,
  ncp,
  rimraf,
  net,
  ps,
};

//#endregion
