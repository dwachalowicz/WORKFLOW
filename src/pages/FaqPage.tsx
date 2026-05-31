import React, { useState, useEffect } from 'react';
import { LandingLayout } from '@/components/layout/LandingLayout';
import { ChevronDown, Search } from 'lucide-react';
import * as Icons from 'lucide-react';
import DOMPurify from 'dompurify';
import { useLandingTranslation } from '../landingpage/LandingTranslationContext';

import { pb } from '../lib/pocketbase';

interface FAQ {
  id: string;
  category_pl: string;
  category_en: string;
  question_pl: string;
  question_en: string;
  answer_pl: string;
  answer_en: string;
  order: number;
  icon?: string;
}

const AccordionItem = ({ question, answer, isOpen, onClick, icon }: { question: string, answer: string, isOpen: boolean, onClick: () => void, icon?: string }) => {
  const LucideIcon = icon ? (Icons as Record<string, React.ElementType>)[icon] : null;

  return (
    <div className="bg-white border border-[#eaeaea] rounded-[2rem] overflow-hidden hover:border-[#d0d0d0] hover:shadow-lg transition-all duration-300 mb-4">
      <button
        onClick={onClick}
        className={`w-full flex items-center justify-between px-6 sm:px-8 pt-6 sm:pt-8 text-left focus:outline-none ${isOpen ? 'pb-3 sm:pb-4' : 'pb-6 sm:pb-8'}`}
      >
        <div className="flex items-center gap-4">
          {LucideIcon && <LucideIcon size={24} className="text-brand-gold flex-shrink-0" />}
          <span className="font-bold text-lg md:text-xl text-[#1a1a1a] pr-4">{question}</span>
        </div>
        <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-transform duration-300 ${isOpen ? 'rotate-180 bg-brand-gold text-white' : 'bg-[#f1f4f6] text-[#1a1a1a]'}`}>
          <ChevronDown size={20} />
        </div>
      </button>
      <div 
        className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}
      >
        <div 
          className="px-6 sm:px-8 pb-6 sm:pb-8 pt-0 text-[#666] leading-relaxed text-[15px]"
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(answer) }}
        />
      </div>
    </div>
  );
};

const FaqContent = () => {
  const { language, t } = useLandingTranslation();
  const [openIndex, setOpenIndex] = useState<string | null>(null);
  const [rawFaqs, setRawFaqs] = useState<FAQ[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchFaqs = async () => {
      try {
        const records = await pb.collection('WORKFLOW_faq').getFullList<FAQ>({
          sort: 'order',
          filter: 'is_active = true'
        });
        setRawFaqs(records);
      } catch (err) {
        console.error("Failed to load FAQs:", err);
      }
    };
    fetchFaqs();
  }, []);

  const filteredFaqs = rawFaqs.filter(faq => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const isPl = language === 'pl';
    const question = isPl ? faq.question_pl : faq.question_en;
    const answer = isPl ? faq.answer_pl : faq.answer_en;
    return question.toLowerCase().includes(query) || answer.toLowerCase().includes(query);
  });

  const groupedFaqs = filteredFaqs.reduce((acc, curr) => {
    const cat = language === 'pl' ? curr.category_pl : curr.category_en;
    if (!acc[cat]) {
      acc[cat] = [];
    }
    acc[cat].push(curr);
    return acc;
  }, {} as Record<string, FAQ[]>);

  const toggleAccordion = (index: string) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
      <div className="max-w-[1600px] mx-auto px-[5%] md:px-16 py-16 md:py-24 text-[#1a1a1a]">
        
        <div className="text-center mb-16 md:mb-24">
          <h1 className="text-4xl md:text-[46px] font-extrabold mb-6 text-[#1a1a1a] leading-tight tracking-tight">
            {t('landing.faqpage.text1')} <span className="text-brand-gold">FAQ</span>
          </h1>
          <p className="text-[#666] text-lg max-w-2xl mx-auto mb-12">
            {t('landing.faqpage.text2')}
          </p>

          <div className="max-w-3xl mx-auto relative">
            <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
              <Search size={24} className="text-[#a0a0a0]" />
            </div>
            <input
              type="text"
              placeholder={t('landing.faqpage.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-16 pr-6 py-5 bg-white border border-[#eaeaea] rounded-[2rem] text-[17px] text-[#1a1a1a] focus:outline-none focus:border-[#d0d0d0] focus:ring-4 focus:ring-[#f5f5f5] transition-all duration-300 shadow-sm placeholder-[#a0a0a0]"
            />
          </div>
        </div>

        <div className="max-w-4xl mx-auto space-y-12 md:space-y-16">
          {Object.keys(groupedFaqs).length === 0 && searchQuery ? (
            <div className="text-center text-[#666] text-lg py-12 bg-white rounded-[2rem] border border-[#eaeaea]">
              {t('landing.faqpage.noResults')}
            </div>
          ) : (
            Object.entries(groupedFaqs).map(([category, items], catIndex) => (
              <div key={catIndex}>
                <h2 className="text-2xl md:text-3xl font-extrabold mb-8 text-[#1a1a1a]">
                  {category}
                </h2>
                <div>
                  {items.map((item) => {
                    const id = item.id;
                    return (
                      <AccordionItem
                        key={id}
                        question={language === 'pl' ? item.question_pl : item.question_en}
                        answer={language === 'pl' ? item.answer_pl : item.answer_en}
                        isOpen={openIndex === id}
                        onClick={() => toggleAccordion(id)}
                        icon={item.icon}
                      />
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-24 md:mt-32 max-w-4xl mx-auto text-center p-10 border border-[#eaeaea] bg-white rounded-[2rem] shadow-sm">
          <h3 className="text-2xl font-bold text-[#1a1a1a] mb-4">{t('landing.faqpage.text3')}</h3>
          <p className="text-[#666] mb-8 max-w-md mx-auto">
            {t('landing.faqpage.text4')}
          </p>
          <a href="/kontakt" className="inline-flex items-center justify-center bg-[#1c1d21] text-white text-[13px] font-semibold px-8 py-3.5 rounded-xl border border-transparent hover:bg-brand-gold hover:text-white transition-all duration-300">
            {t('landing.faqpage.text5')}
          </a>
        </div>
      </div>
  );
};

export const FaqPage = () => {
  return (
    <LandingLayout>
      <FaqContent />
    </LandingLayout>
  );
};
