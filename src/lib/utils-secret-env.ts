import { GlobalStorage } from './global-storage';
import { Helpers } from './helpers';

export async function decodeEnv(encryptedValue: string | any): Promise<string> {
  if (!encryptedValue || typeof encryptedValue !== 'string') {
    return encryptedValue;
  }
  if (
    encryptedValue.startsWith(UtilsSecretEnv.TAON_ENCRYPTED_START) &&
    encryptedValue.endsWith(UtilsSecretEnv.TAON_ENCRYPTED_END)
  ) {
    let masterKey: string = '';
    try {
      masterKey =
        (GlobalStorage.get(UtilsSecretEnv.MASTER_PASS_KEY) as string) ||
        (globalThis[UtilsSecretEnv.MASTER_PASS_KEY] as string) ||
        (process.env[UtilsSecretEnv.MASTER_PASS_KEY] as string);
    } catch (error) {
      Helpers.warn(`Not able to get master key for ${encryptedValue}`);
    }

    return await UtilsSecretEnv.decrypt(encryptedValue, masterKey);
  }
  return encryptedValue;
}

export namespace UtilsSecretEnv {
  export const MASTER_PASS_KEY = 'TAON_MASTER_PASS_KEY';
  export const TAON_ENCRYPTED_START = '$$$TAON_ENCRYPTED_START$$$';

  export const TAON_ENCRYPTED_END = '$$$TAON_ENCRYPTED_END$$$';

  const VERSION = 'v1';

  const PBKDF2_ITERATIONS = 600_000;
  const SALT_LENGTH = 16;
  const IV_LENGTH = 12;
  const KEY_LENGTH = 256;

  //#region helpers

  function bytesToBase64(bytes: Uint8Array): string {
    let binary = '';

    for (const byte of bytes) {
      binary += String.fromCharCode(byte);
    }

    return btoa(binary);
  }

  function base64ToBytes(base64: string): Uint8Array {
    const binary = atob(base64);
    const result = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i++) {
      result[i] = binary.charCodeAt(i);
    }

