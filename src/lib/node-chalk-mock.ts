import type { Chalk } from 'chalk';

// TODO finish this MOCK @LAST
// const c:Chalk = void 0;

const displayData = (...args)=> {
  console.log('using mock')
  console.log(...args);
}

const allObj = {
  black(a) {
    displayData(a);
  },
  gray(a) {
    displayData(a);
  },
  blue(a) {
    displayData(a);
  },
  red(a) {
    displayData(a);
  },
  green(a) {
    displayData(a);
  },
  italic(a) {
    displayData(a);
  },
  magenta(a) {
    displayData(a);
  },
  bold(a) {
    displayData(a);
  },
  underline(a) {
    displayData(a);
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
