import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

/**
 * usePushSubscription Hook
 * 
 * NOTE: Push notification backend migration is pending.
 * Supabase dependencies have been removed.
 */
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
      const reg = await navigator.serviceWorker.getRegistration('/sw-push.js');
      if (reg) {
        const sub = await (reg as any).pushManager?.getSubscription();
        setIsSubscribed(!!sub);
      }
    } catch {
      // silent
    }
  };

  const subscribe = async () => {
    if (!user || !isSupported) return false;

    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') return false;

      // TODO: Implement backend VAPID key and subscription storage
      console.warn('Push notification backend migration is pending. Implementation required.');
      return false;
    } catch (err) {
      console.error('Push subscription failed', err);
      return false;
    }
  };

  const unsubscribe = async () => {
    try {
      const reg = await navigator.serviceWorker.getRegistration('/sw-push.js');
      if (reg) {
        const sub = await (reg as any).pushManager?.getSubscription();
        if (sub) {
          await sub.unsubscribe();
          // TODO: Remove from backend
        }
      }
      setIsSubscribed(false);
    } catch (err) {
      console.error('Unsubscribe failed', err);
    }
  };

  return { isSubscribed, isSupported, permission, subscribe, unsubscribe };
}
