export namespace UtilsEnv {
  export enum EnvironmentName {
    /**
     * Default environment, typically for artifact without application
     * or for storing common data
     */
    __ = '__',
    /**
     * Local development environment, typically the developer's machine.
     */
    LOCALHOST = 'localhost',
    /**
     * Development environment used by engineers to deploy and test new features.
     */
    DEV = 'dev',
    /**
     * Staging environment used for final validations before production.
     */
    STAGE = 'stage',
    /**
     * Production environment serving live users.
     */
    PROD = 'prod',
    /**
     * Cloudflare full backend/frontend deployment
     */
    CLOUDFLARE = 'cloudflare',
    /**
     * Taon cloud full backend/frontend deployment
     */
    CLOUD = 'cloud',
    /**
     *  Automated test environment for running unit, integration, or automated tests.
     */
    TEST = 'test',
    /**
     * Quality assurance environment designated for manual and exploratory testing.
     */
    QA = 'qa',
    /**
     * Sandbox environment for experimenting and integration without affecting other environments.
     */
    SANDBOX = 'sandbox',
    /**
     * User Acceptance Testing environment where clients or stakeholders validate the release candidate.
     */
    UAT = 'uat',
    /**
     * Pre-production environment, closely mirroring production for final testing and validation.
     */
    PREPROD = 'preprod',
    /**
     * Demonstration environment specifically configured for client presentations and demos.
     */
    DEMO = 'demo',
    /**
     * Documentation environment for hosting and managing project documentation.
     */
    DOCS = 'docs',
    /**
     * Demonstration environment ONLY html files, typically used for static pages or documentation.
     * This environment is not intended for dynamic content or server-side processing.
     * Perfect to github pages or similar.
     * It is not intended for production use and should not be used for any critical applications or services.
     */
    STATIC_PAGES = 'static-pages',
    /**
     * Continuous Integration environment used by CI/CD pipelines for automated builds and deployments.
     */
    CI = 'ci',
    /**
     * Training environment dedicated to internal team onboarding and training activities.
     */
    TRAINING = 'training',
    /**
     * Staging environment used for final validations before production.
     */
    STAGING = 'staging',
  }

  export type EnvironmentNameTaon = `${EnvironmentName}`;

  export const EnvironmentNameArr: readonly EnvironmentNameTaon[] =
    Object.values(EnvironmentName);

  export function getTsFileName({
    artifactName,
    envName,
    envNumber,
  }: {
    artifactName: string;
    envName: string;
    envNumber?: string | number;
  }): string {
    return `env.${artifactName}.${envName}${envNumber ?? ''}.ts`;
  }

  /**
   * @returns envName, envNumber from string that is container
   * environment. Examples:
   * - env.angular-node-app.dev.ts > envName: 'dev' , envNumber: undefined
   * - env.angular-node-app.dev0.ts > envName: 'dev' , envNumber: 0
   * - env.angular-node-app.dev3.ts > envName: 'dev' , envNumber: 3
   * - env.prod.ts > envName: 'prod' , envNumber: undefined
   * - env.prod2.tsx > envName: 'prod' , envNumber: 2
   * - prod4 > envName: 'prod' , envNumber: 4
   */
  export function splitEnv(value: string): {
    envName: string | EnvironmentNameTaon;
    envNumber?: number | undefined;
  } {
    if (!value) {
      return {
        envName: value,
        envNumber: undefined,
      };
    }

    value = value.replace(/\.tsx?$/, '');

    if (value.startsWith('env.')) {
      value = value.split('.').pop()!;
    }

    const match = value.match(/^(.+?)(\d+)?$/);

    if (!match) {
      return {
        envName: value,
        envNumber: undefined,
      };
    }

    return {
      envName: match[1],
      envNumber: match[2] !== undefined ? Number(match[2]) : undefined,
    };
  }

  //#endregion
}
