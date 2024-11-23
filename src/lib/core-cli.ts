import { chalk } from './core-imports';
import { Helpers } from './index';
import { frameworkName } from './framework-name';
//#region @backend

import { child_process } from './core-imports';

import { checkSyncIfCommandExists } from './command-exists';

const commandExistsSync = checkSyncIfCommandExists;
const check = require('check-node-version');
// @ts-ignore
import isElevated from 'is-elevated';
import { requiredForDev } from './required-global-npm-packages';
//#endregion


export class CLI {

  //#region @backend
  public static isElevated = isElevated;
  public static commandExistsSync = commandExistsSync;
  //#endregion

  public static chalk = chalk;

  //#region @backend
  public static installEnvironment(globalDependencies: any  = requiredForDev) {
    Helpers.info(`[taon-cli] INSTALLING GLOBAL ENVIRONMENT FOR TAON... it will take a few minutes`)
    const missingNpm: any[] = [];
    globalDependencies.npm.forEach(pkg => {
      if (!commandExistsSync(pkg.name)) {
        missingNpm.push(pkg)
      }
    })

    if (missingNpm.length > 0) {

      const toInstall = missingNpm
        .map(pkg => {
          const n = pkg.installName ? pkg.installName : pkg.name;
          return pkg.version ? `${n}@${pkg.version}` : n;
        })
        .join(' ');
      Helpers.info('Installing missing dependencies...')
      const cmd = `npm install -g ${toInstall}`;
      Helpers.run(cmd, { output: (frameworkName === 'tnp'), biggerBuffer: true }).sync();
    }
    Helpers.info(`[taon-cli] INSTALLING GLOBAL ENVIRONMENT FOR TAON...done`)
  }
  //#endregion

  //#region @backend
  /**
   * Check if global system tools are available for isomorphic app development
   */
  public static checkEnvironment(globalDependencies: any = requiredForDev) {
    const missingNpm: any[] = [];
    globalDependencies.npm.forEach(pkg => {
      if (!commandExistsSync(pkg.name)) {
        missingNpm.push(pkg)
      }
    })

    if (missingNpm.length > 0) {

      const toInstall = missingNpm
        .map(pkg => {
          const n = pkg.installName ? pkg.installName : pkg.name;
          return pkg.version ? `${n}@${pkg.version}` : n;
        })
        .join(' ');
      Helpers.error(`Missing npm dependencies.`, true, true)
      const cmd = `npm install -g ${toInstall}`;
      Helpers.error(`Please run: ${chalk.green(cmd)}`, false, true);
    }

    globalDependencies.programs.forEach(p => {
      if (!commandExistsSync(p.name)) {
        Helpers.error(chalk.red(`Missing command line tool "${p.name}".`), false, false);
        Helpers.error(`Please install it from: ${chalk.green(p.website)}`, false, false);
      }
    })


    try {
      child_process.execSync(`check-node-version --node ">= 13"`, { stdio: [0, 1, 2] })
    } catch (error) {
      process.exit(0)
    }
  }
  //#endregion


  //#region @backend
  minimalNodeVersionExistsGlobal(minimalNode: string) {
    return new Promise<boolean>((resolve) => {
      check(
        { node: `>= ${minimalNode}`, },
        (error, result) => {
          if (error) {
            Helpers.error(error, true, true)
            resolve(false);
            return;
          } else if (result.isSatisfied) {
            resolve(true);
          } else {
            Helpers.error("[taon-cli] Some package version(s) failed!", true, true);

            for (const packageName of Object.keys(result.versions)) {
              if (!result.versions[packageName].isSatisfied) {
                Helpers.error(`[taon-cli] Missing ${packageName}.`, true, true);
              }
            }
            resolve(false);
          }
        }
      );
    });
  }
  //#endregion

}

