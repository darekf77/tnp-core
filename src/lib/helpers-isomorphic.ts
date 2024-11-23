import { UtilsOs } from './utils';

export class HelpersIsomorphic {
  /**
   * @deprecated
   * use UtilsOs.isRunningInBrowser() instead
   */
  get isBrowser() {
    return UtilsOs.isRunningInBrowser();
  }

  /**
   * @deprecated
   * use UtilsOs.isRunningInWebSQL() instead
   */
  get isWebSQL() {
    return UtilsOs.isRunningInWebSQL();
  }

  /**
   * @deprecated
   * use UtilsOs.isRunningInNode() instead
   */
  get isNode() {
    return UtilsOs.isRunningInNode();
  }

  /**
   * @deprecated
   * use UtilsOs.isRunningInElectron() instead
   */
  get isElectron() {
    return UtilsOs.isRunningInElectron();
  }

  /**
   * TODO what is the purpose of this function?
   * @deprecated
   */
  contain(arr: any[], item: any): boolean {
    return (
      arr.filter(l => {
        if (l instanceof RegExp) {
          return l.test(item);
        }
        if (l === item) {
          return true;
        }
        if (
          item.match && typeof item.match === 'function' ? item.match(l) : false
        ) {
          return true;
        }
        return false;
      }).length > 0
    );
  }
}
