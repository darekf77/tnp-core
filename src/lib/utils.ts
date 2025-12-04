//#region imports
import { Blob } from 'buffer'; // @backend
import { ChildProcess, ExecSyncOptions } from 'child_process';
import * as crypto from 'crypto'; // @backend
import type { WriteStream } from 'fs';
import * as net from 'net';
import { URL } from 'url'; // @backend
import { promisify } from 'util';

import axios, { AxiosResponse } from 'axios';
import { Subject } from 'rxjs';

import {
  path,
  _,
  crossPlatformPath,
  os,
  chalk,
  win32Path,
  isElevated,
  https,
} from './core-imports';
import { dateformat } from './core-imports';
import { spawn, child_process } from './core-imports';
import { fse } from './core-imports';
import { CoreModels } from './core-models';

import { config, frameworkName, Helpers } from './index';

//#endregion

const BLOB_SUPPORTED_IN_SQLJS = false;

//#region utils
export namespace Utils {
  //#region wait
  export const wait = (second: number): Promise<void> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve(void 0);
      }, second * 1000);
    });
  };
  //#endregion

  //#region wait miliseconds
  export const waitMilliseconds = (milliseconds: number): Promise<void> => {
    // Helpers.taskStarted(`Waiting ${milliseconds} milliseconds...`);
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // Helpers.taskDone(`Done waiting ${milliseconds} milliseconds`);
        resolve(void 0);
      }, milliseconds);
    });
  };
  //#endregion

  //#region utils / uniq array
  export const uniqArray = <T = any>(
    array: any[],
    uniqueProperty?: keyof T,
  ) => {
    var seen = {};
    return array
      .filter(f => !!f)
      .filter(function (item) {
        return seen.hasOwnProperty(uniqueProperty ? item[uniqueProperty] : item)
          ? false
          : (seen[uniqueProperty ? item[uniqueProperty] : item] = true);
      }) as T[];
  };
  //#endregion

  //#region utils / recursive sort keys in object
  /**
   * @param anyObject
   * @returns object with sorted keys
   */
  export const sortKeys = (anyObject: any): any => {
    if (_.isArray(anyObject)) {
      return anyObject.map(sortKeys);
    }
    if (_.isObject(anyObject)) {
      return _.fromPairs(
        _.keys(anyObject)
          .sort()
          .map(key => [key, sortKeys(anyObject[key])]),
      );
    }
    return anyObject;
  };
  //#endregion

  //#region utils / escape string for reg exp
  /**
   * Example:
   * new RegExp(escapeStringForRegEx('a.b.c'),'g') => /a\.b\.c/g
   */
  export const escapeStringForRegEx = (
    stringForRegExp: string,
    options?: {
      skipEscapeSlashAndDash?: boolean;
    },
  ) => {
    options = options || ({} as any);

    if (options?.skipEscapeSlashAndDash) {
      return stringForRegExp.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    return stringForRegExp.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  };
  //#endregion

  //#region utils / remove chalk special chars
  export function removeChalkSpecialChars(str: string): string {
    // Regex to match ANSI escape sequences used by Chalk
    const ansiRegex = /\u001b\[[0-9;]*m/g;

    // Replace all ANSI escape sequences with an empty string
    return str.replace(ansiRegex, '');
  }
  //#endregion

  //#region utils / full date time
  export const fullDateTime = () => {
    //#region @backendFunc
    return dateformat(new Date(), 'dd-mm-yyyy HH:MM:ss');
    //#endregion
  };
  //#endregion

  //#region utils / full date
  export const fullDate = () => {
    //#region @backendFunc
    return dateformat(new Date(), 'dd-mm-yyyy');
    //#endregion
  };
  //#endregion

  //#region utils / get free port
  const takenPorts = [];
  export const getFreePort = async (options?: {
    startFrom?: number;
  }): Promise<number> => {
    //#region @backendFunc
    options = options || ({} as any);
    options.startFrom = options.startFrom || 3000;
    let startFrom = options.startFrom;
    const max = 5000;
    let i = 0;

    while (true) {
      try {
        if (await UtilsOs.isPortInUse(startFrom)) {
          startFrom += 1;
          continue;
        }
        const port = startFrom;
        takenPorts.push(port);
        return port;
      } catch (err) {
        console.log(err);
        Helpers.warn(
          `Trying to assign port  :${startFrom} but already in use.`,
          false,
        );
      }
      startFrom += 1;
      if (i++ === max) {
        Helpers.error(
          `[taon-core]] failed to assign free port after ${max} trys...`,
        );
      }
    }
    //#endregion
  };
  //#endregion

  //#region utils / required uncached
  /**
   * Traverses the cache to search for all the cached
   * files of the specified module name
   */
  const searchCache = (moduleName, callback) => {
    //#region @backendFunc
    // Resolve the module identified by the specified name
    var mod = require.resolve(moduleName) as any;

    // Check if the module has been resolved and found within
    // the cache
    if (mod && (mod = require.cache[mod]) !== undefined) {
      // Recursively go over the results
      (function traverse(mod) {
        // Go over each of the module's children and
        // traverse them
        mod['children'].forEach(function (child) {
          traverse(child);
        });

        // Call the specified callback providing the
        // found cached module
        callback(mod);
      })(mod);
    }
    //#endregion
  };

  /**
   * Removes a module from the cache
   */
  const purgeCache = moduleName => {
    //#region @backendFunc
    // Traverse the cache looking for the files
    // loaded by the specified module name
    searchCache(moduleName, function (mod) {
      delete require.cache[mod.id];
    });

    // Remove cached paths to the module.
    // Thanks to @bentael for pointing this out.
    Object.keys(module.constructor['_pathCache']).forEach(function (cacheKey) {
      if (cacheKey.indexOf(moduleName) > 0) {
        delete module.constructor['_pathCache'][cacheKey];
      }
    });
    //#endregion
  };

  export const requireUncached = (module: string) => {
    //#region @backendFunc
    const result = _.cloneDeep(require(module));
    purgeCache(module);
    return result;
    //#endregion
  };

  //#endregion

  //#region utils / camelize
  /**
   * similar to camelCase but remove
   * all non word / repeated characters
   */
  export const camelize = (str: string = '') => {
    str = str.replace(/\W/g, '').toLowerCase();
    return str
      .replace(/(?:^\w|[A-Z]|\b\w)/g, function (word, index) {
        return index == 0 ? word.toLowerCase() : word.toUpperCase();
      })
      .replace(/\s+/g, '');
  };
  //#endregion

  //#region binary

  //#region db binary format type
  export enum DbBinaryFormatEnum {
    Blob = 'Blob',
    File = 'File',
    string = 'string',
    //#region @backend
    Buffer = 'Buffer',
    //#endregion
  }

  export type DbBinaryFormatForBrowser = Blob | File | string;
  //#region @backend
  export type DbBinaryFormatForBackend = Buffer;
  //#endregion

  /**
   * Binary format that can be stored in database
   *
   * for nodejs => Buffer
   * for sql.js => string (shoulb be blob - but not supported)
   *
   */
  export type DbBinaryFormat =
    | DbBinaryFormatForBrowser
    //#region @backend
    | DbBinaryFormatForBackend;
  //#endregion
  //#endregion
  export namespace binary {
    //#region binay utils / array buffer to blob
    //#region @browser
    /**
     * This is for BROWSER ONLY
     *
     * @param buffer
     * @param contentType
     * @returns
     */
    export async function arrayBufferToBlob(
      buffer: ArrayBuffer,
      contentType: CoreModels.ContentType,
    ): Promise<Blob> {
      // @ts-ignore
      return new Blob([buffer], { type: contentType });
    }
    //#endregion
    //#endregion

    //#region binay utils / blob to array buffer
    /**
     * This is for BROWSER ONLY
     * @param blob
     * @returns
     */
    export async function blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
      return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.addEventListener('loadend', () => {
          resolve(reader.result as any);
        });
        reader.addEventListener('error', reject); // @ts-ignore
        reader.readAsArrayBuffer(blob);
      });
    }
    //#endregion

    //#region binay utils / blob to base64 string
    /**
     * it is revers to base64toBlob
     * @param blob
     * @returns
     */
    export function blobToBase64(blob: Blob): Promise<string> {
      return new Promise<any>((resolve, _) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result); // @ts-ignore
        reader.readAsDataURL(blob);
      });
    }
    //#endregion

    //#region binay utils / base64 string to blob
    /**
     * it is revers to blobToBase64()
     * @param base64Data
     * @returns
     */
    export async function base64toBlob(
      base64Data: string,
      contentTypeOverride?: CoreModels.ContentType,
    ): Promise<Blob> {
      let content_type: CoreModels.ContentType = void 0 as any;
      let file_base64: string = void 0 as any;
      if (!contentTypeOverride) {
        const m = /^data:(.+?);base64,(.+)$/.exec(base64Data);
        if (!m) {
          throw new Error(
            `[taon-framework][base64toBlob] Not a base64 blob [${base64Data}]`,
          );
        }
        // tslint:disable-next-line:prefer-const
        var [__, contenttype, filebase64] = m;
        content_type = contenttype as any;
        file_base64 = filebase64;
      }
      content_type = (
        contentTypeOverride ? contentTypeOverride : content_type || ''
      ) as any;
      base64Data = contentTypeOverride ? base64Data : file_base64;
      const sliceSize = 1024;
      const byteCharacters = atob(base64Data);
      const bytesLength = byteCharacters.length;
      const slicesCount = Math.ceil(bytesLength / sliceSize);
      const byteArrays = new Array(slicesCount);

      for (let sliceIndex = 0; sliceIndex < slicesCount; ++sliceIndex) {
        const begin = sliceIndex * sliceSize;
        const end = Math.min(begin + sliceSize, bytesLength);

        const bytes = new Array(end - begin);
        // tslint:disable-next-line:one-variable-per-declaration
        for (let offset = begin, i = 0; offset < end; ++i, ++offset) {
          bytes[i] = byteCharacters[offset].charCodeAt(0);
        }
        byteArrays[sliceIndex] = new Uint8Array(bytes);
      }
      return new Blob(byteArrays, { type: content_type });
    }
    //#endregion

    //#region binay utils / base64 string to db binary format

    export async function base64toDbBinaryFormat(
      text: string,
    ): Promise<DbBinaryFormat> {
      let result: DbBinaryFormat;
      //#region @browser
      result = await (async () => {
        if (BLOB_SUPPORTED_IN_SQLJS) {
          const blob = await base64toBlob(text);
          return blob;
        }
        return text as any;
      })();
      //#endregion
      //#region @backend
      result = await (async () => {
        const buffer = await base64toBuffer(text);
        return buffer;
      })();
      //#endregion
      return result;
    }
    //#endregion

    //#region binay utils / db binary format to base64 string
    export async function dbBinaryFormatToBase64(
      binaryFormat: DbBinaryFormat,
    ): Promise<string> {
      let result: string;
      //#region @browser
      result = await (async () => {
        if (BLOB_SUPPORTED_IN_SQLJS) {
          const text = await blobToBase64(binaryFormat as any);
          return text;
        }
        return binaryFormat as any;
      })();
      //#endregion

      //#region @backend
      result = await (async () => {
        const text = await bufferToBase64(binaryFormat as any);
        return text;
      })();
      //#endregion
      return result;
    }
    //#endregion

    //#region binay utils / base64 string to db binary format

    export async function textToDbBinaryFormat(
      text: string,
    ): Promise<DbBinaryFormat> {
      let result: DbBinaryFormat;
      //#region @browser
      result = await (async () => {
        if (BLOB_SUPPORTED_IN_SQLJS) {
          const blob = await textToBlob(text);
          return blob;
        }
        return text as any;
      })();
      //#endregion
      //#region @backend
      result = await (async () => {
        const buffer = await textToBuffer(text);
        return buffer;
      })();
      //#endregion
      return result;
    }
    //#endregion

    //#region binay utils / db binary format to base64 string
    export async function dbBinaryFormatToText(
      binaryFormat: DbBinaryFormat,
    ): Promise<string> {
      let result: string;
      //#region @browser
      result = await (async () => {
        if (BLOB_SUPPORTED_IN_SQLJS) {
          const text = await blobToText(binaryFormat as any);
          return text;
        }
        return binaryFormat as any;
      })();
      //#endregion

      //#region @backend
      result = await (async () => {
        const text = await bufferToText(binaryFormat as any);
        return text;
      })();
      //#endregion
      return result;
    }
    //#endregion

    //#region binay utils / base64 string to nodejs buffer
    //#region @backend
    export async function base64toBuffer(
      base64Data: string,
      contentTypeOverride?: CoreModels.ContentType,
    ): Promise<Buffer> {
      const blob = await base64toBlob(base64Data, contentTypeOverride);
      const buffer = await blobToBuffer(blob);
      return buffer;
    }
    //#endregion
    //#endregion

    //#region binay utils / nodejs buffer to base64 string
    //#region @backend
    export async function bufferToBase64(bufferData: Buffer): Promise<string> {
      const blob = await bufferToBlob(bufferData);
      const text = await blobToBase64(blob);
      return text;
    }
    //#endregion
    //#endregion

    //#region binay utils / file to blob
    export async function fileToBlob(file: File) {
      return new Blob([new Uint8Array(await file.arrayBuffer())], {
        type: file.type,
      });
    }
    //#endregion

    //#region binay utils / blob to file
    export async function blobToFile(
      blob: Blob,
      nameForFile: string = 'my-file-name',
    ): Promise<File> {
      if (!nameForFile) {
        nameForFile = 'nonamefile' + new Date().getTime();
      }
      // @ts-ignore
      return new File([blob], nameForFile);
    }
    //#endregion

    //#region binay utils / nodejs blob to nodejs buffer
    //#region @backend
    export async function blobToBuffer(blob: Blob): Promise<Buffer> {
      const arrayBuffer = await blob.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      return buffer;
    }
    //#endregion
    //#endregion

    //#region binay utils / nodejs buffer to nodejs blob
    //#region @backend
    export async function bufferToBlob(buffer: Buffer): Promise<Blob> {
      const blob = new Blob([buffer]); // JavaScript Blob
      return blob;
    }
    //#endregion
    //#endregion

    //#region binay utils / text to nodejs buffer
    //#region @backend
    export async function textToBuffer(
      text: string,
      type: CoreModels.ContentType = 'text/plain',
    ): Promise<Buffer> {
      const blob = await textToBlob(text, type);
      const buffer = await blobToBuffer(blob);
      return buffer;
    }
    //#endregion
    //#endregion

    //#region binay utils / nodejs buffer to text
    //#region @backend
    export async function bufferToText(buffer: Buffer): Promise<string> {
      const blob = await bufferToBlob(buffer);
      const text = await blobToText(blob);
      return text;
    }
    //#endregion
    //#endregion

    //#region binay utils / text to blob
    export async function textToBlob(
      text: string,
      type: CoreModels.ContentType = 'text/plain',
    ): Promise<Blob> {
      const blob = new Blob([text], { type });
      return blob;
    }
    //#endregion

    //#region binay utils / blob to text
    export async function blobToText(blob: Blob): Promise<string> {
      return await blob.text();
    }
    //#endregion

    //#region binay utils / text to file
    export async function textToFile(
      text: string,
      fileRelativePathOrName: string,
    ): Promise<File> {
      // console.log({ path })
      const ext = path.extname(fileRelativePathOrName);

      const type = CoreModels.mimeTypes[ext];
      const blob = new Blob([text], { type });
      const file = await blobToFile(blob, fileRelativePathOrName);
      // console.log({
      //   ext,
      //   blob, file
      // });
      // debugger
      return file;
    }
    //#endregion

    //#region binay utils / file to text
    export async function fileToText(file: File): Promise<string> {
      return await file.text();
    }
    //#endregion

    //#region binay utils / json to blob
    export async function jsonToBlob(jsonObj: object): Promise<Blob> {
      const blob = new Blob([JSON.stringify(jsonObj, null, 2)], {
        type: 'application/json',
      });
      return blob;
    }
    //#endregion

    //#region binay utils / blob to json
    /**
     * TODO NOT TESTED
     */
    export async function blobToJson(blob: Blob): Promise<string> {
      return JSON.parse(await blob.text());
    }
    //#endregion

    //#region binay utils / get blob from url
    export async function getBlobFrom(url: string): Promise<Blob> {
      const response: AxiosResponse<Blob> = await axios({
        url,
        method: 'get',
        responseType: 'blob',
      });
      return response.data;
    }
    //#endregion
  }
  //#endregion

  //#region css
  export namespace css {
    //#region css utils / numeric value of pixels
    /**
     *
     * @param pixelsCss pixels ex. 100px
     * @returns
     */
    export function numValue(pixelsCss: string | number): number {
      // tslint:disable-next-line:radix
      return parseInt(
        pixelsCss?.toString()?.replace('px', ''),
        // .replace('pt', '') TOOD handle other types
        // .replace('1rem', '') // to
      );
    }
    //#endregion
  }
  //#endregion
}
//#endregion

export namespace UtilsStringRegex {
  export const containsNonAscii = (pathStringOrPathParts: string): boolean => {
    const hasNonAscii = /[^\u0000-\u0080]+/.test(pathStringOrPathParts); // eslint-disable-line no-control-regex
    return hasNonAscii;
  };
}

//#region utils process
export namespace UtilsProcess {
  //#region utils process / process start options
  interface ResolvePromiseMsg {
    /**
     * until this string is in output of stdout
     */
    stdout?: string | string[];
    /**
     * until this string is in output of stderr
     */
    stderr?: string | string[];
    /**
     * by default only resolve when exit code is 0
     */
    resolveAfterAnyExitCode?: boolean;
  }

  export interface ProcessStartOptions {
    /**
     * by default is process.cwd();
     */
    cwd?: string;
    /**
     * by default is false
     */
    showCommand?: boolean;
    /**
     * Modify output line by line
     */
    outputLineReplace?: (outputLineStderOrStdout: string) => string;
    resolvePromiseMsg?: ResolvePromiseMsg;
    /**
     * Prefix messages output from child_process
     */
    prefix?: string;
    /**
     * Try command again after fail after n milliseconds
     */
    tryAgainWhenFailAfter?: number;
    askToTryAgainOnError?: boolean;
    exitOnErrorCallback?: (code: number) => void;
    /**
     * Use big buffer for big webpack logs
     * (it may slow down smaller processes execution)
     */
    biggerBuffer?: boolean;
    hideOutput?: {
      stdout?: boolean;
      stderr?: boolean;
    };
  }
  //#endregion

