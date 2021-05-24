import * as _ from 'lodash';

//#region @backend
import * as path from 'path';
import * as os from 'os';
import * as child_process from 'child_process';
import * as http from 'http';
import * as https from 'https';
import * as net from 'net';

import * as glob from 'glob';
import * as fse from 'fs-extra';
import * as rimraf from 'rimraf';
import * as chokidar from 'chokidar';
import * as mkdirp from 'mkdirp';
import * as json5 from 'json5';
import * as ncp from 'copy-paste';
import isElevated from 'is-elevated';
import * as ps from 'ps-node';
import * as  psList from 'ps-list';
import * as fkill from 'fkill';
import * as portfinder from 'portfinder';
import * as q from 'q';


function crossPlatformPath(p: string) {
  if(typeof p !== 'string') {
    return p;
  }

  const isExtendedLengthPath = /^\\\\\?\\/.test(p);
  const hasNonAscii = /[^\u0000-\u0080]+/.test(p); // eslint-disable-line no-control-regex

  if (isExtendedLengthPath || hasNonAscii) {
    return p;
  }

  return p.replace(/\\/g, '/');

  // if (process.platform === 'win32') {
  //   return p.replace(/\\/g, '/');
  // }
  // return p;
}

/*
function apppyFor(arr: any[], obj: any) {
  for (let index = 0; index < arr.length; index++) {
    const fnName = arr[index];
    const orgFn = obj[fnName];
    obj[fnName] = (...args) => {
      return crossPlatformPath((orgFn as Function).call(null, ...args));
    };
  }
}

apppyFor([
  'realpathSync',
], fse);

apppyFor([
  'join',
  'resolve',
  'dirname',
  'extname',
  'isAbsolute',
  'normalize',
  'parse',
  'format'
], path);
*/

//#endregion


export {
  _,
  q,
  //#region @backend
  glob,
  isElevated,
  chokidar,
  mkdirp,
  ncp,
  json5,
  path,
  fse,
  crossPlatformPath,
  os,
  child_process,
  http, https,
  rimraf,
  net,
  ps,
  fkill,
  portfinder,
  psList,
  //#endregion
};

/*
import {
  _,
  path,
  fse,
  rimraf,
  crossPlatformPath,
  os,
  child_process,
  http, https,
  rimraf,
  net,
} from 'tnp-core';

import { _ } from 'tnp-core';

import {  } from 'tnp-core';

*/

