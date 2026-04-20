import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { tokenStore } from '@/lib/api';

const isProd = import.meta.env.PROD;
const defaultApiUrl = isProd ? 'https://experium2-production.up.railway.app' : 'http://localhost:3001';
const API_BASE = import.meta.env.VITE_API_URL ?? defaultApiUrl;

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/** Resolve the correct SW path based on deployment context */
function getSwUrl(): string {
  // GitHub Pages deploys under /Experium2/
  if (window.location.pathname.startsWith('/Experium2')) {
    return '/Experium2/sw-push.js';
  }
  return '/sw-push.js';
}

export function usePushSubscription() {
  const { user } = useAuth();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    setIsSupported(supported);
    if (supported) {
      setPermission(Notification.permission);
      checkSubscription();
    }
  }, [user]);

  const checkSubscription = async () => {
    if (!user) return;
    try {
      const reg = await navigator.serviceWorker.getRegistration(getSwUrl());
      if (reg) {
        const sub = await reg.pushManager?.getSubscription();
        setIsSubscribed(!!sub);
      }
    } catch {
      // silent
    }
  };

  const subscribe = async (): Promise<{ success: boolean; error?: string }> => {
    if (!user || !isSupported) return { success: false, error: 'Nu este suportat' };

    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') return { success: false, error: 'Permisiune refuzată' };

      const swUrl = getSwUrl();

      // ── Clean up any stale SW registrations for our push worker ──
      // This prevents "push service error" caused by VAPID key mismatches
      // from a previous registration that used different keys.
      try {
        const existingReg = await navigator.serviceWorker.getRegistration(swUrl);
        if (existingReg) {
          const oldSub = await existingReg.pushManager.getSubscription();
          if (oldSub) await oldSub.unsubscribe();
          await existingReg.unregister();
          console.log('[Push] Cleaned up stale SW registration');
          // Small delay to let the browser fully release the old registration
          await new Promise(r => setTimeout(r, 500));
        }
      } catch (cleanupErr) {
        console.warn('[Push] Cleanup of old SW failed (non-fatal):', cleanupErr);
      }

      // ── Register fresh service worker ──
      console.log('[Push] Registering SW at:', swUrl);
      const reg = await navigator.serviceWorker.register(swUrl);

      // Wait for SW to be fully active before subscribing
      await navigator.serviceWorker.ready;
      if (reg.installing || reg.waiting) {
        await new Promise<void>((resolve) => {
          const sw = reg.installing || reg.waiting;
          if (!sw) { resolve(); return; }
          sw.addEventListener('statechange', () => {
            if (sw.state === 'activated') resolve();
          });
          setTimeout(resolve, 3000);
        });
      }

      // ── Get VAPID key from backend ──
      const token = tokenStore.get();
      const res = await fetch(`${API_BASE}/notifications/push/vapid-key`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Failed to fetch VAPID key: ${res.status} ${errText}`);
      }

      const { publicKey } = await res.json();
      if (!publicKey) throw new Error('Nu am putut obține cheia VAPID din server.');

      console.log('[Push] Subscribing with VAPID key:', publicKey.substring(0, 20) + '...');

      // ── Subscribe to PushManager (with retry) ──
      let sub: PushSubscription | null = null;
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey),
          });
          break; // success
        } catch (pushErr: any) {
          console.warn(`[Push] Subscribe attempt ${attempt} failed:`, pushErr.message);
          if (attempt === 2) throw pushErr;
          // Wait before retry — transient push service errors often resolve
          await new Promise(r => setTimeout(r, 1500));
        }
      }

      if (!sub) throw new Error('Subscription object is null after subscribe');

      console.log('[Push] Subscription created, saving to backend...');

      // ── Save to backend ──
      const saveRes = await fetch(`${API_BASE}/notifications/push/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(sub),
      });

      if (!saveRes.ok) throw new Error('Eroare la salvarea abonamentului pe server');

      setIsSubscribed(true);
      console.log('[Push] ✅ Successfully subscribed');
      return { success: true };
    } catch (err: any) {
      console.error('[Push] Subscription failed:', err);
      return { success: false, error: err.message || 'Eroare necunoscută' };
    }
  };

  const unsubscribe = async () => {
    try {
      const reg = await navigator.serviceWorker.getRegistration(getSwUrl());
      if (reg) {
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          // Unsubscribe from backend first
          const token = tokenStore.get();
          await fetch(`${API_BASE}/notifications/push/unsubscribe`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {})
            },
            body: JSON.stringify({ endpoint: sub.endpoint })
          });

          // Unsubscribe from browser
          await sub.unsubscribe();
        }
      }
      setIsSubscribed(false);
    } catch (err) {
      console.error('Unsubscribe failed', err);
    }
  };

  return { isSubscribed, isSupported, permission, subscribe, unsubscribe };
}