  //#region utils process  / TODO start async
  /**
   * TODO IMPLEMENT
   * start async node process
   */
  export const startAsync = async (
    command: string,
    cwd: string,
    // options?: ProcessStartOptions, // TODO change to this
    options?: Omit<CoreModels.ExecuteOptions, 'tryAgainWhenFailAfter'>,
  ): Promise<void> => {
    //#region @backendFunc

    //#region preapre options
    let {
      hideOutput,
      resolvePromiseMsg,
      outputLineReplace,
      prefix,
      extractFromLine,
      exitOnErrorCallback,
      askToTryAgainOnError,
      resolvePromiseMsgCallback,
      similarProcessKey,
      onChildProcessChange,
      outputBuffer,
      outputBufferMaxSize,
    } = options || {};

    outputBufferMaxSize = outputBufferMaxSize || 1000;

    command = Helpers._fixCommand(command);
    const {
      stderr: stderResolvePromiseMsgCallback,
      stdout: stdoutResolvePromiseMsgCallback,
      exitCode: exitCodeResolvePromiseMsgCallback,
    } = resolvePromiseMsgCallback || {};

    let childProcess: ChildProcess;
    // let {
    //   stderMsgForPromiseResolve,
    //   stdoutMsgForPromiseResolve
    // } = resolvePromiseMsg || {};

    // processes.push(proc);
    if (!resolvePromiseMsg) {
      resolvePromiseMsg = {};
    }
    if (!hideOutput) {
      hideOutput = {};
    }

    let isResolved = false;

    if (_.isString(resolvePromiseMsg.stdout)) {
      resolvePromiseMsg.stdout = [resolvePromiseMsg.stdout];
    }
    if (_.isString(resolvePromiseMsg.stderr)) {
      resolvePromiseMsg.stderr = [resolvePromiseMsg.stderr];
    }

    //#endregion

    const handlProc = (proc: ChildProcess) => {
      return new Promise((resolve, reject) => {
        // console.log(
        //   `[execute] Process started...`,
        //   (resolvePromiseMsg.stdout as string[]).map(c => `"${c}"`).join(','),
        // );

        //#region handle stdout data
        proc.stdout.on('data', rawData => {
          let data = rawData?.toString() || '';

          data = Helpers.modifyLineByLine(
            data, // @ts-ignore
            outputLineReplace,
            prefix,
            extractFromLine,
          );

          if (!_.isUndefined(outputBuffer)) {
            outputBuffer.push(data);
            if (outputBuffer.length > outputBufferMaxSize) {
              outputBuffer.shift();
            }
          }

          if (!hideOutput.stdout) {
            process.stdout.write(data);
          }

          if (_.isArray(resolvePromiseMsg.stdout)) {
            for (
              let index = 0;
              index < resolvePromiseMsg.stdout.length;
              index++
            ) {
              // console.log(`DATA STDOUT: ${chalk.gray(data)}`);

              const resolveCompilationMessage = resolvePromiseMsg.stdout[index];
              if (data.search(resolveCompilationMessage) !== -1) {
                // Helpers.info(`[unitlOutputContains] AAA...`);
                stdoutResolvePromiseMsgCallback &&
                  stdoutResolvePromiseMsgCallback();
                if (!isResolved) {
                  isResolved = true;
                  resolve(void 0);
                }
                break;
              }
            }
          }

          // TODO NOT NEEDED
          if (_.isArray(resolvePromiseMsg.stderr)) {
            for (
              let index = 0;
              index < resolvePromiseMsg.stderr.length;
              index++
            ) {
              const rejectm = resolvePromiseMsg.stderr[index];
              if (data.search(rejectm) !== -1) {
                // Helpers.info(`[unitlOutputContains] Rejected move to next step...`);
                stdoutResolvePromiseMsgCallback &&
                  stdoutResolvePromiseMsgCallback();
                if (!isResolved) {
                  isResolved = true;
                  reject();
                  proc.kill('SIGINT');
                }
                break;
              }
            }
          }
        });
        //#endregion

        //#region handle exit process
        proc.on('exit', async code => {
          // console.log(`Command exit code: ${code}`)
          if (hideOutput.acceptAllExitCodeAsSuccess) {
            exitCodeResolvePromiseMsgCallback &&
              exitCodeResolvePromiseMsgCallback(code);
            resolve(void 0);
          } else {
            if (code !== 0) {
              if (_.isFunction(exitOnErrorCallback)) {
                try {
                  await exitOnErrorCallback(code as any);
                  // await this.runSyncOrAsync({
                  //   functionFn: exitOnErrorCallback,
                  //   arrayOfParams: [code],
                  // });
                  reject(`Command failed with code=${code}`);
                } catch (error) {
                  reject(error);
                }
              } else {
                reject(`Command failed with code=${code}`);
              }
            } else {
              resolve(void 0);
            }
          }
        });
        //#endregion

        //#region handle stdout error
        proc.stdout.on('error', rawData => {
          let data = rawData?.toString() || '';

          data = Helpers.modifyLineByLine(
            data, // @ts-ignore
            outputLineReplace,
            prefix,
            extractFromLine,
          );

          if (!_.isUndefined(outputBuffer)) {
            outputBuffer.push(data);
            if (outputBuffer.length > outputBufferMaxSize) {
              outputBuffer.shift();
            }
          }

          if (!hideOutput.stdout) {
            process.stdout.write(JSON.stringify(data));
          }

          // console.log(data);
        });
        //#endregion

        //#region handle stder data
        proc.stderr.on('data', rawData => {
          let data = rawData?.toString() || '';
          data = Helpers.modifyLineByLine(
            data, // @ts-ignore
            outputLineReplace,
            prefix,
            extractFromLine,
          );

          if (!_.isUndefined(outputBuffer)) {
            outputBuffer.push(data);
            if (outputBuffer.length > outputBufferMaxSize) {
              outputBuffer.shift();
            }
          }

          if (!hideOutput.stderr) {
            process.stderr.write(data);
          }

          if (_.isArray(resolvePromiseMsg.stderr)) {
            // @ts-ignore
            for (
              let index = 0;
              index < resolvePromiseMsg.stderr.length;
              index++
            ) {
              // @ts-ignore
              const rejectm = resolvePromiseMsg.stderr[index];
              if (data.search(rejectm) !== -1) {
                // Helpers.info(`[unitlOutputContains] Rejected move to next step...`);
                stderResolvePromiseMsgCallback &&
                  stderResolvePromiseMsgCallback();
                if (!isResolved) {
                  isResolved = true;
                  reject();
                  proc.kill('SIGINT');
                }
                break;
              }
            }
          }
        });
        //#endregion

        //#region handle stder error
        proc.stderr.on('error', rawData => {
          let data = rawData?.toString() || '';
          data = Helpers.modifyLineByLine(
            data, // @ts-ignore
            outputLineReplace,
            prefix,
            extractFromLine,
          );

          if (!_.isUndefined(outputBuffer)) {
            outputBuffer.push(data);
            if (outputBuffer.length > outputBufferMaxSize) {
              outputBuffer.shift();
            }
          }

          // @ts-ignore
          if (!hideOutput.stderr) {
            process.stderr.write(JSON.stringify(data));
          }
          // console.log(data);
        });
        //#endregion
      });
    };

    while (true) {
      const maxBuffer = options?.biggerBuffer ? Helpers.bigMaxBuffer : void 0;
      let env = { ...process.env, FORCE_COLOR: '1', NODE_ENV: 'development' };
      if (options.env) {
        env = { ...env, ...options.env };
      }
      childProcess = child_process.exec(command, { cwd, env, maxBuffer });
      onChildProcessChange && onChildProcessChange(childProcess);
      try {
        await handlProc(childProcess);
        break;
      } catch (error) {
        Helpers.error(
          `Command failed:

${command}

in location: ${cwd}

        `,
          true,
          true,
        );
        if (askToTryAgainOnError) {
          if (!(await Helpers.questionYesNo(`Try again this command ?`))) {
            throw error;
          }
        } else {
          throw error;
        }
      }
    }
    //#endregion
  };
  //#endregion

  //#region utils process  / TODO start sync
  // /**
  //  * TODO IMPLEMENT
  //  */
  // export function startSync(command: string, options?: ProcessStartOptions) {
  // TODO @LAST
  // }
  //#endregion

  //#region utils process  / start async child process command until
  /**
   * This let you start child process and resolve promise when some
   * condition is met. It is useful for example when you want to start
   * process and wait until some output is in stdout or stderr.
   */
  export const startAsyncChildProcessCommandUntil = async (
    command: string,
    options: {
      /**
       * tels when to resolve promise
       */
      untilOptions: ResolvePromiseMsg;
      displayOutputInParentProcess?: boolean;
      resolveAfterAnyExitCode?: boolean;
      cwd?: string;
    },
  ): Promise<void> => {
    //#region @backendFunc
    options = options || ({} as any);
    const { stdout, stderr, resolveAfterAnyExitCode } =
      options.untilOptions || {};
    options.cwd = crossPlatformPath(options.cwd || process.cwd());

    return new Promise((resolve, reject) => {
      const childProc = child_process.exec(command, {
        cwd: options.cwd,
        maxBuffer: Helpers.bigMaxBuffer,
      });

      const stdoutConditions = Array.isArray(stdout)
        ? stdout
        : stdout
          ? [stdout]
          : [];
      const stderrConditions = Array.isArray(stderr)
        ? stderr
        : stderr
          ? [stderr]
          : [];

      const checkConditions = (output: string, conditions: string[]) => {
        const conditionReady = conditions.some(condition =>
          output.includes(condition),
        );
        // if(conditionReady){
        //   console.log('conditionReady MOVE ON', conditionReady);
        // }
        return conditionReady;
      };

      childProc.stdout?.on('data', data => {
        if (options.displayOutputInParentProcess) {
          process.stdout?.write(data);
        }

        if (checkConditions(data, stdoutConditions)) {
          resolve();
        }
      });

      childProc.stderr?.on('data', data => {
        if (options.displayOutputInParentProcess) {
          process.stderr?.write(data);
        }

        if (checkConditions(data, stderrConditions)) {
          resolve();
        }
      });

      childProc.on('close', exitCode => {
        if (resolveAfterAnyExitCode || exitCode === 0) {
          resolve();
        } else {
          reject(new Error(`Process exited with code ${exitCode}`));
        }
      });

      childProc.on('error', error => {
        reject(error);
      });
    });
    //#endregion
  };
  //#endregion

  //#region utils process  / get git bash path
  export const getGitBashPath = () => {
    //#region @backendFunc
    if (process.platform !== 'win32') {
      return null;
    }
    try {
      // Execute the 'where' command to find bash.exe
      const gitBashPath = child_process
        .execSync('where bash.exe', { encoding: 'utf8' })
        .split('\n')[0]
        .trim();

      if (gitBashPath) {
        return crossPlatformPath(gitBashPath);
      }
      return null; // Return the first match
    } catch (err) {
      return null;
    }
    //#endregion
  };
  //#endregion

  //#region utils process  / start process in new graphical terminal window
  /**
   * TODO IMPLEMENT
   * start async node process
   */
  export const startInNewTerminalWindow = (
    command: string,
    options?: Pick<ProcessStartOptions, 'cwd' | 'hideOutput'>,
  ) => {
    //#region @backendFunc
    const platform = process.platform;
    options = options || {};
    options.cwd = crossPlatformPath(options.cwd || process.cwd());

    if (platform === 'win32') {
      const child = spawn(
        'cmd',
        ['/c', 'start', 'powershell', '-NoExit', '-Command', command],
        {
          detached: true,
          stdio: 'ignore',
          cwd: options.cwd,
          windowsHide: false,
        },
      );

      child.unref();
      return child;

      //#region gitbash solution
      // if (gitBashPath) {
      //   console.log('using gitbash ', gitBashPath);
      //   return spawn(
      //     'start bash',
      //     ['-c', `${command}; echo "Press any key to exit..."; read -n 1`], // Use '-c' to execute a single command in Git Bash
      //     {
      //       detached: true, // Detached process
      //       stdio: 'ignore', // Ignore stdio
      //       cwd: options?.cwd,
      //     },
      //   ).unref(); // Ensure the parent process can exit independently
      // }
      //#endregion

      //#region cmd solution
      // return spawn('cmd', ['/c', 'start', 'cmd', '/k', `${command}`], {
      //   detached: true,
      //   stdio: 'ignore',
      //   cwd: options?.cwd,
      // }).unref();
      //#endregion
    } else if (platform === 'darwin') {
      // For macOS
      const child = spawn(
        'osascript',
        ['-e', `tell application "Terminal" to do script "${command}"`],
        {
          detached: true,
          stdio: 'ignore',
          cwd: options?.cwd,
        },
      );
      child.unref();
      return child;
    } else if (platform === 'linux') {
      if (!UtilsOs.isRunningInLinuxGraphicsCapableEnvironment()) {
        const child = child_process.spawn(command, {
          detached: true,
          cwd: options?.cwd,
          stdio: 'ignore',
        });
        child.unref();
        return child;
      }
      // For Linux (gnome-terminal as an example)
      const terminals = [
        { cmd: 'gnome-terminal', args: ['--', 'bash', '-c'] }, // GNOME Terminal
        { cmd: 'konsole', args: ['-e', 'bash', '-c'] }, // Konsole
        { cmd: 'xfce4-terminal', args: ['-e', 'bash', '-c'] }, // XFCE4 Terminal
        { cmd: 'xterm', args: ['-e', 'bash', '-c'] }, // Xterm
        { cmd: 'lxterminal', args: ['-e', 'bash', '-c'] }, // LXTerminal
        { cmd: 'mate-terminal', args: ['-e', 'bash', '-c'] }, // MATE Terminal
        { cmd: 'terminator', args: ['-x', 'bash', '-c'] }, // Terminator
        { cmd: 'tilix', args: ['-e', 'bash', '-c'] }, // Tilix
        { cmd: 'alacritty', args: ['-e', 'bash', '-c'] }, // Alacritty
        { cmd: 'urxvt', args: ['-e', 'bash', '-c'] }, // URxvt
      ];

      let terminalCommand = '';
      let terminalArgs: string[] = [];
      for (const term of terminals) {
        try {
          child_process.execSync(`which ${term.cmd}`, {
            stdio: 'ignore',
            cwd: options?.cwd,
          });
          terminalCommand = term.cmd;
          terminalArgs = [...term.args, command];
          break;
        } catch (err) {
          // Terminal not found, continue to the next
        }
      }

      if (!terminalCommand) {
        console.error('No supported terminal emulator found.');
        return;
      }
      const child = spawn(terminalCommand, terminalArgs, {
        detached: true,
        stdio: 'ignore',
      });

      child.unref();
      return child;
    } else {
      Helpers.throw(`Unsupported platform: ${platform}`);
    }
    //#endregion
  };
  //#endregion

  //#region utils process / get bash or shell name
  export const getBashOrShellName = ():
    | 'browser'
    | 'cmd'
    | 'powershell'
    | 'gitbash'
    | 'cygwin'
    | 'unknown'
    | 'bash'
    | 'zsh'
    | 'fish'
    | 'sh' => {
    //#region @browser
    return 'browser';
    //#endregion
    //#region @backendFunc
    const platform = process.platform; // Identify the platform: 'win32', 'darwin', 'linux'
    const shell = process.env.SHELL || process.env.ComSpec || ''; // Common shell environment variables

    if (platform === 'win32') {
      if (shell.includes('cmd.exe')) return 'cmd';
      if (shell.includes('powershell.exe') || shell.includes('pwsh'))
        return 'powershell';

      // Heuristic for Git Bash
      if (
        process.env.MSYSTEM &&
        process.env.MSYSTEM.toLowerCase().includes('mingw')
      ) {
        return 'gitbash';
      }

      // Heuristic for Cygwin
      if (shell.includes('cygwin')) {
        return 'cygwin';
      }

      return 'unknown'; // Default for unrecognized shells on Windows
    } else {
      // For macOS and Linux
      if (shell.includes('bash')) return 'bash';
      if (shell.includes('zsh')) return 'zsh';
      if (shell.includes('fish')) return 'fish';
      if (shell.includes('sh')) return 'sh';

      return 'unknown'; // Default for unrecognized shells on Unix-based systems
    }
    //#endregion
  };
  //#endregion

  //#region utils process / get current process and child processes usage
  /**
   * Get CPU and memory usage for a single PID.
   */
  export const getUsageForPid = async (
    pid: number,
  ): Promise<{ cpu: number; memoryInGB: number; memoryInMB: number }> => {
    //#region @backendFunc
    // pidusage returns cpu usage as a percentage (e.g., 10.0 for ~10%)
    // memory usage is returned in bytes.
    try {
      var pidusage = require('pidusage');
      const stat = await pidusage(pid);
      const memoryInMB = stat.memory / (1024 * 1024);
      const memoryInGB = stat.memory / (1024 * 1024 * 1024);
      return {
        cpu: stat.cpu, // CPU usage (percent)
        memoryInMB,
        memoryInGB,
      };
    } catch (error) {
      return {
        cpu: NaN, // CPU usage (percent)
        memoryInMB: NaN, // Memory usage (bytes)
        memoryInGB: NaN, // Memory usage
      };
    }

    //#endregion
  };
  //#endregion

  //#region utils process / get child PIDs
  /**
   * Return a list of direct child PIDs for the given PID on a Unix-like system.
   * Uses `ps -o pid= --ppid <pid>` to find child processes.
   */
  async function getChildPidsUnix(pid: number): Promise<number[]> {
    //#region @backendFunc
    const cmd = `ps -o pid= --ppid ${pid}`;
    try {
      const execAsync = promisify(child_process.exec);
      const { stdout } = await execAsync(cmd);
      // Each line should contain just the PID
      return stdout
        .split('\n')
        .map(line => line.trim())
        .filter(line => line !== '')
        .map(line => Number(line))
        .filter(n => !isNaN(n));
    } catch {
      return [];
    }
    //#endregion
  }
  //#endregion

  //#region utils process / get child PIDs on Windows
  /**
   * Return a list of direct child PIDs for the given PID on Windows.
   * Uses `wmic process where (ParentProcessId=<pid>) get ProcessId` to find child processes.
   */
  async function getChildPidsWindows(pid: number): Promise<number[]> {
    //#region @backendFunc
    const cmd = `wmic process where (ParentProcessId=${pid}) get ProcessId`;
    try {
      const execAsync = promisify(child_process.exec);
      const { stdout } = await execAsync(cmd);
      // The output generally has lines, including one that says "ProcessId" and then the PIDs
      // We'll parse out any numeric lines
      return stdout
        .split('\n')
        .map(line => line.trim())
        .filter(line => /^\d+$/.test(line)) // only keep pure digits
        .map(line => Number(line))
        .filter(n => !isNaN(n));
    } catch {
      return [];
    }
    //#endregion
  }
  //#endregion

  //#region utils process / get child PIDs once
  /**
   * Cross-platform function to list *direct* child PIDs of a given PID.
   * Uses the appropriate command depending on `process.platform`.
   */
  export async function getChildPidsOnce(pid: number): Promise<number[]> {
    //#region @backendFunc
    if (process.platform === 'win32') {
      return getChildPidsWindows(pid);
    } else {
      return getChildPidsUnix(pid);
    }
    //#endregion
  }
  //#endregion

  //#region utils process / get current process and child usage
  /**
   * Get CPU and memory usage for the current process (the Node.js process itself),
   * plus any child processes spawned by it.
   */
  export const getCurrentProcessAndChildUsage = async (): Promise<{
    current: { cpu: number; memoryInMB: number };
    children: Array<{ pid: number; cpu: number; memoryInMB: number }>;
  }> => {
    //#region @backendFunc
    const currentPid = process.pid;

    // Get stats for current Node.js process
    const currentUsage = await getUsageForPid(currentPid);

    // Get list of child PIDs
    const childPids = await getChildPidsOnce(currentPid);

    // Gather usage for each child
    const childrenUsage = await Promise.all(
      childPids.map(async pid => {
        const usage = await getUsageForPid(pid);
        return {
          pid,
          cpu: usage.cpu,
          memoryInMB: usage.memoryInMB,
        };
      }),
    );

    return {
      current: currentUsage,
      children: childrenUsage,
    };
    //#endregion
  };
  //#endregion

  //#region utils process / kill all java processes
  /**
   * Kills all running Java processes cross‑platform.
   * @returns Promise<boolean> true if processes were killed, false if none found
   */
  export const killAllJava = async (): Promise<boolean> => {
    //#region @backendFunc
    return new Promise((resolve, reject) => {
      const platform = os.platform();

      // Build command depending on platform
      let cmd: string;
      if (platform === 'win32') {
        // Windows: use taskkill to kill all java.exe processes
        cmd = `taskkill /F /IM java.exe /T`;
      } else {
        // Linux / macOS: use pkill to kill all java processes
        cmd = `pkill -f java`;
      }

      child_process.exec(cmd, (error, stdout, stderr) => {
        if (error) {
          if (
            stderr.includes('no process found') ||
            stderr.includes('not found')
          ) {
            return resolve(false); // nothing to kill
          }
          return reject(error);
        }
        resolve(true);
      });
    });
    //#endregion
  };
  //#endregion

