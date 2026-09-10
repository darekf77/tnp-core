export namespace UtilsJwt {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  export interface JwtPayload {
    iat?: number;
    exp?: number;
    [key: string]: unknown;
  }

  //#region base64 url encode
  function base64UrlEncode(input: string | Uint8Array): string {
    const bytes = typeof input === 'string' ? encoder.encode(input) : input;

    let binary = '';

    for (const byte of bytes) {
      binary += String.fromCharCode(byte);
    }

    return btoa(binary)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');
  }
  //#endregion

  //#region base64 url decode
  function base64UrlDecode(input: string): Uint8Array {
    const base64 = input.replace(/-/g, '+').replace(/_/g, '/');

    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);

    const binary = atob(padded);

    const bytes = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    return bytes;
  }
  //#endregion

  //#region parse expires in
  function parseExpiresIn(expiresIn: string | number): number {
    if (typeof expiresIn === 'number') {
      return expiresIn;
    }

    const match = expiresIn.match(/^(\d+)(s|m|h|d)$/);

    if (!match) {
      throw new Error(`Invalid expiresIn: ${expiresIn}`);
    }

    const value = Number(match[1]);

    switch (match[2]) {
      case 's':
        return value;

      case 'm':
        return value * 60;

      case 'h':
        return value * 60 * 60;

      case 'd':
        return value * 60 * 60 * 24;

      default:
        throw new Error(`Invalid expiresIn: ${expiresIn}`);
    }
  }
  //#endregion

  //#region create hmac key
  async function createHmacKey(
    secret: string,
    usage: 'sign' | 'verify',
  ): Promise<CryptoKey> {
    return crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      {
        name: 'HMAC',
        hash: 'SHA-256',
      },
      false,
      [usage],
    );
  }
  //#endregion

  //#region sign
  export async function sign(
    payload: JwtPayload,
    secret: string,
    options: {
      expiresIn: string | number;
    },
  ): Promise<string> {
    const now = Math.floor(Date.now() / 1000);

    const header = {
      alg: 'HS256',
      typ: 'JWT',
    };

    const finalPayload: JwtPayload = {
      ...payload,
      iat: now,
      exp: now + parseExpiresIn(options.expiresIn),
    };

    const encodedHeader = base64UrlEncode(JSON.stringify(header));

    const encodedPayload = base64UrlEncode(JSON.stringify(finalPayload));

    const unsignedToken = `${encodedHeader}.${encodedPayload}`;

    const key = await createHmacKey(secret, 'sign');

    const signature = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(unsignedToken),
    );

    return `${unsignedToken}.` + base64UrlEncode(new Uint8Array(signature));
  }
  //#endregion

  //#region decode
  export function decode<T extends JwtPayload = JwtPayload>(token: string): T {
    const parts = token.split('.');

    if (parts.length !== 3) {
      throw new Error('Invalid JWT');
    }

    try {
      const payloadBytes = base64UrlDecode(parts[1]);

      return JSON.parse(decoder.decode(payloadBytes)) as T;
    } catch {
      throw new Error('Invalid JWT payload');
    }
  }
  //#endregion

  //#region verify
  export async function verify<T extends JwtPayload = JwtPayload>(
    token: string,
    secret: string,
  ): Promise<T> {
    const parts = token.split('.');

    if (parts.length !== 3) {
      throw new Error('Invalid JWT');
    }

    const [encodedHeader, encodedPayload, encodedSignature] = parts;

    //#region validate header

    let header: {
      alg?: string;
      typ?: string;
    };

    try {
      header = JSON.parse(decoder.decode(base64UrlDecode(encodedHeader)));
    } catch {
      throw new Error('Invalid JWT header');
    }

    if (header.alg !== 'HS256') {
      throw new Error(`Unsupported JWT algorithm: ${header.alg}`);
    }

    //#endregion

    //#region verify signature

    const unsignedToken = `${encodedHeader}.${encodedPayload}`;

    const signature = base64UrlDecode(encodedSignature);

    const key = await createHmacKey(secret, 'verify');

    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      signature as any,
      encoder.encode(unsignedToken),
    );

    if (!valid) {
      throw new Error('Invalid JWT signature');
    }

    //#endregion

    //#region decode payload

    let payload: T;

    try {
      payload = JSON.parse(
        decoder.decode(base64UrlDecode(encodedPayload)),
      ) as T;
    } catch {
      throw new Error('Invalid JWT payload');
    }

    //#endregion

    //#region validate expiration

    if (
      typeof payload.exp === 'number' &&
      Math.floor(Date.now() / 1000) >= payload.exp
    ) {
      throw new Error('JWT expired');
    }

    //#endregion

    return payload;
  }
  //#endregion
}
