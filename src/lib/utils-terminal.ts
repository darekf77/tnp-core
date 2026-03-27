//#region imports
import 'reflect-metadata';

import { dotTaonFolder } from './constants';
import { _, crossPlatformPath, os, chalk, win32Path } from './core-imports';
import { spawn, child_process } from './core-imports';
import { CoreModels } from './core-models';
import { Utils } from './utils';
import { UtilsOs } from './utils-os';
import { UtilsProcess } from './utils-process';

import { frameworkName, Helpers } from './index';

//#endregion

export namespace UtilsTerminal {
  //#region utils terminal / models
  export interface SelectChoice {
    /**
     * Title of the choice
     */
    name?: string;
    disabled?: boolean;
  }

  export interface SelectChoiceValue<T = string> extends SelectChoice {
    value?: T;
  }

  type SelectActionChoice = {
    [choice: string]: SelectChoice & {
      /**
       * Action to execute
       */
      action?: () => any;
    };
  };
  //#endregion

  //#region utils terminal / wait
  export const wait = (second: number): Promise<void> => Utils.wait(second);
  //#endregion

  //#region utils terminal / wait milliseconds
  export const waitMilliseconds = (milliseconds: number): Promise<void> =>
    Utils.waitMilliseconds(milliseconds);
  //#endregion

  //#region utils terminal / is verbose mode
  /**
   * Check if cli is running in verbose mode
   * @returns true if cli is running with arugment -verbose
   */
  export const isVerboseModeTaon = (): boolean => {
    //#region @backendFunc
    return !global.hideLog;
    //#endregion
  };
  //#endregion

  //#region utils terminal / wait for user any key
  export const waitForUserAnyKey = async (
    callback: () => void | Promise<void>,
    options?: {
      /**
       * by default, the action is only triggered once when a key is pressed.
       * if this option is set, the action will be triggered on every key press.
       * (Promise will not be resolved until process is killed)
       */
      triggerActionEveryKeypress?: boolean;
    },
  ): Promise<void> => {
    //#region @backendFunc
    return new Promise<void>(resolve => {
      options = options || {};
      const stdin = process.stdin;

      const wasRaw = (stdin as any).isRaw; // remember if it was already raw
      if (!options?.triggerActionEveryKeypress) {
        stdin.setRawMode?.(true);
        stdin.resume();
      }
      let stoping = false;

      const onKeyPress = async () => {
        if (!options?.triggerActionEveryKeypress) {
          if (stoping) {
            return;
          }
          stoping = true;
        }
        // restore previous raw mode state
        if (!options?.triggerActionEveryKeypress) {
          if (wasRaw) {
            stdin.setRawMode?.(true);
          } else {
            stdin.setRawMode?.(false);
          }

          stdin.pause();
        }

        if (callback) await callback();

        if (!options?.triggerActionEveryKeypress) {
          resolve();
        }
      };

      if (options?.triggerActionEveryKeypress) {
        stdin.on('data', onKeyPress);
      } else {
        stdin.once('data', onKeyPress);
      }
    });
    //#endregion
  };
  //#endregion

  //#region utils terminal / get terminal height
  export const getTerminalHeight = (): number => {
    //#region @backendFunc
    if (process.stdout.rows && process.stdout.rows > 10) {
      return process.stdout.rows;
    }

    // fallback 1: environment variable (works in most shells)
    if (process.env.LINES) {
      const lines = parseInt(process.env.LINES, 10);
      if (!isNaN(lines) && lines > 10) return lines;
    }

    // fallback 2: use `tput` (works in macOS/Linux, even VSCode)
    try {
      const result = child_process.spawnSync('tput', ['lines'], {
        encoding: 'utf-8',
      });
      const lines = parseInt(result.stdout.trim(), 10);
      if (!isNaN(lines) && lines > 10) return lines;
    } catch {}

    // fallback default
    return 24;
    //#endregion
  };
  //#endregion

