//#region imports
import 'reflect-metadata';
import { URL } from 'url'; // @backend

import { Subject } from 'rxjs';

import { _, crossPlatformPath, os, chalk, isElevated } from './core-imports';
import { UtilsNetwork } from './utils-network';

import { Helpers } from './index';
//#endregion

export namespace UtilsEtcHosts {
  export const SIMULATE_DOMAIN_TAG = '@simulatedDomainByTaon';

  //#region utils etc hosts / etc host entry interface
  export interface EtchostEntry {
    lineIp: string;
    domains: string[];
    comment: string;
  }
  //#endregion

  //#region utils etc hosts / get etc hosts path
  export const getPath = (): string => {
    let HOST_FILE_PATH = '';
    //#region @backend
    HOST_FILE_PATH =
      process.platform === 'win32'
        ? 'C:/Windows/System32/drivers/etc/hosts'
        : '/etc/hosts';
    //#endregion
    return crossPlatformPath(HOST_FILE_PATH);
  };
  //#endregion

  //#region utils etc hosts / get lines from etc hosts
  export const getLines = (): string[] => {
    //#region @backendFunc
    const hostsPath = getPath();
    const content = Helpers.readFile(hostsPath, '');
    return content.split(/\r?\n/) || [];
    //#endregion
  };
  //#endregion

  //#region utils etc hosts / get tokens from line
  export const getTokensData = (
    line: string,
  ): {
    comment: string;
    domains: string[];
    lineIp: string;
  } => {
    //#region @backendFunc
    const empty = {
      domains: [],
      lineIp: '',
      comment: '',
    } as ReturnType<typeof UtilsEtcHosts.getTokensData>;

    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return empty;

    // Split off inline comment
    const [entryPart, ...commentParts] = trimmed.split('#');
    const comment = commentParts.length ? commentParts.join('#').trim() : '';

    const tokens = entryPart.trim().split(/\s+/);
    if (tokens.length < 2) return empty;

    const [lineIp, ...domains] = tokens;

    return {
      lineIp,
      comment,
      domains,
    };
    //#endregion
  };
  //#endregion

  //#region utils etc hosts / specyfic entry exists
  export const specificEntryExists = (domain: string, ip: string): boolean => {
    //#region @backendFunc
    const lines = getLines();
    for (const line of lines) {
      const { lineIp, domains } = getTokensData(line);
      if (lineIp === ip && domains.includes(domain)) {
        return true;
      }
    }
    return false;
    //#endregion
  };
  //#endregion

  //#region utils etc hosts / get Etc Host Entry By Domain
  export const getEntriesByDomain = (
    domain: string,
  ): UtilsEtcHosts.EtchostEntry[] => {
    //#region @backendFunc
    if (!domain || /\s/.test(domain)) {
      throw new Error('Invalid domain');
    }
    const entries: UtilsEtcHosts.EtchostEntry[] = [];
    const lines = UtilsEtcHosts.getLines();

    for (const line of lines) {
      const data = UtilsEtcHosts.getTokensData(line);
      const { comment, domains, lineIp } = data;
      if (domains.includes(domain)) {
        entries.push(data);
      }
    }

    return entries;
    //#endregion
  };
  //#endregion

  //#region utils etc hosts / get etc host entries by comment
  export const getEntryByComment = (
    commentOfEntry: string,
  ): UtilsEtcHosts.EtchostEntry[] => {
    //#region @backendFunc
    if (!commentOfEntry || /\s/.test(commentOfEntry)) {
      throw new Error('Invalid comment');
    }

    const entries: UtilsEtcHosts.EtchostEntry[] = [];
    const lines = UtilsEtcHosts.getLines();

    for (const line of lines) {
      const data = UtilsEtcHosts.getTokensData(line);
      const { comment, domains, lineIp } = data;
      if (comment === commentOfEntry && domains.length > 0) {
        entries.push(data);
      }
    }

    return entries;
    //#endregion
  };
  //#endregion

