import { Observable } from 'rxjs';

export interface TaonStripeCloudflareWorkerData {
  stripeSessionId: string;
  clientEmail: string;
  productId: string;
}

export interface TaonYoutubePlaylistVideo {
  videoId: string;
  title: string;
  url: string;
  thumbnail: string;
  order: number;
}

export enum TaonStripeCloudflareKey {
  stripeSessionId = 'stripeSessionId',
  clientEmail = 'clientEmail',
  productId = 'productId',
}

export class TaonStripeCloudflareWorker {
  static HOOK_POST = '/stripe-webhook';

  static HOOK_GET = '/check-access';

  static HOOK_YOUTUBE_PLAYLIST_VIDEOS = '/youtube-playlist-videos';

  static HOOK_CREATE_STRIPE_SESSION = '/create-checkout-session';

  constructor(public readonly url: string) {}

  async getVideosIdsByPlaylistId(playlistId: string): Promise<string[]> {
    const params = new URLSearchParams({
      playlistId,
    });

    const resp = await fetch(
      `${this.url + TaonStripeCloudflareWorker.HOOK_YOUTUBE_PLAYLIST_VIDEOS}?${params}`,
    );

    if (!resp.ok) {
      throw new Error(`Youtube playlist worker error ${resp.status}`);
    }

    const body: TaonYoutubePlaylistVideo[] = await resp.json();
    return body.map(v => v.videoId);
  }

  async getVideosByPlaylistId(
    playlistId: string,
  ): Promise<TaonYoutubePlaylistVideo[]> {
    const params = new URLSearchParams({
      playlistId,
    });

    const resp = await fetch(
      `${this.url + TaonStripeCloudflareWorker.HOOK_YOUTUBE_PLAYLIST_VIDEOS}?${params}`,
    );

    if (!resp.ok) {
      throw new Error(`Youtube playlist worker error ${resp.status}`);
    }

    return await resp.json();
  }

  getVideosByPlaylistIdObs(
    playlistId: string,
  ): Observable<TaonYoutubePlaylistVideo[]> {
    return new Observable(observer => {
      const controller = new AbortController();

      const params = new URLSearchParams({
        playlistId,
      });

      fetch(
        `${this.url + TaonStripeCloudflareWorker.HOOK_YOUTUBE_PLAYLIST_VIDEOS}?${params}`,
        { signal: controller.signal },
      )
        .then(resp => {
          if (!resp.ok) {
            throw new Error(`Youtube playlist worker error ${resp.status}`);
          }
          return resp.json();
        })
        .then(data => {
          observer.next(data);
          observer.complete();
        })
        .catch(err => {
          // ignore abort error
          if (err.name !== 'AbortError') {
            observer.error(err);
          }
        });

      // cancellation logic
      return () => {
        controller.abort();
      };
    });
  }

  async sendAsStripe(data: TaonStripeCloudflareWorkerData): Promise<void> {
    const resp = await fetch(this.url + TaonStripeCloudflareWorker.HOOK_POST, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!resp.ok) {
      throw new Error(`Stripe worker error ${resp.status}`);
    }
  }

  async checkAccess(
    data: Omit<Partial<TaonStripeCloudflareWorkerData>, 'stripeSessionId'>,
  ): Promise<boolean> {
    const params = new URLSearchParams();

    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined && value !== null) {
        params.append(key, String(value));
      }
    }

    const urlForAccessCheck = `${this.url + TaonStripeCloudflareWorker.HOOK_GET}?${params}`;
    // console.log({ urlForAccessCheck });
    const resp = await fetch(urlForAccessCheck);

    if (!resp.ok) {
      return false;
    }

    const body: { hasAccess: boolean } = await resp.json();
    return body?.hasAccess ?? false;
  }
}