  //#region utils terminal / clear
  export const clearConsole = (): void => {
    //#region @backendFunc
    Helpers.msgCacheClear();
    console.clear();
    //#endregion
    // TODO @LAST
    // let shouldClear = true;
    //#region @backend
    // const inspector = require('inspector');
    // const isDebugging = process.execArgv.some(
    //   arg => arg.startsWith('--inspect') || arg.startsWith('--debug'),
    // );
    // const isChromeConnected = inspector.url() !== undefined;

    // if (
    //   isDebugging ||
    //   isChromeConnected ||
    //   process.env.NO_CONSOLE_CLEAR === 'true'
    // ) {
    //   shouldClear = false;
    // }

    //#endregion

    //#region @browser
    // const isDevToolsOpen = (() => {
    //   const threshold = 160; // devtools resizing causes this to be larger
    //   return (
    //     window.outerHeight - window.innerHeight > threshold ||
    //     window.outerWidth - window.innerWidth > threshold
    //   );
    // })();

    // if (isDevToolsOpen) {
    //   shouldClear = false;
    // }
    //#endregion
    // if (shouldClear) {
    // Helpers.msgCacheClear?.();
    // console.clear?.();
    // }
    // console.log('\x1Bc');
    // process.stdout.write('\033c\033[3J');
    // try {
    //   run('clear').sync()
    // } catch (error) {
    //   console.log('clear console not succedd')
    // }
  };
  //#endregion

  //#region utils terminal / transform choices
  const transformChoices = (choices: any): SelectChoiceValue[] => {
    //#region @backendFunc
    if (!_.isArray(choices) && _.isObject(choices)) {
      choices = Object.keys(choices)
        .map(key => {
          return {
            name: choices[key].name,
            disabled: !!choices[key].disabled,
            value: key,
          };
        })
        .reduce((a, b) => a.concat(b), []);
    }
    return choices.map(c => ({
      name: c.name,
      value: c.value,
      disabled: c.disabled,
    }));
    //#endregion
  };
  //#endregion

  //#region utils terminal / multiselect
  export const multiselect = async <T = string>(options: {
    question?: string;
    /**
     * If true, then only one choice can be selected
     * @deprecated use select instead
     */
    onlyOneChoice?: boolean;
    choices: SelectChoiceValue<T>[] | { [choice: string]: SelectChoice };
    autocomplete?: boolean;
    /**
     * at least one choice must be selected
     */
    required?: boolean;
    defaultSelected?: string[];
  }): Promise<T[]> => {
    //#region @backendFunc
    const { select } = await import('inquirer-select-pro');
    const fuzzy = await import('fuzzy');
    options = _.cloneDeep(options);
    options.required = !!options.required;
    options.question = options.question || 'Select one or multiple options';
    options.autocomplete = _.isNil(options.autocomplete)
      ? true
      : options.autocomplete;
    const choices = transformChoices(options.choices) as any;

    if (Object.keys(choices || {}).length === 0) {
      Helpers.info(options.question);
      if (options.required) {
        throw new Error(
          'No choices available but at least one selection is required.',
        );
      }
      await UtilsTerminal.pressAnyKeyToContinueAsync({
        message: 'No choices available. Press any key to continue...',
      });
      return [];
    }

    while (true) {
      try {
        const defaultValue = options.defaultSelected || [];
        // console.log({ defaultValue, choices });
        const res = await select({
          message: options.question,
          // options: choices,
          clearInputWhenSelected: true,
          emptyText: '<< No results >>',
          multiple: !options.onlyOneChoice,
          canToggleAll: true,
          pageSize: 10,
          loop: true,
          defaultValue,
          options: !options.autocomplete
            ? choices
            : (input = '') => {
                if (!input) {
                  return choices;
                }
                const fuzzyResult = fuzzy.filter(
                  input,
                  choices.map(f => f.name),
                );
                return fuzzyResult.map(el => {
                  return {
                    name: el.original,
                    value: choices.find(c => c.name === el.original).value,
                  };
                });
              },
        });
        const result = (Array.isArray(res) ? res : [res]) as T[];
        // console.log({ result });
        if (options.required && result.length === 0) {
          await UtilsTerminal.pressAnyKeyToContinueAsync({
            message:
              'You must select at least one option. Press any key to continue...',
          });
          continue;
        }
        return result;
      } catch (error) {
        await UtilsTerminal.pressAnyKeyToContinueAsync({
          message: 'Something went wrong. Press any key to try again...',
        });
      }
    }

    //#region old autocomplete
    // const prompt = new AutoComplete({
    //   name: 'value',
    //   message: question,
    //   limit: 10,
    //   multiple: true,
    //   choices,
    //   initial: (selected || []).map(s => s.name),
    //   // selected,
    //   hint: '- Space to select. Return to submit',
    //   footer() {
    //     return CLI.chalk.green('(Scroll up and down to reveal more choices)');
    //   },
    //   result(names) {
    //     return _.values(this.map(names)) || [];
    //   },
    // });

    // const res = await prompt.run();
    //#endregion

    //#region old inquirer
    // const res = (await inquirer.prompt({
    //   type: 'checkbox',
    //   name: 'value',
    //   message: question,
    //   default: selected.map(s => s.name),
    //   choices,
    //   pageSize: 10,
    //   loop: false,
    // } as any)) as any;
    // return res.value;
    //#endregion
    //#endregion
  };
  //#endregion

