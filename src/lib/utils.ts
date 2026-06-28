//#region imports
import 'reflect-metadata';

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
import { UtilsOs } from './utils-os';
import { UtilsTerminal } from './utils-terminal';
import { UtilsTime } from './utils-time';

import { config, frameworkName, Helpers } from './index';
//#endregion

//#region utils
export namespace Utils {
  //#region wait
  export const wait = (second: number): Promise<void> => {
    return UtilsTime.wait(second);
  };
  //#endregion

  //#region wait miliseconds
  export const waitMilliseconds = (milliseconds: number): Promise<void> => {
    // Helpers.taskStarted(`Waiting ${milliseconds} milliseconds...`);
    return UtilsTime.waitMilliseconds(milliseconds);
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

    Helpers.logInfo(
      `${currentDate()} ${executionType}\n "${taskName}" Started..`,
    );
    await fn();
    Helpers.logInfo(`${currentDate()} ${executionType}\n "${taskName}" Done`);
    // global?.spinner?.stop();
    //#endregion
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
