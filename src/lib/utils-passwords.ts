export namespace UtilsPasswords {
  const VERSION = 'v1';
  const ITERATIONS = 600_000;
  const SALT_LENGTH = 16;
  const HASH_LENGTH = 32;

  /**
   * Result:
   * v1:<iterations>:<salt-base64>:<hash-base64>
   */
  export async function hash(password: string): Promise<string> {
    const encoder = new TextEncoder();

    const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));

    const passwordKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveBits'],
    );

    const hash = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        hash: 'SHA-256',
        salt,
        iterations: ITERATIONS,
      },
      passwordKey,
      HASH_LENGTH * 8,
    );

    return [
      VERSION,
      ITERATIONS,
      bytesToBase64(salt),
      bytesToBase64(new Uint8Array(hash)),
    ].join(':');
  }

  export async function verify(
    password: string,
    storedHash: string,
  ): Promise<boolean> {
    const [version, iterationsStr, saltBase64, hashBase64] =
      storedHash.split(':');

    if (version !== VERSION) {
      return false;
    }

    const iterations = Number(iterationsStr);

    if (!Number.isInteger(iterations) || iterations <= 0) {
      return false;
    }

    const salt = base64ToBytes(saltBase64);
    const expectedHash = base64ToBytes(hashBase64);

    const passwordKey = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(password),
      'PBKDF2',
      false,
      ['deriveBits'],
    );

    const actualHash = new Uint8Array(
      await crypto.subtle.deriveBits(
        {
          name: 'PBKDF2',
          hash: 'SHA-256',
          // @ts-ignore
          salt,
          iterations,
        },
        passwordKey,
        expectedHash.length * 8,
      ),
    );

    return timingSafeEqual(actualHash, expectedHash);
  }

  function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let diff = 0;

    for (let i = 0; i < a.length; i++) {
      diff |= a[i] ^ b[i];
    }

    return diff === 0;
  }

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
}