  //#region utils terminal / multiselect and execute
  /**
   * Similar to select but executes action if provided
   * @returns selected and executed value
   */
  export const multiselectActionAndExecute = async <
    CHOICE extends SelectActionChoice = SelectActionChoice,
  >(
    choices: CHOICE,
    options?: {
      question?: string;
      autocomplete?: boolean;
      defaultSelected?: string;
      hint?: string;
      executeActionsOnDefault?: boolean;
    },
  ) => {
    //#region @backendFunc
    options = options || ({} as any);
    options.question = options.question || 'Select actions to execute';
    options.executeActionsOnDefault = _.isBoolean(
      options.executeActionsOnDefault,
    )
      ? options.executeActionsOnDefault
      : true;

    // if (Object.keys(choices || {}).length === 0) {
    //   await UtilsTerminal.pressAnyKeyToContinueAsync({
    //     message: 'No choices available. Press any key to continue...',
    //   });
    //   return { selected: [] as (keyof CHOICE)[], action: async () => void 0 };
    // }

    const res = await multiselect<keyof typeof choices>({
      ...(options as any),
      choices,
    });

    if (Array.isArray(res) && res.length === 0) {
      return {
        selected: [] as (keyof CHOICE)[],
        actionResults: [],
        actions: [],
      };
    }

    // clearConsole();
    let actionResults: unknown[] = [];
    if (options.executeActionsOnDefault) {
      for (const key in res) {
        if (res[key] && choices[key] && _.isFunction(choices[key].action)) {
          actionResults.push(await choices[key].action());
        }
      }
    }
    // console.log(`Response from select: "${res}"`);
    // pipeEnterToStdin();
    return {
      selected: res,
      actionResults,
      /**
       * object containing all selected actions
       */
      actions: res.map(r => choices[r].action),
    };
    //#endregion
  };
  //#endregion

  //#region utils terminal / select and execute
  /**
   * Similar to select but executes action if provided
   * @returns selected and executed value
   */
  export const selectActionAndExecute = async <
    CHOICE extends SelectActionChoice = SelectActionChoice,
  >(
    choices: CHOICE,
    options?: {
      question?: string;
      autocomplete?: boolean;
      defaultSelected?: string;
      hint?: string;
      executeActionOnDefault?: boolean;
    },
  ) => {
    //#region @backendFunc
    options = options || ({} as any);
    options.question = options.question || 'Select action to execute';
    options.executeActionOnDefault = _.isBoolean(options.executeActionOnDefault)
      ? options.executeActionOnDefault
      : true;

    if (Object.keys(choices || {}).length === 0) {
      await UtilsTerminal.pressAnyKeyToContinueAsync({
        message: 'No choices available. Press any key to continue...',
      });
      return { selected: void 0, action: async () => void 0 };
    }

    const res = await select<keyof typeof choices>({
      ...(options as any),
      choices,
    });
    // clearConsole();
    let actionResult: unknown;
    if (
      res &&
      choices[res] &&
      _.isFunction(choices[res].action) &&
      options.executeActionOnDefault
    ) {
      actionResult = await choices[res].action();
    }
    // console.log(`Response from select: "${res}"`);
    // pipeEnterToStdin();
    return {
      selected: res,
      actionResult,
      action: async () => await choices[res].action(),
    };
    //#endregion
  };
  //#endregion

