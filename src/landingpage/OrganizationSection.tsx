import React from 'react';
import { Check, Workflow, Share2, GitFork, ArrowRightLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLandingTranslation } from './LandingTranslationContext';

interface NodeProps {
  title: string;
  count: number;
  className?: string;
  delay?: number;
}

const WorkflowNode = ({ title, count, className, delay = 0 }: NodeProps) => {
  const { t } = useLandingTranslation();
  return (
  <motion.div 
    initial={{ opacity: 0, scale: 0.95 }}
    whileInView={{ opacity: 1, scale: 1 }}
    viewport={{ once: false, amount: 0.5 }}
    transition={{ duration: 0.5, delay }}
    className={`absolute bg-[#18181b] border border-white/10 rounded-xl p-3 flex items-center gap-3 w-[210px] shadow-2xl z-10 ${className}`}
  >
    <div className="w-10 h-10 rounded-lg bg-[#2b1d3d] flex items-center justify-center shrink-0">
      <Workflow className="w-[20px] h-[20px] text-[#b774ff]" />
    </div>
    <div className="flex flex-col">
      <span className="text-white font-medium text-[14px] leading-tight mb-0.5">{title}</span>
      <div className="flex items-center gap-1.5 text-white/60">
        <Share2 className="w-[11px] h-[11px]" />
        <span className="text-[11px] font-medium">{count} {t('landing.organizationsection.text1')}</span>
      </div>
    </div>
    <div className="absolute left-[-6px] top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-brand-gold"></div>
    <div className="absolute right-[-6px] top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-brand-gold"></div>
  </motion.div>
  );
};

