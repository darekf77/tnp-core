//#region imports
import 'reflect-metadata';
import { Blob } from 'buffer'; // @backend
import { ChildProcess, ExecSyncOptions } from 'child_process';
import * as crypto from 'crypto'; // @backend
import type { Dirent, WriteStream } from 'fs';
import * as net from 'net';
import { URL } from 'url'; // @backend
import { promisify } from 'util';

import axios, { AxiosResponse } from 'axios';
import { CopyOptionsSync } from 'fs-extra';
import * as micromatch from 'micromatch'; // @backend
import { Subject } from 'rxjs';

import {
  dotTaonFolder,
  dotTnpFolder,
  encoding,
  extAllowedToReplace,
} from './constants';
import {
  path,
  _,
  crossPlatformPath,
  os,
  chalk,
  win32Path,
  isElevated,
  https,
  json5,
} from './core-imports';
import { dateformat } from './core-imports';
import { spawn, child_process } from './core-imports';
import { fse } from './core-imports';
import { CoreModels } from './core-models';

import { config, frameworkName, Helpers } from './index';
import { UtilsOs } from './utils-os';
import { UtilsTerminal } from './utils-terminal';
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
      return (
        await axios({
          url,
          method: 'get',
          responseType: 'blob',
        })
      ).data;
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

//#region utils string regex
export namespace UtilsStringRegex {
  export const containsNonAscii = (pathStringOrPathParts: string): boolean => {
    const hasNonAscii = /[^\u0000-\u0080]+/.test(pathStringOrPathParts);
    return hasNonAscii;
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
export namespace UtilsMessages {
  //#region utils messages / compilation wrapper
  export const compilationWrapper = async (
    fn: () => any,
    taskName: string = 'Task',
    executionType:
      | 'Compilation of'
      | 'Code execution of'
      | 'Event:' = 'Compilation of',
  ): Promise<void> => {
    //#region @backendFunc
    // global?.spinner?.start();
    const currentDate = (): string => {
      return `[${dateformat(new Date(), 'HH:MM:ss')}]`;
    };
    if (!fn || !_.isFunction(fn)) {
      throw `${executionType} wrapper: "${fn}" is not a function.`;
    }

    Helpers.taskStarted(
      `${currentDate()} ${executionType}\n "${taskName}" Started..`,
    );
    await fn();
    Helpers.taskDone(`${currentDate()} ${executionType}\n "${taskName}" Done`);
    // global?.spinner?.stop();
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

//#region utils json
export namespace UtilsJson {
  export interface AttrJsoncProp {
    name: string;
    value?: any;
  }

  //#region get attributes from jsonc or json5 file
  /**
   * ! TODO handle packages like zone.js with dot
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
    // const keyName = pathParts.pop()!.replace(/^\["(.+)"\]$/, '$1');
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
      const trimmed = line
        .replace(/\s+#.*$/, '') // remove inline comments
        .trim();
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
