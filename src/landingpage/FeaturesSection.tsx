import React from 'react';
import { useLandingTranslation } from './LandingTranslationContext';
import { Check, Workflow } from 'lucide-react';
import { motion } from 'framer-motion';

import { ChatMessage, TypewriterText } from './components/ChatMessage';
export const FeaturesSection: React.FC = () => {
  const { t } = useLandingTranslation();

  const features = [
    t('landing.features.bullet1'),
    t('landing.features.bullet2'),
    t('landing.features.bullet3'),
    t('landing.features.bullet4')
  ];

  return (
    <section className="w-full bg-transparent py-8 md:py-24 px-4 text-[#1a1a1a]">
      <div className="max-w-[1600px] mx-auto px-[5%] md:px-16 flex flex-col md:flex-row items-center justify-between relative">
        
        {/* Left Side - Graphic Container */}
        <div className="w-full md:w-[48%] flex relative z-10 mb-12 md:mb-0">
          {/* Subtle glow behind the container */}
          <div className="absolute inset-0 bg-brand-gold/5 blur-[100px] rounded-full pointer-events-none"></div>
          
          {/* Connection Node (Top) */}
          <div id="node-features-top" className="absolute -top-[8px] left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-brand-gold z-20 hidden md:block"></div>
          
          <div className="w-full h-[500px] bg-landing-dark rounded-[2rem] relative overflow-hidden flex flex-col justify-center p-6 lg:p-10 border border-white/5 shadow-2xl">
             
             {/* Chat Interface */}
             <div className="flex flex-col gap-4 w-full relative z-10">
               
               {/* User Message 1 */}
               <ChatMessage type="user" delay={0.2} contentDelay={0.4}>
                 <TypewriterText delay={0.4} text={t('landing.features.chat1')} />
               </ChatMessage>

               {/* AI Message 2 */}
               <ChatMessage type="ai" delay={1.2} contentDelay={1.4}>
                 <TypewriterText delay={1.4} text={t('landing.features.chat2')} />
               </ChatMessage>

               {/* User Message 3 */}
               <ChatMessage type="user" delay={2.2} contentDelay={2.4}>
                 <TypewriterText delay={2.4} text={t('landing.features.chat3')} />
               </ChatMessage>

               {/* AI Message 4 */}
               <ChatMessage type="ai" delay={3.2} contentDelay={3.4} isWide>
                 <div className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                   <span className="font-medium text-[#eee]">
                     <TypewriterText delay={3.4} text={t('landing.features.chat4')} />
                   </span>
                 </div>
                 
                 {/* Button aligned with main site style */}
                 <motion.button 
                   initial="hidden"
                   whileInView="visible"
                   viewport={{ once: false }}
                   variants={{
                     hidden: { opacity: 0, scale: 0.9, transition: { duration: 0 } },
                     visible: { opacity: 1, scale: 1, transition: { duration: 0.4, delay: 3.9 } }
                   }}
                   className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-[#1c1d21] text-white text-[13px] font-semibold border border-white/5 hover:bg-brand-gold hover:border-transparent hover:text-white hover:scale-105 hover:shadow-none transition-all duration-300 group mt-1"
                 >
                   <Workflow className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                   {t('landing.features.loadCanvas')}
                 </motion.button>
               </ChatMessage>

               {/* User Message 5 */}
               <ChatMessage type="user" delay={4.6} contentDelay={4.8}>
                 <TypewriterText delay={4.8} text={t('landing.features.chat5')} />
               </ChatMessage>
             </div>

          </div>
          
          <div id="node-features-bottom" className="absolute -bottom-[8px] left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-brand-gold z-20 hidden md:block"></div>
        </div>

        {/* Right Side - Content */}
        <div className="w-full md:w-[48%] flex flex-col justify-between text-left pl-0 md:pl-4 py-4 md:py-8">
          <h2 className="text-4xl md:text-[46px] font-extrabold leading-[1.1] mb-6 text-[#1a1a1a]">
            {t('landing.features.title1')} <span className="text-brand-gold">{t('landing.features.title2')}</span> {t('landing.features.title3')}
          </h2>
          <p className="text-[#666] mb-10 text-[15px] leading-relaxed">
            {t('landing.features.subtitle')}
          </p>
          
          <ul className="space-y-4">
            {features.map((feature, idx) => (
              <li key={idx} className="flex items-center gap-4">
                <div className="w-6 h-6 rounded-full border-2 border-brand-gold flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 text-brand-gold stroke-[3px]" />
                </div>
                <span className="text-[#2a2a2a] text-[15px] font-medium">{feature}</span>
              </li>
            ))}
          </ul>
          
          {/* Removed Decorative Arrow */}
        </div>

      </div>
    </section>
  );
};
