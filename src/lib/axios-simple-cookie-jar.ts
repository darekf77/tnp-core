import { TaonCookieJar } from "./axios-fetch";

export class SimpleCookieJar implements TaonCookieJar {
  private cookies = new Map<string, Map<string, string>>();

  getCookieHeader(url: string): string | undefined {
    const hostname = new URL(url).hostname;

    const cookies = this.cookies.get(hostname);

    if (!cookies?.size) {
      return undefined;
    }

    return [...cookies.entries()]
      .map(([name, value]) => `${name}=${value}`)
      .join('; ');
  }

  setCookie(setCookieHeader: string, url: string): void {
    const hostname = new URL(url).hostname;

    const firstPart = setCookieHeader.split(';', 1)[0];

    const separatorIndex = firstPart.indexOf('=');

    if (separatorIndex === -1) {
      return;
    }

    const name = firstPart.slice(0, separatorIndex).trim();

    const value = firstPart.slice(separatorIndex + 1).trim();

    let cookies = this.cookies.get(hostname);

    if (!cookies) {
      cookies = new Map();

      this.cookies.set(hostname, cookies);
    }

    cookies.set(name, value);
  }
}
