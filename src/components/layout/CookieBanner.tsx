import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Cookie, Shield, Activity, Share2, Settings } from 'lucide-react';
import { getCookieConsents, saveCookieConsents, type CookieConsents } from '@/lib/cookieManager';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';

export const CookieBanner = () => {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  
  const [consents, setConsents] = useState<CookieConsents>({
    essential: true,
    analytics: false,
    marketing: false
  });

  useEffect(() => {
    const saved = getCookieConsents();
    if (!saved) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAcceptAll = () => {
    const allConsents = { essential: true, analytics: true, marketing: true };
    saveCookieConsents(allConsents);
    setIsVisible(false);
  };

  const handleAcceptSelected = () => {
    saveCookieConsents(consents);
    setIsVisible(false);
  };

  const handleDeclineAll = () => {
    const noneConsents = { essential: true, analytics: false, marketing: false };
    saveCookieConsents(noneConsents);
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed bottom-0 left-0 w-full z-[9900] p-4 pointer-events-none flex justify-center"
        >
          <div className="bg-surface-nav border border-border shadow-2xl p-5 rounded-2xl w-full max-w-[800px] pointer-events-auto flex flex-col gap-5">
            
            {!showPreferences ? (
              // Widok Skrócony
              <div className="flex flex-col gap-5">
                <div className="flex gap-4 items-start">
                  <div className="hidden sm:flex shrink-0 items-center justify-center pr-2 mt-1">
                    {/* Render a significantly larger cookie icon without the golden circular background */}
                    <Cookie className="text-brand-gold" size={48} strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="text-foreground font-semibold text-base mb-1.5">{t('cookies.privacyTitle')}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {t('cookies.privacyDesc')} <a href="#" className="text-brand-gold hover:underline">{t('cookies.privacyPolicy')}</a>.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap w-full gap-3 justify-end">
                  <Button 
                    variant="ghost"
                    onClick={handleDeclineAll}
                    size="sm"
                  >
                    {t('cookies.decline')}
                  </Button>
                  <Button 
                    onClick={handleDeclineAll}
                    size="sm"
                  >
                    {t('cookies.acceptEssential')}
                  </Button>
                  <Button 
                    variant="secondary"
                    onClick={() => setShowPreferences(true)}
                    size="sm"
                    className="flex items-center gap-1.5"
                  >
                    <Settings size={14} /> {t('cookies.settings')}
                  </Button>
                  <Button 
                    onClick={handleAcceptAll}
                    size="sm"
                  >
                    {t('cookies.acceptAll')}
                  </Button>
                </div>
              </div>
            ) : (
              // Widok Preferencji
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <h3 className="text-foreground font-semibold text-sm flex items-center gap-2">
                    <Settings size={16} className="text-brand-gold" /> {t('cookies.managePreferences')}
                  </h3>
                  <button onClick={() => setShowPreferences(false)} className="text-muted-foreground hover:text-foreground">
                    <X size={16} />
                  </button>
                </div>

                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                  {/* Required */}
                  <div className="flex items-start justify-between gap-4 p-3 rounded-xl bg-secondary">
                    <div className="flex gap-3">
                      <Shield size={18} className="text-muted-foreground shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm text-foreground font-medium mb-1">{t('cookies.essentialTitle')}</p>
                        <p className="text-xs text-muted-foreground">{t('cookies.essentialDesc')}</p>
                      </div>
                    </div>
                    <Switch checked={true} disabled />
                  </div>

                  {/* Analityczne */}
                  <div className="flex items-start justify-between gap-4 p-3 rounded-xl hover:bg-secondary transition-colors">
                    <div className="flex gap-3">
                      <Activity size={18} className="text-brand-gold shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm text-foreground font-medium mb-1">{t('cookies.analytics')}</p>
                        <p className="text-xs text-muted-foreground">{t('cookies.analyticsDesc')}</p>
                      </div>
                    </div>
                    <Switch 
                      checked={consents.analytics} 
                      onCheckedChange={(c) => setConsents(prev => ({...prev, analytics: c}))} 
                    />
                  </div>

                  {/* Marketingowe */}
                  <div className="flex items-start justify-between gap-4 p-3 rounded-xl hover:bg-secondary transition-colors">
                    <div className="flex gap-3">
                      <Share2 size={18} className="text-brand-gold shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm text-foreground font-medium mb-1">{t('cookies.marketing')}</p>
                        <p className="text-xs text-muted-foreground">{t('cookies.marketingDesc')}</p>
                      </div>
                    </div>
                    <Switch 
                      checked={consents.marketing} 
                      onCheckedChange={(c) => setConsents(prev => ({...prev, marketing: c}))} 
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 justify-end pt-2 border-t border-border">
                  <Button variant="ghost" size="sm" onClick={handleDeclineAll}>
                    {t('cookies.declineAll')}
                  </Button>
                  <Button variant="secondary" size="sm" onClick={handleAcceptSelected}>
                    {t('cookies.acceptSelected')}
                  </Button>
                  <Button size="sm" onClick={handleAcceptAll}>
                    {t('cookies.acceptAll')}
                  </Button>
                </div>
              </div>
            )}

          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
