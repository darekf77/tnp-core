import { UtilsJwt } from 'tnp-core/src';

describe('UtilsJwt', () => {
  const SECRET = 'test-secret';

  //#region sign + decode
  it('should sign and decode jwt payload', async () => {
    const token = await UtilsJwt.sign(
      {
        userId: 'user-123',
      },
      SECRET,
      {
        expiresIn: '15m',
      },
    );

    const payload = UtilsJwt.decode<{
      userId: string;
      iat: number;
      exp: number;
    }>(token);

    expect(payload.userId).toBe('user-123');
    expect(typeof payload.iat).toBe('number');
    expect(typeof payload.exp).toBe('number');
    expect(payload.exp).toBeGreaterThan(payload.iat);
  });
  //#endregion

  //#region verify
  it('should verify valid token', async () => {
    const token = await UtilsJwt.sign(
      {
        userId: 'user-123',
      },
      SECRET,
      {
        expiresIn: '15m',
      },
    );

    const payload = await UtilsJwt.verify<{
      userId: string;
    }>(token, SECRET);

    expect(payload.userId).toBe('user-123');
  });
  //#endregion

  //#region wrong secret
  it('should reject token signed with different secret', async () => {
    const token = await UtilsJwt.sign(
      {
        userId: 'user-123',
      },
      SECRET,
      {
        expiresIn: '15m',
      },
    );

    await expect(UtilsJwt.verify(token, 'wrong-secret')).rejects.toThrow(
      'Invalid JWT signature',
    );
  });
  //#endregion

  //#region tampered payload
  it('should reject token with tampered payload', async () => {
    const token = await UtilsJwt.sign(
      {
        userId: 'user-123',
      },
      SECRET,
      {
        expiresIn: '15m',
      },
    );

    const [header, payload, signature] = token.split('.');

    const decodedPayload = JSON.parse(
      new TextDecoder().decode(base64UrlDecode(payload)),
    );

    decodedPayload.userId = 'hacker';

    const tamperedPayload = base64UrlEncode(JSON.stringify(decodedPayload));

    const tamperedToken = `${header}.${tamperedPayload}.${signature}`;

    await expect(UtilsJwt.verify(tamperedToken, SECRET)).rejects.toThrow(
      'Invalid JWT signature',
    );
  });
  //#endregion

  //#region expiration
  it('should reject expired token', async () => {
    const token = await UtilsJwt.sign(
      {
        userId: 'user-123',
      },
      SECRET,
      {
        expiresIn: 0,
      },
    );

    await expect(UtilsJwt.verify(token, SECRET)).rejects.toThrow('JWT expired');
  });
  //#endregion

  //#region numeric expiration
  it('should support numeric expiresIn in seconds', async () => {
    const token = await UtilsJwt.sign(
      {
        userId: 'user-123',
      },
      SECRET,
      {
        expiresIn: 60,
      },
    );

    const payload = UtilsJwt.decode(token);

    expect(payload.exp! - payload.iat!).toBe(60);
  });
  //#endregion

  //#region string expiration
  it.each([
    ['10s', 10],
    ['5m', 5 * 60],
    ['2h', 2 * 60 * 60],
    ['3d', 3 * 24 * 60 * 60],
  ])('should support expiresIn %s', async (expiresIn, expectedSeconds) => {
    const token = await UtilsJwt.sign(
      {
        test: true,
      },
      SECRET,
      {
        expiresIn,
      },
    );

    const payload = UtilsJwt.decode(token);

    expect(payload.exp! - payload.iat!).toBe(expectedSeconds);
  });
  //#endregion

  //#region malformed token
  it('should reject malformed token', async () => {
    await expect(UtilsJwt.verify('not-a-jwt', SECRET)).rejects.toThrow(
      'Invalid JWT',
    );
  });

  it('should reject malformed token when decoding', () => {
    expect(() => UtilsJwt.decode('not-a-jwt')).toThrow('Invalid JWT');
  });
  //#endregion

  //#region invalid expiresIn
  it('should reject unsupported expiresIn format', async () => {
    await expect(
      UtilsJwt.sign(
        {
          userId: 'user-123',
        },
        SECRET,
        {
          expiresIn: '15weeks',
        },
      ),
    ).rejects.toThrow('Invalid expiresIn');
  });
  //#endregion
});

//#region test helpers

function base64UrlDecode(input: string): Uint8Array {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/');

  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);

  const binary = atob(padded);

  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

function base64UrlEncode(input: string): string {
  const bytes = new TextEncoder().encode(input);

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
