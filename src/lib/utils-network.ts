//#region imports
import 'reflect-metadata';
import * as net from 'net';
import { URL } from 'url'; // @backend

import { Subject } from 'rxjs';

import { _, os, https } from './core-imports';
import { spawn } from './core-imports';
import { fse } from './core-imports';
import { Utils } from './utils';
import { UtilsEtcHosts } from './utils-etc-hosts';

import { Helpers } from './index';
//#endregion

export namespace UtilsNetwork {
  //#region utils network / online server check
  export interface PingResult {
    host: string;
    success: boolean;
    timeMs?: number; // latency if available
    output?: string; // raw ping output
  }

  export async function checkPing(
    host: string,
    timeoutMs = 3000,
  ): Promise<PingResult> {
    //#region @backendFunc
    return new Promise(resolve => {
      const platform = process.platform;

      // platform-specific args
      let args: string[] = [];
      if (platform === 'win32') {
        // Windows ping sends 4 by default; set count to 1 and timeout in ms
        args = ['-n', '1', '-w', String(timeoutMs), host];
      } else {
        // macOS & Linux use -c count and -W timeout (in seconds)
        const timeoutSec = Math.ceil(timeoutMs / 1000);
        args = ['-c', '1', '-W', String(timeoutSec), host];
      }

      const child = spawn('ping', args);

      let output = '';
      child.stdout.on('data', d => (output += d.toString()));
      child.stderr.on('data', d => (output += d.toString()));

      const onDone = (success: boolean) => {
        const timeMatch = output.match(/time[=<]([\d.]+)\s*ms/i);
        const timeMs = timeMatch ? parseFloat(timeMatch[1]) : undefined;
        resolve({ host, success, timeMs, output: output.trim() });
      };

      const timer = setTimeout(() => {
        child.kill('SIGKILL');
        onDone(false);
      }, timeoutMs + 500);

      child.on('exit', code => {
        clearTimeout(timer);
        onDone(code === 0);
      });
    });
    //#endregion
  }

  export const checkIfServerPings = async (
    host: string,
    timeoutMs = 3000,
  ): Promise<boolean> => {
    //#region @backendFunc
    const result = await checkPing(host, timeoutMs);
    return result.success;
    //#endregion
  };

  /**
   * Check if a server is online by attempting to open a TCP connection.
   */
  export const checkIfServerOnline = async (
    host: string,
    port = 80,
    timeoutMs = 3000,
  ): Promise<boolean> => {
    //#region @backendFunc
    return new Promise(resolve => {
      const socket = new net.Socket();

      const onError = (): void => {
        socket.destroy();
        resolve(false);
      };

      socket.setTimeout(timeoutMs);
      socket.on('error', onError);
      socket.on('timeout', onError);

      socket.connect(port, host, () => {
        socket.end();
        resolve(true);
      });
    });
    //#endregion
  };
  //#endregion

  //#region utils network / isValidIp
  export const isValidIp = (ip: string): boolean => {
    if (!_.isString(ip)) {
      return false;
    }
    ip = ip.trim();
    if (ip === 'localhost') {
      return true;
    }
    return /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(
      ip,
    );
  };
  //#endregion

  //#region utils network / isValidDomain
  export const isValidDomain = (
    url: string,
    options?: {
      /**
       * if yes - domain should start with http:// or https://
       */
      shouldIncludeProtocol?: boolean | 'http' | 'https';
    },
  ): boolean => {
    if (!url || typeof url !== 'string') return false;

    const shouldIncludeProtocol = !!options?.shouldIncludeProtocol;

    // Build regex depending on protocol requirement
    const domainRegex = shouldIncludeProtocol
      ? /^(https?:\/\/)([a-zA-Z0-9-]{1,63}\.)+[a-zA-Z]{2,}$/ // with protocol
      : /^([a-zA-Z0-9-]{1,63}\.)+[a-zA-Z]{2,}$/; // without protocol

    if (
      typeof options?.shouldIncludeProtocol === 'string' &&
      options?.shouldIncludeProtocol === 'http' &&
      !url.startsWith('http://')
    ) {
      return false; // if http is required, but url does not start with http://
    }
    if (
      typeof options?.shouldIncludeProtocol === 'string' &&
      options?.shouldIncludeProtocol === 'https' &&
      !url.startsWith('https://')
    ) {
      return false; // if https is required, but url does not start with https://
    }

    return domainRegex.test(url.trim());
  };
  //#endregion

