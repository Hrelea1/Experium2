import { useState, useEffect } from "react";
import { Search, X, MapPin, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

interface SearchResult {
  id: string;
  title: string;
  location_name: string;
  price: number;
  category_name: string | null;
  image_url: string | null;
}

interface SearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SearchDialog({ open, onOpenChange }: SearchDialogProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;

    const fetchResults = async () => {
      setLoading(true);
      try {
        let q = supabase
          .from('experiences')
          .select('id, title, location_name, price, categories(name), experience_images(image_url, is_primary)')
          .eq('is_active', true)
          .order('is_featured', { ascending: false })
          .limit(8);

        if (query.trim()) {
          const term = `%${query.trim()}%`;
          q = q.or(`title.ilike.${term},location_name.ilike.${term}`);
        }

        const { data } = await q;

        const mapped: SearchResult[] = (data || []).map((exp: any) => {
          const primaryImg = exp.experience_images?.find((i: any) => i.is_primary);
          const firstImg = exp.experience_images?.[0];
          return {
            id: exp.id,
            title: exp.title,
            location_name: exp.location_name,
            price: exp.price,
            category_name: exp.categories?.name || null,
            image_url: primaryImg?.image_url || firstImg?.image_url || null,
          };
        });

        setResults(mapped);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(fetchResults, 200);
    return () => clearTimeout(debounce);
  }, [query, open]);

  const handleSelect = (id: string) => {
    navigate(`/experience/${id}`);
    onOpenChange(false);
    setQuery("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] p-0 gap-0">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="sr-only">Caută experiențe</DialogTitle>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Caută experiențe, locații..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10 pr-10 h-12 text-base bg-muted border-0"
              autoFocus
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </DialogHeader>

        <div className="max-h-[400px] overflow-y-auto px-6 pb-6">
          {loading ? (
            <div className="py-12 text-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto" />
            </div>
          ) : results.length > 0 ? (
            <div className="space-y-1">
              <AnimatePresence mode="popLayout">
                {results.map((exp) => (
                  <motion.button
                    key={exp.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    onClick={() => handleSelect(exp.id)}
                    className="w-full flex items-center gap-4 p-3 rounded-lg hover:bg-muted transition-colors text-left group"
                  >
                    {exp.image_url ? (
                      <img
                        src={exp.image_url}
                        alt={exp.title}
                        className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                        <Search className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-foreground group-hover:text-primary transition-colors truncate">
                        {exp.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        {exp.category_name && (
                          <Badge variant="secondary" className="text-xs">
                            {exp.category_name}
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                          <MapPin className="h-3 w-3" />
                          {exp.location_name}
                        </span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="font-semibold text-foreground">
                        {exp.price} Lei
                      </div>
                    </div>
                  </motion.button>
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <div className="py-12 text-center">
              <Search className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-muted-foreground">
                {query ? "Niciun rezultat găsit" : "Începe să cauți experiențe..."}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
