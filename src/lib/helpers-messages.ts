//#region @backend
declare const global: any;
import { chalk, dateformat } from './core-imports';
//#endregion
import { _ } from './core-imports';
// import { config } from 'tnp-config';
// import { PROGRESS_DATA } from 'tnp-models';
import { Helpers } from './index';
import { HelpersIsomorphic } from './helpers-isomorphic';
import { PROGRESS_DATA } from './progress-data';
import { frameworkName } from './framework-name';

// TODO handle global.testMode ?

const KEY = {
  LAST_ERROR: Symbol(),
  LAST_INFO: Symbol(),
  LAST_WARN: Symbol(),
  LAST_LOG: Symbol(),
  LAST_SUCCESS: Symbol(),
  LAST_TASK_STARTED: Symbol(),
  LAST_TASK_DONE: Symbol(),
};

const KEY_COUNT = {
  LAST_ERROR: Symbol(),
  LAST_INFO: Symbol(),
  LAST_WARN: Symbol(),
  LAST_LOG: Symbol(),
  LAST_SUCCESS: Symbol(),
  LAST_TASK_STARTED: Symbol(),
  LAST_TASK_DONE: Symbol(),
};

const KEY_IMPORTANTCE = {
  LAST_ERROR: Symbol(),
  LAST_INFO: Symbol(),
  LAST_WARN: Symbol(),
  LAST_LOG: Symbol(),
  LAST_SUCCESS: Symbol(),
  LAST_TASK_STARTED: Symbol(),
  LAST_TASK_DONE: Symbol(),
};

//#region @backend
global[KEY_COUNT.LAST_ERROR] = 0;
global[KEY_COUNT.LAST_INFO] = 0;
global[KEY_COUNT.LAST_WARN] = 0;
global[KEY_COUNT.LAST_LOG] = 0;
global[KEY_COUNT.LAST_SUCCESS] = 0;
global[KEY_COUNT.LAST_TASK_STARTED] = 0;
global[KEY_COUNT.LAST_TASK_DONE] = 0;

global[KEY_IMPORTANTCE.LAST_ERROR] = 0;
global[KEY_IMPORTANTCE.LAST_INFO] = 0;
global[KEY_IMPORTANTCE.LAST_WARN] = 0;
global[KEY_IMPORTANTCE.LAST_LOG] = 0;
global[KEY_IMPORTANTCE.LAST_SUCCESS] = 0;
global[KEY_IMPORTANTCE.LAST_TASK_STARTED] = 0;
global[KEY_IMPORTANTCE.LAST_TASK_DONE] = 0;

const useSpinner = global['spinnerInParentProcess'];

const forceTrace = global.hideLog === false;

//#endregion

const LIMIT = 10;

export class HelpersMessages extends HelpersIsomorphic {
  msgCacheClear() {
    //#region @backend
    global[KEY.LAST_LOG] = void 0;
    global[KEY.LAST_WARN] = void 0;
    global[KEY.LAST_ERROR] = void 0;
    global[KEY.LAST_INFO] = void 0;
    //#endregion
  }

  renderError(err: Error) {
    if (this.isBrowser) {
      // TODO for FE
      console.error(err);
    } else {
      //#region @backend
      console.error(err);
      // const createCallsiteRecord = require('callsite-record');
      // // console.log(createCallsiteRecord)
      // console.log(
      //   createCallsiteRecord &&
      //     createCallsiteRecord({ forError: err })?.renderSync({}),
      // );
      return;
      //#endregion
    }
  }