  //#region utils terminal / select
  export const select = async <T = string>(options: {
    question?: string;
    choices: SelectChoiceValue<T>[] | { [choice: string]: SelectChoice };
    autocomplete?: boolean;
    defaultSelected?: string;
    hint?: string;
  }): Promise<T | undefined> => {
    //#region @backendFunc
    options = _.cloneDeep(options);
    options.question = options.question || 'Select option';
    options.hint = _.isNil(options.hint)
      ? '- Space to select. Return to submit'
      : options.hint;
    options.autocomplete = _.isNil(options.autocomplete)
      ? true
      : options.autocomplete;
    const choices = transformChoices(options.choices);

    let preselectedIndex =
      choices.findIndex(c => c.value === options.defaultSelected) || 0;
    if (preselectedIndex === -1) {
      preselectedIndex = 0;
    }
    let prompt;
    // console.log({ choicesBefore: choices });

    if (!choices || choices.length === 0) {
      Helpers.info(options.question);
      await UtilsTerminal.pressAnyKeyToContinueAsync({
        message: '< No choices available. Press any key to continue... > ',
      });
      return;
    }

    while (true) {
      try {
        if (options.autocomplete) {
          const { AutoComplete } = require('enquirer');
          prompt = new AutoComplete({
            name: 'value',
            message: options.question,
            limit: 10,
            multiple: false,
            initial: preselectedIndex,
            choices,
            hint: options.hint,
            footer() {
              return chalk.green('(Scroll up and down to reveal more choices)');
            },
          });
          const res = await prompt.run();
          // console.log({choices})
          // console.log(`Selected!!!: "${res}" `);
          return res;
        } else {
          const { Select } = require('enquirer');
          prompt = new Select({
            // name: 'value',
            message: options.question,
            choices,
          });
          const res = await prompt.run();
          return choices.find(c => c.name === res)?.value as any;
        }
      } catch (error) {
        await UtilsTerminal.pressAnyKeyToContinueAsync({
          message: `Error during selection: ${error}. Press any key to retry...`,
        });
      }
    }

    //#region does not work
    // const choice = await multiselect<T>({
    //   ...{
    //     question,
    //     choices,
    //     autocomplete,
    //     defaultSelected: [defaultSelected],
    //   },
    //   onlyOneChoice: true,
    // });
    // return _.first(choice) as T;
    //#endregion

    //#endregion
  };

  //#endregion

  //#region utils terminal / pipe enter to stdin
  export const pipeEnterToStdin = (): void => {
    //#region @backendFunc
    process.stdin.push('\n');
    //#endregion
  };
  //#endregion

  //#region utils terminal / input
  export const input = async ({
    defaultValue,
    question,
    required,
    validate,
  }: {
    defaultValue?: string;
    question: string;
    required?: boolean;
    validate?: (value: string) => boolean;
  }): Promise<string> => {
    //#region @backendFunc
    const initial = defaultValue || '';

    const inquirer = await import('inquirer');

    while (true) {
      // Create an input prompt
      const response = await inquirer.prompt({
        type: 'input',
        name: 'name',
        message: question,
        required,
        default: initial,
        // required: _.isNil(required) ? true : required,
      });
      const anwser = response.name;
      if (required && !anwser) {
        continue;
      }
      if (_.isFunction(validate) && !validate(anwser)) {
        continue;
      }
      return anwser;
    }
    //#endregion
  };
  //#endregion

