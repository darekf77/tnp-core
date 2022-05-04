
export interface RunOptions {
  showCommand?: boolean;
  /** Extract string from line */
  extractFromLine?: (string | Function)[];
  /**
   * Show process output
   */
  output?: boolean;

  silence?: boolean;
  stdio?: any;

  /**
   * Modify output line by line
   */
  outputLineReplace?: (outputLine: string) => string;


  // detached?: boolean;
  cwd?: string;
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
}

export type PROGRESS_DATA_TYPE = 'info' | 'error' | 'warning' | 'event';
