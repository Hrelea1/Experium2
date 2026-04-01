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
      
      const res = await fetch(`${API_BASE}/checkout/create-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          items,
          success_url: `${window.location.origin}/#/payment-success`,
          cancel_url: `${window.location.origin}/#/cart`,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'A apărut o eroare la crearea sesiunii Stripe.');
      }

      const { url } = await res.json();
      
      // Redirect to Stripe Checkout
      if (url) {
        window.location.href = url;
      }
      
      return true; // We don't actually get here visibly since the page changes
    } catch (error: any) {
      console.error('Checkout error:', error);
      toast({
        title: 'Eroare la procesarea plății',
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
