//#region imports
import 'reflect-metadata';
import { ChildProcess } from 'child_process';
import { promisify } from 'util';

import { debounceTime, EMPTY, from, startWith, switchMap, tap } from 'rxjs';

import { encoding } from './constants';
import { _, chalk, crossPlatformPath, fse, os, path } from './core-imports';
import { spawn, child_process } from './core-imports';
import { CoreModels } from './core-models';
import { Helpers } from './helpers';
import { Utils } from './utils';
import { UtilsExecProc } from './utils-exec-proc';
import { UtilsOs } from './utils-os';

//#endregion

export namespace UtilsProcess {
  //#region utils process  / start async child process command until
  /**
   * This let you start child process and resolve promise when some
   * condition is met. It is useful for example when you want to start
   * process and wait until some output is in stdout or stderr.
   */
  export const startAsyncChildProcessCommandUntil = async (
    command: string,
    options: {
      /**
       * tels when to resolve promise
       */
      untilOptions: {
        /**
         * until this string is in output of stdout
         */
        stdout?: string | string[];
        /**
         * until this string is in output of stderr
         */
        stderr?: string | string[];
        /**
         * by default only resolve when exit code is 0
         */
        resolveAfterAnyExitCode?: boolean;
      };
      displayOutputInParentProcess?: boolean;
      resolveAfterAnyExitCode?: boolean;
      cwd?: string;
    },
  ): Promise<void> => {
    //#region @backendFunc
    options = options || ({} as any);
    const { stdout, stderr, resolveAfterAnyExitCode } =
      options.untilOptions || {};
    options.cwd = crossPlatformPath(options.cwd || process.cwd());

    return new Promise((resolve, reject) => {
      const childProc = child_process.exec(command, {
        cwd: options.cwd,
        maxBuffer: Helpers.bigMaxBuffer,
      });

      const stdoutConditions = Array.isArray(stdout)
        ? stdout
        : stdout
          ? [stdout]
          : [];
      const stderrConditions = Array.isArray(stderr)
        ? stderr
        : stderr
          ? [stderr]
          : [];

      const checkConditions = (output: string, conditions: string[]) => {
        const conditionReady = conditions.some(condition =>
          output.includes(condition),
        );
        // if(conditionReady){
        //   console.log('conditionReady MOVE ON', conditionReady);
        // }
        return conditionReady;
      };

      childProc.stdout?.on('data', data => {
        if (options.displayOutputInParentProcess) {
          process.stdout?.write(data);
        }

        if (checkConditions(data, stdoutConditions)) {
          resolve();
        }
      });

      childProc.stderr?.on('data', data => {
        if (options.displayOutputInParentProcess) {
          process.stderr?.write(data);
        }

        if (checkConditions(data, stderrConditions)) {
          resolve();
        }
      });

      childProc.on('close', exitCode => {
        if (resolveAfterAnyExitCode || exitCode === 0) {
          resolve();
        } else {
          reject(
            new Error(
              `[startAsyncChildProcessCommandUntil] Process exited with code ${exitCode}`,
            ),
          );
        }
      });

      childProc.on('error', error => {
        reject(error);
      });
    });
    //#endregion
  };
  //#endregion

  //#region utils process  / get git bash path
  export const getGitBashPath = () => {
    //#region @backendFunc
    if (process.platform !== 'win32') {
      return null;
    }
    try {
      // Execute the 'where' command to find bash.exe
      const gitBashPath = child_process
        .execSync('where bash.exe', { encoding })
        .split('\n')[0]
        .trim();

      if (gitBashPath) {
        return crossPlatformPath(gitBashPath);
      }
      return null; // Return the first match
    } catch (err) {
      return null;
    }
    //#endregion
  };
  //#endregion

