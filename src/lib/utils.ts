import { CoreModels } from './core-models';
import axios, { AxiosResponse } from 'axios';
import {
  path,
  _,
  crossPlatformPath,
  //#region @backend
  portfinder,
  os,
  //#endregion
} from './core-imports';
import { Helpers } from './index';
import { dateformat } from './core-imports';
//#region @backend
import { spawn, child_process } from './core-imports';
import { fse } from './core-imports';
import { Blob } from 'buffer';
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
    howManyFreePortsAfterThatPort?: number;
  }): Promise<number> => {
    //#region @backendFunc
    options = options || ({} as any);
    options.startFrom = options.startFrom || 3000;
    let startFrom = options.startFrom;
    const howManyFreePortsAfterThatPort =
      options.howManyFreePortsAfterThatPort || 1;
    const max = 5000;
    let i = 0;
    if (_.isNumber(startFrom)) {
      while (takenPorts.includes(startFrom)) {
        startFrom += 1 + howManyFreePortsAfterThatPort;
      }
    }

    while (true) {
      try {
        const port = await portfinder.getPortPromise({ port: startFrom });
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
    resolvePromiseMsg?: {
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
    };
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
  export async function startAsync(
    command: string,
    options?: ProcessStartOptions,
  ) {
    // TODO @LAST
  }
  //#endregion

  //#region utils process  / TODO start sync
  /**
   * TODO IMPLEMENT
   */
  export function startSync(command: string, options?: ProcessStartOptions) {
    // TODO @LAST
  }
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
    options.cwd = options.cwd || process.cwd();

    if (platform === 'win32') {
      const gitBashPath = getGitBashPath();
      // const currentBash = getBashOrShellName();
      // console.log('gitBashPath', gitBashPath);
      // console.log('currentBash', currentBash);

      if (gitBashPath) {
        return spawn(
          'start bash',
          ['-c', `${command}`], // Use '-c' to execute a single command in Git Bash
          {
            detached: true, // Detached process
            stdio: 'ignore', // Ignore stdio
            cwd: options?.cwd,
          },
        ).unref(); // Ensure the parent process can exit independently
      }
      console.error(
        `


        Please install git bash to use this cli (https://gitforwindows.org/)


        `,
      );
      // For Windows
      return spawn('cmd', ['/c', 'start', 'cmd', '/k', `${command}`], {
        detached: true,
        stdio: 'ignore',
        cwd: options?.cwd,
      }).unref();
    } else if (platform === 'darwin') {
      // For macOS
      return spawn(
        'osascript',
        ['-e', `tell application "Terminal" to do script "${command}"`],
        {
          detached: true,
          stdio: 'ignore',
          cwd: options?.cwd,
        },
      ).unref();
    } else if (platform === 'linux') {
      if (!UtilsOs.isRunningInLinuxGraphicsCapableEnvironment()) {
        const child = child_process.spawn(command, {
          detached: true,
          cwd: options?.cwd,
          stdio: 'ignore',
        });
        child.unref();
        return;
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

  //#region utils os / is running in electron
  /**
   * check whether the current process is running inside
   * Electron backend or browser.
   */
  export const isRunningInElectron = (): boolean => {
    // Renderer process
    // @ts-ignore
    if (
      typeof window !== 'undefined' &&
      typeof window.process === 'object' &&
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
    return `${dateformat(dateFromTimestamp, 'dd-mm-yyyy HH:MM:ss')}`;
  }

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
