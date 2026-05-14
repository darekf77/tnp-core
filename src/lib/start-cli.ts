//#region tnp-helpers cli template
// import { Helpers, BaseCommandLineFeature } from 'tnp-helpers/src';
// import { BaseProject, BaseStartConfig } from 'tnp-helpers/src'; // @backend

import { BehaviorSubject, Subject } from 'rxjs';

import { chokidar, crossPlatformPath } from './core-imports';
import { Utils } from './utils';
import { UtilsProcess } from './utils-process';
import { UtilsTerminal } from './utils-terminal';

// class $Version extends BaseCommandLineFeature<{}> {
//   public _() {
//     console.log(`Hello world from cli`);
//     this._exit();
//   }
// }
//#endregion

/**
 *
 * @param argsv process.argsv
 * @param filename needed if you want ipc communicaiton
 */
export async function startCli(
  argsv: string[],
  filename: string,
): Promise<void> {
  //#region @backendFunc
  // console.log('STARTING CLI');
  const [firstParam, secondParam, thirdParam] = argsv.slice(2);

  if (firstParam === 'line') {
    console.log('asd')
    UtilsTerminal.drawHorizontalLine();
    console.log('heelleelle')
    UtilsTerminal.drawHorizontalLine();
    process.exit(0);
  }

  if (firstParam === 'show') {
    if (secondParam === 'loop') {
      while (true) {
        console.log(thirdParam);
        await Utils.wait(1);
      }
    } else {
      const message = secondParam || thirdParam;
      console.log(`start ${message}`);
      const waitSec = 4;
      console.log(`waiting ${waitSec} seconds ${message} $`);
      await Utils.wait(waitSec);
      console.log(`end ${message}`);
      process.exit(0);
    }
  } else {
    const rebuildOnChange = new Subject<void>();
    console.log('starting...')
    // console.log('waiting for user to press anything');

    // chokidar
    //   .watch(crossPlatformPath([process.cwd(), 'TODO.md']), {
    //     ignoreInitial: true,
    //   })
    //   .on('all', () => {
    //     console.log('NOTIFY!');
    //     rebuildOnChange.next();
    //   });

    // UtilsTerminal.waitForUserAnyKey(() => {
    //   console.log('trigger rebuild');
    //   rebuildOnChange.next({});
    //   // rebuildOnChange.next({});
    // });

    UtilsProcess.startAsync('tnp-core show hello1', process.cwd(), {
      rebuildOnChange,
    });

    UtilsProcess.startAsync('tnp-core show hello2', process.cwd(), {
      rebuildOnChange,
    });

    while (true) {
      await UtilsTerminal.waitForUserAnyKey(() => {
        console.log('trigger rebuild');
        rebuildOnChange.next();
      });
    }
    // process.stdin.resume();
  }
}

export default startCli;