  //#region utils network / urlParse
  export const urlParse = (
    portOrHost: number | string | URL,
    options?: {
      forceDomain?: boolean;
      httpsIfNotProvided?: boolean;
    },
  ): URL => {
    options = options || {};
    let url: URL;
    const defaultProtocol = options.httpsIfNotProvided ? 'https:' : 'http:';
    if (portOrHost instanceof URL) {
      url = portOrHost;
    } else if (_.isNumber(portOrHost)) {
      url = new URL(`${defaultProtocol}//localhost:${portOrHost}`);
    } else if (!_.isNaN(Number(portOrHost))) {
      url = new URL(`${defaultProtocol}//localhost:${Number(portOrHost)}`);
    } else if (_.isString(portOrHost)) {
      try {
        url = new URL(portOrHost);
      } catch (error: unknown) {}
      if (isValidIp(portOrHost)) {
        try {
          url = new URL(`${defaultProtocol}//${portOrHost}`);
        } catch (error: unknown) {
          Helpers.warn(`Not able to get port from ${portOrHost}`);
        }
      }
      if (options.forceDomain) {
        const domain = portOrHost as string;
        url = new URL(
          domain.startsWith('http') ? domain : `http://${portOrHost}`,
        );
      }
    }
    return url;
  };
  //#endregion

  //#region utils network / get etc hosts path
  export const getEtcHostsPath = () => UtilsEtcHosts.getPath();
  //#endregion

  //#region utils network / setEtcHost
  /**
   * Add or update a hosts entry
   */
  export const setEtcHost = (
    domain: string,
    ip: string = '127.0.0.1',
    comment: string = '',
  ): void => {
    //#region @backendFunc
    const hostsPath = getEtcHostsPath();

    if (!domain || /\s/.test(domain)) {
      throw new Error('Invalid domain');
    }

    let content = fse.readFileSync(hostsPath, 'utf8').split(/\r?\n/);

    // Remove any existing lines with this domain
    content = content.filter(
      line =>
        !new RegExp(
          `\\b${Utils.escapeStringForRegEx(domain, {
            skipEscapeSlashAndDash: true,
          })}\\b`,
        ).test(line),
    );

    // Add new entry
    const entry = `${ip} ${domain}${comment ? ` # ${comment}` : ''}`;
    content.push(entry);

    fse.writeFileSync(hostsPath, content.join(os.EOL), 'utf8');
    //#endregion
  };
  //#endregion

  //#region utils network / get Etc Host Entry By Domain
  /**
   * @deprecated use UtilsEtcHosts.getEntriesByDomain instead
   */
  export const getEtcHostEntriesByDomain = (domain: string) =>
    UtilsEtcHosts.getEntriesByDomain(domain);
  //#endregion

  //#region utils network / get etc host entries by comment
  /**
   * @deprecated use UtilsEtcHosts.getEntryByComment instead
   */
  export const getEtcHostEntryByComment = (commentOfEntry: string) =>
    UtilsEtcHosts.getEntryByComment(commentOfEntry);
  //#endregion

  //#region utils network / get etc host entries by ip
  /**
   * @deprecated use UtilsEtcHosts.getEntriesByIp instead
   */
  export const getEtcHostEntryByIp = (ip: string) =>
    UtilsEtcHosts.getEntriesByIp(ip);
  //#endregion

  //#region utils network / removeEtcHost
  /**
   * Remove all lines containing the given domain
   * @deprecated use UtilsEtcHosts.removeEntryByDomain instead
   */
  export const removeEtcHost = (domain: string) =>
    UtilsEtcHosts.removeEntryByDomain(domain);
  //#endregion

  //#region utils network / etc host without localhost
  export const etcHostHasProperLocalhostIp4Entry = (): boolean => {
    //#region @backendFunc
    let localhost = getEtcHostEntryByIp('127.0.0.1');
    return localhost.some(entry => entry.domains.includes('localhost'));
    //#endregion
  };

  export const etcHostHasProperLocalhostIp6Entry = (): boolean => {
    //#region @backendFunc
    let localhost = getEtcHostEntryByIp('::1');
    return localhost.some(entry => entry.domains.includes('localhost'));
    //#endregion
  };

  //#endregion

  //#region utils network / simulate domain in etc hosts
  /**
   * @deprecated use UtilsEtcHosts.simulateDomain instead
   */
  export const simulateDomain = (
    domainOrDomains: string | string[],
    options?: {
      triggerRevertChangesToEtcHosts?: Subject<void>;
    },
  ) => UtilsEtcHosts.simulateDomain(domainOrDomains, options);
  //#endregion

  //#region utils network / get local public ip addresses

