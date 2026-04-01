import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { createPortal } from "react-dom";
import heroBg from "@/assets/hero-bg.jpg";
import { useHomepageContent } from "@/hooks/useHomepageContent";

import { useCategories } from "@/hooks/useCategories";

export function Hero() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [selectedCategorySlug, setSelectedCategorySlug] = useState("toate-categoriile");
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);

  const { data: content } = useHomepageContent("hero");
  const { data: dynamicCategories } = useCategories();
  
  const allCategories = [
    { slug: "toate-categoriile", name: t("hero.allCategories") },
    ...(dynamicCategories || []).map(c => ({ slug: c.slug, name: c.name }))
  ];
  
  const selectedName = allCategories.find(c => c.slug === selectedCategorySlug)?.name || t("hero.allCategories");

  
  const heroContent = {
    title: content?.content?.title || t('hero.title'),
    titleHighlight: content?.content?.titleHighlight || t('hero.titleHighlight'),
    subtitle: content?.content?.subtitle || t('hero.subtitle'),
    badge: content?.content?.badge || t('hero.badge'),
    ctaPrimary: content?.content?.ctaPrimary || t('hero.discover'),
    ctaPrimaryLink: content?.content?.ctaPrimaryLink || "/category/toate-categoriile",
    ctaSecondary: content?.content?.ctaSecondary || t('hero.hasVoucher'),
    ctaSecondaryLink: content?.content?.ctaSecondaryLink || "/my-bookings",
    backgroundImage: content?.content?.backgroundImage || "",
  };

  const backgroundImage = heroContent.backgroundImage || heroBg;

  const handleSearch = () => {
    navigate(`/category/${selectedCategorySlug}`);
  };

  const updateDropdownPosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 8,
        left: rect.left,
        width: rect.width,
      });
    }
  };

  const handleToggleDropdown = () => {
    if (!isCategoryOpen) {
      updateDropdownPosition();
    }
    setIsCategoryOpen(!isCategoryOpen);
  };

  // Update position on scroll/resize when dropdown is open
  useEffect(() => {
    if (isCategoryOpen) {
      updateDropdownPosition();
      window.addEventListener('scroll', updateDropdownPosition, true);
      window.addEventListener('resize', updateDropdownPosition);
      return () => {
        window.removeEventListener('scroll', updateDropdownPosition, true);
        window.removeEventListener('resize', updateDropdownPosition);
      };
    }
  }, [isCategoryOpen]);

  return (
    <section className="relative min-h-[85vh] flex items-center justify-center">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          src={backgroundImage}
          alt="Romanian landscape"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-secondary/60 via-secondary/40 to-secondary/80" />
      </div>

      {/* Content */}
      <div className="container relative z-10 pt-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-4xl mx-auto text-center"
        >
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold text-card mb-6 leading-tight">
            {heroContent.title}
            <span className="block" style={{ color: "hsl(16 85% 55% / 0.95)" }}>{heroContent.titleHighlight}</span>
          </h1>

          <p className="text-lg sm:text-xl text-card/90 mb-10 max-w-2xl mx-auto">
            {heroContent.subtitle}
          </p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center mb-16"
          >
            <Button asChild size="lg" className="rounded-full px-8 text-white font-semibold border-0 transition-transform hover:scale-105 h-12 hover:brightness-110" style={{ backgroundColor: "hsl(16 85% 55% / 0.95)" }}>
              <Link to={heroContent.ctaPrimaryLink}>
                {heroContent.ctaPrimary}
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-full px-8 bg-white/20 hover:bg-white/30 border-white/30 text-white font-semibold backdrop-blur-md transition-all hover:scale-105 h-12">
              <Link to={heroContent.ctaSecondaryLink}>
                {heroContent.ctaSecondary}
              </Link>
            </Button>
          </motion.div>

          {/* Search Box */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, type: "spring", stiffness: 100 }}
            className="bg-white rounded-2xl md:rounded-[2rem] p-2 shadow-2xl max-w-3xl mx-auto"
          >
            <div className="flex flex-col md:flex-row gap-2 md:gap-3">
              {/* Category Dropdown */}
              <div className="relative flex-1">
                <button
                  ref={buttonRef}
                  onClick={handleToggleDropdown}
                  className="w-full flex items-center justify-between gap-2 px-6 py-3 bg-slate-100 rounded-xl md:rounded-full text-left hover:bg-slate-200 transition-colors h-12"
                >
                  <span className="text-slate-700 font-medium">{selectedName}</span>
                  <span className={`text-slate-400 text-[10px] transition-transform ${isCategoryOpen ? "rotate-180" : ""}`}>▼</span>
                </button>
                {isCategoryOpen && createPortal(
                  <>
                    <div 
                      className="fixed inset-0 z-[99998]" 
                      onClick={() => setIsCategoryOpen(false)} 
                    />
                    <div 
                      className="fixed bg-white rounded-xl shadow-2xl border border-slate-100 max-h-80 overflow-auto z-[99999] animate-fade-in"
                      style={{
                        top: dropdownPosition.top,
                        left: dropdownPosition.left,
                        width: dropdownPosition.width,
                      }}
                    >
                      {allCategories.map((category) => (
                        <button
                          key={category.slug}
                          onClick={() => {
                            setSelectedCategorySlug(category.slug);
                            setIsCategoryOpen(false);
                          }}
                          className="w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors first:rounded-t-xl last:rounded-b-xl text-slate-700"
                        >
                          {category.name}
                        </button>
                      ))}
                    </div>
                  </>,
                  document.body
                )}
              </div>

              {/* Search Button */}
              <Button size="lg" className="md:w-auto rounded-xl md:rounded-full px-8 text-white font-semibold h-12 hover:brightness-110" style={{ backgroundColor: "hsl(16 85% 55% / 0.95)" }} onClick={handleSearch}>
                {t('hero.search')}
              </Button>

              {/* Show on Map Button */}
              <Button 
                size="lg" 
                className="md:w-auto rounded-xl md:rounded-full px-8 bg-[#252f3f] hover:bg-[#1a212d] text-white font-semibold h-12"
                asChild
              >
                <Link to="/map">
                  {t('hero.showOnMap')}
                </Link>
              </Button>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