  //#region utils terminal / confirm
  export const confirm = async (options?: {
    /**
     * default: Are you sure?
     */
    message?: string;
    callbackTrue?: () => any;
    callbackFalse?: () => any;
    /**
     * default: true
     */
    defaultValue?: boolean;
    engine?: 'inquirer-toggle' | 'prompts' | 'enquirer' | '@inquirer/prompts';
  }) => {
    //#region @backendFunc
    options = options || ({} as any);
    options.defaultValue = _.isBoolean(options.defaultValue)
      ? options.defaultValue
      : true;

    options.message = options.message || 'Are you sure?';
    options.engine = options.engine || 'inquirer-toggle';
    const {
      defaultValue,
      message,
      // mustAnswerQuestion,
      callbackFalse,
      callbackTrue,
    } = options;

    let response = {
      value: defaultValue,
    };
    if (global.tnpNonInteractive) {
      Helpers.info(`${message} - AUTORESPONSE: ${defaultValue ? 'YES' : 'NO'}`);
    } else {
      if (options.engine === 'inquirer-toggle') {
        const inquirerToggle = (await import('inquirer-toggle')).default;
        const answer = await inquirerToggle({
          message,
          default: defaultValue,
          theme: {
            style: {
              highlight: chalk.bold.cyan.underline,
            },
          },
        });
        response = {
          value: answer,
        };
      } else if (options.engine === '@inquirer/prompts') {
        // @ts-ignore
        const { confirm } = await import('@inquirer/prompts');
        const answer = await confirm({
          message,
          default: defaultValue,
        });
        response = {
          value: answer,
        };
      } else if (options.engine === 'prompts') {
        const prompts = require('prompts');
        response = await prompts({
          type: 'toggle',
          name: 'value',
          message,
          initial: defaultValue,
          active: 'yes',
          inactive: 'no',
        });
      } else if (options.engine === 'enquirer') {
        const { Select } = require('enquirer');
        const choices = defaultValue ? ['yes', 'no'] : ['no', 'yes'];
        const prompt = new Select({
          name: 'question',
          message,
          choices,
        });
        response = {
          value: (await prompt.run()) === 'yes',
        };
      }
    }
    if (response.value) {
      if (callbackTrue) {
        await Helpers.runSyncOrAsync({ functionFn: callbackTrue });
      }
    } else {
      if (callbackFalse) {
        await Helpers.runSyncOrAsync({ functionFn: callbackFalse });
      }
    }
    return response.value;
    //#endregion
  };
  //#endregion

  //#region utils terminal / press any key to continue
  export const pressAnyKeyToContinueAsync = (options?: {
    message?: string;
  }): Promise<void> => {
    //#region @backendFunc
    options = options || {};
    options.message =
      options.message || chalk.bold('Press any key to continue...');
    const { message } = options;
    const readline = require('readline');
    return new Promise(resolve => {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      // Prompt user with the question
      rl.question(message, answer => {
        rl.close();
        resolve(answer);
      });
    });
    //#endregion
  };
  //#endregion

  //#region press key and continue
  /**
   * @deprecated use UtilsTerminal.pressAnyKey
   */
  export const pressKeyAndContinueSync = (
    message = 'Press enter to continue..',
  ) => {
    //#region @backendFunc
    return UtilsTerminal.pressAnyKey({ message });
    //#endregion
  };
  //#endregion

  //#region utils terminal / press any key to try again error occurred
  /**
   * @returns true if user wants to try again, false otherwise
   */
  export const pressAnyKeyToTryAgainErrorOccurred = async (
    error: unknown,
  ): Promise<boolean> => {
    //#region @backendFunc
    const errMsg = error instanceof Error ? error.message : String(error);
    frameworkName === 'tnp' && Helpers.error(errMsg, true, true);

    if (
      !(await UtilsTerminal.confirm({
        message: 'An error occurred. Do you want to try again?',
      }))
    ) {
      return false;
    }
    return true;
    //#endregion
  };
  //#endregion

