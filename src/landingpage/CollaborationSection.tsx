import React from 'react';
import { useLandingTranslation } from './LandingTranslationContext';
import { Check, MessageSquare, Send } from 'lucide-react';
import { motion } from 'framer-motion';

export const CollaborationSection: React.FC = () => {
  const { t, language } = useLandingTranslation();

  return (
    <section className="w-full bg-transparent pt-8 pb-24 md:py-24 px-4 text-[#1a1a1a]">
      <div className="max-w-[1600px] mx-auto px-[5%] md:px-16 flex flex-col md:flex-row items-center justify-between relative">
        
        {/* Left Graphic Mockup */}
        <div className="w-full md:w-[48%] flex relative z-10 mb-12 md:mb-0">
          <div className="w-full h-[500px] bg-[#0e0e11] rounded-[2rem] border border-white/10 shadow-2xl relative overflow-hidden flex flex-col justify-center items-center p-8 text-white font-sans"
               style={{ backgroundImage: 'radial-gradient(circle, #2a2a2a 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
            
            {/* Comment Thread UI */}
            <motion.div 
               initial={{ opacity: 0, y: 30 }}
               whileInView={{ opacity: 1, y: 0 }}
               viewport={{ once: false, amount: 0.5 }}
               transition={{ duration: 0.6, delay: 0.2 }}
               className="relative z-10 w-full max-w-[90%] md:max-w-[380px] bg-[#25262b] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            >
               <div className="px-4 py-3 border-b border-white/10 flex justify-between items-center bg-[#1e1f23]">
                  <div className="flex items-center gap-2 text-[13px] font-medium text-white">
                     <MessageSquare size={14} className="text-brand-gold" />
                     {t('landing.collaborationsection.text8')}
                  </div>
                  <div className="text-[11px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full font-bold uppercase">
                     {t('landing.collaborationsection.text16')}
                  </div>
               </div>
               
               <div className="p-4 flex flex-col gap-4 bg-[#25262b]">
                  {/* First Comment */}
                  <div className="flex gap-3">
                     <img loading="lazy" src="/landingpage/avatar-hero2.webp" className="w-8 h-8 rounded-full object-cover shrink-0" alt="Avatar" />
                     <div className="flex flex-col">
                        <div className="flex items-center gap-2 mb-1">
                           <span className="text-[13px] font-bold text-white">{t('landing.collaborationsection.text9')}</span>
                           <span className="text-[10px] text-white/40">{t('landing.collaborationsection.text14')}</span>
                        </div>
                        <div className="text-[13px] text-white/80 leading-relaxed bg-[#32343a] p-3 rounded-b-xl rounded-tr-xl">
                           {t('landing.collaborationsection.text10')}
                        </div>
                     </div>
                  </div>

                  {/* Reply */}
                  <div className="flex gap-3 ml-6">
                     <img loading="lazy" src="/landingpage/avatar-hero1.webp" className="w-8 h-8 rounded-full object-cover shrink-0" alt="Avatar" />
                     <div className="flex flex-col">
                        <div className="flex items-center gap-2 mb-1">
                           <span className="text-[13px] font-bold text-white">{t('landing.collaborationsection.text11')}</span>
                           <span className="text-[10px] text-white/40">{t('landing.collaborationsection.text15')}</span>
                        </div>
                        <div className="text-[13px] text-white/80 leading-relaxed bg-brand-gold/10 border border-brand-gold/20 p-3 rounded-b-xl rounded-tr-xl">
                           {t('landing.collaborationsection.text12')}
                        </div>
                     </div>
                  </div>
               </div>

               <div className="px-4 py-3 border-t border-white/10 bg-[#1e1f23] flex gap-2 items-center">
                  <div className="flex-1 bg-[#32343a] rounded-lg px-3 py-2 text-[12px] text-white/40">
                     {t('landing.collaborationsection.text7')}
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-brand-gold text-black flex items-center justify-center shrink-0">
                     <Send size={14} />
                  </div>
               </div>
            </motion.div>
            
          </div>
          
          {/* Connection Node (Top) */}
          <div id="node-collab-top" className="absolute -top-[8px] left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-brand-gold z-20 hidden md:block"></div>
        </div>

        {/* Right Side - Content */}
        <div className="w-full md:w-[48%] flex flex-col justify-center">
          <h2 className="text-4xl md:text-[46px] font-extrabold leading-[1.1] mb-6 text-[#1a1a1a]">
            {language === 'pl' ? (
              <><span className="text-brand-gold">{t('landing.collaborationsection.html_1')}</span> {t('landing.collaborationsection.html_2')}</>
            ) : (
              <>{t('landing.collaborationsection.html_1')} <span className="text-brand-gold">{t('landing.collaborationsection.html_2')}</span></>
            )}
          </h2>
          <p className="text-[#666] mb-10 text-[15px] leading-relaxed">
            {t('landing.collaborationsection.text2')}
          </p>

          <ul className="space-y-4">
            <li className="flex items-center gap-4">
              <div className="w-6 h-6 rounded-full border-2 border-brand-gold flex items-center justify-center shrink-0">
                <Check className="w-3 h-3 text-brand-gold stroke-[3px]" />
              </div>
              <span className="text-[#2a2a2a] text-[15px] font-medium">{t('landing.collaborationsection.text3')}</span>
            </li>
            <li className="flex items-center gap-4">
              <div className="w-6 h-6 rounded-full border-2 border-brand-gold flex items-center justify-center shrink-0">
                <Check className="w-3 h-3 text-brand-gold stroke-[3px]" />
              </div>
              <span className="text-[#2a2a2a] text-[15px] font-medium">{t('landing.collaborationsection.text4')}</span>
            </li>
            <li className="flex items-center gap-4">
              <div className="w-6 h-6 rounded-full border-2 border-brand-gold flex items-center justify-center shrink-0">
                <Check className="w-3 h-3 text-brand-gold stroke-[3px]" />
              </div>
              <span className="text-[#2a2a2a] text-[15px] font-medium">{t('landing.collaborationsection.text5')}</span>
            </li>
            <li className="flex items-center gap-4">
              <div className="w-6 h-6 rounded-full border-2 border-brand-gold flex items-center justify-center shrink-0">
                <Check className="w-3 h-3 text-brand-gold stroke-[3px]" />
              </div>
              <span className="text-[#2a2a2a] text-[15px] font-medium">{t('landing.collaborationsection.text6')}</span>
            </li>
          </ul>
        </div>

      </div>
    </section>
  );
};
