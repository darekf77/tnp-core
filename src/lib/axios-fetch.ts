export interface TaonCookieJar {
  getCookieHeader(
    url: string,
  ): Promise<string | undefined> | string | undefined;

  setCookie(cookie: string, url: string): Promise<void> | void;
}

export interface FetchRequestConfig {
  url: string;
  method?: string;
  headers?: HeadersInit;
  body?: BodyInit | null;
  signal?: AbortSignal;

  // axios compatibility
  validateStatus?: (status: number) => boolean;

  // Taon cookie support
  jar?: TaonCookieJar;
  withCredentials?: boolean;
}

export interface FetchResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Headers;
  config: FetchRequestConfig;
  request: Response;
}

let globalCookieJar: TaonCookieJar | undefined;

export function setGlobalCookieJar(jar: TaonCookieJar | undefined): void {
  globalCookieJar = jar;
}

export async function request<T = any>(
  config: FetchRequestConfig,
): Promise<FetchResponse<T>> {
  const headers = new Headers(config.headers);

  const jar = config.jar ?? globalCookieJar;

  //
  // CookieJar -> request Cookie header
  //
  if (jar && config.withCredentials !== false) {
    const cookieHeader = await jar.getCookieHeader(config.url);

    if (cookieHeader) {
      headers.set('cookie', cookieHeader);
    }
  }

  const response = await fetch(config.url, {
    method: config.method ?? 'GET',
    headers,
    body: config.body,
    signal: config.signal,
  });

  //
  // response Set-Cookie -> CookieJar
  //
  if (jar && config.withCredentials !== false) {
    const responseHeaders = response.headers as Headers & {
      getSetCookie?: () => string[];
    };

    const setCookies =
      typeof responseHeaders.getSetCookie === 'function'
        ? responseHeaders.getSetCookie()
        : (() => {
            const cookie = response.headers.get('set-cookie');
            return cookie ? [cookie] : [];
          })();

    for (const cookie of setCookies) {
      await jar.setCookie(cookie, config.url);
    }
  }

  const validateStatus =
    config.validateStatus ??
    ((status: number) => status >= 200 && status < 300);

  if (!validateStatus(response.status)) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  let data: any;

  const contentType = response.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    data = await response.json();
  } else if (contentType.startsWith('text/')) {
    data = await response.text();
  } else {
    data = await response.arrayBuffer();
  }

  return {
    data,
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
    config,
    request: response,
  };
}

type AxiosLike = {
  <T = any>(config: FetchRequestConfig): Promise<FetchResponse<T>>;

  request<T = any>(config: FetchRequestConfig): Promise<FetchResponse<T>>;

  defaults: {
    jar?: TaonCookieJar;
    withCredentials?: boolean;
  };
};

const defaults: AxiosLike['defaults'] = {
  withCredentials: true,
};

function withDefaults(config: FetchRequestConfig): FetchRequestConfig {
  return {
    ...defaults,
    ...config,

    headers: {
      ...(defaults as any).headers,
      ...(config.headers as any),
    },
  };
}

export const axiosFetchReplacement = Object.assign(
  <T = any>(config: FetchRequestConfig) => request<T>(withDefaults(config)),
  {
    defaults,

    request: <T = any>(config: FetchRequestConfig) =>
      request<T>(withDefaults(config)),

    get: <T = any>(url: string, config: Partial<FetchRequestConfig> = {}) =>
      request<T>(
        withDefaults({
          ...config,
          url,
          method: 'GET',
        } as FetchRequestConfig),
      ),

    post: <T = any>(
      url: string,
      body?: BodyInit | null,
      config: Partial<FetchRequestConfig> = {},
    ) =>
      request<T>(
        withDefaults({
          ...config,
          url,
          method: 'POST',
          body,
        } as FetchRequestConfig),
      ),

    put: <T = any>(
      url: string,
      body?: BodyInit | null,
      config: Partial<FetchRequestConfig> = {},
    ) =>
      request<T>(
        withDefaults({
          ...config,
          url,
          method: 'PUT',
          body,
        } as FetchRequestConfig),
      ),

    patch: <T = any>(
      url: string,
      body?: BodyInit | null,
      config: Partial<FetchRequestConfig> = {},
    ) =>
      request<T>(
        withDefaults({
          ...config,
          url,
          method: 'PATCH',
          body,
        } as FetchRequestConfig),
      ),

    delete: <T = any>(url: string, config: Partial<FetchRequestConfig> = {}) =>
      request<T>(
        withDefaults({
          ...config,
          url,
          method: 'DELETE',
        } as FetchRequestConfig),
      ),
  },
) as AxiosLike;