  //#region utils terminal / press any key
  /**
   * @deprecated use UtilsTerminal.pressAnyKeyToContinueAsync()
   */
  export const pressAnyKey = (options?: { message?: string }) => {
    //#region @backendFunc
    options = options || {};
    options.message = options.message || 'Press any key to continue...';
    const { message } = options;
    if (process.platform === 'win32') {
      const terminal = UtilsProcess.getBashOrShellName();
      // console.log({ terminal });
      if (terminal === 'gitbash') {
        const getGitBashPath = UtilsProcess.getGitBashPath();
        // console.log({ getGitBashPath });
        const gitbashCommand = `read -p "${chalk.bold(message)}"`;
        child_process.execSync(gitbashCommand, {
          stdio: 'inherit',
          shell: getGitBashPath,
        });
      } else {
        console.log(chalk.bold(message));
        spawn.sync('pause', '', { shell: true, stdio: [0, 1, 2] });
      }
      return;
    }

    console.log(chalk.bold(message));
    require('child_process').spawnSync('read _ ', {
      shell: true,
      stdio: [0, 1, 2],
    });
    //#endregion
  };
  //#endregion

  //#region utils terminal / preview long list as select
  export const previewLongList = async (
    list: string | string[],
    listName = 'List',
  ): Promise<void> => {
    //#region @backendFunc
    if (!Array.isArray(list)) {
      list = list.split('\n');
    }
    const choices = list.reduce((a, b) => {
      return _.merge(a, {
        [b]: {
          name: b,
          // action: () => {},
        },
      });
    }, {});
    await selectActionAndExecute(choices, {
      autocomplete: true,
      question: listName,
      hint: 'Press enter to return',
    });
    //#endregion
  };
  //#endregion

  //#region utils terminal / preview long list with 'less' (git log like)
  /**
   * Displays a long list in the console using a pager like `less`.
   * Returns a Promise that resolves when the user exits the pager.
   *
   * @param {string} list - The long string content to display.
   * @returns {Promise<void>} A Promise that resolves when the pager exits.
   */
  export const previewLongListGitLogLike = async (
    list: string | string[],
  ): Promise<void> => {
    //#region @backendFunc
    UtilsTerminal.clearConsole();
    if (Array.isArray(list)) {
      list = list.join('\n');
    }
    await new Promise((resolve, reject) => {
      const isWindows = os.platform() === 'win32';
      const pager = isWindows ? 'more' : 'less';

      const tmpFilePath = crossPlatformPath([
        UtilsOs.getRealHomeDir(),
        `${dotTaonFolder}/temp-file-preview`,
        `taon-preview-${Date.now()}.txt`,
      ]);
      const pagerArgs = isWindows
        ? [win32Path(tmpFilePath)]
        : ['-R', '-f', tmpFilePath];

      Helpers.writeFile(tmpFilePath, list);

      const less = spawn(pager, pagerArgs, {
        stdio: 'inherit',
        shell: true,
      });

      less.on('exit', code => {
        Helpers.removeFileIfExists(tmpFilePath);
        if (code === 0) {
          resolve(void 0);
        } else {
          reject(new Error(`"${pager}" process exited with code ${code}`));
        }
      });

      less.on('error', err => {
        Helpers.removeFileIfExists(tmpFilePath);
        reject(err);
      });
    });
    await UtilsTerminal.pressAnyKeyToContinueAsync({
      message: 'Done previewing. Press any key to go back...',
    });
    //#endregion
  };
  //#endregion

