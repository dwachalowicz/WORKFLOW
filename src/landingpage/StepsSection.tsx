import React from 'react';
import { motion } from 'framer-motion';
import { Zap, LayoutDashboard, MousePointerClick, Component, GitMerge, Sparkles, Play, ShieldCheck, Share2 } from 'lucide-react';
import { useLandingTranslation } from './LandingTranslationContext';

const FeatureItem = ({ icon: Icon, text }: { icon: React.ElementType, text: React.ReactNode }) => (
  <li className="flex items-start gap-3 text-left text-white/70 text-xs md:text-[13px] leading-relaxed">
    <Icon className="w-4 h-4 mt-[3px] shrink-0 text-brand-gold" />
    <span>{text}</span>
  </li>
);



export const StepsSection: React.FC = () => {
  const { t } = useLandingTranslation();
  return (
    <section className="relative w-full bg-landing-bg py-24 px-4 text-center overflow-hidden">
      {/* Background image */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-bottom bg-no-repeat opacity-40"
        style={{ backgroundImage: 'url(/landingpage/bg-offer.webp)' }}
      />
      
      <motion.div 
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-10 max-w-[1600px] mx-auto px-[5%] md:px-16"
      >
        <div className="inline-block border border-white/10 bg-transparent text-white/70 text-[10px] font-semibold px-4 py-1.5 rounded-full uppercase tracking-widest mb-6">
          {t('landing.stepssection.text1')}
        </div>
        <h2 className="text-4xl md:text-[46px] font-extrabold mb-10 text-white leading-tight">
          {t('landing.stepssection.text2')}
        </h2>
        <p className="text-white/60 mb-20 text-[15px] max-w-xl mx-auto leading-relaxed">
          {t('landing.stepssection.text3')}
        </p>

        <div className="relative z-10 max-w-[1400px] mx-auto mt-16 px-4 md:px-12">
          
          {/* Connector Line - Desktop */}
          <div className="hidden md:block absolute top-[48px] left-[18%] right-[18%] h-[3px] bg-brand-gold z-[-1]">
          </div>



          <div className="grid grid-cols-1 md:grid-cols-3 gap-16 lg:gap-32 relative z-10">
            
            {/* Step 1 */}
            <div className="flex flex-row md:flex-col items-start md:items-center relative group">
              {/* Mobile Connector Line */}
              <div className="md:hidden absolute left-[38.5px] top-[40px] bottom-[-104px] w-[3px] bg-brand-gold z-[-1]" />
              <div className="relative shrink-0 z-10 mr-6 md:mr-0 md:mb-12">

                 
                 {/* Avatar shape */}
                 <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-full border-[3px] border-brand-gold p-[4px] z-10 bg-landing-bg">
                   <div className="w-full h-full rounded-full overflow-hidden bg-black">
                      <img loading="lazy" src="/landingpage/a-1.webp" alt={t('landing.stepssection.text4')} className="w-full h-full object-cover transition-all duration-300 group-hover:scale-110" />
                   </div>
                 </div>
              </div>
              <div className="text-left mt-2 md:mt-0 flex-1 w-full">
                 <h3 className="font-bold mb-3 md:mb-4 text-white text-base md:text-lg group-hover:text-brand-gold transition-colors duration-300 md:text-center">
                   1. {t('landing.stepssection.html_1_1')} {t('landing.stepssection.html_1_2')}
                 </h3>
                 <ul className="flex flex-col gap-4">
                   <FeatureItem 
                     icon={Zap} 
                     text={t('landing.stepssection.text6')} 
                   />
                   <FeatureItem 
                     icon={LayoutDashboard} 
                     text={t('landing.stepssection.text7')} 
                   />
                   <FeatureItem 
                     icon={MousePointerClick} 
                     text={t('landing.stepssection.text8')} 
                   />
                 </ul>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex flex-row md:flex-col items-start md:items-center relative group">
              {/* Mobile Connector Line */}
              <div className="md:hidden absolute left-[38.5px] top-[40px] bottom-[-104px] w-[3px] bg-brand-gold z-[-1]" />
              <div className="relative shrink-0 z-10 mr-6 md:mr-0 md:mb-12">

                 
                 {/* Avatar shape */}
                 <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-full border-[3px] border-brand-gold p-[4px] z-10 bg-landing-bg">
                   <div className="w-full h-full rounded-full overflow-hidden bg-black">
                      <img loading="lazy" src="/landingpage/a-2.webp" alt={t('landing.stepssection.text9')} className="w-full h-full object-cover transition-all duration-300 group-hover:scale-110" />
                   </div>
                 </div>
              </div>
              <div className="text-left mt-2 md:mt-0 flex-1 w-full">
                 <h3 className="font-bold mb-3 md:mb-4 text-white text-base md:text-lg group-hover:text-brand-gold transition-colors duration-300 md:text-center">
                   2. {t('landing.stepssection.html_2_1')} {t('landing.stepssection.html_2_2')}
                 </h3>
                 <ul className="flex flex-col gap-4">
                   <FeatureItem 
                     icon={Component} 
                     text={t('landing.stepssection.text11')} 
                   />
                   <FeatureItem 
                     icon={GitMerge} 
                     text={t('landing.stepssection.text12')} 
                   />
                   <FeatureItem 
                     icon={Sparkles} 
                     text={t('landing.stepssection.text13')} 
                   />
                 </ul>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex flex-row md:flex-col items-start md:items-center relative group">
              <div className="relative shrink-0 z-10 mr-6 md:mr-0 md:mb-12">

                 
                 {/* Avatar shape */}
                 <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-full border-[3px] border-brand-gold p-[4px] z-10 bg-landing-bg">
                   <div className="w-full h-full rounded-full overflow-hidden bg-black">
                      <img loading="lazy" src="/landingpage/a-3.webp" alt={t('landing.stepssection.text14')} className="w-full h-full object-cover transition-all duration-300 group-hover:scale-110" />
                   </div>
                 </div>
              </div>
              <div className="text-left mt-2 md:mt-0 flex-1 w-full">
                 <h3 className="font-bold mb-3 md:mb-4 text-white text-base md:text-lg group-hover:text-brand-gold transition-colors duration-300 md:text-center">
                   3. {t('landing.stepssection.html_3_1')} {t('landing.stepssection.html_3_2')}
                 </h3>
                 <ul className="flex flex-col gap-4">
                   <FeatureItem 
                     icon={Play} 
                     text={t('landing.stepssection.text16')} 
                   />
                   <FeatureItem 
                     icon={ShieldCheck} 
                     text={t('landing.stepssection.text17')} 
                   />
                   <FeatureItem 
                     icon={Share2} 
                     text={t('landing.stepssection.text18')} 
                   />
                 </ul>
              </div>
            </div>

          </div>
        </div>


      </motion.div>
    </section>
  );
};
