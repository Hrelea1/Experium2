import webpush from 'web-push';
import { query } from '../db';

const pkey = process.env.VAPID_PUBLIC_KEY || 'BP3xUbSA2Mr0KrzU5MBQY8xrVVBYUCMfgnHEhUJiRqYVdf5kFTBS_Uab6IXDI16smCynOpKa9dukgfvMRuRkhzw';
const skey = process.env.VAPID_PRIVATE_KEY || 'u2EpiCjfwwhWZODAZfxUoTy6k4GlGCA8xQHtEVwQ0_M';

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
