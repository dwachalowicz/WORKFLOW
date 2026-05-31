import { pb } from './pocketbase';

export interface CookieConsents {
  essential: boolean; // Always true
  analytics: boolean;
  marketing: boolean;
}

const COOKIE_STORAGE_KEY = 'gryf_cookies_consents';

/** Whitelist of allowed script source domains */
const ALLOWED_SCRIPT_DOMAINS = [
  'googletagmanager.com',
  'google-analytics.com',
  'www.googletagmanager.com',
  'www.google-analytics.com',
  'analytics.google.com',
  'connect.facebook.net',
  'snap.licdn.com',
  'static.hotjar.com',
];

export const getCookieConsents = (): CookieConsents | null => {
  try {
    const raw = localStorage.getItem(COOKIE_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const saveCookieConsents = (consents: CookieConsents) => {
  localStorage.setItem(COOKIE_STORAGE_KEY, JSON.stringify(consents));
  applyCookieConsents(consents);
};

export const applyCookieConsents = async (consents: CookieConsents | null) => {
  if (!consents) return;

  try {
    // Fetch settings from PocketBase. Assuming there's only one record.
    const settings = await pb.collection('WORKFLOW_site_settings').getFirstListItem('', { requestKey: null });
    
    if (consents.analytics && settings.analytics_script) {
      injectScript(settings.analytics_script, 'gryf-analytics-script');
    } else {
      removeScript('gryf-analytics-script');
    }

    if (consents.marketing && settings.marketing_script) {
      injectScript(settings.marketing_script, 'gryf-marketing-script');
    } else {
      removeScript('gryf-marketing-script');
    }
  } catch (err) {
    const error = err as { isAbort?: boolean; status?: number };
    if (error?.isAbort || error?.status === 0) return;
    if (import.meta.env.DEV) {
      console.warn("Failed to load scripts from DB:", err);
    }
  }
};

/**
 * Check if a URL belongs to an allowed domain.
 */
const isAllowedDomain = (src: string): boolean => {
  try {
    const url = new URL(src);
    return ALLOWED_SCRIPT_DOMAINS.some(domain => url.hostname === domain || url.hostname.endsWith('.' + domain));
  } catch {
    return false;
  }
};

/**
 * Safely inject analytics/marketing scripts from DB.
 * Only external scripts from whitelisted domains are allowed, 
 * plus inline scripts for initialization.
 */
const injectScript = (htmlString: string, id: string) => {
  // If scripts with this ID already exist, do not inject again
  if (document.querySelector(`script[data-script-group="${id}"]`)) return;
  
  // Parse the HTML to extract only safe <script src="..."> tags
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, 'text/html');
  const scripts = doc.getElementsByTagName('script');
  
  for (let i = 0; i < scripts.length; i++) {
    const originalScript = scripts[i];
    
    if (originalScript.src) {
      if (isAllowedDomain(originalScript.src)) {
        const s = document.createElement('script');
        s.type = originalScript.type || 'text/javascript';
        s.src = originalScript.src;
        if (originalScript.async) s.async = true;
        if (originalScript.defer) s.defer = true;
        s.setAttribute('data-script-group', id);
        document.head.appendChild(s);
      }
    } else if (originalScript.text) {
      // Allow inline scripts (needed for gtag init)
      const s = document.createElement('script');
      s.type = originalScript.type || 'text/javascript';
      s.text = originalScript.text;
      s.setAttribute('data-script-group', id);
      document.head.appendChild(s);
    }
  }
};

const removeScript = (id: string) => {
  const elements = document.querySelectorAll(`script[data-script-group="${id}"]`);
  elements.forEach(el => el.remove());
};
