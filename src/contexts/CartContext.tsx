import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface CartItemService {
  serviceId: string;
  name: string;
  price: number;
  quantity: number;
}

export interface CartItem {
  id: string; // unique cart item id (timestamp-based)
  experienceId: string;
  title: string;
  location: string;
  price: number; // per participant
  originalPrice?: number;
  image: string;
  participants: number;
  slotId: string;
  slotDate: string;
  startTime: string;
  endTime: string;
  maxParticipants: number;
  services: CartItemService[];
  addedAt: number; // timestamp for slot lock expiry tracking
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  totalItems: number;
  subtotal: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'experium_cart';

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [items, setItems] = useState<CartItem[]>(() => {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  });

  // Load from DB if user is logged in
  useEffect(() => {
    if (!user) return;
    
    const loadCartFromDb = async () => {
      try {
        const { data, error } = await supabase
          .from('cart_items')
          .select(`
            id, participants, services, added_at,
            experience_id, 
            slot_id,
            experiences (title, location_name, price, original_price),
            availability_slots (slot_date, start_time, end_time, max_participants),
            experience_images (image_url)
          `)
          .eq('user_id', user.id);
          
        if (error) throw error;
        
        if (data) {
          const dbItems: CartItem[] = data.map(item => {
            // Find primary image if it exists in the fetched nested array
            const imageUrl = item.experience_images?.[0]?.image_url || '';
            const services = (item.services as unknown as CartItemService[]) || [];
            
            return {
              id: item.id,
              experienceId: item.experience_id,
              title: item.experiences?.title || '',
              location: item.experiences?.location_name || '',
              price: item.experiences?.price || 0,
              originalPrice: item.experiences?.original_price || undefined,
              image: imageUrl,
              participants: item.participants,
              slotId: item.slot_id,
              slotDate: item.availability_slots?.slot_date || '',
              startTime: item.availability_slots?.start_time || '',
              endTime: item.availability_slots?.end_time || '',
              maxParticipants: item.availability_slots?.max_participants || 0,
              services: services,
              addedAt: new Date(item.added_at).getTime(),
            };
          });
          
          setItems(dbItems);
        }
      } catch (err) {
        console.error("Error loading cart from DB:", err);
      }
    };
    
    loadCartFromDb();
  }, [user]);

  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = async (item: CartItem) => {
    if (user) {
      try {
        const { error } = await supabase.from('cart_items').upsert({
          user_id: user.id,
          experience_id: item.experienceId,
          slot_id: item.slotId,
          participants: item.participants,
          services: item.services,
        }, { onConflict: 'user_id, slot_id' });
        
        if (error) throw error;
      } catch (err: any) {
        console.error("Error adding to DB cart:", err);
        toast({ title: "Eroare la adăugarea în coș", description: err.message, variant: "destructive" });
        return; // Don't update local state if DB fails
      }
    }
    
    setItems(current => {
      // Remove existing item for same slot to prevent duplicates
      const filtered = current.filter(i => i.slotId !== item.slotId);
      return [...filtered, item];
    });
  };

  const removeItem = async (id: string) => {
    const item = items.find(i => i.id === id);
    if (item) {
      // Try to unlock the slot (fire and forget)
      supabase.rpc('unlock_availability_slot', {
        p_slot_id: item.slotId,
        p_user_id: user?.id || '',
      }).then(() => {});
      
      if (user) {
        try {
          // If strictly using UUIDs from DB, match by ID. 
          // If ID is timestamp-generated text from local fallback, delete by slot_id.
          const { error } = await supabase
            .from('cart_items')
            .delete()
            .eq('user_id', user.id)
            .eq('slot_id', item.slotId);
            
          if (error) throw error;
        } catch (err) {
          console.error("Error removing from DB cart:", err);
        }
      }
    }
    setItems(current => current.filter(i => i.id !== id));
  };

  const clearCart = async () => {
    // Unlock all slots
    items.forEach(item => {
      if (user) {
        supabase.rpc('unlock_availability_slot', {
          p_slot_id: item.slotId,
          p_user_id: user.id,
        }).then(() => {});
      }
    });
    
    if (user) {
      try {
        await supabase.from('cart_items').delete().eq('user_id', user.id);
      } catch (err) {
        console.error("Error clearing DB cart:", err);
      }
    }
    
    setItems([]);
  };

  const totalItems = items.length;
  const subtotal = items.reduce((sum, item) => {
    const itemPrice = item.price * item.participants;
    const servicesPrice = item.services.reduce((s, svc) => s + svc.price * svc.quantity, 0);
    return sum + itemPrice + servicesPrice;
  }, 0);

  return (
    <CartContext.Provider value={{
      items,
      addItem,
      removeItem,
      clearCart,
      totalItems,
      subtotal,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
