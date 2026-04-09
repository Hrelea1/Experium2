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
import { ExperienceImage } from "@/components/ExperienceImage";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

export default function Cart() {
  const { t } = useTranslation();
  const { items, removeItem, subtotal } = useCart();
  const { user } = useAuth();
  const { processCheckout, isProcessing } = useCheckout();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [billingData, setBillingData] = useState<BillingData | null>(null);
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

  const LOCK_DURATION_MS = 5 * 60 * 1000;
  const isSlotExpired = (addedAt: number) => Date.now() - addedAt > LOCK_DURATION_MS;

  const nextStep = () => {
    if (currentStep === 1) {
      if (!user) {
        toast({ title: "Autentificare necesară", description: "Te rugăm să te autentifici pentru a continua.", variant: "destructive" });
        navigate("/auth");
        return;
      }
      if (items.some(i => isSlotExpired(i.addedAt))) {
        toast({ title: "Sloturi expirate", description: "Unele rezervări au expirat. Te rugăm să le elimini.", variant: "destructive" });
        return;
      }
    }
    if (currentStep === 2) {
      if (!billingData?.billing_email || !billingData?.billing_phone) {
        toast({ title: "Date incomplete", description: "Te rugăm să completezi datele de facturare.", variant: "destructive" });
        return;
      }
      if (!phoneNumber.trim()) {
        toast({ title: "Telefon necesar", description: "Introdu un număr de telefon pentru contact.", variant: "destructive" });
        return;
      }
    }
    setCurrentStep(prev => Math.min(prev + 1, 3));
    window.scrollTo(0, 0);
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
    window.scrollTo(0, 0);
  };

  const getItemTotal = (item: any) => {
    let base = 0;
    if (item.selectedTiers && item.selectedTiers.length > 0) {
      base = item.selectedTiers.reduce((s: any, tier: any) => s + (tier.price || 0) * (tier.quantity || 0), 0);
    } else {
      base = (item.price || 0) * (item.participants || 0);
    }
    const extras = (item.services || []).reduce((s: any, svc: any) => s + (svc.price || 0) * (svc.quantity || 0), 0);
    return base + extras;
  };

  const handleFinalCheckout = async () => {
    setIsUpdatingPhone(true);
    await supabase.from('profiles').update({ phone: phoneNumber }).eq('id', user.id);
    setIsUpdatingPhone(false);

    const checkoutItems = items.map(item => ({
      experienceId: item.experienceId,
      slotId: item.slotId,
      slotDate: item.slotDate,
      startTime: item.startTime,
      participants: item.participants,
      totalPrice: getItemTotal(item),
      title: item.title,
      participantDetails: [...(item.selectedTiers || []), ...(item.services || [])],
    }));

    await processCheckout(checkoutItems);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('ro-RO', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  const steps = [
    { id: 1, label: "Coș", icon: ShoppingBag },
    { id: 2, label: "Detalii", icon: CreditCard },
    { id: 3, label: "Plată", icon: CalendarDays },
  ];

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-32 pb-16">
          <div className="container max-w-2xl px-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-20 bg-card rounded-3xl border border-border shadow-sm">
              <div className="w-24 h-24 bg-primary/5 rounded-full flex items-center justify-center mx-auto mb-8">
                <ShoppingBag className="h-10 w-10 text-primary" />
              </div>
              <h1 className="text-3xl font-bold mb-4">Coșul tău este gol</h1>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto">Explorați experiențele noastre și alegeți-o pe cea care vi se potrivește.</p>
              <Button asChild size="lg" className="rounded-xl px-8">
                <Link to="/">Descoperă experiențe <ArrowRight className="w-5 h-5 ml-2" /></Link>
              </Button>
            </motion.div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fcfcfc] dark:bg-background">
      <Header />
      <main className="pt-32 pb-24">
        <div className="container max-w-5xl px-4">
          {/* Stepper */}
          <div className="mb-8 sm:mb-12">
            <div className="flex items-center justify-center">
              {steps.map((step, i) => (
                <div key={step.id} className="flex items-center">
                  <div className={`flex flex-col items-center group transition-all`}>
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center mb-2 transition-all duration-300 ${
                      currentStep >= step.id ? 'bg-primary text-white shadow-lg shadow-primary/20 ring-4 ring-primary/10' : 'bg-muted text-muted-foreground'
                    }`}>
                      <step.icon className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <span className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider text-center ${currentStep >= step.id ? 'text-primary' : 'text-muted-foreground'}`}>
                      {step.label}
                    </span>
                  </div>
                  {i < steps.length - 1 && (
                    <div className={`w-8 sm:w-12 h-px mx-2 sm:mx-4 mb-6 transition-colors duration-500 ${currentStep > step.id ? 'bg-primary' : 'bg-border'}`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="grid lg:grid-cols-12 gap-10 items-start">
            {/* Main Content Area */}
            <div className="lg:col-span-8">
              <AnimatePresence mode="wait">
                {currentStep === 1 && (
                  <motion.div key="step1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h2 className="text-2xl font-bold">Experiențele tale</h2>
                      <span className="text-sm font-medium text-muted-foreground">{items.length} produse</span>
                    </div>
                    {items.map((item) => (
                      <Card key={item.id} className="overflow-hidden border-none shadow-premium bg-card group">
                        <CardContent className="p-0">
                          <div className="flex flex-col sm:flex-row h-full">
                            <div className="w-full sm:w-48 h-40 sm:h-auto overflow-hidden">
                              <ExperienceImage src={item.image} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                            </div>
                            <div className="flex-1 p-5 flex flex-col justify-between">
                              <div>
                                <div className="flex justify-between items-start mb-2">
                                  <Link to={`/experience/${item.experienceId}`} className="text-lg font-bold hover:text-primary transition-colors">{item.title}</Link>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/5" onClick={() => removeItem(item.id)}>
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                                <div className="space-y-2 mb-4">
                                  <div className="flex flex-wrap items-center text-sm text-muted-foreground gap-x-4 gap-y-2">
                                    <span className="flex items-center gap-1.5 break-words"><CalendarDays className="w-4 h-4 text-primary flex-shrink-0" /> <span>{formatDate(item.slotDate)}</span></span>
                                    <span className="flex items-center gap-1.5 whitespace-nowrap"><Clock className="w-4 h-4 text-primary flex-shrink-0" /> {(item.startTime || '00:00').slice(0, 5)} - {(item.endTime || '00:00').slice(0, 5)}</span>
                                  </div>
                                  <div className="flex flex-wrap items-center text-sm text-muted-foreground gap-x-4 gap-y-2">
                                    <span className="flex items-center gap-1.5 break-words"><MapPin className="w-4 h-4 text-primary flex-shrink-0" /> <span>{item.location}</span></span>
                                    <span className="flex items-center gap-1.5 whitespace-nowrap"><Users className="w-4 h-4 text-primary flex-shrink-0" /> {item.participants} pers.</span>
                                  </div>
                                </div>
                              </div>
                                <div className="flex justify-between items-end border-t border-border/50 pt-4">
                                  <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Subtotal</div>
                                  <div className="text-xl font-black">{getItemTotal(item)} Lei</div>
                                </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    <div className="flex justify-end pt-4">
                      <Button size="xl" onClick={nextStep} className="w-full sm:w-auto rounded-2xl px-6 sm:px-10 shadow-lg shadow-primary/20 group">
                        Continuă la facturare <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </div>
                  </motion.div>
                )}

                {currentStep === 2 && (
                  <motion.div key="step2" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-8">
                    <Card className="border-none shadow-premium overflow-hidden bg-card">
                      <div className="p-6 border-b border-border/50 bg-muted/30">
                        <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
                          <CreditCard className="w-6 h-6 text-primary" />
                          Date facturare și contact
                        </h2>
                      </div>
                      <CardContent className="p-5 sm:p-8 space-y-8">
                        <div className="grid gap-6">
                           <BillingForm onChange={setBillingData} />
                           <div className="space-y-4 pt-4 border-t border-border/50">
                              <Label className="text-sm font-bold flex items-center gap-2">
                                <Phone className="w-4 h-4 text-primary" />
                                Număr de contact pentru SMS
                              </Label>
                              <Input 
                                placeholder="+40 7XX XXX XXX" 
                                value={phoneNumber} 
                                onChange={(e) => setPhoneNumber(e.target.value)} 
                                className="h-12 text-lg rounded-xl border-border bg-muted/20 focus:bg-background transition-all"
                              />
                              <p className="text-xs text-muted-foreground bg-primary/5 p-3 rounded-lg border border-primary/10">
                                Îți vom trimite un SMS cu confirmarea și detaliile accesului imediat după plată.
                              </p>
                           </div>
                        </div>
                      </CardContent>
                    </Card>
                    <div className="flex flex-col-reverse sm:flex-row justify-between pt-4 gap-4">
                      <Button variant="ghost" onClick={prevStep} className="rounded-2xl px-6 font-bold h-12 sm:h-auto">Înapoi</Button>
                      <Button size="xl" onClick={nextStep} className="w-full sm:w-auto rounded-2xl px-6 sm:px-10 shadow-lg shadow-primary/20 group">
                        Confirmare comandă <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </div>
                  </motion.div>
                )}

                {currentStep === 3 && (
                  <motion.div key="step3" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-10">
                    <div className="text-center space-y-2">
                      <h2 className="text-3xl font-black">Ultimul pas</h2>
                      <p className="text-muted-foreground">Verifică detaliile înainte de a finaliza plata securizată.</p>
                    </div>
                    
                    <div className="bg-primary/5 rounded-3xl sm:rounded-[2rem] p-5 sm:p-8 border border-primary/10">
                      <div className="space-y-6">
                        <div className="flex flex-col space-y-4">
                          <div className="flex justify-between items-center text-sm font-bold tracking-widest uppercase text-muted-foreground">
                            <span>Sumar</span>
                            <span>Preț</span>
                          </div>
                          {items.map(item => (
                            <div key={item.id} className="flex justify-between items-center pb-4 border-b border-primary/10 last:border-0 last:pb-0">
                              <div className="flex flex-col">
                                <span className="font-bold text-foreground">{item.title}</span>
                                <span className="text-xs text-muted-foreground">{item.participants} pers • {formatDate(item.slotDate)}</span>
                              </div>
                              <span className="font-bold">{getItemTotal(item)} Lei</span>
                            </div>
                          ))}
                        </div>
                        
                        <div className="pt-6 mt-6 border-t-2 border-dashed border-primary/20">
                          <div className="flex justify-between items-center bg-white dark:bg-card p-5 sm:p-6 rounded-2xl shadow-sm gap-4">
                            <div className="flex flex-col">
                              <span className="text-[10px] sm:text-sm font-bold text-muted-foreground uppercase tracking-widest">Total de plată</span>
                              <span className="text-[10px] sm:text-xs text-primary font-medium">Inclusiv TVA</span>
                            </div>
                            <span className="text-2xl sm:text-4xl font-black text-primary whitespace-nowrap">{subtotal} Lei</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-center space-y-6">
                      <Button size="xl" onClick={handleFinalCheckout} disabled={isProcessing || isUpdatingPhone} className="w-full sm:w-80 h-16 rounded-2xl text-xl font-bold shadow-xl shadow-primary/30 animate-pulse-glow">
                        {isProcessing ? "Se procesează..." : "Plătește în siguranță"}
                      </Button>
                      <div className="flex flex-col items-center space-y-2">
                         <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                           <CreditCard className="w-4 h-4" /> Plată securizată prin Stripe
                         </span>
                         <Button variant="link" onClick={prevStep} className="text-muted-foreground font-bold hover:text-primary">E vreo greșeală? Modifică datele</Button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Sidebar Summary (Visible in steps 1 & 2) */}
            <div className="lg:col-span-4 sticky top-32">
              <Card className="border-none shadow-premium bg-card overflow-hidden">
                <div className="p-6 bg-gradient-to-br from-primary to-primary-dark text-white">
                  <h3 className="font-bold text-lg mb-1">Sumar comandă</h3>
                  <p className="text-white/80 text-xs">Prețurile includ toate taxele</p>
                </div>
                <CardContent className="p-6">
                  <div className="space-y-4 mb-6">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="font-bold text-foreground">{subtotal} Lei</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Taxe</span>
                      <span className="font-bold text-foreground">0 Lei</span>
                    </div>
                    <div className="h-px bg-border pt-2" />
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-foreground text-lg">Total</span>
                      <span className="text-2xl font-black text-primary">{subtotal} Lei</span>
                    </div>
                  </div>
                  
                  {currentStep < 3 && (
                    <Button 
                      className="w-full rounded-xl shadow-lg shadow-primary/10 group" 
                      variant="secondary"
                      onClick={() => navigate("/")}
                    >
                      Continuă cumpărăturile
                    </Button>
                  )}
                </CardContent>
              </Card>
              
              <div className="mt-6 p-6 rounded-[2rem] bg-primary/5 border border-primary/10 text-center space-y-3">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                    <Phone className="w-5 h-5 text-primary" />
                </div>
                <p className="text-xs font-black text-primary uppercase tracking-[0.2em]">Asistență</p>
                <p className="text-sm font-bold text-foreground leading-relaxed">Suntem aici pentru a te ajuta să finalizezi rezervarea perfectă.</p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
