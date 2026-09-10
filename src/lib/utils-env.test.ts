import { UtilsEnv } from './utils-env';

describe('UtilsEnv', () => {
  describe('EnvironmentNameArr', () => {
    it('should contain all EnvironmentName values', () => {
      expect(UtilsEnv.EnvironmentNameArr).toEqual(
        Object.values(UtilsEnv.EnvironmentName),
      );
    });

    it('should contain common environments', () => {
      expect(UtilsEnv.EnvironmentNameArr).toContain(
        UtilsEnv.EnvironmentName.LOCALHOST,
      );
      expect(UtilsEnv.EnvironmentNameArr).toContain(
        UtilsEnv.EnvironmentName.DEV,
      );
      expect(UtilsEnv.EnvironmentNameArr).toContain(
        UtilsEnv.EnvironmentName.PROD,
      );
      expect(UtilsEnv.EnvironmentNameArr).toContain(
        UtilsEnv.EnvironmentName.TEST,
      );
    });
  });

  describe('getTsFileName', () => {
    it('should create filename without env number', () => {
      expect(
        UtilsEnv.getTsFileName({
          artifactName: 'angular-node-app',
          envName: 'dev',
        }),
      ).toBe('env.angular-node-app.dev.ts');
    });

    it('should create filename with env number', () => {
      expect(
        UtilsEnv.getTsFileName({
          artifactName: 'angular-node-app',
          envName: 'dev',
          envNumber: '3',
        }),
      ).toBe('env.angular-node-app.dev3.ts');
    });

    it('should preserve env number 0 passed as string', () => {
      expect(
        UtilsEnv.getTsFileName({
          artifactName: 'app',
          envName: 'dev',
          envNumber: '0',
        }),
      ).toBe('env.app.dev0.ts');
    });

    it('should support enum values', () => {
      expect(
        UtilsEnv.getTsFileName({
          artifactName: 'backend',
          envName: UtilsEnv.EnvironmentName.PROD,
        }),
      ).toBe('env.backend.prod.ts');
    });
  });

  describe('splitEnv', () => {
    it.each([
      {
        input: 'dev',
        expectedEnvName: 'dev',
        expectedEnvNumber: undefined,
      },
      {
        input: 'dev0',
        expectedEnvName: 'dev',
        expectedEnvNumber: 0,
      },
      {
        input: 'dev3',
        expectedEnvName: 'dev',
        expectedEnvNumber: 3,
      },
      {
        input: 'prod4',
        expectedEnvName: 'prod',
        expectedEnvNumber: 4,
      },
      {
        input: 'cloudflare12',
        expectedEnvName: 'cloudflare',
        expectedEnvNumber: 12,
      },
      {
        input: 'static-pages2',
        expectedEnvName: 'static-pages',
        expectedEnvNumber: 2,
      },
    ])(
      'should split "$input"',
      ({ input, expectedEnvName, expectedEnvNumber }) => {
        expect(UtilsEnv.splitEnv(input)).toEqual({
          envName: expectedEnvName,
          envNumber: expectedEnvNumber,
        });
      },
    );

    it('should remove .ts extension', () => {
      expect(UtilsEnv.splitEnv('prod2.ts')).toEqual({
        envName: 'prod',
        envNumber: 2,
      });
    });

    it('should remove .tsx extension', () => {
      expect(UtilsEnv.splitEnv('prod2.tsx')).toEqual({
        envName: 'prod',
        envNumber: 2,
      });
    });

    it('should return undefined env number when number is missing', () => {
      expect(UtilsEnv.splitEnv('prod.ts')).toEqual({
        envName: 'prod',
        envNumber: undefined,
      });
    });

    it('should handle empty string', () => {
      expect(UtilsEnv.splitEnv('')).toEqual({
        envName: '',
        envNumber: undefined,
      });
    });

    it('should handle whole string as env', () => {
      expect(UtilsEnv.splitEnv('cloudflare')).toEqual({
        envName: 'cloudflare',
        envNumber: undefined,
      });
    });

    it('should support multi-digit env numbers', () => {
      expect(UtilsEnv.splitEnv('dev123')).toEqual({
        envName: 'dev',
        envNumber: 123,
      });
    });

    it('should preserve dots and other characters in env name', () => {
      expect(UtilsEnv.splitEnv('my.custom.env12')).toEqual({
        envName: 'my.custom.env',
        envNumber: 12,
      });
    });
  });
});
