import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, Users, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { ro } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

interface Booking {
  id: string;
  booking_date: string;
  participants: number;
  participant_details?: string | any[] | null;
  status: string;
  total_price: number;
  special_requests: string | null;
  created_at: string;
  experience_title?: string;
  location_name?: string;
  client_name?: string;
  client_email?: string;
}

export function ProviderBookings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (user) fetchBookings();
  }, [user]);

  const fetchBookings = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await api.provider.getBookings();
      setBookings(data as Booking[]);
    } catch (error) {
      console.error('[ProviderBookings] Failed to fetch:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBookingAction = async (bookingId: string, action: 'confirm' | 'decline') => {
    setActionLoading(bookingId);
    try {
      await api.bookings.updateStatus(bookingId, action === 'confirm' ? 'confirmed' : 'declined');
      toast({ 
        title: "Succes", 
        description: action === 'confirm' ? "Rezervarea a fost confirmată!" : "Rezervarea a fost respinsă."
      });
      fetchBookings(); // Refresh list after action
    } catch (error: any) {
      toast({ title: 'Eroare', description: error.message || 'Eroare la procesarea rezervării', variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      confirmed: { label: 'Confirmat', variant: 'default' },
      pending: { label: 'În așteptare', variant: 'outline' },
      cancelled: { label: 'Anulat', variant: 'destructive' },
      completed: { label: 'Finalizat', variant: 'secondary' },
    };
    const s = map[status] || { label: status, variant: 'outline' as const };
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5" />
          Rezervări Primite
        </CardTitle>
        <CardDescription>Toate rezervările procesate pentru experiențele tale</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        ) : bookings.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">Nu ai rezervări încă.</p>
        ) : (
          <div className="space-y-3">
            {bookings.map((booking) => (
              <div key={booking.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border gap-4">
                <div>
                  <h4 className="font-medium text-lg">{booking.experience_title}</h4>
                  {booking.client_name && (
                    <p className="text-sm text-muted-foreground mb-2">
                      Client: <span className="font-medium text-foreground">{booking.client_name}</span> {booking.client_email ? `(${booking.client_email})` : ''}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {format(new Date(booking.booking_date), 'dd MMM yyyy, HH:mm', { locale: ro })}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {booking.participants} pers.
                    </span>
                    <span className="font-medium text-primary text-base">{booking.total_price} Lei</span>
                  </div>
                  
                  {booking.participant_details && typeof booking.participant_details === 'string' && booking.participant_details !== '[]' && booking.participant_details !== 'null' && (
                    <div className="mt-3 text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg border border-border/50">
                      <span className="font-medium text-foreground block mb-1">Servicii / Categorii Selectate:</span>
                      <ul className="list-disc list-inside space-y-1">
                        {JSON.parse(booking.participant_details).map((detail: any, i: number) => (
                          <li key={i}>{detail.name}: <span className="font-medium">{detail.quantity}x</span> ({detail.price} Lei/buc)</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {booking.participant_details && typeof booking.participant_details === 'object' && Array.isArray(booking.participant_details) && booking.participant_details.length > 0 && (
                    <div className="mt-3 text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg border border-border/50">
                      <span className="font-medium text-foreground block mb-1">Servicii / Categorii Selectate:</span>
                      <ul className="list-disc list-inside space-y-1">
                        {booking.participant_details.map((detail: any, i: number) => (
                          <li key={i}>{detail.name}: <span className="font-medium">{detail.quantity}x</span> ({detail.price} Lei/buc)</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {booking.special_requests && (
                    <p className="text-sm text-amber-600 mt-2 bg-amber-50 p-2 rounded-md">
                      ⚠️ Cerințe speciale: "{booking.special_requests}"
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-3 min-w-[140px]">
                  {getStatusBadge(booking.status)}
                  {booking.status === 'pending' && (
                    <div className="flex items-center gap-2 mt-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="h-8 px-2 text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700"
                        onClick={() => handleBookingAction(booking.id, 'confirm')} 
                        disabled={actionLoading === booking.id}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-1" />
                        Confirmă
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="h-8 px-2 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                        onClick={() => handleBookingAction(booking.id, 'decline')} 
                        disabled={actionLoading === booking.id}
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Respinge
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
