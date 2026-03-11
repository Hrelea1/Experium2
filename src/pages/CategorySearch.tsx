import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ExperienceImage } from "@/components/ExperienceImage";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { useRegions } from "@/hooks/useRegions";
import { RegionNotificationSignup } from "@/components/RegionNotificationSignup";

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
  experience_images: { image_url: string; is_primary: boolean; focal_x: number; focal_y: number }[];
}

const categoryTitles: Record<string, string> = {
  "spa-relaxare": "Relax & Spa",
  "gastronomie": "Gourmet",
  "aventura": "Adrenaline & Sport",
  "natura": "Natură",
  "toate-categoriile": "Toate Experiențele",
};

export default function CategorySearch() {
  const { category } = useParams<{ category: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("recommended");
  
  const categoryKey = category?.toLowerCase() || "";
  const regionParam = searchParams.get('region');
  
  const categoryTitle = categoryTitles[categoryKey] || "Toate Experiențele";

  // Filter States
  const [priceRange, setPriceRange] = useState<number[]>([0, 5000]);
  const [selectedRatings, setSelectedRatings] = useState<number[]>([]);
  const [selectedRegions, setSelectedRegions] = useState<string[]>(regionParam ? [regionParam.toLowerCase()] : []);
  const [selectedDurations, setSelectedDurations] = useState<string[]>([]);
  
  const { data: regions } = useRegions();

  // Handle region filter toggling
  const toggleRegion = (slug: string) => {
    setSelectedRegions(prev => 
      prev.includes(slug) ? prev.filter(r => r !== slug) : [...prev, slug]
    );
  };

  // Handle rating filter toggling
  const toggleRating = (rating: number) => {
    setSelectedRatings(prev => 
      prev.includes(rating) ? prev.filter(r => r !== rating) : [...prev, rating]
    );
  };

  // Handle duration filter toggling
  const toggleDuration = (val: string) => {
    setSelectedDurations(prev => 
      prev.includes(val) ? prev.filter(d => d !== val) : [...prev, val]
    );
  };

  useEffect(() => {
    const fetchExperiences = async () => {
      setLoading(true);
      try {
        let query = supabase
          .from('experiences')
          .select(`
            id,
            title,
            location_name,
            price,
            original_price,
            avg_rating,
            total_reviews,
            duration_minutes,
            categories (name, slug),
            regions (name, slug),
            experience_images (image_url, is_primary, focal_x, focal_y)
          `)
          .eq('is_active', true);

        if (categoryKey && categoryKey !== "toate-categoriile") {
          query = query.eq('categories.slug', categoryKey);
        }

        const { data, error } = await query;
        if (error) throw error;

        let filteredData = data || [];
        if (categoryKey && categoryKey !== "toate-categoriile") {
          filteredData = filteredData.filter(exp => exp.categories?.slug === categoryKey);
        }
        // Note: Initial DB fetch won't aggressively filter region if selectedRegions handles it in useMemo,
        // but to stay consistent with URL load, we fetch all for that category, then useMemo handles the sidebar filtering.

        setExperiences(filteredData);
      } catch (error: any) {
        console.error('Error fetching experiences:', error);
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
    
    // Filter by Price
    result = result.filter(exp => exp.price >= priceRange[0] && exp.price <= priceRange[1]);
    
    // Filter by Rating
    if (selectedRatings.length > 0) {
      result = result.filter(exp => {
        const rating = Math.floor(exp.avg_rating || 0);
        return selectedRatings.includes(rating);
      });
    }

    // Filter by Region
    if (selectedRegions.length > 0) {
      result = result.filter(exp => {
        const rSlug = exp.regions?.slug?.toLowerCase();
        const rName = exp.regions?.name?.toLowerCase();
        return selectedRegions.includes(rSlug || '') || selectedRegions.includes(rName || '');
      });
    }

    // Filter by Duration
    if (selectedDurations.length > 0) {
      result = result.filter(exp => {
        const mins = exp.duration_minutes || 0;
        if (selectedDurations.includes("short") && mins > 0 && mins <= 120) return true;
        if (selectedDurations.includes("medium") && mins > 120 && mins <= 240) return true;
        if (selectedDurations.includes("long") && mins > 240) return true;
        return false;
      });
    }

    // Sort
    switch (sortBy) {
      case "price-asc":
        return result.sort((a, b) => a.price - b.price);
      case "price-desc":
        return result.sort((a, b) => b.price - a.price);
      case "rating":
        return result.sort((a, b) => (b.avg_rating || 0) - (a.avg_rating || 0));
      default:
        return result;
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

  // Determine a friendly region name for display
  const regionDisplayName = regionParam 
    ? regionParam.charAt(0).toUpperCase() + regionParam.slice(1)
    : "";

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
              {loading ? "Se încarcă..." : `${filteredAndSortedExperiences.length} experiențe disponibile`}
            </p>
          </div>
        </div>

        {/* Results Section */}
        <div className="container py-10">
          <div className="flex flex-col lg:flex-row gap-8">
            
            {/* Sidebar Filters */}
            <aside className="w-full lg:w-1/4 space-y-8">
              {/* Region Filter */}
              <div className="bg-card rounded-2xl border border-border/50 p-6 shadow-sm">
                <h3 className="font-bold text-lg mb-4">Regiune</h3>
                <div className="space-y-3">
                  {regions?.map((region) => (
                    <div key={region.slug} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`region-${region.slug}`} 
                        checked={selectedRegions.includes(region.slug)}
                        onCheckedChange={() => toggleRegion(region.slug)}
                      />
                      <label htmlFor={`region-${region.slug}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer">
                        {region.name} <span className="text-muted-foreground text-xs font-normal">({region.experience_count || 0})</span>
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Price Filter */}
              <div className="bg-card rounded-2xl border border-border/50 p-6 shadow-sm">
                <h3 className="font-bold text-lg mb-4">Preț (lei)</h3>
                <Slider
                  defaultValue={[0, 5000]}
                  max={5000}
                  step={50}
                  value={priceRange}
                  onValueChange={setPriceRange}
                  className="mb-4"
                />
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{priceRange[0]} lei</span>
                  <span>{priceRange[1]} lei</span>
                </div>
              </div>

              {/* Rating Filter */}
              <div className="bg-card rounded-2xl border border-border/50 p-6 shadow-sm">
                <h3 className="font-bold text-lg mb-4">Rating minim</h3>
                <div className="space-y-3">
                  {[5, 4, 3].map((rating) => (
                    <div key={rating} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`rating-${rating}`}
                        checked={selectedRatings.includes(rating)}
                        onCheckedChange={() => toggleRating(rating)}
                      />
                      <label htmlFor={`rating-${rating}`} className="text-sm font-medium leading-none cursor-pointer flex items-center">
                        {Array.from({ length: rating }).map((_, i) => (
                          <span key={i} className="text-accent text-lg">★</span>
                        ))}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Duration Filter */}
              <div className="bg-card rounded-2xl border border-border/50 p-6 shadow-sm">
                <h3 className="font-bold text-lg mb-4">Durată</h3>
                <div className="space-y-3">
                  {[
                    { id: "short", label: "Sub 2 ore" },
                    { id: "medium", label: "2 - 4 ore" },
                    { id: "long", label: "Peste 4 ore" }
                  ].map((duration) => (
                    <div key={duration.id} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`duration-${duration.id}`}
                        checked={selectedDurations.includes(duration.id)}
                        onCheckedChange={() => toggleDuration(duration.id)}
                      />
                      <label htmlFor={`duration-${duration.id}`} className="text-sm font-medium leading-none cursor-pointer">
                        {duration.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </aside>

            {/* Main Content (List) */}
            <div className="w-full lg:w-3/4">
              {/* Sort Dropdown */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold hidden lg:block">Experiențe găsite</h2>
                <div className="flex items-center gap-4 ml-auto">
                  <span className="text-sm text-muted-foreground hidden sm:inline">
                    Sortare:
                  </span>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="recommended">Recomandate</SelectItem>
                      <SelectItem value="price-asc">Preț crescător</SelectItem>
                      <SelectItem value="price-desc">Preț descrescător</SelectItem>
                      <SelectItem value="rating">Rating</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Loading State */}
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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
                <Button onClick={() => navigate('/category/toate-categoriile')}>
                  Vezi toate experiențele
                </Button>
              </div>
            )
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            >
              {filteredAndSortedExperiences.map((exp, index) => (
                <motion.article
                  key={exp.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ y: -8 }}
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

                    {/* Discount Badge */}
                    {exp.original_price && (
                      <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                        -{Math.round((1 - exp.price / exp.original_price) * 100)}%
                      </span>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    {/* Location & Duration */}
                    <div className="flex items-center gap-3 text-muted-foreground text-xs mb-2">
                      <span>{exp.location_name}</span>
                      <span>{formatDuration(exp.duration_minutes)}</span>
                    </div>

                    {/* Title */}
                    <h3 className="font-bold text-foreground mb-2 group-hover:text-primary transition-colors line-clamp-2">
                      {exp.title}
                    </h3>

                    {/* Rating */}
                    <div className="flex items-center gap-1 mb-3">
                      <span className="text-accent">★</span>
                      <span className="font-semibold text-sm text-foreground">{exp.avg_rating?.toFixed(1) || "N/A"}</span>
                      <span className="text-muted-foreground text-xs">
                        ({exp.total_reviews || 0})
                      </span>
                    </div>

                    {/* Price */}
                    <div className="flex items-baseline gap-2">
                      <span className="text-xl font-bold text-primary">{exp.price} lei</span>
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
    </div>
  );
}
