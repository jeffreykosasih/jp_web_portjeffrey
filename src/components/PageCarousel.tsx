import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getButtonSize } from '../lib/responsiveUtils';
import { FOOTER_BOTTOM_PX } from '../lib/buttonUtils';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faEnvelope,
  faBriefcase,
  faUser,
  faCogs,
  faChevronLeft,
  faChevronRight,
} from '@fortawesome/free-solid-svg-icons';

export type CarouselPage = 'profile' | 'portfolio' | 'skillset' | 'connect';

// Same order as the page buttons: Profile, then the landmarks from left to
// right across the island
export const CAROUSEL_PAGES: { id: CarouselPage; title: string; icon: typeof faUser }[] = [
  { id: 'profile', title: 'Profile', icon: faUser },
  { id: 'portfolio', title: 'Projects', icon: faBriefcase },
  { id: 'skillset', title: 'Skillset', icon: faCogs },
  { id: 'connect', title: 'Connect', icon: faEnvelope },
];

interface PageCarouselProps {
  isDarkMode: boolean;
  deviceInfo?: any;
  /** Screen position of the dock, the carousel hangs just below it */
  anchor?: [number, number];
  selected: CarouselPage;
  onSelect: (page: CarouselPage) => void;
  onOpen: (page: CarouselPage) => void;
  onPlayClickSound?: () => void;
  isVisible?: boolean;
  introDelayMs?: number;
}

