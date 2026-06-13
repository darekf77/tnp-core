export namespace TaonYtCloudFlareWorker {
  //#region youtube playlist helpers
  export type YtPlaylistVideo = {
    videoId: string;
    title: string;
    url: string;
    thumbnail: string;
    order: number;
  };

  type YoutubePlaylistItemsResponse = {
    nextPageToken?: string;
    items?: YoutubePlaylistItem[];
    error?: {
      message?: string;
      code?: number;
      status?: string;
    };
  };

  type YoutubePlaylistItem = {
    snippet?: {
      title?: string;
      position?: number;
      resourceId?: {
        videoId?: string;
      };
      thumbnails?: Record<
        string,
        {
          url?: string;
          width?: number;
          height?: number;
        }
      >;
    };
    contentDetails?: {
      videoId?: string;
    };
  };

  type GetYoutubePlaylistVideosOptions = {
    /**
     * YouTube Data API v3 key.
     *
     * In Cloudflare Worker pass:
     * env.YOUTUBE_API_KEY
     */
    apiKey: string;

    /**
     * Default: 3
     */
    retries?: number;

    /**
     * Default: 200
     */
    retryDelayMs?: number;

    /**
     * Safety limit.
     * Default: Infinity
     */
    maxVideos?: number;
  };

  function extractPlaylistId(input: string): string {
    const raw = (input || '').trim();

    if (!raw) {
      return '';
    }

    if (raw.startsWith('http://') || raw.startsWith('https://')) {
      try {
        const u = new URL(raw);
        return (u.searchParams.get('list') || '').trim();
      } catch {
        return '';
      }
    }

    return raw.split('&')[0].trim();
  }

  function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function getBestThumbnail(
    // @ts-ignore
    thumbnails: YoutubePlaylistItem['snippet']['thumbnails'],
    videoId: string,
  ): string {
    const preferred = ['maxres', 'standard', 'high', 'medium', 'default'];

    for (const key of preferred) {
      const url = thumbnails?.[key]?.url;
      if (url) {
        return url;
      }
    }

    return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  }

  async function fetchJsonWithRetry<T>(
    url: string,
    retries: number,
    retryDelayMs: number,
  ): Promise<T> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const resp = await fetch(url, {
          headers: {
            accept: 'application/json',
          },
        });

        const data = (await resp.json().catch(() => ({}))) as T & {
          error?: {
            message?: string;
            code?: number;
            status?: string;
          };
        };

        if (resp.ok) {
          return data;
        }

        const apiMessage =
          data?.error?.message || `${resp.status} ${resp.statusText}`;

        const shouldRetry =
          resp.status === 429 ||
          resp.status === 500 ||
          resp.status === 502 ||
          resp.status === 503 ||
          resp.status === 504;

        if (!shouldRetry || attempt === retries) {
          throw new Error(`YouTube API request failed: ${apiMessage}`);
        }

        lastError = new Error(apiMessage);
      } catch (error) {
        lastError = error;

        if (attempt === retries) {
          throw error;
        }
      }

      await sleep(retryDelayMs * Math.pow(2, attempt));
    }

    throw lastError instanceof Error
      ? lastError
      : new Error('YouTube API request failed');
  }

  export async function getYoutubePlaylistVideos(
    playlistIdOrUrl: string,
    options: GetYoutubePlaylistVideosOptions,
  ): Promise<YtPlaylistVideo[]> {
    const playlistId = extractPlaylistId(playlistIdOrUrl);
    const apiKey = options?.apiKey?.trim();

    if (!playlistId) {
      throw new Error('Missing playlistId');
    }

    if (!apiKey) {
      throw new Error('Missing YouTube API key');
    }

    const retries = options.retries ?? 3;
    const retryDelayMs = options.retryDelayMs ?? 200;
    const maxVideos = options.maxVideos ?? Infinity;

    const videos: YtPlaylistVideo[] = [];
    const seen = new Set<string>();

    let pageToken = '';

    do {
      const url = new URL(
        'https://www.googleapis.com/youtube/v3/playlistItems',
      );

      url.searchParams.set('part', 'snippet,contentDetails');
      url.searchParams.set('playlistId', playlistId);
      url.searchParams.set('maxResults', '50');
      url.searchParams.set('key', apiKey);

      if (pageToken) {
        url.searchParams.set('pageToken', pageToken);
      }

      const data = await fetchJsonWithRetry<YoutubePlaylistItemsResponse>(
        url.toString(),
        retries,
        retryDelayMs,
      );

      for (const item of data.items || []) {
        const videoId =
          item.contentDetails?.videoId ||
          item.snippet?.resourceId?.videoId ||
          '';

        const title = (item.snippet?.title || '').trim();

        if (!videoId || !title || seen.has(videoId)) {
          continue;
        }

        seen.add(videoId);

        videos.push({
          videoId,
          title,
          url: `https://www.youtube.com/watch?v=${videoId}`,
          thumbnail: getBestThumbnail(item.snippet?.thumbnails, videoId),
          order:
            typeof item.snippet?.position === 'number'
              ? item.snippet.position + 1
              : videos.length + 1,
        });

        if (videos.length >= maxVideos) {
          return videos.sort((a, b) => a.order - b.order);
        }
      }

      pageToken = data.nextPageToken || '';
    } while (pageToken);

    return videos.sort((a, b) => a.order - b.order);
  }
  //#endregion
}
