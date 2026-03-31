import { useState, useCallback, useRef, useEffect } from "react";
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
import { AvailabilityInfoModal } from "./AvailabilityInfoModal";
import { api } from "@/lib/api";

interface BookingFormProps {
  experience: {
    id: string;
    title: string;
    location: string;
    price: number;
    originalPrice?: number;
    child_price?: number;
    maxParticipants: number;
    image?: string;
    isAssisted?: boolean;
    pricingTiers?: {name: string, price: number}[];
    services?: any[];
  };
}

export function BookingForm({ experience }: BookingFormProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addItem, items } = useCart();
  const { t } = useTranslation();
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const selectedServicesRef = useRef<SelectedService[]>([]);
  const [servicesTotal, setServicesTotal] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);
  const [addedToCart, setAddedToCart] = useState(false);
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  const [checkingAvailability, setCheckingAvailability] = useState(false);

  const isAssisted = experience.isAssisted || false;
  const hasTiers = experience.pricingTiers && experience.pricingTiers.length > 0;

  const [tierQuantities, setTierQuantities] = useState<Record<number, number>>(() => {
    if (hasTiers) {
      return { 0: 1 };
    }
    return {};
  });

  const getTierQty = (idx: number) => tierQuantities[idx] || 0;
  const setTierQty = (idx: number, qty: number) => {
    setTierQuantities(prev => ({ ...prev, [idx]: qty }));
  };

  const totalParticipants = hasTiers
    ? Object.values(tierQuantities).reduce((a, b) => a + b, 0)
    : adults + children;

  const childPriceToUse = experience.child_price ?? experience.price;

  const basePrice = hasTiers
    ? Object.entries(tierQuantities).reduce((sum, [idx, qty]) => {
        return sum + (experience.pricingTiers![Number(idx)].price * qty);
      }, 0)
    : (experience.price * adults) + (childPriceToUse * children);

  const totalPrice = basePrice + servicesTotal;
  const savings = experience.originalPrice 
    ? (experience.originalPrice - experience.price) * totalParticipants 
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

  const handleInitiateCheck = async () => {
    if (!user) {
      toast({ title: "Autentificare necesară", description: "Trebuie să fii autentificat.", variant: "destructive" });
      navigate("/auth");
      return;
    }
    
    setCheckingAvailability(true);
    try {
      const selectedTiersPayload = hasTiers
        ? Object.entries(tierQuantities)
            .filter(([_, qty]) => qty > 0)
            .map(([idx, qty]) => ({
              name: experience.pricingTiers![Number(idx)].name,
              price: experience.pricingTiers![Number(idx)].price,
              quantity: qty
            }))
        : [
            { name: "Adulți", price: experience.price, quantity: adults },
            ...(children > 0 ? [{ name: "Copii", price: childPriceToUse, quantity: children }] : [])
          ];
        
      // Combine tiers and services
      const participantDetailsPayload = [...selectedTiersPayload, ...selectedServicesRef.current];

      // 1. Create a pending booking via Node API
      const { id: bookingId } = await api.bookings.create({
        experience_id: experience.id,
        booking_date: `${selectedSlot?.slot_date}T${selectedSlot?.start_time}`,
        participants: totalParticipants,
        participant_details: participantDetailsPayload,
        total_price: totalPrice,
        status: 'pending',
      });

      // 2. Call initiate availability check via Node API
      await api.availability.check(bookingId);

      toast({
        title: "Cerere trimisă! ⌛",
        description: "Vom notifica furnizorul. Vei primi un SMS în curând.",
      });
      
      setShowAvailabilityModal(false);
    } catch (error: any) {
      console.error('Error initiating check:', error);
      toast({
        title: "Eroare",
        description: error.message || "Nu am putut iniția verificarea. Te rugăm să încerci mai târziu.",
        variant: "destructive"
      });
    } finally {
      setCheckingAvailability(false);
    }
  };

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
      participants: totalParticipants,
      selectedTiers: hasTiers
        ? Object.entries(tierQuantities)
            .filter(([_, qty]) => qty > 0)
            .map(([idx, qty]) => ({
              name: experience.pricingTiers![Number(idx)].name,
              price: experience.pricingTiers![Number(idx)].price,
              quantity: qty
            }))
        : [
            { name: "Adulți", price: experience.price, quantity: adults },
            ...(children > 0 ? [{ name: "Copii", price: childPriceToUse, quantity: children }] : [])
          ],
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
          {hasTiers ? (
            <span className="text-lg font-medium opacity-90">Preț variabil per participant</span>
          ) : (
            <>
              <span className="text-3xl font-bold">{experience.price} {t('common.lei')}</span>
              {experience.originalPrice && (
                <span className="text-primary-foreground/70 line-through text-lg">
                  {experience.originalPrice} {t('common.lei')}
                </span>
              )}
              <span className="text-primary-foreground/80">/ {t('booking.perPerson')}</span>
            </>
          )}
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
          <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-4">
            <Users className="w-4 h-4 text-primary" />
            {t('booking.participants')}
          </label>
          
          {hasTiers ? (
            <div className="space-y-3">
              {experience.pricingTiers!.map((tier, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 border rounded-xl bg-card">
                  <div>
                    <h4 className="font-semibold text-sm">{tier.name}</h4>
                    <p className="text-muted-foreground text-xs">{tier.price} {t('common.lei')}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      disabled={getTierQty(idx) <= 0 || (idx === 0 && totalParticipants <= 1)} // require at least 1 global participant
                      onClick={() => setTierQty(idx, Math.max(0, getTierQty(idx) - 1))}
                      className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-foreground hover:bg-muted/80 disabled:opacity-50 transition-colors text-lg font-medium"
                    >
                      −
                    </button>
                    <span className="w-6 text-center text-base font-semibold text-foreground">
                      {getTierQty(idx)}
                    </span>
                    <button
                      type="button"
                      disabled={totalParticipants >= experience.maxParticipants}
                      onClick={() => setTierQty(idx, getTierQty(idx) + 1)}
                      className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-foreground hover:bg-muted/80 disabled:opacity-50 transition-colors text-lg font-medium"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
              <div className="text-xs text-muted-foreground text-right mr-1">
                Total: {totalParticipants} / {experience.maxParticipants} pers.
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border rounded-xl bg-card">
                <div>
                  <h4 className="font-semibold text-sm">Adulți</h4>
                  <p className="text-muted-foreground text-xs">{experience.price} {t('common.lei')}</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled={adults <= 1}
                    onClick={() => setAdults(Math.max(1, adults - 1))}
                    className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-foreground hover:bg-muted/80 disabled:opacity-50 transition-colors text-lg font-medium"
                  >
                    −
                  </button>
                  <span className="w-6 text-center text-base font-semibold text-foreground">
                    {adults}
                  </span>
                  <button
                    type="button"
                    disabled={totalParticipants >= experience.maxParticipants}
                    onClick={() => setAdults(adults + 1)}
                    className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-foreground hover:bg-muted/80 disabled:opacity-50 transition-colors text-lg font-medium"
                  >
                    +
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-xl bg-card">
                <div>
                  <h4 className="font-semibold text-sm">Copii</h4>
                  <p className="text-muted-foreground text-xs">{childPriceToUse} {t('common.lei')}</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled={children <= 0}
                    onClick={() => setChildren(Math.max(0, children - 1))}
                    className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-foreground hover:bg-muted/80 disabled:opacity-50 transition-colors text-lg font-medium"
                  >
                    −
                  </button>
                  <span className="w-6 text-center text-base font-semibold text-foreground">
                    {children}
                  </span>
                  <button
                    type="button"
                    disabled={totalParticipants >= experience.maxParticipants}
                    onClick={() => setChildren(children + 1)}
                    className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-foreground hover:bg-muted/80 disabled:opacity-50 transition-colors text-lg font-medium"
                  >
                    +
                  </button>
                </div>
              </div>
              <div className="text-xs text-muted-foreground text-right mr-1">
                Total: {totalParticipants} / {experience.maxParticipants} pers.
              </div>
            </div>
          )}
        </div>

        {/* Slot Picker */}
        <SlotPicker
          experienceId={experience.id}
          participants={totalParticipants}
          onSlotSelected={handleSlotSelected}
        />

        {/* Service Selector */}
        <ServiceSelector
          services={experience.services || []}
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
        ) : isAssisted ? (
          <Button
            type="button"
            size="xl"
            className="w-full bg-amber-600 hover:bg-amber-700"
            onClick={() => setShowAvailabilityModal(true)}
            disabled={!selectedSlot || checkingAvailability}
          >
            <CalendarCheck className="w-5 h-5 mr-2" />
            {checkingAvailability ? "Se procesează..." : "Verifică Disponibilitate"}
          </Button>
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

        <AvailabilityInfoModal 
          isOpen={showAvailabilityModal}
          onClose={() => setShowAvailabilityModal(false)}
          onConfirm={handleInitiateCheck}
          experienceTitle={experience.title}
        />

        {/* Security Note */}
        <p className="text-center text-xs text-muted-foreground">
          🔒 {t('booking.securityNote')}
        </p>
      </div>
    </motion.div>
  );
}
