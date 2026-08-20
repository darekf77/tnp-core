import { _ } from './lodash.namespace';

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

  export const listDiff = (
    arr1: string[],
    arr2: string[],
  ): {
    added: string[];
    removed: string[];
    infoMessage: () => void;
  } => {
    const added = _.difference(arr2, arr1);
    const removed = _.difference(arr1, arr2);

    return {
      added,
      removed,

      infoMessage: () => {
        if (added.length) {
          console.info(`added: ${added.join(', ')}`);
        }

        if (removed.length) {
          console.info(`removed: ${removed.join(', ')}`);
        }
      },
    };
  };
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
