import { chalk } from './core-imports';
import { Helpers, UtilsProcess } from './index';
import { frameworkName } from './framework-name';
//#region @backend

import { child_process } from './core-imports';

import { checkSyncIfCommandExists } from './command-exists';

const commandExistsSync = checkSyncIfCommandExists;

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
  public static installEnvironment(globalDependencies: any = requiredForDev) {
    Helpers.info(
      `[taon-cli] INSTALLING GLOBAL ENVIRONMENT FOR TAON... it will take a few minutes`,
    );
    const missingNpm: any[] = [];
    globalDependencies.npm.forEach(pkg => {
      if (!commandExistsSync(pkg.name)) {
        missingNpm.push(pkg);
      }
    });

    if (missingNpm.length > 0) {
      const toInstall = missingNpm
        .map(pkg => {
          const n = pkg.installName ? pkg.installName : pkg.name;
          return pkg.version ? `${n}@${pkg.version}` : n;
        })
        .join(' ');
      Helpers.info('Installing missing dependencies...');
      const cmd = `npm install -g -f ${toInstall}`;
      Helpers.run(cmd, {
        output: frameworkName === 'tnp',
        biggerBuffer: true,
      }).sync();
    }
    Helpers.info(`[${frameworkName}-cli] INSTALLING GLOBAL ENVIRONMENT FOR TAON...done`);
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
        missingNpm.push(pkg);
      }
    });

    if (missingNpm.length > 0) {
      const toInstall = missingNpm
        .map(pkg => {
          const n = pkg.installName ? pkg.installName : pkg.name;
          return pkg.version ? `${n}@${pkg.version}` : n;
        })
        .join(' ');
      Helpers.error(`Missing npm dependencies.`, true, true);
      const cmd = `npm install -g ${toInstall}`;
      Helpers.error(`Please run: ${chalk.green(cmd)}`, false, true);
    }

    globalDependencies.programs.forEach(p => {
      if (!commandExistsSync(p.name)) {
        Helpers.error(
          chalk.red(`Missing command line tool "${p.name}".`),
          false,
          false,
        );
        Helpers.error(
          `Please install it from: ${chalk.green(p.website)}`,
          false,
          false,
        );
      }
    });

    try {
      UtilsProcess.isNodeVersionOk({
        log: true,
      });
    } catch (error) {
      process.exit(1);
    }
  }
  //#endregion
}