// One page button below the dock with an arrow on each side. The arrows
// (or the keyboard's left / right keys) step through the four pages, and the
// island lights up the chosen page's landmark; the button opens the page.
export default function PageCarousel({
  isDarkMode,
  deviceInfo,
  anchor,
  selected,
  onSelect,
  onOpen,
  onPlayClickSound,
  isVisible = true,
  introDelayMs = 0,
}: PageCarouselProps) {
  const isMobile = deviceInfo?.isMobile || deviceInfo?.isLandscapeMobile;
  const [show, setShow] = useState(false);
  const [direction, setDirection] = useState(1);
  const [hovered, setHovered] = useState<string | null>(null);
  const [pulse, setPulse] = useState(0);

  useEffect(() => {
    if (!isVisible) {
      setShow(false);
      setPulse(0);
      return;
    }
    if (introDelayMs <= 0) {
      setShow(true);
      return;
    }
    const timer = window.setTimeout(() => setShow(true), introDelayMs);
    return () => window.clearTimeout(timer);
  }, [isVisible, introDelayMs]);

  const index = CAROUSEL_PAGES.findIndex((p) => p.id === selected);
  const step = (by: number) => {
    onPlayClickSound?.();
    setDirection(by);
    onSelect(CAROUSEL_PAGES[(index + by + CAROUSEL_PAGES.length) % CAROUSEL_PAGES.length].id);
  };

  // Left / right keys step too, while the island view is showing
  useEffect(() => {
    if (!show) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target;
      if (
        target instanceof Element &&
        target.closest('input, textarea, select, [contenteditable="true"]')
      )
        return;
      if (e.key === 'ArrowLeft') step(-1);
      if (e.key === 'ArrowRight') step(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!anchor) return null;
  const page = CAROUSEL_PAGES[index];

  // No boxes or rings: the page name is a title in the accent colour
  // (white by day, yellow at night), with a soft dark halo so it reads over
  // the water, and the arrows are plain chevrons in the same colour
  const ink = isDarkMode ? '#ffd36b' : '#ffffff';
  const halo = isDarkMode
    ? '0 2px 0 rgba(5, 12, 26, 0.9), 0 0 16px rgba(5, 12, 26, 0.85)'
    : '0 2px 0 #0a2d57, 0 0 14px rgba(10, 45, 87, 0.85)';

  // Fixed sizes so the arrows never move when the page name changes
  const arrowSize = isMobile ? 44 : 52;
  const mainWidth = isMobile ? 170 : 230;
  const mainHeight = isMobile ? 48 : 64;
  const gap = isMobile ? 2 : 8;
  const total = arrowSize * 2 + mainWidth + gap * 2;
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  // Phones: centred, just above the row of four page buttons along the
  // bottom (the camera sits close to the dock there, so a spot measured
  // from the dock lands on the dock itself). Larger screens: a little way
  // below the dock, clear of the boat.
  const phoneRowTop =
    FOOTER_BOTTOM_PX +
    (deviceInfo?.orientation === 'portrait' ? 4 : 0) +
    Math.min(52, getButtonSize(deviceInfo)) +
    16;
  const placement: React.CSSProperties = isMobile
    ? {
        left: Math.max(8, (vw - total) / 2),
        bottom: `calc(${phoneRowTop}px + env(safe-area-inset-bottom))`,
      }
    : {
        left: Math.min(Math.max(anchor[0] - total / 2, 8), vw - total - 8),
        top: Math.min(Math.max(anchor[1] + 110, 56), vh - 120),
      };

  const arrowStyle = (key: string): React.CSSProperties => ({
    width: arrowSize,
    height: arrowSize,
    border: 'none',
    background: 'transparent',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: ink,
    fontSize: isMobile ? 22 : 26,
    filter: `drop-shadow(${isDarkMode ? '0 2px 3px rgba(5, 12, 26, 0.9)' : '0 2px 3px rgba(10, 45, 87, 0.9)'})`,
    transform: hovered === key ? 'scale(1.2)' : 'none',
    cursor: 'pointer',
    transition: 'transform 0.12s ease',
  });

  return (
    <AnimatePresence>
      {show && (
        <motion.nav
          key='page-carousel'
          aria-label='Choose a page'
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          style={{
            position: 'fixed',
            ...placement,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap,
            pointerEvents: 'auto',
          }}
        >
          <motion.button
            type='button'
            aria-label='Previous page'
            whileTap={{ scale: 0.85 }}
            onMouseEnter={() => setHovered('prev')}
            onMouseLeave={() => setHovered(null)}
            onClick={() => step(-1)}
            style={arrowStyle('prev')}
          >
            <FontAwesomeIcon icon={faChevronLeft} />
          </motion.button>

          <motion.button
            type='button'
            aria-label={`Open ${page.title}`}
            whileTap={{ scale: 0.96 }}
            onMouseEnter={() => setHovered('main')}
            onMouseLeave={() => setHovered(null)}
            onClick={() => {
              setPulse((n) => n + 1);
              onOpen(page.id);
            }}
            style={{
              position: 'relative',
              width: mainWidth,
              height: mainHeight,
              border: 'none',
              background: 'transparent',
              color: ink,
              cursor: 'pointer',
              transform: hovered === 'main' ? 'scale(1.06)' : 'none',
              transition: 'transform 0.12s ease',
            }}
          >
            <span
              style={{
                position: 'absolute',
                inset: 0,
                overflow: 'hidden',
              }}
            >
              <AnimatePresence initial={false} custom={direction} mode='popLayout'>
                <motion.span
                  key={page.id}
                  custom={direction}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: isMobile ? 8 : 12,
                    // Same face as the menu's page list
                    fontFamily: "'Baloo 2', sans-serif",
                    fontWeight: 800,
                    fontSize: isMobile ? 26 : 34,
                    letterSpacing: '-0.01em',
                    whiteSpace: 'nowrap',
                    textShadow: halo,
                  }}
                >
                  <FontAwesomeIcon
                    icon={page.icon}
                    style={{
                      fontSize: isMobile ? 20 : 26,
                      filter: `drop-shadow(${isDarkMode ? '0 2px 3px rgba(5, 12, 26, 0.9)' : '0 2px 3px rgba(10, 45, 87, 0.9)'})`,
                    }}
                  />
                  <span aria-hidden='true'>{page.title}</span>
                </motion.span>
              </AnimatePresence>
            </span>
            {/* A soft glow pulses out of the title when it is clicked */}
            {pulse > 0 && (
              <motion.span
                key={`pulse-${pulse}`}
                aria-hidden='true'
                initial={{ scale: 0.6, opacity: 0.7 }}
                animate={{ scale: 1.4, opacity: 0 }}
                transition={{ duration: 0.7, ease: 'easeOut' }}
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '50%',
                  background: `radial-gradient(closest-side, ${ink}88, transparent)`,
                  pointerEvents: 'none',
                }}
              />
            )}
          </motion.button>

          <motion.button
            type='button'
            aria-label='Next page'
            whileTap={{ scale: 0.85 }}
            onMouseEnter={() => setHovered('next')}
            onMouseLeave={() => setHovered(null)}
            onClick={() => step(1)}
            style={arrowStyle('next')}
          >
            <FontAwesomeIcon icon={faChevronRight} />
          </motion.button>
        </motion.nav>
      )}
    </AnimatePresence>
  );
}
