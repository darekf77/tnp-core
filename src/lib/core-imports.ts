//#region imports
let forceTrace = false;
//#region @backend
import * as cheerio from 'cheerio';
import * as pathBase from 'path';
import * as os from 'os';
import * as child_process from 'child_process';
import * as http from 'http';
import * as https from 'https';
import * as net from 'net';
import chalkBase from 'chalk';
import * as spawn from 'cross-spawn';
import * as glob from 'glob';
import * as fg from 'fast-glob';
import { minimatch } from 'minimatch';
import * as fse from 'fs-extra';
import * as rimraf from 'rimraf';
import * as chokidar from 'chokidar';
import * as mkdirp from 'mkdirp';
import * as ncp from 'copy-paste';
import * as ps from 'ps-node';
import * as psList from 'ps-list';
import * as fkill from 'fkill';
const isRoot = require('is-root');
const isAdmin = require('is-admin');
forceTrace = global.hideLog === false;

//#endregion
//#region @browser
import jQuery from 'jquery';
import { chalk as chalkMock } from './node-chalk-mock';
import { path as pathMock } from './node-path-mock';
//#endregion
import * as _ from 'lodash';
import * as q from 'q';
import * as moment from 'moment';
import * as dateformat from 'dateformat';
import { Chalk } from 'chalk';
import * as json5 from 'json5';
import type jQueryType from 'jquery';
import type chalkBaseType from 'chalk';
import type * as pathBaseType from 'path';
//#endregion
import { Helpers } from './index';

//#region set up browser mocks

//#region mock jquery
let $: jQueryType;
//#region @browser
$ = jQuery;
//#endregion
//#region @backend
$ = cheerio;
//#endregion
//#endregion

//#region mock path

let path = void 0 as typeof pathBaseType;
// #region @backend
path = pathBase;
//#endregion

//#region @browser
// @ts-ignore
path = pathMock;
//#endregion
//#endregion

//#region mock chalk

let chalk: Chalk = void 0 as typeof chalkBaseType;
// #region @backend
chalk = chalkBase as any;
//#endregion

//#region @browser
// @ts-ignore
chalk = chalkMock;
//#endregion
//#endregion

//#endregion

//#region is elevated
//#region @backend
async function isElevated(): Promise<boolean> {
  return process.platform === 'win32' ? isAdmin() : isRoot();
}
//#endregion
//#endregion

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
  return path.win32.normalize(p);
};
//#endregion

//#region crossPlatformPath
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
    if (forceTrace) {
      console.trace(`path: "${pathStringOrPathParts}"`);
    }
  }

  if (hasNonAscii) {
    const allNonAscii = pathStringOrPathParts.match(/[^\u0000-\u0080]+/g) || '';
    Helpers.logWarn(
      `[taon-core][crossPlatformPath]: Path contains non-ascii characters: ${allNonAscii}`,
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
  _,
  q,
  moment,
  dateformat,
  crossPlatformPath,
  win32Path,
  path,
  chalk,
  json5,
  $,
};

//#region @backend
export {
  spawn,
  glob,
  minimatch,
  fg,
  isElevated,
  chokidar,
  mkdirp,
  ncp,
  fse,
  os,
  child_process,
  http,
  https,
  rimraf,
  net,
  ps,
  fkill,
  psList,
};
//#endregion
//#endregion
