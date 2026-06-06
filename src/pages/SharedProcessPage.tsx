import { useTranslation } from 'react-i18next';
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { pb } from '@/lib/pocketbase';
import { parseNodesSafe, parseEdgesSafe } from '@/lib/schemas';
import { GryfCanvas } from '@/components/canvas/GryfCanvas';
import { ReactFlowProvider } from '@xyflow/react';
import { Lock, Eye } from 'lucide-react';
import { GryfSpinner } from '@/components/ui/GryfSpinner';
import { useCanvasStore } from '@/store/canvasStore';
import { PropertiesPanel } from '@/components/panels/PropertiesPanel';
import { FloatingNavBar } from '@/components/layout/FloatingNavBar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// Cleanup view mode on unmount
const useCleanupViewMode = () => {
  useEffect(() => {
    return () => {
      useCanvasStore.setState({ isViewMode: false });
    };
  }, []);
};

export const SharedProcessPage = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [processName, setProcessName] = useState('');

  useCleanupViewMode();

  const loadProcessToStore = useCallback((record: Record<string, unknown>) => {
    useCanvasStore.setState({
      nodes: parseNodesSafe(record.nodes),
      edges: parseEdgesSafe(record.edges),
      processName: String(record.name || ''),
      currentProcessId: String(record.id || ''),
      isDirty: false,
      isViewMode: true
    });
    setProcessName(String(record.name || ''));
  }, []);

  /**
   * Server-side verification via pb_hooks endpoint.
   * The password is verified on the server — never exposed to the client.
   */
  const verifyAndLoad = useCallback(async (processId: string, pwd: string = '') => {
    try {
      const data = await pb.send('/api/shared/verify', {
        method: 'POST',
        body: { processId, password: pwd },
      });
      loadProcessToStore(data);
      setRequiresPassword(false);
      return true;
    } catch (err: unknown) {
      const error = err as { status?: number; message?: string };
      if (error.status === 401) {
        // Password required or wrong
        setRequiresPassword(true);
        if (pwd) setPasswordError(true);
        return false;
      }
      if (error.status === 403) {
        setError(t('share.notPublic'));
        return false;
      }
      setError(t('share.notFound'));
      return false;
    }
  }, [t, loadProcessToStore]);

  useEffect(() => {
    const checkProcess = async (processId: string) => {
      setIsLoading(true);
      setError(null);
      await verifyAndLoad(processId);
      setIsLoading(false);
    };

    if (id) {
      checkProcess(id);
    }
  }, [id, verifyAndLoad]);

  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);

  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const timer = setTimeout(() => setNow(Date.now()), 0);
    if (lockedUntil) {
      const interval = setInterval(() => setNow(Date.now()), 1000);
      return () => {
        clearTimeout(timer);
        clearInterval(interval);
      };
    }
    return () => clearTimeout(timer);
  }, [lockedUntil]);

  const isLocked = lockedUntil !== null && now !== null && now < lockedUntil;

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || isLocked) return;
    setIsLoading(true);
    const success = await verifyAndLoad(id, password);
    setIsLoading(false);

    if (!success && password) {
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);

      // Apply cooldown: 30s after 5 failures, 3s otherwise
      const cooldownMs = newAttempts >= 5 ? 30_000 : 3_000;
      const until = Date.now() + cooldownMs;
      setLockedUntil(until);

      setTimeout(() => {
        setLockedUntil((prev) => (prev === until ? null : prev));
      }, cooldownMs);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <GryfSpinner size={48} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col h-screen w-screen items-center justify-center bg-background text-foreground">
        <h1 className="text-2xl font-bold mb-4">{t('common.error')}</h1>
        <p className="text-muted-foreground">{error}</p>
        <Button 
          onClick={() => window.location.href = '/'}
          size="pill"
          className="mt-6"
        >
          {t('common.back')}
        </Button>
      </div>
    );
  }

  if (requiresPassword) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background text-foreground">
        <div className="bg-card border border-border p-8 rounded-2xl shadow-2xl max-w-sm w-full">
          <div className="flex justify-center mb-6 text-brand-gold">
            <Lock className="w-12 h-12" />
          </div>
          <h2 className="text-xl font-bold text-center mb-2">{t('share.protectedTitle')}</h2>
          <p className="text-sm text-center text-muted-foreground mb-6">
            {t('share.protectedDesc')}
          </p>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <Input 
                type="password"
                placeholder={t('share.password')}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setPasswordError(false); }}
                className={`text-center ${passwordError ? 'border-destructive' : ''}`}
              />
              {passwordError && (
                <p className="text-xs text-destructive text-center mt-2">{t('auth.invalidCode')}</p>
              )}
            </div>
            <Button 
              type="submit"
              className="w-full"
              disabled={isLoading || isLocked}
            >
              {isLocked ? t('share.tryAgainLater') : t('share.unlock')}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground relative">
      <FloatingNavBar />

      {/* View Mode Banner */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-surface-nav px-6 py-3 rounded-full border border-transparent dark:border-border shadow-xl">
        <Eye className="text-brand-gold w-5 h-5" />
        <div className="font-bold text-foreground">{t('canvas.viewMode')}: <span className="text-foreground/70 font-normal">{processName}</span></div>
      </div>
      
      <ReactFlowProvider>
        <main className="flex-1 relative">
          <GryfCanvas />
        </main>

        {/* Properties Panel - read-only (isViewMode is set in store) */}
        <PropertiesPanel />
      </ReactFlowProvider>
    </div>
  );
};
