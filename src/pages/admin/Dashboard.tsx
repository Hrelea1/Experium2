import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Gift, Calendar, ShoppingBag, Users, TrendingUp, DollarSign, MapPin, AlertCircle, RefreshCw } from 'lucide-react';
import { DateCard } from '@/components/dashboard/DateCard';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface Stats {
  totalExperiences: number;
  activeExperiences: number;
  totalBookings: number;
  upcomingBookings: number;
  totalVouchers: number;
  activeVouchers: number;
  totalUsers: number;
  totalRevenue: number;
  voucherRevenue: number;
  bookingRevenue: number;
}

interface Booking {
  id: string;
  booking_date: string;
  status: string;
  participants: number;
  total_price: number;
  user_id: string;
  experiences: {
    title: string;
    location_name: string;
  };
}

interface Voucher {
  id: string;
  code: string;
  status: string;
  purchase_price: number;
  issue_date: string;
  experiences: {
    title: string;
    location_name: string;
  };
}

const AdminDashboard = () => {
  const [stats, setStats] = useState<Stats>({
    totalExperiences: 0,
    activeExperiences: 0,
    totalBookings: 0,
    upcomingBookings: 0,
    totalVouchers: 0,
    activeVouchers: 0,
    totalUsers: 0,
    totalRevenue: 0,
    voucherRevenue: 0,
    bookingRevenue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recentBookings, setRecentBookings] = useState<Booking[]>([]);
  const [recentVouchers, setRecentVouchers] = useState<Voucher[]>([]);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.admin.getStats();

      setStats({
        totalExperiences: data.total_experiences || 0,
        activeExperiences: data.active_experiences || 0,
        totalBookings: data.total_bookings || 0,
        upcomingBookings: data.upcoming_bookings || 0,
        totalVouchers: data.total_vouchers || 0,
        activeVouchers: data.active_vouchers || 0,
        totalUsers: data.total_users || 0,
        totalRevenue: data.total_revenue || 0,
        voucherRevenue: data.voucher_revenue || 0,
        bookingRevenue: data.booking_revenue || 0,
      });

      if (data.recent_bookings) setRecentBookings(data.recent_bookings);
      if (data.recent_vouchers) setRecentVouchers(data.recent_vouchers);
    } catch (error: any) {
      console.error('Error fetching stats:', error);
      setError(error?.message || 'Nu am putut încărca statisticile. Verificați conexiunea la server.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      active: { label: 'Activ', variant: 'default' },
      used: { label: 'Folosit', variant: 'secondary' },
      expired: { label: 'Expirat', variant: 'destructive' },
      confirmed: { label: 'Confirmat', variant: 'default' },
      pending: { label: 'În așteptare', variant: 'outline' },
      cancelled: { label: 'Anulat', variant: 'destructive' },
      completed: { label: 'Finalizat', variant: 'secondary' },
    };
    const statusInfo = statusMap[status] || { label: status, variant: 'outline' as const };
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  const statCards = [
    {
      title: 'Experiențe Active',
      value: stats.activeExperiences,
      total: stats.totalExperiences,
      icon: Gift,
      color: 'text-blue-600',
      bg: 'bg-blue-50 dark:bg-blue-950/30',
    },
    {
      title: 'Rezervări Viitoare',
      value: stats.upcomingBookings,
      total: stats.totalBookings,
      icon: Calendar,
      color: 'text-green-600',
      bg: 'bg-green-50 dark:bg-green-950/30',
    },
    {
      title: 'Vouchere Active',
      value: stats.activeVouchers,
      total: stats.totalVouchers,
      icon: ShoppingBag,
      color: 'text-purple-600',
      bg: 'bg-purple-50 dark:bg-purple-950/30',
    },
    {
      title: 'Utilizatori',
      value: stats.totalUsers,
      total: null,
      icon: Users,
      color: 'text-orange-600',
      bg: 'bg-orange-50 dark:bg-orange-950/30',
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-5 md:space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">Dashboard</h2>
            <p className="text-muted-foreground text-sm mt-1">
              Privire de ansamblu asupra platformei Experium
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchStats}
            disabled={loading}
            className="shrink-0"
          >
            <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Reîmprospătează</span>
          </Button>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Eroare la încărcare</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardHeader className="animate-pulse pb-2">
                  <div className="h-3 bg-muted rounded w-20"></div>
                  <div className="h-7 bg-muted rounded w-12 mt-2"></div>
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : (
          <>
            {/* Stats Cards — 2 columns on mobile, 4 on desktop */}
            <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
              {statCards.map((stat) => (
                <Card key={stat.title} className="overflow-hidden">
                  <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
                    <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground leading-tight">
                      {stat.title}
                    </CardTitle>
                    <div className={`h-8 w-8 rounded-lg ${stat.bg} flex items-center justify-center shrink-0`}>
                      <stat.icon className={`h-4 w-4 ${stat.color}`} />
                    </div>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className="text-2xl md:text-3xl font-bold">{stat.value.toLocaleString()}</div>
                    {stat.total !== null && (
                      <p className="text-xs text-muted-foreground mt-1">
                        din {stat.total} total
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Revenue Cards */}
            <div className="grid gap-3 md:gap-4 grid-cols-1 md:grid-cols-2">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-green-50 dark:bg-green-950/30 flex items-center justify-center">
                      <DollarSign className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Venituri Totale</CardTitle>
                      <CardDescription className="text-xs">Rezervări + Vouchere</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-3xl font-bold text-green-600">
                    {stats.totalRevenue.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON
                  </div>
                  <Separator />
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" /> Din rezervări:
                      </span>
                      <span className="font-semibold">
                        {stats.bookingRevenue.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <ShoppingBag className="h-3.5 w-3.5" /> Din vouchere:
                      </span>
                      <span className="font-semibold">
                        {stats.voucherRevenue.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center">
                      <TrendingUp className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Statistici Rapide</CardTitle>
                      <CardDescription className="text-xs">Rate de conversie</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2.5 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Vouchere folosite:</span>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-purple-500 rounded-full"
                          style={{
                            width: `${stats.totalVouchers > 0
                              ? Math.round(((stats.totalVouchers - stats.activeVouchers) / stats.totalVouchers) * 100)
                              : 0}%`
                          }}
                        />
                      </div>
                      <span className="font-semibold w-10 text-right">
                        {stats.totalVouchers > 0
                          ? Math.round(((stats.totalVouchers - stats.activeVouchers) / stats.totalVouchers) * 100)
                          : 0}%
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Experiențe active:</span>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{
                            width: `${stats.totalExperiences > 0
                              ? Math.round((stats.activeExperiences / stats.totalExperiences) * 100)
                              : 0}%`
                          }}
                        />
                      </div>
                      <span className="font-semibold w-10 text-right">
                        {stats.totalExperiences > 0
                          ? Math.round((stats.activeExperiences / stats.totalExperiences) * 100)
                          : 0}%
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Rezervări viitoare:</span>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 rounded-full"
                          style={{
                            width: `${stats.totalBookings > 0
                              ? Math.round((stats.upcomingBookings / stats.totalBookings) * 100)
                              : 0}%`
                          }}
                        />
                      </div>
                      <span className="font-semibold w-10 text-right">
                        {stats.totalBookings > 0
                          ? Math.round((stats.upcomingBookings / stats.totalBookings) * 100)
                          : 0}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity Tabs */}
            <Tabs defaultValue="bookings" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="bookings" className="text-xs sm:text-sm">
                  <Calendar className="h-3.5 w-3.5 mr-1.5" />
                  Rezervări Recente
                </TabsTrigger>
                <TabsTrigger value="orders" className="text-xs sm:text-sm">
                  <ShoppingBag className="h-3.5 w-3.5 mr-1.5" />
                  Comenzi Recente
                </TabsTrigger>
              </TabsList>

              {/* Recent Bookings */}
              <TabsContent value="bookings">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Ultimele Rezervări</CardTitle>
                    <CardDescription>Cele mai recente 10 rezervări din platformă</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {recentBookings.length === 0 ? (
                      <div className="text-center py-10 text-muted-foreground">
                        <Calendar className="h-10 w-10 mx-auto mb-3 opacity-30" />
                        <p>Nu există rezervări încă</p>
                      </div>
                    ) : (
                      recentBookings.map((booking) => (
                        <div key={booking.id} className="border rounded-lg p-3 md:p-4">
                          <div className="flex flex-col sm:flex-row gap-3">
                            <DateCard date={booking.booking_date} showTime />
                            
                            <div className="flex-1 space-y-2 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-semibold text-sm md:text-base truncate">
                                    {booking.experiences?.title}
                                  </h3>
                                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                                    <MapPin className="h-3 w-3 flex-shrink-0" />
                                    <span className="truncate">{booking.experiences?.location_name}</span>
                                  </div>
                                </div>
                                {getStatusBadge(booking.status)}
                              </div>
                              
                              <Separator />
                              
                              <div className="grid grid-cols-3 gap-2 text-xs">
                                <div>
                                  <p className="text-muted-foreground">ID User</p>
                                  <p className="font-mono font-semibold truncate text-[10px]">{booking.user_id.slice(0, 8)}…</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Participanți</p>
                                  <p className="font-semibold">{booking.participants}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Preț</p>
                                  <p className="font-semibold">{booking.total_price} RON</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Recent Orders */}
              <TabsContent value="orders">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Ultimele Comenzi</CardTitle>
                    <CardDescription>Cele mai recente 10 comenzi de vouchere</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {recentVouchers.length === 0 ? (
                      <div className="text-center py-10 text-muted-foreground">
                        <ShoppingBag className="h-10 w-10 mx-auto mb-3 opacity-30" />
                        <p>Nu există comenzi încă</p>
                      </div>
                    ) : (
                      recentVouchers.map((voucher) => (
                        <div key={voucher.id} className="border rounded-lg p-3 md:p-4">
                          <div className="flex flex-col sm:flex-row gap-3">
                            <DateCard date={voucher.issue_date} />
                            
                            <div className="flex-1 space-y-2 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-semibold text-sm md:text-base truncate">
                                    {voucher.experiences?.title}
                                  </h3>
                                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                                    <MapPin className="h-3 w-3 flex-shrink-0" />
                                    <span className="truncate">{voucher.experiences?.location_name}</span>
                                  </div>
                                </div>
                                {getStatusBadge(voucher.status)}
                              </div>
                              
                              <Separator />
                              
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                  <p className="text-muted-foreground">Cod Voucher</p>
                                  <p className="font-mono font-semibold">{voucher.code}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Valoare</p>
                                  <p className="font-semibold">{voucher.purchase_price} RON</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
