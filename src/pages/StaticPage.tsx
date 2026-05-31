import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, Link } from 'react-router-dom';
import { pb } from '@/lib/pocketbase';
import { GryfSpinner } from '@/components/ui/GryfSpinner';
import DOMPurify from 'dompurify';
import { LandingLayout } from '@/components/layout/LandingLayout';
import { formatWidows } from '@/lib/utils';

export const StaticPage = () => {
  const { t, i18n } = useTranslation();
  const { slug } = useParams<{ slug: string }>();
  const [page, setPage] = useState<Record<string, unknown> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPage = async () => {
      if (!slug) return;
      setIsLoading(true);
      try {
        const safeSlug = slug.replace(/[^a-zA-Z0-9_-]/g, '');
        const records = await pb.collection('WORKFLOW_pages').getFullList({
          filter: `slug = '${safeSlug}' && published = true`,
          requestKey: null,
        });
        if (records.length > 0) {
          const fetchedPage = records[0];
          setPage(fetchedPage);
          
          // Apply SEO settings
          const currentLang = i18n.language;
          const seoTitle = (currentLang === 'en' && fetchedPage.seo_title_en ? fetchedPage.seo_title_en : fetchedPage.seo_title) as string || 
                           (currentLang === 'en' && fetchedPage.title_en ? fetchedPage.title_en : fetchedPage.title) as string;
          const seoDesc = (currentLang === 'en' && fetchedPage.seo_description_en ? fetchedPage.seo_description_en : fetchedPage.seo_description) as string;
          
          if (seoTitle) {
            document.title = seoTitle;
            const ogTitle = document.querySelector('meta[property="og:title"]');
            if (ogTitle) ogTitle.setAttribute('content', seoTitle);
          }
          if (seoDesc) {
            const metaDesc = document.querySelector('meta[name="description"]');
            if (metaDesc) metaDesc.setAttribute('content', seoDesc);
            const ogDesc = document.querySelector('meta[property="og:description"]');
            if (ogDesc) ogDesc.setAttribute('content', seoDesc);
          }
        } else {
          setError(t('errors.processLoadFail'));
        }
      } catch {
        setError(t('errors.processLoadFail'));
      } finally {
        setIsLoading(false);
      }
    };
    fetchPage();
  }, [slug, t, i18n.language]);

  return (
    <LandingLayout>
      <div className="max-w-[1600px] mx-auto px-[5%] md:px-16 py-16 md:py-24 text-[#1a1a1a]">
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <GryfSpinner size={36} />
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-[#666] mb-4">{error}</p>
            <Link to="/" className="text-brand-gold hover:underline">← {t('common.back')}</Link>
          </div>
        ) : (
          <>
            <h1 className="text-4xl md:text-[46px] font-extrabold mb-8 text-[#1a1a1a] leading-tight">
              {formatWidows((i18n.language === 'en' && page!.title_en ? page!.title_en : page!.title) as string)}
            </h1>
            <div 
              className="prose max-w-none
                [&_h2]:text-3xl [&_h2]:font-bold [&_h2]:mt-10 [&_h2]:mb-6 [&_h2]:text-[#1a1a1a]
                [&_h3]:text-2xl [&_h3]:font-bold [&_h3]:mt-8 [&_h3]:mb-4 [&_h3]:text-[#1a1a1a]
                [&_p]:text-[#666] [&_p]:mb-6 [&_p]:leading-relaxed [&_p]:text-[15px]
                [&_strong]:text-[#1a1a1a] [&_strong]:font-semibold
                [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:text-[#666] [&_ul]:text-[15px] [&_ul]:space-y-2 [&_ul]:mb-6
                [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:text-[#666] [&_ol]:text-[15px] [&_ol]:space-y-2 [&_ol]:mb-6
                [&_a]:text-brand-gold [&_a]:underline [&_a]:hover:text-brand-gold/80
              "
              dangerouslySetInnerHTML={{ 
                __html: DOMPurify.sanitize(formatWidows((i18n.language === 'en' && page!.content_en ? page!.content_en : page!.content) as string)) 
              }}
            />
          </>
        )}
      </div>
    </LandingLayout>
  );
};
