import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ReviewForm } from '@/components/booking/ReviewForm';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Calendar, MapPin, Users, CheckCircle, XCircle, Clock, Gift, Ban, Edit } from 'lucide-react';
import { format } from 'date-fns';

interface Booking {
  id: string;
  experience_id: string;
  booking_date: string;
  participants: number;
  status: string;
  total_price: number;
  special_requests?: string;
  created_at: string;
  experiences?: {
    title: string;
    location_name: string;
  };
  experience_title?: string;
  location_name?: string;
  vouchers?: {
    code: string;
  };
}

const MyBookings = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Cancel dialog
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  
  // Change date dialog
  const [changeDateDialogOpen, setChangeDateDialogOpen] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [changingDate, setChangingDate] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) fetchBookings();
  }, [user]);

  const fetchBookings = async () => {
    try {
      const data = await api.bookings.list();
      setBookings((data as any) || []);
    } catch (error: any) {
      toast({
        title: 'Eroare',
        description: 'Nu am putut încărca rezervările',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      confirmed:  { label: 'Confirmată',     variant: 'default'     as const, icon: CheckCircle },
      pending:    { label: 'În așteptare',   variant: 'secondary'   as const, icon: Clock },
      cancelled:  { label: 'Anulată',        variant: 'destructive' as const, icon: XCircle },
      completed:  { label: 'Finalizată',     variant: 'outline'     as const, icon: CheckCircle },
      declined:   { label: 'Respinsă',       variant: 'destructive' as const, icon: Ban },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const filterBookingsByStatus = (statuses: string[]) => {
    return bookings.filter((b) => statuses.includes(b.status));
  };

  const isUpcoming = (booking: Booking) => {
    return new Date(booking.booking_date) > new Date() && booking.status === 'confirmed';
  };

  const upcomingBookings = bookings.filter(isUpcoming);

  const handleCancelClick = (bookingId: string) => {
    setSelectedBookingId(bookingId);
    setCancellationReason('');
    setCancelDialogOpen(true);
  };

  const handleCancelBooking = async () => {
    if (!selectedBookingId || !cancellationReason.trim()) return;
    setCancelling(true);
    try {
      const result = await api.bookings.cancel(selectedBookingId, cancellationReason);
      toast({
        title: 'Rezervare anulată',
        description: result.refund_eligible 
          ? 'Rezervarea a fost anulată. Ești eligibil pentru rambursare.'
          : 'Rezervarea a fost anulată.',
      });
      setCancelDialogOpen(false);
      setCancellationReason('');
      fetchBookings();
    } catch (error: any) {
      toast({
        title: 'Eroare',
        description: error.message || 'Nu am putut anula rezervarea',
        variant: 'destructive',
      });
    } finally {
      setCancelling(false);
    }
  };

  const handleChangeDateClick = (bookingId: string) => {
    setSelectedBookingId(bookingId);
    setNewDate('');
    setChangeDateDialogOpen(true);
  };

  const handleChangeDate = async () => {
    if (!selectedBookingId || !newDate) return;
    setChangingDate(true);
    try {
      await api.bookings.reschedule(selectedBookingId, new Date(newDate).toISOString());
      toast({
        title: 'Data schimbată',
        description: 'Rezervarea a fost reprogramată cu succes',
      });
      setChangeDateDialogOpen(false);
      setNewDate('');
      fetchBookings();
    } catch (error: any) {
      toast({
        title: 'Eroare',
        description: error.message || 'Nu am putut schimba data',
        variant: 'destructive',
      });
    } finally {
      setChangingDate(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Clock className="h-12 w-12 animate-spin text-primary mr-2" />
          <span>Se încarcă...</span>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container py-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Rezervările Mele</h1>
          <Tabs defaultValue="upcoming" className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="upcoming">Viitoare ({upcomingBookings.length})</TabsTrigger>
              <TabsTrigger value="all">Toate ({bookings.length})</TabsTrigger>
              <TabsTrigger value="completed">Finalizate ({filterBookingsByStatus(['completed']).length})</TabsTrigger>
              <TabsTrigger value="cancelled">Anulate ({filterBookingsByStatus(['cancelled']).length})</TabsTrigger>
            </TabsList>
            {['upcoming', 'all', 'completed', 'cancelled'].map(tab => (
              <TabsContent key={tab} value={tab}>
                <BookingGrid 
                  bookings={tab === 'upcoming' ? upcomingBookings : (tab === 'all' ? bookings : filterBookingsByStatus([tab]))} 
                  getStatusBadge={getStatusBadge}
                  onCancelClick={handleCancelClick}
                  onChangeDateClick={handleChangeDateClick}
                  onRefresh={fetchBookings}
                />
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </main>
      <Footer />

      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Anulează Rezervarea</DialogTitle></DialogHeader>
          <div className="py-4">
            <Label htmlFor="reason">Motiv anulare *</Label>
            <Textarea id="reason" value={cancellationReason} onChange={e => setCancellationReason(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>Înapoi</Button>
            <Button variant="destructive" onClick={handleCancelBooking} disabled={cancelling}>{cancelling ? 'Se anulează...' : 'Confirmă'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={changeDateDialogOpen} onOpenChange={setChangeDateDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Schimbă Data</DialogTitle></DialogHeader>
          <div className="py-4">
            <Label htmlFor="date">Data nouă *</Label>
            <Input id="date" type="datetime-local" value={newDate} onChange={e => setNewDate(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChangeDateDialogOpen(false)}>Anulează</Button>
            <Button onClick={handleChangeDate} disabled={changingDate}>{changingDate ? 'Se salvează...' : 'Salvează'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const BookingGrid = ({ bookings, getStatusBadge, onCancelClick, onChangeDateClick, onRefresh }: any) => {
  if (bookings.length === 0) return (
    <Card><CardContent className="py-12 text-center text-muted-foreground">Nu ai rezervări aici</CardContent></Card>
  );
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {bookings.map((booking: any) => (
        <Card key={booking.id} className="overflow-hidden">
          <CardHeader className="bg-primary/5">
            <div className="flex justify-between items-start">
              <CardTitle className="text-lg">{booking.experience_title || booking.experiences?.title}</CardTitle>
              {getStatusBadge(booking.status)}
            </div>
            <CardDescription>{booking.location_name || booking.experiences?.location_name}</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4" />
              {format(new Date(booking.booking_date), 'PPP')}
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4" /> {booking.participants} participanți
            </div>
            {/* Pending — provider confirmation notice */}
            {booking.status === 'pending' && (() => {
              const hoursLeft = Math.max(0, 24 - (Date.now() - new Date(booking.created_at).getTime()) / 3_600_000);
              return (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-sm">
                  <p className="font-medium text-amber-800 dark:text-amber-200 flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    Așteaptă confirmare furnizor
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                    {hoursLeft > 0
                      ? `Furnizorul mai are ${Math.floor(hoursLeft)}h ${Math.round((hoursLeft % 1) * 60)}m să confirme sau să respingă rezervarea.`
                      : 'Fereastra de răspuns a furnizorului a expirat. Rezervarea va fi procesata automat.'}
                  </p>
                </div>
              );
            })()}
            <div className="pt-4 border-t flex gap-2">
              {booking.status === 'confirmed' && (
                <Button size="sm" variant="destructive" className="flex-1" onClick={() => onCancelClick(booking.id)}>Anulează</Button>
              )}
              {booking.status === 'cancelled' && (
                <Button size="sm" variant="outline" className="flex-1" onClick={() => onChangeDateClick(booking.id)}>Reprogramează</Button>
              )}
              {booking.status === 'completed' && (
                <ReviewForm bookingId={booking.id} experienceId={booking.experience_id} onReviewSubmitted={onRefresh} />
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default MyBookings;
