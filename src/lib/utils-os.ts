//#region imports
import 'reflect-metadata';
import * as net from 'net';
import { promisify } from 'util';

import { path, _, crossPlatformPath, os, win32Path } from './core-imports';
import { child_process } from './core-imports';
import { fse } from './core-imports';
import { UtilsProcess } from './utils-process';

import { frameworkName, Helpers } from './index';
//#endregion

export namespace UtilsOs {
  //#region utils os / is running in browser
  /**
   * check if script is running in client browser
   * (websql model -> is also considered as browser
   * because it is running in browser)
   */
  export const isRunningInBrowser = (): boolean => {
    //#region @backend
    return false;
    //#endregion
    return true;
  };
  //#endregion

  //#region utils os / is running in node
  /**
   * check if script is running in nodejs
   * (backend script or electron script)
   */
  export const isRunningInNode = (): boolean => {
    //#region @backend
    return true;
    //#endregion
    return false;
  };
  //#endregion

  //#region utils os / is running in websql
  /**
   * check if script is running special
   * browser mode that has sql.js backend
   * and executes sql queries in browser
   */
  export const isRunningInWebSQL = (): boolean => {
    //#region @backend
    return false;
    //#endregion

    //#region @websqlOnly
    return true;
    //#endregion
    return false;
  };
  //#endregion

  //#region utils os / is running in ssr mode
  export const isRunningInSSRMode = (): boolean => {
    return typeof globalThis.window === 'undefined';
  };
  //#endregion

  //#region utils os / is running in electron
  /**
   * check whether the current process is running inside
   * Electron backend or browser.
   */
  export const isRunningInElectron = (): boolean => {
    // Electron main or renderer (most reliable)
    if (typeof process !== 'undefined' && process?.versions?.electron) {
      return true;
    }

    // Renderer with nodeIntegration
    if (
      typeof globalThis !== 'undefined' &&
      (globalThis as any)?.process?.type === 'renderer'
    ) {
      return true;
    }

    // Renderer with nodeIntegration disabled
    if (
      typeof navigator === 'object' &&
      typeof navigator.userAgent === 'string' &&
      /Electron/i.test(navigator.userAgent)
    ) {
      return true;
    }

    return false;
  };
  //#endregion

  //#region utils os / is running in vscode extension
  /**
   * Check whether the current process is running inside
   * a Visual Studio Code extension.
   */
  export const isRunningInVscodeExtension = (): boolean => {
    //#region @backendFunc
    try {
      const vscode = require('vscode');
      return !!vscode;
    } catch (error) {
      return false;
    }
    // return !!process.env.VSCODE_PID || process.execPath.includes('Code');
    //#endregion
    return false;
  };
  //#endregion

  //#region utils os / is running in wsl
  /**
   * Check wether the current process is running inside
   * windows subsystem for linux (WSL).
   */
  export const isRunningInWsl = (): boolean => {
    //#region @browser
    return false;
    //#endregion
    //#region @backendFunc
    if (process.platform !== 'linux') {
      return false;
    }

    if (os.release().toLowerCase().includes('microsoft')) {
      return true;
    }

    try {
      return fse
        .readFileSync('/proc/version', 'utf8')
        .toLowerCase()
        .includes('microsoft');
    } catch (_) {
      return false;
    }
    //#endregion
  };
  //#endregion

  //#region utils os / is running in windows / powershell / cmd
  const getProcessTree = (): Record<
    number,
    { pid: number; ppid: number; name: string }
  > => {
    //#region @backendFunc
    const tree: Record<number, { pid: number; ppid: number; name: string }> =
      {};

    try {
      const output = child_process
        .execSync(`wmic process get ProcessId,ParentProcessId,Name`, {
          stdio: ['pipe', 'pipe', 'ignore'],
        })
        .toString();

      const lines = output
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('Name'));

      for (const line of lines) {
        const match = line.match(/^(.+?)\s+(\d+)\s+(\d+)$/);
        if (match) {
          const [, name, ppidStr, pidStr] = match;
          const pid = Number(pidStr);
          const ppid = Number(ppidStr);
          tree[pid] = { name: name.trim().toLowerCase(), pid, ppid };
        }
      }
    } catch (err) {
      console.error('WMIC parse error', err);
    }

