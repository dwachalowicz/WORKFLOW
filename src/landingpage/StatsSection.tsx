import React from 'react';
import { useLandingTranslation } from './LandingTranslationContext';
import { Check, Edit3, Gavel } from 'lucide-react';
import { motion } from 'framer-motion';
export const StatsSection: React.FC = () => {
  const { t, language } = useLandingTranslation();

  return (
    <section className="w-full bg-transparent pt-4 pb-24 md:py-24 px-4 text-[#1a1a1a]">
      <div className="max-w-[1600px] mx-auto px-[5%] md:px-16 flex flex-col-reverse md:flex-row items-center justify-between relative">
        
        {/* Left Content (Text) */}
        <div className="w-full md:w-[48%] flex flex-col justify-center">
          <h2 className="text-4xl md:text-[46px] font-extrabold leading-[1.1] mb-6 text-[#1a1a1a]">
            {language === 'pl' ? (
              <><span className="text-brand-gold">{t('landing.statssection.html_1')}</span> {t('landing.statssection.html_2')}</>
            ) : (
              <>{t('landing.statssection.html_1')} <span className="text-brand-gold">{t('landing.statssection.html_2')}</span></>
            )}
          </h2>
          <p className="text-[#666] mb-10 text-[15px] leading-relaxed">
            {t('stats_desc', t('landing.statssection.text2'))}
          </p>

          <ul className="space-y-4">
            <li className="flex items-center gap-4">
              <div className="w-6 h-6 rounded-full border-2 border-brand-gold flex items-center justify-center shrink-0">
                <Check className="w-3 h-3 text-brand-gold stroke-[3px]" />
              </div>
              <span className="text-[#2a2a2a] text-[15px] font-medium">{t('landing.statssection.text3')}</span>
            </li>
            <li className="flex items-center gap-4">
              <div className="w-6 h-6 rounded-full border-2 border-brand-gold flex items-center justify-center shrink-0">
                <Check className="w-3 h-3 text-brand-gold stroke-[3px]" />
              </div>
              <span className="text-[#2a2a2a] text-[15px] font-medium">{t('landing.statssection.text4')}</span>
            </li>
            <li className="flex items-center gap-4">
              <div className="w-6 h-6 rounded-full border-2 border-brand-gold flex items-center justify-center shrink-0">
                <Check className="w-3 h-3 text-brand-gold stroke-[3px]" />
              </div>
              <span className="text-[#2a2a2a] text-[15px] font-medium">{t('landing.statssection.text5')}</span>
            </li>
            <li className="flex items-center gap-4">
              <div className="w-6 h-6 rounded-full border-2 border-brand-gold flex items-center justify-center shrink-0">
                <Check className="w-3 h-3 text-brand-gold stroke-[3px]" />
              </div>
              <span className="text-[#2a2a2a] text-[15px] font-medium">{t('landing.statssection.text6')}</span>
            </li>
          </ul>

          {/* Removed Decorative Arrow */}
        </div>

        {/* Right Graphic Mockup */}
        <div className="w-full md:w-[48%] flex relative z-10 mb-12 md:mb-0">
          <div className="w-full h-[500px] bg-landing-section rounded-[2rem] border border-white/10 shadow-2xl relative overflow-hidden flex flex-col justify-center p-8 text-white font-sans"
               style={{ backgroundImage: 'radial-gradient(#333 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
             
             {/* Removed internal connection nodes */}
             
             {/* Simulating stats widgets */}
             <div className="grid grid-cols-2 gap-4 mb-6 relative z-10">
                <motion.div 
                   initial={{ opacity: 0, y: 20 }}
                   whileInView={{ opacity: 1, y: 0 }}
                   viewport={{ once: false, amount: 0.5 }}
                   transition={{ duration: 0.5 }}
                   className="bg-[#25262b] border border-white/10 rounded-xl p-5 shadow-lg">
                   <div className="text-[10px] text-white/70 mb-2 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-500"></div> {t('landing.statssection.text7')}</div>
                   <div className="text-xl font-bold text-white">{t('landing.statssection.text8')}</div>
                   <div className="text-xs text-white/60 mt-1">{t('landing.statssection.text9')}</div>
                </motion.div>
                <motion.div 
                   initial={{ opacity: 0, y: 20 }}
                   whileInView={{ opacity: 1, y: 0 }}
                   viewport={{ once: false, amount: 0.5 }}
                   transition={{ duration: 0.5, delay: 0.2 }}
                   className="bg-[#25262b] border border-white/10 rounded-xl p-5 shadow-lg">
                   <div className="text-[10px] text-white/70 mb-2 uppercase tracking-wider">{t('landing.statssection.text10')}</div>
                   <div className="text-2xl font-bold text-white">6h</div>
                   <div className="text-[10px] text-white/60 mt-1">{t('landing.statssection.text11')}</div>
                </motion.div>
             </div>
             
             <motion.div 
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: false, amount: 0.5 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="text-[11px] text-white/70 font-bold uppercase tracking-widest mb-4 relative z-10">{t('landing.statssection.text12')}</motion.div>
             
             <div className="flex flex-col gap-3 relative z-10">
                {/* User Row 1 */}
                <motion.div 
                   initial={{ opacity: 0, x: -20 }}
                   whileInView={{ opacity: 1, x: 0 }}
                   viewport={{ once: false, amount: 0.5 }}
                   transition={{ duration: 0.5, delay: 0.6 }}
                   className="flex items-center justify-between bg-[#25262b] border border-white/10 p-3 rounded-xl shadow-lg">
                   <div className="flex items-center gap-3">
                     <img loading="lazy" src="/landingpage/avatar-hero2.webp" className="w-8 h-8 rounded-full border border-gray-600 object-cover" alt="Sprzedaż" />
                     <span className="font-bold text-sm text-white">{t('landing.statssection.text13')}</span>
                   </div>
                   <div className="flex gap-4 text-xs text-white/70">
                     <span className="flex items-center gap-1"><Edit3 size={13} className="text-brand-gold" /> 2</span>
                     <span className="flex items-center gap-1"><Gavel size={13} className="text-green-400" /> 4</span>
                   </div>
                </motion.div>
                {/* User Row 2 */}
                <motion.div 
                   initial={{ opacity: 0, x: -20 }}
                   whileInView={{ opacity: 1, x: 0 }}
                   viewport={{ once: false, amount: 0.5 }}
                   transition={{ duration: 0.5, delay: 0.8 }}
                   className="flex items-center justify-between bg-[#25262b] border border-white/10 p-3 rounded-xl shadow-lg">
                   <div className="flex items-center gap-3">
                     <img loading="lazy" src="/landingpage/avatar-hero1.webp" className="w-8 h-8 rounded-full border border-gray-600 object-cover" alt="Anna" />
                     <span className="font-bold text-sm text-white">Anna Nowak</span>
                   </div>
                   <div className="flex gap-4 text-xs text-white/70">
                     <span className="flex items-center gap-1"><Edit3 size={13} className="text-brand-gold" /> 2</span>
                   </div>
                </motion.div>
                {/* User Row 3 */}
                <motion.div 
                   initial={{ opacity: 0, x: -20 }}
                   whileInView={{ opacity: 1, x: 0 }}
                   viewport={{ once: false, amount: 0.5 }}
                   transition={{ duration: 0.5, delay: 1.0 }}
                   className="flex items-center justify-between bg-[#25262b] border border-white/10 p-3 rounded-xl shadow-lg">
                   <div className="flex items-center gap-3">
                     <img loading="lazy" src="/landingpage/avatar-hero3.webp" className="w-8 h-8 rounded-full border border-gray-600 object-cover" alt="Marketing" />
                     <span className="font-bold text-sm text-white">Marketing</span>
                   </div>
                   <div className="flex gap-4 text-xs text-white/70">
                     <span className="flex items-center gap-1"><Edit3 size={13} className="text-brand-gold" /> 5</span>
                     <span className="flex items-center gap-1"><Gavel size={13} className="text-green-400" /> 12</span>
                   </div>
                </motion.div>
                {/* User Row 4 */}
                <motion.div 
                   initial={{ opacity: 0, x: -20 }}
                   whileInView={{ opacity: 1, x: 0 }}
                   viewport={{ once: false, amount: 0.5 }}
                   transition={{ duration: 0.5, delay: 1.2 }}
                   className="flex items-center justify-between bg-[#25262b] border border-white/10 p-3 rounded-xl shadow-lg">
                   <div className="flex items-center gap-3">
                     <img loading="lazy" src="/landingpage/a-1.webp" className="w-8 h-8 rounded-full border border-gray-600 object-cover" alt="IT" />
                     <span className="font-bold text-sm text-white">{t('landing.statssection.text14')}</span>
                   </div>
                   <div className="flex gap-4 text-xs text-white/70">
                     <span className="flex items-center gap-1"><Gavel size={13} className="text-green-400" /> 8</span>
                   </div>
                </motion.div>
             </div>

          </div>
          
          {/* Connection Node (Top) */}
          <div id="node-stats-top" className="absolute -top-[8px] left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-brand-gold z-20 hidden md:block"></div>
        </div>

      </div>
    </section>
  );
};