  //#region utils network / get local public ip addresses / local ip info interface
  export interface LocalIpInfo {
    interfaceName: string;
    address: string;
    family: 'IPv4' | 'IPv6';
    internal: boolean;
    type: 'lan' | 'wifi' | 'other' | 'virtual';
  }
  //#endregion

  //#region utils network / get local public ip addresses / get interface type from name
  const isVirtualInterface = (name: string): boolean => {
    const lname = name.toLowerCase();
    return (
      lname.includes('virtual') ||
      lname.includes('vmware') ||
      lname.includes('vbox') ||
      lname.includes('hyper-v') ||
      lname.includes('wsl') ||
      lname.includes('docker') ||
      lname.includes('veth') ||
      lname.includes('default switch')
    );
  };

  const interfaceTypeFromName = (name: string): LocalIpInfo['type'] => {
    const lname = name.toLowerCase();

    if (isVirtualInterface(lname)) return 'virtual';
    if (lname.includes('eth') || lname.includes('en') || lname.includes('lan'))
      return 'lan';
    if (
      lname.includes('wl') ||
      lname.includes('wi-fi') ||
      lname.includes('wifi')
    )
      return 'wifi';
    return 'other';
  };

  const sortByPriority = (a: LocalIpInfo, b: LocalIpInfo): number => {
    const typePriority = { lan: 1, wifi: 2, other: 3, virtual: 4 };
    const pa = typePriority[a.type];
    const pb = typePriority[b.type];
    if (pa !== pb) return pa - pb;

    // Secondary heuristic for tie-breaking (e.g., Ethernet 5 before vEthernet)
    const nameA = a.interfaceName.toLowerCase();
    const nameB = b.interfaceName.toLowerCase();

    // prefer physical-looking names
    const physPriority = (name: string) =>
      name.includes('ethernet') && !name.includes('vethernet') ? 0 : 1;

    const diff = physPriority(nameA) - physPriority(nameB);
    if (diff !== 0) return diff;

    return nameA.localeCompare(nameB);
  };
  //#endregion

  //#region utils network / get local public ip addresses / get local ip addresses
  /**
   * Returns all local IP addresses in preferred order:
   * LAN → Wi-Fi → Other → Virtual
   */
  export const getLocalIpAddresses = async (): Promise<LocalIpInfo[]> => {
    //#region @backendFunc
    const interfaces = os.networkInterfaces();
    const all: LocalIpInfo[] = [];

    for (const [name, addrs] of Object.entries(interfaces)) {
      if (!addrs) continue;
      for (const addr of addrs) {
        if (addr.internal) continue;
        all.push({
          interfaceName: name,
          address: addr.address,
          family: addr.family as 'IPv4' | 'IPv6',
          internal: addr.internal,
          type: interfaceTypeFromName(name),
        });
      }
    }

    all.sort(sortByPriority);
    return all;
    //#endregion
  };
  //#endregion

  //#region utils network / get local public ip addresses / get first local active ip address
  /**
   * Returns first active local ipv4 IP (LAN preferred over Wi-Fi).
   */
  export const getFirstIpV4LocalActiveIpAddress = async (): Promise<
    string | null
  > => {
    //#region @backendFunc
    const all = await getLocalIpAddresses().then(a =>
      a.filter(f => f.family === 'IPv4'),
    );
    return all.length > 0 ? all[0].address : null;
    //#endregion
  };
  //#endregion

  //#region utils network / get local public ip addresses / get current public ip address
  /**
   * Returns current public IP address (or null if undetectable).
   */
  export const getCurrentPublicIpAddress = async (): Promise<string | null> => {
    //#region @backendFunc
    const urls = [
      'https://api.ipify.org?format=json',
      'https://ifconfig.me/ip',
      'https://icanhazip.com',
    ];

    for (const url of urls) {
      try {
        const ip = await new Promise<string>((resolve, reject) => {
          https
            .get(url, res => {
              let data = '';
              res.on('data', chunk => (data += chunk));
              res.on('end', () => {
                try {
                  const match = data.match(
                    /(\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b)/,
                  );
                  if (match) resolve(match[1]);
                  else if (data.trim().length > 0) resolve(data.trim());
                  else reject(new Error('no ip found'));
                } catch (e) {
                  reject(e);
                }
              });
            })
            .on('error', reject)
            .setTimeout(3000, () => reject(new Error('timeout')));
        });
        if (ip) return ip;
      } catch (e) {
        // try next
      }
    }
    return null;
    //#endregion
  };
  //#endregion

  //#endregion
}