    return tree;
    //#endregion
  };

  const findAncestorProcessName = (targets: string[]): string | undefined => {
    //#region @backendFunc
    if (process.platform !== 'win32') return;

    const tree = getProcessTree();
    let currentPid = process.ppid;
    let level = 0;

    while (currentPid && level++ < 30) {
      const proc = tree[currentPid];
      if (!proc) break;

      if (targets.includes(proc.name)) return proc.name;
      currentPid = proc.ppid;
    }

    return;
    //#endregion
  };

  export const isRunningInWindowsPowerShell = (): boolean => {
    return (
      findAncestorProcessName(['powershell.exe', 'pwsh.exe']) !== undefined
    );
  };

  export const isRunningInWindowsCmd = (): boolean => {
    return findAncestorProcessName(['cmd.exe']) !== undefined;
  };
  //#endregion

  //#region utils os / is running in docker
  export const isRunningInDocker = (): boolean => {
    //#region @browser
    return false;
    //#endregion
    //#region @backendFunc
    try {
      // 1. Explicit env vars set by Docker or Kubernetes
      if (
        process.env.DOCKER_CONTAINER ||
        process.env.CONTAINER ||
        process.env.KUBERNETES_SERVICE_HOST
      ) {
        return true;
      }

      // 2. Check for /.dockerenv file
      if (fse.existsSync('/.dockerenv')) {
        return true;
      }

      // 3. Check /proc/1/cgroup for docker / container hints
      if (fse.existsSync('/proc/1/cgroup')) {
        const cgroup = fse.readFileSync('/proc/1/cgroup', 'utf8');
        if (/docker|kubepods|containerd|podman/i.test(cgroup)) {
          return true;
        }
      }

      // 4. For cgroup v2, check /proc/self/mountinfo
      if (fse.existsSync('/proc/self/mountinfo')) {
        const mountInfo = fse.readFileSync('/proc/self/mountinfo', 'utf8');
        if (/docker|kubepods|containerd|podman/i.test(mountInfo)) {
          return true;
        }
      }

      // 5. Alpine-specific: check /proc/self/cgroup
      if (fse.existsSync('/proc/self/cgroup')) {
        const selfCgroup = fse.readFileSync('/proc/self/cgroup', 'utf8');
        if (/docker|kubepods|containerd|podman/i.test(selfCgroup)) {
          return true;
        }
      }

      // Default: assume not running in Docker
      return false;
    } catch (err) {
      return false;
    }
    //#endregion
  };
  //#endregion

  //#region utils os / is running in linux graphics capable environment
  export const isRunningInLinuxGraphicsCapableEnvironment = (): boolean => {
    //#region @backendFunc
    if (os.platform() !== 'linux') {
      return false;
    }

    // Check for the DISPLAY environment variable
    return !!process.env.DISPLAY;
    //#endregion
  };
  //#endregion

  //#region utils os / is running in os with graphics capable environment
  export const isRunningInOsWithGraphicsCapableEnvironment = (): boolean => {
    //#region @backendFunc
    if (process.platform === 'win32') {
      return true; // Windows is always graphics capable
    }
    if (process.platform === 'darwin') {
      return true; // macOS is always graphics capable
    }
    return UtilsOs.isRunningInLinuxGraphicsCapableEnvironment();
    //#endregion
  };
  //#endregion

  //#region utils os / is running in cli mode
  /**
   * Check whether the current process is running in CLI mode.
   */
  export const isRunningInCliMode = (): boolean => {
    //#region @browser
    return false;
    //#endregion
    //#region @backendFunc
    return !!global['globalSystemToolMode'];
    //#endregion
  };
  //#endregion

  //#region utils os / is running in mocha test
  /**
   * Check whether the current process is running in mocha test.
   */
  export const isRunningInMochaTest = (): boolean => {
    //#region @browser
    return false;
    //#endregion
    //#region @backendFunc
    // @ts-ignore
    return typeof global['it'] === 'function';
    //#endregion
  };
  //#endregion

  //#region utils os / is port in use
  const isPortInUseOnHost = (port: number, host: string): Promise<boolean> => {
    //#region @backendFunc
    return new Promise(async (resolve, reject) => {
      const server = net.createServer();

      // If the port is already in use, you'll get an EADDRINUSE error.
      server.once('error', (err: NodeJS.ErrnoException) => {
        // console.log('error', err);
        if (err.code === 'EADDRINUSE' || err.code === 'EACCES') {
          resolve(true); // Port is in use
        } else {
          reject(err); // Some other error occurred
        }
      });

      // If the server successfully starts listening, the port is free.
      server.once('listening', () => {
        server.close(() => {
          // console.log(`closing ${port} on ${host}`);
          resolve(false); // Port is not in use
        });
      });

      server.listen(port, host);
    });
    //#endregion
  };

  /**
   * Checks if a given port is already in use (bound by another process).
   *
   * @param port - The port number to check.
   * @param host - The hostname or IP address to bind to (default: '127.0.0.1').
   * @returns Promise<boolean> - Resolves to `true` if the port is in use, otherwise `false`.
   */
  export const isPortInUse = async (
    port: number,
    options?: {
      /**
       * '127.0.0.1' etc..
       */
      checkForSpecificOnlyHost?: string;
    },
  ): Promise<boolean> => {
    //#region @backendFunc
    options = options || {};
    const hostArr = options.checkForSpecificOnlyHost
      ? [options.checkForSpecificOnlyHost]
      : ['::', '::1', '0.0.0.0', '127.0.0.1', 'localhost'];

    // console.log({ hostArr });
    for (const host of hostArr) {
      if (await isPortInUseOnHost(port, host)) {
        return true;
      }
    }
    return false;
    //#endregion
  };
  //#endregion

  //#region utils os / is docker available
  /**
   * Check if docker is available on this system
   * and it is running (daemon active)
   */
  export const isDockerAvailable = async (): Promise<boolean> => {
    if (UtilsOs.isBrowser) {
      return false;
    }
    //#region @backendFunc
    const execAsync = promisify(child_process.exec);
    try {
      // 1. Detect docker binary (different command depending on shell/OS)
      if (process.platform === 'win32') {
        try {
          // PowerShell supports `Get-Command`
          await execAsync('pwsh -Command "Get-Command docker"');
        } catch {
          // fallback for CMD
          await execAsync('where docker');
        }
      } else {
        await execAsync('command -v docker');
      }

      // 2. Check if docker daemon is running (try a lightweight command)
      try {
        await execAsync('docker info');
        // or: await execAsync("docker ps --format '{{.ID}}' --no-trunc");
      } catch (daemonError) {
        return false; // docker installed but not running
      }

      return true;
    } catch (error) {
      return false;
    }
    //#endregion
  };
  //#endregion

  //#region utils os / open folder in file explorer
  export const openFolderInFileExplorer = (folderPath: string): void => {
    //#region @backendFunc
    if (process.platform === 'win32') {
      folderPath = win32Path(folderPath);
    }
    try {
      Helpers.info(`Opening path.. "${folderPath}"`);
      if (process.platform === 'win32') {
        Helpers.run(`explorer .`, {
          cwd: folderPath,
          silence: true,
          output: false,
        }).sync();
        return;
      }
      if (process.platform === 'darwin') {
        Helpers.run(`open .`, {
          cwd: folderPath,
          silence: true,
          output: false,
        }).sync();
        return;
      }
      Helpers.run(`xdg-open .`, {
        cwd: folderPath,
        silence: true,
        output: false,
      }).sync();
    } catch (error) {
      Helpers.warn(`Not able to open in file explorer: "${folderPath}"`, false);
    }
    //#endregion
    //#region @browser
    console.warn(
      `UtilsOs.openFolderInFileExplorer is not supported in browser mode`,
    );
    //#endregion
  };
  //#endregion

  //#region utils os / get real home directory
  export const getRealHomeDir = (): string => {
    //#region @browser
    return '';
    //#endregion
    //#region @backendFunc
    // 1. If SUDO_USER is set (macOS/Linux sudo)
    if (process.env.SUDO_USER) {
      const sudoUser = process.env.SUDO_USER;

      // Try to get from /etc/passwd if it exists (more reliable than guessing)
      if (process.platform !== 'win32' && fse.existsSync('/etc/passwd')) {
        const passwdLine = fse
          .readFileSync('/etc/passwd', 'utf8')
          .split('\n')
          .find(line => line.startsWith(sudoUser + ':'));
        if (passwdLine) {
          const homeDir = passwdLine.split(':')[5];
          if (homeDir) {
            return crossPlatformPath(homeDir);
          }
        }
      }

      // Fallback guess for macOS
      if (process.platform === 'darwin') {
        return crossPlatformPath(path.join('/Users', sudoUser));
      }
      // Fallback guess for Linux
      if (process.platform === 'linux') {
        return crossPlatformPath(path.join('/home', sudoUser));
      }
    }

    // 2. Windows elevated mode
    if (process.platform === 'win32') {
      // When run as Administrator, os.homedir() returns the admin's profile dir.
      // To get the *real* logged-in user, try USERNAME from env
      const realUser =
        process.env.USERNAME ||
        process.env.LOGNAME ||
        process.env.USER ||
        process.env.LNAME;

      if (realUser) {
        const userProfileBase = process.env.SystemDrive
          ? path.join(process.env.SystemDrive, 'Users')
          : 'C:\\Users';
        const guessedHome = path.join(userProfileBase, realUser);
        if (fse.existsSync(guessedHome)) {
          return crossPlatformPath(guessedHome);
        }
      }
    }

    // 3. Default to current user's home
    return crossPlatformPath(os.homedir());
    //#endregion
  };
  //#endregion

  //#region utils os / editor
  export type Editor =
    | 'code'
    | 'codium'
    | 'cursor'
    | 'theia'
    | 'idea'
    | 'idea64';

  export type EditorProcess = `${Editor}` | 'code-oss'; // group alias

  export const EditorArr: Editor[] = [
    'code',
    'codium',
    'cursor',
    'theia',
    'idea',
    'idea64',
  ];
  //#endregion

  //#region utils os / editor processes
  export const EDITOR_PROCESSES: Record<EditorProcess, string[]> = {
    code: ['code', 'Code'],
    codium: ['codium', 'VSCodium'],
    cursor: ['cursor', 'Cursor'],
    theia: ['theia', 'TheiaIDE'],
    'code-oss': [
      'code',
      'Code',
      'codium',
      'VSCodium',
      'cursor',
      'Cursor',
      'theia',
      'TheiaIDE',
    ],
    idea: ['idea', 'idea64', 'IntelliJ IDEA'],
    idea64: ['idea64', 'idea', 'IntelliJ IDEA'],
  };
  //#endregion

  //#region utils os / kill procesesses
  const killProcesses = (names: string[]) => {
    //#region @backendFunc
    if (process.platform === 'win32') {
      for (const name of names) {
        try {
          Helpers.run(`taskkill /f /im ${name}.exe`).sync();
        } catch (error) {}
      }
    } else {
      // fkill is fast and already in your stack
      for (const name of names) {
        try {
          Helpers.run(`fkill -f ${name}`).sync();
        } catch (error) {}
      }
    }
    //#endregion
  };
  //#endregion

  //#region utils os / kill all editors
  export const killAllEditor = (editor: EditorProcess) => {
    //#region @backendFunc
    const processes = EDITOR_PROCESSES[editor];
    if (!processes) return;

    killProcesses(processes);
    process.exit(0);
    //#endregion
  };
  //#endregion

  //#region utils os / detect editor
  export const detectEditor = (options?: {
    fallbackCheckCommandExists?: boolean;
  }): Editor | undefined => {
    //#region @backendFunc
    options = options || {};
    const env = process.env;

    // --- Eclipse Theia (strong signals) ---
    if (
      env.THEIA_PARENT_PID ||
      env.THEIA_WEBVIEW_ENDPOINT ||
      env.THEIA_APP_PROJECT_PATH ||
      env.THEIA_ELECTRON_TOKEN
    ) {
      return 'theia';
    }

    // --- Code-OSS family (Code / Codium / Cursor) ---
    const askpassNode = (env.VSCODE_GIT_ASKPASS_NODE || '').toLowerCase();

    if (askpassNode) {
      if (askpassNode.includes('cursor')) return 'cursor';
      if (askpassNode.includes('codium')) return 'codium';
      if (askpassNode.includes('code')) return 'code';
    }

    // Backup: still inside VS Code–like env
    if (env.VSCODE_IPC_HOOK_CLI || env.VSCODE_PID) {
      return 'code';
    }

    // --- IntelliJ IDEA ---
    if (env.IDEA_INITIAL_DIRECTORY || env.JB_IDE || env.JB_IDE_BROWSER) {
      return 'idea';
    }

    // --- Binary name fallback ---
    const bin = (process.argv[0] || '').toLowerCase();
    if (bin.includes('cursor')) return 'cursor';
    if (bin.includes('codium')) return 'codium';
    if (bin.includes('idea64')) return 'idea64';
    if (bin.includes('idea')) return 'idea';
    if (bin.includes('code')) return 'code';

    if (options.fallbackCheckCommandExists) {
      // --- CLI availability fallback ---
      if (commandExistsSync('code')) return 'code';
      if (commandExistsSync('codium')) return 'codium';
      if (commandExistsSync('cursor')) return 'cursor';
      if (commandExistsSync('idea')) return 'idea';
      if (commandExistsSync('idea64')) return 'idea64';
    }

    //#endregion
  };
  //#endregion

  //#region utils os / get editor settings json path
  export const getEditorSettingsJsonPath = (
    editor: Editor,
    platform: NodeJS.Platform = process.platform,
    env: NodeJS.ProcessEnv = process.env,
  ): string | undefined => {
    //#region @backendFunc
    const home = UtilsOs.getRealHomeDir();

    const winAppData = crossPlatformPath(env.APPDATA);
    const macAppSupport = crossPlatformPath([
      home,
      'Library',
      'Application Support',
    ]);
    const linuxConfig = crossPlatformPath([home, '.config']);

    const baseDirs: Record<
      string,
      { win?: string; mac?: string; linux?: string }
    > = {
      code: {
        win: winAppData && crossPlatformPath([winAppData, 'Code']),
        mac: crossPlatformPath([macAppSupport, 'Code']),
        linux: crossPlatformPath([linuxConfig, 'Code']),
      },
      codium: {
        win: winAppData && crossPlatformPath([winAppData, 'VSCodium']),
        mac: crossPlatformPath([macAppSupport, 'VSCodium']),
        linux: crossPlatformPath([linuxConfig, 'VSCodium']),
      },
      cursor: {
        win: winAppData && crossPlatformPath([winAppData, 'Cursor']),
        mac: crossPlatformPath([macAppSupport, 'Cursor']),
        linux: crossPlatformPath([linuxConfig, 'Cursor']),
      },
      theia: {},
    };

    const base =
      platform === 'win32'
        ? baseDirs[editor].win
        : platform === 'darwin'
          ? baseDirs[editor].mac
          : baseDirs[editor].linux;

    if (!base) {
      if (editor === 'theia') {
        return crossPlatformPath([process.cwd(), '.theia', 'settings.json']);
      }
      return;
    }

    return crossPlatformPath([base, 'User', 'settings.json']);
    //#endregion
  };
  //#endregion

  //#region utils os / is running in node debugger
  export const isRunningNodeDebugger = (): boolean => {
    //#region @browser
    return false;
    //#endregion
    //#region @backendFunc
    return process.execArgv.some(arg => arg.startsWith('--inspect'));
    //#endregion
  };
  //#endregion

  //#region utils os / is [...]
  export const isNodeVersionOk = UtilsProcess.isNodeVersionOk;
  export const isElectron = isRunningInElectron();
  export const isBrowser = isRunningInBrowser();
  export const isNode = isRunningInNode();
  export const isWebSQL = isRunningInWebSQL();
  export const isVscodeExtension = isRunningInVscodeExtension();
  export const isSSRMode = isRunningInSSRMode();
  let isRunningInWindowsTmp: boolean = false;
  //#region @backend
  isRunningInWindowsTmp = process.platform == 'win32';
  //#endregion
  export const isRunningInWindows = isRunningInWindowsTmp;
  //#endregion

  //#region utils os / command exists

  //#region helpers
  const fileNotExists = async (commandName: string): Promise<boolean> => {
    //#region @backendFunc
    try {
      await fse.access(commandName, fse.constants.F_OK);
      return false;
    } catch {
      return true;
    }
    //#endregion
  };

  const fileNotExistsSync = (commandName: string): boolean => {
    //#region @backendFunc
    try {
      fse.accessSync(commandName, fse.constants.F_OK);
      return false;
    } catch {
      return true;
    }
    //#endregion
  };

  const localExecutable = async (commandName: string): Promise<boolean> => {
    //#region @backendFunc
    try {
      await fse.access(commandName, fse.constants.F_OK | fse.constants.X_OK);
      return true;
    } catch {
      return false;
    }
    //#endregion
  };

  const localExecutableSync = (commandName: string): boolean => {
    //#region @backendFunc
    try {
      fse.accessSync(commandName, fse.constants.F_OK | fse.constants.X_OK);
      return true;
    } catch {
      return false;
    }
    //#endregion
  };
  //#endregion

  //#region command exists (Unix / Windows)
  const commandExistsUnix = async (commandName: string): Promise<boolean> => {
    //#region @backendFunc
    const isFileMissing = await fileNotExists(commandName);
    if (isFileMissing) {
      try {
        const stdout = child_process.execSync(
          `command -v ${commandName} 2>/dev/null && { echo >&1 '${commandName} found'; exit 0; }`,
          { encoding: 'utf-8' },
        );
        return !!stdout;
      } catch {
        return false;
      }
    }

    return await localExecutable(commandName);
    //#endregion
  };

  const commandExistsWindows = async (
    commandName: string,
  ): Promise<boolean> => {
    //#region @backendFunc
    try {
      const stdout = await Helpers.commandOutputAsStringAsync(
        `where ${commandName}`,
      );
      return !!stdout;
    } catch {
      return false;
    }
    //#endregion
  };

  const commandExistsUnixSync = (commandName: string): boolean => {
    //#region @backendFunc
    if (fileNotExistsSync(commandName)) {
      try {
        const stdout = child_process.execSync(
          `command -v ${commandName} 2>/dev/null && { echo >&1 '${commandName} found'; exit 0; }`,
          { encoding: 'utf-8' },
        );
        return !!stdout;
      } catch {
        return false;
      }
    }
    return localExecutableSync(commandName);
    //#endregion
  };

  const commandExistsWindowsSync = (commandName: string): boolean => {
    //#region @backendFunc
    try {
      const stdout = Helpers.commandOutputAsString(`where ${commandName}`);
      return !!stdout;
    } catch {
      return false;
    }
    //#endregion
  };
  //#endregion

  //#region exported API
  export const commandExistsAsync = async (
    commandName: string,
  ): Promise<boolean> => {
    //#region @backendFunc
    try {
      if (isRunningInWindows) {
        return await commandExistsWindows(commandName);
      } else {
        return await commandExistsUnix(commandName);
      }
    } catch (error) {
      if (frameworkName === 'tnp') console.error(error);
      return false;
    }
    //#endregion
  };

  /**
   * @deprecated use commandExistsAsync
   */
  export const commandExistsSync = (commandName: string): boolean => {
    return isRunningInWindows
      ? commandExistsWindowsSync(commandName)
      : commandExistsUnixSync(commandName);
  };
  //#endregion

  //#endregion

  //#region utils os / python module exists
  export const pipxPackageExists = (packageName: string): Promise<boolean> => {
    //#region @backendFunc
    return new Promise(resolve => {
      child_process.exec(`pipx list`, (err, stdout) => {
        if (err) return resolve(false);
        resolve(stdout.includes(packageName));
      });
    });
    //#endregion
  };

  export const pipxNestedPackageExists = (
    mainPackageName: string,
    targetNestedFromMainPackage: string,
  ): Promise<boolean> => {
    //#region @backendFunc
    return new Promise(resolve => {
      child_process.exec(
        `pipx runpip ${mainPackageName} freeze`,
        (err, stdout) => {
          if (err) return resolve(false);
          const packages = stdout
            .split('\n')
            .map(p => p.trim().toLowerCase().split('==')[0]);
          resolve(packages.includes(targetNestedFromMainPackage.toLowerCase()));
        },
      );
    });
    //#endregion
  };

  const normalizeModuleName = (name: string): string => {
    return name.replace(/-/g, '_');
  };

  export const pythonModuleExists = async (
    moduleName: string,
    // pythonPath = process.platform === 'win32' ? 'python' : 'python3',
    pythonPath = 'python3',
  ): Promise<boolean> => {
    //#region @backendFunc
    moduleName = normalizeModuleName(moduleName);
    // TODO QUICK_FIX
    const existsGlobalCommand = await UtilsOs.commandExistsAsync(moduleName);
    // if installed globally - should be ok ... ??? TODO
    if (existsGlobalCommand) {
      return true;
    }

    return new Promise(resolve => {
      child_process.exec(
        `${pythonPath} -c "import ${moduleName}"`,
        (error, _stdout, _stderr) => {
          // console.log({ error });
          resolve(!error); // true if module exists, false if not
        },
      );
    });
    //#endregion
  };
  //#endregion
}