  //#region utils process / kill process by pid or child process
  export const killProcess = async (
    pidOrProcess: number | ChildProcess,
  ): Promise<void> => {
    //#region @backendFunc
    const pid =
      typeof pidOrProcess === 'object'
        ? Number(pidOrProcess.pid)
        : Number(pidOrProcess);

    if (!pid || isNaN(pid)) {
      console.warn(`[killProcess] Invalid PID: ${pid}`);
      return;
    }

    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', String(pid), '/T', '/F']);
    } else {
      // If you spawned the process with detached: true, kill group:
      try {
        process.kill(-pid, 'SIGTERM');
      } catch (err: any) {
        if (err.code === 'ESRCH') {
          // Try normal PID if group doesn't exist
          process.kill(pid, 'SIGTERM');
        } else {
          throw err;
        }
      }
    }
    //#endregion
  };
  //#endregion

  //#region utils process / kill process on port
  export const killProcessOnPort = async (port: number): Promise<boolean> => {
    if (!port || isNaN(port) || UtilsOs.isBrowser) {
      Helpers.warn(
        `[UtilsProcess.killProcessOnPort]: Invalid port number: ${port}`,
      );
      return false;
    }

    //#region @backendFunc
    Helpers.taskStarted(`Killing process on port ${port}...`);
    return new Promise(resolve => {
      const platform = process.platform;

      // Cross-platform commands for listing process IDs by port
      const findCommand =
        platform === 'win32'
          ? `netstat -ano | findstr :${port}`
          : `lsof -i :${port} -sTCP:LISTEN -t || netstat -nlp 2>/dev/null | grep :${port}`;

      child_process.exec(findCommand, (err, stdout) => {
        if (err || !stdout) {
          return resolve(false); // nothing listening
        }

        const pids: string[] = [];
        const lines = stdout.split('\n').filter(Boolean);

        if (platform === 'win32') {
          // Windows output format -> extract PID (last column)
          for (const line of lines) {
            const parts = line.trim().split(/\s+/);
            const pid = parts[parts.length - 1];
            if (pid && /^\d+$/.test(pid)) {
              pids.push(pid);
            }
          }
        } else {
          // macOS / Linux: either `lsof` or `netstat`
          for (const line of lines) {
            const pidMatch = line.match(/\b\d+\b/);
            if (pidMatch) {
              pids.push(pidMatch[0]);
            }
          }
        }

        if (pids.length === 0) {
          return resolve(false);
        }

        // Build kill command
        const killCommand =
          platform === 'win32'
            ? `taskkill /PID ${pids.join(' /PID ')} /F`
            : `kill -9 ${pids.join(' ')}`;

        child_process.exec(killCommand, killErr => {
          if (killErr) {
            return resolve(false);
          }
          resolve(true);
        });
      });
    });
    //#endregion
  };
  //#endregion

  //#region utils process / kill all other node processes except itself
  /**
   * Kills all Node.js processes except the current process.
   * Works on Windows, macOS, and Linux.
   * @returns {number} Number of processes killed
   */
  export const killAllOtherNodeProcesses = async (): Promise<void> => {
    //#region @backendFunc
    const currentPid = process.pid;
    let killedCount = 0;

    try {
      let cmd;
      let lines;

      if (os.platform() === 'win32') {
        // Windows: use tasklist and taskkill
        cmd = `tasklist /FI "IMAGENAME eq node.exe" /FO CSV`;
        const output = child_process.execSync(cmd, { encoding: 'utf8' });
        lines = output.trim().split('\n').slice(1); // skip header

        for (const line of lines) {
          if (!line.trim()) continue;
          const cols = line.split(',').map(s => s.replace(/^"|"$/g, '').trim());
          const imageName = cols[0];
          const pid = parseInt(cols[1], 10);

          if (
            imageName.toLowerCase() === 'node.exe' &&
            pid !== currentPid &&
            !isNaN(pid)
          ) {
            try {
              process.kill(pid); // or execSync(`taskkill /PID ${pid} /F`);
              console.log(`Killed node.exe PID: ${pid}`);
              killedCount++;
            } catch (err) {
              // Process might have already exited
            }
          }
        }
      } else {
        // Linux & macOS: use ps and kill
        cmd = `ps -eo pid,command | grep -E "[n]ode( |$)"`;
        const output = child_process.execSync(cmd, { encoding: 'utf8' });
        lines = output.trim().split('\n');

        for (const line of lines) {
          if (!line.trim()) continue;
          const parts = line.trim().split(/\s+/);
          const pid = parseInt(parts[0], 10);

          if (!isNaN(pid) && pid !== currentPid) {
            try {
              process.kill(pid, 'SIGKILL');
              console.log(`Killed node PID: ${pid}`);
              killedCount++;
            } catch (err) {
              // Ignore if process no longer exists or access denied
            }
          }
        }
      }
    } catch (error) {
      console.error('Error while killing node processes:', error.message);
    }

    console.log(`Total other node processes killed: ${killedCount}`);
    //#endregion
  };
  //#endregion

  //#region utils process / is node version ok
  export const isNodeVersionOk = (options?: {
    required?: string;
    log?: boolean;
    throwErrorIfNotOk?: boolean;
  }): boolean => {
    if (!globalThis || !globalThis.process || !globalThis.process.version) {
      return false;
    }
    options = options || ({} as any);
    options.required = options.required || '18.0.0';
    const current = globalThis.process.version.replace(/^v/, '');
    const [curMajor, curMinor, curPatch] = current.split('.').map(Number);
    const [reqMajor, reqMinor, reqPatch] = options.required
      .replace(/^v/, '')
      .split('.')
      .map(Number);

    const ok =
      curMajor > reqMajor ||
      (curMajor === reqMajor && curMinor > reqMinor) ||
      (curMajor === reqMajor && curMinor === reqMinor && curPatch >= reqPatch);

    if (options?.log) {
      console.log(
        ok
          ? `✅ Node.js version OK (required ≥ ${options.required}, current ${current})`
          : `❌ Node.js version too low (required ≥ ${options.required}, current ${current})`,
      );
    }
    if (options?.throwErrorIfNotOk && !ok) {
      throw new Error(
        `Node.js version too low (required ≥ ${options.required}, current ${current})`,
      );
    }

    return ok;
  };
  //#endregion

  export const getPathOfExecutable = async (
    command: string,
  ): Promise<string | null> => {
    //#region @backendFunc
    const cmd = command.replace(/\.(exe|bat|cmd)$/i, '');
    const isWin = process.platform === 'win32';
    const checkCmd = isWin
      ? `where ${cmd}`
      : `command -v ${cmd} || which ${cmd}`;

    const shell = UtilsProcess.getBashOrShellName();

    try {
      const { stdout } = await UtilsExecProc.spawnAsync(checkCmd, {
        showOutput: false,
      }).getOutput(shell);
      const firstLine = stdout.trim().split(/\r?\n/)[0].trim();
      return firstLine ? crossPlatformPath(firstLine) : null;
    } catch (e) {
      return null;
    }
    //#endregion
  };
}
//#endregion

//#region TODO IN_PROGRESS utils messages
/**
 * TODO @LAST @IN_PROGRESS
 * - utils for messages
 * - export when ready
 * - should be ready for everything async refactor
 */
namespace UtilsMessages {}
//#endregion

//#region utils exec process
/**
 * Async api for executing child processes
 * (proper handling of stdout / stderr and options)
 */
export namespace UtilsExecProc {
  //#region utils exec process / exec proc options and class
  interface ExecProcOptions {
    cwd?: string;
    /**
     * default true
     * true -> good for long outputs
     * false -> good for short outputs (speed things up)
     */
    biggerBuffer?: boolean;
    /**
     * default true
     */
    showOutputColor?: boolean;
    /**
     * default true
     */
    showOutput?: boolean | 'stdoutOnly' | 'stderrOnly';
    /**
     * default process.env
     */
    env?: { [key: string]: string };
  }
  //#endregion

  //#region utils exec process / exec proc wait until done or throw
  interface ExecProcWaitUntilDoneOrThrow {
    /**
     * default [0]
     */
    successCode?: number[];
    /**
     * in stdout or stderr
     */
    successOutputMessage?:
      | string
      | string[]
      | {
          stdout?: string | string[];
          stderr?: string | string[];
        };

    /**
     * in stdout or stderr
     */
    failOutputMessage?:
      | string
      | string[]
      | {
          stdout?: string | string[];
          stderr?: string | string[];
        };
  }
  //#endregion

  //#region utils exec process / exec proc result class
  /**
   * This class expose function that are usually needed when working
   * with child processes (without digging into low level child_process module)
   */
  class ExecProcResult {
    //#region fields & getters
    private stdoutFromCommand: string = '';

    private stderrFromCommand: string = '';

    private child: ChildProcess;

    //#region fields & getters / get max buffer
    private get maxBuffer(): number | undefined {
      //#region @backendFunc
      let maxBuffer = Helpers.bigMaxBuffer;
      if (
        _.isBoolean(this.execProcOptions?.biggerBuffer) &&
        !this.execProcOptions.biggerBuffer
      ) {
        maxBuffer = undefined;
      }
      return maxBuffer;
      //#endregion
    }
    //#endregion

    //#region fields & getters / get env
    private get env(): { [key: string]: string } {
      //#region @backendFunc
      let env = { ...process.env, FORCE_COLOR: '1', NODE_ENV: 'development' };
      if (
        _.isBoolean(this.execProcOptions.showOutputColor) &&
        !this.execProcOptions.showOutputColor
      ) {
        delete env.FORCE_COLOR;
        delete env.NODE_ENV;
      }
      if (this.execProcOptions.env) {
        env = { ...env, ...this.execProcOptions.env };
      }
      return env;
      //#endregion
    }
    //#endregion

    //#endregion

    //#region constructor
    constructor(
      protected readonly command: string,
      protected readonly args: string[],
      protected readonly execProcOptions: ExecProcOptions = {},
    ) {}
    //#endregion

    //#region get output
    public async getOutput(
      shell?: any,
    ): Promise<{ stdout: string; stderr: string }> {
      //#region @backendFunc

      let stdio: any = 'pipe';

      this.child = spawn(this.command, this.args, {
        stdio,
        env: this.env,
        maxBuffer: this.maxBuffer,
        shell,
        cwd: this.execProcOptions.cwd,
      });

      return await new Promise<Awaited<ReturnType<typeof this.getOutput>>>(
        (resolve, reject) => {
          this.child.stdout.on('data', data => {
            const strData = data?.toString() || '';
            this.stdoutFromCommand += strData;
            if (this.execProcOptions.showOutput) {
              process.stdout.write(strData);
            }
          });

          this.child.stderr.on('data', data => {
            const strData = data?.toString() || '';
            this.stderrFromCommand += strData;
            if (this.execProcOptions.showOutput) {
              process.stderr.write(strData);
            }
          });

          this.child.once('error', err => {
            config.frameworkName === 'tnp' && console.error(err);
            reject(err);
          });
          this.child.once('exit', () => {
            setTimeout(() => {
              resolve({
                stdout: this.stdoutFromCommand,
                stderr: this.stderrFromCommand,
              });
            }, 100); // ensure all data events are processed
          });
        },
      );
      //#endregion
    }
    //#endregion;

    //#region get stdout without showing or throw
    public async getStdoutWithoutShowingOrThrow(): Promise<string> {
      const { stdout } = await this.getOutput();
      return stdout;
    }
    //#endregion

    //#region exec proc wait until done or throw
    public async waitUntilDoneOrThrow(
      options?: ExecProcWaitUntilDoneOrThrow,
    ): Promise<boolean> {
      //#region @backendFunc
      options = options || {};
      options.successCode = options.successCode || [0];
      let isRejected = false;

      let stdio: any = 'inherit';
      if (this.execProcOptions.showOutput === false) {
        stdio = 'ignore';
      } else if (this.execProcOptions.showOutput === 'stdoutOnly') {
        stdio = ['inherit', 'inherit', 'ignore'];
      } else if (this.execProcOptions.showOutput === 'stderrOnly') {
        stdio = ['inherit', 'ignore', 'inherit'];
      }

      this.child = spawn(this.command, this.args, {
        stdio,
        env: this.env,
        maxBuffer: this.maxBuffer,
        cwd: this.execProcOptions.cwd,
      });

      //#region prepare success / fail output messages
      const successOutputMessageStdout: string[] = Array.isArray(
        options.successOutputMessage,
      )
        ? options.successOutputMessage
        : typeof options.successOutputMessage === 'string'
          ? [options.successOutputMessage]
          : options.successOutputMessage &&
              Array.isArray(options.successOutputMessage.stdout)
            ? options.successOutputMessage.stdout
            : options.successOutputMessage &&
                typeof options.successOutputMessage.stdout === 'string'
              ? [options.successOutputMessage.stdout]
              : [];

      const successOutputMessageStderr: string[] = Array.isArray(
        options.successOutputMessage,
      )
        ? options.successOutputMessage
        : typeof options.successOutputMessage === 'string'
          ? [options.successOutputMessage]
          : options.successOutputMessage &&
              Array.isArray(options.successOutputMessage.stderr)
            ? options.successOutputMessage.stderr
            : options.successOutputMessage &&
                typeof options.successOutputMessage.stderr === 'string'
              ? [options.successOutputMessage.stderr]
              : [];

      const failOutputMessageStdout: string[] = Array.isArray(
        options.failOutputMessage,
      )
        ? options.failOutputMessage
        : typeof options.failOutputMessage === 'string'
          ? [options.failOutputMessage]
          : options.failOutputMessage &&
              Array.isArray(options.failOutputMessage.stdout)
            ? options.failOutputMessage.stdout
            : options.failOutputMessage &&
                typeof options.failOutputMessage.stdout === 'string'
              ? [options.failOutputMessage.stdout]
              : [];

      const failOutputMessageStderr: string[] = Array.isArray(
        options.failOutputMessage,
      )
        ? options.failOutputMessage
        : typeof options.failOutputMessage === 'string'
          ? [options.failOutputMessage]
          : options.failOutputMessage &&
              Array.isArray(options.failOutputMessage.stderr)
            ? options.failOutputMessage.stderr
            : options.failOutputMessage &&
                typeof options.failOutputMessage.stderr === 'string'
              ? [options.failOutputMessage.stderr]
              : [];

      //#endregion

      return new Promise((resolve, reject) => {
        // when ignored in stdio, these will be null
        this.child.stdout?.on('data', data => {
          const strData = data?.toString() || '';
          for (const successMsg of successOutputMessageStdout) {
            if (strData.includes(successMsg)) {
              resolve(true);
              return;
            }
          }
          if (!isRejected) {
            isRejected = true;
            for (const failMsg of failOutputMessageStdout) {
              if (strData.includes(failMsg)) {
                return reject(
                  new Error(`
[waitUntilDoneOrThrow][stdout] Execution failed. Command:
              ${chalk.bold(`${this.command} ${this.args.join(' ')}`)}

              Fail message found in stdout: ${chalk.bold(failMsg)}`),
                );
              }
            }
          }
        });

        // when ignored in stdio, these will be null
        this.child.stderr?.on('data', data => {
          const strData = data?.toString() || '';
          for (const successMsg of successOutputMessageStderr) {
            if (strData.includes(successMsg)) {
              resolve(true);
              return;
            }
          }
          if (!isRejected) {
            isRejected = true;
            for (const failMsg of failOutputMessageStderr) {
              if (strData.includes(failMsg)) {
                return reject(
                  new Error(`
[waitUntilDoneOrThrow][stderr] Execution failed. Command:
              ${chalk.bold(`${this.command} ${this.args.join(' ')}`)}

              Fail message found in stderr: ${chalk.bold(failMsg)}`),
                );
              }
            }
          }
        });

        this.child.once('error', (...args) => {
          if (!isRejected) {
            isRejected = true;
            reject(...args);
          }
        });
        this.child.once('exit', code => {
          if (options.successCode.includes(code)) {
            resolve(true);
            return;
          }
          if (!isRejected) {
            isRejected = true;
            reject(
              new Error(`
[waitUntilDoneOrThrow][exit] Execution failed. Command:
            ${chalk.bold(`${this.command} ${this.args.join(' ')}`)}

            Process exited with code ${code || 0}`),
            );
          }
        });
      });
      //#endregion
    }
    //#endregion
  }
  //#endregion

  //#region utils exec process / spawn async
  /**
   * @TODO @IN_PROGRESS
   */
  export const spawnAsync = (
    command: string,
    options?: ExecProcOptions,
  ): ExecProcResult => {
    options = options || {};
    options.cwd = crossPlatformPath(options.cwd || process.cwd());
    const [cmd, ...args] = command.split(' ');
    return new ExecProcResult(cmd, args);
  };
  //#endregion

  //#region utils exec process / spawn admin sudo
  /**
   * @TODO @IN_PROGRESS
   */
  export const spawnAdminSudo = async (
    command: string,
    options?: ExecProcOptions,
  ): Promise<void> => {
    //#region @backendFunc
    options = options || {};
    const isSudoInProperModeForTaon = await UtilsSudo.isInProperModeForTaon({
      displayErrorMessage: true,
    });

    if (!isSudoInProperModeForTaon) {
      return;
    }
    command = `sudo ${command}`;
    const res = await spawnAsync(command);
    await res.waitUntilDoneOrThrow();
    //#endregion
  };
  //#endregion

  //#region utils exec process / execute until end or throw
  /**
   * @TODO @IN_PROGRESS
   */
  export const executeUntilEndOrThrow = async ({
    command,
    cwd,
  }: {
    command: string;
    cwd: string;
  }): Promise<void> => {
    //#region @backendFunc
    const child = spawnAsync(command, { cwd });
    await child.waitUntilDoneOrThrow();
    //#endregion
  };
  //#endregion

  //#region utils exec process / get stdout without showing or throw
  export const getStdoutWithoutShowingOrThrow = async ({
    command,
    cwd,
  }: {
    command: string;
    cwd: string;
  }): Promise<string> => {
    //#region @backendFunc
    const child = spawnAsync(command, { cwd });
    return await child.getStdoutWithoutShowingOrThrow();
    //#endregion
  };
  //#endregion
}
//#endregion

//#region utils sudo
export namespace UtilsSudo {
  //#region utils sudo / sudo status enum
  /**
   * All possible sudo states on Windows 11 (24H2+)
   */
  enum SudoStatus {
    NotInstalled = 'NotInstalled',
    Disabled = 'Disabled',
    Enabled_ForceNewWindow = 'Enabled_ForceNewWindow', // Enabled = 2
    Enabled_Inline = 'Enabled_Inline', // Enabled = 3 ← current default
    Unknown = 'Unknown',
  }
  //#endregion
  /**
   * @returns true if current process is elevated (admin or sudo root), false otherwise
   */
  export const isCurrentProcessElevated = async (): Promise<boolean> => {
    return await isElevated();
  };

  //#region utils sudo / utils sudo status label
  /**
   * Human-readable descriptions
   */
  const SudoStatusLabel: Record<SudoStatus, string> = {
    [SudoStatus.NotInstalled]: 'sudo is not installed',
    [SudoStatus.Disabled]: 'sudo is disabled',
    [SudoStatus.Enabled_ForceNewWindow]:
      'sudo enabled → opens new window (ForceNewWindow)',
    [SudoStatus.Enabled_Inline]:
      'sudo enabled → inline mode (runs in same window)',
    [SudoStatus.Unknown]: 'sudo present but status unknown',
  };
  //#endregion

  //#region utils sudo / get sudo enabled value
  /**
   * Read the Enabled DWORD value from registry
   */
  async function getSudoEnabledValue(): Promise<number | null> {
    //#region @backendFunc
    const execAsync = promisify(child_process.exec);
    try {
      const { stdout } = await execAsync(
        'reg query "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Sudo" /v Enabled',
        { windowsHide: true },
      );

      const match = stdout.trim().match(/Enabled\s+REG_DWORD\s+0x([0-9a-f]+)/i);
      if (!match) return null;

      return parseInt(match[1], 16);
    } catch {
      return null;
    }
    //#endregion
  }
  //#endregion

  //#region utils sudo / get status
  /**
   * Main function – returns detailed sudo status
   */
  export async function getStatus(): Promise<{
    status: SudoStatus;
    label: string;
    isAvailable: boolean;
    isInline: boolean;
  }> {
    //#region @backendFunc
    const hasCommand = await UtilsOs.commandExistsAsync('sudo');

    if (!hasCommand) {
      return {
        status: SudoStatus.NotInstalled,
        label: SudoStatusLabel[SudoStatus.NotInstalled],
        isAvailable: false,
        isInline: false,
      };
    }

    if (!UtilsOs.isRunningInWindows) {
      return {
        status: SudoStatus.Enabled_Inline,
        label: 'sudo is available (non-Windows OS)',
        isAvailable: true,
        isInline: true,
      };
    }

    const enabledValue = await getSudoEnabledValue();

    let status: SudoStatus;

    switch (enabledValue) {
      case 0:
        status = SudoStatus.Disabled;
        break;
      case 2:
        status = SudoStatus.Enabled_ForceNewWindow;
        break;
      case 3:
        status = SudoStatus.Enabled_Inline;
        break;
      default:
        status = SudoStatus.Unknown;
        break;
    }

    return {
      status,
      label: SudoStatusLabel[status],
      isAvailable: true,
      isInline: status === SudoStatus.Enabled_Inline,
    };
    //#endregion
  }
  //#endregion

  //#region utils sudo / is sudo available
  /**
   * check if sudo is available and in proper mode
   */
  export const isInProperModeForTaon = async ({
    displayErrorMessage = false,
  }: {
    displayErrorMessage?: boolean;
  }): Promise<boolean> => {
    //#region @backendFunc
    const sudoStatus = await getStatus();
    const isInProperMode = sudoStatus.isAvailable && sudoStatus.isInline;
    if (!isInProperMode) {
      if (displayErrorMessage) {
        Helpers.error(
          `Command ${chalk.bold(
            '"sudo"',
          )} is not available in inline mode. Current status: ${
            sudoStatus.label
          }.
Please install/enable sudo in inline mode for proper functionality.`,
        );
      }
    }
    return isInProperMode;
    //#endregion
  };
  //#endregion
}
//#endregion

//#region TODO IN_PROGRESS utils files folders operations
/**
 * TODO @LAST @IN_PROGRESS
 * - utils for files and folders operations
 * - export when ready
 * - should be ready for everything async refactor
 */
namespace UtilsFilesFoldersOperations {
  //#region utils files folders operations / remove options
  export interface UtilsFilesFoldersOperationsRemoveOptions {
    recursive?: boolean;
    waitForUserActionOnError?: boolean;
  }
  //#endregion

  //#region utils files folders operations / remove file or folder or link
  /**
   * remove file or folder or link
   */
  export const remove = async (
    absolutePath: string | string[],
    options?: UtilsFilesFoldersOperationsRemoveOptions,
  ): Promise<boolean> => {
    //#region @backendFunc
    try {
      // await fs.unlink(options.absolutePath);
    } catch (error) {}
    return void 0;
    //#endregion
  };
  //#endregion

