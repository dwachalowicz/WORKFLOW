import React, { useState } from 'react';
import { motion, useAnimationFrame, AnimatePresence } from 'framer-motion';
import { useLandingTranslation } from './LandingTranslationContext';
import { Plus, Workflow, Database, Flag } from 'lucide-react';

const words = ["LOW", "ORCE", "UTURE"];

export const HeroSection: React.FC = () => {
  const { t } = useLandingTranslation();
  const [activeBubble, setActiveBubble] = useState<string | null>('korekta');
  const activeBubbleRef = React.useRef<string | null>('korekta');
  
  const [wordIndex, setWordIndex] = useState(0);
  
  const lastWordBeat = React.useRef(-1);

  useAnimationFrame((time) => {
    const duration = 10000;
    const elapsed = time % duration;
    
    let newBubble = null;
    if (elapsed < 800 || elapsed >= 9500) {
      newBubble = 'korekta';
    } else if (elapsed >= 1700 && elapsed < 2200) {
      newBubble = 'ok';
    } else if (elapsed >= 3100 && elapsed < 3900) {
      newBubble = 'poprawiam';
    } else if (elapsed >= 5300 && elapsed < 6300) {
      newBubble = 'akceptuj';
    }

    if (newBubble !== activeBubbleRef.current) {
      activeBubbleRef.current = newBubble;
      setActiveBubble(newBubble);
    }

    if (time >= 4000) {
      const currentWordBeat = Math.floor((time - 4000) / 6000);
      if (currentWordBeat !== lastWordBeat.current) {
        lastWordBeat.current = currentWordBeat;
        setWordIndex(prev => (prev + 1) % words.length);
      }
    }
  });

  return (
    <section className="relative w-full h-screen min-h-[1100px] md:min-h-[900px] flex flex-col items-center justify-center overflow-hidden bg-landing-bg text-white">
      {/* Background Image Overlay */}
      <div 
        className="absolute inset-0 w-full h-full bg-cover bg-center bg-no-repeat opacity-[0.15] pointer-events-none z-0"
        style={{ backgroundImage: 'url("/landingpage/bg-offer.webp")' }}
      />
      
      {/* Main Container matching Navbar margins (max-w-[1600px] px-[5%] md:px-16) */}
      <div className="absolute inset-0 w-full max-w-[1600px] mx-auto px-[5%] md:px-16 pointer-events-none z-10">
        
        {/* Background Huge Text "GRYF" and "GO RUN YOUR FLOW" Grouped on the Left */}
        <motion.div 
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 1.2, delay: 0.3, ease: "easeOut" }}
          className="absolute top-[12%] md:top-[18%] left-[5%] md:left-8 lg:left-16 flex flex-col items-start z-0 pointer-events-none select-none"
        >
          <span className="text-[80px] md:text-[130px] lg:text-[200px] xl:text-[250px] font-black text-white/10 leading-[0.8] tracking-tighter">{t('landing.hero.goRun')}</span>
          {/* GO RUN YOUR FLOW aligned perfectly to the left of GRYF */}
          <span className="text-xl md:text-3xl lg:text-6xl font-black text-primary mt-2 md:mt-3 lg:mt-4 ml-1 lg:ml-2 whitespace-nowrap flex items-center">
            {t('landing.hero.your')} <span className="w-2 md:w-3"></span>
            F
            <AnimatePresence mode="wait">
              <motion.span
                key={words[wordIndex]}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 1.5, ease: "easeInOut" }}
                className="inline-block origin-left"
              >
                {words[wordIndex]}
              </motion.span>
            </AnimatePresence>
          </span>
        </motion.div>

        {/* Right side Block: Mapuj Procesy AND the nicely fitted "4" */}
        <motion.div 
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 1.2, delay: 0.5, ease: "easeOut" }}
          className="flex absolute top-[62%] lg:top-[56%] mt-0 right-[5%] md:right-8 lg:right-16 translate-y-0 lg:-translate-y-1/2 flex-col items-start pointer-events-auto z-30"
        >
              <div
                className="flex flex-col items-start w-full origin-center"
              >
                 <h1 className="w-full text-[13px] lg:text-[16px] xl:text-[26px] font-bold text-[#666] uppercase tracking-[0.2em] mb-2 lg:mb-3 xl:mb-4 text-left leading-relaxed">
                   {t('landing.hero.map')}
                   {t('landing.hero.with') ? <><br/>{t('landing.hero.with')}</> : null}
                 </h1>
                 
                 <div className="flex flex-col items-start justify-center w-full">
                   <div className="flex flex-row items-center justify-start lg:justify-between gap-3 lg:gap-0 w-full">
                     {/* Icons column - exactly matches the height of "4" */}
                     <div className="flex flex-col gap-1.5 lg:gap-0 lg:justify-between h-auto lg:h-[160px] xl:h-[270px] z-10 py-0 lg:py-1">
                       <div className="w-6 h-6 lg:w-[40px] lg:h-[40px] xl:w-[60px] xl:h-[60px] border lg:border-2 border-white/20 rounded-md lg:rounded-xl flex items-center justify-center bg-transparent"><Plus className="w-3.5 h-3.5 lg:w-5 lg:h-5 xl:w-8 xl:h-8 text-[#777]" /></div>
                       <div className="w-6 h-6 lg:w-[40px] lg:h-[40px] xl:w-[60px] xl:h-[60px] border lg:border-2 border-white/20 rounded-md lg:rounded-xl flex items-center justify-center bg-transparent"><Database className="w-3.5 h-3.5 lg:w-5 lg:h-5 xl:w-8 xl:h-8 text-[#777]" /></div>
                       <div className="w-6 h-6 lg:w-[40px] lg:h-[40px] xl:w-[60px] xl:h-[60px] border lg:border-2 border-white/20 rounded-md lg:rounded-xl flex items-center justify-center bg-transparent"><Workflow className="w-3.5 h-3.5 lg:w-5 lg:h-5 xl:w-8 xl:h-8 text-[#777]" /></div>
                       <div className="w-6 h-6 lg:w-[40px] lg:h-[40px] xl:w-[60px] xl:h-[60px] border lg:border-2 border-white/20 rounded-md lg:rounded-xl flex items-center justify-center bg-transparent"><Flag className="w-3.5 h-3.5 lg:w-5 lg:h-5 xl:w-8 xl:h-8 text-[#777]" /></div>
                     </div>
                     
                     {/* Giant "4" - pushed to the right edge of the container */}
                     <span className="text-[120px] lg:text-[180px] xl:text-[310px] font-black text-white/10 leading-[0.75] tracking-tighter select-none flex items-center">
                       4
                     </span>
                   </div>
      
                   {/* NODES text perfectly left-aligned with the icons and MAP PROCESSES */  }
                   <div className="text-[22px] lg:text-[32px] xl:text-[56px] font-black tracking-widest text-brand-gold uppercase mt-2 lg:mt-3 xl:mt-4">
                     {t('landing.hero.nodes')}
                   </div>
                 </div>
              </div>
        </motion.div>
      </div>

      {/* Avatars Container (Over Radial Menu) */}
      <div className="absolute inset-0 w-full max-w-[1600px] mx-auto px-[5%] md:px-16 pointer-events-none z-30">
        {/* Map and Avatars Wrapper - Scaled down on mobile to fit the screen margins */}
        <div className="absolute inset-0 w-full h-full pointer-events-none z-30 scale-75 sm:scale-90 md:scale-90 lg:scale-100 origin-center -translate-x-6 lg:translate-x-0 translate-y-12 lg:translate-y-0">
          
          {/* Connecting Lines */}
          <div className="block absolute inset-0 w-full h-full z-0">
           {/* L1 & L2 left half (Bottom-left corner at 5%, 78.5%) */}
           <div className="absolute border-l-[2px] border-b-[2px] border-white/20 rounded-bl-[20px]" 
                style={{ left: '5%', top: '65%', width: '10%', height: 'calc(13.5% + 2px)' }}></div>
           
           {/* L2 right half & L3 top half (Top-right corner at 25%, 78.5%) */}
           <div className="absolute border-t-[2px] border-r-[2px] border-white/20 rounded-tr-[20px]" 
                style={{ left: '15%', top: '78.5%', width: '10%', height: 'calc(13.5% - 20px)' }}></div>
           
           {/* L3 bottom half & L4 (Bottom-left corner at 25%, 92%) */}
           <div className="absolute border-l-[2px] border-b-[2px] border-white/20 rounded-bl-[20px]" 
                style={{ left: 'calc(25% - 2px)', top: 'calc(92% - 20px)', width: '150vw', height: '22px' }}></div>

           {/* L5: Horizontal from Akceptuj to the right edge of the screen */}
           <div className="block absolute left-[100%] md:left-[88%] top-[5%] md:top-[20%] h-[2px] w-[150vw] bg-white/20"></div>
        </div>

        {/* Animated Single Dot Container (Must be isolated in z-50 to overcome stacking context) */}
        <div className="block absolute inset-0 w-full h-full z-50 pointer-events-none">
           {/* Desktop Dot */}
           <motion.div 
             className="hidden md:block absolute w-3 h-3 rounded-full"
             style={{ marginLeft: '-5px', marginTop: '-5px' }}
             animate={{ 
               left: ["5%", "5%", "5%", "25%", "25%", "25%", "50%", "50%", "150%", "150%", "88%", "88%", "150%", "150%", "50%", "25%", "25%", "5%", "5%", "5%"],
               top:  ["65%", "65%", "78.5%", "78.5%", "78.5%", "92%", "92%", "92%", "92%", "20%", "20%", "20%", "20%", "92%", "92%", "92%", "78.5%", "78.5%", "65%", "65%"],
               backgroundColor: [
                 "#d4af37", "#d4af37", "#d4af37", "#d4af37",
                 "#a855f7", "#a855f7", "#d4af37", "#d4af37",
                 "#f97316", "#f97316", "#d4af37", "#d4af37",
                 "#22c55e", "#22c55e", "#d4af37", "#d4af37",
                 "#d4af37", "#d4af37"
               ]
             }}
             transition={{ 
               duration: 10, 
               repeat: Infinity, 
               ease: "linear", 
               times: [0, 0.08, 0.12, 0.17, 0.22, 0.26, 0.31, 0.39, 0.47, 0.48, 0.53, 0.63, 0.68, 0.69, 0.77, 0.82, 0.86, 0.91, 0.95, 1],
               backgroundColor: {
                 duration: 10,
                 repeat: Infinity,
                 ease: "linear",
                 times: [0, 0.08, 0.081, 0.169, 0.17, 0.22, 0.221, 0.309, 0.31, 0.39, 0.391, 0.529, 0.53, 0.63, 0.631, 0.949, 0.95, 1]
               }
             }}
           />

           {/* Mobile Dot */}
           <motion.div 
             className="md:hidden absolute w-3 h-3 rounded-full"
             style={{ marginLeft: '-5px', marginTop: '-5px' }}
             animate={{ 
               left: ["5%", "5%", "5%", "25%", "25%", "25%", "50%", "50%", "150%", "150%", "100%", "100%", "150%", "150%", "50%", "25%", "25%", "5%", "5%", "5%"],
               top:  ["65%", "65%", "78.5%", "78.5%", "78.5%", "92%", "92%", "92%", "92%", "5%", "5%", "5%", "5%", "92%", "92%", "92%", "78.5%", "78.5%", "65%", "65%"],
               backgroundColor: [
                 "#d4af37", "#d4af37", "#d4af37", "#d4af37",
                 "#a855f7", "#a855f7", "#d4af37", "#d4af37",
                 "#f97316", "#f97316", "#d4af37", "#d4af37",
                 "#22c55e", "#22c55e", "#d4af37", "#d4af37",
                 "#d4af37", "#d4af37"
               ]
             }}
             transition={{ 
               duration: 10, 
               repeat: Infinity, 
               ease: "linear", 
               times: [0, 0.08, 0.12, 0.17, 0.22, 0.26, 0.31, 0.39, 0.47, 0.48, 0.53, 0.63, 0.68, 0.69, 0.77, 0.82, 0.86, 0.91, 0.95, 1],
               backgroundColor: {
                 duration: 10,
                 repeat: Infinity,
                 ease: "linear",
                 times: [0, 0.08, 0.081, 0.169, 0.17, 0.22, 0.221, 0.309, 0.31, 0.39, 0.391, 0.529, 0.53, 0.63, 0.631, 0.949, 0.95, 1]
               }
             }}
           />
        </div>

        {/* Avatar 1 */}
        <motion.div 
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, delay: 1.0, type: "spring", bounce: 0.4 }}
          className={`block absolute w-0 h-0 pointer-events-auto ${activeBubble === 'korekta' ? 'z-[60]' : 'z-40'}`} 
          style={{ left: '5%', top: '65%' }}
        >
           {/* Tooltip positioned over the avatar */}
           <div className={`absolute bottom-[110px] left-0 transform translate-x-[-20px] md:-translate-x-1/2 bg-black text-[15px] md:text-[18px] font-bold px-5 py-3.5 rounded-3xl shadow-2xl text-white z-50 transition-opacity duration-300 whitespace-normal text-center w-[150px] md:w-max max-w-[250px] ${activeBubble === 'korekta' ? 'opacity-100' : 'opacity-0'}`}>
             {t('landing.hero.tooltip1')}
             <div className="absolute -bottom-1.5 left-[20px] md:left-1/2 -translate-x-1/2 w-3 h-3 bg-black rotate-45"></div>
           </div>

           {/* Avatar Container pointing DOWN */}
           <div className="absolute w-20 h-20 bg-white/20 p-[4px] rounded-full rounded-br-none shadow-2xl flex items-center justify-center" style={{ left: '-40px', top: 'calc(-56.6px - 40px)', transform: 'rotate(45deg)' }}>
             <div className="w-full h-full rounded-full overflow-hidden bg-black" style={{ transform: 'rotate(-45deg)' }}>
               <img loading="lazy" src="/landingpage/avatar-hero1.webp" alt="Avatar" className="w-full h-full object-cover" />
             </div>
           </div>
        </motion.div>

        {/* Avatar 4 (OK) */}
        <motion.div 
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, delay: 1.2, type: "spring", bounce: 0.4 }}
          className={`block absolute w-0 h-0 pointer-events-auto ${activeBubble === 'ok' ? 'z-[60]' : 'z-40'}`} 
          style={{ left: '25%', top: '78.5%' }}
        >
           {/* Tooltip positioned over the avatar */}
           <div className={`absolute bottom-[110px] left-0 transform -translate-x-1/2 bg-black text-[15px] md:text-[18px] font-bold px-5 py-3.5 rounded-3xl shadow-2xl text-white z-50 transition-opacity duration-300 whitespace-normal text-center w-[150px] md:w-max max-w-[250px] ${activeBubble === 'ok' ? 'opacity-100' : 'opacity-0'}`}>
             {t('landing.hero.tooltip2')}
             <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-black rotate-45"></div>
           </div>

           {/* Avatar Container pointing DOWN */}
           <div className="absolute w-20 h-20 bg-white/20 p-[4px] rounded-full rounded-br-none shadow-2xl flex items-center justify-center" style={{ left: '-40px', top: 'calc(-56.6px - 40px)', transform: 'rotate(45deg)' }}>
             <div className="w-full h-full rounded-full overflow-hidden bg-black" style={{ transform: 'rotate(-45deg)' }}>
               <img loading="lazy" src="/landingpage/avatar-gryf.webp" alt="Avatar" className="w-full h-full object-cover" />
             </div>
           </div>
        </motion.div>

        {/* Avatar 2: Poprawiam (Grid Point P3: 50%, 92%) */}
        <motion.div 
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, delay: 1.4, type: "spring", bounce: 0.4 }}
          className={`block absolute w-0 h-0 pointer-events-auto ${activeBubble === 'poprawiam' ? 'z-[60]' : 'z-40'}`} 
          style={{ left: '50%', top: '92%' }}
        >
           {/* Avatar Container rotated to point down */}
           <div className="absolute w-20 h-20 bg-white/20 p-[4px] rounded-full rounded-br-none shadow-2xl flex items-center justify-center" style={{ left: '-40px', top: 'calc(-56.6px - 40px)', transform: 'rotate(45deg)' }}>
             <div className="w-full h-full rounded-full overflow-hidden bg-black" style={{ transform: 'rotate(-45deg)' }}>
               <img loading="lazy" src="/landingpage/avatar-hero3.webp" className="w-full h-full object-cover" alt={t('landing.hero.tooltip3')} />
             </div>
           </div>
           
           {/* Tooltip positioned over the avatar */}
           <div className={`absolute bottom-[110px] left-0 transform -translate-x-1/2 bg-black text-[15px] md:text-[18px] font-bold px-5 py-3.5 rounded-3xl shadow-2xl text-white z-50 transition-opacity duration-300 whitespace-normal text-center w-[150px] md:w-max max-w-[250px] ${activeBubble === 'poprawiam' ? 'opacity-100' : 'opacity-0'}`}>
             {t('landing.hero.tooltip3')}
             <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-black rotate-45"></div>
           </div>
        </motion.div>

        {/* Avatar 3: Akceptuj (Grid Point P6: 88%, 20%) */}
        <motion.div 
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, delay: 1.6, type: "spring", bounce: 0.4 }}
          className={`block absolute w-0 h-0 pointer-events-auto left-[100%] md:left-[88%] top-[5%] md:top-[20%] ${activeBubble === 'akceptuj' ? 'z-[60]' : 'z-40'}`} 
        >
           {/* Avatar Container rotated to point right */}
           <div className="absolute w-20 h-20 bg-white/20 p-[4px] rounded-full rounded-br-none shadow-2xl flex items-center justify-center" style={{ left: 'calc(-56.6px - 40px)', top: '-40px', transform: 'rotate(-45deg)' }}>
             <div className="w-full h-full rounded-full overflow-hidden bg-black" style={{ transform: 'rotate(45deg)' }}>
               <img loading="lazy" src="/landingpage/avatar-hero2.webp" className="w-full h-full object-cover" alt={t('landing.hero.tooltip4')} />
             </div>
           </div>
           
           {/* Tooltip positioned over the avatar */}
           <div className={`absolute bottom-[55px] right-[65px] transform translate-x-1/2 bg-black text-[15px] md:text-[18px] font-bold px-5 py-3.5 rounded-3xl shadow-2xl text-white z-50 transition-opacity duration-300 whitespace-normal text-center w-[150px] md:w-max max-w-[250px] ${activeBubble === 'akceptuj' ? 'opacity-100' : 'opacity-0'}`}>
             {t('landing.hero.tooltip4')}
             <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-black rotate-45"></div>
           </div>
        </motion.div>

        </div>

      </div>

      {/* Center Circular Menu and Gradients - Reduced Size */}
      <div className="absolute top-[40%] md:top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20 flex items-center justify-center [@media(min-width:2560px)]:scale-[1.1] [@media(min-width:3840px)]:scale-[1.2]">
         
         {/* Large lighter radial shadow */}
         <div className="absolute w-[800px] h-[800px] rounded-full bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.06)_0%,_rgba(255,255,255,0.02)_40%,_rgba(255,255,255,0)_70%)]"></div>
         {/* Smaller darker shadow directly under menu */}
         <div className="absolute w-[500px] h-[500px] rounded-full bg-[radial-gradient(circle_at_center,_rgba(0,0,0,0.9)_0%,_rgba(0,0,0,0.5)_40%,_rgba(0,0,0,0)_70%)]"></div>
         
         {/* Reduced Menu Size as requested */}
         <div className="w-[380px] h-[380px] md:w-[400px] md:h-[400px] lg:w-[500px] lg:h-[500px] pointer-events-auto relative">

          {/* Outer wrapper for the fast spin entrance */}
          <motion.div
            className="w-full h-full"
            initial={{ rotate: 1080, scale: 0, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            transition={{ duration: 2.5, type: "spring", bounce: 0.2, ease: "easeOut" }}
          >
            {/* Middle wrapper for the calm endless rotation */}
            <motion.div
              className="w-full h-full relative origin-center"
              style={{ perspective: 1500 }}
              animate={{
                y: [-5, 5, -5],
                rotate: [-1, 1, -1],
                scale: [1, 1.02, 1]
              }}
              transition={{
                duration: 8,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 2.5
              }}
            >
              {/* Inner Menu (Radial Menu Breathing) */}
              <motion.div
                className="absolute inset-0 w-full h-full origin-center"
                animate={{
                  scale: [1, 1.05, 1],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 2.5
                }}
              >
                <img 
                  src="/landingpage/menu-without-bg.webp" 
                  alt="Radial Menu" 
                  className="w-full h-full object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.8)]"
                />
              </motion.div>


            </motion.div>
          </motion.div>
         </div>
      </div>

    </section>
  );
};
