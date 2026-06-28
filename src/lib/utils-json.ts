import { crossPlatformPath, fse } from './core-imports';
import { Helpers } from './helpers';

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