  //#region utils files folders operations / remove file or folder or link
  /**
   * remove file or folder or link
   */
  export const removeByPattern = async (
    globPattern: string | string[],
    options?: UtilsFilesFoldersOperationsRemoveOptions,
  ): Promise<boolean> => {
    //#region @backendFunc
    try {
      // await fs.unlink(options.absolutePath);
    } catch (error) {}
    return void 0;
    //#endregion
  };
  //#endregion

  //#region utils files folders operations / get files from
  export async function getFilesFromAsync(
    folderOrLinkToFolder: string | string[],
    options: {
      recursive?: boolean;
      followSymlinks?: boolean;
    } = {},
  ): Promise<string[]> {
    return null;
    //#region @backendFunc
    // folderOrLinkToFolder = crossPlatformPath(folderOrLinkToFolder) as string;
    // const { recursive = false, followSymlinks = true } = options;

    // const visited = new Set<string>();
    // const results: string[] = [];

    // const scan = async (dir: string): Promise<void> => {
    //   if (visited.has(dir)) return;
    //   visited.add(dir);

    //   let entries: fs.Dirent[];
    //   try {
    //     entries = await fse.readdir(dir, { withFileTypes: true });
    //   } catch {
    //     return; // skip unreadable folders
    //   }

    //   for (const entry of entries) {
    //     const fullPath = path.join(dir, entry.name);

    //     if (entry.isSymbolicLink()) {
    //       let realPath: string;
    //       try {
    //         realPath = await fse.realpath(fullPath);
    //       } catch {
    //         continue; // broken symlink -> skip
    //       }

    //       let stats;
    //       try {
    //         stats = await fse.stat(realPath);
    //       } catch {
    //         continue; // can't stat -> skip
    //       }

    //       if (stats.isDirectory()) {
    //         if (recursive && followSymlinks) {
    //           await scan(realPath);
    //         }
    //       } else if (stats.isFile()) {
    //         results.push(fullPath);
    //       }
    //     } else if (entry.isDirectory()) {
    //       if (recursive) {
    //         await scan(fullPath);
    //       }
    //     } else if (entry.isFile()) {
    //       results.push(fullPath);
    //     }
    //   }
    // };

    // await scan(path.resolve(folderOrLinkToFolder));

    // return results.map(crossPlatformPath);
    //#endregion
  }
  //#endregion

  //#region utils files folders operations / read file
  /**
   * TODO @IN_PROGRESS
   */
  export const readFileAsync = async (
    absoluteFilePath: string | string[],
    options?: {
      defaultValueWhenNotExists?: string | undefined;
      notTrim?: boolean;
    },
  ): Promise<string | undefined> => {
    return void 0;
  };
  //#endregion

  //#region utils files folders operations / write file
  export type WriteFileAsyncInput =
    | string
    | object
    //#region @backend
    | Buffer;
  //#endregion

  /**
   * TODO @IN_PROGRESS
   */
  export const writeFileAsync = async (
    absoluteFilePath: string | string[],
    input: WriteFileAsyncInput,
    options?: { overrideSameFile?: boolean; preventParentFile?: boolean },
  ): Promise<boolean> => {
    return void 0;
  };
  //#endregion

  //#region utils files folders operations / is existed symlink
  /**
   * TODO @IN_PROGRESS
   */
  export const isExistedSymlink = async (
    absoluteFilePath: string | string[],
  ): Promise<boolean> => {
    return void 0;
  };
  //#endregion

  //#region utils files folders operations / is un existed link
  /**
   * TODO @IN_PROGRESS
   */
  export const isUnExistedLink = async (
    absoluteFilePath: string | string[],
  ): Promise<boolean> => {
    return void 0;
  };
  //#endregion
}
//#endregion

//#region utils os
export namespace UtilsOs {
  //#region utils os / is running in browser
  /**
   * check if script is running in client browser
   * (websql model -> is also considered as browser
   * because it is running in browser)
   */
  export const isRunningInBrowser = (): boolean => {
    //#region @backend
    return false;
    //#endregion
    return true;
  };
  //#endregion

  //#region utils os / is running in node
  /**
   * check if script is running in nodejs
   * (backend script or electron script)
   */
  export const isRunningInNode = (): boolean => {
    //#region @backend
    return true;
    //#endregion
    return false;
  };
  //#endregion

  //#region utils os / is running in websql
  /**
   * check if script is running special
   * browser mode that has sql.js backend
   * and executes sql queries in browser
   */
  export const isRunningInWebSQL = (): boolean => {
    //#region @backend
    return false;
    //#endregion

    //#region @websqlOnly
    return true;
    //#endregion
    return false;
  };
  //#endregion

  //#region utils os / is running in ssr mode
  export const isRunningInSSRMode = (): boolean => {
    return typeof globalThis.window === 'undefined';
  };
  //#endregion

  //#region utils os / is running in electron
  /**
   * check whether the current process is running inside
   * Electron backend or browser.
   */
  export const isRunningInElectron = (): boolean => {
    // Electron main or renderer (most reliable)
    if (typeof process !== 'undefined' && process?.versions?.electron) {
      return true;
    }

    // Renderer with nodeIntegration
    if (
      typeof globalThis !== 'undefined' &&
      (globalThis as any)?.process?.type === 'renderer'
    ) {
      return true;
    }

    // Renderer with nodeIntegration disabled
    if (
      typeof navigator === 'object' &&
      typeof navigator.userAgent === 'string' &&
      /Electron/i.test(navigator.userAgent)
    ) {
      return true;
    }

    return false;
  };
  //#endregion

  //#region utils os / is running in vscode extension
  /**
   * Check whether the current process is running inside
   * a Visual Studio Code extension.
   */
  export const isRunningInVscodeExtension = (): boolean => {
    //#region @backendFunc
    try {
      const vscode = require('vscode');
      return !!vscode;
    } catch (error) {
      return false;
    }
    // return !!process.env.VSCODE_PID || process.execPath.includes('Code');
    //#endregion
    return false;
  };
  //#endregion

  //#region utils os / is running in wsl
  /**
   * Check wether the current process is running inside
   * windows subsystem for linux (WSL).
   */
  export const isRunningInWsl = (): boolean => {
    //#region @browser
    return false;
    //#endregion
    //#region @backendFunc
    if (process.platform !== 'linux') {
      return false;
    }

    if (os.release().toLowerCase().includes('microsoft')) {
      return true;
    }

    try {
      return fse
        .readFileSync('/proc/version', 'utf8')
        .toLowerCase()
        .includes('microsoft');
    } catch (_) {
      return false;
    }
    //#endregion
  };
  //#endregion

  //#region utils os / is running in windows / powershell / cmd
  const getProcessTree = (): Record<
    number,
    { pid: number; ppid: number; name: string }
  > => {
    //#region @backendFunc
    const tree: Record<number, { pid: number; ppid: number; name: string }> =
      {};

    try {
      const output = child_process
        .execSync(`wmic process get ProcessId,ParentProcessId,Name`, {
          stdio: ['pipe', 'pipe', 'ignore'],
        })
        .toString();

      const lines = output
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('Name'));

      for (const line of lines) {
        const match = line.match(/^(.+?)\s+(\d+)\s+(\d+)$/);
        if (match) {
          const [, name, ppidStr, pidStr] = match;
          const pid = Number(pidStr);
          const ppid = Number(ppidStr);
          tree[pid] = { name: name.trim().toLowerCase(), pid, ppid };
        }
      }
    } catch (err) {
      console.error('WMIC parse error', err);
    }

    return tree;
    //#endregion
  };

  const findAncestorProcessName = (targets: string[]): string | undefined => {
    //#region @backendFunc
    if (process.platform !== 'win32') return;

    const tree = getProcessTree();
    let currentPid = process.ppid;
    let level = 0;

    while (currentPid && level++ < 30) {
      const proc = tree[currentPid];
      if (!proc) break;

      if (targets.includes(proc.name)) return proc.name;
      currentPid = proc.ppid;
    }

    return;
    //#endregion
  };

  export const isRunningInWindowsPowerShell = (): boolean => {
    return (
      findAncestorProcessName(['powershell.exe', 'pwsh.exe']) !== undefined
    );
  };

  export const isRunningInWindowsCmd = (): boolean => {
    return findAncestorProcessName(['cmd.exe']) !== undefined;
  };
  //#endregion

  //#region utils os / is running in docker
  export const isRunningInDocker = (): boolean => {
    //#region @browser
    return false;
    //#endregion
    //#region @backendFunc
    try {
      // 1. Explicit env vars set by Docker or Kubernetes
      if (
        process.env.DOCKER_CONTAINER ||
        process.env.CONTAINER ||
        process.env.KUBERNETES_SERVICE_HOST
      ) {
        return true;
      }

      // 2. Check for /.dockerenv file
      if (fse.existsSync('/.dockerenv')) {
        return true;
      }

      // 3. Check /proc/1/cgroup for docker / container hints
      if (fse.existsSync('/proc/1/cgroup')) {
        const cgroup = fse.readFileSync('/proc/1/cgroup', 'utf8');
        if (/docker|kubepods|containerd|podman/i.test(cgroup)) {
          return true;
        }
      }

      // 4. For cgroup v2, check /proc/self/mountinfo
      if (fse.existsSync('/proc/self/mountinfo')) {
        const mountInfo = fse.readFileSync('/proc/self/mountinfo', 'utf8');
        if (/docker|kubepods|containerd|podman/i.test(mountInfo)) {
          return true;
        }
      }

      // 5. Alpine-specific: check /proc/self/cgroup
      if (fse.existsSync('/proc/self/cgroup')) {
        const selfCgroup = fse.readFileSync('/proc/self/cgroup', 'utf8');
        if (/docker|kubepods|containerd|podman/i.test(selfCgroup)) {
          return true;
        }
      }

      // Default: assume not running in Docker
      return false;
    } catch (err) {
      return false;
    }
    //#endregion
  };
  //#endregion

  //#region utils os / is running in linux graphics capable environment
  export const isRunningInLinuxGraphicsCapableEnvironment = (): boolean => {
    //#region @backendFunc
    if (os.platform() !== 'linux') {
      return false;
    }

    // Check for the DISPLAY environment variable
    return !!process.env.DISPLAY;
    //#endregion
  };
  //#endregion

  //#region utils os / is running in os with graphics capable environment
  export const isRunningInOsWithGraphicsCapableEnvironment = (): boolean => {
    //#region @backendFunc
    if (process.platform === 'win32') {
      return true; // Windows is always graphics capable
    }
    if (process.platform === 'darwin') {
      return true; // macOS is always graphics capable
    }
    return UtilsOs.isRunningInLinuxGraphicsCapableEnvironment();
    //#endregion
  };
  //#endregion

  //#region utils os / is running in cli mode
  /**
   * Check whether the current process is running in CLI mode.
   */
  export const isRunningInCliMode = (): boolean => {
    //#region @browser
    return false;
    //#endregion
    //#region @backendFunc
    return !!global['globalSystemToolMode'];
    //#endregion
  };
  //#endregion

  //#region utils os / is running in mocha test
  /**
   * Check whether the current process is running in mocha test.
   */
  export const isRunningInMochaTest = (): boolean => {
    //#region @browser
    return false;
    //#endregion
    //#region @backendFunc
    return typeof global['it'] === 'function';
    //#endregion
  };
  //#endregion

  //#region utils os / is port in use
  const isPortInUseOnHost = (port: number, host: string): Promise<boolean> => {
    //#region @backendFunc
    return new Promise(async (resolve, reject) => {
      const server = net.createServer();

      // If the port is already in use, you'll get an EADDRINUSE error.
      server.once('error', (err: NodeJS.ErrnoException) => {
        // console.log('error', err);
        if (err.code === 'EADDRINUSE' || err.code === 'EACCES') {
          resolve(true); // Port is in use
        } else {
          reject(err); // Some other error occurred
        }
      });

      // If the server successfully starts listening, the port is free.
      server.once('listening', () => {
        server.close(() => {
          // console.log(`closing ${port} on ${host}`);
          resolve(false); // Port is not in use
        });
      });

      server.listen(port, host);
    });
    //#endregion
  };

  /**
   * Checks if a given port is already in use (bound by another process).
   *
   * @param port - The port number to check.
   * @param host - The hostname or IP address to bind to (default: '127.0.0.1').
   * @returns Promise<boolean> - Resolves to `true` if the port is in use, otherwise `false`.
   */
  export const isPortInUse = async (
    port: number,
    options?: {
      /**
       * '127.0.0.1' etc..
       */
      checkForSpecificOnlyHost?: string;
    },
  ): Promise<boolean> => {
    //#region @backendFunc
    options = options || {};
    const hostArr = options.checkForSpecificOnlyHost
      ? [options.checkForSpecificOnlyHost]
      : ['::', '::1', '0.0.0.0', '127.0.0.1', 'localhost'];

    // console.log({ hostArr });
    for (const host of hostArr) {
      if (await isPortInUseOnHost(port, host)) {
        return true;
      }
    }
    return false;
    //#endregion
  };
  //#endregion

  //#region utils os / is docker available
  /**
   * Check if docker is available on this system
   * and it is running (daemon active)
   */
  export const isDockerAvailable = async (): Promise<boolean> => {
    if (UtilsOs.isBrowser) {
      return false;
    }
    //#region @backendFunc
    const execAsync = promisify(child_process.exec);
    try {
      // 1. Detect docker binary (different command depending on shell/OS)
      if (process.platform === 'win32') {
        try {
          // PowerShell supports `Get-Command`
          await execAsync('pwsh -Command "Get-Command docker"');
        } catch {
          // fallback for CMD
          await execAsync('where docker');
        }
      } else {
        await execAsync('command -v docker');
      }

      // 2. Check if docker daemon is running (try a lightweight command)
      try {
        await execAsync('docker info');
        // or: await execAsync("docker ps --format '{{.ID}}' --no-trunc");
      } catch (daemonError) {
        return false; // docker installed but not running
      }

      return true;
    } catch (error) {
      return false;
    }
    //#endregion
  };
  //#endregion

  //#region utils os / open folder in vscode
  export const openFolderInVSCode = (folderPath: string): void => {
    //#region @backendFunc
    Helpers.taskStarted(`Opening folder in VSCode: "${folderPath}"`);
    try {
      Helpers.run(`code .`, {
        cwd: folderPath,
        silence: true,
        output: false,
      }).sync();
      Helpers.taskDone(`Done opening folder in VSCode: "${folderPath}"`);
    } catch (error) {
      Helpers.warn(`Not able to open in VSCode: "${folderPath}"`, false);
    }

    //#endregion
  };
  //#endregion

  //#region utils os / open folder in file explorer
  export const openFolderInFileExplorer = (folderPath: string): void => {
    //#region @backendFunc
    if (process.platform === 'win32') {
      folderPath = win32Path(folderPath);
    }
    try {
      Helpers.info(`Opening path.. "${folderPath}"`);
      if (process.platform === 'win32') {
        Helpers.run(`explorer .`, {
          cwd: folderPath,
          silence: true,
          output: false,
        }).sync();
        return;
      }
      if (process.platform === 'darwin') {
        Helpers.run(`open .`, {
          cwd: folderPath,
          silence: true,
          output: false,
        }).sync();
        return;
      }
      Helpers.run(`xdg-open .`, {
        cwd: folderPath,
        silence: true,
        output: false,
      }).sync();
    } catch (error) {
      Helpers.warn(`Not able to open in file explorer: "${folderPath}"`, false);
    }
    //#endregion
    //#region @browser
    console.warn(
      `UtilsOs.openFolderInFileExplorer is not supported in browser mode`,
    );
    //#endregion
  };
  //#endregion

  //#region utils os / get real home directory
  export const getRealHomeDir = (): string => {
    //#region @browser
    return '';
    //#endregion
    //#region @backendFunc
    // 1. If SUDO_USER is set (macOS/Linux sudo)
    if (process.env.SUDO_USER) {
      const sudoUser = process.env.SUDO_USER;

      // Try to get from /etc/passwd if it exists (more reliable than guessing)
      if (process.platform !== 'win32' && fse.existsSync('/etc/passwd')) {
        const passwdLine = fse
          .readFileSync('/etc/passwd', 'utf8')
          .split('\n')
          .find(line => line.startsWith(sudoUser + ':'));
        if (passwdLine) {
          const homeDir = passwdLine.split(':')[5];
          if (homeDir) {
            return crossPlatformPath(homeDir);
          }
        }
      }

      // Fallback guess for macOS
      if (process.platform === 'darwin') {
        return crossPlatformPath(path.join('/Users', sudoUser));
      }
      // Fallback guess for Linux
      if (process.platform === 'linux') {
        return crossPlatformPath(path.join('/home', sudoUser));
      }
    }

    // 2. Windows elevated mode
    if (process.platform === 'win32') {
      // When run as Administrator, os.homedir() returns the admin's profile dir.
      // To get the *real* logged-in user, try USERNAME from env
      const realUser =
        process.env.USERNAME ||
        process.env.LOGNAME ||
        process.env.USER ||
        process.env.LNAME;

      if (realUser) {
        const userProfileBase = process.env.SystemDrive
          ? path.join(process.env.SystemDrive, 'Users')
          : 'C:\\Users';
        const guessedHome = path.join(userProfileBase, realUser);
        if (fse.existsSync(guessedHome)) {
          return crossPlatformPath(guessedHome);
        }
      }
    }

    // 3. Default to current user's home
    return crossPlatformPath(os.homedir());
    //#endregion
  };
  //#endregion

  export const isNodeVersionOk = UtilsProcess.isNodeVersionOk;
  export const isElectron = isRunningInElectron();
  export const isBrowser = isRunningInBrowser();
  export const isNode = isRunningInNode();
  export const isWebSQL = isRunningInWebSQL();
  export const isVscodeExtension = isRunningInVscodeExtension();
  export const isSSRMode = isRunningInSSRMode();
  let isRunningInWindowsTmp: boolean = false;
  //#region @backend
  isRunningInWindowsTmp = process.platform == 'win32';
  //#endregion
  export const isRunningInWindows = isRunningInWindowsTmp;

  //#region utils os / command exists

  //#region helpers
  const fileNotExists = async (commandName: string): Promise<boolean> => {
    try {
      await fse.access(commandName, fse.constants.F_OK);
      return false;
    } catch {
      return true;
    }
  };

  const fileNotExistsSync = (commandName: string): boolean => {
    try {
      fse.accessSync(commandName, fse.constants.F_OK);
      return false;
    } catch {
      return true;
    }
  };

  const localExecutable = async (commandName: string): Promise<boolean> => {
    try {
      await fse.access(commandName, fse.constants.F_OK | fse.constants.X_OK);
      return true;
    } catch {
      return false;
    }
  };

  const localExecutableSync = (commandName: string): boolean => {
    try {
      fse.accessSync(commandName, fse.constants.F_OK | fse.constants.X_OK);
      return true;
    } catch {
      return false;
    }
  };
  //#endregion

  //#region command exists (Unix / Windows)
  const commandExistsUnix = async (commandName: string): Promise<boolean> => {
    const isFileMissing = await fileNotExists(commandName);
    if (isFileMissing) {
      try {
        const stdout = child_process.execSync(
          `command -v ${commandName} 2>/dev/null && { echo >&1 '${commandName} found'; exit 0; }`,
          { encoding: 'utf-8' },
        );
        return !!stdout;
      } catch {
        return false;
      }
    }

    return await localExecutable(commandName);
  };

  const commandExistsWindows = async (
    commandName: string,
  ): Promise<boolean> => {
    try {
      const stdout = await Helpers.commandOutputAsStringAsync(
        `where ${commandName}`,
      );
      return !!stdout;
    } catch {
      return false;
    }
  };

  const commandExistsUnixSync = (commandName: string): boolean => {
    if (fileNotExistsSync(commandName)) {
      try {
        const stdout = child_process.execSync(
          `command -v ${commandName} 2>/dev/null && { echo >&1 '${commandName} found'; exit 0; }`,
          { encoding: 'utf-8' },
        );
        return !!stdout;
      } catch {
        return false;
      }
    }
    return localExecutableSync(commandName);
  };

  const commandExistsWindowsSync = (commandName: string): boolean => {
    try {
      const stdout = Helpers.commandOutputAsString(`where ${commandName}`);
      return !!stdout;
    } catch {
      return false;
    }
  };
  //#endregion

  //#region exported API
  export const commandExistsAsync = async (
    commandName: string,
  ): Promise<boolean> => {
    try {
      if (isRunningInWindows) {
        return await commandExistsWindows(commandName);
      } else {
        return await commandExistsUnix(commandName);
      }
    } catch (error) {
      if (frameworkName === 'tnp') console.error(error);
      return false;
    }
  };

  /**
   * @deprecated use commandExistsAsync
   */
  export const commandExistsSync = (commandName: string): boolean => {
    return isRunningInWindows
      ? commandExistsWindowsSync(commandName)
      : commandExistsUnixSync(commandName);
  };
  //#endregion

  //#endregion

  //#region utils os / python module exists
  export const pipxPackageExists = (packageName: string): Promise<boolean> => {
    //#region @backendFunc
    return new Promise(resolve => {
      child_process.exec(`pipx list`, (err, stdout) => {
        if (err) return resolve(false);
        resolve(stdout.includes(packageName));
      });
    });
    //#endregion
  };

  export const pipxNestedPackageExists = (
    mainPackageName: string,
    targetNestedFromMainPackage: string,
  ): Promise<boolean> => {
    //#region @backendFunc
    return new Promise(resolve => {
      child_process.exec(
        `pipx runpip ${mainPackageName} freeze`,
        (err, stdout) => {
          if (err) return resolve(false);
          const packages = stdout
            .split('\n')
            .map(p => p.trim().toLowerCase().split('==')[0]);
          resolve(packages.includes(targetNestedFromMainPackage.toLowerCase()));
        },
      );
    });
    //#endregion
  };

  const normalizeModuleName = (name: string): string => {
    return name.replace(/-/g, '_');
  };

  export const pythonModuleExists = async (
    moduleName: string,
    // pythonPath = process.platform === 'win32' ? 'python' : 'python3',
    pythonPath = 'python3',
  ): Promise<boolean> => {
    //#region @backendFunc
    return new Promise(resolve => {
      child_process.exec(
        `${pythonPath} -c "import ${normalizeModuleName(moduleName)}"`,
        (error, _stdout, _stderr) => {
          // console.log({ error });
          resolve(!error); // true if module exists, false if not
        },
      );
    });
    //#endregion
  };
  //#endregion
}
//#endregion