  //#region utils process  / start process in new graphical terminal window
  /**
   * TODO IMPLEMENT
   * start async node process
   */
  export const startInNewTerminalWindow = (
    command: string,
    options?: {
      cwd?: string;
      hideOutput?: {
        stdout?: boolean;
        stderr?: boolean;
        acceptAllExitCodeAsSuccess?: boolean;
      };
    },
  ) => {
    //#region @backendFunc
    const platform = process.platform;
    options = options || {};
    options.cwd = crossPlatformPath(options.cwd || process.cwd());

    if (platform === 'win32') {
      const child = spawn(
        'cmd',
        ['/c', 'start', 'powershell', '-NoExit', '-Command', command],
        {
          detached: true,
          stdio: 'ignore',
          cwd: options.cwd,
          windowsHide: false,
        },
      );

      child.unref();
      return child;

      //#region gitbash solution
      // if (gitBashPath) {
      //   console.log('using gitbash ', gitBashPath);
      //   return spawn(
      //     'start bash',
      //     ['-c', `${command}; echo "Press any key to exit..."; read -n 1`], // Use '-c' to execute a single command in Git Bash
      //     {
      //       detached: true, // Detached process
      //       stdio: 'ignore', // Ignore stdio
      //       cwd: options?.cwd,
      //     },
      //   ).unref(); // Ensure the parent process can exit independently
      // }
      //#endregion

      //#region cmd solution
      // return spawn('cmd', ['/c', 'start', 'cmd', '/k', `${command}`], {
      //   detached: true,
      //   stdio: 'ignore',
      //   cwd: options?.cwd,
      // }).unref();
      //#endregion
    } else if (platform === 'darwin') {
      // For macOS
      const child = spawn(
        'osascript',
        ['-e', `tell application "Terminal" to do script "${command}"`],
        {
          detached: true,
          stdio: 'ignore',
          cwd: options?.cwd,
        },
      );
      child.unref();
      return child;
    } else if (platform === 'linux') {
      if (!UtilsOs.isRunningInLinuxGraphicsCapableEnvironment()) {
        const child = child_process.spawn(command, {
          detached: true,
          cwd: options?.cwd,
          stdio: 'ignore',
        });
        child.unref();
        return child;
      }
      // For Linux (gnome-terminal as an example)
      const terminals = [
        { cmd: 'gnome-terminal', args: ['--', 'bash', '-c'] }, // GNOME Terminal
        { cmd: 'konsole', args: ['-e', 'bash', '-c'] }, // Konsole
        { cmd: 'xfce4-terminal', args: ['-e', 'bash', '-c'] }, // XFCE4 Terminal
        { cmd: 'xterm', args: ['-e', 'bash', '-c'] }, // Xterm
        { cmd: 'lxterminal', args: ['-e', 'bash', '-c'] }, // LXTerminal
        { cmd: 'mate-terminal', args: ['-e', 'bash', '-c'] }, // MATE Terminal
        { cmd: 'terminator', args: ['-x', 'bash', '-c'] }, // Terminator
        { cmd: 'tilix', args: ['-e', 'bash', '-c'] }, // Tilix
        { cmd: 'alacritty', args: ['-e', 'bash', '-c'] }, // Alacritty
        { cmd: 'urxvt', args: ['-e', 'bash', '-c'] }, // URxvt
      ];

      let terminalCommand = '';
      let terminalArgs: string[] = [];
      for (const term of terminals) {
        try {
          child_process.execSync(`which ${term.cmd}`, {
            stdio: 'ignore',
            cwd: options?.cwd,
          });
          terminalCommand = term.cmd;
          terminalArgs = [...term.args, command];
          break;
        } catch (err) {
          // Terminal not found, continue to the next
        }
      }

      if (!terminalCommand) {
        console.error('No supported terminal emulator found.');
        return;
      }
      const child = spawn(terminalCommand, terminalArgs, {
        detached: true,
        stdio: 'ignore',
      });

      child.unref();
      return child;
    } else {
      Helpers.throwError(`Unsupported platform: ${platform}`);
    }
    //#endregion
  };
  //#endregion

  //#region utils process / get bash or shell name
  export const getBashOrShellName = ():
    | 'browser'
    | 'cmd'
    | 'powershell'
    | 'gitbash'
    | 'cygwin'
    | 'unknown'
    | 'bash'
    | 'zsh'
    | 'fish'
    | 'sh' => {
    //#region @browser
    return 'browser';
    //#endregion
    //#region @backendFunc
    const platform = process.platform; // Identify the platform: 'win32', 'darwin', 'linux'
    const shell = process.env.SHELL || process.env.ComSpec || ''; // Common shell environment variables

    if (platform === 'win32') {
      if (shell.includes('cmd.exe')) return 'cmd';
      if (shell.includes('powershell.exe') || shell.includes('pwsh'))
        return 'powershell';

      // Heuristic for Git Bash
      if (
        process.env.MSYSTEM &&
        process.env.MSYSTEM.toLowerCase().includes('mingw')
      ) {
        return 'gitbash';
      }

      // Heuristic for Cygwin
      if (shell.includes('cygwin')) {
        return 'cygwin';
      }

      return 'unknown'; // Default for unrecognized shells on Windows
    } else {
      // For macOS and Linux
      if (shell.includes('bash')) return 'bash';
      if (shell.includes('zsh')) return 'zsh';
      if (shell.includes('fish')) return 'fish';
      if (shell.includes('sh')) return 'sh';

      return 'unknown'; // Default for unrecognized shells on Unix-based systems
    }
    //#endregion
  };
  //#endregion