  error(details: any, noExit = false, noTrace = false) {
    //#region browser mode
    if (Helpers.isBrowser) {
      console.error(details);
      return;
    }
    //#endregion

    //#region @backend
    // Error.stackTraceLimit = Infinity;
    if (forceTrace) {
      noTrace = false;
    }
    if (!global.globalSystemToolMode) {
      noTrace = true;
    }

    details = transformData(details);

    const display = (dot = false) => {
      if (global.tnpNonInteractive) {
        PROGRESS_DATA.log({ msg: dot ? '.' : details });
      }
      if (dot) {
        process.stdout.write(chalk.red('.'));
      } else {
        if (useSpinner) {
          process?.send(`error::${chalk.red(details)}`);
          process.exit(1);
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
        PROGRESS_DATA.log({ msg: dot ? '.' : details, type: 'info' });
      }
      if (dot) {
        process.stdout.write(chalk.blue('.'));
      } else {
        if (useSpinner) {
          process?.send(`info::${chalk.blue(details)}`);
        } else {
          if (global.globalSystemToolMode) {
            console.log(chalk.blue(details));
          } else {
            console.log(details);
          }
        }
      }
    };

    if (!global.muteMessages && !global.hideInfos) {
      if (global[KEY.LAST_INFO] === details && !repeatable) {
        global[KEY_COUNT.LAST_INFO]++;
        if (global[KEY_COUNT.LAST_INFO] > LIMIT) {
          display(true);
        } else {
          display();
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
        PROGRESS_DATA.log({ msg: dot ? '.' : details, type: 'info' });
      }
      if (dot) {
        process.stdout.write(chalk.green('.'));
      } else {
        if (useSpinner) {
          process?.send(`success::${chalk.green(details)}`);
        } else {
          if (global.globalSystemToolMode) {
            console.log(chalk.green(details));
          } else {
            console.log(details);
          }
        }
      }
    };

    if (!global.muteMessages && !global.hideInfos) {
      if (global[KEY.LAST_SUCCESS] === details) {
        global[KEY_COUNT.LAST_SUCCESS]++;
        if (global[KEY_COUNT.LAST_SUCCESS] > LIMIT) {
          display(true);
        } else {
          display();
        }
      } else {
        global[KEY_COUNT.LAST_SUCCESS] = 0;
        global[KEY.LAST_SUCCESS] = details;
        display();
      }
    }
    //#endregion
  }
  //#endregion

  /**
   *
   * @param details
   * @param isLogTask is less important log task
   * @returns
   */
  taskStarted(details: any | string, isLogTask: boolean = false) {
    if (Helpers.isBrowser) {
      console.info(details);
      return;
    }
    //#region @backend

    details =
      `[${dateformat(new Date(), 'dd-mm-yyyy HH:MM:ss')}] ` +
      transformData(details);

    const display = (dot = false) => {
      if (global.hideLog && isLogTask) {
        return;
      }
      if (global.tnpNonInteractive) {
        PROGRESS_DATA.log({ msg: dot ? '.' : details, type: 'info' });
      }
      if (dot) {
        process.stdout.write(chalk.cyan('.'));
      } else {
        if (useSpinner) {
          process?.send(`taskstart::► ${chalk.cyan(details)}`);
        } else {
          if (global.globalSystemToolMode) {
            console.log('- ' + chalk.cyan(details));
          } else {
            console.log(details);
          }
        }
      }
    };
    if (isLogTask) {
      global[KEY_IMPORTANTCE.LAST_TASK_STARTED] = 1;
    } else {
      global[KEY_IMPORTANTCE.LAST_TASK_STARTED] = 0;
    }

    if (!global.muteMessages && !global.hideInfos) {
      if (global[KEY.LAST_TASK_STARTED] === details) {
        global[KEY_COUNT.LAST_TASK_STARTED]++;
        if (global[KEY_COUNT.LAST_TASK_STARTED] > LIMIT) {
          display(true);
        } else {
          display();
        }
      } else {
        global[KEY_COUNT.LAST_TASK_STARTED] = 0;
        global[KEY.LAST_TASK_STARTED] = details;
        display();
      }
    }
    //#endregion
  }
  //#endregion

  taskDone(details?: any | string, isLessImportant = false) {
    if (Helpers.isBrowser) {
      console.info(details);
      return;
    }
    //#region @backend

    if (global.hideLog && global[KEY_IMPORTANTCE.LAST_TASK_STARTED] > 0) {
      return;
    }

    if (!details) {
      const lastStatedTask = global[KEY.LAST_TASK_STARTED];
      details = lastStatedTask;
    }

    details =
      `[${dateformat(new Date(), 'dd-mm-yyyy HH:MM:ss')}] ` +
      transformData(details);

    const display = (dot = false) => {
      // if(!details) {
      //   console.warn(`Probabl you forgot set Helpers.taskStart() for Helpers.taskDone()`)
      // }
      details = details?.replace('...', '');
      if (global.tnpNonInteractive) {
        PROGRESS_DATA.log({ msg: dot ? '.' : details, type: 'info' });
      }
      if (dot) {
        process.stdout.write(chalk.green('.'));
      } else {
        if (useSpinner) {
          process?.send(`taskdone::\u2713 ${chalk.green(details)}`);
        } else {
          if (global.globalSystemToolMode) {
            console.log('\u2713 ' + chalk.green(details));
          } else {
            console.log(details);
          }
        }
      }
    };

    if (!global.muteMessages && !global.hideInfos) {
      if (global[KEY.LAST_TASK_DONE] === details) {
        global[KEY_COUNT.LAST_TASK_DONE]++;
        if (global[KEY_COUNT.LAST_TASK_DONE] > LIMIT) {
          display(true);
        } else {
          display();
        }
      } else {
        global[KEY_COUNT.LAST_TASK_DONE] = 0;
        global[KEY.LAST_TASK_DONE] = details;
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
    // console.log({
    //   'global.hideLog': global.hideLog,
    //   'debugLevel': debugLevel,
    //   'global.verboseLevel': global.verboseLevel,
    //   'global.muteMessages': global.muteMessages,
    //   details
    // })
    const verboseLevel = global.verboseLevel || 0;
    debugLevel = debugLevel || 0;

    if (debugLevel > verboseLevel) {
      return;
    }

    details = transformData(details);

    const display = (dot = false) => {
      if (global.tnpNonInteractive) {
        PROGRESS_DATA.log({ msg: dot ? '.' : details });
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

    if (!global.muteMessages && !global.hideLog) {
      if (global[KEY.LAST_LOG] === details) {
        global[KEY_COUNT.LAST_LOG]++;
        if (global[KEY_COUNT.LAST_LOG] > LIMIT) {
          display(true);
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

  //#region @backend
  /**
   * Logs not visible in normal use of firedev-cli
   */
  logSuccess(details: any | string) {
    if (global.hideLog && frameworkName === 'firedev') {
      return;
    }
    Helpers.success(details);
  }
  //#endregion

  //#region @backend
  /**
   * Logs not visible in normal use of firedev-cli
   */
  logInfo(details: string, repeatable = false) {
    if (global.hideLog && frameworkName === 'firedev') {
      return;
    }
    Helpers.info(details, repeatable);
  }
  //#endregion

  //#region @backend
  /**
   * Logs not visible in normal use of firedev-cli
   */
  logError(details: any, noExit = false, noTrace = false) {
    if (global.hideLog && frameworkName === 'firedev') {
      return;
    }
    Helpers.error(details, noExit, noTrace);
  }
  //#endregion

  //#region @backend
  /**
   * Logs not visible in normal use of firedev-cli
   */
  logWarn(details: string, trace = false) {
    if (global.hideLog && frameworkName === 'firedev') {
      return;
    }
    Helpers.warn(details, trace);
  }
  //#endregion

  //#region warn
  warn(details: string, trace = false) {
    if (Helpers.isBrowser) {
      console.warn(details);
      return;
    }

    //#region @backend
    if (forceTrace) {
      trace = true;
    }
    const display = (dot = false) => {
      if (global.tnpNonInteractive) {
        PROGRESS_DATA.log({ msg: dot ? '.' : details, type: 'warning' });
      }

      if (dot) {
        process.stdout.write(chalk.yellow('.'));
      } else {
        if (useSpinner) {
          process?.send(`warn::${chalk.yellow(details)}`);
        } else {
          if (global.globalSystemToolMode) {
            if (trace) {
              !global.muteMessages &&
                !global.hideWarnings &&
                console.trace(chalk.yellow(details));
            } else {
              !global.muteMessages &&
                !global.hideWarnings &&
                console.log(chalk.yellow(details));
            }
          } else {
            if (trace) {
              !global.muteMessages &&
                !global.hideWarnings &&
                console.trace(details);
            } else {
              !global.muteMessages &&
                !global.hideWarnings &&
                console.log(details);
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

function transformData(details: any) {
  if (typeof details === 'object') {
    if (Array.isArray(details)) {
      return details.join('\n');
    }
    try {
      const json = JSON.stringify(details);
      details = json;
    } catch (error) {
      return details;
    }
  }
  return details;
}
