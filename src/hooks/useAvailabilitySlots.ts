import { useState, useEffect, useCallback } from "react";

const isProd = import.meta.env.PROD;
const defaultApiUrl = isProd ? 'https://experium2-production.up.railway.app' : 'http://localhost:3001';
const API_BASE = import.meta.env.VITE_API_URL ?? defaultApiUrl;

export interface AvailabilitySlot {
  id: string;
  experience_id: string;
  slot_date: string;
  start_time: string;
  end_time: string;
  capacity: number;
  booked_count: number;
  available_spots: number;
  is_locked: boolean;
  // Legacy compat fields
  max_participants: number;
  booked_participants: number;
  is_available: boolean;
  locked_by: string | null;
  locked_until: string | null;
  slot_type: string;
}

export function useAvailabilitySlots(experienceId: string) {
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  const fetchSlots = useCallback(async () => {
    if (!experienceId) return;
    setLoading(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const res = await fetch(
        `${API_BASE}/availability/${experienceId}?from=${today}`
      );
      if (!res.ok) throw new Error("Failed to fetch slots");
      const data: any[] = await res.json();

      // Normalise to legacy shape so SlotPicker doesn't break
      const normalised: AvailabilitySlot[] = data.map((s) => ({
        ...s,
        max_participants: s.capacity,
        booked_participants: s.booked_count,
        is_available: !s.is_locked && s.available_spots > 0,
        locked_by: null,
        locked_until: null,
        slot_type: "regular",
      }));

      setSlots(normalised);
    } catch (err) {
      console.error("[useAvailabilitySlots]", err);
    } finally {
      setLoading(false);
    }
  }, [experienceId]);

  useEffect(() => {
    fetchSlots();
    // Poll every 30 seconds to refresh availability (replaces Supabase realtime)
    const interval = setInterval(fetchSlots, 30_000);
    return () => clearInterval(interval);
  }, [fetchSlots]);

  const availableDates = Array.from(new Set(slots.map((s) => s.slot_date)));

  const slotsForDate = selectedDate
    ? slots.filter((s) => s.slot_date === selectedDate.toISOString().split("T")[0])
    : [];

  return { slots, loading, availableDates, selectedDate, setSelectedDate, slotsForDate, refetch: fetchSlots };
}
