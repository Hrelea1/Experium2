import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { CalendarDays, Clock, Users, Plus, Trash2, PlusCircle, Building2, Wrench, Bell, TrendingUp, BarChart3, ArrowLeft, MapPin, Star, Eye, Image as ImageIcon, Tag, CheckCircle2, ExternalLink, XCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { RecurringAvailability } from '@/components/provider/RecurringAvailability';
import { ProviderBookings } from '@/components/provider/ProviderBookings';
import { PushNotificationSettings } from '@/components/provider/PushNotificationSettings';
import { useProviderNotifications } from '@/hooks/useProviderNotifications';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import { ro } from 'date-fns/locale';
import { Separator } from '@/components/ui/separator';

interface AssignedExperience {
  id: string;
  experience_id: string;
  experience: {
    id: string;
    title: string;
    location_name: string;
    price: number;
    provider_type: 'accommodation' | 'service';
    duration_minutes: number | null;
    is_active: boolean | null;
  };
}

interface AvailabilitySlot {
  id: string;
  experience_id: string;
  slot_date: string;
  start_time: string;
  end_time: string;
  max_participants: number;
  booked_participants: number;
  is_available: boolean;
}

interface SalesBooking {
  id: string;
  booking_date: string;
  participants: number;
  total_price: number;
  status: string;
  created_at: string;
  experiences?: { title: string; location_name: string };
  user_id: string;
}

function NotificationsHistory() {
  const { notifications, markAsRead, markAllAsRead, unreadCount } = useProviderNotifications();
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Istoric Notificări
          </CardTitle>
          <CardDescription>{unreadCount} necitite</CardDescription>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllAsRead}>
            Marchează toate ca citite
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {notifications.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">Nicio notificare încă.</p>
        ) : (
          <div className="space-y-2">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className={cn(
                  "p-3 rounded-lg border cursor-pointer transition-colors",
                  !notif.is_read ? "bg-primary/5 border-primary/20" : "hover:bg-muted/50"
                )}
                onClick={() => !notif.is_read && markAsRead(notif.id)}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-sm">{notif.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{notif.message}</p>
                  </div>
                  {!notif.is_read && (
                    <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true, locale: ro })}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ── Experience Detail View (preview + availability + recurring) ── */
function ExperienceDetailView({
  experience,
  availabilitySlots,
  onBack,
  onSlotAdded,
  onSlotDeleted,
}: {
  experience: AssignedExperience;
  availabilitySlots: AvailabilitySlot[];
  onBack: () => void;
  onSlotAdded: () => void;
  onSlotDeleted: (id: string) => void;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [maxParticipants, setMaxParticipants] = useState(10);

  // Live preview data
  const [images, setImages] = useState<Array<{ id: string; image_url: string; is_primary: boolean; focal_x: number; focal_y: number }>>([]);
  const [fullExperience, setFullExperience] = useState<{
    description: string;
    short_description: string | null;
    includes: string[];
    avg_rating: number | null;
    total_reviews: number | null;
    max_participants: number | null;
    min_age: number | null;
    cancellation_policy: string | null;
    category_name: string | null;
    original_price: number | null;
    address: string | null;
  } | null>(null);
  const [services, setServices] = useState<Array<{ id: string; name: string; price: number; is_required: boolean }>>([]);
  const [previewImageIdx, setPreviewImageIdx] = useState(0);

  const exp = experience.experience;
  const slots = availabilitySlots.filter(s => s.experience_id === experience.experience_id);

  // Fetch images, full details, and services
  useEffect(() => {
    const fetchPreviewData = async () => {
      const [imagesRes, expRes, servicesRes] = await Promise.all([
        supabase
          .from('experience_images')
          .select('id, image_url, is_primary, focal_x, focal_y')
          .eq('experience_id', experience.experience_id)
          .order('display_order'),
        supabase
          .from('experiences')
          .select('description, short_description, includes, avg_rating, total_reviews, max_participants, min_age, cancellation_policy, original_price, address, categories(name)')
          .eq('id', experience.experience_id)
          .single(),
        supabase
          .from('experience_services')
          .select('id, name, price, is_required')
          .eq('experience_id', experience.experience_id)
          .eq('is_active', true)
          .order('display_order'),
      ]);

      if (imagesRes.data) setImages(imagesRes.data);
      if (expRes.data) {
        const d = expRes.data as any;
        setFullExperience({
          description: d.description,
          short_description: d.short_description,
          includes: d.includes || [],
          avg_rating: d.avg_rating,
          total_reviews: d.total_reviews,
          max_participants: d.max_participants,
          min_age: d.min_age,
          cancellation_policy: d.cancellation_policy,
          original_price: d.original_price,
          address: d.address,
          category_name: d.categories?.name || null,
        });
      }
      if (servicesRes.data) setServices(servicesRes.data);
    };

    fetchPreviewData();
  }, [experience.experience_id]);

  const primaryImage = images.find(i => i.is_primary) || images[0];
  const currentImage = images[previewImageIdx] || primaryImage;

  const addSlot = async () => {
    if (!user || !selectedDate) {
      toast({ title: 'Date incomplete', description: 'Selectează data', variant: 'destructive' });
      return;
    }
    try {
      const { error } = await supabase.from('availability_slots').insert({
        experience_id: experience.experience_id,
        provider_user_id: user.id,
        slot_date: selectedDate.toISOString().split('T')[0],
        start_time: startTime,
        end_time: endTime,
        max_participants: maxParticipants,
        is_available: true,
        slot_type: exp.provider_type || 'service',
      });
      if (error) throw error;
      toast({ title: 'Succes', description: 'Disponibilitatea a fost adăugată' });
      setDialogOpen(false);
      onSlotAdded();
    } catch (error: any) {
      toast({ title: 'Eroare', description: error.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Înapoi la lista experiențe
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to={`/provider/experience/${experience.experience_id}/edit`}>
              <Wrench className="h-3.5 w-3.5 mr-1" />
              Editează Experiența
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to={`/experience/${experience.experience_id}`} target="_blank">
              <ExternalLink className="h-3.5 w-3.5 mr-1" />
              Vezi pagina publică
            </Link>
          </Button>
        </div>
      </div>

      {/* ═══ LIVE PREVIEW SECTION ═══ */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-primary/5 to-accent/5 px-6 py-3 border-b border-border">
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <Eye className="h-4 w-4" />
            Preview Live — Cum vede clientul experiența ta
          </div>
        </div>
        <CardContent className="p-0">
          <div className="grid md:grid-cols-2">
            {/* Image Gallery Preview */}
            <div className="relative">
              {images.length > 0 ? (
                <>
                  <div className="aspect-[4/3] overflow-hidden bg-muted">
                    <img
                      src={currentImage?.image_url}
                      alt={exp.title}
                      className="w-full h-full object-cover transition-all duration-500"
                      style={{
                        objectPosition: currentImage
                          ? `${currentImage.focal_x}% ${currentImage.focal_y}%`
                          : 'center',
                      }}
                    />
                  </div>
                  {images.length > 1 && (
                    <div className="flex gap-1.5 p-3 overflow-x-auto">
                      {images.map((img, idx) => (
                        <button
                          key={img.id}
                          onClick={() => setPreviewImageIdx(idx)}
                          className={cn(
                            "w-16 h-12 rounded-lg overflow-hidden border-2 flex-shrink-0 transition-all",
                            idx === previewImageIdx ? "border-primary ring-1 ring-primary/30" : "border-transparent opacity-70 hover:opacity-100"
                          )}
                        >
                          <img
                            src={img.image_url}
                            alt=""
                            className="w-full h-full object-cover"
                            style={{ objectPosition: `${img.focal_x}% ${img.focal_y}%` }}
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="aspect-[4/3] bg-muted flex flex-col items-center justify-center text-muted-foreground">
                  <ImageIcon className="h-12 w-12 mb-2" />
                  <p className="text-sm">Nicio imagine încărcată</p>
                  <p className="text-xs">Adaugă imagini din editorul de experiențe</p>
                </div>
              )}
            </div>

            {/* Details Preview */}
            <div className="p-6 space-y-4">
              {/* Title & Location */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {fullExperience?.category_name && (
                    <Badge variant="secondary" className="text-xs">
                      <Tag className="h-3 w-3 mr-1" />
                      {fullExperience.category_name}
                    </Badge>
                  )}
                  <Badge variant={exp.is_active ? 'default' : 'destructive'} className="text-xs">
                    {exp.is_active ? 'Activ' : 'Inactiv'}
                  </Badge>
                </div>
                <h2 className="text-xl font-bold text-foreground mt-2">{exp.title}</h2>
                <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {exp.location_name}
                  {fullExperience?.address && ` · ${fullExperience.address}`}
                </div>
              </div>

              {/* Rating */}
              {fullExperience?.avg_rating && fullExperience.avg_rating > 0 && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 text-sm">
                    <Star className="h-4 w-4 fill-primary text-primary" />
                    <span className="font-semibold">{fullExperience.avg_rating}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    ({fullExperience.total_reviews} {fullExperience.total_reviews === 1 ? 'recenzie' : 'recenzii'})
                  </span>
                </div>
              )}

              {/* Price */}
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-primary">{exp.price} Lei</span>
                {fullExperience?.original_price && (
                  <span className="text-muted-foreground line-through">{fullExperience.original_price} Lei</span>
                )}
                <span className="text-sm text-muted-foreground">/ persoană</span>
              </div>

              {/* Quick Info Row */}
              <div className="flex flex-wrap gap-3 text-sm">
                <Badge variant="outline" className="flex items-center gap-1">
                  {exp.provider_type === 'accommodation' ? (
                    <><Building2 className="h-3 w-3" /> Cazare</>
                  ) : (
                    <><Wrench className="h-3 w-3" /> Serviciu</>
                  )}
                </Badge>
                {exp.duration_minutes && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {Math.floor(exp.duration_minutes / 60)}h{exp.duration_minutes % 60 > 0 ? ` ${exp.duration_minutes % 60}m` : ''}
                  </Badge>
                )}
                {fullExperience?.max_participants && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    Max {fullExperience.max_participants}
                  </Badge>
                )}
                {fullExperience?.min_age && (
                  <Badge variant="outline" className="text-xs">
                    {fullExperience.min_age}+ ani
                  </Badge>
                )}
              </div>

              <Separator />

              {/* Short Description */}
              {fullExperience?.short_description && (
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {fullExperience.short_description}
                </p>
              )}

              {/* Includes */}
              {fullExperience && fullExperience.includes.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-foreground mb-1.5 uppercase tracking-wide">Include</p>
                  <div className="flex flex-wrap gap-1.5">
                    {fullExperience.includes.map((item, idx) => (
                      <span key={idx} className="inline-flex items-center gap-1 text-xs bg-primary/5 text-primary px-2 py-1 rounded-full">
                        <CheckCircle2 className="h-3 w-3" />
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Services */}
              {services.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-foreground mb-1.5 uppercase tracking-wide">Servicii extra</p>
                  <div className="space-y-1">
                    {services.map((svc) => (
                      <div key={svc.id} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {svc.name}
                          {svc.is_required && <Badge variant="secondary" className="ml-1 text-[10px] px-1 py-0">Obligatoriu</Badge>}
                        </span>
                        <span className="font-medium text-foreground">+{svc.price} Lei</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ═══ AVAILABILITY SECTION ═══ */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Disponibilitate
            </CardTitle>
            <CardDescription>Sloturi individuale</CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Adaugă Slot
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adaugă Disponibilitate</DialogTitle>
                <DialogDescription>{exp.title}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Data</Label>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) => date < new Date()}
                    className="rounded-md border"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Ora început</Label>
                    <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Ora sfârșit</Label>
                    <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Participanți maximi</Label>
                  <Input type="number" value={maxParticipants} onChange={(e) => setMaxParticipants(parseInt(e.target.value))} min={1} max={100} />
                </div>
                <Button onClick={addSlot} className="w-full">Adaugă Disponibilitate</Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {slots.length === 0 ? (
            <p className="text-muted-foreground text-center py-6 text-sm">Nicio disponibilitate setată. Adaugă un slot mai sus.</p>
          ) : (
            <div className="space-y-2">
              {slots.map((slot) => (
                <div key={slot.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1 font-medium">
                      <CalendarDays className="h-4 w-4 text-muted-foreground" />
                      {new Date(slot.slot_date).toLocaleDateString('ro-RO')}
                    </span>
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                    </span>
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Users className="h-3.5 w-3.5" />
                      {slot.booked_participants}/{slot.max_participants}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={slot.is_available ? 'default' : 'secondary'} className="text-xs">
                      {slot.is_available ? 'Disponibil' : 'Plin'}
                    </Badge>
                    <Button variant="ghost" size="icon" onClick={() => onSlotDeleted(slot.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recurring availability */}
      <RecurringAvailability
        experienceId={experience.experience_id}
        experienceTitle={exp.title}
      />
    </div>
  );
}

/* ── Main Dashboard ── */
export default function ProviderDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [assignedExperiences, setAssignedExperiences] = useState<AssignedExperience[]>([]);
  const [availabilitySlots, setAvailabilitySlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [salesBookings, setSalesBookings] = useState<SalesBooking[]>([]);
  const [salesStats, setSalesStats] = useState({ totalSales: 0, totalRevenue: 0, totalBookings: 0 });
  const [userProfiles, setUserProfiles] = useState<Record<string, string>>({});
  const [activeExperienceId, setActiveExperienceId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('provider-availability')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'availability_slots' }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const { data: expData, error: expError } = await supabase
        .from('experience_providers')
        .select(`
          id, experience_id,
          experience:experiences (id, title, location_name, price, provider_type, duration_minutes, is_active)
        `)
        .eq('provider_user_id', user.id)
        .eq('is_active', true);

      if (expError) throw expError;
      setAssignedExperiences(expData || []);

      const { data: slotsData, error: slotsError } = await supabase
        .from('availability_slots')
        .select('*')
        .eq('provider_user_id', user.id)
        .gte('slot_date', new Date().toISOString().split('T')[0])
        .order('slot_date', { ascending: true });

      if (slotsError) throw slotsError;
      setAvailabilitySlots(slotsData || []);

      const experienceIds = (expData || []).map(e => e.experience_id);
      if (experienceIds.length > 0) {
        const { data: bookingsData } = await supabase
          .from('bookings')
          .select('id, booking_date, participants, total_price, status, created_at, user_id, experiences(title, location_name)')
          .in('experience_id', experienceIds)
          .order('booking_date', { ascending: false })
          .limit(100);

        const bData = bookingsData || [];
        setSalesBookings(bData as SalesBooking[]);

        const confirmed = bData.filter(b => b.status === 'confirmed' || b.status === 'completed');
        setSalesStats({
          totalSales: confirmed.length,
          totalRevenue: confirmed.reduce((sum, b) => sum + (b.total_price || 0), 0),
          totalBookings: bData.length,
        });

        const clientIds = [...new Set(bData.map(b => b.user_id))];
        if (clientIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .in('id', clientIds);
          const map: Record<string, string> = {};
          (profiles || []).forEach(p => { map[p.id] = p.full_name || p.email; });
          setUserProfiles(map);
        }
      }
    } catch (error: any) {
      toast({ title: 'Eroare', description: 'Nu am putut încărca datele', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const deleteSlot = async (slotId: string) => {
    try {
      const { error } = await supabase.from('availability_slots').delete().eq('id', slotId);
      if (error) throw error;
      toast({ title: 'Șters', description: 'Disponibilitatea a fost ștearsă' });
      fetchData();
    } catch (error: any) {
      toast({ title: 'Eroare', description: error.message, variant: 'destructive' });
    }
  };

  const handleBookingAction = async (bookingId: string, action: 'confirm' | 'decline') => {
    setActionLoading(bookingId);
    try {
      const { error } = await supabase.functions.invoke('process-availability-response', {
        body: { booking_id: bookingId, action }
      });
      if (error) throw error;
      
      toast({ 
        title: "Succes", 
        description: action === 'confirm' ? "Rezervarea a fost confirmată!" : "Rezervarea a fost respinsă."
      });
      fetchData();
    } catch (error: any) {
      toast({ title: 'Eroare', description: error.message || 'Eroare la procesarea rezervării', variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  const activeExperience = assignedExperiences.find(e => e.experience_id === activeExperienceId);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-24 pb-16 container">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
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
        <div className="container">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold">Dashboard Furnizor</h1>
              <p className="text-muted-foreground">Gestionează experiențele, disponibilitatea și rezervările</p>
            </div>
            <Button onClick={() => navigate('/provider/create')}>
              <PlusCircle className="h-4 w-4 mr-2" />
              Experiență Nouă
            </Button>
          </div>

          <Tabs defaultValue="sales" className="space-y-6">
            <TabsList>
              <TabsTrigger value="sales">
                <TrendingUp className="h-4 w-4 mr-1" />
                Vânzări
              </TabsTrigger>
              <TabsTrigger value="experiences">Experiențe</TabsTrigger>
              <TabsTrigger value="bookings">Rezervări</TabsTrigger>
              <TabsTrigger value="notifications">
                <Bell className="h-4 w-4 mr-1" />
                Notificări
              </TabsTrigger>
            </TabsList>

            {/* Sales Overview Tab */}
            <TabsContent value="sales">
              <div className="grid sm:grid-cols-3 gap-6 mb-6">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <BarChart3 className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Experiențe Vândute</p>
                        <p className="text-2xl font-bold">{salesStats.totalSales}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <CalendarDays className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total Rezervări</p>
                        <p className="text-2xl font-bold">{salesStats.totalBookings}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <TrendingUp className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Venit Total</p>
                        <p className="text-2xl font-bold">{salesStats.totalRevenue.toLocaleString()} Lei</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Istoric Rezervări</CardTitle>
                  <CardDescription>Toate rezervările pentru experiențele tale</CardDescription>
                </CardHeader>
                <CardContent>
                  {salesBookings.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">Nicio rezervare încă.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Experiență</TableHead>
                          <TableHead>Data Rezervării</TableHead>
                          <TableHead>Client</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Valoare</TableHead>
                          <TableHead className="text-right">Acțiuni</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {salesBookings.map((b) => (
                          <TableRow key={b.id}>
                            <TableCell className="font-medium">{b.experiences?.title || 'N/A'}</TableCell>
                            <TableCell>{format(new Date(b.booking_date), 'dd MMM yyyy', { locale: ro })}</TableCell>
                            <TableCell>{userProfiles[b.user_id] || 'N/A'}</TableCell>
                            <TableCell>
                              <Badge variant={
                                b.status === 'confirmed' ? 'default' :
                                b.status === 'completed' ? 'secondary' :
                                b.status === 'cancelled' ? 'destructive' : 'outline'
                              }>
                                {b.status === 'confirmed' ? 'Confirmată' :
                                 b.status === 'completed' ? 'Finalizată' :
                                 b.status === 'cancelled' ? 'Anulată' : 'În așteptare'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-medium">{b.total_price} Lei</TableCell>
                            <TableCell className="text-right">
                              {b.status === 'pending' && (
                                <div className="flex items-center justify-end gap-2">
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="h-8 px-2 text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700"
                                    onClick={() => handleBookingAction(b.id, 'confirm')} 
                                    disabled={actionLoading === b.id}
                                  >
                                    <CheckCircle2 className="w-4 h-4 mr-1" />
                                    Confirmă
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="h-8 px-2 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                                    onClick={() => handleBookingAction(b.id, 'decline')} 
                                    disabled={actionLoading === b.id}
                                  >
                                    <XCircle className="w-4 h-4 mr-1" />
                                    Respinge
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Experiences Tab — now with detail view */}
            <TabsContent value="experiences">
              {activeExperience ? (
                <ExperienceDetailView
                  experience={activeExperience}
                  availabilitySlots={availabilitySlots}
                  onBack={() => setActiveExperienceId(null)}
                  onSlotAdded={fetchData}
                  onSlotDeleted={deleteSlot}
                />
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {assignedExperiences.length === 0 ? (
                    <Card className="col-span-full">
                      <CardContent className="pt-6 text-center">
                        <p className="text-muted-foreground mb-4">Nu ai experiențe încă.</p>
                        <Button onClick={() => navigate('/provider/create')}>
                          <PlusCircle className="h-4 w-4 mr-2" />
                          Creează Prima Experiență
                        </Button>
                      </CardContent>
                    </Card>
                  ) : (
                    assignedExperiences.map((exp) => {
                      const slotCount = availabilitySlots.filter(s => s.experience_id === exp.experience_id).length;
                      return (
                        <Card
                          key={exp.id}
                          className="cursor-pointer hover:border-primary/50 transition-colors"
                          onClick={() => setActiveExperienceId(exp.experience_id)}
                        >
                          <CardContent className="pt-6">
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="font-semibold">{exp.experience?.title}</h4>
                              <Badge variant={exp.experience?.is_active ? 'default' : 'secondary'}>
                                {exp.experience?.is_active ? 'Activ' : 'Inactiv'}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{exp.experience?.location_name}</p>
                            <div className="flex items-center gap-3 mt-3">
                              <Badge variant="outline" className="flex items-center gap-1">
                                {exp.experience?.provider_type === 'accommodation' ? (
                                  <><Building2 className="h-3 w-3" /> Cazare</>
                                ) : (
                                  <><Wrench className="h-3 w-3" /> Serviciu</>
                                )}
                              </Badge>
                              {exp.experience?.duration_minutes && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {Math.floor(exp.experience.duration_minutes / 60)}h {exp.experience.duration_minutes % 60}m
                                </span>
                              )}
                            </div>
                            <div className="flex items-center justify-between mt-3">
                              <p className="text-lg font-bold text-primary">{exp.experience?.price} Lei</p>
                              <span className="text-xs text-muted-foreground">
                                {slotCount} {slotCount === 1 ? 'slot' : 'sloturi'} active
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </div>
              )}
            </TabsContent>

            {/* Bookings Tab */}
            <TabsContent value="bookings">
              <ProviderBookings />
            </TabsContent>

            {/* Notifications Tab */}
            <TabsContent value="notifications">
              <div className="space-y-6">
                <PushNotificationSettings />
                <NotificationsHistory />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
}
