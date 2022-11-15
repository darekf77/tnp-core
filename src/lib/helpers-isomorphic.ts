

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
