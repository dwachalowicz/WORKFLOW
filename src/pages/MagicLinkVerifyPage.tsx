import { useTranslation } from 'react-i18next';
import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { pb } from '@/lib/pocketbase';
import { CheckCircle2, AlertCircle, Shield } from 'lucide-react';
import { GryfSpinner } from '@/components/ui/GryfSpinner';
import { Button } from '@/components/ui/button';

/**
 * MagicLinkVerifyPage — handles clickable magic link login.
 * 
 * The email template in PocketBase includes a link like:
 *   https://flow.gryf.ai/login/verify?otp={OTP}&otpId={OTP_ID}
 * 
 * Important: We do NOT auto-authenticate on page load because email scanners
 * (Gmail, Outlook) often pre-click links, which would consume the OTP.
 * Instead, the user must click a "Confirm login" button.
 */
export const MagicLinkVerifyPage = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const checkAuth = useAuthStore((state) => state.checkAuth);

  const otp = searchParams.get('otp');
  const otpId = searchParams.get('otpId');

  const [status, setStatus] = useState<'ready' | 'loading' | 'success' | 'error'>('ready');
  const [errorMessage, setErrorMessage] = useState('');

  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isInitializing = useAuthStore((state) => state.isInitializing);
  const isConfirming = useRef(false);

  useEffect(() => {
    if (isAuthenticated && !isInitializing) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, isInitializing, navigate]);

  // Validate params
  const isValid = !!otp && !!otpId;

  const handleConfirm = async () => {
    if (!otp || !otpId || isConfirming.current) return;

    isConfirming.current = true;
    setStatus('loading');
    try {
      await pb.collection('WORKFLOW_users').authWithOTP(otpId, otp);
      setStatus('success');
      await checkAuth();
      // Small delay for success animation
      setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 1200);
    } catch (err) {
      console.error('Magic link verification failed:', err);
      const error = err as Error;
      setStatus('error');
      setErrorMessage(
        error?.message?.includes('expired') || error?.message?.includes('invalid')
          ? t('auth.magicLinkExpired')
          : t('auth.magicLinkVerifyFail')
      );
      isConfirming.current = false;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md p-8 bg-card rounded-2xl shadow-xl border border-border relative overflow-hidden">
        <div className="flex flex-col items-center justify-center space-y-5 relative z-10">
          <div className="w-14 h-14 gryf-logo-mask" />

          {isInitializing && (
            <>
              <div className="w-12 h-12 rounded-full flex items-center justify-center">
                <GryfSpinner size={24} />
              </div>
              <div className="text-center space-y-1">
                <h1 className="text-xl font-bold text-foreground">{t('ui.verifyingLogin')}</h1>
              </div>
            </>
          )}

          {!isInitializing && !isValid && (
            <>
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-destructive" />
              </div>
              <div className="text-center space-y-1">
                <h1 className="text-xl font-bold text-foreground">{t('auth.magicLinkError')}</h1>
                <p className="text-sm text-muted-foreground">
                  {t('auth.magicLinkBroken')}
                </p>
              </div>
              <Button
                onClick={() => navigate('/login')}
                className="w-full"
              >
                {t('auth.goToLogin')}
              </Button>
            </>
          )}

          {!isInitializing && isValid && status === 'ready' && (
            <>
              <div className="w-12 h-12 rounded-full bg-brand-gold/10 flex items-center justify-center">
                <Shield className="w-6 h-6 text-brand-gold" />
              </div>
              <div className="text-center space-y-1">
                <h1 className="text-xl font-bold text-foreground">{t('auth.magicLinkConfirm')}</h1>
                <p className="text-sm text-muted-foreground">
                  {t('auth.magicLinkClickBelow')}
                </p>
              </div>
              <Button
                onClick={handleConfirm}
                className="w-full"
              >
                {t('auth.login')}
              </Button>
            </>
          )}

          {!isInitializing && isValid && status === 'loading' && (
            <>
              <div className="w-12 h-12 rounded-full bg-brand-gold/10 flex items-center justify-center">
                <GryfSpinner size={24} />
              </div>
              <div className="text-center space-y-1">
                <h1 className="text-xl font-bold text-foreground">{t('ui.verifyingLogin')}</h1>
                <p className="text-sm text-muted-foreground">{t('ui.confirmingLogin')}</p>
              </div>
            </>
          )}

          {!isInitializing && isValid && status === 'success' && (
            <>
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
              </div>
              <div className="text-center space-y-1">
                <h1 className="text-xl font-bold text-foreground">{t('auth.magicLinkSuccess')}</h1>
                <p className="text-sm text-muted-foreground">{t('ui.redirecting')}</p>
              </div>
            </>
          )}

          {!isInitializing && isValid && status === 'error' && (
            <>
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-destructive" />
              </div>
              <div className="text-center space-y-1">
                <h1 className="text-xl font-bold text-foreground">{t('auth.magicLinkError')}</h1>
                <p className="text-sm text-muted-foreground">{errorMessage}</p>
              </div>
              <Button
                onClick={() => navigate('/login')}
                className="w-full"
              >
                {t('auth.tryAgain')}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
