import { query } from '../db';
import { sendWebPush } from './push';

export async function createProviderNotification(
  providerUserId: string,
  title: string,
  message: string,
  type: string,
  referenceId?: string
) {
  try {
    // 1. Insert into DB so it shows up in NotificationBell
    await query(
      `INSERT INTO provider_notifications (provider_user_id, title, message, type, reference_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [providerUserId, title, message, type, referenceId || null]
    );

    // 2. Fire web push to browser
    await sendWebPush(providerUserId, {
      title,
      body: message,
      url: '/provider',
      type
    });
  } catch (err) {
    console.error('[createProviderNotification] failed', err);
  }
}
