export class HelpersIsomorphic {

  get isBrowser() {
    //#region @backend
    return false;
    //#endregion
    return true;
  }

  get isWebSQL() {
    //#region @backend
    return false;
    //#endregion

    //#region @websqlOnly
    return true;
    //#endregion
    return false;
  }
  get isNode() {
    //#region @backend
    return true;
    //#endregion
    return false;
  }

  get isElectron() {
    // Renderer process
    // @ts-ignore
    if (typeof window !== 'undefined' && typeof window.process === 'object' && window.process.type === 'renderer') {
      return true;
    }

    // Main process
    // @ts-ignore
    if (typeof process !== 'undefined' && typeof process.versions === 'object' && !!process.versions.electron) {
      return true;
    }

    // Detect the user agent when the `nodeIntegration` option is set to false
    if (typeof navigator === 'object' && typeof navigator.userAgent === 'string' && navigator.userAgent.indexOf('Electron') >= 0) {
      return true;
    }

    return false;
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
