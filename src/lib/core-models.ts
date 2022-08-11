
export interface ExecuteOptions {
  /** Extract string from line */
  extractFromLine?: (string | Function)[];
  /**
   * Modify output line by line
   */
  outputLineReplace?: (outputLine: string) => string;
  resolvePromiseMsg?: {
    stdout?: string | string[];
    stderr?: string | string[];
  }
  prefix?: string;
  detach?: boolean;
  /**
   * Try command again after fail after n miliseconds
   */
  tryAgainWhenFailAfter?: number;

  /**
   * Use big buffer for big webpack logs
   */
  biggerBuffer?: boolean;
  exitOnError?: boolean;
  exitOnErrorCallback?: (code: number) => void;
  /**
   * From displaying in console
   */
  hideOutput?: {
    stdout?: boolean;
    stderr?: boolean;
  }
}

export interface RunOptions extends ExecuteOptions {
  showCommand?: boolean;

  /**
   * Show process output
   */
  output?: boolean;

  silence?: boolean;
  stdio?: any;

  // detached?: boolean;
  cwd?: string;


}

export type PROGRESS_DATA_TYPE = 'info' | 'error' | 'warning' | 'event';