  //#region utils etc hosts / get etc host entries by ip
  /**
   * Returns all host entries for a given IP address.
   */
  export const getEntriesByIp = (ip: string): UtilsEtcHosts.EtchostEntry[] => {
    //#region @backendFunc

    if (!ip || /\s/.test(ip)) {
      throw new Error('Invalid IP address');
    }

    const lines = UtilsEtcHosts.getLines();
    const results: Omit<UtilsEtcHosts.EtchostEntry, 'ip'>[] = [];

    for (const line of lines) {
      const data = UtilsEtcHosts.getTokensData(line);
      const { comment, domains, lineIp } = data;
      if (lineIp === ip && domains.length > 0) {
        results.push(data);
      }
    }

    return results;
    //#endregion
  };
  //#endregion

  //#region utils etc hosts / remove entry by domain
  export const removeEntryByDomain = (domain: string): void => {
    //#region @backendFunc
    const hostsPath = getPath();

    const lines = getLines();

    // Filter out lines containing the specified domain
    const filteredLines = lines.filter(line => {
      const { domains } = getTokensData(line);
      return !domains.includes(domain);
    });

    // Write the updated content back to the hosts file
    Helpers.writeFile(hostsPath, filteredLines.join(os.EOL));
    //#endregion
  };
  //#endregion

  //#region utils etc hosts / simulate domain in etc hosts
  export const simulateDomain = async (
    domainOrDomains: string | string[],
    options?: {
      triggerRevertChangesToEtcHosts?: Subject<void>;
    },
  ): Promise<void> => {
    //#region @backendFunc
    options = options || {};
    domainOrDomains = _.isArray(domainOrDomains)
      ? domainOrDomains
      : [domainOrDomains];
    for (const domain of domainOrDomains) {
      if (!UtilsNetwork.isValidDomain(domain)) {
        Helpers.error(`Invalid domain: "${domain}"`, false, true);
      }
    }

    if (!(await isElevated())) {
      Helpers.error(
        `You must run this command with elevated privileges (sudo or as administrator)`,
        false,
        true,
      );
    }

    return await new Promise(resolve => {
      for (const domain of domainOrDomains) {
        const url = new URL(
          domain.startsWith('http') ? domain : `http://${domain}`,
        );
        UtilsNetwork.setEtcHost(url.hostname, '127.0.0.1', SIMULATE_DOMAIN_TAG);
      }

      Helpers.info(`

      You can access the simulated domain(s) at:

${domainOrDomains
  .map(domain => {
    const url = new URL(
      domain.startsWith('http') ? domain : `http://${domain}`,
    );
    return chalk.underline(`\thttps://${url.hostname}`);
  })
  .join('\n')}

      (${
        domainOrDomains.length <= 1 ? 'Domain is' : 'Domains are'
      } now pointing to ${chalk.bold('localhost')}):

      your etc host path:
      ${chalk.underline(UtilsNetwork.getEtcHostsPath())}

     ${
       !options.triggerRevertChangesToEtcHosts
         ? `PRESS ANY KEY TO STOP REMOVE DOMAIN FROM /etc/hosts
      AND STOP SIMULATION`
         : ''
     }

      `);
      let closing = false;
      const revertChanges = () => {
        console.log(
          `Removing domain(s) from ${UtilsNetwork.getEtcHostsPath()} ...`,
        );
        for (const domain of domainOrDomains) {
          const url = new URL(
            domain.startsWith('http') ? domain : `http://${domain}`,
          );
          UtilsNetwork.removeEtcHost(url.hostname);
        }
      };

      if (options.triggerRevertChangesToEtcHosts) {
        const sub = options.triggerRevertChangesToEtcHosts.subscribe(() => {
          if (closing) {
            return;
          }
          revertChanges();
          sub.unsubscribe();
        });
        resolve(void 0);
      } else {
        const currentRawMode = process.stdin.isRaw;
        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.on('data', () => {
          if (closing) {
            return;
          }

          closing = true;
          revertChanges();
          process.stdin.setRawMode(currentRawMode);
          resolve(void 0);
        });
      }
    });

    //#endregion
  };
  //#endregion
}
