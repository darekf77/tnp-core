//#region @backend
declare const global: any;
import { chalk } from './core-imports';
//#endregion
import { _ } from './core-imports';
// import { config } from 'tnp-config';
// import { PROGRESS_DATA } from 'tnp-models';
import { Helpers } from './index';
import { HelpersIsomorphic } from './helpers-isomorphic';
import { PROGRESS_DATA } from './progress-data';
import { CoreConfig } from './core-config';

const KEY = {
  LAST_ERROR: Symbol(),
  LAST_INFO: Symbol(),
  LAST_WARN: Symbol(),
  LAST_LOG: Symbol(),
}

// export class Log {
//   private static _instance: Log;
//   public Instance() {
//     if (!Log._instance) {
//       Log._instance = new Log();
//     }
//     return Log._instance;
//   }

//   create(name: string, level?: Level) {
//     if (level === void 0) {
//       level = Level.DATA;
//     }
//     return {
//       d(details: string, debugLevel?: number) {
//         return Helpers.log(`[${name}] ${details}`, debugLevel)
//       },
//       i(details: string) {
//         return Helpers.info(`[${name}] ${details}`)
//       },

//       w(details: string, noExit = false, noTrace = false) {
//         return Helpers.error(`[${name}] ${details}`, noExit, noTrace);
//       },
//       er(details: string, ) {
//         return Helpers.info(`[${name}] ${details}`)
//       },
//     }
//   }

// }

export class HelpersMessages extends HelpersIsomorphic {

  msgCacheClear() {
    //#region @backend
    global[KEY.LAST_LOG] = void 0;
    global[KEY.LAST_WARN] = void 0;
    global[KEY.LAST_ERROR] = void 0;
    global[KEY.LAST_INFO] = void 0;
    //#endregion
  }

  error(details: any, noExit = false, noTrace = false) {
    if (Helpers.isBrowser) {
      console.error(details)
      return;
    }
    //#region @backend
    // Error.stackTraceLimit = Infinity;
    if (!global.globalSystemToolMode) {
      noTrace = true;
    }
    if (typeof details === 'object') {
      try {
        const json = JSON.stringify(details)
        if (global.globalSystemToolMode) {
          if (global[KEY.LAST_ERROR] === json) {
            process.stdout.write('.');
            return;
          } else {
            global[KEY.LAST_ERROR] = json;
          }
          if (noTrace) {
            !global.muteMessages && console.log(chalk.red(json));
          } else {
            !global.muteMessages && console.trace(chalk.red(json));
          }
        } else {
          if (global[KEY.LAST_ERROR] === json) {
            process.stdout.write('.');
            return;
          } else {
            global[KEY.LAST_ERROR] = json;
          }
          console.log(json);
          return;
        }


      } catch (error) {
        if (global.globalSystemToolMode) {
          if (global[KEY.LAST_ERROR] === details) {
            process.stdout.write('.');
            return;
          } else {
            global[KEY.LAST_ERROR] = details;
          }
          if (noTrace) {
            !global.muteMessages && console.log(details);
          } else {
            !global.muteMessages && console.trace(details);
          }
        } else {
          if (global[KEY.LAST_ERROR] === details) {
            process.stdout.write('.');
            return;
          } else {
            global[KEY.LAST_ERROR] = details;
          }
          console.log(details)
          return;
        }
      }
    } else {
      if (global.globalSystemToolMode) {
        if (global[KEY.LAST_ERROR] === details) {
          process.stdout.write('.');
          return;
        } else {
          global[KEY.LAST_ERROR] = details;
        }
        if (noTrace) {
          !global.muteMessages && console.log(chalk.red(details));
        } else {
          !global.muteMessages && console.trace(chalk.red(details));
        }
      } else {
        if (global[KEY.LAST_ERROR] === details) {
          process.stdout.write('.');
          return;
        } else {
          global[KEY.LAST_ERROR] = details;
        }
        console.log(details)
        return;
      }

    }

    if (global[CoreConfig.message.globalSystemToolMode]) {
      if (!noExit) {
        process.exit(1);
      }
    }
    //#endregion
  }

  info(details: string, repeatable = false) {
    if (Helpers.isBrowser) {
      console.info(details);
      return;
    }
    //#region @backend
    if (!global.muteMessages && !global.hideInfos) {
      if ((global[KEY.LAST_INFO] === details) && !repeatable) {
        process.stdout.write('.');
        return;
      } else {
        global[KEY.LAST_INFO] = details;
      }
      console.log(chalk.green(details))
      if (global.tnpNonInteractive) {
        PROGRESS_DATA.log({ msg: details })
      }
    }
    //#endregion
  }

  log(details: string, debugLevel = 0) {
    if (Helpers.isBrowser) {
      console.log(details);
      return;
    }
    //#region @backend
    if (debugLevel > global.verboseLevel) {
      return;
    }
    // console.log('global.muteMessages', global.muteMessages);
    // console.log('global.hideLog', global.hideLog);
    if ((!global.muteMessages && !global.hideLog)) {
      if (global[KEY.LAST_LOG] === details) {
        process.stdout.write('.');
        return;
      } else {
        global[KEY.LAST_LOG] = details;
      }
      if (global.globalSystemToolMode) {
        // if (_.isObject(details)) {
        //   console.log(chalk.gray(json5.stringify(details)))
        // } else {
        console.log(chalk.gray(details))
        // }
      }
      if (global.tnpNonInteractive) {
        PROGRESS_DATA.log({ msg: details })
      }
    }
    //#endregion
  }

  warn(details: string, trace = false) {
    // if (_.isString(details)) {
    //   details = (details).toUpperCase();
    // }
    if (Helpers.isBrowser) {
      console.warn(details);
      return;
    }
    //#region @backend
    if (!global.globalSystemToolMode) {
      trace = false;
    }
    if (global[KEY.LAST_WARN] === details) {
      process.stdout.write('.');
      return;
    } else {
      global[KEY.LAST_WARN] = details;
    }
    if (trace) {
      (!global.muteMessages && !global.hideWarnings) && console.trace(chalk.yellow(details))
    } else {
      (!global.muteMessages && !global.hideWarnings) && console.log(chalk.yellow(details))
    }
    //#endregion
  }
}
