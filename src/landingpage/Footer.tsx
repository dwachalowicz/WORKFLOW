import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Handshake } from 'lucide-react';
import { pb } from '../lib/pocketbase';
import { OfferSection } from './OfferSection';
import { useAuthStore } from '../store/authStore';
import { useLandingTranslation } from './LandingTranslationContext';

export const Footer: React.FC = () => {
  const { isAuthenticated } = useAuthStore();
  const { t } = useLandingTranslation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [showPartner, setShowPartner] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const settings = await pb.collection('WORKFLOW_site_settings').getFirstListItem('', { requestKey: null });
        setShowPartner(settings.partner_view === true);
      } catch {
        // If no settings found or error, default to false (already set by useState)
      }
    };
    fetchSettings();
  }, []);

  const handleStartLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    navigate(`/login?email=${encodeURIComponent(email)}&autoLogin=true`);
  };

  return (
    <footer className="w-full bg-landing-section pt-32 pb-0 px-0 text-white relative overflow-hidden">
      <div className="max-w-[1600px] mx-auto px-[5%] md:px-16 relative z-10">
        
        {/* Call to Action Section */}
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="flex flex-col md:flex-row justify-between items-center mb-32"
        >
          <div className="w-full md:w-1/2 mb-10 md:mb-0">
            <h2 className="text-4xl md:text-[46px] font-extrabold text-white mb-6 leading-tight">
              <>{t('landing.footer.text1_1')}<br/>{t('landing.footer.text1_2')}<br/>{t('landing.footer.text1_3')}</>
            </h2>
            <p className="text-white/60 text-[15px]">
              {t('landing.footer.text2')}
            </p>
          </div>
          <div className="w-full md:w-1/2 flex flex-col md:items-end">
             <form onSubmit={handleStartLogin} className="w-full max-w-md flex bg-landing-card border border-white/10 focus-within:border-brand-gold/50 focus-within:shadow-[0_0_15px_rgba(212,175,55,0.1)] transition-all rounded-full p-1 pl-6 mb-4 relative">
               <input 
                 type="email" 
                 value={email}
                 onChange={(e) => setEmail(e.target.value)}
                 required
                 placeholder={t('landing.footer.text3')} 
                 className="bg-transparent text-sm w-full outline-none text-white placeholder-white/40" 
               />
               <button type="submit" className="bg-white text-black text-sm font-bold px-8 py-3 rounded-full transition-all duration-300 hover:bg-brand-gold hover:text-white hover:scale-105 hover:shadow-none hover:border-transparent whitespace-nowrap">
                 {t('landing.footer.text4')}
              </button>
             </form>
             <div className="w-full max-w-md flex flex-wrap items-center justify-between md:justify-start gap-x-6 gap-y-2 text-xs text-white/60 px-4 mb-4">
               <span className="flex items-center gap-2"><span className="text-white/70">✓</span> {t('landing.footer.text5')}</span>
              <span className="flex items-center gap-2"><span className="text-white/70">✓</span> {t('landing.footer.text6')}</span>
             </div>
             <div className="w-full max-w-md text-[11px] text-white/40 px-4">
                <>{t('landing.footer.text7_1')} <span className="text-brand-gold">{t('landing.footer.text7_2')}</span>{t('landing.footer.text7_3')}</>
             </div>
          </div>
        </motion.div>

        {/* Partnership Section */}
        {showPartner && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="flex flex-col md:flex-row items-center justify-between gap-8 p-8 md:px-12 md:py-10 mb-24 border border-white/10 rounded-2xl bg-transparent hover:border-white/20 transition-colors relative overflow-hidden"
          >
            <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-left">
              <div className="inline-block bg-white text-black text-[10px] font-semibold px-4 py-1.5 rounded-full uppercase tracking-widest mb-4">
                {t('landing.footer.partner_badge')}
              </div>
              <p className="text-white/70 text-[15px] max-w-2xl leading-relaxed">
                {t('landing.footer.partner_desc')}
              </p>
            </div>
            
            <div className="flex items-center justify-center gap-6 bg-black px-8 py-5 rounded-2xl shrink-0 mt-2 md:mt-0">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 bg-brand-gold" style={{ WebkitMaskImage: 'url(/gryf-ai-logo.svg)', WebkitMaskSize: 'contain', WebkitMaskRepeat: 'no-repeat', WebkitMaskPosition: 'left', maskImage: 'url(/gryf-ai-logo.svg)', maskSize: 'contain', maskRepeat: 'no-repeat', maskPosition: 'left' }}></div>
                <span className="text-white font-extrabold text-xl tracking-tight">gryf.ai</span>
              </div>
              <Handshake className="w-8 h-8 text-white shrink-0" strokeWidth={1.5} />
              <img src="/landingpage/qalcwise_logo_dark.webp" alt="Qalcwise" className="h-8 md:h-9 object-contain" />
            </div>
          </motion.div>
        )}

        <OfferSection />


        {/* Links Section */}
        <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr] gap-12 md:gap-8 mb-16 text-sm">
          <div className="col-span-1 md:pr-12 lg:pr-24">
            <div className="flex items-center gap-6 mb-6">
              <div className="h-8 w-24 bg-brand-gold" style={{ WebkitMaskImage: 'url(/gryf-ai-logo.svg)', WebkitMaskSize: 'contain', WebkitMaskRepeat: 'no-repeat', WebkitMaskPosition: 'left', maskImage: 'url(/gryf-ai-logo.svg)', maskSize: 'contain', maskRepeat: 'no-repeat', maskPosition: 'left' }}></div>
              <div className="flex items-center gap-4 text-white/70 text-xs font-bold">
                <a href="https://www.facebook.com/gryfai" target="_blank" rel="noreferrer" className="hover:text-white transition-colors border border-white/10 rounded-full w-8 h-8 flex items-center justify-center bg-landing-card">fb</a>
                <a href="https://x.com/gryf_ai" target="_blank" rel="noreferrer" className="hover:text-white transition-colors border border-white/10 rounded-full w-8 h-8 flex items-center justify-center bg-landing-card">X</a>
                <a href="https://www.youtube.com/@gryf-ai" target="_blank" rel="noreferrer" className="hover:text-white transition-colors border border-white/10 rounded-full w-8 h-8 flex items-center justify-center bg-landing-card">YT</a>
              </div>
            </div>
            <p className="text-white/50 text-[13px] leading-relaxed mb-8">
              {t('landing.footer.text8')}
            </p>
          </div>

          <div className="col-span-1 flex flex-col gap-4 text-white/50 text-[13px]">
            <h4 className="text-white font-bold mb-2 text-sm">{t('landing.footer.text9')}</h4>
            <a href="/#oferta" className="hover:text-brand-gold transition-colors">{t('landing.footer.text10')}</a>
            <a href="/#plany" className="hover:text-brand-gold transition-colors">{t('landing.footer.text11')}</a>
            <a href={isAuthenticated ? "/dashboard" : "/login"} className="hover:text-brand-gold transition-colors">
              {isAuthenticated ? (t('landing.footer.text12')) : (t('landing.footer.text13'))}
            </a>
          </div>

          <div className="col-span-1 flex flex-col gap-4 text-white/50 text-[13px]">
            <h4 className="text-white font-bold mb-2 text-sm">{t('landing.footer.text14')}</h4>
            <a href="/kontakt" className="hover:text-brand-gold transition-colors">{t('landing.footer.text15')}</a>
            <a href="/faq" className="hover:text-brand-gold transition-colors">FAQ</a>
          </div>

          <div className="col-span-1 flex flex-col gap-4 text-white/50 text-[13px]">
            <h4 className="text-white font-bold mb-2 text-sm">{t('landing.footer.text16')}</h4>
            <a href="/page/regulamin" className="hover:text-brand-gold transition-colors">{t('landing.footer.text17')}</a>
            <a href="/page/polityka-prywatnosci" className="hover:text-brand-gold transition-colors">{t('landing.footer.text18')}</a>
            <button
              onClick={() => { localStorage.removeItem('gryf_cookies_consents'); window.location.reload(); }}
              className="text-left hover:text-brand-gold transition-colors cursor-pointer"
            >
              {t('landing.footer.text19')}
            </button>
          </div>
        </div>

        <div className="text-center text-xs text-white/40 pt-8 pb-12 border-t border-white/10">
          {t('landing.footer.text20')}
        </div>
      </div>

      <div className="w-full flex justify-center pointer-events-none select-none mt-[-2vw] mb-[-2vw]">
        <span 
          className="text-[11vw] font-black tracking-tighter leading-none whitespace-nowrap"
          style={{ 
            color: '#111', 
            textShadow: '1px 1px 0 hsl(var(--brand-color) / 0.15), -1px -1px 0 hsl(var(--brand-color) / 0.15), 1px -1px 0 hsl(var(--brand-color) / 0.15), -1px 1px 0 hsl(var(--brand-color) / 0.15)'
          }}
        >
          {t('landing.footer.goRunYourFlow')}
        </span>
      </div>
    </footer>
  );
};
