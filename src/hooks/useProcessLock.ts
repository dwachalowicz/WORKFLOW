import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { checkLock, acquireLock, releaseLock, startHeartbeat, type ProcessLock } from '@/lib/processLockService';
import { useCanvasStore } from '@/store/canvasStore';
import { usePBSubscription } from './usePBSubscription';
import i18n from '@/i18n/config';

export function useProcessLock(urlProcessId: string | undefined, userId: string | undefined) {
  const [lockInfo, setLockInfo] = useState<ProcessLock | null>(null);
  const heartbeatCleanupRef = useRef<(() => void) | null>(null);
  const recheckIntervalRef = useRef<number | null>(null);

  const evaluateLock = useCallback(async function evaluateLockFn() {
    if (!urlProcessId || !userId) return;

    const existing = await checkLock(urlProcessId, userId);

    if (existing) {
      if (existing.isOurs) {
        // We already own the lock. Do not acquire again to prevent infinite loop.
        setLockInfo(null);
        if (!useCanvasStore.getState().lockedReason) {
          useCanvasStore.getState().setViewMode(false);
        }
        if (!heartbeatCleanupRef.current) {
          heartbeatCleanupRef.current = startHeartbeat(urlProcessId);
        }
        if (recheckIntervalRef.current) {
          clearInterval(recheckIntervalRef.current);
          recheckIntervalRef.current = null;
        }
      } else {
        // Locked by someone else → view-only mode
        setLockInfo(existing);
        useCanvasStore.getState().setViewMode(true);
        // If we previously held the lock, stop our heartbeat
        if (heartbeatCleanupRef.current) {
          heartbeatCleanupRef.current();
          heartbeatCleanupRef.current = null;
        }
        // Start an interval to re-evaluate the lock periodically in case it expired on the server
        if (!recheckIntervalRef.current) {
          recheckIntervalRef.current = window.setInterval(() => {
            evaluateLockFn().catch(console.error);
          }, 30000); // Check every 30 seconds
        }
      }
    } else {
      // Free → try to acquire lock
      const acquired = await acquireLock(urlProcessId);
      if (acquired) {
        setLockInfo(null);
        if (!useCanvasStore.getState().lockedReason) {
          useCanvasStore.getState().setViewMode(false);
        }
        // Start heartbeat if not already started
        if (!heartbeatCleanupRef.current) {
          heartbeatCleanupRef.current = startHeartbeat(urlProcessId);
        }
        if (recheckIntervalRef.current) {
          clearInterval(recheckIntervalRef.current);
          recheckIntervalRef.current = null;
        }
      }
    }
  }, [urlProcessId, userId]);

  useEffect(() => {
    if (!urlProcessId || !userId) return;

    evaluateLock().catch(console.error);

    const handleVisibilityChange = () => {
      if (!urlProcessId || !userId) return;
      if (document.visibilityState === 'hidden') {
        releaseLock(urlProcessId, userId);
      } else if (document.visibilityState === 'visible') {
        // Try to regain lock upon returning to active tab
        evaluateLock().catch(console.error);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (heartbeatCleanupRef.current) {
        heartbeatCleanupRef.current();
        heartbeatCleanupRef.current = null;
      }
      if (recheckIntervalRef.current) {
        clearInterval(recheckIntervalRef.current);
        recheckIntervalRef.current = null;
      }
      if (urlProcessId && userId) {
        releaseLock(urlProcessId, userId);
        if (!useCanvasStore.getState().lockedReason) {
          useCanvasStore.getState().setViewMode(false);
        }
      }
    };
  }, [urlProcessId, userId, evaluateLock]);

  const handleRealtimeUpdate = useCallback((e: import('pocketbase').RecordSubscription<Record<string, unknown>>) => {
    if (!urlProcessId || !userId || e.action === 'delete') return;
    
    const record = e.record;
    if (!record.locked_by) {
      // Free -> try to acquire if we want, but usually evaluateLock handles initial. 
      // If it became free, let's call evaluateLock to try and grab it.
      evaluateLock().catch(console.error);
      return;
    }

    // Check if lock has expired
    const lockedAt = new Date(record.locked_at).getTime();
    const now = Date.now();
    const LOCK_TIMEOUT_MS = 3 * 60 * 1000;
    
    if (now - lockedAt > LOCK_TIMEOUT_MS) {
      // Lock expired — evaluateLock will handle releasing and grabbing
      evaluateLock().catch(console.error);
      return;
    }

    if (record.locked_by === userId) {
      // We hold the lock
      setLockInfo(null);
      if (!useCanvasStore.getState().lockedReason) {
        useCanvasStore.getState().setViewMode(false);
      }
      if (!heartbeatCleanupRef.current) {
        heartbeatCleanupRef.current = startHeartbeat(urlProcessId);
      }
    } else {
      // Someone else holds it
      const locker = record.expand?.locked_by;
      const lockedByName = locker ? (locker.name || locker.email) : i18n.t('defaults.otherUser');
      
      setLockInfo({
        locked_by: record.locked_by,
        locked_at: record.locked_at,
        lockedByName,
      });
      useCanvasStore.getState().setViewMode(true);
      if (heartbeatCleanupRef.current) {
        heartbeatCleanupRef.current();
        heartbeatCleanupRef.current = null;
      }
    }
  }, [urlProcessId, userId, evaluateLock]);

  const lockOptions = useMemo(() => ({ expand: 'locked_by' }), []);
  
  // Listen to realtime changes on this specific process lock
  usePBSubscription('WORKFLOW_processes', urlProcessId, handleRealtimeUpdate, !!urlProcessId && !!userId, lockOptions);

  return { lockInfo };
}
