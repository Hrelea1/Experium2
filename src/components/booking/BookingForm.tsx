import { useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { Users, ShoppingBag, CalendarCheck, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCart, CartItem } from "@/contexts/CartContext";
import { useTranslation } from "react-i18next";
import { ServiceSelector, SelectedService } from "./ServiceSelector";
import { SlotPicker } from "./SlotPicker";
import { AvailabilitySlot } from "@/hooks/useAvailabilitySlots";

interface BookingFormProps {
  experience: {
    id: string;
    title: string;
    location: string;
    price: number;
    originalPrice?: number;
    maxParticipants: number;
    image?: string;
  };
}

export function BookingForm({ experience }: BookingFormProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addItem, items } = useCart();
  const { t } = useTranslation();
  const [participants, setParticipants] = useState(1);
  const selectedServicesRef = useRef<SelectedService[]>([]);
  const [servicesTotal, setServicesTotal] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);
  const [addedToCart, setAddedToCart] = useState(false);

  const totalPrice = (experience.price * participants) + servicesTotal;
  const savings = experience.originalPrice 
    ? (experience.originalPrice - experience.price) * participants 
    : 0;

  // Check if this experience already has an item in cart
  const alreadyInCart = items.some(i => i.experienceId === experience.id);

  const handleServicesChange = useCallback((services: SelectedService[]) => {
    selectedServicesRef.current = services;
    const total = services.reduce((sum, s) => sum + s.price * s.quantity, 0);
    setServicesTotal(total);
  }, []);

  const handleSlotSelected = useCallback((slot: AvailabilitySlot | null) => {
    setSelectedSlot(slot);
    setAddedToCart(false);
  }, []);

  const handleAddToCart = async () => {
    if (!user) {
      toast({ title: "Autentificare necesară", description: "Trebuie să fii autentificat.", variant: "destructive" });
      navigate("/auth");
      return;
    }
    if (!selectedSlot) {
      toast({ title: "Selectează un slot", description: "Alege o dată și un interval orar.", variant: "destructive" });
      return;
    }

    const cartItem: CartItem = {
      id: `${experience.id}-${Date.now()}`,
      experienceId: experience.id,
      title: experience.title,
      location: experience.location,
      price: experience.price,
      originalPrice: experience.originalPrice,
      image: experience.image || '/placeholder.svg',
      participants,
      slotId: selectedSlot.id,
      slotDate: selectedSlot.slot_date,
      startTime: selectedSlot.start_time,
      endTime: selectedSlot.end_time,
      maxParticipants: selectedSlot.max_participants || experience.maxParticipants,
      services: selectedServicesRef.current.map(s => ({
        serviceId: s.serviceId,
        name: s.name,
        price: s.price,
        quantity: s.quantity,
      })),
      addedAt: Date.now(),
    };

    const success = await addItem(cartItem);
    if (success) {
      setAddedToCart(true);
      toast({
        title: "Adăugat în coș! 🛒",
        description: `${experience.title} a fost adăugat în coșul tău.`,
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-card rounded-2xl shadow-xl border border-border/50 overflow-hidden"
    >
      {/* Price Header */}
      <div className="bg-gradient-to-r from-primary to-coral-dark p-6 text-primary-foreground">
        <div className="flex items-baseline gap-3">
          <span className="text-3xl font-bold">{experience.price} {t('common.lei')}</span>
          {experience.originalPrice && (
            <span className="text-primary-foreground/70 line-through text-lg">
              {experience.originalPrice} {t('common.lei')}
            </span>
          )}
          <span className="text-primary-foreground/80">/ {t('booking.perPerson')}</span>
        </div>
        {savings > 0 && (
          <p className="text-primary-foreground/90 text-sm mt-1">
            {t('booking.savings', { amount: savings })}
          </p>
        )}
      </div>

      {/* Form */}
      <div className="p-6 space-y-5">
        {/* Participants */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
            <Users className="w-4 h-4 text-primary" />
            {t('booking.participants')}
          </label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setParticipants(Math.max(1, participants - 1))}
              className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-foreground hover:bg-muted/80 transition-colors text-xl font-medium"
            >
              −
            </button>
            <span className="w-12 text-center text-lg font-semibold text-foreground">
              {participants}
            </span>
            <button
              type="button"
              onClick={() => setParticipants(Math.min(experience.maxParticipants, participants + 1))}
              className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-foreground hover:bg-muted/80 transition-colors text-xl font-medium"
            >
              +
            </button>
            <span className="text-sm text-muted-foreground ml-2">
              ({t('booking.max')} {experience.maxParticipants})
            </span>
          </div>
        </div>

        {/* Slot Picker */}
        <SlotPicker
          experienceId={experience.id}
          participants={participants}
          onSlotSelected={handleSlotSelected}
        />

        {/* Service Selector */}
        <ServiceSelector
          experienceId={experience.id}
          onServicesChange={handleServicesChange}
        />

        {/* VAT info */}
        <div className="bg-muted/50 rounded-xl p-4">
          <p className="text-sm text-muted-foreground">
            {t('booking.priceIncludesVat')}
          </p>
        </div>

        {/* Total */}
        <div className="border-t border-border pt-4">
          <div className="flex justify-between items-center mb-4">
            <span className="text-muted-foreground">{t('cart.total')}</span>
            <span className="text-2xl font-bold text-foreground">{totalPrice} {t('common.lei')}</span>
          </div>
        </div>

        {/* Add to Cart / Go to Cart Buttons */}
        {addedToCart ? (
          <div className="space-y-3">
            <Button
              type="button"
              size="xl"
              variant="outline"
              className="w-full"
              onClick={() => navigate("/cart")}
            >
              <ShoppingBag className="w-5 h-5 mr-2" />
              Vezi coșul și finalizează comanda
            </Button>
            <p className="text-center text-sm text-primary font-medium flex items-center justify-center gap-1">
              <Check className="w-4 h-4" /> Adăugat în coș
            </p>
          </div>
        ) : (
          <Button
            type="button"
            size="xl"
            className="w-full"
            onClick={handleAddToCart}
            disabled={!selectedSlot}
          >
            {selectedSlot ? (
              <>
                <ShoppingBag className="w-5 h-5 mr-2" />
                Adaugă în coș
              </>
            ) : (
              <>
                <CalendarCheck className="w-5 h-5 mr-2" />
                Selectează data pentru a continua
              </>
            )}
          </Button>
        )}

        {/* Security Note */}
        <p className="text-center text-xs text-muted-foreground">
          🔒 {t('booking.securityNote')}
        </p>
      </div>
    </motion.div>
  );
}
