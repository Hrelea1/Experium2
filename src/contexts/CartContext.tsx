import { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
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
  id: string;           // DB UUID (or temp local key for guests)
  experienceId: string;
  title: string;
  location: string;
  price: number;
  originalPrice?: number;
  image: string;
  participants: number;
  slotId: string;
  slotDate: string;
  startTime: string;
  endTime: string;
  maxParticipants: number;
  services: CartItemService[];
  addedAt: number;      // ms timestamp for slot lock expiry tracking
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: CartItem) => Promise<boolean>;
  removeItem: (id: string) => void;
  clearCart: () => void;
  totalItems: number;
  subtotal: number;
  isLoading: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = "experium_cart";

// ── helpers ──────────────────────────────────────────────────────────────────

function saveLocal(items: CartItem[]) {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  } catch {}
}

function loadLocal(): CartItem[] {
  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

// ── Provider ─────────────────────────────────────────────────────────────────

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const hasLoadedRef = useRef(false);

  // ── Load cart ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) {
      // Unauthenticated: use localStorage only
      setItems(loadLocal());
      hasLoadedRef.current = false;
      return;
    }

    // Authenticated: load from DB (and merge any guest items first)
    const loadFromDb = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("cart_items")
          .select(`
            id,
            experience_id,
            slot_id,
            participants,
            services,
            added_at,
            experiences (
              title,
              location_name,
              price,
              original_price,
              experience_images (image_url, is_primary)
            ),
            availability_slots (
              slot_date,
              start_time,
              end_time,
              max_participants
            )
          `)
          .eq("user_id", user.id);

        if (error) throw error;

        const dbItems: CartItem[] = (data || []).map((row: any) => {
          const exp = row.experiences;
          const slot = row.availability_slots;
          const images: { image_url: string; is_primary: boolean }[] =
            exp?.experience_images || [];
          const primary =
            images.find((i) => i.is_primary) || images[0];

          return {
            id: row.id,
            experienceId: row.experience_id,
            title: exp?.title || "",
            location: exp?.location_name || "",
            price: exp?.price ?? 0,
            originalPrice: exp?.original_price ?? undefined,
            image:
              primary?.image_url ||
              "https://images.unsplash.com/photo-1507608616759-54f48f0af0ee?w=600&h=400&fit=crop",
            participants: row.participants,
            slotId: row.slot_id,
            slotDate: slot?.slot_date || "",
            startTime: slot?.start_time || "",
            endTime: slot?.end_time || "",
            maxParticipants: slot?.max_participants ?? 0,
            services: (row.services as CartItemService[]) || [],
            addedAt: new Date(row.added_at).getTime(),
          };
        });

        // Merge guest items that aren't already in DB
        const guestItems = loadLocal().filter(
          (g) => !dbItems.some((db) => db.slotId === g.slotId)
        );

        const merged = [...dbItems, ...guestItems];
        setItems(merged);
        saveLocal(merged);
      } catch (err) {
        console.error("Error loading cart from DB:", err);
        // Fallback to localStorage
        setItems(loadLocal());
      } finally {
        setIsLoading(false);
        hasLoadedRef.current = true;
      }
    };

    loadFromDb();
  }, [user]);

  // Persist to localStorage whenever items change
  useEffect(() => {
    saveLocal(items);
  }, [items]);

  // ── addItem ───────────────────────────────────────────────────────────────
  const addItem = async (item: CartItem): Promise<boolean> => {
    // For authenticated users: lock slot + persist to DB
    if (user) {
      // 1. Atomically lock the slot
      const { data: lockData, error: lockError } = await supabase.rpc(
        "lock_availability_slot",
        { p_slot_id: item.slotId, p_user_id: user.id }
      );

      if (lockError) {
        toast({
          title: "Slot indisponibil",
          description: lockError.message,
          variant: "destructive",
        });
        return false;
      }

      const lockResult = Array.isArray(lockData) ? lockData[0] : lockData;
      if (!lockResult?.success) {
        toast({
          title: "Slot indisponibil",
          description: lockResult?.error_message || "Slotul nu mai este disponibil.",
          variant: "destructive",
        });
        return false;
      }

      // 2. Upsert into cart_items and read back the UUID
      const { data: upserted, error: upsertError } = await supabase
        .from("cart_items")
        .upsert(
          {
            user_id: user.id,
            experience_id: item.experienceId,
            slot_id: item.slotId,
            participants: item.participants,
            services: item.services as any,
            added_at: new Date(item.addedAt).toISOString(),
          },
          { onConflict: "user_id,slot_id" }
        )
        .select("id")
        .single();

      if (upsertError) {
        // Unlock the slot we just locked since save failed
        supabase.rpc("unlock_availability_slot", {
          p_slot_id: item.slotId,
          p_user_id: user.id,
        });
        toast({
          title: "Eroare la adăugarea în coș",
          description: upsertError.message,
          variant: "destructive",
        });
        return false;
      }

      // Use DB-assigned UUID so removeItem works correctly
      const dbId = upserted?.id ?? item.id;
      const finalItem: CartItem = { ...item, id: dbId };

      setItems((curr) => {
        const filtered = curr.filter((i) => i.slotId !== item.slotId);
        return [...filtered, finalItem];
      });
      return true;
    }

    // Guest (not logged in): localStorage only, no slot lock
    setItems((curr) => {
      const filtered = curr.filter((i) => i.slotId !== item.slotId);
      return [...filtered, item];
    });
    return true;
  };

  // ── removeItem ────────────────────────────────────────────────────────────
  const removeItem = async (id: string) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;

    // Unlock slot (fire-and-forget)
    if (user) {
      supabase
        .rpc("unlock_availability_slot", {
          p_slot_id: item.slotId,
          p_user_id: user.id,
        })
        .then(() => {});

      // Delete by primary key (UUID)
      const { error } = await supabase
        .from("cart_items")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) {
        console.error("Error removing cart item from DB:", error);
      }
    }

    setItems((curr) => curr.filter((i) => i.id !== id));
  };

  // ── clearCart ─────────────────────────────────────────────────────────────
  const clearCart = async () => {
    if (user) {
      // Unlock all slots
      items.forEach((item) => {
        supabase
          .rpc("unlock_availability_slot", {
            p_slot_id: item.slotId,
            p_user_id: user.id,
          })
          .then(() => {});
      });

      await supabase
        .from("cart_items")
        .delete()
        .eq("user_id", user.id);
    }

    setItems([]);
  };

  // ── totals ────────────────────────────────────────────────────────────────
  const totalItems = items.length;
  const subtotal = items.reduce((sum, item) => {
    const base = item.price * item.participants;
    const extras = item.services.reduce(
      (s, svc) => s + svc.price * svc.quantity,
      0
    );
    return sum + base + extras;
  }, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        clearCart,
        totalItems,
        subtotal,
        isLoading,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
