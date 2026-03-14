import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ExperienceImage } from "@/components/ExperienceImage";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { useRegions } from "@/hooks/useRegions";
import { RegionNotificationSignup } from "@/components/RegionNotificationSignup";
import {
  SlidersHorizontal,
  X,
  ChevronDown,
  Star,
  MapPin,
  Clock,
  DollarSign,
  RotateCcw,
  Check,
} from "lucide-react";

interface Experience {
  id: string;
  title: string;
  location_name: string;
  price: number;
  original_price?: number;
  avg_rating: number;
  total_reviews: number;
  duration_minutes?: number;
  categories: { name: string; slug: string } | null;
  regions: { name: string; slug: string } | null;
  experience_images: {
    image_url: string;
    is_primary: boolean;
    focal_x: number;
    focal_y: number;
  }[];
}

const categoryTitles: Record<string, string> = {
  "spa-relaxare": "Relax & Spa",
  gastronomie: "Gourmet",
  aventura: "Adrenaline & Sport",
  natura: "Natură",
  "toate-categoriile": "Toate Experiențele",
};

const durationOptions = [
  { id: "short", label: "Sub 2 ore", icon: "⚡" },
  { id: "medium", label: "2–4 ore", icon: "🕐" },
  { id: "long", label: "Peste 4 ore", icon: "🌅" },
];

