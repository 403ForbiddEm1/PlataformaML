import { useCallback, useEffect, useRef } from 'react';

interface UseFolderAutoScrollOptions {
  /** Pixel offset from viewport top (e.g. sticky navbar height + breathing room). */
  stickyOffset?: number;
  /** Delay in ms so CSS height transitions expand/collapse before scrolling. */
  delayMs?: number;
}

/**
 * Coordinates smooth viewport scrolling when toggling expandable folder cards.
 * - Scrolls to frame the folder at `stickyOffset` on both open and close.
 * - Skips scrolling when another folder in the same horizontal grid row is already open
 *   (so opening/closing a sibling folder beside an already-open folder never jumps the screen).
 */
export function useFolderAutoScroll(options?: UseFolderAutoScrollOptions) {
  const stickyOffset = options?.stickyOffset ?? 88;
  const delayMs = options?.delayMs ?? 210;

  const folderRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const timerRef = useRef<number | null>(null);

  const registerFolderRef = useCallback(
    (id: string) => (el: HTMLDivElement | null) => {
      folderRefs.current[id] = el;
    },
    []
  );

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  const scheduleScrollIfNeeded = useCallback(
    (id: string, prevOpenMap: Record<string, boolean>) => {
      const targetEl = folderRefs.current[id];
      if (!targetEl) return;

      // Check if any OTHER currently open folder occupies the same horizontal row.
      const hasOpenSiblingInSameRow = Object.keys(prevOpenMap).some((otherId) => {
        if (otherId === id || !prevOpenMap[otherId]) return false;
        const otherEl = folderRefs.current[otherId];
        if (!otherEl) return false;
        return Math.abs(otherEl.offsetTop - targetEl.offsetTop) < 24;
      });

      if (hasOpenSiblingInSameRow) {
        return;
      }

      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }

      timerRef.current = window.setTimeout(() => {
        const currentEl = folderRefs.current[id];
        if (!currentEl) return;

        const rect = currentEl.getBoundingClientRect();
        const desiredTop = Math.max(0, window.scrollY + rect.top - stickyOffset);

        if (Math.abs(rect.top - stickyOffset) > 14) {
          window.scrollTo({
            top: desiredTop,
            behavior: 'smooth',
          });
        }
      }, delayMs);
    },
    [delayMs, stickyOffset]
  );

  return {
    registerFolderRef,
    scheduleScrollIfNeeded,
  };
}
