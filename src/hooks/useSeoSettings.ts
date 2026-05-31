import { useEffect } from 'react';
import { pb } from '../lib/pocketbase';

export const useSeoSettings = () => {
  useEffect(() => {
    const fetchSeo = async () => {
      try {
        const settings = await pb.collection('WORKFLOW_site_settings').getFirstListItem('', { requestKey: null });
        
        // title, description, og:title, og:description
        if (settings.seo_title) {
          document.title = settings.seo_title as string;
          const ogTitle = document.querySelector('meta[property="og:title"]');
          if (ogTitle) ogTitle.setAttribute('content', settings.seo_title as string);
        }
        
        if (settings.seo_description) {
          const metaDesc = document.querySelector('meta[name="description"]');
          if (metaDesc) metaDesc.setAttribute('content', settings.seo_description as string);
          
          const ogDesc = document.querySelector('meta[property="og:description"]');
          if (ogDesc) ogDesc.setAttribute('content', settings.seo_description as string);
        }
      } catch (err) {
        if (import.meta.env.DEV) {
          console.warn('Failed to load SEO settings:', err);
        }
      }
    };

    fetchSeo();
  }, []);
};
