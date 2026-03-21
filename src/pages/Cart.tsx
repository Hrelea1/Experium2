import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag, ArrowRight, Trash2, CalendarDays, Clock, Users, MapPin, CreditCard, AlertTriangle, Phone } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslation } from "react-i18next";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useCheckout } from "@/hooks/useCheckout";
import { BillingForm, BillingData } from "@/components/booking/BillingForm";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

export default function Cart() {
  const { t } = useTranslation();
  const { items, removeItem, subtotal, clearCart } = useCart();
  const { user } = useAuth();
  const { processCheckout, isProcessing } = useCheckout();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [billingData, setBillingData] = useState<BillingData | null>(null);

  const [showPhoneDialog, setShowPhoneDialog] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isUpdatingPhone, setIsUpdatingPhone] = useState(false);

  useEffect(() => {
    if (user) {
      const fetchProfile = async () => {
        const { data } = await supabase.from('profiles').select('phone').eq('id', user.id).single();
        if (data?.phone) {
          setPhoneNumber(data.phone);
        }
      };
      fetchProfile();
    }
  }, [user]);

  const LOCK_DURATION_MS = 5 * 60 * 1000; // 5 minutes

  const isSlotExpiring = (addedAt: number) => {
    const elapsed = Date.now() - addedAt;
    return elapsed > LOCK_DURATION_MS - 60_000; // last minute warning
  };

  const isSlotExpired = (addedAt: number) => {
    return Date.now() - addedAt > LOCK_DURATION_MS;
  };

  const handleCheckout = async () => {
    if (!user) {
      toast({ title: "Autentificare necesară", description: "Trebuie să fii autentificat.", variant: "destructive" });
      navigate("/auth");
      return;
    }

    if (items.length === 0) return;

    // Check for expired slot locks
    const expiredItems = items.filter(i => isSlotExpired(i.addedAt));
    if (expiredItems.length > 0) {
      toast({
        title: "Sloturi expirate",
        description: "Unele rezervări au expirat. Te rugăm să le elimini și să le adaugi din nou.",
        variant: "destructive",
      });
      return;
    }

    setShowPhoneDialog(true);
  };

  const handleConfirmPhoneAndCheckout = async () => {
    if (!phoneNumber.trim()) {
      toast({ title: "Eroare", description: "Te rugăm să introduci un număr de telefon valid pentru notificări SMS.", variant: "destructive" });
      return;
    }

    setIsUpdatingPhone(true);
    // Best effort update
    const { error } = await supabase.from('profiles').update({ phone: phoneNumber }).eq('id', user.id);
    setIsUpdatingPhone(false);

    if (error) {
       console.error("Failed to update phone", error);
    }

    setShowPhoneDialog(false);

    const checkoutItems = items.map(item => ({
      experienceId: item.experienceId,
      slotId: item.slotId,
      participants: item.participants,
      totalPrice: item.price * item.participants + item.services.reduce((s, svc) => s + svc.price * svc.quantity, 0),
      title: item.title,
    }));

    const success = await processCheckout(checkoutItems);
    if (success) {
      // Cart will be cleared after successful payment verification
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ro-RO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

  const formatTime = (time: string) => time.slice(0, 5);

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-24 pb-16">
          <div className="container max-w-2xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-20"
            >
              <ShoppingBag className="h-16 w-16 text-muted-foreground mx-auto mb-6" />
              <h1 className="text-3xl font-bold mb-4">Coșul tău este gol</h1>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                Adaugă experiențe în coș pentru a le rezerva.
              </p>
              <Button asChild size="lg">
                <Link to="/">
                  Descoperă experiențe
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
              </Button>
            </motion.div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-16">
        <div className="container max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-3xl font-bold mb-8">Coșul tău ({items.length})</h1>

            <div className="grid lg:grid-cols-3 gap-8">
              {/* Cart Items */}
              <div className="lg:col-span-2 space-y-4">
                <AnimatePresence>
                  {items.map((item) => {
                    const itemTotal = item.price * item.participants + item.services.reduce((s, svc) => s + svc.price * svc.quantity, 0);
                    const expired = isSlotExpired(item.addedAt);
                    const expiring = !expired && isSlotExpiring(item.addedAt);

                    return (
                      <motion.div
                        key={item.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -100 }}
                      >
                        <Card className={`overflow-hidden ${expired ? 'border-destructive/50 opacity-70' : expiring ? 'border-amber-500/50' : ''}`}>
                          <CardContent className="p-0">
                            <div className="flex flex-col sm:flex-row">
                              {/* Image */}
                              <div className="w-full sm:w-36 h-32 sm:h-auto flex-shrink-0">
                                <img
                                  src={item.image}
                                  alt={item.title}
                                  className="w-full h-full object-cover"
                                />
                              </div>

                              {/* Details */}
                              <div className="flex-1 p-4">
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <Link to={`/experience/${item.experienceId}`} className="font-semibold text-foreground hover:text-primary transition-colors">
                                      {item.title}
                                    </Link>
                                    <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                                      <MapPin className="w-3.5 h-3.5" />
                                      {item.location}
                                    </div>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-muted-foreground hover:text-destructive flex-shrink-0"
                                    onClick={() => removeItem(item.id)}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>

                                <div className="flex flex-wrap gap-3 mt-3 text-sm">
                                  <span className="flex items-center gap-1 text-muted-foreground">
                                    <CalendarDays className="w-3.5 h-3.5" />
                                    {formatDate(item.slotDate)}
                                  </span>
                                  <span className="flex items-center gap-1 text-muted-foreground">
                                    <Clock className="w-3.5 h-3.5" />
                                    {formatTime(item.startTime)} - {formatTime(item.endTime)}
                                  </span>
                                  <span className="flex items-center gap-1 text-muted-foreground">
                                    <Users className="w-3.5 h-3.5" />
                                    {item.participants} {item.participants === 1 ? 'participant' : 'participanți'}
                                  </span>
                                </div>

                                {item.services.length > 0 && (
                                  <div className="mt-2 text-sm text-muted-foreground">
                                    <span className="font-medium">Servicii: </span>
                                    {item.services.map(s => `${s.name} (${s.price} Lei × ${s.quantity})`).join(', ')}
                                  </div>
                                )}

                                {(expired || expiring) && (
                                  <div className={`flex items-center gap-1.5 mt-2 text-xs font-medium ${expired ? 'text-destructive' : 'text-amber-600'}`}>
                                    <AlertTriangle className="w-3.5 h-3.5" />
                                    {expired ? 'Rezervarea slotului a expirat — readaugă experiența' : 'Rezervarea slotului expiră în curând'}
                                  </div>
                                )}

                                <div className="mt-3 text-right">
                                  <span className="text-lg font-bold text-foreground">{itemTotal} {t('common.lei')}</span>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>

              {/* Sidebar: Summary + Billing + Checkout */}
              <div className="space-y-6">
                {/* Order Summary */}
                <Card>
                  <CardContent className="p-6 space-y-4">
                    <h2 className="font-semibold text-lg text-foreground">Sumar comandă</h2>

                    {items.map(item => {
                      const itemTotal = item.price * item.participants + item.services.reduce((s, svc) => s + svc.price * svc.quantity, 0);
                      return (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span className="text-muted-foreground truncate mr-2">{item.title}</span>
                          <span className="font-medium text-foreground whitespace-nowrap">{itemTotal} Lei</span>
                        </div>
                      );
                    })}

                    <div className="border-t border-border pt-3 flex justify-between">
                      <span className="font-semibold text-foreground">Total</span>
                      <span className="text-xl font-bold text-foreground">{subtotal} {t('common.lei')}</span>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      Prețurile includ TVA.
                    </p>
                  </CardContent>
                </Card>

                {/* Billing Form */}
                <Card>
                  <CardContent className="p-6">
                    <BillingForm onChange={setBillingData} />
                  </CardContent>
                </Card>

                {/* Checkout Button */}
                <Button
                  size="xl"
                  className="w-full"
                  onClick={handleCheckout}
                  disabled={isProcessing || items.some(i => isSlotExpired(i.addedAt))}
                >
                  {isProcessing ? (
                    <>Se procesează...</>
                  ) : (
                    <>
                      <CreditCard className="w-5 h-5 mr-2" />
                      Plătește {subtotal} {t('common.lei')}
                    </>
                  )}
                </Button>

                <p className="text-center text-xs text-muted-foreground">
                  🔒 Plată securizată prin Stripe
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </main>

      {/* Phone Number Modal */}
      <Dialog open={showPhoneDialog} onOpenChange={setShowPhoneDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Număr de telefon</DialogTitle>
            <DialogDescription>
              Avem nevoie de numărul tău de telefon pentru a-ți putea trimite notificări SMS importante despre rezervarea ta.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-2">
              <Label htmlFor="phone-number">Număr de telefon</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone-number"
                  placeholder="+40 712 345 678"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="pl-9"
                  disabled={isUpdatingPhone}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPhoneDialog(false)} disabled={isUpdatingPhone}>
              Renunță
            </Button>
            <Button onClick={handleConfirmPhoneAndCheckout} disabled={isUpdatingPhone || isProcessing || !phoneNumber.trim()}>
              {isUpdatingPhone || isProcessing ? "Se procesează..." : "Confirmă și Plătește"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Footer />
    </div>
  );
}
