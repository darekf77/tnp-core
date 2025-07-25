//#region imports
import { Blob } from 'buffer';
import { ChildProcess } from 'child_process';
import * as net from 'net';
import { promisify } from 'util';

import axios, { AxiosResponse } from 'axios';

import {
  path,
  _,
  crossPlatformPath,
  os,
  chalk,
  win32Path,
} from './core-imports';
import { dateformat } from './core-imports';
import { spawn, child_process } from './core-imports';
import { fse } from './core-imports';
import { CoreModels } from './core-models';

import { Helpers } from './index';
//#endregion

const BLOB_SUPPORTED_IN_SQLJS = false;

//#region utils
export namespace Utils {
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
  export const escapeStringForRegEx = (stringForRegExp: string) => {
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
          `[taon-helpers]] failed to assign free port after ${max} trys...`,
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

  //#region json
  interface AttrJsoncProp {
    name: string;
    value?: any;
  }
  export namespace json {
    export const getAtrributies = (
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

    const extractAttributesFromComments = (
      comments: string[],
    ): AttrJsoncProp[] => {
      const attributes: AttrJsoncProp[] = [];
      const attrRegex = /@(\w+)(?:\s*=\s*([^\s@]+))?/g;
      // console.log({ comments });
      for (const comment of comments) {
        let match;
        while ((match = attrRegex.exec(comment)) !== null) {
          const [, name, value] = match;

          const existingAttribute = attributes.find(
            attr => attr.name === `@${name}`,
          );

          if (existingAttribute) {
            if (value) {
              if (Array.isArray(existingAttribute.value)) {
                existingAttribute.value.push(value);
              } else {
                existingAttribute.value = [existingAttribute.value, value];
              }
            }
          } else {
            attributes.push({
              name: `@${name}`,
              value: value ? value : true,
            });
          }
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
  }
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
      const env = { ...process.env, FORCE_COLOR: '1', NODE_ENV: 'development' };
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

  export const isRunningInSSRMode = (): boolean => {
    return typeof globalThis.window === 'undefined';
  };

  //#region utils os / is running in electron
  /**
   * check whether the current process is running inside
   * Electron backend or browser.
   */
  export const isRunningInElectron = (): boolean => {
    if (UtilsOs.isRunningInSSRMode()) {
      return false; // no ssr for electron
    }
    // Renderer process
    // @ts-ignore
    if (
      typeof window !== 'undefined' &&
      typeof window.process === 'object' &&
      // @ts-ignore
      window.process.type === 'renderer'
    ) {
      return true;
    }

    // Main process
    // @ts-ignore
    if (
      typeof process !== 'undefined' &&
      typeof process.versions === 'object' &&
      !!process.versions.electron
    ) {
      return true;
    }

    // Detect the user agent when the `nodeIntegration` option is set to false
    if (
      typeof navigator === 'object' &&
      typeof navigator.userAgent === 'string' &&
      navigator.userAgent.indexOf('Electron') >= 0
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
      const cgroup = fse.readFileSync('/proc/1/cgroup', 'utf8');
      return /docker|kubepods|containerd/.test(cgroup);
    } catch (e) {
      return false; // If the file does not exist or cannot be read, assume not running in Docker
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
  }

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

  export const isElectron = isRunningInElectron();
  export const isBrowser = isRunningInBrowser();
  export const isNode = isRunningInNode();
  export const isWebSQL = isRunningInWebSQL();
  export const isVscodeExtension = isRunningInVscodeExtension();
  export const isSSRMode = isRunningInSSRMode();
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
  //#region models
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

  //#region wait
  export const wait = (second: number): Promise<void> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve(void 0);
      }, second * 1000);
    });
  };
  //#endregion

  //#region clear
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

  //#region transform choices
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

  //#region multiselect
  export const multiselect = async <T = string>(options: {
    question: string;
    /**
     * If true, then only one choice can be selected
     * @deprecated use select instead
     */
    onlyOneChoice?: boolean;
    choices: SelectChoiceValue<T>[] | { [choice: string]: SelectChoice };
    autocomplete?: boolean;
    defaultSelected?: string[];
  }): Promise<T[]> => {
    //#region @backendFunc
    const { select } = await import('inquirer-select-pro');
    const fuzzy = await import('fuzzy');
    options = _.cloneDeep(options);
    options.autocomplete = _.isNil(options.autocomplete)
      ? true
      : options.autocomplete;
    const choices = transformChoices(options.choices) as any;

    if (Object.keys(choices || {}).length === 0) {
      await UtilsTerminal.pressAnyKeyToContinueAsync({
        message: 'No choices available. Press any key to continue...',
      });
      return [];
    }

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

    return (Array.isArray(res) ? res : [res]) as T[];

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

  //#region select and execute
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

  //#region select and execute
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

  //#region select
  export const select = async <T = string>(options: {
    question: string;
    choices: SelectChoiceValue<T>[] | { [choice: string]: SelectChoice };
    autocomplete?: boolean;
    defaultSelected?: string;
    hint?: string;
  }): Promise<T> => {
    //#region @backendFunc
    options = _.cloneDeep(options);
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

  //#region pipe enter to stdin
  export const pipeEnterToStdin = (): void => {
    //#region @backendFunc
    process.stdin.push('\n');
    //#endregion
  };
  //#endregion

  //#region input
  export const input = async ({
    defaultValue,
    question,
    required, // TODO something is werid with required
  }: {
    defaultValue?: string;
    question: string;
    required?: boolean;
    validate?: (value: string) => boolean;
  }): Promise<string> => {
    //#region @backendFunc
    const initial = defaultValue || '';

    const inquirer = await import('inquirer');

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
    return anwser;
    //#endregion
  };
  //#endregion

  //#region confirm
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

  //#region press any key to continue
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

  //#region press any key
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

  //#region preview long list as select
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

  //#region preview long list with 'less' (git log like)
  /**
   * Displays a long list in the console using a pager like `less`.
   * Returns a Promise that resolves when the user exits the pager.
   *
   * @param {string} list - The long string content to display.
   * @returns {Promise<void>} A Promise that resolves when the pager exits.
   */
  export const previewLongListGitLogLike = (
    list: string | string[],
  ): Promise<void> => {
    //#region @backendFunc
    if (Array.isArray(list)) {
      list = list.join('\n');
    }
    return new Promise((resolve, reject) => {
      const less = spawn('less', [], {
        stdio: ['pipe', process.stdout, process.stderr],
      });

      less.stdin.write(list); // Write the list content to the less process
      less.stdin.end(); // Signal that writing is complete

      less.on('close', code => {
        if (code === 0) {
          resolve(void 0);
        } else {
          reject(new Error(`less process exited with code ${code}`));
        }
      });

      less.on('error', err => {
        reject(err);
      });
    });
    //#endregion
  };
  //#endregion
}
//#endregion
