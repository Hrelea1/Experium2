import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { api } from "@/lib/api";
import { ExperienceImage } from "@/components/ExperienceImage";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Heart } from "lucide-react";

export default function Wishlist() {
  const [wishlists, setWishlists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const list = JSON.parse(localStorage.getItem('wishlists') || '[]');
    if (list.length === 0) {
      setLoading(false);
      return;
    }

    Promise.all(
      list.map((id: string) => 
        api.experiences.getById(id).catch(err => {
          console.error("Failed to load experience", id, err);
          return null;
        })
      )
    )
      .then(data => {
        setWishlists(data.filter(Boolean));
      })
      .finally(() => setLoading(false));
  }, []);

  const removeWishlist = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const list = JSON.parse(localStorage.getItem('wishlists') || '[]');
    const newList = list.filter((wId: string) => wId !== id);
    localStorage.setItem('wishlists', JSON.stringify(newList));
    setWishlists(prev => prev.filter(w => w.id !== id));
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 container pt-24 pb-16">
        <h1 className="text-3xl font-bold mb-6 flex items-center gap-3 text-foreground">
          <Heart className="w-8 h-8 text-primary fill-primary" />
          Experiențe Favorite
        </h1>
        {loading ? (
          <div className="flex items-center justify-center py-20">
             <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : wishlists.length === 0 ? (
          <div className="text-center py-20 bg-muted/30 rounded-xl border border-border/50">
             <Heart className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
             <p className="text-lg text-muted-foreground mb-4">Nu ai nicio experiență adăugată la favorite.</p>
             <button onClick={() => navigate('/category/toate-categoriile')} className="text-primary font-medium hover:underline">Explorează experiențe</button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {wishlists.map(exp => (
              <motion.article
                key={exp.id}
                onClick={() => navigate(`/experience/${exp.id}`)}
                className="group bg-card rounded-2xl overflow-hidden shadow-card hover:shadow-card-hover transition-all duration-300 border border-border/50 cursor-pointer flex flex-col relative"
              >
                <div className="relative h-48 overflow-hidden bg-muted">
                   <ExperienceImage
                     src={(exp.images?.[0]?.image_url || exp.primary_image || "https://images.unsplash.com/photo-1507608616759-54f48f0af0ee?w=600&h=400&fit=crop") as string}
                     alt={exp.title}
                     className="h-full w-full"
                     imgClassName="group-hover:scale-105 transition-transform duration-500"
                   />
                   <button 
                     onClick={(e) => removeWishlist(e, exp.id)}
                     className="absolute top-3 right-3 w-8 h-8 rounded-full bg-card/90 backdrop-blur-sm flex items-center justify-center hover:bg-card shadow-sm z-10"
                   >
                     <Heart className="w-4 h-4 fill-primary text-primary" />
                   </button>
                </div>
                <div className="p-4 flex flex-col flex-1">
                   <div className="flex items-center gap-3 text-muted-foreground text-xs mb-2">
                     <span>{exp.location_name}</span>
                   </div>
                   <h3 className="font-bold text-foreground mb-2 group-hover:text-primary transition-colors line-clamp-2">
                     {exp.title}
                   </h3>
                   <div className="mt-auto flex items-baseline gap-2 pt-4">
                     <span className="text-xl font-bold text-primary">
                       {exp.price} lei
                     </span>
                   </div>
                </div>
              </motion.article>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  )
}
