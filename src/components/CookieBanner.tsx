import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { X, Cookie } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('experium_cookie_consent');
    if (!consent) {
      // Small delay to not overwhelm the user immediately
      const timer = setTimeout(() => setIsVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAcceptAll = () => {
    localStorage.setItem('experium_cookie_consent', 'all');
    setIsVisible(false);
  };

  const handleAcceptNecessary = () => {
    localStorage.setItem('experium_cookie_consent', 'necessary');
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 200, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 200, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed bottom-0 left-0 right-0 z-[100] p-4 pointer-events-none"
        >
          <div className="container max-w-4xl mx-auto pointer-events-auto">
            <div className="bg-background border border-border shadow-2xl rounded-xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
              {/* Background accent */}
              <div className="absolute top-0 left-0 w-2 h-full bg-primary" />
              
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Cookie className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-lg">Respectăm intimitatea ta</h3>
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Folosim cookie-uri pentru a asigura funcționarea corectă a platformei, pentru a analiza traficul și pentru a-ți oferi o experiență personalizată. Poți alege să accepți toate cookie-urile sau doar pe cele strict necesare.
                  Află mai multe detalii citind <Link to="/cookies" className="text-primary hover:underline font-medium">Politica de Cookies</Link> și <Link to="/privacy" className="text-primary hover:underline font-medium">Politica de Confidențialitate</Link>.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto shrink-0">
                <Button 
                  variant="outline" 
                  onClick={handleAcceptNecessary}
                  className="w-full sm:w-auto mt-2 md:mt-0"
                >
                  Doar necesare
                </Button>
                <Button 
                  onClick={handleAcceptAll}
                  className="w-full sm:w-auto shadow-md"
                >
                  Acceptă toate
                </Button>
                <button 
                  onClick={handleAcceptNecessary}
                  className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Închide"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