//#region utils string
export namespace UtilsString {
  //#region utils string / kebab case no split numbers
  export const kebabCaseNoSplitNumbers = (input: string): string => {
    return (
      input
        // Match spaces or any kind of whitespace and replace with a hyphen
        .replace(/\s+/g, '-')
        // Match uppercase letters and replace them with a hyphen and the lowercase version of the letter
        .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
        // Convert everything to lowercase
        .toLowerCase()
    );
  };
  //#endregion
}
//#endregion

//#region utils migrations
/**
 * Taon migration utilities
 */
export namespace UtilsMigrations {
  export const getTimestampFromClassName = (
    className: string,
  ): number | undefined => {
    const [maybeTimestamp1, maybeTimestamp2] = className.split('_') || [];
    // console.log({ maybeTimestamp1, maybeTimestamp2 });
    const timestamp1 = parseInt(maybeTimestamp1);
    const timestamp2 = parseInt(maybeTimestamp2);
    const timestamp = !_.isNaN(timestamp1) ? timestamp1 : timestamp2;
    return isValidTimestamp(timestamp) ? timestamp : void 0;
  };

  export const getFormattedTimestampFromClassName = (
    className: string,
  ): string | undefined => {
    const timestamp = getTimestampFromClassName(className);
    if (!timestamp) {
      return void 0;
    }
    return formatTimestamp(timestamp);
  };

  export const formatTimestamp = (timestamp: number): string => {
    const dateFromTimestamp: Date = new Date(timestamp);
    // @ts-ignore
    return `${dateformat(dateFromTimestamp, 'dd-mm-yyyy HH:MM:ss')}`;
  };

  export const isValidTimestamp = (value: any): boolean => {
    if (typeof value !== 'number') {
      return false; // Must be a number
    }

    const minTimestamp = 0; // Minimum possible timestamp (Unix epoch)
    const maxTimestamp = 8640000000000000; // Max safe timestamp in JS (represents year ~275760)

    return value >= minTimestamp && value <= maxTimestamp;
  };
}
//#endregion

//#region utils terminal
export namespace UtilsTerminal {
  //#region utils terminal / models
  export interface SelectChoice {
    /**
     * Title of the choice
     */
    name?: string;
    disabled?: boolean;
  }

  export interface SelectChoiceValue<T = string> extends SelectChoice {
    value?: T;
  }

  type SelectActionChoice = {
    [choice: string]: SelectChoice & {
      /**
       * Action to execute
       */
      action?: () => any;
    };
  };
  //#endregion

  //#region utils terminal / wait
  export const wait = Utils.wait;
  //#endregion

  //#region utils terminal / wait milliseconds
  export const waitMilliseconds = Utils.waitMilliseconds;
  //#endregion

  //#region utils terminal / is verbose mode
  /**
   * Check if cli is running in verbose mode
   * @returns true if cli is running with arugment -verbose
   */
  export const isVerboseModeTaon = (): boolean => {
    //#region @backendFunc
    return !global.hideLog;
    //#endregion
  };
  //#endregion

  //#region utils terminal / wait for user any key
  export const waitForUserAnyKey = async (
    callback: () => void | Promise<void>,
    options?: {
      /**
       * by default, the action is only triggered once when a key is pressed.
       * if this option is set, the action will be triggered on every key press.
       * (Promise will not be resolved until process is killed)
       */
      triggerActionEveryKeypress?: boolean;
    },
  ): Promise<void> => {
    //#region @backendFunc
    return new Promise<void>(resolve => {
      options = options || {};
      const stdin = process.stdin;

      const wasRaw = (stdin as any).isRaw; // remember if it was already raw
      if (!options?.triggerActionEveryKeypress) {
        stdin.setRawMode?.(true);
        stdin.resume();
      }
      let stoping = false;

      const onKeyPress = async () => {
        if (!options?.triggerActionEveryKeypress) {
          if (stoping) {
            return;
          }
          stoping = true;
        }
        // restore previous raw mode state
        if (!options?.triggerActionEveryKeypress) {
          if (wasRaw) {
            stdin.setRawMode?.(true);
          } else {
            stdin.setRawMode?.(false);
          }

          stdin.pause();
        }

        if (callback) await callback();

        if (!options?.triggerActionEveryKeypress) {
          resolve();
        }
      };

      if (options?.triggerActionEveryKeypress) {
        stdin.on('data', onKeyPress);
      } else {
        stdin.once('data', onKeyPress);
      }
    });
    //#endregion
  };
  //#endregion

  //#region utils terminal / get terminal height
  export const getTerminalHeight = (): number => {
    //#region @backendFunc
    if (process.stdout.rows && process.stdout.rows > 10) {
      return process.stdout.rows;
    }

    // fallback 1: environment variable (works in most shells)
    if (process.env.LINES) {
      const lines = parseInt(process.env.LINES, 10);
      if (!isNaN(lines) && lines > 10) return lines;
    }

    // fallback 2: use `tput` (works in macOS/Linux, even VSCode)
    try {
      const result = child_process.spawnSync('tput', ['lines'], {
        encoding: 'utf-8',
      });
      const lines = parseInt(result.stdout.trim(), 10);
      if (!isNaN(lines) && lines > 10) return lines;
    } catch {}

    // fallback default
    return 24;
    //#endregion
  };
  //#endregion

  //#region utils terminal / clear
  export const clearConsole = (): void => {
    //#region @backendFunc
    Helpers.msgCacheClear();
    console.clear();
    //#endregion
    // TODO @LAST
    // let shouldClear = true;
    //#region @backend
    // const inspector = require('inspector');
    // const isDebugging = process.execArgv.some(
    //   arg => arg.startsWith('--inspect') || arg.startsWith('--debug'),
    // );
    // const isChromeConnected = inspector.url() !== undefined;

    // if (
    //   isDebugging ||
    //   isChromeConnected ||
    //   process.env.NO_CONSOLE_CLEAR === 'true'
    // ) {
    //   shouldClear = false;
    // }

    //#endregion

    //#region @browser
    // const isDevToolsOpen = (() => {
    //   const threshold = 160; // devtools resizing causes this to be larger
    //   return (
    //     window.outerHeight - window.innerHeight > threshold ||
    //     window.outerWidth - window.innerWidth > threshold
    //   );
    // })();

    // if (isDevToolsOpen) {
    //   shouldClear = false;
    // }
    //#endregion
    // if (shouldClear) {
    // Helpers.msgCacheClear?.();
    // console.clear?.();
    // }
    // console.log('\x1Bc');
    // process.stdout.write('\033c\033[3J');
    // try {
    //   run('clear').sync()
    // } catch (error) {
    //   console.log('clear console not succedd')
    // }
  };
  //#endregion

  //#region utils terminal / transform choices
  const transformChoices = (choices: any): SelectChoiceValue[] => {
    //#region @backendFunc
    if (!_.isArray(choices) && _.isObject(choices)) {
      choices = Object.keys(choices)
        .map(key => {
          return {
            name: choices[key].name,
            disabled: !!choices[key].disabled,
            value: key,
          };
        })
        .reduce((a, b) => a.concat(b), []);
    }
    return choices.map(c => ({
      name: c.name,
      value: c.value,
      disabled: c.disabled,
    }));
    //#endregion
  };
  //#endregion

  //#region utils terminal / multiselect
  export const multiselect = async <T = string>(options: {
    question?: string;
    /**
     * If true, then only one choice can be selected
     * @deprecated use select instead
     */
    onlyOneChoice?: boolean;
    choices: SelectChoiceValue<T>[] | { [choice: string]: SelectChoice };
    autocomplete?: boolean;
    /**
     * at least one choice must be selected
     */
    required?: boolean;
    defaultSelected?: string[];
  }): Promise<T[]> => {
    //#region @backendFunc
    const { select } = await import('inquirer-select-pro');
    const fuzzy = await import('fuzzy');
    options = _.cloneDeep(options);
    options.required = !!options.required;
    options.question = options.question || 'Select one or multiple options';
    options.autocomplete = _.isNil(options.autocomplete)
      ? true
      : options.autocomplete;
    const choices = transformChoices(options.choices) as any;

    if (Object.keys(choices || {}).length === 0) {
      Helpers.info(options.question);
      if (options.required) {
        throw new Error(
          'No choices available but at least one selection is required.',
        );
      }
      await UtilsTerminal.pressAnyKeyToContinueAsync({
        message: 'No choices available. Press any key to continue...',
      });
      return [];
    }

    while (true) {
      try {
        const defaultValue = options.defaultSelected || [];
        // console.log({ defaultValue, choices });
        const res = await select({
          message: options.question,
          // options: choices,
          clearInputWhenSelected: true,
          emptyText: '<< No results >>',
          multiple: !options.onlyOneChoice,
          canToggleAll: true,
          pageSize: 10,
          loop: true,
          defaultValue,
          options: !options.autocomplete
            ? choices
            : (input = '') => {
                if (!input) {
                  return choices;
                }
                const fuzzyResult = fuzzy.filter(
                  input,
                  choices.map(f => f.name),
                );
                return fuzzyResult.map(el => {
                  return {
                    name: el.original,
                    value: choices.find(c => c.name === el.original).value,
                  };
                });
              },
        });
        const result = (Array.isArray(res) ? res : [res]) as T[];
        // console.log({ result });
        if (options.required && result.length === 0) {
          await UtilsTerminal.pressAnyKeyToContinueAsync({
            message:
              'You must select at least one option. Press any key to continue...',
          });
          continue;
        }
        return result;
      } catch (error) {
        await UtilsTerminal.pressAnyKeyToContinueAsync({
          message: 'Something went wrong. Press any key to try again...',
        });
      }
    }

    //#region old autocomplete
    // const prompt = new AutoComplete({
    //   name: 'value',
    //   message: question,
    //   limit: 10,
    //   multiple: true,
    //   choices,
    //   initial: (selected || []).map(s => s.name),
    //   // selected,
    //   hint: '- Space to select. Return to submit',
    //   footer() {
    //     return CLI.chalk.green('(Scroll up and down to reveal more choices)');
    //   },
    //   result(names) {
    //     return _.values(this.map(names)) || [];
    //   },
    // });

    // const res = await prompt.run();
    //#endregion

    //#region old inquirer
    // const res = (await inquirer.prompt({
    //   type: 'checkbox',
    //   name: 'value',
    //   message: question,
    //   default: selected.map(s => s.name),
    //   choices,
    //   pageSize: 10,
    //   loop: false,
    // } as any)) as any;
    // return res.value;
    //#endregion
    //#endregion
  };
  //#endregion

  //#region utils terminal / multiselect and execute
  /**
   * Similar to select but executes action if provided
   * @returns selected and executed value
   */
  export const multiselectActionAndExecute = async <
    CHOICE extends SelectActionChoice = SelectActionChoice,
  >(
    choices: CHOICE,
    options?: {
      question?: string;
      autocomplete?: boolean;
      defaultSelected?: string;
      hint?: string;
      executeActionsOnDefault?: boolean;
    },
  ) => {
    //#region @backendFunc
    options = options || ({} as any);
    options.question = options.question || 'Select actions to execute';
    options.executeActionsOnDefault = _.isBoolean(
      options.executeActionsOnDefault,
    )
      ? options.executeActionsOnDefault
      : true;

    // if (Object.keys(choices || {}).length === 0) {
    //   await UtilsTerminal.pressAnyKeyToContinueAsync({
    //     message: 'No choices available. Press any key to continue...',
    //   });
    //   return { selected: [] as (keyof CHOICE)[], action: async () => void 0 };
    // }

    const res = await multiselect<keyof typeof choices>({
      ...(options as any),
      choices,
    });

    if (Array.isArray(res) && res.length === 0) {
      return {
        selected: [] as (keyof CHOICE)[],
        actionResults: [],
        actions: [],
      };
    }

    // clearConsole();
    let actionResults: unknown[] = [];
    if (options.executeActionsOnDefault) {
      for (const key in res) {
        if (res[key] && choices[key] && _.isFunction(choices[key].action)) {
          actionResults.push(await choices[key].action());
        }
      }
    }
    // console.log(`Response from select: "${res}"`);
    // pipeEnterToStdin();
    return {
      selected: res,
      actionResults,
      /**
       * object containing all selected actions
       */
      actions: res.map(r => choices[r].action),
    };
    //#endregion
  };
  //#endregion

  //#region utils terminal / select and execute
  /**
   * Similar to select but executes action if provided
   * @returns selected and executed value
   */
  export const selectActionAndExecute = async <
    CHOICE extends SelectActionChoice = SelectActionChoice,
  >(
    choices: CHOICE,
    options?: {
      question?: string;
      autocomplete?: boolean;
      defaultSelected?: string;
      hint?: string;
      executeActionOnDefault?: boolean;
    },
  ) => {
    //#region @backendFunc
    options = options || ({} as any);
    options.question = options.question || 'Select action to execute';
    options.executeActionOnDefault = _.isBoolean(options.executeActionOnDefault)
      ? options.executeActionOnDefault
      : true;

    if (Object.keys(choices || {}).length === 0) {
      await UtilsTerminal.pressAnyKeyToContinueAsync({
        message: 'No choices available. Press any key to continue...',
      });
      return { selected: void 0, action: async () => void 0 };
    }

    const res = await select<keyof typeof choices>({
      ...(options as any),
      choices,
    });
    // clearConsole();
    let actionResult: unknown;
    if (
      res &&
      choices[res] &&
      _.isFunction(choices[res].action) &&
      options.executeActionOnDefault
    ) {
      actionResult = await choices[res].action();
    }
    // console.log(`Response from select: "${res}"`);
    // pipeEnterToStdin();
    return {
      selected: res,
      actionResult,
      action: async () => await choices[res].action(),
    };
    //#endregion
  };
  //#endregion

  //#region utils terminal / select
  export const select = async <T = string>(options: {
    question?: string;
    choices: SelectChoiceValue<T>[] | { [choice: string]: SelectChoice };
    autocomplete?: boolean;
    defaultSelected?: string;
    hint?: string;
  }): Promise<T | undefined> => {
    //#region @backendFunc
    options = _.cloneDeep(options);
    options.question = options.question || 'Select option';
    options.hint = _.isNil(options.hint)
      ? '- Space to select. Return to submit'
      : options.hint;
    options.autocomplete = _.isNil(options.autocomplete)
      ? true
      : options.autocomplete;
    const choices = transformChoices(options.choices);

    let preselectedIndex =
      choices.findIndex(c => c.value === options.defaultSelected) || 0;
    if (preselectedIndex === -1) {
      preselectedIndex = 0;
    }
    let prompt;
    // console.log({ choicesBefore: choices });

    if (!choices || choices.length === 0) {
      Helpers.info(options.question);
      await UtilsTerminal.pressAnyKeyToContinueAsync({
        message: '< No choices available. Press any key to continue... > ',
      });
      return;
    }

    while (true) {
      try {
        if (options.autocomplete) {
          const { AutoComplete } = require('enquirer');
          prompt = new AutoComplete({
            name: 'value',
            message: options.question,
            limit: 10,
            multiple: false,
            initial: preselectedIndex,
            choices,
            hint: options.hint,
            footer() {
              return chalk.green('(Scroll up and down to reveal more choices)');
            },
          });
          const res = await prompt.run();
          // console.log({choices})
          // console.log(`Selected!!!: "${res}" `);
          return res;
        } else {
          const { Select } = require('enquirer');
          prompt = new Select({
            // name: 'value',
            message: options.question,
            choices,
          });
          const res = await prompt.run();
          return choices.find(c => c.name === res)?.value as any;
        }
      } catch (error) {
        await UtilsTerminal.pressAnyKeyToContinueAsync({
          message: `Error during selection: ${error}. Press any key to retry...`,
        });
      }
    }

    //#region does not work
    // const choice = await multiselect<T>({
    //   ...{
    //     question,
    //     choices,
    //     autocomplete,
    //     defaultSelected: [defaultSelected],
    //   },
    //   onlyOneChoice: true,
    // });
    // return _.first(choice) as T;
    //#endregion

    //#endregion
  };

  //#endregion

  //#region utils terminal / pipe enter to stdin
  export const pipeEnterToStdin = (): void => {
    //#region @backendFunc
    process.stdin.push('\n');
    //#endregion
  };
  //#endregion

  //#region utils terminal / input
  export const input = async ({
    defaultValue,
    question,
    required,
    validate,
  }: {
    defaultValue?: string;
    question: string;
    required?: boolean;
    validate?: (value: string) => boolean;
  }): Promise<string> => {
    //#region @backendFunc
    const initial = defaultValue || '';

    const inquirer = await import('inquirer');

    while (true) {
      // Create an input prompt
      const response = await inquirer.prompt({
        type: 'input',
        name: 'name',
        message: question,
        required,
        default: initial,
        // required: _.isNil(required) ? true : required,
      });
      const anwser = response.name;
      if (required && !anwser) {
        continue;
      }
      if (_.isFunction(validate) && !validate(anwser)) {
        continue;
      }
      return anwser;
    }
    //#endregion
  };
  //#endregion

  //#region utils terminal / confirm
  export const confirm = async (options?: {
    /**
     * default: Are you sure?
     */
    message?: string;
    callbackTrue?: () => any;
    callbackFalse?: () => any;
    /**
     * default: true
     */
    defaultValue?: boolean;
    engine?: 'inquirer-toggle' | 'prompts' | 'enquirer' | '@inquirer/prompts';
  }) => {
    //#region @backendFunc
    options = options || ({} as any);
    options.defaultValue = _.isBoolean(options.defaultValue)
      ? options.defaultValue
      : true;

    options.message = options.message || 'Are you sure?';
    options.engine = options.engine || 'inquirer-toggle';
    const {
      defaultValue,
      message,
      // mustAnswerQuestion,
      callbackFalse,
      callbackTrue,
    } = options;

    let response = {
      value: defaultValue,
    };
    if (global.tnpNonInteractive) {
      Helpers.info(`${message} - AUTORESPONSE: ${defaultValue ? 'YES' : 'NO'}`);
    } else {
      if (options.engine === 'inquirer-toggle') {
        const inquirerToggle = (await import('inquirer-toggle')).default;
        const answer = await inquirerToggle({
          message,
          default: defaultValue,
          theme: {
            style: {
              highlight: chalk.bold.cyan.underline,
            },
          },
        });
        response = {
          value: answer,
        };
      } else if (options.engine === '@inquirer/prompts') {
        // @ts-ignore
        const { confirm } = await import('@inquirer/prompts');
        const answer = await confirm({
          message,
          default: defaultValue,
        });
        response = {
          value: answer,
        };
      } else if (options.engine === 'prompts') {
        const prompts = require('prompts');
        response = await prompts({
          type: 'toggle',
          name: 'value',
          message,
          initial: defaultValue,
          active: 'yes',
          inactive: 'no',
        });
      } else if (options.engine === 'enquirer') {
        const { Select } = require('enquirer');
        const choices = defaultValue ? ['yes', 'no'] : ['no', 'yes'];
        const prompt = new Select({
          name: 'question',
          message,
          choices,
        });
        response = {
          value: (await prompt.run()) === 'yes',
        };
      }
    }
    if (response.value) {
      if (callbackTrue) {
        await Helpers.runSyncOrAsync({ functionFn: callbackTrue });
      }
    } else {
      if (callbackFalse) {
        await Helpers.runSyncOrAsync({ functionFn: callbackFalse });
      }
    }
    return response.value;
    //#endregion
  };
  //#endregion

