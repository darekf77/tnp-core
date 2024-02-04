import * as _ from 'lodash';
import * as q from 'q';
import * as moment from 'moment';
import * as dateformat from 'dateformat';
import { Chalk } from 'chalk';
import * as json5 from 'json5';
//#region @browser
import jQuery from 'jquery';
//#endregion

//#region @backend
// @ts-ignore
import createCallsiteRecord from 'callsite-record';
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
import * as fse from 'fs-extra';
import * as rimraf from 'rimraf';
import * as chokidar from 'chokidar';
import * as mkdirp from 'mkdirp';
import * as ncp from 'copy-paste';
import * as ps from 'ps-node';
import * as  psList from 'ps-list';
import * as fkill from 'fkill';
import * as portfinder from 'portfinder';
const isRoot = require('is-root');
const isAdmin = require('is-admin');

async function isElevated() {
  return (process.platform === 'win32' ? isAdmin() : isRoot())
};

//#endregion

let $;
//#region @browser
$ = jQuery
//#endregion
//#region @backend
$ = cheerio;
//#endregion

//#region mock path
//#region @browser
import { path as pathMock } from './node-path-mock';
//#endregion

let path
  // #region @backend
  = pathBase;
//#endregion

//#region @browser
// @ts-ignore
path = pathMock;
//#endregion
//#endregion

//#region mock chalk
//#region @browser
import { chalk as chalkMock } from './node-chalk-mock';
//#endregion
let chalk: Chalk
  // #region @backend
  = chalkBase as any;
//#endregion

//#region @browser
// @ts-ignore
chalk = chalkMock;
//#endregion
//#endregion


function win32Path(p: string) {
  //#region @backend
  if (process.platform !== 'win32') {
    return p;
  }
  //#endregion
  if (/^\/[a-z]\//.test(p)) {
    p = p.replace(/^\/[a-z]\//, `${p.charAt(1).toUpperCase()}:/`);
  }
  return path.win32.normalize(p);
}

/**
 * This funciton will replace // to /
 */
const crossPlatformPath = (pathStringOrPathParts: string | string[]) => {
  if (Array.isArray(pathStringOrPathParts)) {
    pathStringOrPathParts = pathStringOrPathParts.join('/')
  }
  //#region @backend
  if (process.platform === 'win32') {
    if (pathStringOrPathParts && /^[A-Z]\:/.test(pathStringOrPathParts)) {
      pathStringOrPathParts = _.lowerFirst(pathStringOrPathParts);
    }
  } else {
    return pathStringOrPathParts?.replace(/\/\//g, '/');
  }
  //#endregion
  if (typeof pathStringOrPathParts !== 'string') {
    return pathStringOrPathParts;
  }

  const isExtendedLengthPath = /^\\\\\?\\/.test(pathStringOrPathParts);
  const hasNonAscii = /[^\u0000-\u0080]+/.test(pathStringOrPathParts); // eslint-disable-line no-control-regex

  if (isExtendedLengthPath || hasNonAscii) {
    return pathStringOrPathParts?.replace(/\/\//g, '/');
  }

  return pathStringOrPathParts.replace(/\\/g, '/').replace(/\/\//g, '/');
}



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
  $
}

//#region @backend
export {
  createCallsiteRecord,
  spawn,
  glob,
  isElevated,
  chokidar,
  mkdirp,
  ncp,
  fse,
  os,
  child_process,
  http, https,
  rimraf,
  net,
  ps,
  fkill,
  portfinder,
  psList,
};
 //#endregion
