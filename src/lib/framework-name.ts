let isBrowser = false;
//#region @browser
isBrowser = true;
//#endregion

const frameworkNameBeTmp: 'firedev' | 'tnp' = '' as any;

//#region @backend
// @ts-ignore
frameworkNameBe = global['frameworkName'] ? global['frameworkName'] : '';
//#endregion
export const frameworkNameBe = frameworkNameBeTmp;

export const frameworkName = isBrowser ? 'firedev' : frameworkNameBe;
