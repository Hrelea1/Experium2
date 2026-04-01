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
  selectedTiers?: { name: string; price: number; quantity: number }[];
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
  const [items, setItems] = useState<CartItem[]>(() => loadLocal());
  const [isLoading, setIsLoading] = useState(false);
  const isFirstRender = useRef(true);

  // ── Save cart on changes ───────────────────────────────────────────────────
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    saveLocal(items);
  }, [items]);

  // ── addItem ─────────────────────────────────────────────────────────────────
  const addItem = async (item: CartItem): Promise<boolean> => {
    setItems((curr) => {
      // Prevent exact duplicates (same experience, same slot, etc. - id is unique per "add" action)
      const filtered = curr.filter((i) => i.id !== item.id);
      return [...filtered, item];
    });
    return true;
  };

  // ── removeItem ──────────────────────────────────────────────────────────────
  const removeItem = async (id: string) => {
    setItems((curr) => curr.filter((i) => i.id !== id));
  };

  // ── clearCart ───────────────────────────────────────────────────────────────
  const clearCart = async () => {
    setItems([]);
  };

  const totalItems = items.length;
  const subtotal = items.reduce((sum, item) => {
    let base = 0;
    if (item.selectedTiers && item.selectedTiers.length > 0) {
      base = item.selectedTiers.reduce((s, tier) => s + tier.price * tier.quantity, 0);
    } else {
      base = item.price * item.participants;
    }
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
