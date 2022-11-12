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

// TODO handle global.testMode ?

const KEY = {
  LAST_ERROR: Symbol(),
  LAST_INFO: Symbol(),
  LAST_WARN: Symbol(),
  LAST_LOG: Symbol(),
}

const KEY_COUNT = {
  LAST_ERROR: Symbol(),
  LAST_INFO: Symbol(),
  LAST_WARN: Symbol(),
  LAST_LOG: Symbol(),
}

//#region @backend
global[KEY_COUNT.LAST_ERROR] = 0;
global[KEY_COUNT.LAST_INFO] = 0;
global[KEY_COUNT.LAST_WARN] = 0;
global[KEY_COUNT.LAST_LOG] = 0;

const useSpinner = global['spinnerInParentProcess'];

//#endregion

const LIMIT = 10;

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
    //#region browser mode
    if (Helpers.isBrowser) {
      console.error(details)
      return;
    }
    //#endregion

    //#region @backend
    // Error.stackTraceLimit = Infinity;
    if (!global.globalSystemToolMode) {
      noTrace = true;
    }

    details = transformData(details);

    const display = (dot = false) => {
      if (global.tnpNonInteractive) {
        PROGRESS_DATA.log({ msg: dot ? '.' : details })
      }
      if (dot) {
        process.stdout.write(chalk.red('.'));
      } else {
        if (useSpinner) {
          process?.send(`error::${chalk.red(details)}`);
        } else {
          if (global.globalSystemToolMode) {
            if (noTrace) {
              !global.muteMessages && console.log(chalk.red(details));
            } else {
              !global.muteMessages && console.trace(chalk.red(details));
            }
            if (!noExit) {
              process.exit(1);
            }
          } else {
            console.log(details); // no formatiing debuggable code
          }
        }

      }
    };

    if (global[KEY.LAST_ERROR] === details) {
      global[KEY_COUNT.LAST_ERROR]++;
      if (global[KEY_COUNT.LAST_ERROR] > LIMIT) {
        display(true);
      } else {
        display();
      }
    } else {
      global[KEY_COUNT.LAST_ERROR] = 0;
      global[KEY.LAST_ERROR] = details;
      display();
    }
    //#endregion
  }
  //#endregion

  //#region info
  info(details: string, repeatable = false) {
    // //#region @backend
    // console.log({
    //   shouldDiaplyInfo: details,
    //   muteMessages: global.muteMessages,
    //   hideInfos: global.hideInfos,
    // });
    // //#endregion
    if (Helpers.isBrowser) {
      console.info(details);
      return;
    }
    //#region @backend
    const display = (dot = false) => {
      if (global.tnpNonInteractive) {
        PROGRESS_DATA.log({ msg: dot ? '.' : details, type: 'info' })
      }
      if (dot) {
        process.stdout.write(chalk.blue('.'));
      } else {
        if (useSpinner) {
          process?.send(`info::${chalk.blue(details)}`);
        } else {
          if (global.globalSystemToolMode) {
            console.log(chalk.blue(details))
          } else {
            console.log(details)
          }

        }
      }
    };

    if (!global.muteMessages && !global.hideInfos) {
      if ((global[KEY.LAST_INFO] === details) && !repeatable) {
        global[KEY_COUNT.LAST_INFO]++;
        if (global[KEY_COUNT.LAST_INFO] > LIMIT) {
          display(true)
        } else {
          display()
        }
      } else {
        global[KEY_COUNT.LAST_INFO] = 0;
        global[KEY.LAST_INFO] = details;
        display();
      }
    }
    //#endregion
  }
  //#endregion

  //#region info
  success(details: any | string) {
    if (Helpers.isBrowser) {
      console.info(details);
      return;
    }
    //#region @backend

    details = transformData(details);

    const display = (dot = false) => {
      if (global.tnpNonInteractive) {
        PROGRESS_DATA.log({ msg: dot ? '.' : details, type: 'info' })
      }
      if (dot) {
        process.stdout.write(chalk.green('.'));
      } else {
        if (useSpinner) {
          process?.send(`success::${chalk.green(details)}`);
        } else {
          if (global.globalSystemToolMode) {
            console.log(chalk.green(details))
          } else {
            console.log(details)
          }

        }
      }
    };

    if (!global.muteMessages && !global.hideInfos) {
      if ((global[KEY.LAST_INFO] === details)) {
        global[KEY_COUNT.LAST_INFO]++;
        if (global[KEY_COUNT.LAST_INFO] > LIMIT) {
          display(true)
        } else {
          display()
        }
      } else {
        global[KEY_COUNT.LAST_INFO] = 0;
        global[KEY.LAST_INFO] = details;
        display();
      }
    }
    //#endregion
  }
  //#endregion

  taskStarted(details: any | string) {
    if (Helpers.isBrowser) {
      console.info(details);
      return;
    }
    //#region @backend

    details = transformData(details);

    const display = (dot = false) => {
      if (global.tnpNonInteractive) {
        PROGRESS_DATA.log({ msg: dot ? '.' : details, type: 'info' })
      }
      if (dot) {
        process.stdout.write(chalk.magenta('.'));
      } else {
        if (useSpinner) {
          process?.send(`taskstart::► ${chalk.magenta(details)}`);
        } else {
          if (global.globalSystemToolMode) {
            console.log('- '+chalk.magenta(details))
          } else {
            console.log(details)
          }

        }
      }
    };

    if (!global.muteMessages && !global.hideInfos) {
      if ((global[KEY.LAST_INFO] === details)) {
        global[KEY_COUNT.LAST_INFO]++;
        if (global[KEY_COUNT.LAST_INFO] > LIMIT) {
          display(true)
        } else {
          display()
        }
      } else {
        global[KEY_COUNT.LAST_INFO] = 0;
        global[KEY.LAST_INFO] = details;
        display();
      }
    }
    //#endregion
  }
  //#endregion

  taskDone(details: any | string) {
    if (Helpers.isBrowser) {
      console.info(details);
      return;
    }
    //#region @backend

    details = transformData(details);

    const display = (dot = false) => {
      if (global.tnpNonInteractive) {
        PROGRESS_DATA.log({ msg: dot ? '.' : details, type: 'info' })
      }
      if (dot) {
        process.stdout.write(chalk.green('.'));
      } else {
        if (useSpinner) {
          process?.send(`taskdone::\u2713 ${chalk.green(details)}`);
        } else {
          if (global.globalSystemToolMode) {
            console.log('\u2713 '+chalk.green(details))
          } else {
            console.log(details)
          }

        }
      }
    };

    if (!global.muteMessages && !global.hideInfos) {
      if ((global[KEY.LAST_INFO] === details)) {
        global[KEY_COUNT.LAST_INFO]++;
        if (global[KEY_COUNT.LAST_INFO] > LIMIT) {
          display(true)
        } else {
          display()
        }
      } else {
        global[KEY_COUNT.LAST_INFO] = 0;
        global[KEY.LAST_INFO] = details;
        display();
      }
    }
    //#endregion
  }
  //#endregion

  //#region log
  log(details: any, debugLevel = 0) {

    if (Helpers.isBrowser) {
      console.log(details);
      return;
    }
    //#region @backend
    if (debugLevel > (global.verboseLevel || 0)) {
      return;
    }

    details = transformData(details);

    const display = (dot = false) => {

      if (global.tnpNonInteractive) {
        PROGRESS_DATA.log({ msg: dot ? '.' : details })
      }
      if (dot) {
        process.stdout.write('.');
      } else {
        if (useSpinner) {
          process?.send(`log::${chalk.black(details)}`);
        } else {
          if (global.globalSystemToolMode) {
            console.log(chalk.black(details));
          } else {
            console.log(details);
          }
        }


      }

    };

    if ((!global.muteMessages && !global.hideLog)) {
      if (global[KEY.LAST_LOG] === details) {
        global[KEY_COUNT.LAST_LOG]++;
        if (global[KEY_COUNT.LAST_LOG] > LIMIT) {
          display(true)
        } else {
          display();
        }
      } else {
        global[KEY_COUNT.LAST_LOG] = 0;
        global[KEY.LAST_LOG] = details;
        display();
      }
    }
    //#endregion
  }
  //#endregion

  //#region warn
  warn(details: string, trace = false) {

    if (Helpers.isBrowser) {
      console.warn(details);
      return;
    }

    //#region @backend
    const display = (dot = false) => {
      if (global.tnpNonInteractive) {
        PROGRESS_DATA.log({ msg: dot ? '.' : details, type: 'warning' })
      }
      if (dot) {
        process.stdout.write(chalk.yellow('.'));
      } else {
        if (useSpinner) {
          process?.send(`warn::${chalk.yellow(details)}`);
        } else {
          if (global.globalSystemToolMode) {
            if (trace) {
              (!global.muteMessages && !global.hideWarnings) && console.trace(chalk.yellow(details))
            } else {
              (!global.muteMessages && !global.hideWarnings) && console.log(chalk.yellow(details))
            }
          } else {
            if (trace) {
              (!global.muteMessages && !global.hideWarnings) && console.trace(details)
            } else {
              (!global.muteMessages && !global.hideWarnings) && console.log(details)
            }
          }
        }

      }
    };

    if (global[KEY.LAST_WARN] === details) {
      global[KEY_COUNT.LAST_WARN]++;
      if (global[KEY_COUNT.LAST_WARN] > LIMIT) {
        display(true);
      } else {
        display();
      }
    } else {
      global[KEY_COUNT.LAST_WARN] = 0;
      global[KEY.LAST_WARN] = details;
      display();
    }
    //#endregion
  }
  //#endregion
}



function transformData(details:any) {
  if (typeof details === 'object') {
    if(Array.isArray(details)) {
      return details.join('\n')
    }
    try {
      const json = JSON.stringify(details);
      details = json;
    } catch (error) { }
  }
  return details;
}
