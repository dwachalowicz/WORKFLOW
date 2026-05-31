import React from 'react';
import { motion } from 'framer-motion';
import { MousePointer2, Clock, ChevronDown, Ban, Workflow, ArrowUpRight, Webhook } from 'lucide-react';

export const ProcessCanvasWindow: React.FC = () => {
  // Helper for nodes (scale & fade in)
  const nodeAnim = (startFraction: number) => {
    const end = startFraction + 0.015;
    return {
      initial: { opacity: 0, scale: 0.6, x: "-50%", y: "-30%" },
      animate: {
        opacity: [0, 0, 0, 1, 1],
        scale: [0.6, 0.6, 0.6, 1, 1],
        y: ["-30%", "-30%", "-30%", "-50%", "-50%"]
      },
      transition: {
        duration: 14,
        times: [0, 0.09, startFraction, end, 1],
        repeat: Infinity,
        ease: "easeOut",
        delay: 6.5
      }
    };
  };

  // Helper for svg paths (draw path)
  const pathAnim = (startFraction: number) => {
    const end = startFraction + 0.015;
    return {
      initial: { pathLength: 0, opacity: 0 },
      animate: {
        pathLength: [0, 0, 0, 1, 1],
        opacity: [0, 0, 0, 1, 1]
      },
      transition: {
        duration: 14,
        times: [0, 0.09, startFraction, end, 1],
        repeat: Infinity,
        ease: "easeInOut",
        delay: 6.5
      }
    };
  };

  // Helper for svg circles (fade in)
  const circleAnim = (startFraction: number) => {
    const end = startFraction + 0.01;
    return {
      initial: { opacity: 0 },
      animate: {
        opacity: [0, 0, 0, 1, 1]
      },
      transition: {
        duration: 14,
        times: [0, 0.09, startFraction, end, 1],
        repeat: Infinity,
        ease: "easeOut",
        delay: 6.5
      }
    };
  };

  // Helper for avatars (mini zoom effect)
  const avatarAnim = (startFraction: number, delayOffset: number) => {
    const popStart = startFraction + 0.015 + delayOffset;
    const popPeak = popStart + 0.01;
    const popEnd = popPeak + 0.015;
    return {
      animate: {
        scale: [1, 1, 1, 1.25, 1, 1]
      },
      transition: {
        duration: 14,
        times: [0, startFraction, popStart, popPeak, popEnd, 1],
        repeat: Infinity,
        ease: "easeInOut",
        delay: 6.5
      }
    };
  };

  // Master fade out for everything inside the canvas
  const wrapperAnim = {
    initial: { opacity: 0 },
    animate: { opacity: [0, 1, 1, 0, 0] },
    transition: {
      duration: 14,
      times: [0, 0.05, 0.42, 0.45, 1],
      repeat: Infinity,
      ease: "easeInOut",
      delay: 6.5
    }
  };

  return (
    <div className="w-full h-full bg-[#161616] rounded-3xl overflow-hidden flex flex-col border border-white/10">
      {/* Mac-style Window Header */}
      <div className="flex items-center justify-start px-5 py-3.5 bg-[#1e1e1e] border-b border-white/5 shrink-0 z-20">
        <div className="flex gap-2">
          <div className="w-3 h-3 rounded-full bg-white/20"></div>
          <div className="w-3 h-3 rounded-full bg-white/20"></div>
          <div className="w-3 h-3 rounded-full bg-white/20"></div>
        </div>
      </div>
      
      {/* Canvas Area */}
      <div className="flex-1 w-full bg-landing-bg relative overflow-hidden">
        {/* Grid Background */}
        <div 
          className="absolute inset-0 z-0 pointer-events-none opacity-40" 
          style={{ 
            backgroundImage: 'radial-gradient(#444 1px, transparent 1px)', 
            backgroundSize: '24px 24px',
            backgroundPosition: 'center center'
          }}
        ></div>

        {/* Wrapper that fades everything out exactly together */}
        <motion.div className="absolute inset-0 w-full h-full" {...wrapperAnim}>

        {/* Connecting Lines */}
        <svg className="absolute inset-0 w-full h-full z-10 pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
          {/* Start to Step 1 */}
          <motion.path d="M 50 15 L 50 40" stroke="#444" strokeWidth="0.4" strokeDasharray="1 1" fill="none" {...pathAnim(0.11)} />
          
          {/* Step 1 to Condition (Left Path - Purple) */}
          <motion.path d="M 50 40 C 50 53, 25 47, 25 60" stroke="#444" strokeWidth="0.5" strokeDasharray="1 1" fill="none" {...pathAnim(0.13)} />
          
          {/* Step 1 to Avatars (Right Path - Gray) */}
          <motion.path d="M 50 40 C 50 53, 75 47, 75 60" stroke="#444" strokeWidth="0.4" strokeDasharray="1 1" fill="none" {...pathAnim(0.13)} />

          {/* Condition to Purple Node */}
          <motion.path d="M 25 60 C 25 70, 25 75, 25 82" stroke="#444" strokeWidth="0.5" strokeDasharray="1 1" fill="none" {...pathAnim(0.15)} />

          {/* Avatars to Stop */}
          <motion.path d="M 75 60 C 75 70, 75 75, 75 82" stroke="#444" strokeWidth="0.4" strokeDasharray="1 1" fill="none" {...pathAnim(0.15)} />
          
          {/* Points/Circles at connections */}
          <motion.circle cx="50" cy="15" r="1.5" fill="#1c1c1e" stroke="#444" strokeWidth="0.4" {...circleAnim(0.11)} />
          <motion.circle cx="50" cy="40" r="1.5" fill="#1c1c1e" stroke="#444" strokeWidth="0.4" {...circleAnim(0.13)} />
          
          <motion.circle cx="25" cy="60" r="1.5" fill="#1c1c1e" stroke="#444" strokeWidth="0.4" {...circleAnim(0.15)} />
          <motion.circle cx="75" cy="60" r="1.5" fill="#1c1c1e" stroke="#444" strokeWidth="0.4" {...circleAnim(0.15)} />
          
          <motion.circle cx="25" cy="82" r="1.5" fill="#1c1c1e" stroke="#444" strokeWidth="0.4" {...circleAnim(0.17)} />
          <motion.circle cx="75" cy="82" r="1.5" fill="#1c1c1e" stroke="#444" strokeWidth="0.4" {...circleAnim(0.17)} />
        </svg>

        {/* Nodes - positioned via absolute centers */}
        
        {/* START Node */}
        <motion.div className="absolute z-20 flex items-center bg-[#1c1c1e] rounded-xl border-2 border-white/20 shadow-lg p-2.5 px-4 lg:p-3 lg:px-5 gap-3"
             style={{ left: '50%', top: '15%', x: "-50%", width: '55%' }}
             {...nodeAnim(0.10)}>
          <div className="flex items-center gap-1.5 shrink-0">
            <MousePointer2 className="w-3.5 h-3.5 text-gray-400" />
            <Webhook className="w-3.5 h-3.5 text-gray-400" />
            <Clock className="w-3.5 h-3.5 text-gray-400" />
          </div>
          <div className="flex flex-col">
            <span className="text-white font-bold text-xs lg:text-sm tracking-wide">START</span>
            <span className="text-gray-500 text-[9px] lg:text-[10px] font-semibold tracking-wider">WEBHOOK, SCH...</span>
          </div>
        </motion.div>

        {/* STEP 1 Node */}
        <motion.div className="absolute z-20 flex items-center justify-between bg-[#1c1c1e] rounded-2xl border border-white/5 shadow-2xl p-2.5 px-3 lg:p-3 lg:px-4"
             style={{ left: '50%', top: '40%', x: "-50%", width: '75%' }}
             {...nodeAnim(0.12)}>
          {/* Left part */}
          <div className="flex items-center gap-2 lg:gap-3">
            {/* Outline circle */}
            <div className="w-4 h-4 rounded-full border-2 border-white/40 -ml-1 flex-shrink-0"></div>
            <ChevronDown className="w-4 h-4 text-gray-500" />
            <span className="text-white font-bold text-sm lg:text-base tracking-wide">STEP 1</span>
          </div>
          {/* Right part */}
          <div className="flex items-center gap-4 lg:gap-6">
            <div className="flex -space-x-1.5">
              <motion.div className="w-6 h-6 lg:w-7 lg:h-7 rounded-full bg-[#2a2a2c] flex items-center justify-center text-[10px] font-bold text-white/70 z-10 border border-[#1c1c1e]" {...avatarAnim(0.12, 0.00)}>I</motion.div>
              <motion.div className="w-6 h-6 lg:w-7 lg:h-7 rounded-full bg-[#2a2a2c] flex items-center justify-center text-[10px] font-bold text-white/70 z-20 border border-[#1c1c1e]" {...avatarAnim(0.12, 0.01)}>S</motion.div>
            </div>
            {/* 3x2 dots grid */}
            <div className="grid grid-cols-3 gap-1 lg:gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-brand-gold"></div>
              <div className="w-1.5 h-1.5 rounded-full bg-brand-gold"></div>
              <div className="w-1.5 h-1.5 rounded-full bg-brand-gold"></div>
              <div className="w-1.5 h-1.5 rounded-full bg-brand-gold"></div>
              <div className="w-1.5 h-1.5 rounded-full bg-brand-gold"></div>
              <div className="w-1.5 h-1.5 rounded-full bg-brand-gold"></div>
            </div>
          </div>
        </motion.div>

        {/* Condition Node */}
        <motion.div className="absolute z-20 bg-[#1a1a1c] border border-white/10 rounded-full px-4 py-1.5 lg:px-5 lg:py-2 shadow-lg"
             style={{ left: '25%', top: '60%', x: "-50%" }}
             {...nodeAnim(0.14)}>
          <span className="text-white font-bold text-[11px] lg:text-xs whitespace-nowrap">$ &gt; 100</span>
        </motion.div>

        {/* Avatars Node */}
        <motion.div className="absolute z-20 flex bg-[#1a1a1c] border border-white/10 rounded-full p-1 shadow-lg"
             style={{ left: '75%', top: '60%', x: "-50%" }}
             {...nodeAnim(0.14)}>
          <div className="flex -space-x-2">
            <motion.img src="/landingpage/avatar-hero1.png" className="w-6 h-6 lg:w-7 lg:h-7 rounded-full border border-[#1c1c1e]" alt="User" {...avatarAnim(0.14, 0.00)} />
            <motion.img src="/landingpage/avatar-hero2.png" className="w-6 h-6 lg:w-7 lg:h-7 rounded-full border border-[#1c1c1e] z-10" alt="User" {...avatarAnim(0.14, 0.01)} />
          </div>
        </motion.div>

        {/* Purple Box Node (SUBWORKFLOW) */}
        <motion.div className="absolute z-20 flex items-center justify-center w-12 h-12 lg:w-16 lg:h-16 bg-[#161618] border-2 border-dashed border-white/20 rounded-full shadow-lg"
             style={{ left: '25%', top: '82%', x: "-50%" }}
             {...nodeAnim(0.16)}>
          <Workflow className="w-5 h-5 lg:w-6 lg:h-6 text-gray-400" />
          <div className="absolute -bottom-0.5 -right-0.5 lg:-bottom-1 lg:-right-1 w-5 h-5 lg:w-6 lg:h-6 bg-[#333] rounded-full flex items-center justify-center shadow-md border border-white/10">
            <ArrowUpRight className="w-3 h-3 lg:w-4 lg:h-4 text-white" />
          </div>
        </motion.div>

        {/* STOP Node */}
        <motion.div className="absolute z-20 flex items-center justify-center gap-2 bg-[#1c1c1e] rounded-xl border border-white/20 shadow-lg px-4 py-2 lg:px-6 lg:py-2.5"
             style={{ left: '75%', top: '82%', x: "-50%", width: '38%' }}
             {...nodeAnim(0.16)}>
          <Ban className="w-4 h-4 text-gray-500 shrink-0" />
          <span className="text-white font-bold text-xs lg:text-sm tracking-wide">STOP</span>
        </motion.div>
        
        </motion.div>

      </div>
    </div>
  );
};
