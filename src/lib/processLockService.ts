import { pb } from './pocketbase';
import i18n from '@/i18n/config';
import { useToastStore } from '@/store/toastStore';

/** Lock expires after 3 minutes of inactivity (heartbeat refreshes it every 60s) */
const LOCK_TIMEOUT_MS = 3 * 60 * 1000;
const HEARTBEAT_INTERVAL_MS = 60 * 1000; // 1 minute

export interface ProcessLock {
  locked_by: string;
  locked_at: string;
  lockedByName?: string;
  isOurs?: boolean;
}

/**
 * Check if a process is currently locked by someone else.
 * Returns the lock info if locked by another user, or null if free.
 */
export async function checkLock(processId: string, currentUserId: string): Promise<ProcessLock | null> {
  try {
    const record = await pb.collection('WORKFLOW_processes').getOne(processId, {
      fields: 'locked_by,locked_at',
      requestKey: null,
    });

    if (!record.locked_by || !record.locked_at) return null;

    // Check if lock has expired
    const lockedAt = new Date(record.locked_at).getTime();
    const now = Date.now();
    if (now - lockedAt > LOCK_TIMEOUT_MS) {
      // Lock expired — auto-release
      await releaseLock(processId, record.locked_by);
      return null;
    }

    // Lock is active — check if it's someone else
    if (record.locked_by === currentUserId) {
      return {
        locked_by: record.locked_by,
        locked_at: record.locked_at,
        isOurs: true,
      };
    }

    // Fetch locker's name
    let lockedByName = i18n.t('defaults.otherUser');
    try {
      const locker = await pb.collection('WORKFLOW_users').getOne(record.locked_by, {
        fields: 'name,email',
        requestKey: null,
      });
      lockedByName = locker.name || locker.email || i18n.t('defaults.otherUser');
    } catch {
      // ignore
    }

    return {
      locked_by: record.locked_by,
      locked_at: record.locked_at,
      lockedByName,
    };
  } catch (err) {
    const error = err as { status?: number; isAbort?: boolean };
    if (error?.status !== 0 && error?.isAbort !== true) {
      console.error('Error checking lock:', err);
    }
    return null;
  }
}

/**
 * Acquire a lock on a process for the given user.
 * Returns true if lock was acquired, false if locked by someone else.
 */
export async function acquireLock(processId: string, _userId?: string): Promise<boolean> {
  try {
    // Attempt to set lock using the atomic backend endpoint
    const data = await pb.send('/api/process/lock', {
      method: 'POST',
      body: { processId },
      requestKey: null
    });
    
    return !!(data && data.success);
  } catch (err) {
    const error = err as { status?: number; isAbort?: boolean };
    if (error?.status === 409) {
      // 409 means it's legitimately locked by someone else
      return false;
    }
    if (error?.status !== 0 && error?.isAbort !== true) {
      console.error('Error acquiring lock:', err);
    }
    return false;
  }
}

/**
 * Release a lock on a process.
 */
export async function releaseLock(processId: string, userId: string): Promise<void> {
  try {
    // Only release if the current user holds the lock
    const record = await pb.collection('WORKFLOW_processes').getOne(processId, {
      fields: 'locked_by',
      requestKey: null,
    });

    if (record.locked_by === userId) {
      await pb.collection('WORKFLOW_processes').update(processId, {
        locked_by: null,
        locked_at: null,
      }, { requestKey: null });
    }
  } catch (err) {
    const error = err as { status?: number; isAbort?: boolean };
    if (error?.status !== 0 && error?.isAbort !== true) {
      console.error('Error releasing lock:', err);
    }
  }
}

/**
 * Send a heartbeat to keep the lock alive.
 */
async function heartbeat(processId: string): Promise<void> {
  try {
    // Use atomic lock endpoint instead of getOne() followed by update().
    // Backend automatically verifies lock ownership and refreshes locked_at.
    await pb.send('/api/process/lock', {
      method: 'POST',
      body: { processId },
      requestKey: null
    });
  } catch (err) {
    const error = err as { status?: number; isAbort?: boolean };
    if (error?.status !== 0 && error?.isAbort !== true) {
      console.error('Error sending heartbeat:', err);
      useToastStore.getState().showToast(i18n.t('processes.lockHeartbeatError'), 'error');
    }
  }
}

/**
 * Start a heartbeat interval that keeps the lock alive.
 * Returns a cleanup function to stop the heartbeat.
 */
export function startHeartbeat(processId: string): () => void {
  const intervalId = setInterval(() => {
    heartbeat(processId);
  }, HEARTBEAT_INTERVAL_MS);

  return () => clearInterval(intervalId);
}
