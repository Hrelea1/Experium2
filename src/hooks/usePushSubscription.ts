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
      const swUrl = window.location.pathname.startsWith('/Experium2') ? '/Experium2/sw-push.js' : '/sw-push.js';
      const reg = await navigator.serviceWorker.getRegistration(swUrl);
      if (reg) {
        const sub = await (reg as any).pushManager?.getSubscription();
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

      const swUrl = window.location.pathname.startsWith('/Experium2') ? '/Experium2/sw-push.js' : '/sw-push.js';
      const reg = await navigator.serviceWorker.register(swUrl);
      await navigator.serviceWorker.ready;

      // Unsubscribe existing if any
      const existing = await reg.pushManager.getSubscription();
      if (existing) await existing.unsubscribe();

      // Get VAPID key
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

      // Subscribe to PushManager
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });

      // Save to backend
      const saveRes = await fetch(`${API_BASE}/notifications/push/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(sub)
      });

      if (!saveRes.ok) throw new Error('Eroare la salvarea abonamentului pe server');

      setIsSubscribed(true);
      return { success: true };
    } catch (err: any) {
      console.error('Push subscription failed', err);
      return { success: false, error: err.message || 'Eroare necunoscută' };
    }
  };

  const unsubscribe = async () => {
    try {
      const swUrl = window.location.pathname.startsWith('/Experium2') ? '/Experium2/sw-push.js' : '/sw-push.js';
      const reg = await navigator.serviceWorker.getRegistration(swUrl);
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
