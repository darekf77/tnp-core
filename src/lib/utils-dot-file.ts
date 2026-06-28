import { crossPlatformPath, fse, path } from "./core-imports";
import { frameworkName } from "./framework-name";
import { Helpers } from "./helpers";

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
