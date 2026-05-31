import { useEffect, type RefObject } from 'react';

/**
 * Hook that alerts clicks outside of the passed ref(s).
 * Accepts either a single RefObject or an array of RefObjects.
 */
export function useClickOutside(
  refOrRefs: RefObject<HTMLElement> | RefObject<HTMLElement>[],
  handler: (event: MouseEvent | TouchEvent) => void
) {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      const refs = Array.isArray(refOrRefs) ? refOrRefs : [refOrRefs];
      
      const isOutside = refs.every((ref) => {
        const el = ref?.current;
        return el && !el.contains(event.target as Node);
      });

      if (isOutside) {
        handler(event);
      }
    };

    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);

    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [refOrRefs, handler]);
}
