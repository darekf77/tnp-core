let isBrowser = false;
//#region @browser
isBrowser = true;
//#endregion

const frameworkNameBeTmp: 'taon' | 'tnp' = '' as any;

//#region @backend
// @ts-ignore
frameworkNameBe = global['frameworkName'] ? global['frameworkName'] : '';
//#endregion
export const frameworkNameBe = frameworkNameBeTmp;

export const frameworkName = isBrowser ? 'taon' : frameworkNameBe;
