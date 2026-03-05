export interface TaonStripeCloudflareWorkerData {
  stripeSessionId: string;
  clientEmail: string;
  productId: string;
}

export enum TaonStripeCloudflareKey {
  stripeSessionId = 'stripeSessionId',
  clientEmail = 'clientEmail',
  productId = 'productId',
}

export class TaonStripeCloudflareWorker {
  static HOOK_POST = '/stripe-webhook';

  static HOOK_GET = '/check-access';

  constructor(public readonly url: string) {}

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
