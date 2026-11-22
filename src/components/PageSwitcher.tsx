import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUser,
  faCogs,
  faBriefcase,
  faEnvelope,
} from '@fortawesome/free-solid-svg-icons';
import { DeviceInfo } from '../lib/types';
import { getButtonSize, ColorSchemes } from '../lib/responsiveUtils';
import {
  getDockedStyles,
  getPhoneFooter,
  FOOTER_BOTTOM_PX,
  type ButtonDock,
} from '../lib/buttonUtils';

export type SubPage = 'profile' | 'skillset' | 'portfolio' | 'connect';

// Profile first, then the landmarks in the order they stand on the island
// from left to right: house (Projects), desk (Skillset), chairs (Connect)
const PAGES: { id: SubPage; label: string; icon: typeof faUser }[] = [
  { id: 'profile', label: 'Profile', icon: faUser },
  { id: 'portfolio', label: 'Projects', icon: faBriefcase },
  { id: 'skillset', label: 'Skillset', icon: faCogs },
  { id: 'connect', label: 'Connect', icon: faEnvelope },
];

// Space between the corner buttons (credits, sound, theme) and this group
const GROUP_GAP_PX = 20;

// Ring colour for the open page and the click pulse: warm yellow at night,
// white by day
export const ringColor = (isDarkMode: boolean) => (isDarkMode ? '#ffd36b' : '#ffffff');

// Four round page buttons that sit beside the corner buttons while a page
// is open, in the same style, so visitors can jump between pages without
// going back to the island. The open page's button is filled white.
export default function PageDock({
  activePage,
  freeSide,
  isDarkMode,
  deviceInfo,
  onOpen,
}: {
  activePage: SubPage | null;
  freeSide: 'left' | 'right' | null;
  isDarkMode: boolean;
  deviceInfo?: DeviceInfo;
  onOpen: (page: SubPage) => void;
}) {
  const [hovered, setHovered] = React.useState<SubPage | null>(null);
  if (!freeSide) return null;

  const size = getButtonSize(deviceInfo);
  const brand = isDarkMode ? ColorSchemes.primary.dark : ColorSchemes.primary.light;
  const portraitPhone =
    !!deviceInfo?.isMobile && deviceInfo?.orientation === 'portrait';
  const landscapePhone =
    !!deviceInfo?.isLandscapeMobile ||
    (!!deviceInfo?.isMobile && deviceInfo?.orientation === 'landscape');

  // Counted from the screen edge inward (or up the stack on phones), after
  // the three corner buttons. Order is chosen so the group always reads
  // Profile, Projects, Skillset, Connect from left to right / top to bottom.
  const reversed = portraitPhone || freeSide === 'right';
  const ordered = reversed ? [...PAGES].reverse() : PAGES;

  return (
    <nav aria-label='Pages'>
      <AnimatePresence>
        {ordered.map((page, i) => {
          const active = page.id === activePage;
          const lit = active || hovered === page.id;
          // Landscape phones are short and narrow: the pages get their own
          // row above the corner buttons instead of sharing it
          // Footer slot on portrait phones: reading order, Profile first
          const slot = PAGES.findIndex((p) => p.id === page.id);
          const dock: ButtonDock = landscapePhone
            ? { side: freeSide, index: reversed ? 3 - i : i, row: 1 }
            : { side: freeSide, index: 3 + i, extra: GROUP_GAP_PX, slot };
          return (
            <motion.button
              key={page.id}
              type='button'
              aria-label={page.label}
              aria-current={active ? 'page' : undefined}
              title={page.label}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2, delay: 0.3 + i * 0.04 }}
              onMouseEnter={() => setHovered(page.id)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => !active && onOpen(page.id)}
              whileTap={active ? undefined : { scale: 0.88 }}
              className='touch-target'
              style={{
                position: 'fixed',
                width: size,
                height: size,
                borderRadius: '50%',
                border: 'none',
                // Same look as the corner buttons; the open page is filled
                // with the accent (white by day, yellow at night)
                backgroundColor: lit ? ringColor(isDarkMode) : brand,
                color: lit ? brand : ringColor(isDarkMode),
                // Thick ring marks the open page
                boxShadow: active ? `0 0 0 4px ${ringColor(isDarkMode)}` : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: Math.round((portraitPhone ? 38 : size) * 0.38),
                cursor: active ? 'default' : 'pointer',
                transition: 'background-color 0.15s ease, color 0.15s ease',
                ...getDockedStyles(deviceInfo, dock),
              }}
            >
              {/* A ring pulses outward when this page becomes the open one */}
              {active && (
                <motion.span
                  key={`pulse-${activePage}`}
                  aria-hidden='true'
                  initial={{ scale: 1, opacity: 0.9 }}
                  animate={{ scale: 1.9, opacity: 0 }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: '50%',
                    border: `4px solid ${ringColor(isDarkMode)}`,
                    pointerEvents: 'none',
                  }}
                />
              )}
              <FontAwesomeIcon icon={page.icon} />
            </motion.button>
          );
        })}
      </AnimatePresence>
    </nav>
  );
}

// Portrait phones: a band at the bottom of the open drawer for the row of
// buttons, in a deeper shade than the panel with a light top line, so the
// buttons never sit on top of scrolling content
export function PhoneButtonBand({
  freeSide,
  isDarkMode,
  deviceInfo,
}: {
  freeSide: 'left' | 'right' | null;
  isDarkMode: boolean;
  deviceInfo?: DeviceInfo;
}) {
  const portraitPhone =
    !!deviceInfo?.isMobile && deviceInfo?.orientation === 'portrait';
  return (
    <AnimatePresence>
      {freeSide && portraitPhone && (
        <motion.div
          key='phone-button-band'
          aria-hidden='true'
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, delay: 0.25 }}
          style={{
            position: 'fixed',
            left: getPhoneFooter(freeSide).drawerLeft,
            width: getPhoneFooter(freeSide).drawerWidth,
            bottom: 0,
            height: `calc(${getPhoneFooter(freeSide).size + FOOTER_BOTTOM_PX * 2}px + env(safe-area-inset-bottom))`,
            zIndex: 1505, // above the drawer, below its buttons
            backgroundColor: isDarkMode ? '#0a1222' : '#082a52',
            borderTop: `1px solid ${isDarkMode ? 'rgba(255, 211, 107, 0.35)' : 'rgba(255, 255, 255, 0.3)'}`,
            boxShadow: '0 -0.5rem 1rem rgba(0, 0, 0, 0.18)',
            pointerEvents: 'none',
          }}
        />
      )}
    </AnimatePresence>
  );
}