  //#region utils terminal / draw big text
  export const drawBigText = async (
    text: string,
    options?: {
      skipDrawing?: boolean;
      align?: CoreModels.CfontAlign;
      style?: CoreModels.CfontStyle;
    },
  ): Promise<string> => {
    //#region @backendFunc
    options = options || {};
    const cfonts = require('cfonts');
    const output = cfonts.render(text, {
      font: options.style || 'block',
      align: options.align || 'left',
      colors: ['system'],
      background: 'transparent',
      letterSpacing: 1,
      lineHeight: 1,
      space: true,
      maxLength: '0',
      gradient: false,
      independentGradient: false,
      transitionGradient: false,
      env: 'node',
    });
    console.log(output.string);
    return output.string;
    //#endregion
  };
  //#endregion

  //#region utils terminal / configure bash or shell
  /**
   * @TODO @IN_PROGRESS
   * - export when done
   * Configure bash or powershell prompt to show current folder and git branch
   */
  const configureBashOrShell = async (): Promise<void> => {
    //#region @backendFunc

    //#region configure bash
    const configureBash = () => {
      const configBase = `
      # Extract git branch (if any)
  parse_git_branch() {
      git branch --show-current 2>/dev/null
  }

  # PS1 with only folder basename
  export PS1="\\[\\e[32m\\]\\W\\[\\e[33m\\] \\$(parse_git_branch)\\[\\e[0m\\]\\$ "


      `;
    };
    //#endregion

    //#region configure powershell
    const ConfigurePowerSHell = () => {
      // "terminal.integrated.profiles.windows": {
      //   "PowerShell Core": {
      //     "path": "C:\\Users\\darek\\AppData\\Local\\Microsoft\\WindowsApps\\pwsh.exe"
      //   }
      // },

      // notepad $PROFILE
      //     `$env:PATH += ";${UtilsOs.getRealHomeDir()}\AppData\Local\Programs\oh-my-posh\bin"
      // oh-my-posh init pwsh --config "C:\Users\darek\AppData\Local\Programs\oh-my-posh\themes\jandedobbeleer.omp.json" | Invoke-Expression`
      // function readlink($Path) {
      //     (Get-Item $Path).Target
      // }

      // Set-ExecutionPolicy RemoteSigned -Scope CurrentUser

      const powershellConfig = {
        $schema:
          'https://raw.githubusercontent.com/JanDeDobbeleer/oh-my-posh/main/themes/schema.json',
        console_title_template: '{{ .Folder }}',
        blocks: [
          {
            type: 'prompt',
            alignment: 'left',
            segments: [
              // {
              //   properties: {
              //     cache_duration: 'none',
              //   },
              //   template: '{{ .UserName }}@{{ .HostName }} ',
              //   foreground: '#00FF00',
              //   type: 'session',
              //   style: 'plain',
              // },
              {
                properties: {
                  cache_duration: 'none',
                },
                template: 'POWERSHELL ',
                foreground: '#FF69B4',
                type: 'shell',
                style: 'plain',
              },
              // only basename
              {
                type: 'path',
                style: 'plain',
                template: '{{ .Folder }}',
                foreground: '#D4AF37',
                properties: {
                  style: 'agnoster',
                },
              },
              // {
              //   properties: {
              //     cache_duration: 'none',
              //     style: 'full',
              //   },
              //   template: '{{ .Path }} ',
              //   foreground: '#D4AF37',
              //   type: 'path',
              //   style: 'plain',
              // },
              {
                properties: {
                  branch_icon: '',
                  cache_duration: 'none',
                  display_stash_count: false,
                  display_status: false,
                  display_upstream_icon: false,
                },
                template: '({{ .HEAD }})',
                foreground: '#3399FF',
                type: 'git',
                style: 'plain',
              },
            ],
          },
        ],
        version: 3,
        final_space: true,
      };

      const powerShellDesktJson = crossPlatformPath(
        `${UtilsOs.getRealHomeDir()}/AppData/Local/Programs/oh-my-posh/themes/jandedobbeleer.omp.json`,
      );
    };
    //#endregion

    // TODO terminal UI menu to select bash or powershell
    //#endregion
  };
  //#endregion

  //#region utils terminal / draw line
  export const drawLine = (col = 0) => {
    UtilsOs.drawLine(col);
  };

  //#endregion
}
