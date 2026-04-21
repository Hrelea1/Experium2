import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { ro } from 'date-fns/locale';
import { XCircle, Search, RefreshCw, Copy, Mail, User, Building2, CalendarDays, DollarSign } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface DeclinedBooking {
  booking_id: string;
  total_price: number;
  participants: number;
  booking_date: string;
  declined_at: string;
  created_at: string;
  experience_title: string;
  client_email: string;
  client_name: string | null;
  client_phone: string | null;
  provider_email: string | null;
  provider_name: string | null;
}

export default function DeclinedBookings() {
  const { toast } = useToast();
  const [bookings, setBookings] = useState<DeclinedBooking[]>([]);
  const [filtered, setFiltered] = useState<DeclinedBooking[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await api.admin.getDeclinedBookings();
      setBookings(data);
      setFiltered(data);
    } catch (err: any) {
      toast({ title: 'Eroare', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(
      bookings.filter(b =>
        b.client_email?.toLowerCase().includes(q) ||
        b.client_name?.toLowerCase().includes(q) ||
        b.booking_id?.toLowerCase().includes(q) ||
        b.experience_title?.toLowerCase().includes(q) ||
        b.provider_name?.toLowerCase().includes(q)
      )
    );
  }, [search, bookings]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} copiat!` });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-3xl font-bold flex items-center gap-2">
              <XCircle className="h-8 w-8 text-destructive" />
              Rezervări Refuzate de Furnizori
            </h2>
            <p className="text-muted-foreground mt-1">
              Toate rezervările respinse de furnizori în fereastra de 24h
            </p>
          </div>
          <Button variant="outline" onClick={fetchData} disabled={loading}>
            <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} />
            Reîncarcă
          </Button>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-sm text-muted-foreground">Total refuzate</p>
              <p className="text-2xl font-bold text-destructive">{bookings.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-sm text-muted-foreground">Valoare totală pierdută</p>
              <p className="text-2xl font-bold">
                {bookings.reduce((s, b) => s + Number(b.total_price), 0).toLocaleString()} RON
              </p>
            </CardContent>
          </Card>
          <Card className="col-span-2 sm:col-span-1">
            <CardContent className="pt-4 pb-4">
              <p className="text-sm text-muted-foreground">Furnizori implicați</p>
              <p className="text-2xl font-bold">
                {new Set(bookings.map(b => b.provider_email).filter(Boolean)).size}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="declined-search"
            placeholder="Caută după client, email, ID rezervare, experiență..."
            className="pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <XCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium">
                {search ? 'Niciun rezultat pentru căutarea ta.' : 'Nicio rezervare refuzată de furnizori.'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {search ? 'Încearcă alte cuvinte cheie.' : 'Toți furnizorii au acceptat rezervările clienților.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filtered.map((b) => (
              <Card key={b.booking_id} className="border-l-4 border-l-destructive overflow-hidden">
                <CardContent className="p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    {/* Left: experience + dates */}
                    <div className="flex-1 space-y-3 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-base truncate">{b.experience_title}</h3>
                        <Badge variant="destructive" className="shrink-0 text-xs">
                          <XCircle className="h-3 w-3 mr-1" />
                          Refuzată
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        {/* Booking ID */}
                        <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
                          <span className="text-muted-foreground shrink-0">ID Rezervare:</span>
                          <code className="font-mono text-xs truncate flex-1">{b.booking_id}</code>
                          <button
                            onClick={() => copyToClipboard(b.booking_id, 'ID-ul')}
                            className="shrink-0 hover:text-primary transition-colors"
                            title="Copiază ID"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        {/* Price */}
                        <div className="flex items-center gap-2 text-sm">
                          <DollarSign className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="font-bold text-destructive">{Number(b.total_price).toLocaleString()} RON</span>
                          <span className="text-muted-foreground">· {b.participants} pers.</span>
                        </div>

                        {/* Booking date */}
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <CalendarDays className="h-4 w-4 shrink-0" />
                          <span>Dată rezervată: <strong className="text-foreground">
                            {format(new Date(b.booking_date), 'dd MMM yyyy, HH:mm', { locale: ro })}
                          </strong></span>
                        </div>

                        {/* Declined at */}
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <XCircle className="h-4 w-4 shrink-0 text-destructive" />
                          <span>Refuzat la: <strong className="text-foreground">
                            {format(new Date(b.declined_at), 'dd MMM yyyy, HH:mm', { locale: ro })}
                          </strong></span>
                        </div>
                      </div>
                    </div>

                    {/* Right: client + provider */}
                    <div className="flex flex-col sm:flex-row lg:flex-col gap-3 lg:w-72 shrink-0">
                      {/* Client */}
                      <div className="flex-1 bg-blue-50 dark:bg-blue-950/30 rounded-xl p-3 border border-blue-100 dark:border-blue-900/50">
                        <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                          <User className="h-3.5 w-3.5" /> Client
                        </p>
                        <p className="font-semibold text-sm">{b.client_name ?? <span className="text-muted-foreground italic">Fără nume</span>}</p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <a
                            href={`mailto:${b.client_email}`}
                            className="text-xs text-blue-600 dark:text-blue-400 hover:underline truncate"
                          >
                            {b.client_email}
                          </a>
                          <button
                            onClick={() => copyToClipboard(b.client_email, 'Email-ul clientului')}
                            className="shrink-0 hover:text-blue-600 transition-colors"
                            title="Copiază email"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                        </div>
                        {b.client_phone && (
                          <p className="text-xs text-muted-foreground mt-1">{b.client_phone}</p>
                        )}
                      </div>

                      {/* Provider */}
                      <div className="flex-1 bg-orange-50 dark:bg-orange-950/30 rounded-xl p-3 border border-orange-100 dark:border-orange-900/50">
                        <p className="text-xs font-semibold text-orange-700 dark:text-orange-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                          <Building2 className="h-3.5 w-3.5" /> Furnizor
                        </p>
                        <p className="font-semibold text-sm">{b.provider_name ?? <span className="text-muted-foreground italic">Necunoscut</span>}</p>
                        {b.provider_email ? (
                          <div className="flex items-center gap-1.5 mt-1">
                            <a
                              href={`mailto:${b.provider_email}`}
                              className="text-xs text-orange-600 dark:text-orange-400 hover:underline truncate"
                            >
                              {b.provider_email}
                            </a>
                            <button
                              onClick={() => copyToClipboard(b.provider_email!, 'Email-ul furnizorului')}
                              className="shrink-0 hover:text-orange-600 transition-colors"
                              title="Copiază email"
                            >
                              <Copy className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground mt-1 italic">Email indisponibil</p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
