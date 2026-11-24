import { useCallback, useRef } from 'react';

const CLICK_SOUND = '/assets/audio/sound_click.mp3';

/**
 * The UI click. `isEnabled` is read at the moment of each click, so it
 * follows the site's sound switch (the same one as the ocean waves) without
 * re-rendering anything.
 */
export function useClickSound(volume: number, isEnabled: () => boolean) {
  const audio = useRef<HTMLAudioElement | null>(null);

  const playClickSound = useCallback(() => {
    if (!isEnabled()) return;
    // Created on the first click, after the visitor has interacted
    if (!audio.current) {
      audio.current = new Audio(CLICK_SOUND);
      audio.current.preload = 'auto';
    }
    audio.current.volume = Math.min(Math.max(volume, 0), 1);
    audio.current.currentTime = 0;
    audio.current.play().catch(() => {
      // Autoplay rules can block it; a missing click is harmless
    });
  }, [volume, isEnabled]);

  return { playClickSound };
}
