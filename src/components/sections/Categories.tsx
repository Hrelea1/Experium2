import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useHomepageContent } from "@/hooks/useHomepageContent";

const categories = [
  {
    titleKey: "categories.spa",
    slug: "spa-relaxare",
    descKey: "categories.spaDesc",
    count: 24,
    color: "from-cyan-500/80 to-blue-500/80",
    image: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?q=80&w=800&auto=format&fit=crop"
  },
  {
    titleKey: "categories.gastronomy",
    slug: "gastronomie",
    descKey: "categories.gastronomyDesc",
    count: 18,
    color: "from-amber-500/80 to-orange-500/80",
    image: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=800&auto=format&fit=crop"
  },
  {
    titleKey: "categories.adventure",
    slug: "aventura",
    descKey: "categories.adventureDesc",
    count: 32,
    color: "from-orange-500/80 to-red-500/80",
    image: "https://images.unsplash.com/photo-1530866495561-507c9faab2ed?q=80&w=800&auto=format&fit=crop"
  },
  {
    titleKey: "categories.nature",
    slug: "natura",
    descKey: "categories.natureDesc",
    count: 45,
    color: "from-teal-500/80 to-green-500/80",
    image: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?q=80&w=800&auto=format&fit=crop"
  }
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
    },
  },
};

export function Categories() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { data: content } = useHomepageContent("categories");
  
  const sectionContent = content?.content || {
    badge: "Categorii",
    title: t('categories.title'),
    subtitle: t('categories.subtitle')
  };

  return (
    <section id="categories" className="py-12 lg:py-16 bg-background">
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

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {categories.map((category) => (
            <motion.div
              key={category.titleKey}
              onClick={() => navigate(`/category/${category.slug}`)}
              variants={itemVariants}
              whileHover={{ scale: 1.03, y: -4 }}
              whileTap={{ scale: 0.98 }}
              className="group relative rounded-3xl overflow-hidden min-h-[300px] cursor-pointer shadow-lg hover:shadow-2xl transition-all duration-300"
            >
              {/* Background Image */}
              <img 
                src={category.image} 
                alt={t(category.titleKey)} 
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
              />
              
              {/* Overlay Gradient */}
              <div className={`absolute inset-0 bg-gradient-to-t ${category.color} opacity-80 group-hover:opacity-90 transition-opacity duration-300`} />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent" />

              {/* Content Box */}
              <div className="absolute inset-0 p-6 flex flex-col justify-end text-white">
                <h3 className="text-2xl font-bold mb-2 group-hover:text-primary-100 transition-colors drop-shadow-md">
                  {t(category.titleKey)}
                </h3>
                
                <p className="text-white/80 text-sm mb-4 line-clamp-2">
                  {t(category.descKey)}
                </p>

                {/* Count Badge */}
                <div className="mt-auto pointer-events-none">
                  <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-bold uppercase tracking-wider border border-white/30">
                    Explorează
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
