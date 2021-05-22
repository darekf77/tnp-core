import * as _ from 'lodash';

//#region @backend
import * as path from 'path';
import * as fse from 'fs-extra';
import * as rimraf from 'rimraf';
import * as os from 'os';
import * as child_process from 'child_process';
import * as http from 'http';
import * as https from 'https';
import * as net from 'net';

function crossPlatformPath(p: string) {

  // const isExtendedLengthPath = /^\\\\\?\\/.test(p);
  // const hasNonAscii = /[^\u0000-\u0080]+/.test(p); // eslint-disable-line no-control-regex

  // if (isExtendedLengthPath || hasNonAscii) {
  //   return p;
  // }

  // return path.replace(/\\/g, '/');

  if (process.platform === 'win32') {
    return p.replace(/\\/g, '/');
  }
  return p;
}

//#endregion


export {
  _,
  //#region @backend
  path,
  fse,
  crossPlatformPath,
  os,
  child_process,
  http, https,
  rimraf,
  net,
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

