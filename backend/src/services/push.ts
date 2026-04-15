import webpush from 'web-push';
import { query } from '../db';

const pkey = process.env.VAPID_PUBLIC_KEY || 'BNdrDaQUzMKERGw_lgXWq4MxNtsgECGJt880L7Jor0j_fNrSfM24hvzxGiVcujVtafjkaCJH9Rj_nf8NdiPXcuw';
const skey = process.env.VAPID_PRIVATE_KEY || 'nv00hSXmu7YH5YTJ_MbpGpSAiJCUN3KXkmVsyV9sTxc';

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
