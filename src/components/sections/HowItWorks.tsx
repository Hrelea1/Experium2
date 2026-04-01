import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useHomepageContent } from "@/hooks/useHomepageContent";
import { Search, Gift, Calendar, Smile, LucideIcon, Rocket, Heart, Star, Zap, Globe, MapPin, Clock } from "lucide-react";

const IconMap: Record<string, LucideIcon> = {
  Search,
  Gift,
  Calendar,
  Smile,
  Rocket,
  Heart,
  Star,
  Zap,
  Globe,
  MapPin,
  Clock
};

interface Step {
  titleKey: string;
  descKey: string;
  icon: LucideIcon;
  extraInfo?: string;
  image?: string;
}

const defaultSteps: Step[] = [
  { 
    titleKey: "howItWorks.step1Title", 
    descKey: "howItWorks.step1Desc", 
    icon: Search 
  },
  { 
    titleKey: "howItWorks.step2Title", 
    descKey: "howItWorks.step2Desc", 
    icon: Gift 
  },
  { 
    titleKey: "howItWorks.step3Title", 
    descKey: "howItWorks.step3Desc", 
    icon: Calendar,
    extraInfo: "howItWorks.step3Extra" 
  },
  { 
    titleKey: "howItWorks.step4Title", 
    descKey: "howItWorks.step4Desc", 
    icon: Smile 
  },
];

export function HowItWorks() {
  const { t } = useTranslation();
  const { data: content } = useHomepageContent("how-it-works");
  
  const sectionContent = content?.content || {
    badge: "Cum funcționează",
    title: t('howItWorks.title'),
    subtitle: t('howItWorks.subtitle'),
    steps: []
  };

  // Merge default steps with any dynamic content
  const steps = defaultSteps.map((defaultStep, index) => {
    const dynamicStep = sectionContent.steps?.[index] || {};
    const dynamicIcon = dynamicStep.iconName ? IconMap[dynamicStep.iconName] : null;
    
    return {
      ...defaultStep,
      ...dynamicStep,
      icon: dynamicIcon || defaultStep.icon
    };
  });

  return (
    <section id="how-it-works" className="py-16 lg:py-24 bg-secondary/30 text-secondary-foreground overflow-hidden">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16 lg:mb-20"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-bold tracking-wide mb-4 border border-primary/20 shadow-sm">
            {sectionContent.badge}
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6 text-foreground">
            {sectionContent.title}
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed">
            {sectionContent.subtitle}
          </p>
        </motion.div>
        
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12 relative">
          {/* Connection Line (Desktop) */}
          <div className="hidden lg:block absolute top-12 left-[10%] right-[10%] h-[2px] bg-gradient-to-r from-primary/10 via-primary/30 to-primary/10 -z-0" />

          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.15 }}
              className="relative group h-full flex flex-col"
            >
              {/* Step Media (Image or Icon) */}
              <div className="relative z-10 w-24 h-24 mx-auto mb-8">
                <div className="absolute inset-0 bg-primary rounded-3xl shadow-xl shadow-primary/20 group-hover:scale-105 group-hover:rotate-3 transition-all duration-300 -z-10" />
                <div className="w-full h-full flex items-center justify-center bg-white rounded-3xl border-2 border-primary/10 group-hover:border-primary/30 transition-colors overflow-hidden">
                  {step.image ? (
                    <img src={step.image} alt={t(step.titleKey)} className="w-full h-full object-cover" />
                  ) : (
                    <step.icon className="w-10 h-10 text-primary group-hover:scale-110 transition-transform duration-300" />
                  )}
                </div>
                
                {/* Step Indicator Badge */}
                <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-secondary-foreground text-secondary border-2 border-white flex items-center justify-center font-bold text-sm shadow-md">
                  {index + 1}
                </div>
              </div>

              <div className="flex-1 px-2">
                <h3 className="text-xl font-bold mb-4 text-foreground group-hover:text-primary transition-colors">
                  {t(step.titleKey)}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {t(step.descKey)}
                </p>
                {step.extraInfo && (
                  <div className="mt-4 p-3 rounded-xl bg-primary/5 border border-primary/10">
                    <p className="text-xs text-primary font-bold uppercase tracking-wider mb-1">Info</p>
                    <p className="text-sm text-primary/80 font-medium">{t(step.extraInfo)}</p>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