  //#region utils process / get current process and child processes usage
  /**
   * Get CPU and memory usage for a single PID.
   */
  export const getUsageForPid = async (
    pid: number,
  ): Promise<{ cpu: number; memoryInGB: number; memoryInMB: number }> => {
    //#region @backendFunc
    // pidusage returns cpu usage as a percentage (e.g., 10.0 for ~10%)
    // memory usage is returned in bytes.
    try {
      var pidusage = require('pidusage');
      const stat = await pidusage(pid);
      const memoryInMB = stat.memory / (1024 * 1024);
      const memoryInGB = stat.memory / (1024 * 1024 * 1024);
      return {
        cpu: stat.cpu, // CPU usage (percent)
        memoryInMB,
        memoryInGB,
      };
    } catch (error) {
      return {
        cpu: NaN, // CPU usage (percent)
        memoryInMB: NaN, // Memory usage (bytes)
        memoryInGB: NaN, // Memory usage
      };
    }

    //#endregion
  };
  //#endregion

  //#region utils process / get child PIDs
  /**
   * Return a list of direct child PIDs for the given PID on a Unix-like system.
   * Uses `ps -o pid= --ppid <pid>` to find child processes.
   */
  async function getChildPidsUnix(pid: number): Promise<number[]> {
    //#region @backendFunc
    const cmd = `ps -o pid= --ppid ${pid}`;
    try {
      const execAsync = promisify(child_process.exec);
      const { stdout } = await execAsync(cmd);
      // Each line should contain just the PID
      return stdout
        .split('\n')
        .map(line => line.trim())
        .filter(line => line !== '')
        .map(line => Number(line))
        .filter(n => !isNaN(n));
    } catch {
      return [];
    }
    //#endregion
  }
  //#endregion

  //#region utils process / get child PIDs on Windows
  /**
   * Return a list of direct child PIDs for the given PID on Windows.
   * Uses `wmic process where (ParentProcessId=<pid>) get ProcessId` to find child processes.
   */
  async function getChildPidsWindows(pid: number): Promise<number[]> {
    //#region @backendFunc
    const cmd = `wmic process where (ParentProcessId=${pid}) get ProcessId`;
    try {
      const execAsync = promisify(child_process.exec);
      const { stdout } = await execAsync(cmd);
      // The output generally has lines, including one that says "ProcessId" and then the PIDs
      // We'll parse out any numeric lines
      return stdout
        .split('\n')
        .map(line => line.trim())
        .filter(line => /^\d+$/.test(line)) // only keep pure digits
        .map(line => Number(line))
        .filter(n => !isNaN(n));
    } catch {
      return [];
    }
    //#endregion
  }
  //#endregion

  //#region utils process / get child PIDs once
  /**
   * Cross-platform function to list *direct* child PIDs of a given PID.
   * Uses the appropriate command depending on `process.platform`.
   */
  export async function getChildPidsOnce(pid: number): Promise<number[]> {
    //#region @backendFunc
    if (process.platform === 'win32') {
      return getChildPidsWindows(pid);
    } else {
      return getChildPidsUnix(pid);
    }
    //#endregion
  }
  //#endregion

