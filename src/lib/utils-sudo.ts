import { promisify } from 'util'; // @backend

import { chalk, child_process, isElevated } from './core-imports';
import { Helpers } from './helpers';
import { UtilsOs } from './utils-os';

export namespace UtilsSudo {
  //#region utils sudo / sudo status enum
  /**
   * All possible sudo states on Windows 11 (24H2+)
   */
  enum SudoStatus {
    NotInstalled = 'NotInstalled',
    Disabled = 'Disabled',
    Enabled_ForceNewWindow = 'Enabled_ForceNewWindow', // Enabled = 2
    Enabled_Inline = 'Enabled_Inline', // Enabled = 3 ← current default
    Unknown = 'Unknown',
  }
  //#endregion

  //#region utils sudo / is current process elevated
  /**
   * @returns true if current process is elevated (admin or sudo root), false otherwise
   */
  export const isCurrentProcessElevated = async (): Promise<boolean> => {
    return await isElevated();
  };
  //#endregion

  //#region utils sudo / utils sudo status label
  /**
   * Human-readable descriptions
   */
  const SudoStatusLabel: Record<SudoStatus, string> = {
    [SudoStatus.NotInstalled]: 'sudo is not installed',
    [SudoStatus.Disabled]: 'sudo is disabled',
    [SudoStatus.Enabled_ForceNewWindow]:
      'sudo enabled → opens new window (ForceNewWindow)',
    [SudoStatus.Enabled_Inline]:
      'sudo enabled → inline mode (runs in same window)',
    [SudoStatus.Unknown]: 'sudo present but status unknown',
  };
  //#endregion

  //#region utils sudo / get sudo enabled value
  /**
   * Read the Enabled DWORD value from registry
   */
  async function getSudoEnabledValue(): Promise<number | null> {
    //#region @backendFunc
    const execAsync = promisify(child_process.exec);
    try {
      const { stdout } = await execAsync(
        'reg query "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Sudo" /v Enabled',
        { windowsHide: true },
      );

      const match = stdout.trim().match(/Enabled\s+REG_DWORD\s+0x([0-9a-f]+)/i);
      if (!match) return null;

      return parseInt(match[1], 16);
    } catch {
      return null;
    }
    //#endregion
  }
  //#endregion

  //#region utils sudo / get status
  /**
   * Main function – returns detailed sudo status
   */
  export async function getStatus(): Promise<{
    status: SudoStatus;
    label: string;
    isAvailable: boolean;
    isInline: boolean;
  }> {
    //#region @backendFunc
    const hasCommand = await UtilsOs.commandExistsAsync('sudo');

    if (!hasCommand) {
      return {
        status: SudoStatus.NotInstalled,
        label: SudoStatusLabel[SudoStatus.NotInstalled],
        isAvailable: false,
        isInline: false,
      };
    }

    if (!UtilsOs.isRunningInWindows) {
      return {
        status: SudoStatus.Enabled_Inline,
        label: 'sudo is available (non-Windows OS)',
        isAvailable: true,
        isInline: true,
      };
    }

    const enabledValue = await getSudoEnabledValue();

    let status: SudoStatus;

    switch (enabledValue) {
      case 0:
        status = SudoStatus.Disabled;
        break;
      case 2:
        status = SudoStatus.Enabled_ForceNewWindow;
        break;
      case 3:
        status = SudoStatus.Enabled_Inline;
        break;
      default:
        status = SudoStatus.Unknown;
        break;
    }

    return {
      status,
      label: SudoStatusLabel[status],
      isAvailable: true,
      isInline: status === SudoStatus.Enabled_Inline,
    };
    //#endregion
  }
  //#endregion

  //#region utils sudo / is sudo available
  /**
   * check if sudo is available and in proper mode
   */
  export const isInProperModeForTaon = async ({
    displayErrorMessage = false,
  }: {
    displayErrorMessage?: boolean;
  }): Promise<boolean> => {
    //#region @backendFunc
    const sudoStatus = await getStatus();
    const isInProperMode = sudoStatus.isAvailable && sudoStatus.isInline;
    if (!isInProperMode) {
      if (displayErrorMessage) {
        Helpers.error(
          `Command ${chalk.bold(
            '"sudo"',
          )} is not available in inline mode. Current status: ${
            sudoStatus.label
          }.
Please install/enable sudo in inline mode for proper functionality.`,
        );
      }
    }
    return isInProperMode;
    //#endregion
  };
  //#endregion
}
