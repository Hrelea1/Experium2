import { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
import { tokenStore } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const isProd = import.meta.env.PROD;
const defaultApiUrl = isProd ? 'https://experium2-production.up.railway.app' : 'http://localhost:3001';
const API_BASE = import.meta.env.VITE_API_URL ?? defaultApiUrl;

async function apiRequest(path: string, options: RequestInit = {}) {
  const token = tokenStore.get();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers as Record<string, string>),
    },
  });
  return res.ok ? res.json() : Promise.reject(await res.json());
}

export interface CartItemService {
  serviceId: string;
  name: string;
  price: number;
  quantity: number;
}

export interface CartItem {
  id: string;
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
  addedAt: number;
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

function saveLocal(items: CartItem[]) {
  try { localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items)); } catch {}
}
function loadLocal(): CartItem[] {
  try {
    const s = localStorage.getItem(CART_STORAGE_KEY);
    return s ? JSON.parse(s) : [];
  } catch { return []; }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const hasLoadedRef = useRef(false);

  // ── Load cart ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) {
      setItems(loadLocal());
      hasLoadedRef.current = false;
      return;
    }

    const loadFromDb = async () => {
      setIsLoading(true);
      try {
        const data: any[] = await apiRequest("/cart");

        const dbItems: CartItem[] = data.map((row) => ({
          id: row.id,
          experienceId: row.experience_id,
          title: row.title ?? "",
          location: row.location_name ?? "",
          price: row.price ?? 0,
          originalPrice: row.original_price ?? undefined,
          image: row.image ?? "https://images.unsplash.com/photo-1507608616759-54f48f0af0ee?w=600&h=400&fit=crop",
          participants: row.quantity ?? 1,
          slotId: row.id,     // simple cart — no slot lock in custom backend
          slotDate: "",
          startTime: "",
          endTime: "",
          maxParticipants: row.max_participants ?? 10,
          services: [],
          addedAt: new Date(row.added_at).getTime(),
        }));

        const guestItems = loadLocal().filter(
          (g) => !dbItems.some((db) => db.experienceId === g.experienceId)
        );
        const merged = [...dbItems, ...guestItems];
        setItems(merged);
        saveLocal(merged);
      } catch (err) {
        console.error("Error loading cart from DB:", err);
        setItems(loadLocal());
      } finally {
        setIsLoading(false);
        hasLoadedRef.current = true;
      }
    };

    loadFromDb();
  }, [user]);

  useEffect(() => { saveLocal(items); }, [items]);

  // ── addItem ─────────────────────────────────────────────────────────────────
  const addItem = async (item: CartItem): Promise<boolean> => {
    if (user) {
      try {
        await apiRequest("/cart", {
          method: "POST",
          body: JSON.stringify({ experience_id: item.experienceId, quantity: item.participants }),
        });
      } catch (err: any) {
        toast({ title: "Eroare la adăugarea în coș", description: err?.error ?? err?.message, variant: "destructive" });
        return false;
      }
    }

    setItems((curr) => {
      const filtered = curr.filter((i) => i.experienceId !== item.experienceId);
      return [...filtered, item];
    });
    return true;
  };

  // ── removeItem ──────────────────────────────────────────────────────────────
  const removeItem = async (id: string) => {
    if (user) {
      apiRequest(`/cart/${id}`, { method: "DELETE" }).catch(console.error);
    }
    setItems((curr) => curr.filter((i) => i.id !== id));
  };

  // ── clearCart ───────────────────────────────────────────────────────────────
  const clearCart = async () => {
    if (user) {
      apiRequest("/cart", { method: "DELETE" }).catch(console.error);
    }
    setItems([]);
  };

  const totalItems = items.length;
  const subtotal = items.reduce((sum, item) => {
    const base = item.price * item.participants;
    const extras = item.services.reduce((s, svc) => s + svc.price * svc.quantity, 0);
    return sum + base + extras;
  }, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, clearCart, totalItems, subtotal, isLoading }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within a CartProvider");
  return context;
}
