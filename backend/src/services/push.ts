import webpush from 'web-push';
import { query } from '../db';

const pkey = process.env.VAPID_PUBLIC_KEY || 'BII1rdENXJ-1Ove4xpRX4PjAfWwycuqq6hyLa4p0PnucBAoJAnlmmMmCneD0uiYw3BU3yobxkrx-5CL1jb2y7bg';
const skey = process.env.VAPID_PRIVATE_KEY || '2k6PXxffhSdz_HwCVG67eybk6ZjgWT9AZKlh4b7nweY';

webpush.setVapidDetails(
  'mailto:support@experium.ro',
  pkey,
  skey
);

export async function sendWebPush(userId: string, payload: any) {
  try {
    const rows = await query('SELECT id, endpoint, keys_p256dh, keys_auth FROM web_push_subscriptions WHERE user_id = $1', [userId]);
    if (!rows.length) return;

    console.log(`[WebPush] Sending push to user ${userId} (${rows.length} subscriptions)`);

    const promises = rows.map(async (row: any) => {
      const pushSubscription = {
        endpoint: row.endpoint,
        keys: {
          p256dh: row.keys_p256dh,
          auth: row.keys_auth
        }
      };

      try {
        await webpush.sendNotification(pushSubscription, JSON.stringify(payload));
      } catch (err: any) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          // Subscription expired/removed
          await query('DELETE FROM web_push_subscriptions WHERE id = $1', [row.id]);
        } else {
          console.error('[WebPush] Error sending to', row.endpoint, err);
        }
      }
    });

    await Promise.all(promises);
  } catch (err) {
    console.error('[WebPush] db error', err);
  }
}