    return result;
  }

  async function deriveKey(
    password: string,
    salt: Uint8Array,
  ): Promise<CryptoKey> {
    const encoder = new TextEncoder();

    const passwordKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveKey'],
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        // @ts-ignore
        salt,
        iterations: PBKDF2_ITERATIONS,
        hash: 'SHA-256',
      },
      passwordKey,
      {
        name: 'AES-GCM',
        length: KEY_LENGTH,
      },
      false,
      ['encrypt', 'decrypt'],
    );
  }

  //#endregion

  //#region encrypt

  /**
   * Result format:
   *
   * v1:<iterations>:<salt>:<iv>:<ciphertext>
   *
   * Salt and IV are intentionally stored with the ciphertext.
   * They are not secrets.
   */
  export async function encrypt(
    value: string,
    password: string,
  ): Promise<string> {
    const encoder = new TextEncoder();

    const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));

    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

    const key = await deriveKey(password, salt);

    const encrypted = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv,
      },
      key,
      encoder.encode(value),
    );

    return [
      VERSION,
      PBKDF2_ITERATIONS,
      bytesToBase64(salt),
      bytesToBase64(iv),
      bytesToBase64(new Uint8Array(encrypted)),
    ].join(':');
  }

  //#endregion

  //#region decrypt

  export async function decrypt(
    encryptedValue: string,
    password: string,
  ): Promise<string> {
    const parts = encryptedValue.split(':');

    if (parts.length !== 5) {
      throw new Error('Invalid Taon encrypted value format.');
    }

    const [version, iterationsString, saltBase64, ivBase64, ciphertextBase64] =
      parts;

    if (version !== VERSION) {
      throw new Error(`Unsupported Taon encrypted value version: ${version}`);
    }

    const iterations = Number(iterationsString);

    if (!Number.isInteger(iterations) || iterations <= 0) {
      throw new Error('Invalid PBKDF2 iteration count.');
    }

    const salt = base64ToBytes(saltBase64);
    const iv = base64ToBytes(ivBase64);
    const ciphertext = base64ToBytes(ciphertextBase64);

    const encoder = new TextEncoder();

    const passwordKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveKey'],
    );

    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        // @ts-ignore
        salt,
        iterations,
        hash: 'SHA-256',
      },
      passwordKey,
      {
        name: 'AES-GCM',
        length: KEY_LENGTH,
      },
      false,
      ['decrypt'],
    );

    try {
      const decrypted = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          // @ts-ignore
          iv,
        },
        key,
        ciphertext,
      );

      return new TextDecoder().decode(decrypted);
    } catch {
      Helpers.error(
        'Unable to decrypt Taon secret. Invalid password or corrupted data.',
        false,
        true,
      );
    }
  }

  //#endregion

  //#region extract static string from arrow function

  /**
   * Extracts a static string from forms such as:
   *
   * () => 'secret'
   * () => "secret"
   * () => `secret`
   * () => `s${'asd'}ecret`
   * () => `port-${123}`
   *
   * Returns undefined for dynamic expressions:
   *
   * () => getSecret()
   * () => process.env.SECRET
   * () => `secret-${someVariable}`
   */
  export function extractStaticStringFromArrowFunction(
    contentPropFunction: string,
  ): string | undefined {
    const arrowIndex = contentPropFunction.indexOf('=>');

    if (arrowIndex === -1) {
      return undefined;
    }

    let expression = contentPropFunction.slice(arrowIndex + 2).trim();

    // Allow:
    //
    // () => (`abc`)
    //
    if (expression.startsWith('(') && expression.endsWith(')')) {
      expression = expression.slice(1, -1).trim();
    }

    //#region normal quoted string

    if (
      (expression.startsWith("'") && expression.endsWith("'")) ||
      (expression.startsWith('"') && expression.endsWith('"'))
    ) {
      return parseQuotedString(expression);
    }

    //#endregion

    //#region template literal

    if (expression.startsWith('`') && expression.endsWith('`')) {
      return parseStaticTemplateLiteral(expression);
    }

    //#endregion

    return undefined;
  }

  //#endregion

  //#region parse quoted string

  function parseQuotedString(expression: string): string | undefined {
    const quote = expression[0];

    let result = '';

    for (let i = 1; i < expression.length - 1; i++) {
      const char = expression[i];

      if (char !== '\\') {
        result += char;
        continue;
      }

      i++;

      if (i >= expression.length - 1) {
        return undefined;
      }

      const escaped = expression[i];

      switch (escaped) {
        case 'n':
          result += '\n';
          break;

        case 'r':
          result += '\r';
          break;

        case 't':
          result += '\t';
          break;

        case '\\':
          result += '\\';
          break;

        case "'":
          result += "'";
          break;

        case '"':
          result += '"';
          break;

        default:
          // Don't try to emulate the entire JS parser.
          return undefined;
      }
    }

    // Primarily documents intent and catches malformed input.
    if (expression.at(-1) !== quote) {
      return undefined;
    }

    return result;
  }

  //#endregion

  //#region parse static template literal

  function parseStaticTemplateLiteral(expression: string): string | undefined {
    const content = expression.slice(1, -1);

    let result = '';

    for (let i = 0; i < content.length; i++) {
      const char = content[i];

      //#region escaped char

      if (char === '\\') {
        i++;

        if (i >= content.length) {
          return undefined;
        }

        const escaped = content[i];

        switch (escaped) {
          case 'n':
            result += '\n';
            break;

          case 'r':
            result += '\r';
            break;

          case 't':
            result += '\t';
            break;

          case '`':
            result += '`';
            break;

          case '\\':
            result += '\\';
            break;

          case '$':
            result += '$';
            break;

          default:
            return undefined;
        }

        continue;
      }

      //#endregion

      //#region interpolation

      if (char === '$' && content[i + 1] === '{') {
        const end = findInterpolationEnd(content, i + 2);

        if (end === -1) {
          return undefined;
        }

        const interpolation = content.slice(i + 2, end).trim();

        const value = parseStaticPrimitive(interpolation);

        if (value === undefined) {
          return undefined;
        }

        result += value;

        i = end;
        continue;
      }

      //#endregion

      result += char;
    }

    return result;
  }

  //#endregion

  //#region find interpolation end

  function findInterpolationEnd(content: string, start: number): number {
    let quote: "'" | '"' | undefined;
    let escaped = false;

    for (let i = start; i < content.length; i++) {
      const char = content[i];

      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === '\\') {
        escaped = true;
        continue;
      }

      if (quote) {
        if (char === quote) {
          quote = undefined;
        }

        continue;
      }

      if (char === "'" || char === '"') {
        quote = char;
        continue;
      }

      if (char === '}') {
        return i;
      }
    }

    return -1;
  }

  //#endregion

  //#region parse static primitive

  function parseStaticPrimitive(expression: string): string | undefined {
    if (
      (expression.startsWith("'") && expression.endsWith("'")) ||
      (expression.startsWith('"') && expression.endsWith('"'))
    ) {
      return parseQuotedString(expression);
    }

    if (/^-?(?:\d+\.?\d*|\.\d+)$/.test(expression)) {
      return String(Number(expression));
    }

    if (expression === 'true') {
      return 'true';
    }

    if (expression === 'false') {
      return 'false';
    }

    if (expression === 'null') {
      return 'null';
    }

    return undefined;
  }

  //#endregion

  //#region generate random password

  /**
   * Generates a cryptographically secure random password.
   *
   * Works in:
   * - Node.js
   * - Browser
   * - Cloudflare Workers
   */
  export function generateRandomPassword(length = 32): string {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZ' +
      'abcdefghijklmnopqrstuvwxyz' +
      '0123456789' +
      '!@#$%^&*_-+=';

    let result = '';

    // Largest byte value range evenly divisible
    // by chars.length.
    const limit = Math.floor(256 / chars.length) * chars.length;

    while (result.length < length) {
      const bytes = new Uint8Array(Math.max(32, length - result.length));

      crypto.getRandomValues(bytes);

      for (const byte of bytes) {
        if (byte >= limit) {
          continue;
        }

        result += chars[byte % chars.length];

        if (result.length === length) {
          break;
        }
      }
    }

    return result;
  }

  //#endregion
}
