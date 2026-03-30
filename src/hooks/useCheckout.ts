import { useState } from 'react';
import { tokenStore } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

const isProd = import.meta.env.PROD;
const defaultApiUrl = isProd ? 'https://experium2-production.up.railway.app' : 'http://localhost:3001';
const API_BASE = import.meta.env.VITE_API_URL ?? defaultApiUrl;

interface CheckoutItem {
  experienceId: string;
  slotId: string;
  slotDate: string;
  startTime: string;
  participants: number;
  totalPrice: number;
  title: string;
  participantDetails: any[];
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
        items.map((item) => {
          // Send booking_date as the slot date + time
          const bookingDate = `${item.slotDate}T${item.startTime}`;
          
          return fetch(`${API_BASE}/bookings`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
              experience_id: item.experienceId,
              booking_date: bookingDate,
              participants: item.participants,
              total_price: item.totalPrice,
              participant_details: item.participantDetails,
              payment_method: 'card',
            }),
          }).then((r) => (r.ok ? r.json() : Promise.reject(r)));
        })
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
