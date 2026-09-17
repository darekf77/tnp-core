import { path } from './core-imports';
import { Helpers } from './helpers';
import { _ } from './lodash.namespace';

/**
 * This funciton will replace // to /
 */
export const crossPlatformPath = (
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
  const hasNonAscii = /[^\u0000-\u0080]+/.test(pathStringOrPathParts);
  if (isExtendedLengthPath) {
    Helpers.warn(`[taon-core][crossPlatformPath]: Path starts with \\\\,
    this is not supported in crossPlatformPath`);
    //#region @backend
    if (global.hideLog === false) {
      Helpers.warn(`path: "${pathStringOrPathParts}"`, true);
    }
    //#endregion
  }

  if (hasNonAscii) {
    const allNonAscii = pathStringOrPathParts.match(/[^\u0000-\u0080]+/g) || '';
    Helpers.warn(
      `[taon-core][crossPlatformPath]: path below contains non-ascii characters (${allNonAscii}):
"${pathStringOrPathParts}"`,
    );
    Helpers.warn(pathStringOrPathParts);
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

export const win32Path = (p: string): string => {
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