  //#region utils terminal / press any key to continue
  export const pressAnyKeyToContinueAsync = (options?: {
    message?: string;
  }): Promise<void> => {
    //#region @backendFunc
    options = options || {};
    options.message =
      options.message || chalk.bold('Press any key to continue...');
    const { message } = options;
    const readline = require('readline');
    return new Promise(resolve => {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      // Prompt user with the question
      rl.question(message, answer => {
        rl.close();
        resolve(answer);
      });
    });
    //#endregion
  };
  //#endregion

  //#region utils terminal / press any key to try again error occurred
  /**
   * @returns true if user wants to try again, false otherwise
   */
  export const pressAnyKeyToTryAgainErrorOccurred = async (
    error: any,
  ): Promise<boolean> => {
    //#region @backendFunc
    frameworkName === 'tnp' && Helpers.error(error, true, true);

    if (
      !(await UtilsTerminal.confirm({
        message: 'An error occurred. Do you want to try again?',
      }))
    ) {
      return false;
    }
    return true;
    //#endregion
  };
  //#endregion

  //#region utils terminal / press any key
  /**
   * @deprecated use UtilsTerminal.pressAnyKeyToContinueAsync()
   */
  export const pressAnyKey = (options?: { message?: string }) => {
    //#region @backendFunc
    options = options || {};
    options.message = options.message || 'Press any key to continue...';
    const { message } = options;
    if (process.platform === 'win32') {
      const terminal = UtilsProcess.getBashOrShellName();
      // console.log({ terminal });
      if (terminal === 'gitbash') {
        const getGitBashPath = UtilsProcess.getGitBashPath();
        // console.log({ getGitBashPath });
        const gitbashCommand = `read -p "${chalk.bold(message)}"`;
        child_process.execSync(gitbashCommand, {
          stdio: 'inherit',
          shell: getGitBashPath,
        });
      } else {
        console.log(chalk.bold(message));
        spawn.sync('pause', '', { shell: true, stdio: [0, 1, 2] });
      }
      return;
    }

    console.log(chalk.bold(message));
    require('child_process').spawnSync('read _ ', {
      shell: true,
      stdio: [0, 1, 2],
    });
    //#endregion
  };
  //#endregion

  //#region utils terminal / preview long list as select
  export const previewLongList = async (
    list: string | string[],
    listName = 'List',
  ): Promise<void> => {
    //#region @backendFunc
    if (!Array.isArray(list)) {
      list = list.split('\n');
    }
    const choices = list.reduce((a, b) => {
      return _.merge(a, {
        [b]: {
          name: b,
          // action: () => {},
        },
      });
    }, {});
    await selectActionAndExecute(choices, {
      autocomplete: true,
      question: listName,
      hint: 'Press enter to return',
    });
    //#endregion
  };
  //#endregion

  //#region utils terminal /  preview long list with 'less' (git log like)
  /**
   * Displays a long list in the console using a pager like `less`.
   * Returns a Promise that resolves when the user exits the pager.
   *
   * @param {string} list - The long string content to display.
   * @returns {Promise<void>} A Promise that resolves when the pager exits.
   */
  export const previewLongListGitLogLike = async (
    list: string | string[],
  ): Promise<void> => {
    //#region @backendFunc
    UtilsTerminal.clearConsole();
    if (Array.isArray(list)) {
      list = list.join('\n');
    }
    await new Promise((resolve, reject) => {
      const isWindows = os.platform() === 'win32';
      const pager = isWindows ? 'more' : 'less';

      const tmpFilePath = crossPlatformPath([
        UtilsOs.getRealHomeDir(),
        '.taon/temp-file-preview',
        `taon-preview-${Date.now()}.txt`,
      ]);
      const pagerArgs = isWindows
        ? [win32Path(tmpFilePath)]
        : ['-R', '-f', tmpFilePath];

      Helpers.writeFile(tmpFilePath, list);

      const less = spawn(pager, pagerArgs, {
        stdio: 'inherit',
        shell: true,
      });

      less.on('exit', code => {
        Helpers.removeFileIfExists(tmpFilePath);
        if (code === 0) {
          resolve(void 0);
        } else {
          reject(new Error(`"${pager}" process exited with code ${code}`));
        }
      });

      less.on('error', err => {
        Helpers.removeFileIfExists(tmpFilePath);
        reject(err);
      });
    });
    await UtilsTerminal.pressAnyKeyToContinueAsync({
      message: 'Done previewing. Press any key to go back...',
    });
    //#endregion
  };
  //#endregion

  //#region utils terminal /  draw big text
  export const drawBigText = async (
    text: string,
    options?: {
      skipDrawing?: boolean;
      align?: CoreModels.CfontAlign;
      style?: CoreModels.CfontStyle;
    },
  ): Promise<string> => {
    //#region @backendFunc
    options = options || {};
    const cfonts = require('cfonts');
    const output = cfonts.render(text, {
      font: options.style || 'block',
      align: options.align || 'left',
      colors: ['system'],
      background: 'transparent',
      letterSpacing: 1,
      lineHeight: 1,
      space: true,
      maxLength: '0',
      gradient: false,
      independentGradient: false,
      transitionGradient: false,
      env: 'node',
    });
    console.log(output.string);
    return output.string;
    //#endregion
  };
  //#endregion

  //#region utils terminal / configure bash or shell
  /**
   * @TODO @IN_PROGRESS
   * - export when done
   * Configure bash or powershell prompt to show current folder and git branch
   */
  const configureBashOrShell = async (): Promise<void> => {
    //#region @backendFunc

    //#region configure bash
    const configureBash = () => {
      const configBase = `
      # Extract git branch (if any)
  parse_git_branch() {
      git branch --show-current 2>/dev/null
  }

  # PS1 with only folder basename
  export PS1="\\[\\e[32m\\]\\W\\[\\e[33m\\] \\$(parse_git_branch)\\[\\e[0m\\]\\$ "


      `;
    };
    //#endregion

    //#region configure powershell
    const ConfigurePowerSHell = () => {
      // "terminal.integrated.profiles.windows": {
      //   "PowerShell Core": {
      //     "path": "C:\\Users\\darek\\AppData\\Local\\Microsoft\\WindowsApps\\pwsh.exe"
      //   }
      // },

      // notepad $PROFILE
      //     `$env:PATH += ";${UtilsOs.getRealHomeDir()}\AppData\Local\Programs\oh-my-posh\bin"
      // oh-my-posh init pwsh --config "C:\Users\darek\AppData\Local\Programs\oh-my-posh\themes\jandedobbeleer.omp.json" | Invoke-Expression`
      // function readlink($Path) {
      //     (Get-Item $Path).Target
      // }

      // Set-ExecutionPolicy RemoteSigned -Scope CurrentUser

      const powershellConfig = {
        $schema:
          'https://raw.githubusercontent.com/JanDeDobbeleer/oh-my-posh/main/themes/schema.json',
        console_title_template: '{{ .Folder }}',
        blocks: [
          {
            type: 'prompt',
            alignment: 'left',
            segments: [
              // {
              //   properties: {
              //     cache_duration: 'none',
              //   },
              //   template: '{{ .UserName }}@{{ .HostName }} ',
              //   foreground: '#00FF00',
              //   type: 'session',
              //   style: 'plain',
              // },
              {
                properties: {
                  cache_duration: 'none',
                },
                template: 'POWERSHELL ',
                foreground: '#FF69B4',
                type: 'shell',
                style: 'plain',
              },
              // only basename
              {
                type: 'path',
                style: 'plain',
                template: '{{ .Folder }}',
                foreground: '#D4AF37',
                properties: {
                  style: 'agnoster',
                },
              },
              // {
              //   properties: {
              //     cache_duration: 'none',
              //     style: 'full',
              //   },
              //   template: '{{ .Path }} ',
              //   foreground: '#D4AF37',
              //   type: 'path',
              //   style: 'plain',
              // },
              {
                properties: {
                  branch_icon: '',
                  cache_duration: 'none',
                  display_stash_count: false,
                  display_status: false,
                  display_upstream_icon: false,
                },
                template: '({{ .HEAD }})',
                foreground: '#3399FF',
                type: 'git',
                style: 'plain',
              },
            ],
          },
        ],
        version: 3,
        final_space: true,
      };

      const powerShellDesktJson = crossPlatformPath(
        `${UtilsOs.getRealHomeDir()}/AppData/Local/Programs/oh-my-posh/themes/jandedobbeleer.omp.json`,
      );
    };
    //#endregion

    // TODO terminal UI menu to select bash or powershell
    //#endregion
  };
  //#endregion
}
//#endregion

//#region utils json
export namespace UtilsJson {
  export interface AttrJsoncProp {
    name: string;
    value?: any;
  }

  //#region get attributes from jsonc or json5 file
  /**
   * Get attributes from jsonc or json5 file
   * @param jsonDeepPath lodash path to property in json ex. deep.path.to.prop
   * @param fileContent jsonc or json5 - json with comments
   * @returns array of attributes
   */
  export const getAtrributiesFromJsonWithComments = (
    jsonDeepPath: string, // lodash path to property in json ex. deep.path.to.prop
    fileContent: string, // jsonc or json5 - json with comments
  ): AttrJsoncProp[] => {
    const lines = fileContent.split('\n');
    // split path to parts but keep part if is for example 'sql.js
    const pathParts = jsonDeepPath.split('.').reduce((a, b) => {
      if (a.length === 0) {
        return [b];
      }
      const last: string = a[a.length - 1];
      if (
        (last.startsWith(`['`) && b.endsWith(`']`)) ||
        (last.startsWith(`["`) && b.endsWith(`"]`))
      ) {
        a[a.length - 1] = [last, b].join('.');
      } else {
        a.push(b);
      }
      return a;
    }, []);
    // console.log({ pathParts });
    // const pathParts = jsonDeepPath.split('.');
    const keyName = pathParts.pop()!.replace(/^\["(.+)"\]$/, '$1');
    let currentPath = '';
    let attributes: AttrJsoncProp[] = [];
    let collectedComments: string[] = [];

    for (const line of lines) {
      const trimmedLine = line.trim();

      if (trimmedLine.startsWith('//')) {
        // Collect comments
        collectedComments.push(trimmedLine);
        // trimmedLine.startsWith('//pizda') &&
        //   console.log('pushlin line', { trimmedLine });
      } else if (trimmedLine.startsWith('"') || trimmedLine.startsWith("'")) {
        // Extract the key from the line
        const match = trimmedLine.match(/["']([^"']+)["']\s*:/);
        // console.log({ match0: match && match[0], match1: match && match[1] });
        if (match) {
          const key = match[1];
          currentPath = currentPath
            ? `${currentPath}.${key.includes('.') ? `['${key}']` : key}`
            : key;
          // console.log({ key });
          // Check if the current path matches the jsonDeepPath
          if (
            (currentPath.endsWith(keyName) &&
              !currentPath.endsWith('/' + keyName)) ||
            currentPath.endsWith(`['${keyName}']`)
          ) {
            // console.log('extract attributes', {
            //   keyName,
            //   collectedCommentsLength: collectedComments.length,
            // });
            // Process the collected comments to extract attributes
            attributes = extractAttributesFromComments(collectedComments);
            break;
          }

          // Reset collected comments as they only relate to the next key
          collectedComments = [];
        }
      }
    }

    return attributes;
  };
  //#endregion

  //#region get attributes from comment
  export const getAttributiesFromComment = (
    comment: string,
    attributes: AttrJsoncProp[] = [],
  ): AttrJsoncProp[] => {
    // Match @name=value OR @name
    // Values can be "..." or '...' or unquoted token without @
    const attrRegex = /@(\w+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s@]+)))?/g;
    let match;
    while ((match = attrRegex.exec(comment)) !== null) {
      const [, name, doubleQuoted, singleQuoted, unquoted] = match;
      const value = doubleQuoted ?? singleQuoted ?? unquoted;

      const existingAttribute = attributes.find(
        attr => attr.name === `@${name}`,
      );

      if (existingAttribute) {
        if (value !== undefined) {
          if (Array.isArray(existingAttribute.value)) {
            existingAttribute.value.push(value);
          } else {
            existingAttribute.value = [existingAttribute.value, value];
          }
        }
      } else {
        attributes.push({
          name: `@${name}`,
          value: value !== undefined ? value : true,
        });
      }
    }

    // Normalize single values not to be arrays
    attributes.forEach(attr => {
      if (Array.isArray(attr.value) && attr.value.length === 1) {
        attr.value = attr.value[0];
      }
    });

    return attributes;
  };
  //#endregion

  //#region extract attributes from comments
  const extractAttributesFromComments = (
    comments: string[],
  ): AttrJsoncProp[] => {
    const attributes: AttrJsoncProp[] = [];

    // console.log({ comments });
    for (const comment of comments) {
      getAttributiesFromComment(comment, attributes);
    }

    return attributes;
  };
  //#endregion

  //#region read json
  /**
   * read json from absolute path
   * @returns json object
   */
  export const readJson = (
    absoluteFilePath: string | string[],
    defaultValue = {},
    useJson5 = false, // TODO @LAST change api to simple options
  ): any => {
    //#region @backendFunc
    absoluteFilePath = crossPlatformPath(absoluteFilePath);
    absoluteFilePath = absoluteFilePath as string;

    if (!fse.existsSync(absoluteFilePath)) {
      return {};
    }
    try {
      const fileContent = Helpers.readFile(absoluteFilePath);
      let json;
      // @ts-ignore
      json = Helpers.parse(
        fileContent,
        useJson5 || absoluteFilePath.endsWith('.json5'),
      );
      return json;
    } catch (error) {
      return defaultValue;
    }
    //#endregion
  };
  //#endregion

  //#region read json with comments
  export const readJsonWithComments = (
    absoluteFilePath: string | string[],
    defaultValue: any = {},
  ): any => {
    //#region @backendFunc
    return Helpers.readJson(absoluteFilePath, defaultValue, true);
    //#endregion
  };
  //#endregion
}
//#endregion

//#region utils yaml
export namespace UtilsYaml {
  export const yamlToJson = <FORMAT = any>(yamlString: string): any => {
    //#region @backendFunc
    const yaml = require('js-yaml');
    try {
      const jsonFromYaml = yaml.load(yamlString);
      return jsonFromYaml as FORMAT;
    } catch (error) {
      console.warn(`[UtilsYaml] Error reading YAML`, yamlString);
      return void 0;
    }
    //#endregion
  };

  export const jsonToYaml = (json: any): string => {
    //#region @backendFunc
    const yaml = require('js-yaml');
    try {
      const yamlString = yaml.dump(json, {
        quotingType: '"', // enforce double quotes
        forceQuotes: true,
      });
      return yamlString;
    } catch (error) {
      console.warn(`[UtilsYaml] Error converting JSON to YAML`, json);
      return '';
    }
    //#endregion
  };

  //#region read yaml as json
  export const readYamlAsJson = <FORMAT = any>(
    absFilePathToYamlOrYmlFile: string,
    options?: {
      defaultValue?: FORMAT;
    },
  ): FORMAT => {
    //#region @backendFunc
    options = options || {};
    if (
      !Helpers.exists(absFilePathToYamlOrYmlFile) &&
      !_.isUndefined(options.defaultValue)
    ) {
      return options.defaultValue as FORMAT;
    }
    return UtilsYaml.yamlToJson<FORMAT>(
      Helpers.readFile(absFilePathToYamlOrYmlFile),
    );
    //#endregion
  };
  //#endregion

  //#region write json to yaml
  export const writeJsonToYaml = (
    destinationYamlfileAbsPath: string,
    json: any,
    // options: {},
  ): void => {
    //#region @backendFunc
    if (!_.isObject(json)) {
      json = {};
    }
    const yamlString = jsonToYaml(json);
    Helpers.writeFile(destinationYamlfileAbsPath, yamlString);
    //#endregion
  };
  //#endregion
}
//#endregion

//#region utils filepath metadata
export namespace FilePathMetaData {
  const TERMINATOR = 'xxxxx'; // terminates metadata block
  const KV_SEPARATOR = '...'; // key/value separator
  const PAIR_SEPARATOR = 'IxIxI'; // between pairs

  //#region embed data into filename
  /**
   * Embed metadata into filename while preserving the extension.
   *
   * Example:
   * embedData({ version: "1.2.3", envName: "__" }, "project.zip")
   * -> "version|-|1.2.3||--||envName|-|__|||project.zip"
   *
   * keysMap = {
   *  projectName: "pn",
   *  envName: "en",
   *  version: "v"
   * }
   */
  export const embedData = <
    T extends Record<string, string | number | boolean | undefined>,
  >(
    data: T,
    orgFilename: string,
    options?: {
      skipAddingBasenameAtEnd?: boolean; // default false
      keysMap?: Record<keyof T, string | number | boolean | undefined>; // optional mapping of keys
    },
  ): string => {
    options = options || {};
    const ext = path.extname(orgFilename);
    const base = path.basename(orgFilename, ext);

    const meta = Object.entries(data)
      .map(([key, value]) => {
        if (options.keysMap && options.keysMap[key as keyof T]) {
          key = options.keysMap[key as keyof T] as string;
        }
        return `${key}${KV_SEPARATOR}${value ?? ''}`;
      })
      .join(PAIR_SEPARATOR);

    return `${meta}${TERMINATOR}${
      options.skipAddingBasenameAtEnd ? '' : base
    }${ext}`;
  };
  //#endregion

  //#region extract data from filename
  /**
   * Extract metadata from filename (reverse of embedData).
   *
   * Example:
   * extractData<{ version: string; env: string }>("myfile__version-1.2.3__env-prod.zip")
   * -> { version: "1.2.3", env: "prod" }
   *
   * keysMap = {
   *  projectName: "pn",
   *  envName: "en",
   *  version: "v"
   * }
   */
  export const extractData = <
    T extends Record<string, string | number | boolean | undefined>,
  >(
    filename: string,
    options?: {
      keysMap?: Record<keyof T, string | number | boolean | undefined>; // optional mapping of keys
    },
  ): T => {
    options = options || {};
    const ext = path.extname(filename);
    const thereIsNoExt = ext.includes('|') || ext.includes('-');
    const base = thereIsNoExt ? filename : path.basename(filename, ext);

    // Everything BEFORE the FIRST TERMINATOR
    const idx = base.lastIndexOf(TERMINATOR);
    const metaPart = idx >= 0 ? base.substring(0, idx) : base;

    const data: Record<string, string> = {};

    let cursor = 0;
    while (cursor <= metaPart.length) {
      const sepIdx = metaPart.indexOf(PAIR_SEPARATOR, cursor);
      const segment =
        sepIdx === -1
          ? metaPart.substring(cursor)
          : metaPart.substring(cursor, sepIdx);

      if (segment) {
        const kvIdx = segment.indexOf(KV_SEPARATOR);
        if (kvIdx > -1) {
          const key = segment.substring(0, kvIdx);
          const value = segment.substring(kvIdx + KV_SEPARATOR.length);
          let finalKey = options.keysMap
            ? (Object.keys(options.keysMap || {}).find(
                k => options.keysMap[k as keyof T] === key,
              ) as keyof T)
            : key;
          data[finalKey as string] = value;
        }
      }

      if (sepIdx === -1) break;
      cursor = sepIdx + PAIR_SEPARATOR.length;
    }

    return data as T;
  };
  //#endregion

  //#region get only metadata string
  export const getOnlyMetadataString = (filename: string): string => {
    const ext = path.extname(filename);
    const base = path.basename(filename, ext);

    const idx = base.lastIndexOf(TERMINATOR);
    if (idx === -1) return ''; // no terminator

    const metaPart = base.substring(0, idx);
    if (!metaPart.trim()) return ''; // empty metadata

    return metaPart;
  };
  //#endregion
}
//#endregion

//#region utils dot file
export namespace UtilsDotFile {
  //#region parse value from dot file util
  const parseValue = (rawValue: string): string | number | boolean => {
    const val = rawValue.trim().replace(/^"|"$/g, '');

    // Try boolean
    if (val.toLowerCase() === 'true') return true;
    if (val.toLowerCase() === 'false') return false;

    // Try number
    if (!isNaN(Number(val)) && val !== '') return Number(val);

    return val;
  };
  //#endregion

  //#region set value to/from dot file
  export const setValueToDotFile = (
    dotFileAbsPath: string | string[],
    key: string,
    value: string | number | boolean,
  ): void => {
    //#region @backendFunc
    dotFileAbsPath = crossPlatformPath(dotFileAbsPath);
    let envContent = '';
    if (fse.existsSync(dotFileAbsPath)) {
      envContent = Helpers.readFile(dotFileAbsPath, '');
    } else {
      // Create file if it doesn't exist
      Helpers.writeFile(dotFileAbsPath, '');
      Helpers.logInfo(
        `[${frameworkName}-core] Created ${path.basename(dotFileAbsPath)}`,
      );
      envContent = '';
    }

    const regex = new RegExp(`^${key}=.*$`, 'm');

    if (regex.test(envContent)) {
      // Replace existing
      envContent = envContent.replace(regex, `${key}=${value}`);
    } else {
      // Append new
      if (envContent.length > 0 && !envContent.endsWith('\n')) {
        envContent += '\n';
      }
      envContent += `${key}=${value}\n`;
    }

    Helpers.writeFile(dotFileAbsPath, envContent);
    Helpers.info(
      `[${frameworkName}-core] Updated ${path.basename(
        dotFileAbsPath,
      )}: ${key}=${value}`,
    );
    //#endregion
  };
  //#endregion

