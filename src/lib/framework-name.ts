let isBrowser = false;
//#region @browser
isBrowser = true;
//#endregion

const frameworkNameBeTmp: 'taon' | 'tnp' = '' as any;
let frameworkNameBe = frameworkNameBeTmp;

//#region @backend
// @ts-ignore
frameworkNameBe = global['frameworkName'] ? global['frameworkName'] : '';
//#endregion

const frameworkName = isBrowser ? 'taon' : frameworkNameBe;

export { frameworkName, frameworkNameBe };