  //#region utils process / get current process and child usage
  /**
   * Get CPU and memory usage for the current process (the Node.js process itself),
   * plus any child processes spawned by it.
   */
  export const getCurrentProcessAndChildUsage = async (): Promise<{
    current: { cpu: number; memoryInMB: number };
    children: Array<{ pid: number; cpu: number; memoryInMB: number }>;
  }> => {
    //#region @backendFunc
    const currentPid = process.pid;

    // Get stats for current Node.js process
    const currentUsage = await getUsageForPid(currentPid);

    // Get list of child PIDs
    const childPids = await getChildPidsOnce(currentPid);

    // Gather usage for each child
    const childrenUsage = await Promise.all(
      childPids.map(async pid => {
        const usage = await getUsageForPid(pid);
        return {
          pid,
          cpu: usage.cpu,
          memoryInMB: usage.memoryInMB,
        };
      }),
    );

    return {
      current: currentUsage,
      children: childrenUsage,
    };
    //#endregion
  };
  //#endregion

  //#region utils process / kill all java processes
  /**
   * Kills all running Java processes cross‑platform.
   * @returns Promise<boolean> true if processes were killed, false if none found
   */
  export const killAllJava = async (): Promise<boolean> => {
    //#region @backendFunc
    return new Promise((resolve, reject) => {
      const platform = os.platform();

      // Build command depending on platform
      let cmd: string;
      if (platform === 'win32') {
        // Windows: use taskkill to kill all java.exe processes
        cmd = `taskkill /F /IM java.exe /T`;
      } else {
        // Linux / macOS: use pkill to kill all java processes
        cmd = `pkill -f java`;
      }

      child_process.exec(cmd, (error, stdout, stderr) => {
        if (error) {
          if (
            stderr.includes('no process found') ||
            stderr.includes('not found')
          ) {
            return resolve(false); // nothing to kill
          }
          return reject(error);
        }
        resolve(true);
      });
    });
    //#endregion
  };
  //#endregion

