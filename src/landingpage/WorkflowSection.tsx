import React from 'react';
import { useLandingTranslation } from './LandingTranslationContext';
import { 
  Check, 
  RotateCcw, 
  Menu, 
  ChevronUp, 
  Clock, 
  CheckSquare, 
  Database, 
  MessageSquare, 
  Mail, 
  CheckCircle2, 
  ArrowUpDown,
  Workflow,
  Webhook
} from 'lucide-react';
import { motion } from 'framer-motion';
export const WorkflowSection: React.FC = () => {
  const { t } = useLandingTranslation();

  return (
    <section className="w-full bg-transparent py-8 md:py-24 px-4 text-[#1a1a1a]">
      <div className="max-w-[1600px] mx-auto px-[5%] md:px-16 flex flex-col-reverse md:flex-row items-center justify-between relative">
        
        {/* Left Content (Text) */}
        <div className="w-full md:w-[48%] flex flex-col items-start justify-center text-left pr-0 md:pr-4 py-4 md:py-8">
          <h2 className="text-4xl md:text-[46px] font-extrabold leading-[1.1] mb-6 text-[#1a1a1a]">
            {t('landing.workflowsection.text1')} <span className="text-brand-gold">{t('landing.workflowsection.text2')}</span> {t('landing.workflowsection.text3')}
          </h2>
          <p className="text-[#666] mb-10 text-[15px] leading-relaxed">
            {t('wf_desc', t('landing.workflowsection.text4'))}
          </p>

          <ul className="space-y-4">
            <li className="flex items-center gap-4">
              <div className="w-6 h-6 rounded-full border-2 border-brand-gold flex items-center justify-center shrink-0">
                <Check className="w-3 h-3 text-brand-gold stroke-[3px]" />
              </div>
              <span className="text-[#2a2a2a] text-[15px] font-medium">{t('landing.workflowsection.text5')}<strong className="text-[#1a1a1a] font-bold">{t('landing.workflowsection.text6')}</strong>{t('landing.workflowsection.text7')}</span>
            </li>
            <li className="flex items-center gap-4">
              <div className="w-6 h-6 rounded-full border-2 border-brand-gold flex items-center justify-center shrink-0">
                <Check className="w-3 h-3 text-brand-gold stroke-[3px]" />
              </div>
              <span className="text-[#2a2a2a] text-[15px] font-medium">{t('landing.workflowsection.text8')}</span>
            </li>
            <li className="flex items-center gap-4">
              <div className="w-6 h-6 rounded-full border-2 border-brand-gold flex items-center justify-center shrink-0">
                <Check className="w-3 h-3 text-brand-gold stroke-[3px]" />
              </div>
              <span className="text-[#2a2a2a] text-[15px] font-medium">{t('landing.workflowsection.text9')}</span>
            </li>
            <li className="flex items-center gap-4">
              <div className="w-6 h-6 rounded-full border-2 border-brand-gold flex items-center justify-center shrink-0">
                <Check className="w-3 h-3 text-brand-gold stroke-[3px]" />
              </div>
              <span className="text-[#2a2a2a] text-[15px] font-medium">{t('landing.workflowsection.text10')}</span>
            </li>
          </ul>

          {/* Removed Decorative Arrow */}
        </div>

        {/* Right Graphic Mockup */}
        <div className="w-full md:w-[48%] flex relative z-10 mb-12 md:mb-0">
          <div className="w-full h-[500px] bg-landing-dark rounded-[2rem] border border-white/10 shadow-2xl relative overflow-hidden flex flex-col justify-center"
               style={{ backgroundImage: 'radial-gradient(circle at center, #26272b 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
            
            <div className="w-full h-full overflow-x-auto overflow-y-hidden slim-scrollbar md:no-scrollbar">
              <div className="relative min-w-[850px] h-full -ml-4 md:-ml-12 lg:-ml-[86px]">

              {/* SVG Paths Overlay */}
              <svg className="absolute inset-0 w-[850px] h-[550px] pointer-events-none z-0">
                
                {/* Start to CENA > 0 */}
                <motion.path 
                  initial={{ pathLength: 0 }}
                  whileInView={{ pathLength: 1 }}
                  viewport={{ once: false, amount: 0.5 }}
                  transition={{ duration: 0.6, delay: 0.15 }}
                  d="M 200 128 C 200 194, 240 194, 290 194" stroke="#52525b" strokeWidth="2" strokeDasharray="4,4" fill="none" />
                
                {/* Start to Otherwi... */}
                <motion.path 
                  initial={{ pathLength: 0 }}
                  whileInView={{ pathLength: 1 }}
                  viewport={{ once: false, amount: 0.5 }}
                  transition={{ duration: 0.6, delay: 0.25 }}
                  d="M 200 128 C 200 334, 230 334, 278 334" stroke="#52525b" strokeWidth="2" strokeDasharray="4,4" fill="none" />
                
                {/* Otherwi... to underneath Alternatywn */}
                <motion.path 
                  initial={{ pathLength: 0 }}
                  whileInView={{ pathLength: 1 }}
                  viewport={{ once: false, amount: 0.5 }}
                  transition={{ duration: 0.6, delay: 0.45 }}
                  d="M 408 334 L 560 334" stroke="#52525b" strokeWidth="2" strokeDasharray="4,4" fill="none" />
                
                {/* CENA > 0 to Alternatywn */}
                <motion.path 
                  initial={{ pathLength: 0 }}
                  whileInView={{ pathLength: 1 }}
                  viewport={{ once: false, amount: 0.5 }}
                  transition={{ duration: 0.6, delay: 0.35 }}
                  d="M 436 194 L 504 194" stroke="#52525b" strokeWidth="2" strokeDasharray="4,4" fill="none" />

                {/* Database to Alternatywn */}
                <motion.path 
                  initial={{ pathLength: 0 }}
                  whileInView={{ pathLength: 1 }}
                  viewport={{ once: false, amount: 0.5 }}
                  transition={{ duration: 0.4, delay: 0.6 }}
                  d="M 437 426 L 470 426" stroke="#06b6d4" strokeWidth="2" strokeDasharray="4,4" fill="none" />
                <motion.path 
                  initial={{ pathLength: 0 }}
                  whileInView={{ pathLength: 1 }}
                  viewport={{ once: false, amount: 0.5 }}
                  transition={{ duration: 0.4, delay: 0.8 }}
                  d="M 502 426 L 550 426 Q 570 426 570 419 L 570 413" stroke="#06b6d4" strokeWidth="2" strokeDasharray="4,4" fill="none" />
                
                {/* Alternatywn to Right edge */}
                <motion.path 
                  initial={{ pathLength: 0 }}
                  whileInView={{ pathLength: 1 }}
                  viewport={{ once: false, amount: 0.5 }}
                  transition={{ duration: 0.6, delay: 0.9 }}
                  d="M 806 252 L 850 252" stroke="#52525b" strokeWidth="2" strokeDasharray="4,4" fill="none" />
              </svg>

              {/* Top Right Buttons */}
              <div className="absolute top-8 right-8 flex items-center gap-1 bg-[#1e1f23] rounded-full p-1 border border-white/10 shadow-lg z-10">
                <button className="w-8 h-8 rounded-full flex items-center justify-center text-white/70 hover:text-white transition-colors">
                  <RotateCcw className="w-4 h-4" />
                </button>
                <div className="w-[1px] h-4 bg-gray-700/60 mx-1"></div>
                <button className="w-8 h-8 rounded-full flex items-center justify-center text-white/70 hover:text-white transition-colors">
                  <Menu className="w-4 h-4" />
                </button>
              </div>

              {/* START SUBWORKFLOW Node */}
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: false, amount: 0.5 }}
                transition={{ delay: 0.1 }}
                className="absolute top-[66px] left-[120px] w-[160px] h-[56px] bg-landing-node border border-[#34d399]/80 rounded-[14px] px-3 flex items-center gap-3 z-10 shadow-lg">
                <div className="text-[#a855f7] flex-shrink-0">
                  <Workflow className="w-5 h-5 -rotate-90" />
                </div>
                <div className="flex flex-col">
                  <span className="text-white font-bold text-[14px] tracking-wide leading-tight">START</span>
                  <span className="text-white/60 text-[10px] uppercase tracking-wider font-semibold">SUBWORKFLOW</span>
                </div>
                {/* Bottom Handle */}
                <div className="absolute -bottom-[6px] left-[74px] w-3 h-3 rounded-full bg-brand-gold z-20"></div>
              </motion.div>

              {/* CENA > 0 Node */}
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: false, amount: 0.5 }}
                transition={{ delay: 0.2 }}
                className="absolute top-[176px] left-[290px] w-[140px] h-[36px] bg-landing-node border border-white/10 rounded-full pl-4 pr-1 flex items-center justify-between z-10 shadow-lg">
                <span className="text-white font-bold text-xs">{t('landing.workflowsection.text21')}</span>
                <div className="flex -space-x-1.5">
                  <div className="w-6 h-6 rounded-full bg-[#ec4899] flex items-center justify-center text-white text-[10px] font-bold border-[2px] border-[#16171a] z-20">M</div>
                  <img loading="lazy" src="/landingpage/avatar-hero1.png" alt="Avatar" className="w-6 h-6 rounded-full border-[2px] border-[#16171a] z-10 object-cover" />
                </div>
                {/* Output handle */}
                <div className="absolute right-[-6px] top-[12px] w-3 h-3 rounded-full bg-brand-gold z-20"></div>
              </motion.div>

              {/* Otherwise Node */}
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: false, amount: 0.5 }}
                transition={{ delay: 0.3 }}
                className="absolute top-[316px] left-[278px] w-[130px] h-[36px] bg-landing-node border border-white/10 rounded-full pl-4 pr-1 flex items-center justify-between z-10 shadow-lg">
                <span className="text-white font-bold text-xs">{t('landing.workflowsection.text22')}</span>
                <div className="w-6 h-6 rounded-full bg-[#10b981] flex items-center justify-center text-white text-[10px] font-bold border-[2px] border-[#16171a]">S</div>
              </motion.div>

              {/* Alternatywna Node */}
              <motion.div 
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: false, amount: 0.1 }}
                transition={{ delay: 0.1 }}
                className="absolute top-[66px] left-[510px] bg-landing-node border border-brand-gold/80 rounded-xl w-[290px] h-[340px] shadow-2xl z-20 flex flex-col">
                <div className="p-4 border-b border-white/10 flex-shrink-0">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <ChevronUp className="w-4 h-4 text-white/70" />
                      <span className="text-white font-bold text-[15px] tracking-wide">{t('landing.workflowsection.text11')}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex -space-x-1.5">
                        <div className="w-[22px] h-[22px] rounded-full bg-[#ec4899] flex items-center justify-center text-white text-[10px] font-bold border-[2px] border-[#16171a] z-30">M</div>
                        <img loading="lazy" src="/landingpage/avatar-hero1.png" className="w-[22px] h-[22px] rounded-full border-[2px] border-[#16171a] z-20 object-cover" />
                        <img loading="lazy" src="/landingpage/avatar-hero2.png" className="w-[22px] h-[22px] rounded-full border-[2px] border-[#16171a] z-10 object-cover" />
                      </div>
                      {/* Dots grid */}
                      <div className="grid grid-cols-3 gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#facc15]"></div>
                        <div className="w-1.5 h-1.5 rounded-full bg-[#3b82f6]"></div>
                        <div className="w-1.5 h-1.5 rounded-full bg-[#10b981]"></div>
                        <div className="w-1.5 h-1.5 rounded-full bg-[#ec4899]"></div>
                        <div className="w-1.5 h-1.5 rounded-full bg-[#a855f7]"></div>
                        <div className="w-1.5 h-1.5 rounded-full bg-[#f97316]"></div>
                      </div>
                    </div>
                  </div>
                  <div className="text-white/70 text-[11px]">{t('landing.workflowsection.text12')}</div>
                </div>
                
                <div className="p-4 flex flex-col justify-between flex-1">
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap gap-2">
                      <div className="bg-[#1e1f23]/60 text-gray-300 px-2 py-1 rounded border border-white/10 text-[11px] flex items-center gap-1.5">
                        <Clock className="w-[14px] h-[14px] text-white/60" /> 15
                      </div>
                      <div className="bg-[#1e1f23]/60 text-gray-300 px-2 py-1 rounded border border-white/10 text-[11px] flex items-center gap-1.5">
                        <CheckSquare className="w-[14px] h-[14px] text-white/60" /> {t('landing.workflowsection.text13')}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <div className="bg-[#1e1f23]/60 text-gray-300 px-2 py-1 rounded border border-white/10 text-[11px] flex items-center gap-1.5">
                        <Database className="w-[14px] h-[14px] text-white/60" /> {t('landing.workflowsection.text14')}
                      </div>
                      <div className="bg-[#1e1f23]/60 text-gray-300 px-2 py-1 rounded border border-white/10 text-[11px] flex items-center gap-1.5">
                        <MessageSquare className="w-[14px] h-[14px] text-white/60" /> 1
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-white/70 text-xs">{t('landing.workflowsection.text15')}</span>
                    <div className="w-[22px] h-[22px] rounded-full bg-[#ec4899] flex items-center justify-center text-white text-[10px] font-bold">M</div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-white/70 text-xs">{t('landing.workflowsection.text16')}</span>
                    <div className="flex -space-x-1.5">
                      <img loading="lazy" src="/landingpage/avatar-hero1.png" className="w-[22px] h-[22px] rounded-full border-[2px] border-[#16171a] z-20 object-cover" />
                      <img loading="lazy" src="/landingpage/avatar-hero2.png" className="w-[22px] h-[22px] rounded-full border-[2px] border-[#16171a] z-10 object-cover" />
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-white/70 text-[11px] leading-tight">{t('landing.workflowsection.text17')}<br/>{t('landing.workflowsection.text18')}</span>
                    <div className="flex items-center gap-1.5">
                      <div className="w-7 h-7 rounded-md bg-[#2a1f3d] flex items-center justify-center">
                        <Webhook className="w-[14px] h-[14px] text-[#a855f7]" />
                      </div>
                      <div className="w-7 h-7 rounded-md bg-[#1e293b] flex items-center justify-center">
                        <Mail className="w-[14px] h-[14px] text-[#3b82f6]" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-white/70 text-[11px] leading-tight">{t('landing.workflowsection.text19')}<br/>{t('landing.workflowsection.text20')}</span>
                    <div className="flex items-center gap-1.5">
                      <div className="w-7 h-7 rounded-md bg-[#2a1f3d] flex items-center justify-center">
                        <Webhook className="w-[14px] h-[14px] text-[#a855f7]" />
                      </div>
                      <div className="w-7 h-7 rounded-md bg-[#132a22] flex items-center justify-center">
                        <CheckCircle2 className="w-[14px] h-[14px] text-[#10b981]" />
                      </div>
                      <div className="w-7 h-7 rounded-md bg-[#1e293b] flex items-center justify-center">
                        <Mail className="w-[14px] h-[14px] text-[#3b82f6]" />
                      </div>
                      <div className="w-7 h-7 rounded-md bg-[#2d3748] flex items-center justify-center text-white/70 text-xs font-bold leading-none">
                        ...
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Input Handle 1 (Cena > 0) */}
                <div className="absolute left-[-6px] top-[122px] w-3 h-3 rounded-full bg-brand-gold z-20"></div>
                {/* Input Handle 2 (Database) */}
                <div className="absolute left-[54px] -bottom-[6px] w-3 h-3 rounded-[3px] bg-brand-gold z-20"></div>
                {/* Output Handle */}
                <div className="absolute right-[-6px] top-[180px] w-3 h-3 rounded-full bg-brand-gold z-20"></div>
              </motion.div>

              {/* Database Circle Node */}
              <motion.div 
                initial={{ opacity: 0, scale: 0 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: false, amount: 0.5 }}
                transition={{ delay: 0.5 }}
                className="absolute top-[386px] left-[350px] w-[80px] h-[80px] rounded-full border-[1.5px] border-[#06b6d4] bg-landing-dark flex items-center justify-center z-10">
                <Database className="w-8 h-8 text-[#06b6d4]" />
                {/* Output handle */}
                <div className="absolute right-[-7px] top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-[4px] bg-brand-gold z-20"></div>
              </motion.div>

              {/* Swap Arrows Node (on the path) */}
              <motion.div 
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: false, amount: 0.5 }}
                transition={{ delay: 0.7 }}
                className="absolute top-[410px] left-[470px] w-8 h-8 rounded-full bg-landing-dark flex items-center justify-center z-10 border border-[#06b6d4]">
                <ArrowUpDown className="w-4 h-4 text-[#06b6d4]" />
              </motion.div>

            </div>
            </div>
          </div>
          
          {/* Connection Node (Top) */}
          <div id="node-workflow-top" className="absolute -top-[8px] left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-brand-gold z-20 hidden md:block"></div>
          
          {/* Connection Node (Bottom) */}
          <div id="node-workflow-bottom" className="absolute -bottom-[8px] left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-brand-gold z-20 hidden md:block"></div>
        </div>

      </div>
    </section>
  );
};
