import React, { useState } from 'react';
import { useLandingTranslation } from '../landingpage/LandingTranslationContext';
import { LandingLayout } from '@/components/layout/LandingLayout';
import { pb } from '@/lib/pocketbase';
import { Mail, Phone, MapPin } from 'lucide-react';

const ContactContent = () => {
  const { t } = useLandingTranslation();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      await pb.collection('WORKFLOW_contact_messages').create({
        email: email,
        message: message
      });
      
      setIsSubmitting(false);
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        setEmail('');
        setMessage('');
      }, 5000);
    } catch (error) {
      console.error("Error sending message:", error);
      setIsSubmitting(false);
      alert(t('landing.contactpage.text1'));
    }
  };

  return (
      <div className="max-w-[1600px] mx-auto px-[5%] md:px-16 py-16 md:py-24 text-[#1a1a1a]">
        
        <div className="text-center mb-16 md:mb-24">
          <h1 className="text-4xl md:text-[46px] font-extrabold mb-6 text-[#1a1a1a] leading-tight tracking-tight">
            {t('landing.contactpage.text2')} <span className="text-brand-gold">{t('landing.contactpage.text3')}</span>
          </h1>
          <p className="text-[#666] text-lg max-w-2xl mx-auto">
            {t('landing.contactpage.text4')}
          </p>
        </div>

        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-start">
          
          {/* Informacje kontaktowe */}
          <div className="flex flex-col gap-10">
            <h2 className="text-3xl font-extrabold text-[#1a1a1a]">{t('landing.contactpage.text5')}</h2>
            <p className="text-[#666] text-[15px] leading-relaxed">
              {t('landing.contactpage.text6')}
            </p>
            
            <div className="flex flex-col gap-6 mt-4">
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 rounded-2xl bg-white border border-[#eaeaea] flex items-center justify-center text-brand-gold shadow-sm">
                  <Phone size={24} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#666] mb-1">{t('landing.contactpage.text7')}</p>
                  <p className="text-[20px] font-bold text-[#1a1a1a]">+48 726 001 488</p>
                </div>
              </div>
              
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 rounded-2xl bg-white border border-[#eaeaea] flex items-center justify-center text-brand-gold shadow-sm">
                  <Mail size={24} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#666] mb-1">{t('landing.contactpage.text8')}</p>
                  <a href="mailto:kontakt@gryf.ai" className="text-[20px] font-bold text-[#1a1a1a] hover:text-brand-gold transition-colors">kontakt@gryf.ai</a>
                </div>
              </div>
              
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 rounded-2xl bg-white border border-[#eaeaea] flex items-center justify-center text-brand-gold shadow-sm">
                  <MapPin size={24} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#666] mb-1">{t('landing.contactpage.text9')}</p>
                  <p className="text-[16px] font-bold text-[#1a1a1a]">{t('landing.contactpage.text10')}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Formularz kontaktowy - JASNY MOTYW */}
          <div className="w-full bg-white border border-[#eaeaea] rounded-[2rem] p-8 md:p-10 shadow-sm relative overflow-hidden">
            <h3 className="text-2xl font-bold text-[#1a1a1a] mb-8">{t('landing.contactpage.text11')}</h3>
            
            <form onSubmit={handleSubmit} className="w-full flex flex-col gap-6">
              {isSuccess ? (
                <div className="w-full bg-brand-gold/10 border border-brand-gold/30 rounded-2xl p-8 text-center my-10">
                  <p className="text-[#1a1a1a] font-bold text-[18px] mb-2">{t('landing.contactpage.text12')}</p>
                  <p className="text-[#666] text-sm">{t('landing.contactpage.text13')}</p>
                </div>
              ) : (
                <>
                  <div className="w-full flex bg-[#f1f4f6] border border-transparent focus-within:bg-white focus-within:border-brand-gold focus-within:shadow-[0_0_15px_rgba(212,175,55,0.1)] transition-all rounded-full p-1 pl-6">
                    <input 
                      type="email" 
                      placeholder={t('landing.contactpage.text14')} 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={isSubmitting}
                      className="bg-transparent text-[15px] w-full outline-none text-[#1a1a1a] placeholder-gray-400 py-3 disabled:opacity-50" 
                    />
                  </div>
                  
                  <div className="w-full flex bg-[#f1f4f6] border border-transparent focus-within:bg-white focus-within:border-brand-gold focus-within:shadow-[0_0_15px_rgba(212,175,55,0.1)] transition-all rounded-[1.5rem] p-4 pl-6">
                    <textarea 
                      placeholder={t('landing.contactpage.text15')} 
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      required
                      disabled={isSubmitting}
                      rows={6}
                      className="bg-transparent text-[15px] w-full outline-none text-[#1a1a1a] placeholder-gray-400 resize-none disabled:opacity-50" 
                    />
                  </div>
                  
                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="w-full flex justify-center items-center bg-[#1c1d21] text-white text-[15px] font-bold px-8 py-4 rounded-full transition-all duration-300 hover:bg-brand-gold hover:text-white hover:scale-105 hover:shadow-none hover:border-transparent mt-2 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      t('landing.contactpage.text16')
                    )}
                  </button>
                </>
              )}
            </form>
          </div>

        </div>
      </div>
  );
};

export const ContactPage = () => {
  return (
    <LandingLayout>
      <ContactContent />
    </LandingLayout>
  );
};
