export interface FetchRequestConfig {
  url: string;
  method?: string;
  headers?: HeadersInit;
  body?: BodyInit | null;
  signal?: AbortSignal;

  // axios compatibility
  validateStatus?: (status: number) => boolean;
}

export interface FetchResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Headers;
  config: FetchRequestConfig;
  request: Response;
}

export async function request<T = any>(
  config: FetchRequestConfig,
): Promise<FetchResponse<T>> {
  const response = await fetch(config.url, {
    method: config.method ?? 'GET',
    headers: config.headers,
    body: config.body,
    signal: config.signal,
  });

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
};

export const axiosFetchReplacement = Object.assign(
  <T = any>(config: FetchRequestConfig) => request<T>(config),
  {
    request,
    get: <T = any>(url: string, config: Partial<FetchRequestConfig> = {}) =>
      request<T>({ ...config, url, method: 'GET' }),

    post: <T = any>(
      url: string,
      body?: BodyInit | null,
      config: Partial<FetchRequestConfig> = {},
    ) =>
      request<T>({
        ...config,
        url,
        method: 'POST',
        body,
      }),

    put: <T = any>(
      url: string,
      body?: BodyInit | null,
      config: Partial<FetchRequestConfig> = {},
    ) =>
      request<T>({
        ...config,
        url,
        method: 'PUT',
        body,
      }),

    patch: <T = any>(
      url: string,
      body?: BodyInit | null,
      config: Partial<FetchRequestConfig> = {},
    ) =>
      request<T>({
        ...config,
        url,
        method: 'PATCH',
        body,
      }),

    delete: <T = any>(url: string, config: Partial<FetchRequestConfig> = {}) =>
      request<T>({
        ...config,
        url,
        method: 'DELETE',
      }),
  },
) as AxiosLike;
