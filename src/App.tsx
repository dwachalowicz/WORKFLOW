import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, lazy, Suspense, useState } from 'react';
import { useAuthStore } from './store/authStore';
import { InitialLoader } from './components/ui/InitialLoader';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { ToastContainer } from './components/ui/ToastContainer';
import { ConfirmDialog } from './components/ui/ConfirmDialog';
import { useConfirmStore } from './store/confirmStore';
import { CookieBanner } from './components/layout/CookieBanner';
import { getCookieConsents, applyCookieConsents } from './lib/cookieManager';
import { unloadTierConfig } from './lib/tierLimits';
import { GryfSpinner } from './components/ui/GryfSpinner';
import { useSeoSettings } from './hooks/useSeoSettings';
import { GlobalRealtimeListener } from './components/layout/GlobalRealtimeListener';
import { pb } from './lib/pocketbase';

// ── Lazy-loaded pages (code splitting) ───────────────────────
const LoginPage = lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })));
const MagicLinkVerifyPage = lazy(() => import('./pages/MagicLinkVerifyPage').then(m => ({ default: m.MagicLinkVerifyPage })));
const AppPage = lazy(() => import('./pages/AppPage').then(m => ({ default: m.AppPage })));
const DashboardPage = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const SharedProcessPage = lazy(() => import('./pages/SharedProcessPage').then(m => ({ default: m.SharedProcessPage })));
const StaticPage = lazy(() => import('./pages/StaticPage').then(m => ({ default: m.StaticPage })));
const ProfileModal = lazy(() => import('./components/modals/ProfileModal').then(m => ({ default: m.ProfileModal })));
const LandingPage = lazy(() => import('./landingpage/index').then(m => ({ default: m.LandingPage })));
const FaqPage = lazy(() => import('./pages/FaqPage').then(m => ({ default: m.FaqPage })));
const ContactPage = lazy(() => import('./pages/ContactPage').then(m => ({ default: m.ContactPage })));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then(m => ({ default: m.NotFoundPage })));

let isAppInitialized = false;

/** Suspense fallback — shown while lazy chunks are loading */
const PageLoader = () => {
  // For the initial load (when isAppInitialized is false), show the same spinner immediately,
  // with identical text and layout (fixed, z-index), to make the transition from InitialLoader seamless.
  const [showSpinner, setShowSpinner] = useState(!isAppInitialized);

  useEffect(() => {
    if (isAppInitialized) {
      // For subsequent pages, delay the spinner by 300ms to prevent flickering
      const timer = setTimeout(() => setShowSpinner(true), 300);
      return () => clearTimeout(timer);
    }
  }, []);

  const containerClass = !isAppInitialized 
    ? "fixed inset-0 z-loader bg-background flex items-center justify-center flex-col"
    : "min-h-screen flex items-center justify-center bg-background flex-col";

  return (
    <div className={containerClass}>
      {showSpinner && (
        <GryfSpinner 
          size={48} 
          label={!isAppInitialized ? "Loading..." : undefined} 
        />
      )}
    </div>
  );
};

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

function App() {
  const isInitializing = useAuthStore((state) => state.isInitializing);
  useSeoSettings();

  useEffect(() => {
    if (!isInitializing) {
      isAppInitialized = true;
    }
  }, [isInitializing]);

  useEffect(() => {
    // Read cookies on app startup and load scripts if accepted
    const consents = getCookieConsents();
    if (consents) {
      applyCookieConsents(consents);
    }

    // Cleanup realtime subscriptions on page unload (prevents browser console error about interrupted connection)
    const handleBeforeUnload = () => {
      try {
        pb.realtime.unsubscribe();
      } catch {
        // ignore
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Cleanup realtime subscriptions on unmount (prevents SSE leaks during HMR)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      unloadTierConfig();
    };
  }, []);

  return (
    <ErrorBoundary>
      <InitialLoader isLoading={isInitializing} />
      {!isInitializing && (
        <Router>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/login/verify" element={<MagicLinkVerifyPage />} />
              <Route 
                path="/dashboard/:tab?" 
                element={
                  <ProtectedRoute>
                    <DashboardPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/app/:processId?" 
                element={
                  <ProtectedRoute>
                    <AppPage />
                  </ProtectedRoute>
                } 
              />
              <Route path="/shared/:id" element={<SharedProcessPage />} />
              <Route path="/page/:slug" element={<StaticPage />} />
              <Route path="/faq" element={<FaqPage />} />
              <Route path="/kontakt" element={<ContactPage />} />
              <Route path="/" element={<LandingPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
            <AuthenticatedProfileModal />
          </Suspense>
          <CookieBanner />
          <ToastContainer />
          <GlobalConfirmDialog />
          <GlobalRealtimeListener />
        </Router>
      )}
    </ErrorBoundary>
  );
}

/** Only render ProfileModal when authenticated — avoids loading the chunk on public pages */
const AuthenticatedProfileModal = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  if (!isAuthenticated) return null;
  return <ProfileModal />;
};

/** Single global instance of ConfirmDialog, driven by confirmStore. */
const GlobalConfirmDialog = () => {
  const { isOpen, title, message, confirmLabel, cancelLabel, variant, onConfirm, close } = useConfirmStore();
  return (
    <ConfirmDialog
      isOpen={isOpen}
      onClose={close}
      onConfirm={onConfirm}
      title={title}
      message={message}
      confirmLabel={confirmLabel}
      cancelLabel={cancelLabel}
      variant={variant}
    />
  );
};

export default App;
