import { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Users, Lock, Loader2, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { useAvailabilitySlots, AvailabilitySlot } from "@/hooks/useAvailabilitySlots";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { ro } from "date-fns/locale";

interface SlotPickerProps {
  experienceId: string;
  participants: number;
  onSlotSelected: (slot: AvailabilitySlot | null) => void;
}

export function SlotPicker({ experienceId, participants, onSlotSelected }: SlotPickerProps) {
  const { toast } = useToast();
  const { loading, availableDates, selectedDate, setSelectedDate, slotsForDate } =
    useAvailabilitySlots(experienceId);
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);
  const [locking, setLocking] = useState(false);

  // 48-hour rule: bookings must be at least 48h before the slot
  const minBookingDate = new Date(Date.now() + 48 * 3600 * 1000);

  // Unlock previous slot when selecting a new one or unmounting
  useEffect(() => {
    return () => {
      if (selectedSlot) {
        api.availability.unlockSlot(selectedSlot.id).catch(() => {});
      }
    };
  }, [selectedSlot]);

  const handleSlotClick = async (slot: AvailabilitySlot) => {
    const remaining = slot.max_participants - slot.booked_participants;
    if (participants > remaining) {
      toast({
        title: "Locuri insuficiente",
        description: `Doar ${remaining} locuri disponibile pentru acest slot.`,
        variant: "destructive",
      });
      return;
    }

    // Unlock previous slot
    if (selectedSlot && selectedSlot.id !== slot.id) {
      await api.availability.unlockSlot(selectedSlot.id).catch(() => {});
    }

    setLocking(true);

    try {
      const data = await api.availability.lockSlot(slot.id);

      if (!data || !data[0]?.success) {
        const msg = data?.[0]?.error_message || "Nu s-a putut rezerva slotul.";
        toast({ title: "Slot indisponibil", description: msg, variant: "destructive" });
        setSelectedSlot(null);
        onSlotSelected(null);
        return;
      }

      setSelectedSlot(slot);
      onSlotSelected(slot);
      toast({ title: "Slot blocat", description: "Ai 5 minute pentru a finaliza rezervarea." });
    } catch (error: any) {
      toast({ title: "Slot indisponibil", description: error.message || "Nu s-a putut rezerva slotul.", variant: "destructive" });
      setSelectedSlot(null);
      onSlotSelected(null);
    } finally {
      setLocking(false);
    }
  };

  // Dates that have available slots
  const enabledDates = availableDates.map((d) => new Date(d + "T00:00:00"));

  const isDateAvailable = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return availableDates.includes(dateStr) && date >= minBookingDate;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-primary mr-2" />
        <span className="text-sm text-muted-foreground">Se încarcă disponibilitatea...</span>
      </div>
    );
  }

  if (availableDates.length === 0) {
    return (
      <div className="text-center py-6 bg-muted/30 rounded-xl">
        <Clock className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">
          Nu există sloturi disponibile momentan.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Calendar */}
      {/* Calendar Dropdown */}
      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
          <Clock className="w-4 h-4 text-primary" />
          Alege data
        </label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className={cn(
                "w-full justify-start text-left font-normal h-12 rounded-xl",
                !selectedDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {selectedDate ? format(selectedDate, "PPP", { locale: ro }) : <span>Selectează o dată</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => {
                setSelectedDate(date || undefined);
                setSelectedSlot(null);
                onSlotSelected(null);
              }}
              disabled={(date) => !isDateAvailable(date) || date < minBookingDate}
              locale={ro}
              initialFocus
              className="rounded-xl border shadow-sm"
            />
          </PopoverContent>
        </Popover>
        <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          Rezervările se fac cu cel puțin 48 de ore înainte.
        </p>
      </div>

      {/* Time slots or daily block */}
      {selectedDate && slotsForDate.length > 0 && (() => {
        const isDailyMode = slotsForDate.some(s => s.slot_type === 'daily');

        if (isDailyMode) {
          // Daily mode: one "whole day" card per slot (usually just one)
          return (
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block flex items-center gap-2">
                Disponibilitate pentru ziua selectată
              </label>
              <div className="space-y-2">
                {slotsForDate.map((slot) => {
                  const remaining = slot.max_participants - slot.booked_participants;
                  const isSelected = selectedSlot?.id === slot.id;
                  const isLockedByOther = slot.is_locked && slot.locked_until && new Date(slot.locked_until) > new Date();

                  return (
                    <button
                      key={slot.id}
                      type="button"
                      disabled={isLockedByOther || locking || remaining < participants}
                      onClick={() => handleSlotClick(slot)}
                      className={cn(
                        "w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all text-sm",
                        isSelected
                          ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                          : "border-border hover:border-primary/50 bg-card",
                        (isLockedByOther || remaining < participants) && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <div className="flex flex-col items-start gap-0.5">
                        <span className="font-semibold text-foreground text-base">🗓 Toată ziua</span>
                        <span className="text-xs text-muted-foreground">
                          {slot.start_time.slice(0, 5)} – {slot.end_time.slice(0, 5)}
                        </span>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Users className="w-3 h-3" />
                          {remaining} locuri disponibile
                        </span>
                        {isSelected && (
                          <Badge variant="default" className="text-xs">Selectat</Badge>
                        )}
                        {isLockedByOther && (
                          <Lock className="w-3 h-3 text-muted-foreground" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        }

        // Hourly mode: original grid of time buttons
        return (
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Sloturi disponibile
            </label>
            <div className="grid grid-cols-2 gap-2">
              {slotsForDate.map((slot) => {
                const remaining = slot.max_participants - slot.booked_participants;
                const isSelected = selectedSlot?.id === slot.id;
                const isLockedByOther =
                  slot.is_locked &&
                  slot.locked_until &&
                  new Date(slot.locked_until) > new Date();

                return (
                  <button
                    key={slot.id}
                    type="button"
                    disabled={isLockedByOther || locking || remaining < participants}
                    onClick={() => handleSlotClick(slot)}
                    className={cn(
                      "relative flex flex-col items-center p-3 rounded-xl border-2 transition-all text-sm",
                      isSelected
                        ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                        : "border-border hover:border-primary/50 bg-card",
                      (isLockedByOther || remaining < participants) &&
                        "opacity-50 cursor-not-allowed"
                    )}
                  >
                    {isLockedByOther && (
                      <Lock className="w-3 h-3 absolute top-1.5 right-1.5 text-muted-foreground" />
                    )}
                    <span className="font-semibold text-foreground">
                      {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                      <Users className="w-3 h-3" />
                      {remaining} locuri
                    </span>
                    {isSelected && (
                      <Badge variant="default" className="mt-1.5 text-xs">
                        Selectat
                      </Badge>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })()}


      {selectedDate && slotsForDate.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-3">
          Nu există sloturi pentru data selectată.
        </p>
      )}

      {locking && (
        <div className="flex items-center justify-center gap-2 text-sm text-primary">
          <Loader2 className="w-4 h-4 animate-spin" />
          Se blochează slotul...
        </div>
      )}
    </div>
  );
}