  //#region set comment to key in dot file
  export const setCommentToKeyInDotFile = (
    dotFileAbsPath: string | string[],
    key: string,
    comment: string,
  ): void => {
    //#region @backendFunc
    dotFileAbsPath = crossPlatformPath(dotFileAbsPath);

    let envContent = '';
    if (fse.existsSync(dotFileAbsPath)) {
      envContent = Helpers.readFile(dotFileAbsPath, '');
    } else {
      Helpers.writeFile(dotFileAbsPath, '');
      Helpers.logInfo(
        `[${frameworkName}-core] Created ${path.basename(dotFileAbsPath)}`,
      );
      envContent = '';
    }

    // Regex: match line starting with "KEY=" and capture value part
    const regex = new RegExp(`^(${key}=[^#\\n]*)(?:#.*)?$`, 'm');

    if (regex.test(envContent)) {
      // Replace existing comment (strip old, append new)
      envContent = envContent.replace(regex, `$1 # ${comment}`);
    } else {
      // Append as new entry with empty value but with comment
      if (envContent.length > 0 && !envContent.endsWith('\n')) {
        envContent += '\n';
      }
      envContent += `${key}= # ${comment}\n`;
    }

    Helpers.writeFile(dotFileAbsPath, envContent);
    Helpers.info(
      `[${frameworkName}-core] Updated comment for ${key} in ${path.basename(
        dotFileAbsPath,
      )}`,
    );
    //#endregion
  };
  //#endregion

  //#region get value from dot file
  export const getValueFromDotFile = (
    dotFileAbsPath: string | string[],
    key: string,
  ): string | number | boolean => {
    //#region @backendFunc
    dotFileAbsPath = crossPlatformPath(dotFileAbsPath);
    if (!fse.existsSync(dotFileAbsPath)) {
      Helpers.warn(
        `[${frameworkName}-core] File ${path.basename(
          dotFileAbsPath,
        )} does not exist.`,
      );
      return;
    }

    const envContent = fse.readFileSync(dotFileAbsPath, 'utf-8');

    // Parse line by line
    const lines = envContent.split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const [k, ...rest] = trimmed.split('=');
      if (k === key) {
        return parseValue(rest.join('='));
      }
    }
    //#endregion
  };
  //#endregion

  //#region add comment at the beginning of dot file
  export const addCommentAtTheBeginningOfDotFile = (
    dotFileAbsPath: string | string[],
    comment: string,
  ): void => {
    //#region @backendFunc
    dotFileAbsPath = crossPlatformPath(dotFileAbsPath);

    let envContent = '';
    if (fse.existsSync(dotFileAbsPath)) {
      envContent = Helpers.readFile(dotFileAbsPath, '');
    } else {
      Helpers.writeFile(dotFileAbsPath, '');
      Helpers.warn(
        `[${frameworkName}-core] Created ${path.basename(dotFileAbsPath)}`,
      );
      envContent = '';
    }

    const commentLines = comment
      .split('\n')
      .map(line => `# ${line}`)
      .join('\n');

    envContent = `${commentLines}\n${envContent}`;

    Helpers.writeFile(dotFileAbsPath, envContent);
    //#endregion
  };
  //#endregion

  //#region set values keys from object
  export const setValuesKeysFromObject = (
    dotFileAbsPath: string | string[],
    obj: Record<string, string | number | boolean>,
    options?: {
      /**
       * if true, it will overwrite existing keys
       */
      setAsNewFile?: boolean;
    },
  ): void => {
    //#region @backendFunc
    dotFileAbsPath = crossPlatformPath(dotFileAbsPath);
    options = options || {};

    let envContent = options.setAsNewFile
      ? ''
      : Helpers.readFile(dotFileAbsPath, '');

    for (const [key, value] of Object.entries(obj)) {
      const stringValue = String(value);
      const regex = new RegExp(`^${key}=.*$`, 'm');

      if (regex.test(envContent)) {
        envContent = envContent.replace(regex, `${key}=${stringValue}`);
      } else {
        if (envContent.length > 0 && !envContent.endsWith('\n')) {
          envContent += '\n';
        }
        envContent += `${key}=${stringValue}\n`;
      }
    }

    Helpers.writeFile(dotFileAbsPath, envContent);
    //#endregion
  };
  //#endregion

  //#region get values keys as json object
  export const getValuesKeysAsJsonObject = <
    T = Record<string, string | number | boolean>,
  >(
    dotFileAbsPath: string | string[],
  ): T => {
    //#region @backendFunc
    dotFileAbsPath = crossPlatformPath(dotFileAbsPath);

    if (!Helpers.exists(dotFileAbsPath)) {
      return {} as T;
    }
    const envContent = Helpers.readFile(dotFileAbsPath, '');

    const result: Record<string, string | number | boolean> = {};
    const lines = envContent.split(/\r?\n/);

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const [key, ...rest] = trimmed.split('=');
      if (key) {
        result[key] = parseValue(rest.join('='));
      }
    }

    return result as T;
    //#endregion
  };
  //#endregion

  //#region get comments keys as json object
  /**
   * @returns key|comment pairs as json object
   */
  export const getCommentsKeysAsJsonObject = <
    T = Record<string, string | undefined>,
  >(
    dotFileAbsPath: string | string[],
  ): T => {
    //#region @backendFunc
    dotFileAbsPath = crossPlatformPath(dotFileAbsPath);

    if (!Helpers.exists(dotFileAbsPath)) {
      return {} as T;
    }

    const envContent = Helpers.readFile(dotFileAbsPath, '');
    const result: Record<string, string | undefined> = {};
    const lines = envContent.split(/\r?\n/);

    const extractInlineComment = (valuePart: string): string | undefined => {
      // Find the first unquoted `#`
      let inSingle = false;
      let inDouble = false;
      let escaped = false;

      for (let i = 0; i < valuePart.length; i++) {
        const ch = valuePart[i];

        if (escaped) {
          escaped = false;
          continue;
        }

        if (ch === '\\') {
          escaped = true;
          continue;
        }

        if (!inDouble && ch === "'") {
          inSingle = !inSingle;
          continue;
        }

        if (!inSingle && ch === '"') {
          inDouble = !inDouble;
          continue;
        }

        if (!inSingle && !inDouble && ch === '#') {
          // Everything after '#' is the comment
          const raw = valuePart.slice(i + 1);
          const comment = raw.replace(/^\s+/, ''); // trim only leading spaces after '#'
          return comment.length ? comment : '';
        }
      }

      return undefined;
    };

    for (const line of lines) {
      const raw = line;
      const trimmed = raw.trim();

      // Skip empty or full-line comments
      if (!trimmed || trimmed.startsWith('#')) continue;

      // Support optional leading `export `
      const withoutExport = trimmed.startsWith('export ')
        ? trimmed.slice('export '.length).trim()
        : trimmed;

      const eqIdx = withoutExport.indexOf('=');
      if (eqIdx === -1) continue;

      const key = withoutExport.slice(0, eqIdx).trim();
      if (!key) continue;

      const valuePart = withoutExport.slice(eqIdx + 1);

      result[key] = extractInlineComment(valuePart);
    }

    return result as T;
    //#endregion
  };
  //#endregion
}
//#endregion

//#region utils etc hosts
export namespace UtilsEtcHosts {
  export const SIMULATE_DOMAIN_TAG = '@simulatedDomainByTaon';

  //#region utils etc hosts / etc host entry interface
  export interface EtchostEntry {
    lineIp: string;
    domains: string[];
    comment: string;
  }
  //#endregion

  //#region utils etc hosts / get etc hosts path
  export const getPath = (): string => {
    let HOST_FILE_PATH = '';
    //#region @backend
    HOST_FILE_PATH =
      process.platform === 'win32'
        ? 'C:/Windows/System32/drivers/etc/hosts'
        : '/etc/hosts';
    //#endregion
    return crossPlatformPath(HOST_FILE_PATH);
  };
  //#endregion

  //#region utils etc hosts / get lines from etc hosts
  export const getLines = (): string[] => {
    //#region @backendFunc
    const hostsPath = getPath();
    const content = Helpers.readFile(hostsPath, '');
    return content.split(/\r?\n/) || [];
    //#endregion
  };
  //#endregion

  //#region utils etc hosts / get tokens from line
  export const getTokensData = (
    line: string,
  ): {
    comment: string;
    domains: string[];
    lineIp: string;
  } => {
    //#region @backendFunc
    const empty = {
      domains: [],
      lineIp: '',
      comment: '',
    } as ReturnType<typeof UtilsEtcHosts.getTokensData>;

    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return empty;

    // Split off inline comment
    const [entryPart, ...commentParts] = trimmed.split('#');
    const comment = commentParts.length ? commentParts.join('#').trim() : '';

    const tokens = entryPart.trim().split(/\s+/);
    if (tokens.length < 2) return empty;

    const [lineIp, ...domains] = tokens;

    return {
      lineIp,
      comment,
      domains,
    };
    //#endregion
  };
  //#endregion

  //#region utils etc hosts / specyfic entry exists
  export const specificEntryExists = (domain: string, ip: string): boolean => {
    //#region @backendFunc
    const lines = getLines();
    for (const line of lines) {
      const { lineIp, domains } = getTokensData(line);
      if (lineIp === ip && domains.includes(domain)) {
        return true;
      }
    }
    return false;
    //#endregion
  };
  //#endregion

  //#region utils etc hosts / get Etc Host Entry By Domain
  export const getEntriesByDomain = (
    domain: string,
  ): UtilsEtcHosts.EtchostEntry[] => {
    //#region @backendFunc
    if (!domain || /\s/.test(domain)) {
      throw new Error('Invalid domain');
    }
    const entries: UtilsEtcHosts.EtchostEntry[] = [];
    const lines = UtilsEtcHosts.getLines();

    for (const line of lines) {
      const data = UtilsEtcHosts.getTokensData(line);
      const { comment, domains, lineIp } = data;
      if (domains.includes(domain)) {
        entries.push(data);
      }
    }

    return entries;
    //#endregion
  };
  //#endregion

  //#region utils etc hosts / get etc host entries by comment
  export const getEntryByComment = (
    commentOfEntry: string,
  ): UtilsEtcHosts.EtchostEntry[] => {
    //#region @backendFunc
    if (!commentOfEntry || /\s/.test(commentOfEntry)) {
      throw new Error('Invalid comment');
    }

    const entries: UtilsEtcHosts.EtchostEntry[] = [];
    const lines = UtilsEtcHosts.getLines();

    for (const line of lines) {
      const data = UtilsEtcHosts.getTokensData(line);
      const { comment, domains, lineIp } = data;
      if (comment === commentOfEntry && domains.length > 0) {
        entries.push(data);
      }
    }

    return entries;
    //#endregion
  };
  //#endregion

  //#region utils etc hosts / get etc host entries by ip
  /**
   * Returns all host entries for a given IP address.
   */
  export const getEntriesByIp = (ip: string): UtilsEtcHosts.EtchostEntry[] => {
    //#region @backendFunc

    if (!ip || /\s/.test(ip)) {
      throw new Error('Invalid IP address');
    }

    const lines = UtilsEtcHosts.getLines();
    const results: Omit<UtilsEtcHosts.EtchostEntry, 'ip'>[] = [];

    for (const line of lines) {
      const data = UtilsEtcHosts.getTokensData(line);
      const { comment, domains, lineIp } = data;
      if (lineIp === ip && domains.length > 0) {
        results.push(data);
      }
    }

    return results;
    //#endregion
  };
  //#endregion

  //#region utils etc hosts / remove entry by domain
  export const removeEntryByDomain = (domain: string): void => {
    //#region @backendFunc
    const hostsPath = getPath();

    const lines = getLines();

    // Filter out lines containing the specified domain
    const filteredLines = lines.filter(line => {
      const { domains } = getTokensData(line);
      return !domains.includes(domain);
    });

    // Write the updated content back to the hosts file
    Helpers.writeFile(hostsPath, filteredLines.join(os.EOL));
    //#endregion
  };
  //#endregion

  //#region utils etc hosts / simulate domain in etc hosts
  export const simulateDomain = async (
    domainOrDomains: string | string[],
    options?: {
      triggerRevertChangesToEtcHosts?: Subject<void>;
    },
  ): Promise<void> => {
    //#region @backendFunc
    options = options || {};
    domainOrDomains = _.isArray(domainOrDomains)
      ? domainOrDomains
      : [domainOrDomains];
    for (const domain of domainOrDomains) {
      if (!UtilsNetwork.isValidDomain(domain)) {
        Helpers.error(`Invalid domain: "${domain}"`, false, true);
      }
    }

    if (!(await isElevated())) {
      Helpers.error(
        `You must run this command with elevated privileges (sudo or as administrator)`,
        false,
        true,
      );
    }

    return await new Promise(resolve => {
      for (const domain of domainOrDomains) {
        const url = new URL(
          domain.startsWith('http') ? domain : `http://${domain}`,
        );
        UtilsNetwork.setEtcHost(url.hostname, '127.0.0.1', SIMULATE_DOMAIN_TAG);
      }

      Helpers.info(`

      You can access the simulated domain(s) at:

${domainOrDomains
  .map(domain => {
    const url = new URL(
      domain.startsWith('http') ? domain : `http://${domain}`,
    );
    return chalk.underline(`\thttps://${url.hostname}`);
  })
  .join('\n')}

      (${
        domainOrDomains.length <= 1 ? 'Domain is' : 'Domains are'
      } now pointing to ${chalk.bold('localhost')}):

      your etc host path:
      ${chalk.underline(UtilsNetwork.getEtcHostsPath())}

     ${
       !options.triggerRevertChangesToEtcHosts
         ? `PRESS ANY KEY TO STOP REMOVE DOMAIN FROM /etc/hosts
      AND STOP SIMULATION`
         : ''
     }

      `);
      let closing = false;
      const revertChanges = () => {
        console.log(
          `Removing domain(s) from ${UtilsNetwork.getEtcHostsPath()} ...`,
        );
        for (const domain of domainOrDomains) {
          const url = new URL(
            domain.startsWith('http') ? domain : `http://${domain}`,
          );
          UtilsNetwork.removeEtcHost(url.hostname);
        }
      };

      if (options.triggerRevertChangesToEtcHosts) {
        const sub = options.triggerRevertChangesToEtcHosts.subscribe(() => {
          if (closing) {
            return;
          }
          revertChanges();
          sub.unsubscribe();
        });
        resolve(void 0);
      } else {
        const currentRawMode = process.stdin.isRaw;
        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.on('data', () => {
          if (closing) {
            return;
          }

          closing = true;
          revertChanges();
          process.stdin.setRawMode(currentRawMode);
          resolve(void 0);
        });
      }
    });

    //#endregion
  };
  //#endregion
}

//#endregion

//#region utils network
export namespace UtilsNetwork {
  //#region utils network / online server check
  export interface PingResult {
    host: string;
    success: boolean;
    timeMs?: number; // latency if available
    output?: string; // raw ping output
  }

  export async function checkPing(
    host: string,
    timeoutMs = 3000,
  ): Promise<PingResult> {
    //#region @backendFunc
    return new Promise(resolve => {
      const platform = process.platform;

      // platform-specific args
      let args: string[] = [];
      if (platform === 'win32') {
        // Windows ping sends 4 by default; set count to 1 and timeout in ms
        args = ['-n', '1', '-w', String(timeoutMs), host];
      } else {
        // macOS & Linux use -c count and -W timeout (in seconds)
        const timeoutSec = Math.ceil(timeoutMs / 1000);
        args = ['-c', '1', '-W', String(timeoutSec), host];
      }

      const child = spawn('ping', args);

      let output = '';
      child.stdout.on('data', d => (output += d.toString()));
      child.stderr.on('data', d => (output += d.toString()));

      const onDone = (success: boolean) => {
        const timeMatch = output.match(/time[=<]([\d.]+)\s*ms/i);
        const timeMs = timeMatch ? parseFloat(timeMatch[1]) : undefined;
        resolve({ host, success, timeMs, output: output.trim() });
      };

      const timer = setTimeout(() => {
        child.kill('SIGKILL');
        onDone(false);
      }, timeoutMs + 500);

      child.on('exit', code => {
        clearTimeout(timer);
        onDone(code === 0);
      });
    });
    //#endregion
  }

  export const checkIfServerPings = async (
    host: string,
    timeoutMs = 3000,
  ): Promise<boolean> => {
    //#region @backendFunc
    const result = await checkPing(host, timeoutMs);
    return result.success;
    //#endregion
  };

  /**
   * Check if a server is online by attempting to open a TCP connection.
   */
  export const checkIfServerOnline = async (
    host: string,
    port = 80,
    timeoutMs = 3000,
  ): Promise<boolean> => {
    //#region @backendFunc
    return new Promise(resolve => {
      const socket = new net.Socket();

      const onError = (): void => {
        socket.destroy();
        resolve(false);
      };

      socket.setTimeout(timeoutMs);
      socket.on('error', onError);
      socket.on('timeout', onError);

      socket.connect(port, host, () => {
        socket.end();
        resolve(true);
      });
    });
    //#endregion
  };
  //#endregion

  //#region utils network / isValidIp
  export const isValidIp = (ip: string): boolean => {
    if (!_.isString(ip)) {
      return false;
    }
    ip = ip.trim();
    if (ip === 'localhost') {
      return true;
    }
    return /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(
      ip,
    );
  };
  //#endregion

  //#region utils network / isValidDomain
  export const isValidDomain = (
    url: string,
    options?: {
      /**
       * if yes - domain should start with http:// or https://
       */
      shouldIncludeProtocol?: boolean | 'http' | 'https';
    },
  ): boolean => {
    if (!url || typeof url !== 'string') return false;

    const shouldIncludeProtocol = !!options?.shouldIncludeProtocol;

    // Build regex depending on protocol requirement
    const domainRegex = shouldIncludeProtocol
      ? /^(https?:\/\/)([a-zA-Z0-9-]{1,63}\.)+[a-zA-Z]{2,}$/ // with protocol
      : /^([a-zA-Z0-9-]{1,63}\.)+[a-zA-Z]{2,}$/; // without protocol

    if (
      typeof options?.shouldIncludeProtocol === 'string' &&
      options?.shouldIncludeProtocol === 'http' &&
      !url.startsWith('http://')
    ) {
      return false; // if http is required, but url does not start with http://
    }
    if (
      typeof options?.shouldIncludeProtocol === 'string' &&
      options?.shouldIncludeProtocol === 'https' &&
      !url.startsWith('https://')
    ) {
      return false; // if https is required, but url does not start with https://
    }

    return domainRegex.test(url.trim());
  };
  //#endregion

  //#region utils network / urlParse
  export const urlParse = (
    portOrHost: number | string | URL,
    options?: {
      forceDomain?: boolean;
      httpsIfNotProvided?: boolean;
    },
  ): URL => {
    options = options || {};
    let url: URL;
    const defaultProtocol = options.httpsIfNotProvided ? 'https:' : 'http:';
    if (portOrHost instanceof URL) {
      url = portOrHost;
    } else if (_.isNumber(portOrHost)) {
      url = new URL(`${defaultProtocol}//localhost:${portOrHost}`);
    } else if (!_.isNaN(Number(portOrHost))) {
      url = new URL(`${defaultProtocol}//localhost:${Number(portOrHost)}`);
    } else if (_.isString(portOrHost)) {
      try {
        url = new URL(portOrHost);
      } catch (error) {}
      if (isValidIp(portOrHost)) {
        try {
          url = new URL(`${defaultProtocol}//${portOrHost}`);
        } catch (error) {
          Helpers.warn(`Not able to get port from ${portOrHost}`);
        }
      }
      if (options.forceDomain) {
        const domain = portOrHost as string;
        url = new URL(
          domain.startsWith('http') ? domain : `http://${portOrHost}`,
        );
      }
    }
    return url;
  };
  //#endregion

  //#region utils network / get etc hosts path
  export const getEtcHostsPath = UtilsEtcHosts.getPath;
  //#endregion

  //#region utils network / simulate domain tag constant
  /**
   * @deprecated use UtilsEtcHosts.SIMULATE_DOMAIN_TAG instead
   */
  export const SIMULATE_DOMAIN_TAG = UtilsEtcHosts.SIMULATE_DOMAIN_TAG;
  //#endregion

