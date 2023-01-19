let isBrowser = false;
//#region @browser
isBrowser = true;
//#endregion

export const frameworkNameBe = (
  ''
  //#region @backend
  || (global['frameworkName'] ? global['frameworkName'] : 'tnp')
  //#endregion
) as 'firedev' | 'tnp';
export const frameworkName = isBrowser ? 'firedev' : frameworkNameBe;

