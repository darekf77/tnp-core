
import { Helpers } from './index';

export class HelpersIsomorphic {
  public simulateBrowser = false;
  //#region @backend
  private isBackend = false;
  setIsBackend() {
    Helpers.isBackend = true;
  }
  //#endregion
  get isBrowser() {
    //#region @backend
    if (Helpers.isBackend) {
      return false;
    }
    //#endregion
    return Helpers.simulateBrowser || !!(typeof window !== 'undefined' && window.document);
  }
  get isNode() {
    //#region @backend
    if (Helpers.isBackend) {
      return true;
    }
    //#endregion
    return Helpers.simulateBrowser || !Helpers.isBrowser;
  }
  contain(arr: any[], item: any): boolean {
    return arr.filter(l => {
      if (l instanceof RegExp) {
        return l.test(item)
      }
      if (l === item) {
        return true;
      }
      if ((item.match && typeof item.match === 'function') ? item.match(l) : false) {
        return true
      }
      return false;
    }).length > 0;
  }

}
//#endregion
