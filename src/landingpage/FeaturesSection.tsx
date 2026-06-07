import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLandingTranslation } from './LandingTranslationContext';
import { Check, Workflow, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, useInView } from 'framer-motion';

import { ChatMessage, TypewriterText, DelayedReveal } from './components/ChatMessage';
import { fetchAllTools } from '../lib/aiService';
import { pb } from '../lib/pocketbase';
import { ChatAnimationContext } from './components/ChatAnimationContext';

export const FeaturesSection: React.FC = () => {
  const { t } = useLandingTranslation();
  const [demoTools, setDemoTools] = useState<import('../lib/aiService').ToolFromCatalog[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollWrapperRef = useRef<HTMLDivElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);

  const scrollCarousel = (dir: 'left' | 'right') => {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({ left: dir === 'left' ? -220 : 220, behavior: 'smooth' });
    }
  };
  const isInView = useInView(containerRef, { once: false, amount: 0.3 });
  const hasStarted = isInView;
  const contextValue = useMemo(() => ({ hasStarted }), [hasStarted]);

  // Auto scroll effect — smooth scroll that follows new content
  useEffect(() => {
    if (hasStarted) {
      const interval = setInterval(() => {
        // Scroll the inner chat wrapper to bottom
        if (scrollWrapperRef.current) {
          scrollWrapperRef.current.scrollTo({ top: scrollWrapperRef.current.scrollHeight, behavior: 'smooth' });
        }
      }, 500);
      
      // Stop auto-scrolling after the last message (approx 11s)
      const timeout = setTimeout(() => clearInterval(interval), 11000);
      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }
  }, [hasStarted]);

  useEffect(() => {
    const loadDemoTools = async () => {
      try {
        let toolsNamesStr = 'n8n, Make';
        try {
          const settings = await pb.collection('WORKFLOW_site_settings').getFirstListItem('', { requestKey: null });
          if (settings.demo_tools) toolsNamesStr = settings.demo_tools as string;
        } catch {
          // Settings not found — use default demo tools
        }
        
        const tools = await fetchAllTools();
        const demoNames = toolsNamesStr.split(',').map(s => s.trim().toLowerCase());
        let selected = demoNames.map(name => tools.find(t => t.name.toLowerCase().includes(name))).filter(Boolean);
        
        if (selected.length === 0) {
          selected = tools.slice(0, 2);
        }
        setDemoTools(selected);
      } catch (err) {
        console.error(err);
      }
    };
    loadDemoTools();
  }, []);

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
          
          <div ref={containerRef} className="w-full h-[500px] bg-landing-dark rounded-[2rem] relative overflow-hidden flex flex-col justify-start pt-8 pb-4 px-2 lg:px-6 border border-white/5 shadow-2xl">
             
             {/* Chat Interface */}
             <ChatAnimationContext.Provider value={contextValue}>
               <div ref={scrollWrapperRef} className="flex flex-col gap-4 w-full h-full overflow-y-auto overflow-x-hidden relative z-10 px-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent pr-2 pb-10 scroll-smooth">
                 
                 {/* User Message 1 */}
                 <ChatMessage type="user" delay={0.2}>
                   <TypewriterText delay={0.4} text={t('landing.features.chat1')} />
                 </ChatMessage>

                 {/* AI Message 2 */}
                 <ChatMessage type="ai" delay={1.2}>
                   <TypewriterText delay={1.4} text={t('landing.features.chat2')} />
                 </ChatMessage>

                 {/* User Message 3 */}
                 <ChatMessage type="user" delay={2.2}>
                   <TypewriterText delay={2.4} text={t('landing.features.chat3')} />
                 </ChatMessage>

                 {/* AI Message 4 */}
                 <ChatMessage type="ai" delay={3.2} isWide>
                   <div className="flex items-center gap-2">
                     <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                     <span className="font-medium text-[#eee]">
                       <TypewriterText delay={3.4} text={t('landing.features.chat4')} />
                     </span>
                   </div>
                   
                   {/* Button aligned with main site style */}
                   <DelayedReveal delay={3.9}>
                     <motion.button 
                       initial="hidden"
                       animate="visible"
                       variants={{
                         hidden: { opacity: 0, scale: 0.9, transition: { duration: 0 } },
                         visible: { opacity: 1, scale: 1, transition: { duration: 0.4 } }
                       }}
                       className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-[#1c1d21] text-white text-[13px] font-semibold border border-white/5 hover:bg-brand-gold hover:border-transparent hover:text-white hover:scale-105 hover:shadow-none transition-all duration-300 group mt-1"
                     >
                       <Workflow className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                       {t('landing.features.loadCanvas')}
                     </motion.button>
                   </DelayedReveal>
                 </ChatMessage>

                 {/* User Message 5 */}
                 <ChatMessage type="user" delay={4.6}>
                   <TypewriterText delay={4.8} text={t('landing.features.chat5')} />
                 </ChatMessage>

                 {/* AI Message 6 */}
                 <ChatMessage type="ai" delay={6.0}>
                   <TypewriterText delay={6.2} text={t('landing.features.chat6')} />
                 </ChatMessage>

                 {/* User Message 7 */}
                 <ChatMessage type="user" delay={7.4}>
                   <TypewriterText delay={7.6} text={t('landing.features.chat7')} />
                 </ChatMessage>

                 {/* AI Message 8 with Tools Mockup */}
                 <ChatMessage type="ai" delay={8.8} isWide>
                   <div className="flex flex-col gap-3 w-full">
                     <div className="flex items-center gap-2">
                       <span className="font-medium text-[#eee]">
                         <TypewriterText delay={9.0} text={t('landing.features.chat8')} />
                       </span>
                     </div>
                     <DelayedReveal delay={9.6}>
                       <div className="relative mt-1">
                         <div className="flex items-center justify-between mb-2">
                           <span className="text-[10px] text-[#aaa] uppercase tracking-wider font-bold">{t('landing.features.recommendedTools')}</span>
                           <div className="flex gap-1">
                             <button onClick={() => scrollCarousel('left')} className="w-6 h-6 rounded-full bg-[#2a2a2a] text-[#888] hover:text-[#eee] flex items-center justify-center transition-colors"><ChevronLeft size={14} /></button>
                             <button onClick={() => scrollCarousel('right')} className="w-6 h-6 rounded-full bg-[#2a2a2a] text-[#888] hover:text-[#eee] flex items-center justify-center transition-colors"><ChevronRight size={14} /></button>
                           </div>
                         </div>
                         <motion.div
                           ref={carouselRef}
                           initial="hidden"
                           animate="visible"
                           variants={{
                             hidden: { opacity: 0, x: 20, transition: { duration: 0 } },
                             visible: { opacity: 1, x: 0, transition: { duration: 0.5 } }
                           }}
                           className="flex gap-3 overflow-x-auto snap-x hide-scrollbar pb-2"
                         >
                           {demoTools.length > 0 ? demoTools.map((tool, idx) => (
                             <div key={idx} className="min-w-[200px] max-w-[200px] shrink-0 rounded-xl overflow-hidden bg-[#2a2a2a] transition-all snap-start group flex flex-col cursor-pointer">
                               <div className="h-[120px] overflow-hidden flex items-center justify-center">
                                 {tool.logoUrl ? (
                                   <img loading="lazy" src={tool.logoUrl} alt={tool.name} className="w-full h-full object-cover" />
                                 ) : (
                                   <div className="text-white font-black text-xl">{tool.name}</div>
                                 )}
                               </div>
                               <div className="p-4 flex flex-col flex-1 bg-[#2a2a2a]">
                                 <h4 className="text-[13px] font-bold text-white mb-1.5">{tool.name}</h4>
                                 <p className="text-[11px] text-[#aaa] leading-relaxed line-clamp-3 mb-4 flex-1">
                                   {tool.shortDesc || tool.fullDesc || t('landing.features.toolDescFallback')}
                                 </p>
                                 <button className="w-full py-2 bg-[#1c1d21] rounded-lg text-[11px] font-semibold text-white group-hover:bg-[#333] transition-colors">
                                   {t('landing.features.moreAboutTool')}
                                 </button>
                               </div>
                             </div>
                           )) : (
                             <div className="text-white/50 text-sm py-4">{t('landing.features.loadingRecommendations')}</div>
                           )}
                         </motion.div>
                       </div>
                     </DelayedReveal>
                   </div>
                 </ChatMessage>
              </div>
            </ChatAnimationContext.Provider>
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
