import type { Chalk } from 'chalk';

/**
 * Cloudflare Workers compatible Chalk mock.
 *
 * All styling is ignored and the original text is returned.
 * Supports arbitrary Chalk style chaining.
 */
const createChalkMock = (): Chalk => {
  const formatter = (...args: unknown[]): string => {
    return args.map(String).join(' ');
  };

  const proxy: Chalk = new Proxy(formatter, {
    get(_target, property) {
      // Prevent accidental Promise-like behavior.
      if (property === 'then') {
        return undefined;
      }

      // Chalk's level property.
      if (property === 'level') {
        return 0;
      }

      // Support chalk.rgb(...), chalk.hex(...),
      // chalk.bgRgb(...), chalk.bgHex(...),
      // chalk.ansi256(...), etc.
      return proxy;
    },

    apply(_target, _thisArg, args: unknown[]) {
      return formatter(...args);
    },
  }) as unknown as Chalk;

  return proxy;
};

export const chalk: Chalk = createChalkMock();