  //#region utils process / kill process by pid or child process
  export const killProcess = async (
    pidOrProcess: number | ChildProcess,
  ): Promise<void> => {
    //#region @backendFunc
    const pid =
      typeof pidOrProcess === 'object'
        ? Number(pidOrProcess.pid)
        : Number(pidOrProcess);

    if (!pid || isNaN(pid)) {
      console.warn(`[killProcess] Invalid PID: ${pid}`);
      return;
    }

    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', String(pid), '/T', '/F']);
    } else {
      // If you spawned the process with detached: true, kill group:
      try {
        process.kill(-pid, 'SIGTERM');
      } catch (err: any) {
        if (err.code === 'ESRCH') {
          // Try normal PID if group doesn't exist
          process.kill(pid, 'SIGTERM');
        } else {
          throw err;
        }
      }
    }
    //#endregion
  };
  //#endregion

  //#region utils process / kill process on port
  export const killProcessOnPort = async (port: number): Promise<boolean> => {
    if (!port || isNaN(port) || UtilsOs.isBrowser) {
      Helpers.warn(
        `[UtilsProcess.killProcessOnPort]: Invalid port number: ${port}`,
      );
      return false;
    }

    //#region @backendFunc
    Helpers.taskStarted(`Killing process on port ${port}...`);
    return new Promise(resolve => {
      const platform = process.platform;

      // Cross-platform commands for listing process IDs by port
      const findCommand =
        platform === 'win32'
          ? `netstat -ano | findstr :${port}`
          : `lsof -i :${port} -sTCP:LISTEN -t || netstat -nlp 2>/dev/null | grep :${port}`;

      child_process.exec(findCommand, (err, stdout) => {
        if (err || !stdout) {
          return resolve(false); // nothing listening
        }

        const pids: string[] = [];
        const lines = stdout.split('\n').filter(Boolean);

        if (platform === 'win32') {
          // Windows output format -> extract PID (last column)
          for (const line of lines) {
            const parts = line.trim().split(/\s+/);
            const pid = parts[parts.length - 1];
            if (pid && /^\d+$/.test(pid)) {
              pids.push(pid);
            }
          }
        } else {
          // macOS / Linux: either `lsof` or `netstat`
          for (const line of lines) {
            const pidMatch = line.match(/\b\d+\b/);
            if (pidMatch) {
              pids.push(pidMatch[0]);
            }
          }
        }

        if (pids.length === 0) {
          return resolve(false);
        }

        // Build kill command
        const killCommand =
          platform === 'win32'
            ? `taskkill /PID ${pids.join(' /PID ')} /F`
            : `kill -9 ${pids.join(' ')}`;

        child_process.exec(killCommand, killErr => {
          if (killErr) {
            return resolve(false);
          }
          resolve(true);
        });
      });
    });
    //#endregion
  };
  //#endregion

  //#region utils process / kill all other node processes except itself
  /**
   * Kills all Node.js processes except the current process.
   * Works on Windows, macOS, and Linux.
   * @returns {number} Number of processes killed
   */
  export const killAllOtherNodeProcesses = async (): Promise<void> => {
    //#region @backendFunc
    const currentPid = process.pid;
    let killedCount = 0;

    try {
      let cmd;
      let lines;

      if (os.platform() === 'win32') {
        // Windows: use tasklist and taskkill
        cmd = `tasklist /FI "IMAGENAME eq node.exe" /FO CSV`;
        const output = child_process.execSync(cmd, { encoding });
        lines = output.trim().split('\n').slice(1); // skip header

        for (const line of lines) {
          if (!line.trim()) continue;
          const cols = line.split(',').map(s => s.replace(/^"|"$/g, '').trim());
          const imageName = cols[0];
          const pid = parseInt(cols[1], 10);

          if (
            imageName.toLowerCase() === 'node.exe' &&
            pid !== currentPid &&
            !isNaN(pid)
          ) {
            try {
              process.kill(pid); // or execSync(`taskkill /PID ${pid} /F`);
              console.log(`Killed node.exe PID: ${pid}`);
              killedCount++;
            } catch (err) {
              // Process might have already exited
            }
          }
        }
      } else {
        // Linux & macOS: use ps and kill
        cmd = `ps -eo pid,command | grep -E "[n]ode( |$)"`;
        const output = child_process.execSync(cmd, { encoding });
        lines = output.trim().split('\n');

        for (const line of lines) {
          if (!line.trim()) continue;
          const parts = line.trim().split(/\s+/);
          const pid = parseInt(parts[0], 10);

          if (!isNaN(pid) && pid !== currentPid) {
            try {
              process.kill(pid, 'SIGKILL');
              console.log(`Killed node PID: ${pid}`);
              killedCount++;
            } catch (err) {
              // Ignore if process no longer exists or access denied
            }
          }
        }
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error : new Error(String(error));
      console.error('Error while killing node processes:', errMsg);
    }

    console.log(`Total other node processes killed: ${killedCount}`);
    //#endregion
  };
  //#endregion

  //#region utils process / is node version ok
  export const isNodeVersionOk = (options?: {
    required?: string;
    log?: boolean;
    throwErrorIfNotOk?: boolean;
  }): boolean => {
    if (!globalThis || !globalThis.process || !globalThis.process.version) {
      return false;
    }
    options = options || ({} as any);
    options.required = options.required || '18.0.0';
    const current = globalThis.process.version.replace(/^v/, '');
    const [curMajor, curMinor, curPatch] = current.split('.').map(Number);
    const [reqMajor, reqMinor, reqPatch] = options.required
      .replace(/^v/, '')
      .split('.')
      .map(Number);

    const ok =
      curMajor > reqMajor ||
      (curMajor === reqMajor && curMinor > reqMinor) ||
      (curMajor === reqMajor && curMinor === reqMinor && curPatch >= reqPatch);

    if (options?.log) {
      console.log(
        ok
          ? `✅ Node.js version OK (required ≥ ${options.required}, current ${current})`
          : `❌ Node.js version too low (required ≥ ${options.required}, current ${current})`,
      );
    }
    if (options?.throwErrorIfNotOk && !ok) {
      throw new Error(
        `Node.js version too low (required ≥ ${options.required}, current ${current})`,
      );
    }

    return ok;
  };
  //#endregion

  export const getPathOfExecutable = async (
    command: string,
  ): Promise<string | null> => {
    //#region @backendFunc
    const cmd = command.replace(/\.(exe|bat|cmd)$/i, '');
    const isWin = process.platform === 'win32';
    const checkCmd = isWin
      ? `where ${cmd}`
      : `command -v ${cmd} || which ${cmd}`;

    const shell = UtilsProcess.getBashOrShellName();

    try {
      const { stdout } = await UtilsExecProc.spawnAsync(checkCmd, {
        showOutput: false,
      }).getOutput({ shell });
      const firstLine = stdout.trim().split(/\r?\n/)[0].trim();
      return firstLine ? crossPlatformPath(firstLine) : null;
    } catch (e) {
      return null;
    }
    //#endregion
  };
}
