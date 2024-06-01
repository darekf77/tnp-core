//#region @browser
import { Chalk } from 'chalk';

// TODO finish this MOCK @LAST
// const c:Chalk = void 0;

const allObj = {
  black(a) {
    console.log(a);
  },
  gray(a) {
    console.log(a);
  },
  red(a) {
    console.log(a);
  },
  green(a) {
    console.log(a);
  },
  italic(a) {
    console.log(a);
  },
  magenta(a) {
    console.log(a);
  },
  bold(a) {
    console.log(a);
  },
  underline(a) {
    console.log(a);
  },
};

const map = new Map<Function, string>();

const all = Object.keys(allObj).map(key => {
  map.set(allObj[key], key);
  return allObj[key];
});

for (let i = 0; i < all.length; i++) {
  const e1 = all[i] as Function;
  for (let j = 0; j < all.length; j++) {
    const e2 = all[j] as Function; // @ts-ignore
    e1[map.get(e2)] = e2;
  }
}

export const chalk: Chalk = allObj as any;
//#endregion