// ─── Collapsible Filter Section ─────────────────────────────────────────────
function FilterSection({
  title,
  icon: Icon,
  defaultOpen = true,
  children,
}: {
  title: string;
  icon: React.ElementType;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-border last:border-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between py-4 text-left"
      >
        <span className="flex items-center gap-2.5 font-semibold text-foreground">
          <Icon className="w-4 h-4 text-primary" />
          {title}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-muted-foreground transition-transform duration-300 ${open ? "rotate-180" : ""}`}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="pb-5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Active Filter Chip ───────────────────────────────────────────────────────
function FilterChip({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.85 }}
      transition={{ duration: 0.15 }}
      className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-sm font-medium whitespace-nowrap"
    >
      {label}
      <button
        onClick={onRemove}
        className="flex items-center justify-center w-4 h-4 rounded-full hover:bg-primary/20 transition-colors"
      >
        <X className="w-2.5 h-2.5" />
      </button>
    </motion.span>
  );
}

// ─── The Filter Panel (used in both sidebar & sheet) ─────────────────────────
function FilterPanel({
  priceRange,
  setPriceRange,
  selectedRatings,
  toggleRating,
  selectedRegions,
  toggleRegion,
  selectedDurations,
  toggleDuration,
  regions,
  onReset,
  onApply,
  isSheet,
}: {
  priceRange: number[];
  setPriceRange: (v: number[]) => void;
  selectedRatings: number[];
  toggleRating: (r: number) => void;
  selectedRegions: string[];
  toggleRegion: (s: string) => void;
  selectedDurations: string[];
  toggleDuration: (d: string) => void;
  regions: { slug: string; name: string; experience_count?: number }[] | undefined;
  onReset: () => void;
  onApply?: () => void;
  isSheet?: boolean;
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Scrollable filter body */}
      <div className={`flex-1 overflow-y-auto ${isSheet ? "px-1" : ""}`}>
        {/* Region */}
        <FilterSection title="Regiune" icon={MapPin}>
          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
            {regions?.map((region) => (
              <label
                key={region.slug}
                className="flex items-center gap-3 cursor-pointer group py-1"
              >
                <div
                  className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-200 flex-shrink-0 ${
                    selectedRegions.includes(region.slug)
                      ? "bg-primary border-primary"
                      : "border-border group-hover:border-primary/60"
                  }`}
                >
                  {selectedRegions.includes(region.slug) && (
                    <Check className="w-3 h-3 text-primary-foreground" />
                  )}
                </div>
                <span className="text-sm text-foreground flex-1">
                  {region.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  ({region.experience_count || 0})
                </span>
                <Checkbox
                  id={`region-${region.slug}`}
                  checked={selectedRegions.includes(region.slug)}
                  onCheckedChange={() => toggleRegion(region.slug)}
                  className="hidden"
                />
              </label>
            ))}
          </div>
        </FilterSection>

        {/* Price */}
        <FilterSection title="Preț (lei)" icon={DollarSign}>
          <div className="space-y-4 pt-1">
            <Slider
              defaultValue={[0, 5000]}
              max={5000}
              step={50}
              value={priceRange}
              onValueChange={setPriceRange}
            />
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold bg-primary/10 text-primary px-3 py-1 rounded-full">
                {priceRange[0]} lei
              </span>
              <span className="text-muted-foreground text-xs">—</span>
              <span className="text-sm font-semibold bg-primary/10 text-primary px-3 py-1 rounded-full">
                {priceRange[1]} lei
              </span>
            </div>
          </div>
        </FilterSection>

        {/* Rating */}
        <FilterSection title="Rating minim" icon={Star}>
          <div className="flex flex-wrap gap-2 pt-1">
            {[5, 4, 3].map((rating) => {
              const active = selectedRatings.includes(rating);
              return (
                <button
                  key={rating}
                  onClick={() => toggleRating(rating)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-medium transition-all duration-200 ${
                    active
                      ? "bg-accent text-white border-accent shadow-sm"
                      : "border-border text-foreground hover:border-accent/60"
                  }`}
                >
                  {"★".repeat(rating)}
                  <span className="text-xs opacity-70">({rating}+)</span>
                </button>
              );
            })}
          </div>
        </FilterSection>

        {/* Duration */}
        <FilterSection title="Durată" icon={Clock} defaultOpen={false}>
          <div className="space-y-2 pt-1">
            {durationOptions.map((d) => {
              const active = selectedDurations.includes(d.id);
              return (
                <button
                  key={d.id}
                  onClick={() => toggleDuration(d.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all duration-200 text-left ${
                    active
                      ? "bg-primary/10 border-primary text-primary"
                      : "border-border text-foreground hover:border-primary/40 hover:bg-primary/5"
                  }`}
                >
                  <span className="text-base">{d.icon}</span>
                  <span className="flex-1">{d.label}</span>
                  {active && <Check className="w-4 h-4 ml-auto" />}
                </button>
              );
            })}
          </div>
        </FilterSection>
      </div>

      {/* Action Buttons (sheet only) */}
      {isSheet && (
        <div className="sticky bottom-0 bg-background border-t border-border pt-4 pb-safe-or-4 flex gap-3 mt-4">
          <Button
            variant="outline"
            className="flex-1 gap-2"
            onClick={onReset}
          >
            <RotateCcw className="w-4 h-4" />
            Resetează
          </Button>
          <Button className="flex-1" onClick={onApply}>
            Aplică filtrele
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CategorySearch() {
  const { category } = useParams<{ category: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("recommended");
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  const categoryKey = category?.toLowerCase() || "";
  const regionParam = searchParams.get("region");
  const categoryTitle = categoryTitles[categoryKey] || "Toate Experiențele";

  // Filter States
  const [priceRange, setPriceRange] = useState<number[]>([0, 5000]);
  const [selectedRatings, setSelectedRatings] = useState<number[]>([]);
  const [selectedRegions, setSelectedRegions] = useState<string[]>(
    regionParam ? [regionParam.toLowerCase()] : []
  );
  const [selectedDurations, setSelectedDurations] = useState<string[]>([]);

  const { data: regions } = useRegions();

  const toggleRegion = (slug: string) =>
    setSelectedRegions((prev) =>
      prev.includes(slug) ? prev.filter((r) => r !== slug) : [...prev, slug]
    );

  const toggleRating = (rating: number) =>
    setSelectedRatings((prev) =>
      prev.includes(rating) ? prev.filter((r) => r !== rating) : [...prev, rating]
    );

  const toggleDuration = (val: string) =>
    setSelectedDurations((prev) =>
      prev.includes(val) ? prev.filter((d) => d !== val) : [...prev, val]
    );

  const resetFilters = () => {
    setPriceRange([0, 5000]);
    setSelectedRatings([]);
    setSelectedRegions([]);
    setSelectedDurations([]);
  };

  useEffect(() => {
    const fetchExperiences = async () => {
      setLoading(true);
      try {
        let query = supabase
          .from("experiences")
          .select(
            `id, title, location_name, price, original_price, avg_rating, total_reviews, duration_minutes,
             categories (name, slug), regions (name, slug),
             experience_images (image_url, is_primary, focal_x, focal_y)`
          )
          .eq("is_active", true);

        if (categoryKey && categoryKey !== "toate-categoriile") {
          query = query.eq("categories.slug", categoryKey);
        }

        const { data, error } = await query;
        if (error) throw error;

        let filteredData = data || [];
        if (categoryKey && categoryKey !== "toate-categoriile") {
          filteredData = filteredData.filter(
            (exp) => exp.categories?.slug === categoryKey
          );
        }
        setExperiences(filteredData);
      } catch (error: any) {
        console.error("Error fetching experiences:", error);
        toast({
          title: "Eroare",
          description: "Nu am putut încărca experiențele",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    fetchExperiences();
  }, [categoryKey, regionParam, toast]);

  const filteredAndSortedExperiences = useMemo(() => {
    let result = [...experiences];
    result = result.filter(
      (exp) => exp.price >= priceRange[0] && exp.price <= priceRange[1]
    );
    if (selectedRatings.length > 0) {
      result = result.filter((exp) =>
        selectedRatings.includes(Math.floor(exp.avg_rating || 0))
      );
    }
    if (selectedRegions.length > 0) {
      result = result.filter((exp) => {
        const rSlug = exp.regions?.slug?.toLowerCase();
        const rName = exp.regions?.name?.toLowerCase();
        return (
          selectedRegions.includes(rSlug || "") ||
          selectedRegions.includes(rName || "")
        );
      });
    }
    if (selectedDurations.length > 0) {
      result = result.filter((exp) => {
        const mins = exp.duration_minutes || 0;
        if (selectedDurations.includes("short") && mins > 0 && mins <= 120) return true;
        if (selectedDurations.includes("medium") && mins > 120 && mins <= 240) return true;
        if (selectedDurations.includes("long") && mins > 240) return true;
        return false;
      });
    }
    switch (sortBy) {
      case "price-asc": return result.sort((a, b) => a.price - b.price);
      case "price-desc": return result.sort((a, b) => b.price - a.price);
      case "rating": return result.sort((a, b) => (b.avg_rating || 0) - (a.avg_rating || 0));
      default: return result;
    }
  }, [experiences, sortBy, priceRange, selectedRatings, selectedRegions, selectedDurations]);

  const formatDuration = (minutes?: number) => {
    if (!minutes) return "Variabil";
    if (minutes < 60) return `${minutes} min`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)} ore`;
    return `${Math.floor(minutes / 1440)} zile`;
  };

  const getExperienceImage = (exp: Experience) => {
    const primary = exp.experience_images?.find((img) => img.is_primary) || exp.experience_images?.[0];
    return {
      url: primary?.image_url || "https://images.unsplash.com/photo-1507608616759-54f48f0af0ee?w=600&h=400&fit=crop",
      focal_x: primary?.focal_x ?? 50,
      focal_y: primary?.focal_y ?? 50,
    };
  };

  const regionDisplayName = regionParam
    ? regionParam.charAt(0).toUpperCase() + regionParam.slice(1)
    : "";

  // Build active filter chips
  const activeChips = useMemo(() => {
    const chips: { key: string; label: string; onRemove: () => void }[] = [];
    if (priceRange[0] > 0 || priceRange[1] < 5000) {
      chips.push({
        key: "price",
        label: `${priceRange[0]}–${priceRange[1]} lei`,
        onRemove: () => setPriceRange([0, 5000]),
      });
    }
    selectedRegions.forEach((slug) => {
      const r = regions?.find((x) => x.slug === slug);
      chips.push({
        key: `region-${slug}`,
        label: r?.name || slug,
        onRemove: () => toggleRegion(slug),
      });
    });
    selectedRatings.forEach((rating) => {
      chips.push({
        key: `rating-${rating}`,
        label: `${"★".repeat(rating)}+`,
        onRemove: () => toggleRating(rating),
      });
    });
    selectedDurations.forEach((d) => {
      const opt = durationOptions.find((o) => o.id === d);
      chips.push({
        key: `dur-${d}`,
        label: opt?.label || d,
        onRemove: () => toggleDuration(d),
      });
    });
    return chips;
  }, [priceRange, selectedRegions, selectedRatings, selectedDurations, regions]);

  const activeFilterCount = activeChips.length;

  const filterPanelProps = {
    priceRange,
    setPriceRange,
    selectedRatings,
    toggleRating,
    selectedRegions,
    toggleRegion,
    selectedDurations,
    toggleDuration,
    regions,
    onReset: resetFilters,
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-20">
        {/* Hero Banner */}
        <div className="bg-gradient-to-r from-primary to-coral-dark py-12 lg:py-16">
          <div className="container">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-3xl lg:text-5xl font-bold text-primary-foreground mb-2"
            >
              {regionParam ? `${categoryTitle} - ${regionDisplayName}` : categoryTitle}
            </motion.h1>
            <p className="text-primary-foreground/80 text-lg">
              {loading
                ? "Se încarcă..."
                : `${filteredAndSortedExperiences.length} experiențe disponibile`}
            </p>
          </div>
        </div>

        {/* Results Section */}
        <div className="container py-8 lg:py-10">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* ── Desktop Sidebar ────────────────────────────────── */}
            <aside className="hidden lg:block w-64 xl:w-72 flex-shrink-0">
              <div className="bg-card rounded-2xl border border-border/60 shadow-sm p-5 sticky top-24 max-h-[calc(100vh-120px)] overflow-y-auto">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-primary" />
                    Filtre
                    {activeFilterCount > 0 && (
                      <span className="ml-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                        {activeFilterCount}
                      </span>
                    )}
                  </h3>
                  {activeFilterCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={resetFilters}
                      className="text-xs gap-1 h-7 text-muted-foreground hover:text-primary"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Resetează
                    </Button>
                  )}
                </div>
                <FilterPanel {...filterPanelProps} isSheet={false} />
              </div>
            </aside>

            {/* ── Main Content ───────────────────────────────────── */}
            <div className="flex-1 min-w-0">
              {/* Sort bar + mobile filter trigger */}
              <div className="flex items-center justify-between gap-3 mb-4">
                {/* Mobile filter button */}
                <Button
                  variant="outline"
                  className="lg:hidden flex items-center gap-2 relative"
                  onClick={() => setFilterSheetOpen(true)}
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  <span>Filtre</span>
                  <AnimatePresence>
                    {activeFilterCount > 0 && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shadow-md"
                      >
                        {activeFilterCount}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Button>

                <h2 className="text-base font-semibold hidden lg:block text-muted-foreground">
                  {filteredAndSortedExperiences.length} experiențe
                </h2>

                <div className="flex items-center gap-2 ml-auto">
                  <span className="text-sm text-muted-foreground hidden sm:inline">
                    Sortează:
                  </span>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-[160px] h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="recommended">Recomandate</SelectItem>
                      <SelectItem value="price-asc">Preț ↑</SelectItem>
                      <SelectItem value="price-desc">Preț ↓</SelectItem>
                      <SelectItem value="rating">Rating</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Active Filter Chips */}
              <AnimatePresence>
                {activeChips.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden mb-5"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <AnimatePresence mode="popLayout">
                        {activeChips.map((chip) => (
                          <FilterChip
                            key={chip.key}
                            label={chip.label}
                            onRemove={chip.onRemove}
                          />
                        ))}
                      </AnimatePresence>
                      <button
                        onClick={resetFilters}
                        className="text-xs text-muted-foreground hover:text-primary underline-offset-2 hover:underline transition-colors"
                      >
                        Șterge toate
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Loading State */}
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : filteredAndSortedExperiences.length === 0 ? (
                regionParam ? (
                  <RegionNotificationSignup
                    regionSlug={regionParam}
                    regionName={regionDisplayName}
                  />
                ) : (
                  <div className="text-center py-20">
                    <p className="text-muted-foreground text-lg mb-4">
                      Nu am găsit experiențe în această categorie.
                    </p>
                    <Button onClick={() => navigate("/category/toate-categoriile")}>
                      Vezi toate experiențele
                    </Button>
                  </div>
                )
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5 lg:gap-6"
                >
                  {filteredAndSortedExperiences.map((exp, index) => (
                    <motion.article
                      key={exp.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      whileHover={{ y: -6 }}
                      onClick={() => navigate(`/experience/${exp.id}`)}
                      className="group bg-card rounded-2xl overflow-hidden shadow-card hover:shadow-card-hover transition-all duration-300 border border-border/50 cursor-pointer"
                    >
                      {/* Image */}
                      <div className="relative h-48 overflow-hidden">
                        {(() => {
                          const img = getExperienceImage(exp);
                          return (
                            <ExperienceImage
                              src={img.url}
                              alt={exp.title}
                              focalX={img.focal_x}
                              focalY={img.focal_y}
                              className="h-full w-full"
                              imgClassName="group-hover:scale-110 transition-transform duration-500"
                            />
                          );
                        })()}
                        {exp.original_price && (
                          <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold shadow">
                            -{Math.round((1 - exp.price / exp.original_price) * 100)}%
                          </span>
                        )}
                      </div>

                      {/* Content */}
                      <div className="p-4">
                        <div className="flex items-center gap-3 text-muted-foreground text-xs mb-2">
                          <span>{exp.location_name}</span>
                          <span>{formatDuration(exp.duration_minutes)}</span>
                        </div>
                        <h3 className="font-bold text-foreground mb-2 group-hover:text-primary transition-colors line-clamp-2">
                          {exp.title}
                        </h3>
                        <div className="flex items-center gap-1 mb-3">
                          <span className="text-accent">★</span>
                          <span className="font-semibold text-sm text-foreground">
                            {exp.avg_rating?.toFixed(1) || "N/A"}
                          </span>
                          <span className="text-muted-foreground text-xs">
                            ({exp.total_reviews || 0})
                          </span>
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-xl font-bold text-primary">
                            {exp.price} lei
                          </span>
                          {exp.original_price && (
                            <span className="text-muted-foreground line-through text-sm">
                              {exp.original_price} lei
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.article>
                  ))}
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />

      {/* ── Mobile Filter Bottom Sheet ─────────────────────────── */}
      <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
        <SheetContent
          side="bottom"
          className="h-[90dvh] rounded-t-3xl flex flex-col px-5 pt-5 pb-0"
        >
          <SheetHeader className="flex-row items-center justify-between pb-2 mb-0">
            <SheetTitle className="flex items-center gap-2 text-lg">
              <SlidersHorizontal className="w-4 h-4 text-primary" />
              Filtre
              {activeFilterCount > 0 && (
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                  {activeFilterCount}
                </span>
              )}
            </SheetTitle>
          </SheetHeader>

          {/* Drag handle hint */}
          <div className="w-10 h-1 rounded-full bg-border mx-auto -mt-2 mb-4" />

          {/* Scrollable filter content */}
          <div className="flex-1 overflow-hidden flex flex-col -mx-1 px-1">
            <FilterPanel
              {...filterPanelProps}
              isSheet={true}
              onApply={() => setFilterSheetOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
