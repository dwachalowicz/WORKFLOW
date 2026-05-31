import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLandingTranslation } from './LandingTranslationContext';
import { pb } from '../lib/pocketbase';
import { X } from 'lucide-react';
import { CaseCard, type ProcessCase } from './components/CaseCard';

export const CasesSection: React.FC = () => {
  const { t } = useLandingTranslation();
  const carouselRef = useRef<HTMLDivElement>(null);
  const isPausedRef = useRef(false);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);

  const [casesData, setCasesData] = useState<ProcessCase[]>([]);
  const [modalUrl, setModalUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchCases = async () => {
      try {
        const records = await pb.collection('WORKFLOW_process_cases').getFullList<ProcessCase>({
          sort: 'order',
          filter: 'is_active = true',
          $autoCancel: false
        });
        setCasesData(records);
      } catch (err) {
        if (err && typeof err === 'object' && !('isAbort' in err)) {
          console.error("Failed to fetch cases:", err);
        } else if (!err || typeof err !== 'object') {
          console.error("Failed to fetch cases:", err);
        }
      }
    };
    fetchCases();
  }, []);

  useEffect(() => {
    const container = carouselRef.current;
    if (!container) return;

    let animationFrameId: number;
    const scroll = () => {
      if (!isPausedRef.current && !isDraggingRef.current) {
        container.scrollLeft += 1;
        if (container.scrollLeft >= container.scrollWidth / 2) {
          container.scrollLeft -= container.scrollWidth / 2;
        }
      }
      animationFrameId = requestAnimationFrame(scroll);
    };
    animationFrameId = requestAnimationFrame(scroll);

    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!carouselRef.current) return;
    isDraggingRef.current = true;
    startXRef.current = e.pageX - carouselRef.current.offsetLeft;
    scrollLeftRef.current = carouselRef.current.scrollLeft;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current || !carouselRef.current) return;
    e.preventDefault();
    const x = e.pageX - carouselRef.current.offsetLeft;
    const walk = (x - startXRef.current) * 2;
    carouselRef.current.scrollLeft = scrollLeftRef.current - walk;
    
    if (carouselRef.current.scrollLeft >= carouselRef.current.scrollWidth / 2) {
       carouselRef.current.scrollLeft -= carouselRef.current.scrollWidth / 2;
       startXRef.current = e.pageX - carouselRef.current.offsetLeft;
       scrollLeftRef.current = carouselRef.current.scrollLeft;
    } else if (carouselRef.current.scrollLeft <= 0) {
       carouselRef.current.scrollLeft += carouselRef.current.scrollWidth / 2;
       startXRef.current = e.pageX - carouselRef.current.offsetLeft;
       scrollLeftRef.current = carouselRef.current.scrollLeft;
    }
  };

  const handleMouseUpOrLeave = () => {
    isDraggingRef.current = false;
  };

  return (
    <section className="w-full bg-[#f1f4f6] bg-[radial-gradient(#ffffff_1.5px,transparent_1.5px)] [background-size:30px_30px] py-24 overflow-hidden">
      <motion.div 
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="max-w-[1600px] mx-auto mb-16 text-center px-4"
      >
        <div className="inline-block border border-black/10 bg-transparent text-black/70 text-[10px] font-semibold px-4 py-1.5 rounded-full uppercase tracking-widest mb-6">
          {t('landing.casessection.text1')}
        </div>
        <h2 className="text-4xl md:text-[46px] font-extrabold mb-6 text-[#1a1a1a] leading-tight">
          {t('landing.casessection.text2')}
        </h2>
        <p className="text-[#666] text-[15px] max-w-xl mx-auto">
          {t('landing.casessection.text3')}
        </p>
      </motion.div>

      {/* Carousel */}
      <div className="w-full max-w-[1600px] mx-auto px-[5%] md:px-16">
        <div 
          className="relative w-full pb-12 cursor-grab active:cursor-grabbing select-none"
          onMouseEnter={() => (isPausedRef.current = true)}
          onMouseLeave={() => {
            isPausedRef.current = false;
            handleMouseUpOrLeave();
          }}
        >
          {/* Corner overlays to simulate a rounded window without clipping shadows at the bottom */}
          <div className="absolute top-0 left-0 w-4 h-4 pointer-events-none z-20" style={{ background: 'radial-gradient(circle at 100% 100%, transparent 16px, #f1f4f6 16px)' }}></div>
          <div className="absolute top-0 right-0 w-4 h-4 pointer-events-none z-20" style={{ background: 'radial-gradient(circle at 0% 100%, transparent 16px, #f1f4f6 16px)' }}></div>
          <div className="absolute left-0 w-4 h-4 pointer-events-none z-20" style={{ bottom: '3rem', background: 'radial-gradient(circle at 100% 0%, transparent 16px, #f1f4f6 16px)' }}></div>
          <div className="absolute right-0 w-4 h-4 pointer-events-none z-20" style={{ bottom: '3rem', background: 'radial-gradient(circle at 0% 0%, transparent 16px, #f1f4f6 16px)' }}></div>

        <div 
          ref={carouselRef}
          className="flex overflow-x-auto w-full [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] -mx-4 px-4 py-8 -my-8"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUpOrLeave}
        >
          <div className="flex w-max">
            {/* First Set */}
            <div className="flex gap-8 pr-8">
              {casesData.map((item, idx) => (
                <CaseCard key={`set1-${idx}`} item={item} setModalUrl={setModalUrl} />
              ))}
            </div>

            {/* Second Set (Duplicate for seamless loop) */}
            <div className="flex gap-8 pr-8">
              {casesData.map((item, idx) => (
                <CaseCard key={`set2-${idx}`} item={item} setModalUrl={setModalUrl} />
              ))}
            </div>
          </div>
        </div>
      </div>
      </div>
      
      {/* Modal */}
      <AnimatePresence>
        {modalUrl && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 md:p-8"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-[1400px] h-full max-h-[90vh] bg-[#161616] rounded-[2rem] overflow-hidden shadow-2xl flex flex-col border border-white/10"
            >
              <div className="flex items-center justify-between px-6 py-4 bg-[#1e1e1e] border-b border-white/5 shrink-0 z-20">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                </div>
                <button 
                  onClick={() => setModalUrl(null)}
                  className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors outline-none"
                >
                  <X size={18} className="text-white/70 hover:text-white" />
                </button>
              </div>
              <div className="flex-1 w-full bg-landing-bg relative">
                <iframe 
                  src={modalUrl} 
                  className="absolute inset-0 w-full h-full border-0"
                  title="Process preview"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};
