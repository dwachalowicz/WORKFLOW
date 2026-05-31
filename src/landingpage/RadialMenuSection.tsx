import React, { useRef, useEffect } from 'react';
import { useLandingTranslation } from './LandingTranslationContext';
import { Check } from 'lucide-react';
import { useInView } from 'framer-motion';
import DOMPurify from 'dompurify';

export const RadialMenuSection: React.FC = () => {
  const { t } = useLandingTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const isInView = useInView(videoRef, { amount: 0.3 });

  useEffect(() => {
    if (videoRef.current) {
      if (isInView) {
        videoRef.current.currentTime = 0;
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
      }
    }
  }, [isInView]);

  return (
    <section className="w-full bg-transparent pt-24 pb-8 md:py-32 px-4 text-[#1a1a1a]">
      <div className="max-w-[1600px] mx-auto px-[5%] md:px-16 flex flex-col-reverse md:flex-row items-center justify-between relative">
        
        {/* Left Content (Text) */}
        <div className="w-full md:w-[48%] flex flex-col items-start justify-center text-left pr-0 md:pr-4 py-4 md:py-8">
          <h2 className="text-4xl md:text-[46px] font-extrabold leading-[1.1] mb-6 text-[#1a1a1a]">
            {t('landing.radialmenusection.text1')} <span className="text-brand-gold">{t('landing.radialmenusection.text2')}</span>
          </h2>
          <p 
            className="text-[#666] mb-10 text-[15px] leading-relaxed"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(t('landing.radialmenusection.text4')) }}
          />

          <ul className="space-y-4">
            <li className="flex items-center gap-4">
              <div className="w-6 h-6 rounded-full border-2 border-brand-gold flex items-center justify-center shrink-0">
                <Check className="w-3 h-3 text-brand-gold stroke-[3px]" />
              </div>
              <span className="text-[#2a2a2a] text-[15px] font-medium">{t('landing.radialmenusection.text5')}<strong className="text-[#1a1a1a] font-bold">{t('landing.radialmenusection.text6')}</strong>{t('landing.radialmenusection.text7')}</span>
            </li>
            <li className="flex items-center gap-4">
              <div className="w-6 h-6 rounded-full border-2 border-brand-gold flex items-center justify-center shrink-0">
                <Check className="w-3 h-3 text-brand-gold stroke-[3px]" />
              </div>
              <span className="text-[#2a2a2a] text-[15px] font-medium">{t('landing.radialmenusection.text8')}<strong className="text-[#1a1a1a] font-bold">{t('landing.radialmenusection.text9')}</strong>{t('landing.radialmenusection.text10')}</span>
            </li>
            <li className="flex items-center gap-4">
              <div className="w-6 h-6 rounded-full border-2 border-brand-gold flex items-center justify-center shrink-0">
                <Check className="w-3 h-3 text-brand-gold stroke-[3px]" />
              </div>
              <span className="text-[#2a2a2a] text-[15px] font-medium">{t('landing.radialmenusection.text11')}<strong className="text-[#1a1a1a] font-bold">{t('landing.radialmenusection.text12')}</strong>{t('landing.radialmenusection.text13')}</span>
            </li>
            <li className="flex items-center gap-4">
              <div className="w-6 h-6 rounded-full border-2 border-brand-gold flex items-center justify-center shrink-0">
                <Check className="w-3 h-3 text-brand-gold stroke-[3px]" />
              </div>
              <span className="text-[#2a2a2a] text-[15px] font-medium">{t('landing.radialmenusection.text14')}<strong className="text-[#1a1a1a] font-bold">{t('landing.radialmenusection.text15')}</strong>{t('landing.radialmenusection.text16')}</span>
            </li>
          </ul>
        </div>

        {/* Right Content (Video) */}
        <div className="w-full md:w-[48%] flex relative z-10 mb-12 md:mb-0">
          <div className="w-full aspect-[4/3] bg-landing-dark rounded-[2rem] border border-white/10 shadow-2xl relative overflow-hidden flex flex-col justify-center">
            <video 
              ref={videoRef}
              src="/landingpage/film2.mp4" 
              preload="none"
              loop
              muted 
              playsInline 
              className="w-full h-full object-cover"
            />
          </div>
          
          {/* Connection Node (Bottom) */}
          <div id="node-radial-bottom" className="absolute -bottom-[8px] left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-brand-gold z-20 hidden md:block"></div>
        </div>

      </div>
    </section>
  );
};
