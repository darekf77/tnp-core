//#region imports
import { chalk } from './core-imports';
import { child_process } from './core-imports';
import { frameworkName } from './framework-name';
import { requiredForDev } from './required-global-npm-packages';
import { UtilsOs, UtilsProcess } from './utils';

import { Helpers } from './index';
//#endregion

export class CLI {
  public static chalk = chalk;

  public static installEnvironment(
    globalDependencies: any = requiredForDev,
  ): void {
    //#region @backendFunc
    Helpers.info(
      `[taon-cli] INSTALLING GLOBAL ENVIRONMENT FOR TAON... it will take a few minutes`,
    );
    const missingNpm: any[] = [];
    globalDependencies.npm.forEach(pkg => {
      if (!UtilsOs.commandExistsSync(pkg.name)) {
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
    Helpers.info(
      `[${frameworkName}-cli] INSTALLING GLOBAL ENVIRONMENT FOR TAON...done`,
    );
    //#endregion
  }

  /**
   * Check if global system tools are available for isomorphic app development
   */
  public static checkEnvironment(
    globalDependencies: any = requiredForDev,
  ): void {
    //#region @backendFunc
    const missingNpm: any[] = [];
    globalDependencies.npm.forEach(pkg => {
      if (!UtilsOs.commandExistsSync(pkg.name)) {
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
      if (!UtilsOs.commandExistsSync(p.name)) {
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
    //#endregion
  }
}
