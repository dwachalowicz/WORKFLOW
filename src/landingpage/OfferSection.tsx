import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Cpu, Box, Layers, Network, Hexagon, Component, X } from 'lucide-react';
import { pb } from '../lib/pocketbase';
import { useLandingTranslation } from './LandingTranslationContext';
import { formatWidows } from '../lib/utils';
import { useToastStore } from '@/store/toastStore';

interface AIService {
  id: string;
  icon_name: string;
  title_pl: string;
  title_en: string;
  description_pl: string;
  description_en: string;
  order: number;
}

const iconMap: Record<string, React.ReactNode> = {
  Cpu: <Cpu className="w-8 h-8 stroke-[1.5]" />,
  Box: <Box className="w-8 h-8 stroke-[1.5]" />,
  Layers: <Layers className="w-8 h-8 stroke-[1.5]" />,
  Network: <Network className="w-8 h-8 stroke-[1.5]" />,
  Hexagon: <Hexagon className="w-8 h-8 stroke-[1.5]" />,
  Component: <Component className="w-8 h-8 stroke-[1.5]" />
};

export const OfferSection: React.FC = () => {
  const { t, language } = useLandingTranslation();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [services, setServices] = useState<AIService[]>([]);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const records = await pb.collection('WORKFLOW_ai_services').getFullList<AIService>({
          sort: 'order',
          requestKey: null
        });
        setServices(records);
      } catch (err) {
        if (err && typeof err === 'object' && !('isAbort' in err)) {
          console.error("Failed to fetch AI services:", err);
        } else if (!err || typeof err !== 'object') {
          console.error("Failed to fetch AI services:", err);
        }
      }
    };
    fetchServices();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      await pb.collection('WORKFLOW_contact_messages').create({
        email: email,
        message: message
      });
      
      setIsSubmitting(false);
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        setIsFormOpen(false);
        setEmail('');
        setMessage('');
      }, 3000);
    } catch (error) {
      console.error("Error sending message:", error);
      setIsSubmitting(false);
      useToastStore.getState().showToast(t('landing.offer.sendError'), 'error');
    }
  };

  return (
    <motion.div 
      id="oferta"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="relative rounded-[2rem] border border-white/10 bg-landing-bg mb-24 overflow-hidden font-sans w-full py-24"
    >
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url(/landingpage/bg-offer.webp)' }}
      />

      <div className="relative z-10 w-full px-[5%] md:px-12 flex flex-col items-center">
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          className="text-center mb-20 flex flex-col items-center"
        >
          <div className="inline-block bg-white text-black text-[10px] font-semibold px-4 py-1.5 rounded-full uppercase tracking-widest mb-6">
            {t('landing.offersection.text1')}
          </div>
          <h2 className="text-4xl md:text-[46px] font-extrabold mb-10 text-white leading-tight">
            {t('landing.offersection.text2')}
          </h2>
          <p className="text-white/60 text-[15px] max-w-2xl text-center leading-relaxed">
            {t('landing.offersection.html_title')}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-20 w-full mb-24 max-w-5xl mx-auto">
          {services.map((service, index) => (
            <motion.div 
              key={service.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="group relative"
            >
              <div className="absolute inset-0 bg-white/[0.02] border border-white/10 rounded-[2rem] transform transition-transform duration-500 group-hover:scale-[1.02] group-hover:bg-white/[0.04]"></div>
              
              <div className="relative p-10 flex flex-col items-center text-center">
                <div className="text-white/60 mb-6 group-hover:text-brand-gold transition-all duration-500 group-hover:scale-110 group-hover:drop-shadow-[0_0_20px_rgba(212,175,55,0.4)]">
                  {iconMap[service.icon_name] || <Box className="w-8 h-8 stroke-[1.5]" />}
                </div>
                <h3 className="text-[20px] font-semibold text-white mb-4 tracking-wide group-hover:text-brand-gold transition-colors duration-300">
                  {formatWidows(language === 'pl' ? service.title_pl : service.title_en)}
                </h3>
                <p className="text-white/50 text-[14px] leading-relaxed max-w-[280px] transition-colors duration-300 group-hover:text-white">
                  {formatWidows(language === 'pl' ? service.description_pl : service.description_en)}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="flex flex-col items-center w-full max-w-3xl"
        >
          {!isFormOpen ? (
            <div className="flex flex-col sm:flex-row items-center justify-center flex-wrap sm:flex-nowrap gap-4 w-full">
              <a 
                href="https://demo.gryf.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center whitespace-nowrap gap-2 bg-landing-section border border-white/10 text-white font-semibold text-[14px] px-8 py-3.5 rounded-full transition-all duration-300 hover:bg-brand-gold hover:text-white hover:scale-105 hover:shadow-none hover:border-transparent"
              >
                {t('landing.offersection.text4')}
              </a>
              <a 
                href="https://blog.gryf.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center whitespace-nowrap gap-2 bg-landing-section border border-white/10 text-white font-semibold text-[14px] px-8 py-3.5 rounded-full transition-all duration-300 hover:bg-brand-gold hover:text-white hover:scale-105 hover:shadow-none hover:border-transparent"
              >
                {t('landing.offersection.blog') || 'Blog'}
              </a>
              <button 
                onClick={(e) => { e.preventDefault(); setIsFormOpen(true); }}
                className="inline-flex items-center justify-center whitespace-nowrap gap-2 bg-white text-black font-semibold text-[14px] px-8 py-3.5 rounded-full transition-all duration-300 hover:bg-brand-gold hover:text-white hover:scale-105 hover:shadow-none hover:border-transparent"
              >
                {t('landing.offersection.text5')}
                <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, height: 0, y: -10 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              className="w-full flex flex-col items-center bg-landing-section/50 backdrop-blur-sm border border-white/10 rounded-[2rem] p-8 mt-4 relative"
            >
              <button
                onClick={(e) => { e.preventDefault(); setIsFormOpen(false); }}
                className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors bg-transparent border-none"
                aria-label={t('landing.offersection.closeForm')}
              >
                <X className="w-5 h-5" />
              </button>
              <div className="mb-6 text-center">
                <p className="text-white/70 text-sm mb-2">{t('landing.offersection.text6')}</p>
                <div className="text-[28px] font-semibold text-white">
                  +48 726 001 488
                </div>
              </div>
              
              <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
                {isSuccess ? (
                  <div className="w-full bg-landing-card border border-brand-gold/50 rounded-2xl p-6 text-center">
                    <p className="text-white font-medium text-[16px] mb-2">{t('landing.offersection.text7')}</p>
                    <p className="text-gray-400 text-sm">{t('landing.offersection.text8')}</p>
                  </div>
                ) : (
                  <>
                    <div className="w-full flex bg-landing-card border border-white/10 focus-within:border-brand-gold/50 focus-within:shadow-[0_0_15px_rgba(212,175,55,0.1)] transition-all rounded-full p-1 pl-6">
                      <input 
                        type="email" 
                        placeholder={t('landing.offersection.text9')} 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        disabled={isSubmitting}
                        className="bg-transparent text-sm w-full outline-none text-white placeholder-gray-500 py-3 disabled:opacity-50" 
                      />
                    </div>
                    
                    <div className="w-full flex bg-landing-card border border-white/10 focus-within:border-brand-gold/50 focus-within:shadow-[0_0_15px_rgba(212,175,55,0.1)] transition-all rounded-[1.5rem] p-4 pl-6">
                      <textarea 
                        placeholder={t('landing.offersection.text10')} 
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        required
                        disabled={isSubmitting}
                        rows={4}
                        className="bg-transparent text-sm w-full outline-none text-white placeholder-gray-500 resize-none disabled:opacity-50" 
                      />
                    </div>
                    
                    <button 
                      type="submit" 
                      disabled={isSubmitting}
                      className="w-full flex justify-center items-center bg-white text-black text-[15px] font-bold px-8 py-3.5 rounded-full transition-all duration-300 hover:bg-brand-gold hover:text-white hover:scale-105 hover:shadow-none hover:border-transparent mt-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? (
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        t('landing.offersection.text11')
                      )}
                    </button>
                  </>
                )}
              </form>
            </motion.div>
          )}
        </motion.div>

      </div>
    </motion.div>
  );
};