export const OrganizationSection: React.FC = () => {
  const { t } = useLandingTranslation();
  return (
    <section className="w-full bg-transparent pt-8 pb-16 md:py-24 px-4 text-[#1a1a1a]">
      <div className="max-w-[1600px] mx-auto px-[5%] md:px-16 flex flex-col md:flex-row items-center justify-between relative">
        
        {/* Left Graphic Mockup */}
        <div className="w-full md:w-[48%] flex relative z-10 mb-12 md:mb-0">
          <div className="w-full h-[500px] bg-[#0e0e11] rounded-[2rem] border border-white/10 shadow-2xl relative overflow-hidden flex flex-col justify-center"
               style={{ backgroundImage: 'radial-gradient(circle, #2a2a2a 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
            
            <div className="w-full h-full overflow-x-auto overflow-y-hidden slim-scrollbar md:no-scrollbar">
              <div className="relative min-w-[620px] h-full">
                
                {/* SVG Lines */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                   {/* Straight line */}
                   <motion.path 
                      initial={{ pathLength: 0 }}
                      whileInView={{ pathLength: 1 }}
                      viewport={{ once: false, amount: 0.5 }}
                      transition={{ duration: 1, delay: 0.2 }}
                      d="M 0 250 L 380 250" fill="none" stroke="#444" strokeWidth="1.5" />
                   
                   {/* Top off-screen curve */}
                   <motion.path 
                      initial={{ pathLength: 0 }}
                      whileInView={{ pathLength: 1 }}
                      viewport={{ once: false, amount: 0.5 }}
                      transition={{ duration: 1, delay: 0.4 }}
                      d="M 310 0 C 310 140, 340 250, 380 250" fill="none" stroke="#444" strokeWidth="1.5" />
                   
                   {/* Dashed curve from top node */}
                   <motion.path 
                      initial={{ pathLength: 0 }}
                      whileInView={{ pathLength: 1 }}
                      viewport={{ once: false, amount: 0.5 }}
                      transition={{ duration: 1, delay: 0.3 }}
                      d="M 260 160 C 320 160, 320 250, 380 250" fill="none" stroke="#444" strokeWidth="1.5" strokeDasharray="5 5" />
                   
                   {/* Solid curve from bottom node */}
                   <motion.path 
                      initial={{ pathLength: 0 }}
                      whileInView={{ pathLength: 1 }}
                      viewport={{ once: false, amount: 0.5 }}
                      transition={{ duration: 1, delay: 0.5 }}
                      d="M 260 360 C 320 360, 320 250, 380 250" fill="none" stroke="#444" strokeWidth="1.5" />
                </svg>

                {/* Nodes */}
                <WorkflowNode title={t('landing.organizationsection.text2')} count={1} className="top-[160px] -translate-y-1/2 left-[50px]" delay={0.2} />
                <WorkflowNode title={t('landing.organizationsection.text3')} count={1} className="top-[360px] -translate-y-1/2 left-[50px]" delay={0.4} />
                <WorkflowNode title={t('landing.organizationsection.text4')} count={4} className="top-[250px] -translate-y-1/2 left-[380px]" delay={0.6} />

                {/* Logic Node 1 (Top) */}
                <motion.div 
                   initial={{ opacity: 0, scale: 0 }}
                   whileInView={{ opacity: 1, scale: 1 }}
                   viewport={{ once: false, amount: 0.5 }}
                   transition={{ duration: 0.4, delay: 0.8 }}
                   className="absolute top-[80px] left-[299px] flex items-center gap-2 z-20">
                   <div className="w-[22px] h-[22px] rounded-full bg-[#a359ff] flex items-center justify-center shadow-[0_0_12px_rgba(163,89,255,0.4)] shrink-0">
                      <GitFork className="w-3 h-3 text-white" />
                   </div>
                   <div className="bg-[#18181b] border border-white/10 rounded-full px-3 py-1 text-[11px] font-medium text-gray-300 whitespace-nowrap shadow-lg">
                      {t('landing.organizationsection.text5')}
                   </div>
                </motion.div>

                {/* Logic Node 2 (Dashed line) */}
                <motion.div 
                   initial={{ opacity: 0, scale: 0 }}
                   whileInView={{ opacity: 1, scale: 1 }}
                   viewport={{ once: false, amount: 0.5 }}
                   transition={{ duration: 0.4, delay: 0.7 }}
                   className="absolute top-[192px] left-[298px] z-20">
                   <div className="w-[22px] h-[22px] rounded-full bg-[#a359ff] flex items-center justify-center shadow-[0_0_12px_rgba(163,89,255,0.4)]">
                      <ArrowRightLeft className="w-3 h-3 text-white" />
                   </div>
                </motion.div>

                {/* Logic Node 3 (Bottom) */}
                <motion.div 
                   initial={{ opacity: 0, scale: 0 }}
                   whileInView={{ opacity: 1, scale: 1 }}
                   viewport={{ once: false, amount: 0.5 }}
                   transition={{ duration: 0.4, delay: 0.9 }}
                   className="absolute top-[310px] left-[288px] flex items-center gap-2 z-20">
                   <div className="w-[22px] h-[22px] rounded-full bg-[#a359ff] flex items-center justify-center shadow-[0_0_12px_rgba(163,89,255,0.4)] shrink-0">
                      <GitFork className="w-3 h-3 text-white" />
                   </div>
                   <div className="bg-[#18181b] border border-white/10 rounded-full px-3 py-1 text-[11px] font-medium text-gray-300 whitespace-nowrap shadow-lg">
                      {t('landing.organizationsection.text6')}
                   </div>
                </motion.div>
                
              </div>
            </div>
            
          </div>
          
          {/* Connection Node (Top) */}
          <div id="node-org-top" className="absolute -top-[8px] left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-brand-gold z-20 hidden md:block"></div>
          
          {/* Connection Node (Bottom) */}
          <div id="node-org-bottom" className="absolute -bottom-[8px] left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-brand-gold z-20 hidden md:block"></div>
        </div>

        {/* Right Side - Content */}
        <div className="w-full md:w-[48%] flex flex-col justify-center">
          <h2 className="text-4xl md:text-[46px] font-extrabold leading-[1.1] mb-6 text-[#1a1a1a]">
            <>{t('landing.organizationsection.html_1')} <span className="text-brand-gold">{t('landing.organizationsection.html_2')}</span> {t('landing.organizationsection.html_3')}</>
          </h2>
          <p className="text-[#666] mb-10 text-[15px] leading-relaxed">
            {t('landing.organizationsection.text8')}
          </p>

          <ul className="space-y-4">
            <li className="flex items-center gap-4">
              <div className="w-6 h-6 rounded-full border-2 border-brand-gold flex items-center justify-center shrink-0">
                <Check className="w-3 h-3 text-brand-gold stroke-[3px]" />
              </div>
              <span className="text-[#2a2a2a] text-[15px] font-medium">{t('landing.organizationsection.text9')}</span>
            </li>
            <li className="flex items-center gap-4">
              <div className="w-6 h-6 rounded-full border-2 border-brand-gold flex items-center justify-center shrink-0">
                <Check className="w-3 h-3 text-brand-gold stroke-[3px]" />
              </div>
              <span className="text-[#2a2a2a] text-[15px] font-medium">{t('landing.organizationsection.text10')}</span>
            </li>
            <li className="flex items-center gap-4">
              <div className="w-6 h-6 rounded-full border-2 border-brand-gold flex items-center justify-center shrink-0">
                <Check className="w-3 h-3 text-brand-gold stroke-[3px]" />
              </div>
              <span className="text-[#2a2a2a] text-[15px] font-medium">{t('landing.organizationsection.text11')}</span>
            </li>
            <li className="flex items-center gap-4">
              <div className="w-6 h-6 rounded-full border-2 border-brand-gold flex items-center justify-center shrink-0">
                <Check className="w-3 h-3 text-brand-gold stroke-[3px]" />
              </div>
              <span className="text-[#2a2a2a] text-[15px] font-medium">{t('landing.organizationsection.text12')}</span>
            </li>
          </ul>
        </div>

      </div>
    </section>
  );
};

