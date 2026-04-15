import { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  ChevronLeft, ChevronRight, Calendar, Clock, Users, Check,
  Zap, RotateCcw, AlertCircle, Lock, Unlock, Settings
} from 'lucide-react';
import {
  format, addDays, startOfWeek, endOfWeek, eachDayOfInterval,
  isSameDay, isSameMonth, addMonths, subMonths, startOfMonth,
  endOfMonth, isToday, isPast, parseISO,
} from 'date-fns';
import { ro } from 'date-fns/locale';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────
interface Slot {
  id: string;
  experience_id: string;
  slot_date: string;
  start_time: string;
  end_time: string;
  max_participants: number;
  booked_participants: number;
  is_available: boolean;
  is_locked?: boolean;
}

interface ScheduleConfig {
  workDays: number[];           // 0=Sun … 6=Sat
  workStart: string;            // "09:00"
  workEnd: string;              // "17:00"
  durationMinutes: number;
  breakMinutes: number;
  capacity: number;
  weeksAhead: number;
}

interface Props {
  experienceId: string;
  experienceTitle: string;
  durationMinutes?: number;     // passed from experience data
  onSlotsUpdated?: () => void;
}

const DAY_LABELS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
const DAY_NAMES  = ['Duminică', 'Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă'];

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────
function timeToMinutes(t: string) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}
function minutesToTime(m: number) {
  const hh = Math.floor(m / 60).toString().padStart(2, '0');
  const mm = (m % 60).toString().padStart(2, '0');
  return `${hh}:${mm}`;
}

function computeSlots(cfg: ScheduleConfig): { start: string; end: string }[] {
  const startMin = timeToMinutes(cfg.workStart);
  const endMin   = timeToMinutes(cfg.workEnd);
  const step     = cfg.durationMinutes + cfg.breakMinutes;
  const slots: { start: string; end: string }[] = [];
  for (let cur = startMin; cur + cfg.durationMinutes <= endMin; cur += step) {
    slots.push({ start: minutesToTime(cur), end: minutesToTime(cur + cfg.durationMinutes) });
  }
  return slots;
}

