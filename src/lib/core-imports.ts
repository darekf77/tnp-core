import * as _ from 'lodash';
import * as q from 'q';
import * as moment from 'moment';

//#region @backend
import * as pathBase from 'path';
import * as os from 'os';
import * as child_process from 'child_process';
import * as http from 'http';
import * as https from 'https';
import * as net from 'net';
import chalk from 'chalk';
import * as dateformat from 'dateformat';
import * as spawn from 'cross-spawn';
import * as glob from 'glob';
import * as fse from 'fs-extra';
import * as rimraf from 'rimraf';
import * as chokidar from 'chokidar';
import * as mkdirp from 'mkdirp';
import * as json5 from 'json5';
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

let path
  // #region @backend
  = pathBase;
//#endregion

//#region @websqlOnly
// @ts-ignore
path = {
  join(...args) {
    return args.join('/')
  }, // @ts-ignore
  win32: { // @ts-ignore
    normalize: (p) => {
      return p;
     }
  }
}
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

function crossPlatformPath(p: string) {
  //#region @backend
  if (process.platform !== 'win32') {
    return p;
  }
  //#endregion
  if (typeof p !== 'string') {
    return p;
  }

  const isExtendedLengthPath = /^\\\\\?\\/.test(p);
  const hasNonAscii = /[^\u0000-\u0080]+/.test(p); // eslint-disable-line no-control-regex

  if (isExtendedLengthPath || hasNonAscii) {
    return p;
  }

  return p.replace(/\\/g, '/');
}



export {
  _,
  q,
  moment,
  crossPlatformPath,
  win32Path,
}

//#region @websql
export {
  path
}
//#endregion

//#region @backend
export {

  dateformat,
  spawn,
  chalk,
  glob,
  isElevated,
  chokidar,
  mkdirp,
  ncp,
  json5,
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
