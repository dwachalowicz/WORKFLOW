import React, { useState, useEffect } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import DOMPurify from 'dompurify';
import { useLandingTranslation } from './LandingTranslationContext';
import { loadTierConfig, getTierConfig, type TierConfig } from '@/lib/tierLimits';
import { formatWidows } from '../lib/utils';
import { pb } from '../lib/pocketbase';
import { TierComparisonModal } from '@/components/modals/TierComparisonModal';

interface PricingPlan {
  id: string;
  plan_name_pl: string;
  plan_name_en: string;
  description_pl: string;
  description_en: string;
  features_pl: string[];
  features_en: string[];
  order: number;
}

export const PricingSection: React.FC = () => {
  const [isYearly, setIsYearly] = useState(false);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [tiers, setTiers] = useState<{ free?: TierConfig, medium?: TierConfig, pro?: TierConfig }>({});
  const [pricingData, setPricingData] = useState<PricingPlan[]>([]);

  const { t, language } = useLandingTranslation();
  const isPL = language === 'pl';

  useEffect(() => {
    loadTierConfig().then(() => {
      setTiers({
        free: getTierConfig('FREE'),
        medium: getTierConfig('MEDIUM'),
        pro: getTierConfig('PRO')
      });
    });

    const fetchPricing = async () => {
      try {
        const records = await pb.collection('WORKFLOW_pricing').getFullList<PricingPlan>({
          sort: 'order',
          $autoCancel: false
        });
        setPricingData(records);
      } catch (err) {
        if (err && typeof err === 'object' && !('isAbort' in err)) {
          console.error("Failed to fetch pricing:", err);
        } else if (!err || typeof err !== 'object') {
          console.error("Failed to fetch pricing:", err);
        }
      }
    };
    fetchPricing();
  }, []);

  const renderPrice = (tier?: TierConfig, defaultEur = 0, defaultEurAnn = 0, defaultPln = 0, defaultPlnAnn = 0) => {
    if (isPL) {
      const val = isYearly ? (tier?.priceAnnualPln ?? defaultPlnAnn) : (tier?.priceMonthlyPln ?? defaultPln);
      return `${val} zł`;
    } else {
      const val = isYearly ? (tier?.priceAnnualEur ?? defaultEurAnn) : (tier?.priceMonthlyEur ?? defaultEur);
      return `€${val}`;
    }
  };

  const parseFeature = (text: string, tier?: TierConfig) => {
    if (!tier) return formatWidows(text);
    const replaced = text
      .replace(/{{maxWorkspaces}}/g, tier.maxWorkspaces.toString())
      .replace(/{{maxProcesses}}/g, tier.maxProcesses.toString())
      .replace(/{{maxNodesPerProcess}}/g, tier.maxNodesPerProcess === Infinity ? (isPL ? 'Brak limitu' : 'Unlimited') : tier.maxNodesPerProcess.toString())
      .replace(/{{maxNodesPerProcessStr}}/g, tier.maxNodesPerProcess === Infinity ? (isPL ? 'Brak limitu' : 'Unlimited') : tier.maxNodesPerProcess.toString())
      .replace(/{{maxMembersPerWorkspace}}/g, tier.maxMembersPerWorkspace.toString())
      .replace(/{{maxVersionsPerProcess}}/g, tier.maxVersionsPerProcess.toString());
    return <span dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(formatWidows(replaced)) }} />;
  };

  const freePlan = pricingData.find(p => p.plan_name_en.toLowerCase() === 'free');
  const mediumPlan = pricingData.find(p => p.plan_name_en.toLowerCase() === 'medium');
  const proPlan = pricingData.find(p => p.plan_name_en.toLowerCase() === 'pro');

  return (
    <section id="plany" className="w-full bg-landing-section pt-32 pb-0 px-4 text-center">
      <motion.div 
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="max-w-[1600px] mx-auto px-[5%] md:px-16"
      >
        <div className="inline-block border border-white/10 bg-transparent text-white/70 text-[10px] font-semibold px-4 py-1.5 rounded-full uppercase tracking-widest mb-6">
          {t('landing.pricingsection.text1')}
        </div>
        <h2 className="text-4xl md:text-[46px] font-extrabold mb-10 text-white leading-tight">
          <>{t('landing.pricingsection.html_title_1')}<br/>{t('landing.pricingsection.html_title_2')}</>
        </h2>

        {/* Pricing Toggle */}
        <div className="flex justify-center mb-20 relative">
          <div className="relative inline-flex items-center gap-8 bg-landing-card rounded-full px-10 py-5">
            <span className={`text-sm font-medium ${!isYearly ? 'text-white' : 'text-white/60'}`}>{t('landing.pricingsection.text3')}</span>
            <div 
              className="w-12 h-6 bg-white rounded-full relative cursor-pointer"
              onClick={() => setIsYearly(!isYearly)}
            >
               <div className={`w-5 h-5 bg-black rounded-full absolute left-0.5 top-0.5 shadow-sm transition-transform duration-300 ${isYearly ? 'translate-x-6' : 'translate-x-0'}`} />
            </div>
            <span className={`text-sm font-bold ${isYearly ? 'text-white' : 'text-white/60'}`}>{t('landing.pricingsection.text4')}</span>
            
            <div className={`absolute -top-4 -right-4 text-black text-[11px] font-bold px-3 py-1 rounded-full shadow-lg rotate-[20deg] pointer-events-none transition-colors duration-300 ${isYearly ? 'bg-brand-gold' : 'bg-white'}`}>
              -20%
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left items-stretch">
          
          {/* Free Tier */}
          <div className="bg-landing-bg border border-white/10 rounded-2xl p-8 flex flex-col hover:border-white/20 transition-colors">
            <h3 className="text-2xl font-bold text-white mb-3">{isPL ? freePlan?.plan_name_pl : freePlan?.plan_name_en || 'Free'}</h3>
            <p className="text-white/60 text-xs h-12 mb-8 leading-relaxed">
              {formatWidows(isPL ? freePlan?.description_pl : freePlan?.description_en)}
            </p>
            <div className="text-5xl font-black text-white mb-2 tracking-tight">{t('landing.pricing.freePrice')}</div>
            <div className="text-xs text-white/50 mb-8 font-medium">{t('landing.pricingsection.text5')}</div>
            <button className="w-full py-3 rounded-xl bg-landing-card text-white text-sm font-semibold border border-white/10 mb-8 transition-all duration-300 hover:bg-brand-gold hover:text-white hover:scale-105 hover:shadow-none hover:border-transparent">
              {t('landing.pricingsection.text6')}
            </button>
            <ul className="space-y-4 mt-auto">
              {(isPL ? freePlan?.features_pl : freePlan?.features_en)?.map((feat, i) => (
                <li key={i} className="flex gap-3 items-center text-xs text-white/70">
                  <CheckCircle2 className="w-4 h-4 text-white/60 shrink-0" />
                  <span>{parseFeature(feat, tiers.free)}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Medium Tier */}
          <div 
            className="border-4 border-brand-gold rounded-2xl overflow-hidden p-8 flex flex-col relative transform scale-105 z-10 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: 'url(/landingpage/bg-offer.webp)' }}
          >
            <h3 className="text-2xl font-bold text-white mb-3">{isPL ? mediumPlan?.plan_name_pl : mediumPlan?.plan_name_en || 'Medium'}</h3>
            <p className="text-white/70 text-xs h-12 mb-8 leading-relaxed">
              {formatWidows(isPL ? mediumPlan?.description_pl : mediumPlan?.description_en)}
            </p>
            <div className="text-5xl font-black text-white mb-2 tracking-tight">{renderPrice(tiers.medium, 12, 9, 49, 39)}</div>
            <div className="text-xs text-white/70 mb-8 font-medium">{t('landing.pricingsection.text7')}</div>
            <button disabled className="w-full py-3 rounded-xl bg-white text-black text-sm font-semibold mb-4 cursor-default">
              {t('landing.pricingsection.text8')}
            </button>
            <div className="mb-6 flex items-center justify-center text-center w-full py-3 px-4 rounded-xl bg-black text-white text-sm font-semibold border border-white/10">
              {t('landing.pricingsection.text9')}
            </div>
            <ul className="space-y-4 mt-auto">
              {(isPL ? mediumPlan?.features_pl : mediumPlan?.features_en)?.map((feat, i) => (
                <li key={i} className="flex gap-3 items-center text-xs text-white">
                  <CheckCircle2 className="w-4 h-4 text-brand-gold shrink-0" />
                  <span>{parseFeature(feat, tiers.medium)}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Pro Tier */}
          <div className="bg-landing-bg border border-white/10 rounded-2xl p-8 flex flex-col hover:border-white/20 transition-colors">
            <h3 className="text-2xl font-bold text-white mb-3">{isPL ? proPlan?.plan_name_pl : proPlan?.plan_name_en || 'Pro'}</h3>
            <p className="text-white/60 text-xs h-12 mb-8 leading-relaxed">
              {formatWidows(isPL ? proPlan?.description_pl : proPlan?.description_en)}
            </p>
            <div className="text-5xl font-black text-white mb-2 tracking-tight">{renderPrice(tiers.pro, 35, 28, 149, 119)}</div>
            <div className="text-xs text-white/50 mb-8 font-medium">{t('landing.pricingsection.text10')}</div>
            <button disabled className="w-full py-3 rounded-xl bg-landing-card text-white text-sm font-semibold border border-white/10 mb-8 cursor-default">
              {t('landing.pricingsection.text11')}
            </button>
            <ul className="space-y-4 mt-auto">
              {(isPL ? proPlan?.features_pl : proPlan?.features_en)?.map((feat, i) => (
                <li key={i} className="flex gap-3 items-center text-xs text-white/70">
                  <CheckCircle2 className="w-4 h-4 text-white/60 shrink-0" />
                  <span>{parseFeature(feat, tiers.pro)}</span>
                </li>
              ))}
            </ul>
          </div>

        </div>

        <div className="mt-8 text-center text-xs text-white/50 max-w-2xl mx-auto">
          {t('landing.pricing.invitedPlanNote')}{' '}
          <button 
            onClick={() => setIsCompareModalOpen(true)}
            className="text-brand-gold hover:underline transition-colors cursor-pointer"
          >
            {t('landing.pricingsection.text12')}.
          </button>
        </div>
      </motion.div>

      <TierComparisonModal 
        isOpen={isCompareModalOpen} 
        onClose={() => setIsCompareModalOpen(false)} 
        currentTier="NONE" 
      />
    </section>
  );
};
