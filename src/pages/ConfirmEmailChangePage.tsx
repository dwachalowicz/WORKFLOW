import { useTranslation } from 'react-i18next';
import { useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { pb } from '@/lib/pocketbase';
import { CheckCircle2, AlertCircle, MailCheck } from 'lucide-react';
import { GryfSpinner } from '@/components/ui/GryfSpinner';
import { Button } from '@/components/ui/button';

/**
 * ConfirmEmailChangePage
 * Custom page to handle email change confirmation on the frontend without relying on PocketBase Admin UI.
 * Since the system uses MagicLinks (OTP), users don't have a password. 
 * We call confirmEmailChange(token, "") passing an empty password.
 */
export const ConfirmEmailChangePage = () => {
  const { t } = useTranslation();
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const checkAuth = useAuthStore((state) => state.checkAuth);

  const [status, setStatus] = useState<'ready' | 'loading' | 'success' | 'error'>('ready');
  const [errorMessage, setErrorMessage] = useState('');
  const isConfirming = useRef(false);

  // Validate params
  const isValid = !!token;

  const handleConfirm = async () => {
    if (!token || isConfirming.current) return;

    isConfirming.current = true;
    setStatus('loading');
    try {
      // Pass an empty string as password, which works for accounts without a password (OTP/OAuth)
      await pb.collection('WORKFLOW_users').confirmEmailChange(token, "");
      
      setStatus('success');
      await checkAuth(); // Refresh user data to get the new email in the UI
      
      // Small delay for success animation
      setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 1500);
    } catch (err) {
      console.error('Email change confirmation failed:', err);
      const error = err as Error;
      setStatus('error');
      setErrorMessage(
        error?.message?.includes('expired') || error?.message?.includes('invalid')
          ? t('auth.magicLinkExpired', 'Link wygasł lub jest nieprawidłowy.')
          : error?.message || t('auth.magicLinkVerifyFail', 'Nie udało się potwierdzić adresu e-mail.')
      );
      isConfirming.current = false;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md p-8 bg-card rounded-2xl shadow-xl border border-border relative overflow-hidden">
        <div className="flex flex-col items-center justify-center space-y-5 relative z-10">
          <div className="w-14 h-14 gryf-logo-mask" />

          {!isValid && (
            <>
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-destructive" />
              </div>
              <div className="text-center space-y-1">
                <h1 className="text-xl font-bold text-foreground">{t('auth.magicLinkError', 'Błąd weryfikacji')}</h1>
                <p className="text-sm text-muted-foreground">
                  {t('auth.magicLinkBroken', 'Brakujący token. Upewnij się, że skopiowałeś pełny link z e-maila.')}
                </p>
              </div>
              <Button onClick={() => navigate('/dashboard')} className="w-full">
                {t('common.goToDashboard', 'Wróć do kokpitu')}
              </Button>
            </>
          )}

          {isValid && status === 'ready' && (
            <>
              <div className="w-12 h-12 rounded-full bg-brand-gold/10 flex items-center justify-center">
                <MailCheck className="w-6 h-6 text-brand-gold" />
              </div>
              <div className="text-center space-y-1">
                <h1 className="text-xl font-bold text-foreground">{t('profile.confirmEmailTitle', 'Potwierdź zmianę e-maila')}</h1>
                <p className="text-sm text-muted-foreground">
                  {t('profile.confirmEmailDesc', 'Kliknij przycisk poniżej, aby zatwierdzić swój nowy adres e-mail.')}
                </p>
              </div>
              <Button onClick={handleConfirm} className="w-full">
                {t('profile.confirmEmailBtn', 'Zatwierdź zmianę')}
              </Button>
            </>
          )}

          {isValid && status === 'loading' && (
            <>
              <div className="w-12 h-12 rounded-full flex items-center justify-center">
                <GryfSpinner size={24} />
              </div>
              <div className="text-center space-y-1">
                <h1 className="text-xl font-bold text-foreground">{t('ui.verifying', 'Weryfikacja...')}</h1>
                <p className="text-sm text-muted-foreground">{t('ui.pleaseWait', 'Proszę czekać')}</p>
              </div>
            </>
          )}

          {isValid && status === 'success' && (
            <>
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
              </div>
              <div className="text-center space-y-1">
                <h1 className="text-xl font-bold text-foreground">{t('profile.emailChangedSuccess', 'E-mail zmieniony pomyślnie!')}</h1>
                <p className="text-sm text-muted-foreground">{t('ui.redirecting', 'Przekierowywanie...')}</p>
              </div>
            </>
          )}

          {isValid && status === 'error' && (
            <>
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-destructive" />
              </div>
              <div className="text-center space-y-1">
                <h1 className="text-xl font-bold text-foreground">{t('auth.magicLinkError', 'Błąd weryfikacji')}</h1>
                <p className="text-sm text-muted-foreground">{errorMessage}</p>
              </div>
              <Button onClick={() => navigate('/dashboard')} className="w-full text-foreground hover:bg-secondary" variant="outline">
                {t('common.goToDashboard', 'Wróć do kokpitu')}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
