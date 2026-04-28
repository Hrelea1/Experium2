import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useHomepageContent } from "@/hooks/useHomepageContent";
import { useLatestReviews } from "@/hooks/useReviews";

const fallbackTestimonials = [
  {
    id: "fallback-1",
    user_name: "Maria Popescu",
    location: "Craiova",
    user_avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face",
    rating: 5,
    comment: "Am oferit soțului meu zborul cu balonul de ziua lui și a fost cea mai frumoasă surpriză! Recomand cu încredere.",
    experience_title: "Zbor cu Balonul",
  },
  {
    id: "fallback-2",
    user_name: "Andrei Ionescu",
    location: "Cluj-Napoca",
    user_avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face",
    rating: 5,
    comment: "Experiența de rafting a fost incredibilă! Organizare impecabilă și ghizi profesioniști. Cu siguranță vom reveni.",
    experience_title: "Rafting pe Olt",
  },
  {
    id: "fallback-3",
    user_name: "Elena Dumitrescu",
    location: "Timișoara",
    user_avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face",
    rating: 5,
    comment: "Retreat-ul spa a fost exact ce aveam nevoie. Un cadou perfect de la prietena mea. Servicii excelente!",
    experience_title: "Spa & Wellness",
  },
];

export function Testimonials() {
  const { t } = useTranslation();
  const { data: content } = useHomepageContent("testimonials");
  const { data: latestReviews, isLoading } = useLatestReviews(3);
  
  const sectionContent = content?.content || {
    badge: "Recenzii",
    title: t('testimonials.title'),
    subtitle: t('testimonials.subtitle')
  };

  // Folosim recenziile reale dacă există, altfel afișăm fallback-ul pentru design
  const displayReviews = latestReviews && latestReviews.length > 0 
    ? latestReviews 
    : fallbackTestimonials;

  return (
    <section className="py-12 lg:py-16 bg-cream">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-4">
            {sectionContent.badge}
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            {sectionContent.title}
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            {sectionContent.subtitle}
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {displayReviews.map((testimonial, index) => (
            <motion.div
              key={testimonial.id || index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-card rounded-2xl p-6 lg:p-8 shadow-card border border-border/50 relative"
            >
              {/* Stars as text */}
              <div className="flex gap-1 mb-4 text-accent text-lg">
                {[...Array(testimonial.rating || 5)].map((_, i) => (
                  <span key={i}>★</span>
                ))}
              </div>

              {/* Text */}
              <p className="text-foreground mb-6 leading-relaxed">
                "{testimonial.comment}"
              </p>

              {/* Experience Tag */}
              <span className="inline-block px-3 py-1 rounded-full bg-muted text-muted-foreground text-sm mb-6">
                {testimonial.experience_title}
              </span>

              {/* Author */}
              <div className="flex items-center gap-3">
                {testimonial.user_avatar ? (
                  <img
                    src={testimonial.user_avatar}
                    alt={testimonial.user_name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                    {testimonial.user_name ? testimonial.user_name.charAt(0).toUpperCase() : 'C'}
                  </div>
                )}
                <div>
                  <div className="font-semibold text-foreground">{testimonial.user_name || "Client anonim"}</div>
                  <div className="text-muted-foreground text-sm">{(testimonial as any).location || "România"}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
