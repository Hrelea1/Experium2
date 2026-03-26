import { useState } from 'react';
import { tokenStore } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

interface CheckoutItem {
  experienceId: string;
  slotId: string;
  participants: number;
  totalPrice: number;
  title: string;
}

/**
 * useCheckout — replaced supabase.functions.invoke('create-checkout')
 * Now calls POST /bookings for each item and optionally redirects to payment.
 */
export function useCheckout() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const processCheckout = async (items: CheckoutItem[]): Promise<boolean> => {
    if (!user) {
      toast({ title: 'Eroare', description: 'Trebuie să fii autentificat pentru a finaliza plata', variant: 'destructive' });
      return false;
    }

    setIsProcessing(true);
    try {
      const token = tokenStore.get();
      // Create a booking for each cart item
      const results = await Promise.allSettled(
        items.map((item) =>
          fetch(`${API_BASE}/bookings`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
              experience_id: item.experienceId,
              booking_date: new Date().toISOString(),
              participants: item.participants,
              total_price: item.totalPrice,
              payment_method: 'card',
            }),
          }).then((r) => (r.ok ? r.json() : Promise.reject(r)))
        )
      );

      const failed = results.filter((r) => r.status === 'rejected');
      if (failed.length > 0) {
        throw new Error(`${failed.length} rezerv(e) au eșuat`);
      }

      toast({ title: 'Rezervare confirmată!', description: `${items.length} rezervare(i) create cu succes.` });
      return true;
    } catch (error: any) {
      console.error('Checkout error:', error);
      toast({
        title: 'Eroare la procesarea rezervării',
        description: error.message || 'Te rugăm să încerci din nou',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  return { processCheckout, isProcessing };
}
