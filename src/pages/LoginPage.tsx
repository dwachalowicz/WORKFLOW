import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { Mail, ArrowRight, Loader2, KeyRound, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useToastStore } from '@/store/toastStore';

export const LoginPage = () => {
  const { t } = useTranslation();
  const showToast = useToastStore((s) => s.showToast);
  const [searchParams, setSearchParams] = useSearchParams();

  useLayoutEffect(() => {
    const html = document.documentElement;
    const savedTheme = localStorage.getItem('gryf-theme');
    html.classList.add('dark');

    return () => {
      if (savedTheme === 'light') {
        html.classList.remove('dark');
      }
    };
  }, []);
  
  const initialEmail = searchParams.get('email') || '';
  const shouldAutoLogin = searchParams.get('autoLogin') === 'true';
  const hasAutoLoginFired = useRef(false);

  const [email, setEmail] = useState(initialEmail);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpId, setOtpId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const isRequestingOTP = useRef(false);
  const isSubmittingOTP = useRef(false);
  const [cooldown, setCooldown] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const MAX_ATTEMPTS = 5;
  const requestOTP = useAuthStore((state) => state.requestOTP);
  const confirmOTP = useAuthStore((state) => state.confirmOTP);
  const navigate = useNavigate();

  const handleRequestOTP = useCallback(async (e?: React.FormEvent, customEmail?: string) => {
    if (e) e.preventDefault();
    const targetEmail = customEmail || email;

    if (!termsAccepted || !privacyAccepted) {
      showToast(t('auth.termsRequired'), 'error');
      return;
    }

    if (!targetEmail || cooldown > 0 || isRequestingOTP.current) return;
    
    isRequestingOTP.current = true;
    setIsLoading(true);
    try {
      const id = await requestOTP(targetEmail);
      setOtpId(id);
      setAttempts(0);
      // Start 60s cooldown to prevent spam
      setCooldown(60);
      const timer = setInterval(() => {
        setCooldown(prev => {
          if (prev <= 1) { clearInterval(timer); return 0; }
          return prev - 1;
        });
      }, 1000);
    } catch (error: unknown) {
      console.error(error);
      const err = error as { isAbort?: boolean };
      if (err?.isAbort) return; // ignore auto-cancelled requests
      showToast(t('errors.loginSendCodeFail'), 'error');
    } finally {
      setIsLoading(false);
      isRequestingOTP.current = false;
    }
  }, [email, cooldown, requestOTP, t, showToast, termsAccepted, privacyAccepted]);

  // Auto trigger login if redirected from landing page
  useEffect(() => {
    if (shouldAutoLogin && initialEmail && !otpId && !isLoading && cooldown === 0 && !hasAutoLoginFired.current) {
      hasAutoLoginFired.current = true;
      // Clear the params so it doesn't re-trigger on refresh
      setSearchParams({});
      handleRequestOTP(undefined, initialEmail);
    }
  }, [shouldAutoLogin, initialEmail, cooldown, handleRequestOTP, isLoading, otpId, setSearchParams]);

  const handleConfirmOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpId || !otpCode || isSubmittingOTP.current) return;
    
    if (attempts >= MAX_ATTEMPTS) {
      showToast(t('errors.tooManyAttempts'), 'error');
      return;
    }
    
    isSubmittingOTP.current = true;
    setIsLoading(true);
    try {
      await confirmOTP(otpId, otpCode);
      navigate('/dashboard');
    } catch (error) {
      console.error(error);
      setAttempts(prev => prev + 1);
      showToast(t('errors.loginInvalidCode'), 'error');
      isSubmittingOTP.current = false;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 sm:p-8">
      <div className="w-full max-w-md p-8 sm:p-10 bg-card/80 backdrop-blur-xl rounded-[2.5rem] border border-border relative overflow-hidden">
        <div className="flex flex-col items-center justify-center space-y-6 relative z-10">
          <div className="w-16 h-16 gryf-logo-mask" />
          
          <div className="text-center space-y-2">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">{t('ui.welcomeTitle')}</h1>
            <p className="text-[15px] text-muted-foreground/80">{t('ui.loginSubtitle')}</p>
          </div>
        </div>

        <div className="mt-8 relative z-10">
          {otpId ? (
            <form onSubmit={handleConfirmOTP} className="space-y-5 animate-in fade-in zoom-in duration-300">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider ml-4">
                  {t('auth.enterCode')}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <KeyRound className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <input
                    type="text"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    required
                    maxLength={6}
                    className="flex h-14 w-full rounded-full border border-border bg-secondary/30 px-4 py-2 pl-12 text-base font-mono tracking-widest text-center text-foreground focus-visible:outline-none focus-visible:border-brand-gold/50 focus-visible:ring-1 focus-visible:ring-brand-gold/50 transition-all placeholder:text-muted-foreground/50 placeholder:tracking-normal placeholder:font-sans"
                    placeholder="123456"
                    autoFocus
                  />
                </div>
              </div>
              
              <button
                type="submit"
                disabled={isLoading || otpCode.length < 6}
                className="w-full flex items-center justify-center gap-2 rounded-full bg-foreground text-background hover:bg-brand-gold hover:text-white hover:scale-[1.02] active:scale-[0.98] h-14 px-8 text-sm font-bold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 group"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    {t('auth.login')}
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>

              <div className="text-center mt-4">
                <button 
                  type="button"
                  onClick={() => {
                    setOtpId(null);
                    setOtpCode('');
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t('auth.backChangeEmail')}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleRequestOTP} className="space-y-5 animate-in fade-in duration-300">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider ml-4">
                  {t('auth.emailPlaceholder')}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="flex h-14 w-full rounded-full border border-border bg-secondary/30 px-4 py-2 pl-12 text-base text-foreground focus-visible:outline-none focus-visible:border-brand-gold/50 focus-visible:ring-1 focus-visible:ring-brand-gold/50 transition-all placeholder:text-muted-foreground/50"
                    placeholder="mail@gryf.ai"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-6 py-2 text-sm text-muted-foreground">
                <label className="flex items-center gap-2.5 cursor-pointer group">
                  <div className="relative flex items-center justify-center shrink-0">
                    <input 
                      type="checkbox" 
                      className="peer sr-only" 
                      checked={termsAccepted}
                      onChange={(e) => setTermsAccepted(e.target.checked)}
                    />
                    <div className="w-5 h-5 rounded border-2 border-muted-foreground/30 peer-checked:border-brand-gold peer-checked:bg-brand-gold transition-all group-hover:border-brand-gold/50 flex items-center justify-center">
                      <Check className="w-3.5 h-3.5 text-background opacity-0 peer-checked:opacity-100 transition-opacity" />
                    </div>
                  </div>
                  <span className="leading-tight group-hover:text-foreground transition-colors text-[13px]">
                    {t('auth.acceptTerms')} 
                    <a href="/page/regulamin" target="_blank" rel="noopener noreferrer" className="text-brand-gold hover:underline">{t('ui.terms', 'Regulamin')}</a>
                  </span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer group">
                  <div className="relative flex items-center justify-center shrink-0">
                    <input 
                      type="checkbox" 
                      className="peer sr-only" 
                      checked={privacyAccepted}
                      onChange={(e) => setPrivacyAccepted(e.target.checked)}
                    />
                    <div className="w-5 h-5 rounded border-2 border-muted-foreground/30 peer-checked:border-brand-gold peer-checked:bg-brand-gold transition-all group-hover:border-brand-gold/50 flex items-center justify-center">
                      <Check className="w-3.5 h-3.5 text-background opacity-0 peer-checked:opacity-100 transition-opacity" />
                    </div>
                  </div>
                  <span className="leading-tight group-hover:text-foreground transition-colors text-[13px]">
                    {t('auth.acceptTerms')} 
                    <a href="/page/polityka-prywatnosci" target="_blank" rel="noopener noreferrer" className="text-brand-gold hover:underline">{t('ui.privacy', 'Prywatność')}</a>
                  </span>
                </label>
              </div>
              
              <button
                type="submit"
                disabled={isLoading || !email || cooldown > 0}
                className="w-full flex items-center justify-center gap-2 rounded-full bg-foreground text-background hover:bg-brand-gold hover:text-white hover:scale-[1.02] active:scale-[0.98] h-14 px-8 text-sm font-bold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 group"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : cooldown > 0 ? (
                  <>{t('auth.sendCode')} ({cooldown}s)</>
                ) : (
                  <>
                    {t('auth.sendCode')}
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
        {/* Footer Links */}
        <div className="mt-8 flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <a href="/page/regulamin" className="hover:text-foreground transition-colors">{t('ui.terms')}</a>
          <span>·</span>
          <a href="/page/polityka-prywatnosci" className="hover:text-foreground transition-colors">{t('ui.privacy')}</a>
          <span>·</span>
          <a href="https://www.gryf.ai" target="_blank" rel="noopener" className="hover:text-foreground transition-colors">www.gryf.ai</a>
        </div>
      </div>
    </div>
  );
};
