import { useEffect, useRef } from 'react';
import { pb } from '@/lib/pocketbase';
import type { RecordSubscription } from 'pocketbase';

/**
 * A DRY generic hook to subscribe to PocketBase Realtime (SSE) events safely.
 * Automatically cleans up the specific listener on unmount without breaking others.
 */
export function usePBSubscription<T = Record<string, unknown>>(
  collectionName: string,
  topic: string | undefined, // '*' or recordId. If undefined, won't subscribe.
  callback: (e: RecordSubscription<T>) => void,
  enabled: boolean = true,
  options?: { filter?: string; expand?: string; fields?: string; [key: string]: unknown }
) {
  const callbackRef = useRef(callback);
  
  // Serialize options to avoid infinite re-renders if passed inline
  const optionsStr = options ? JSON.stringify(options) : '';

  // Keep the callback ref updated
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled || !topic) return;

    // Use a stable wrapper so we can safely unsubscribe this EXACT listener
    const listenerWrapper = (e: RecordSubscription<T>) => {
      callbackRef.current(e);
    };

    const parsedOptions = optionsStr ? JSON.parse(optionsStr) : undefined;

    let unsubscribeFunc: (() => void) | null = null;
    let isUnmounted = false;

    pb.collection(collectionName).subscribe<T>(topic, listenerWrapper, parsedOptions)
      .then((unsub) => {
        if (isUnmounted) {
          // If the component already unmounted before the promise resolved, clean up immediately
          unsub();
        } else {
          unsubscribeFunc = unsub;
        }
      })
      .catch((err) => {
        const error = err as { isAbort?: boolean };
        if (error.isAbort) return;
        console.warn(`[Realtime] Failed to subscribe to ${collectionName}:${topic}`, err);
      });

    return () => {
      isUnmounted = true;
      if (unsubscribeFunc) {
        unsubscribeFunc();
      }
    };
  }, [collectionName, topic, enabled, optionsStr]);
}
