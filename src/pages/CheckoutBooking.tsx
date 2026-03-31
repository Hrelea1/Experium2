import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CreditCard, AlertCircle, ShoppingBag, CheckCircle2 } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api, Booking } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export default function CheckoutBooking() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!id) return;
    const fetchBooking = async () => {
      try {
        const data = await api.bookings.getById(id);
        setBooking(data);
      } catch (err: any) {
        toast({
          title: "Eroare",
          description: "Nu am putut încărca detaliile rezervării.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    fetchBooking();
  }, [id, toast]);

  const handlePayment = async () => {
    if (!id) return;
    setProcessing(true);
    try {
      // Confirm the booking (simulating payment success for now)
      await api.bookings.updateStatus(id, 'confirmed');
      setSuccess(true);
      toast({
        title: "Plată confirmată!",
        description: "Rezervarea ta este acum finalizată.",
      });
    } catch (err: any) {
      toast({
        title: "Eroare la plată",
        description: err.message || "Te rugăm să încerci din nou.",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-24 pb-16 container max-w-3xl flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </main>
      </div>
    );
  }

  if (!booking || booking.status === 'cancelled') {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-24 pb-16 container max-w-3xl">
          <Card className="text-center py-12">
            <AlertCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Rezervare expirată sau invalidă</h1>
            <p className="text-muted-foreground mb-6">
              Acest link nu mai este valabil. Posibil rezervarea a expirat sau a fost anulată.
            </p>
            <Button onClick={() => navigate('/')}>Înapoi la pagina principală</Button>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  if (success || booking.status === 'confirmed') {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-24 pb-16 container max-w-3xl">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <Card className="text-center py-12 border-primary/20 bg-primary/5">
              <CheckCircle2 className="w-20 h-20 text-green-500 mx-auto mb-6" />
              <h1 className="text-3xl font-bold mb-4">Plată finalizată cu succes!</h1>
              <p className="text-muted-foreground mb-8 text-lg">
                Rezervarea pentru <strong>{booking.experience_title}</strong> a fost confirmată.
              </p>
              <Button size="lg" onClick={() => navigate('/my-bookings')}>
                Vezi Rezervările Mele
              </Button>
            </Card>
          </motion.div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-16 container max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl font-bold mb-8">Finalizare Rezervare</h1>
          
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5" />
                Sumar Rezervare Confirmată
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">Experiență:</span>
                <span className="font-semibold">{booking.experience_title}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">Data și Ora:</span>
                <span className="font-semibold">{new Date(booking.booking_date).toLocaleString('ro-RO')}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">Participanți:</span>
                <span className="font-semibold">{booking.participants}</span>
              </div>
              
              <div className="pt-4 flex justify-between items-center">
                <span className="text-lg text-foreground font-semibold">Total de Plată:</span>
                <span className="text-3xl font-bold text-primary">{booking.total_price} Lei</span>
              </div>
            </CardContent>
          </Card>

          <Button 
            size="xl" 
            className="w-full text-lg" 
            onClick={handlePayment}
            disabled={processing}
          >
            {processing ? "Se procesează..." : (
              <>
                <CreditCard className="w-5 h-5 mr-3" />
                Achită și Confirmă
              </>
            )}
          </Button>

          <p className="text-center text-sm text-muted-foreground mt-4">
            Ai la dispoziție 15 minute pentru a finaliza plata înainte de expirarea disponibilității.
          </p>
        </motion.div>
      </main>
      <Footer />
    </div>
  );
}