// ─────────────────────────────────────────────────────────
// Step 1 — Schedule Wizard
// ─────────────────────────────────────────────────────────
function ScheduleWizard({
  initialDuration,
  onGenerate,
}: {
  initialDuration: number;
  onGenerate: (cfg: ScheduleConfig) => void;
}) {
  const [cfg, setCfg] = useState<ScheduleConfig>({
    workDays: [1, 2, 3, 4, 5],
    workStart: '09:00',
    workEnd: '17:00',
    durationMinutes: initialDuration || 60,
    breakMinutes: 0,
    capacity: 10,
    weeksAhead: 4,
  });

  const preview = useMemo(() => computeSlots(cfg), [cfg]);

  const toggleDay = (d: number) =>
    setCfg(p => ({
      ...p,
      workDays: p.workDays.includes(d) ? p.workDays.filter(x => x !== d) : [...p.workDays, d].sort(),
    }));

  return (
    <div className="space-y-8">
      {/* Work days */}
      <div className="space-y-3">
        <Label className="text-base font-semibold flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" /> Zilele de activitate
        </Label>
        <div className="flex gap-2 flex-wrap">
          {DAY_NAMES.map((name, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => toggleDay(idx)}
              className={cn(
                'px-4 py-2 rounded-full text-sm font-medium border-2 transition-all duration-200',
                cfg.workDays.includes(idx)
                  ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                  : 'bg-background text-muted-foreground border-border hover:border-primary/50'
              )}
            >
              {name.slice(0, 3)}
            </button>
          ))}
        </div>
      </div>

      {/* Working hours */}
      <div className="space-y-3">
        <Label className="text-base font-semibold flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" /> Orele de funcționare
        </Label>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Deschidere</Label>
            <Input
              type="time"
              value={cfg.workStart}
              onChange={e => setCfg(p => ({ ...p, workStart: e.target.value }))}
              className="text-center font-mono text-lg"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Închidere</Label>
            <Input
              type="time"
              value={cfg.workEnd}
              onChange={e => setCfg(p => ({ ...p, workEnd: e.target.value }))}
              className="text-center font-mono text-lg"
            />
          </div>
        </div>
      </div>

      {/* Duration & break */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-base font-semibold flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" /> Durata experienței (min)
          </Label>
          <Input
            type="number"
            min={15} step={15}
            value={cfg.durationMinutes}
            onChange={e => setCfg(p => ({ ...p, durationMinutes: Math.max(15, parseInt(e.target.value) || 60) }))}
            className="text-center font-mono text-lg"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-base font-semibold flex items-center gap-2">
            <RotateCcw className="h-4 w-4 text-primary" /> Pauză între sloturi (min)
          </Label>
          <Input
            type="number"
            min={0} step={5}
            value={cfg.breakMinutes}
            onChange={e => setCfg(p => ({ ...p, breakMinutes: Math.max(0, parseInt(e.target.value) || 0) }))}
            className="text-center font-mono text-lg"
          />
        </div>
      </div>

      {/* Capacity & weeks */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-base font-semibold flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" /> Participanți / slot
          </Label>
          <Input
            type="number"
            min={1} max={500}
            value={cfg.capacity}
            onChange={e => setCfg(p => ({ ...p, capacity: Math.max(1, parseInt(e.target.value) || 10) }))}
            className="text-center font-mono text-lg"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-base font-semibold flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" /> Generează (săptămâni)
          </Label>
          <Input
            type="number"
            min={1} max={12}
            value={cfg.weeksAhead}
            onChange={e => setCfg(p => ({ ...p, weeksAhead: Math.max(1, Math.min(12, parseInt(e.target.value) || 4)) }))}
            className="text-center font-mono text-lg"
          />
        </div>
      </div>

      {/* Live preview */}
      {preview.length > 0 ? (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
          <p className="text-sm font-semibold text-primary mb-3 flex items-center gap-1.5">
            <Check className="h-4 w-4" />
            {preview.length} sloturi / zi activă — previzualizare:
          </p>
          <div className="flex flex-wrap gap-2">
            {preview.map((s, i) => (
              <Badge key={i} variant="secondary" className="font-mono text-xs">
                {s.start} – {s.end}
              </Badge>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Total estimat: <strong>{preview.length * cfg.workDays.length * cfg.weeksAhead}</strong> sloturi pe {cfg.weeksAhead} săptămâni
          </p>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg p-3">
          <AlertCircle className="h-4 w-4" />
          Verifică orele de funcționare — nu există timp suficient pentru niciun slot.
        </div>
      )}

      <Button
        className="w-full h-12 text-base"
        disabled={preview.length === 0 || cfg.workDays.length === 0}
        onClick={() => onGenerate(cfg)}
      >
        <Zap className="h-5 w-5 mr-2" />
        Generează calendar
      </Button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Slot pill
// ─────────────────────────────────────────────────────────
function SlotPill({
  slot,
  pending,
  onToggle,
}: {
  slot: Slot;
  pending: boolean;
  onToggle: () => void;
}) {
  const booked     = slot.booked_participants > 0;
  const locked     = slot.is_locked || !slot.is_available;
  const pct        = Math.round((slot.booked_participants / Math.max(1, slot.max_participants)) * 100);

  return (
    <button
      type="button"
      disabled={booked || pending}
      onClick={onToggle}
      title={
        booked    ? `Rezervat (${slot.booked_participants} / ${slot.max_participants})` :
        locked    ? 'Indisponibil — apasă pentru a reactiva' :
                    'Disponibil — apasă pentru a bloca'
      }
      className={cn(
        'relative w-full text-left px-2 py-1.5 rounded-md border text-[10px] font-medium transition-all duration-200 select-none overflow-hidden',
        pending && 'opacity-50 cursor-wait',
        booked
          ? 'bg-orange-100 dark:bg-orange-900/30 border-orange-300 dark:border-orange-700 text-orange-800 dark:text-orange-200 cursor-not-allowed'
          : locked
          ? 'bg-muted/70 border-border text-muted-foreground hover:bg-destructive/10 hover:border-destructive/40'
          : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 hover:bg-destructive/10 hover:border-destructive/40'
      )}
    >
      {/* Booking fill indicator */}
      {booked && (
        <div
          className="absolute inset-0 bg-orange-300/30 dark:bg-orange-500/20"
          style={{ width: `${pct}%` }}
        />
      )}
      <span className="relative flex items-center justify-between gap-1">
        <span className="font-mono leading-none">{slot.start_time.slice(0, 5)}</span>
        {booked ? (
          <Users className="h-2.5 w-2.5 flex-shrink-0" />
        ) : locked ? (
          <Lock className="h-2.5 w-2.5 flex-shrink-0 opacity-60" />
        ) : (
          <Unlock className="h-2.5 w-2.5 flex-shrink-0 opacity-40" />
        )}
      </span>
    </button>
  );
}

// ─────────────────────────────────────────────────────────
// Calendar view
// ─────────────────────────────────────────────────────────
function CalendarView({
  slots,
  pendingIds,
  onToggleSlot,
  onRefetch,
}: {
  slots: Slot[];
  pendingIds: Set<string>;
  onToggleSlot: (slot: Slot) => void;
  onRefetch: () => void;
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [zoom, setZoom] = useState<'month' | 'week'>('month');

  const monthStart = startOfMonth(currentMonth);
  const monthEnd   = endOfMonth(currentMonth);
  const calStart   = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd     = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = zoom === 'month'
    ? eachDayOfInterval({ start: calStart, end: calEnd })
    : eachDayOfInterval({
        start: startOfWeek(new Date(), { weekStartsOn: 1 }),
        end:   endOfWeek(addDays(new Date(), 6), { weekStartsOn: 1 }),
      });

  const slotsByDate = useMemo(() => {
    const map = new Map<string, Slot[]>();
    slots.forEach(s => {
      const k = s.slot_date;
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(s);
    });
    map.forEach(arr => arr.sort((a, b) => a.start_time.localeCompare(b.start_time)));
    return map;
  }, [slots]);

  return (
    <div className="space-y-4">
      {/* Header controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="font-semibold text-lg w-44 text-center capitalize">
            {format(currentMonth, 'MMMM yyyy', { locale: ro })}
          </h3>
          <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border overflow-hidden">
            <button
              type="button"
              onClick={() => setZoom('week')}
              className={cn('px-3 py-1.5 text-xs font-medium transition-colors', zoom === 'week' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted')}
            >
              Săptămână
            </button>
            <button
              type="button"
              onClick={() => setZoom('month')}
              className={cn('px-3 py-1.5 text-xs font-medium transition-colors', zoom === 'month' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted')}
            >
              Lună
            </button>
          </div>
          <Button variant="outline" size="sm" onClick={onRefetch}>
            <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reîncarcă
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-emerald-400 inline-block" /> Disponibil
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-muted inline-block border" /> Blocat
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-orange-400 inline-block" /> Rezervat
        </span>
        <span className="ml-auto italic">Atinge un slot de 2 ori pentru a-l bloca / debloca</span>
      </div>

      {/* Day-of-week header */}
      <div className="grid grid-cols-7 gap-px">
        {['Lun', 'Mar', 'Mie', 'Joi', 'Vin', 'Sâm', 'Dum'].map(d => (
          <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-px bg-border rounded-xl overflow-hidden border">
        {days.map(day => {
          const key       = format(day, 'yyyy-MM-dd');
          const daySlots  = slotsByDate.get(key) || [];
          const isOwn     = isSameMonth(day, currentMonth) || zoom === 'week';
          const past      = isPast(day) && !isToday(day);
          const todayMark = isToday(day);

          const available = daySlots.filter(s => !s.is_locked && s.is_available).length;
          const locked    = daySlots.filter(s => s.is_locked || !s.is_available).length;
          const booked    = daySlots.filter(s => s.booked_participants > 0).length;

          return (
            <div
              key={key}
              className={cn(
                'bg-background min-h-[90px] p-1.5 flex flex-col gap-1',
                !isOwn && 'opacity-30',
                past && 'opacity-40',
              )}
            >
              {/* Day number */}
              <div className={cn(
                'text-xs font-semibold self-start w-6 h-6 flex items-center justify-center rounded-full',
                todayMark ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
              )}>
                {format(day, 'd')}
              </div>

              {/* Slot pills */}
              <div className="flex flex-col gap-0.5 flex-1">
                {daySlots.length === 0 && !past && isOwn && (
                  <span className="text-[9px] text-muted-foreground/50 text-center mt-1">—</span>
                )}
                {daySlots.slice(0, 6).map(s => (
                  <SlotPill
                    key={s.id}
                    slot={s}
                    pending={pendingIds.has(s.id)}
                    onToggle={() => onToggleSlot(s)}
                  />
                ))}
                {daySlots.length > 6 && (
                  <span className="text-[9px] text-muted-foreground text-center">+{daySlots.length - 6} mai mult</span>
                )}
              </div>

              {/* Day summary badges */}
              {daySlots.length > 0 && (
                <div className="flex gap-0.5 flex-wrap mt-auto">
                  {available > 0 && <span className="text-[9px] bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-1 rounded">{available}✓</span>}
                  {locked > 0    && <span className="text-[9px] bg-muted text-muted-foreground px-1 rounded">{locked}✕</span>}
                  {booked > 0    && <span className="text-[9px] bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 px-1 rounded">{booked}⚑</span>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Main AvailabilityManager
// ─────────────────────────────────────────────────────────
export function AvailabilityManager({ experienceId, experienceTitle, durationMinutes = 60, onSlotsUpdated }: Props) {
  const { toast } = useToast();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [view, setView] = useState<'wizard' | 'calendar'>('calendar');

  const fetchSlots = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.provider.getAvailabilitySlots(format(new Date(), 'yyyy-MM-dd'));
      // Filter to this experience only
      setSlots((data || []).filter((s: any) => s.experience_id === experienceId));
    } catch {
      toast({ title: 'Eroare', description: 'Nu am putut încărca sloturile', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [experienceId]);

  useEffect(() => { fetchSlots(); }, [fetchSlots]);

  const handleGenerate = async (cfg: ScheduleConfig) => {
    setGenerating(true);
    try {
      const slotTimes = computeSlots(cfg);
      const today     = new Date();
      const end       = addDays(today, cfg.weeksAhead * 7);
      const allDays   = eachDayOfInterval({ start: today, end });

      const slotsToCreate = allDays.flatMap(day => {
        const dow = day.getDay(); // 0=Sun
        if (!cfg.workDays.includes(dow)) return [];
        return slotTimes.map(t => ({
          slot_date:  format(day, 'yyyy-MM-dd'),
          start_time: t.start,
          end_time:   t.end,
          capacity:   cfg.capacity,
        }));
      });

      if (slotsToCreate.length === 0) {
        toast({ title: 'Nimic de generat', description: 'Nicio zi activă găsită', variant: 'destructive' });
        return;
      }

      const res = await api.provider.bulkAddSlots({ experience_id: experienceId, slots: slotsToCreate });
      toast({ title: '🎉 Calendar generat!', description: `${res.inserted || slotsToCreate.length} sloturi create.` });
      setView('calendar');
      await fetchSlots();
      onSlotsUpdated?.();
    } catch (err: any) {
      toast({ title: 'Eroare', description: err.message || 'Generare eșuată', variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  const handleToggleSlot = async (slot: Slot) => {
    if (pendingIds.has(slot.id)) return;
    setPendingIds(p => new Set([...p, slot.id]));

    const isLocked = slot.is_locked || !slot.is_available;
    try {
      if (isLocked) {
        await api.provider.unlockSlot(slot.id);
        setSlots(prev => prev.map(s =>
          s.id === slot.id ? { ...s, is_locked: false, is_available: true } : s
        ));
      } else {
        await api.provider.lockSlot(slot.id);
        setSlots(prev => prev.map(s =>
          s.id === slot.id ? { ...s, is_locked: true, is_available: false } : s
        ));
      }
    } catch {
      toast({ title: 'Eroare', description: 'Operațiunea a eșuat', variant: 'destructive' });
    } finally {
      setPendingIds(p => { const n = new Set(p); n.delete(slot.id); return n; });
    }
  };

  const stats = useMemo(() => ({
    total:     slots.length,
    available: slots.filter(s => !s.is_locked && s.is_available).length,
    booked:    slots.filter(s => s.booked_participants > 0).length,
    blocked:   slots.filter(s => s.is_locked || !s.is_available).length,
  }), [slots]);

  return (
    <Card className="overflow-hidden">
      {/* Top bar */}
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 border-b px-6 py-4 flex items-center justify-between">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            Calendar Disponibilitate
          </CardTitle>
          <CardDescription className="mt-0.5">{experienceTitle}</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={view === 'wizard' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView(view === 'wizard' ? 'calendar' : 'wizard')}
          >
            <Settings className="h-3.5 w-3.5 mr-1" />
            {view === 'wizard' ? 'Înapoi la calendar' : 'Configurare program'}
          </Button>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-4 divide-x border-b text-center">
        {[
          { label: 'Total sloturi', value: stats.total,     color: 'text-foreground' },
          { label: 'Disponibile',   value: stats.available, color: 'text-emerald-600' },
          { label: 'Rezervate',     value: stats.booked,    color: 'text-orange-500' },
          { label: 'Blocate',       value: stats.blocked,   color: 'text-muted-foreground' },
        ].map(s => (
          <div key={s.label} className="py-3 px-2">
            <p className={cn('text-xl font-bold', s.color)}>{s.value}</p>
            <p className="text-[10px] text-muted-foreground leading-tight">{s.label}</p>
          </div>
        ))}
      </div>

      <CardContent className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : view === 'wizard' ? (
          <div className="max-w-lg mx-auto">
            <div className="mb-6">
              <h3 className="text-lg font-semibold">Configurează programul</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Setează orele de funcționare și vom genera automat toate sloturile disponibile pe calendarul tău.
              </p>
            </div>
            <ScheduleWizard initialDuration={durationMinutes} onGenerate={handleGenerate} />
            {generating && (
              <div className="flex items-center justify-center gap-2 mt-4 text-sm text-muted-foreground">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                Se generează sloturile…
              </div>
            )}
          </div>
        ) : slots.length === 0 ? (
          <div className="text-center py-16 space-y-4">
            <Calendar className="h-12 w-12 text-muted-foreground/40 mx-auto" />
            <div>
              <p className="font-medium">Nicio disponibilitate setată</p>
              <p className="text-sm text-muted-foreground mt-1">
                Folosește butonul „Configurare program" pentru a genera automat sloturile.
              </p>
            </div>
            <Button onClick={() => setView('wizard')}>
              <Settings className="h-4 w-4 mr-2" /> Configurează programul
            </Button>
          </div>
        ) : (
          <CalendarView
            slots={slots}
            pendingIds={pendingIds}
            onToggleSlot={handleToggleSlot}
            onRefetch={fetchSlots}
          />
        )}
      </CardContent>
    </Card>
  );
}
