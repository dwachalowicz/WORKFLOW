import React from 'react';
import { useLandingTranslation } from '../LandingTranslationContext';
import { formatWidows } from '../../lib/utils';

export interface ProcessCase {
  id: string;
  title_pl: string;
  title_en: string;
  shortTitle_pl: string;
  shortTitle_en: string;
  description_pl: string;
  description_en: string;
  avatar: string;
  strokeColor: string;
  strokeDasharray: string;
  footerTitle_pl: string;
  footerTitle_en: string;
  footerSubtitle_pl: string;
  footerSubtitle_en: string;
  link: string;
  order: number;
}

interface CaseCardProps {
  item: ProcessCase;
  setModalUrl: (url: string) => void;
}

export const CaseCard: React.FC<CaseCardProps> = ({ item, setModalUrl }) => {
  const { t, language } = useLandingTranslation();

  return (
    <div className={`group w-[350px] md:w-[420px] bg-white hover:bg-landing-section border border-gray-200 hover:border-white/10 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col text-left shrink-0`}>
      <div className="h-48 bg-landing-section flex items-center justify-center relative overflow-hidden" style={{ backgroundImage: 'radial-gradient(#333 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
        <div className="w-[80%] bg-[#1a1a1a] rounded-xl border border-white/10 shadow-xl py-4 px-5 flex items-center justify-between relative z-10">
          <div className="text-white text-[13px] font-bold">{language === 'pl' ? item.shortTitle_pl : item.shortTitle_en}</div>
          <img loading="lazy" src={item.avatar} draggable={false} className="w-11 h-11 rounded-full object-cover select-none" alt="User" />
          <div className="absolute top-1/2 -left-[4px] transform -translate-y-1/2 w-2 h-2 rounded-full bg-brand-gold"></div>
          <div className="absolute top-1/2 -right-[4px] transform -translate-y-1/2 w-2 h-2 rounded-full bg-brand-gold"></div>
        </div>
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" viewBox="0 0 100 100" preserveAspectRatio="none">
          <path d="M -10 20 C 5 20, 5 50, 10 50 M 90 50 C 95 50, 95 80, 110 80" fill="none" stroke={item.strokeColor} strokeWidth="2" strokeDasharray={item.strokeDasharray} vectorEffect="non-scaling-stroke" />
        </svg>
      </div>
      <div className="p-8 flex flex-col flex-1 transition-colors duration-300">
        <h3 className={`text-[#1a1a1a] group-hover:text-white font-semibold mb-3 text-[15px] transition-colors duration-300`}>{formatWidows(language === 'pl' ? item.title_pl : item.title_en)}</h3>
        <p className={`text-[#666] group-hover:text-white/70 text-[13px] mb-8 leading-relaxed flex-1 transition-colors duration-300`}>
          {formatWidows(language === 'pl' ? item.description_pl : item.description_en)}
        </p>
        <div className={`text-[13px] font-bold border-t border-gray-100 group-hover:border-white/10 pt-4 flex items-center justify-between transition-colors duration-300`}>
          <div className="text-[#1a1a1a] group-hover:text-white transition-colors duration-300">
            {formatWidows(language === 'pl' ? item.footerTitle_pl : item.footerTitle_en)}<br/>
            <span className={`text-[#666] group-hover:text-white/60 font-normal transition-colors duration-300`}>{formatWidows(language === 'pl' ? item.footerSubtitle_pl : item.footerSubtitle_en)}</span>
          </div>
          <button onClick={(e) => { e.preventDefault(); setModalUrl(item.link); }} className={`text-xs font-bold transition-colors border px-3 py-1.5 rounded-full flex items-center gap-1 text-[#1a1a1a] border-gray-200 group-hover:text-white group-hover:border-white/10 group-hover:bg-[#1a1a1a] hover:text-[#555] group-hover:hover:text-gray-300 select-none`}>
            {t('landing.casecard.text1')} <span className="text-[10px]">&rarr;</span>
          </button>
        </div>
      </div>
    </div>
  );
};
