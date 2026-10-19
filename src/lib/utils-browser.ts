export class UtilsBrowser {
  //#region user agent

  private static get userAgent(): string {
    if (typeof navigator === 'undefined') {
      return '';
    }

    return navigator.userAgent || '';
  }

  //#endregion

  //#region platform

  static get isRunningInIOS(): boolean {
    if (typeof navigator === 'undefined') {
      return false;
    }

    return (
      /iPhone|iPad|iPod/i.test(this.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    );
  }

  static get isRunningInAndroid(): boolean {
    return /Android/i.test(this.userAgent);
  }

  static get isRunningOnMobileDevice(): boolean {
    return this.isRunningInIOS || this.isRunningInAndroid;
  }

  //#endregion

  //#region embedded browsers

  static get isMessengerBrowser(): boolean {
    const ua = this.userAgent;

    return /Messenger/i.test(ua) || /FB_IAB.*Messenger/i.test(ua);
  }

  static get isFacebookBrowser(): boolean {
    const ua = this.userAgent;

    return /FBAN|FBAV|FB_IAB/i.test(ua);
  }

  static get isInstagramBrowser(): boolean {
    return /Instagram/i.test(this.userAgent);
  }

  static get isEmbeddedBrowser(): boolean {
    const ua = this.userAgent;

    return (
      this.isMessengerBrowser ||
      this.isFacebookBrowser ||
      this.isInstagramBrowser ||
      /\bwv\b/i.test(ua)
    );
  }

  //#endregion
}