  //#region utils network / setEtcHost
  /**
   * Add or update a hosts entry
   */
  export const setEtcHost = (
    domain: string,
    ip: string = '127.0.0.1',
    comment: string = '',
  ): void => {
    //#region @backendFunc
    const hostsPath = getEtcHostsPath();

    if (!domain || /\s/.test(domain)) {
      throw new Error('Invalid domain');
    }

    let content = fse.readFileSync(hostsPath, 'utf8').split(/\r?\n/);

    // Remove any existing lines with this domain
    content = content.filter(
      line =>
        !new RegExp(
          `\\b${Utils.escapeStringForRegEx(domain, {
            skipEscapeSlashAndDash: true,
          })}\\b`,
        ).test(line),
    );

    // Add new entry
    const entry = `${ip} ${domain}${comment ? ` # ${comment}` : ''}`;
    content.push(entry);

    fse.writeFileSync(hostsPath, content.join(os.EOL), 'utf8');
    //#endregion
  };
  //#endregion

  //#region utils network / get Etc Host Entry By Domain
  /**
   * @deprecated use UtilsEtcHosts.getEntriesByDomain instead
   */
  export const getEtcHostEntriesByDomain = UtilsEtcHosts.getEntriesByDomain;
  //#endregion

  //#region utils network / get etc host entries by comment
  /**
   * @deprecated use UtilsEtcHosts.getEntryByComment instead
   */
  export const getEtcHostEntryByComment = UtilsEtcHosts.getEntryByComment;
  //#endregion

  //#region utils network / get etc host entries by ip
  /**
   * @deprecated use UtilsEtcHosts.getEntriesByIp instead
   */
  export const getEtcHostEntryByIp = UtilsEtcHosts.getEntriesByIp;
  //#endregion

  //#region utils network / removeEtcHost
  /**
   * Remove all lines containing the given domain
   * @deprecated use UtilsEtcHosts.removeEntryByDomain instead
   */
  export const removeEtcHost = UtilsEtcHosts.removeEntryByDomain;
  //#endregion

  //#region utils network / etc host without localhost
  export const etcHostHasProperLocalhostIp4Entry = (): boolean => {
    //#region @backendFunc
    let localhost = getEtcHostEntryByIp('127.0.0.1');
    return localhost.some(entry => entry.domains.includes('localhost'));
    //#endregion
  };

  export const etcHostHasProperLocalhostIp6Entry = (): boolean => {
    //#region @backendFunc
    let localhost = getEtcHostEntryByIp('::1');
    return localhost.some(entry => entry.domains.includes('localhost'));
    //#endregion
  };

  //#endregion

  //#region utils network / simulate domain in etc hosts
  /**
   * @deprecated use UtilsEtcHosts.simulateDomain instead
   */
  export const simulateDomain = UtilsEtcHosts.simulateDomain;
  //#endregion

  //#region utils network / get local public ip addresses

  //#region utils network / get local public ip addresses / local ip info interface
  export interface LocalIpInfo {
    interfaceName: string;
    address: string;
    family: 'IPv4' | 'IPv6';
    internal: boolean;
    type: 'lan' | 'wifi' | 'other' | 'virtual';
  }
  //#endregion

  //#region utils network / get local public ip addresses / get interface type from name
  const isVirtualInterface = (name: string): boolean => {
    const lname = name.toLowerCase();
    return (
      lname.includes('virtual') ||
      lname.includes('vmware') ||
      lname.includes('vbox') ||
      lname.includes('hyper-v') ||
      lname.includes('wsl') ||
      lname.includes('docker') ||
      lname.includes('veth') ||
      lname.includes('default switch')
    );
  };

  const interfaceTypeFromName = (name: string): LocalIpInfo['type'] => {
    const lname = name.toLowerCase();

    if (isVirtualInterface(lname)) return 'virtual';
    if (lname.includes('eth') || lname.includes('en') || lname.includes('lan'))
      return 'lan';
    if (
      lname.includes('wl') ||
      lname.includes('wi-fi') ||
      lname.includes('wifi')
    )
      return 'wifi';
    return 'other';
  };

  const sortByPriority = (a: LocalIpInfo, b: LocalIpInfo): number => {
    const typePriority = { lan: 1, wifi: 2, other: 3, virtual: 4 };
    const pa = typePriority[a.type];
    const pb = typePriority[b.type];
    if (pa !== pb) return pa - pb;

    // Secondary heuristic for tie-breaking (e.g., Ethernet 5 before vEthernet)
    const nameA = a.interfaceName.toLowerCase();
    const nameB = b.interfaceName.toLowerCase();

    // prefer physical-looking names
    const physPriority = (name: string) =>
      name.includes('ethernet') && !name.includes('vethernet') ? 0 : 1;

    const diff = physPriority(nameA) - physPriority(nameB);
    if (diff !== 0) return diff;

    return nameA.localeCompare(nameB);
  };
  //#endregion

  //#region utils network / get local public ip addresses / get local ip addresses
  /**
   * Returns all local IP addresses in preferred order:
   * LAN → Wi-Fi → Other → Virtual
   */
  export const getLocalIpAddresses = async (): Promise<LocalIpInfo[]> => {
    const interfaces = os.networkInterfaces();
    const all: LocalIpInfo[] = [];

    for (const [name, addrs] of Object.entries(interfaces)) {
      if (!addrs) continue;
      for (const addr of addrs) {
        if (addr.internal) continue;
        all.push({
          interfaceName: name,
          address: addr.address,
          family: addr.family as 'IPv4' | 'IPv6',
          internal: addr.internal,
          type: interfaceTypeFromName(name),
        });
      }
    }

    all.sort(sortByPriority);
    return all;
  };
  //#endregion

  //#region utils network / get local public ip addresses / get first local active ip address
  /**
   * Returns first active local ipv4 IP (LAN preferred over Wi-Fi).
   */
  export const getFirstIpV4LocalActiveIpAddress = async (): Promise<
    string | null
  > => {
    const all = await getLocalIpAddresses().then(a =>
      a.filter(f => f.family === 'IPv4'),
    );
    return all.length > 0 ? all[0].address : null;
  };
  //#endregion

  //#region utils network / get local public ip addresses / get current public ip address
  /**
   * Returns current public IP address (or null if undetectable).
   */
  export const getCurrentPublicIpAddress = async (): Promise<string | null> => {
    const urls = [
      'https://api.ipify.org?format=json',
      'https://ifconfig.me/ip',
      'https://icanhazip.com',
    ];

    for (const url of urls) {
      try {
        const ip = await new Promise<string>((resolve, reject) => {
          https
            .get(url, res => {
              let data = '';
              res.on('data', chunk => (data += chunk));
              res.on('end', () => {
                try {
                  const match = data.match(
                    /(\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b)/,
                  );
                  if (match) resolve(match[1]);
                  else if (data.trim().length > 0) resolve(data.trim());
                  else reject(new Error('no ip found'));
                } catch (e) {
                  reject(e);
                }
              });
            })
            .on('error', reject)
            .setTimeout(3000, () => reject(new Error('timeout')));
        });
        if (ip) return ip;
      } catch {
        // try next
      }
    }
    return null;
  };
  //#endregion

  //#endregion
}
//#endregion

//#region utils process logger
/**
 * Utils for logging ChildProcess output to files.
 * - logging stdout and stderr to files
 * - real-time monitoring of output
 * - special event callbacks on specific output strings
 * - caching last N lines of output for quick access
 */
export namespace UtilsProcessLogger {
  //#region utils process / process file logger options
  export interface ProcessFileLoggerOptions
    extends Record<string, string | number | boolean | undefined> {
    name: string;
    id?: string | number;
    pid?: number;
    ppid?: number;
    hash?: string;
    utime?: string;
  }
  //#endregion

  //#region utils process / special event in process logger
  export interface SpecialEventInProcessLogger {
    stdout?: {
      stringInStream: string;
      callback: (data: string) => void;
    }[];
    stderr?: {
      stringInStream: string;
      callback: (data: string) => void;
    }[];
  }
  //#endregion

  //#region utils process / constants
  const dummyFilename = 'file.log';

  export const baseDirTaonProcessLogs = crossPlatformPath([
    UtilsOs.getRealHomeDir(),
    '.taon',
    'log-files-for',
  ]);
  //#endregion

  //#region utils process / get log files
  export const getLogsFiles = <
    T extends ProcessFileLoggerOptions = ProcessFileLoggerOptions,
  >(
    options: T,
    baseDir: string,
  ): string[] => {
    //#region @backendFunc
    if (!fse.existsSync(baseDir)) return [];
    const files = fse.readdirSync(baseDir);
    return files
      .filter(filesBasename => {
        const processName = FilePathMetaData.embedData(options, dummyFilename, {
          skipAddingBasenameAtEnd: true,
        });

        return (
          filesBasename.startsWith(processName) &&
          filesBasename.endsWith('.log')
        );
      })
      .map(f => crossPlatformPath([baseDir, f]));
    //#endregion
  };
  //#endregion

  //#region utils process / process file logger class
  /**
   * Logs the stdout and stderr of a ChildProcess to a file.
   */
  export class ProcessFileLogger<
    T extends ProcessFileLoggerOptions = ProcessFileLoggerOptions,
  > {
    //#region fields & getters
    private _logFilePath: string | null = null;

    private writeStream: WriteStream | null = null;

    private _processLogFilename: string | null = null;

    private lastNLinesFromStderr: string[] = [];

    private lastNLinesFromStdout: string[] = [];

    private lastNLinesFromOfOutput: string[] = [];

    public get processLogFilename(): string | null {
      return this._processLogFilename;
    }

    public get processLogAbsFilePath(): string | null {
      return this._logFilePath;
    }
    //#endregion

    //#region constructor
    constructor(
      /**
       * Options used to generate the log file name.
       */
      private dataForFilename: T,
      private options?: {
        baseDir?: string;
        specialEvent?: SpecialEventInProcessLogger;
      },
    ) {
      //#region @backend
      this.options = options || {};
      this.options.baseDir = this.options.baseDir || baseDirTaonProcessLogs;

      try {
        fse.mkdirSync(this.options.baseDir, { recursive: true });
      } catch (error) {
        Helpers.warn(
          `[ProcessFileLogger]: Could not create log directory: ${this.options.baseDir}`,
        );
      }
      //#endregion
    }
    //#endregion

    //#region start logging
    startLogging(
      proc: ChildProcess,
      cacheCallback?: {
        /**
         * @default 40
         */
        cacheLinesMax?: number;
        /**
         * Throttle in ms for callback update()
         */
        throttleMs?: number;
        /**
         * Special callback function for saving stuff in db/memory or elsewhere
         */
        update: (opt: {
          outputLines: string;
          stderrLines: string;
          stdoutLines: string;
        }) => void;
      },
    ): void {
      //#region @backendFunc
      const options = _.cloneDeep(this.dataForFilename);
      const utime = options.utime
        ? options.utime
        : new Date().toISOString().replace(/[:.]/g, '-');

      const hash = options.hash
        ? options.hash
        : crypto.randomBytes(4).toString('hex');

      options.utime = utime;
      options.hash = hash;

      const filenameWithMetadata = FilePathMetaData.embedData(
        options,
        dummyFilename,
        {
          skipAddingBasenameAtEnd: true,
        },
      );

      this._processLogFilename = `${filenameWithMetadata}.log`;
      this._logFilePath = crossPlatformPath([
        this.options.baseDir,
        this._processLogFilename,
      ]);

      this.writeStream = fse.createWriteStream(this._logFilePath, {
        flags: 'a',
      });

      if (cacheCallback) {
        cacheCallback.cacheLinesMax = cacheCallback.cacheLinesMax || 40;
        cacheCallback.throttleMs = cacheCallback.throttleMs || 1000;
        this.lastNLinesFromOfOutput = [];
        this.lastNLinesFromStderr = [];
        this.lastNLinesFromStdout = [];
      }

      const throttledUpdate = cacheCallback
        ? _.throttle(() => {
            cacheCallback.update({
              outputLines: this.lastNLinesFromOfOutput.join(''),
              stderrLines: this.lastNLinesFromStderr.join(''),
              stdoutLines: this.lastNLinesFromStdout.join(''),
            });
          }, cacheCallback.throttleMs)
        : null;

      const update = (data: Buffer | string, type: 'stdout' | 'stderr') => {
        if (cacheCallback) {
          this.lastNLinesFromOfOutput.push(data.toString());
          if (type === 'stdout') {
            this.lastNLinesFromStdout.push(data.toString());
          }
          if (type === 'stderr') {
            this.lastNLinesFromStderr.push(data.toString());
          }

          // trim stuff
          this.lastNLinesFromOfOutput = this.lastNLinesFromOfOutput.slice(
            -cacheCallback.cacheLinesMax,
          );
          this.lastNLinesFromStdout = this.lastNLinesFromStdout.slice(
            -cacheCallback.cacheLinesMax,
          );
          this.lastNLinesFromStderr = this.lastNLinesFromStderr.slice(
            -cacheCallback.cacheLinesMax,
          );
          throttledUpdate();
        }

        if (!this.writeStream) return;

        if (type === 'stdout') {
          // ! TODO @LAST add throttled for this
          for (const c of this.options.specialEvent?.stdout || []) {
            if (data?.toString().includes(c.stringInStream || '')) {
              c.callback && c.callback(data.toString());
            }
          }
        }

        if (type === 'stderr') {
          // ! TODO @LAST add throttled for this
          for (const c of this.options.specialEvent?.stderr || []) {
            if (data?.toString().includes(c.stringInStream || '')) {
              c.callback && c.callback(data.toString());
            }
          }
        }

        this.writeStream.write(
          `[${new Date().toISOString()}] [${type}] ${data.toString()}`,
        );
      };

      proc.stdout?.on('data', d => update(d, 'stdout'));
      proc.stderr?.on('data', d => update(d, 'stderr'));

      // prevent leaks
      proc.on('close', () => this.stopLogging());
      proc.on('exit', () => this.stopLogging());
      proc.on('error', () => this.stopLogging());
      //#endregion
    }
    //#endregion

    //#region stop logging
    stopLogging(): void {
      //#region @backendFunc
      if (this.writeStream) {
        this.writeStream.end();
        this.writeStream = null;
      }
      //#endregion
    }
    //#endregion

    //#region external update
    /**
     * Externally update the log file with additional stdout/stderr data.
     */
    update(stdout: string, stderr?: string): void {
      //#region @backendFunc
      if (!this.writeStream) return;
      if (stdout)
        this.writeStream.write(
          `[${new Date().toISOString()}] [stdout] ${stdout}\n`,
        );
      if (stderr)
        this.writeStream.write(
          `[${new Date().toISOString()}] [stderr] ${stderr}\n`,
        );
      //#endregion
    }
    //#endregion
  }
  //#endregion

  //#region utils process / create sticky top box
  /**
   * Perfect for real-time logs with a sticky top box message.
   *
   * Example:
   * const stickyBox = UtilsProcessLogger.createStickyTopBox('My Sticky Message');
   * stickyBox.update('Initial log content...');
   *
   * // Later updates
   * stickyBox.update('More log content...');
   *
   * // To clear the sticky box and logs
   * stickyBox.clear();
   */
  export const createStickyTopBox = (message: string) => {
    //#region @backendFunc
    const readline = require('readline');
    const boxLines = buildBox(message);
    let logBuffer: string[] = [];
    let terminalHeight = UtilsTerminal.getTerminalHeight();

    // auto update height when user resizes terminal
    process.stdout.on('resize', () => {
      terminalHeight = UtilsTerminal.getTerminalHeight();
      render();
    });

    function update(content: string): void {
      logBuffer = content.split(/\r?\n/);
      render();
    }

    function render(): void {
      const width = process.stdout.columns || 80;
      const height = Math.max(UtilsTerminal.getTerminalHeight(), 10);
      const boxHeight = boxLines.length + 2; // header + blank line
      const availableHeight = Math.max(1, height - boxHeight - 1);

      // split logs into visual lines based on terminal width
      const wrapped: string[] = [];
      for (const line of logBuffer) {
        if (line.length <= width) {
          wrapped.push(line);
        } else {
          // wrap very long lines manually
          for (let i = 0; i < line.length; i += width) {
            wrapped.push(line.slice(i, i + width));
          }
        }
      }

      // keep only what fits vertically
      const visibleLogs = wrapped.slice(-availableHeight);

      const readline = require('readline');
      readline.cursorTo(process.stdout, 0, 0);
      readline.clearScreenDown(process.stdout);

      process.stdout.write(boxLines.join('\n') + '\n\n');
      process.stdout.write(visibleLogs.join('\n') + '\n');
    }

    function clear(): void {
      readline.cursorTo(process.stdout, 0, 0);
      readline.clearScreenDown(process.stdout);
    }

    return { update, clear };
    //#endregion
  };

  const buildBox = (message: string): string[] => {
    //#region @backendFunc
    const width = process.stdout.columns || 80;
    const topBottom = '─'.repeat(width);

    const messageLines = message.split(/\r?\n/).map(line => {
      const inner = ` ${line.trim()} `;
      const pad = Math.max(0, width - inner.length - 2);
      return `│${inner}${' '.repeat(pad)}│`;
    });

    return [topBottom, ...messageLines, topBottom];
    //#endregion
  };
  //#endregion
}
//#endregion

//#region utils cli
/**
 * Easy way to connect CLI commands to cli class methods.
 *
 * Example:
 * in clic class
 *
 * $FirstCli {
 *   static [UtilsCliClassMethod.staticClassNameProperty] = '$FirstCli';
 *
 *   @UtilsCliClassMethod.decoratorMethod('doSomething')
 *   doSomething() {
 *     console.log('doing something');
 *   }
 * }
 *
 * UtilsCliClassMethod.getFrom($FirstCli.prototype.doSomething) // "firstcli:dosomething"
 *
 */
export namespace UtilsCliClassMethod {
  const CLI_METHOD_KEY = Symbol('cliMethod');
  const unknowClass = 'unknownclass';

  // does not work
  // export const decoratorClass = (className: string) => {
  //   return function (target: Function) {
  //     // console.log(target);
  //     // console.log('Decorating class with CLI name:', className);
  //     // debugger;
  //     // const classFn = (target?.constructor || {}) as Function;
  //     target[CoreModels.ClassNameStaticProperty] = className;
  //     return target;
  //   };
  // };

  export const staticClassNameProperty = CoreModels.ClassNameStaticProperty;

  export const decoratorMethod = (methodName: string): MethodDecorator => {
    return (target, propertyKey, descriptor) => {
      //#region @backendFunc
      // If name not given, fallback to property key
      const classFnConstructor = (target?.constructor || {}) as Function;
      const className =
        target[CoreModels.ClassNameStaticProperty] ||
        classFnConstructor[CoreModels.ClassNameStaticProperty] ||
        unknowClass;

      if (!className || className === unknowClass) {
        // debugger;
      }
      Reflect.defineMetadata(
        CLI_METHOD_KEY,
        `${_.camelCase(className).toLowerCase()}` +
          `:${_.camelCase(
            (methodName as string) ?? (propertyKey as string),
          ).toLowerCase()}`,
        descriptor.value!,
      );
      //#endregion
    };
  };

  export const getFrom = <ARGS_TO_PARSE extends object = any>(
    ClassPrototypeMethodFnHere: Function,
    options?: {
      globalMethod?: boolean;
      /**
       * arguments to parse into CLI format
       * Example: { projectName: "myproj", envName: "prod" } => "--projectName=myproj --envName=prod"
       * TODO @LAST add support for DEEP args parsing with lodash-walk-object
       */
      argsToParse?: ARGS_TO_PARSE;
    },
  ): string => {
    //#region @backendFunc
    options = options || {};
    const fullCliMethodName = Reflect.getMetadata(
      CLI_METHOD_KEY,
      ClassPrototypeMethodFnHere,
    ) as string;
    if (!fullCliMethodName) {
      console.log('prototype: ', ClassPrototypeMethodFnHere);
      throw new Error(
        `No CLI method metadata found. Did you forget to add @UtilsCliClassMethod.decoratorMethod('methodName')?`,
      );
    }

    // TODO move load walk to tnp-core
    // import { walk } from 'lodash-walk-object';

    // TODO @LAST move stuff
    // walk.Object(options.argsToParse || {}, (key, value) => {
    //   if (value === undefined || value === null) {
    //     delete options.argsToParse[key];
    //   }
    // });

    const argsToParse = options.argsToParse
      ? Object.keys(options.argsToParse)
          .map(key => `--${key}=${options.argsToParse}`)
          .join(' ')
      : '';

    if (options.globalMethod) {
      return fullCliMethodName.split(':')[1] + ` ${argsToParse}`;
    }
    if (
      !options.globalMethod &&
      fullCliMethodName.startsWith(`${unknowClass}:`)
    ) {
      throw new Error(
        `Cannot get CLI method for unknown class. Did you forget to add @CLASS.NAME('ClassName') to the class?`,
      );
    }
    return fullCliMethodName + ` ${argsToParse}`;
    //#endregion
  };
}
//#endregion
