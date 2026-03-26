import { useEffect, useState } from 'react';
import { tokenStore } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

export interface ProviderNotification {
  id: string;
  provider_user_id: string;
  title: string;
  message: string;
  type: string;
  reference_id: string | null;
  is_read: boolean;
  created_at: string;
}

/**
 * useProviderNotifications — replaced supabase realtime subscription.
 * Polls /notifications every 30s (no Supabase realtime in custom backend).
 */
export function useProviderNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<ProviderNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    if (!user) return;
    const token = tokenStore.get();
    try {
      const res = await fetch(`${API_BASE}/notifications`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) return;
      const data: ProviderNotification[] = await res.json();
      setNotifications(data);
      setUnreadCount(data.filter((n) => !n.is_read).length);
    } catch {
      // silent — notifications are non-critical
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    const token = tokenStore.get();
    await fetch(`${API_BASE}/notifications/${id}/read`, {
      method: 'PUT',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const markAllAsRead = async () => {
    if (!user) return;
    const token = tokenStore.get();
    await fetch(`${API_BASE}/notifications/read-all`, {
      method: 'PUT',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  useEffect(() => {
    fetchNotifications();
    // Poll every 30 seconds (replaces Supabase realtime)
    const interval = setInterval(fetchNotifications, 30_000);
    return () => clearInterval(interval);
  }, [user]);

  return { notifications, unreadCount, loading, markAsRead, markAllAsRead, refetch: fetchNotifications };
}
