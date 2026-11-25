import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faChevronRight, faXmark } from '@fortawesome/free-solid-svg-icons';
import { DeviceInfo } from '../lib/types';
import { ResponsiveValues } from '../lib/responsiveUtils';
import { WriteOn, joinsAt } from './Letters';

// Every page opens as a drawer from one side, so the landmark the camera
// zoomed to stays in view on the other. A tab on the drawer's edge closes it.

interface SideDrawerProps {
  isVisible: boolean;
  onClose: () => void;
  isDarkMode: boolean;
  deviceInfo?: DeviceInfo;
  label: string; // accessible name, e.g. "Skills"
  onPlayClickSound?: () => void;
  /** 'top' keeps the header still when the content below changes height. */
  align?: 'center' | 'top';
  /** Which edge the drawer slides in from. */
  side?: 'left' | 'right';
  /** Styles for the scrolling content area (padding, layout). */
  contentStyle?: React.CSSProperties;
  children: React.ReactNode;
}

export type DrawerDevice =
  | 'mobile-landscape'
  | 'mobile-portrait'
  | 'tablet'
  | 'desktop';

export function getDrawerDevice(deviceInfo?: DeviceInfo): DrawerDevice {
  if (!deviceInfo) return 'desktop';
  if (
    deviceInfo.isLandscapeMobile ||
    (deviceInfo.isMobile && deviceInfo.orientation === 'landscape')
  ) {
    return 'mobile-landscape';
  }
  if (deviceInfo.isMobile) return 'mobile-portrait';
  if (deviceInfo.isTablet) return 'tablet';
  return 'desktop';
}

// Half the screen on larger screens. Portrait phones get a full-screen sheet
// closed from an X in the corner; other sizes keep a free side with the
// landmark in it and a close tab on the drawer's edge.
const DRAWER_WIDTH: Record<DrawerDevice, string> = {
  'mobile-landscape': '58vw',
  'mobile-portrait': '100vw',
  tablet: 'var(--drawer-tablet-width)',
  desktop: '50vw', // an exact half: the camera centres the landmark in the other half
};

// Same breathing room in every drawer. Phones clear the notch and the
// menu button at the top.
const DRAWER_PADDING: Record<DrawerDevice, string> = {
  'mobile-landscape':
    'max(env(safe-area-inset-top), 1rem) 1.25rem max(env(safe-area-inset-bottom), 1rem)',
  // bottom: room for the band of buttons along the bottom of the drawer
  'mobile-portrait':
    'max(env(safe-area-inset-top), 4.5rem) 1.25rem calc(5.5rem + env(safe-area-inset-bottom))',
  tablet: '4.5rem 2.5rem 3rem',
  desktop: '4.5rem 3rem 3rem',
};

// True while switching pages under a fade: the drawer appears and leaves
// in place instead of sliding
export const DrawerInstantContext = React.createContext(false);

// Text and accent colours for everything inside a drawer, as CSS variables:
// bright mode is blue and white, dark mode is navy and yellow
export const DRAWER_INK = {
  light: { ink: '#ffffff', muted: '#dbe7ec', accent: '#ffffff', line: 'rgba(255, 255, 255, 0.7)' },
  dark: { ink: '#fff1cc', muted: '#ecdcae', accent: '#ffd36b', line: 'rgba(255, 211, 107, 0.75)' },
};

// Deep, solid panels: white text stays above 7:1 (WCAG AAA), and with no
// backdrop blur a see-through panel would show the island behind it
export const DRAWER_COLORS = {
  light: { panel: '#0b3a73', tab: '#0b3a73' },
  dark: { panel: '#101c34', tab: '#101c34' },
};

// One title style for every drawer
export function DrawerTitle({
  title,
  subtitle,
  deviceInfo,
}: {
  title: string;
  subtitle?: string;
  deviceInfo?: DeviceInfo;
}) {
  const device = getDrawerDevice(deviceInfo);
  const compact = device === 'mobile-landscape';
  return (
    <header style={{ textAlign: 'center', marginBottom: compact ? '1rem' : '1.75rem' }}>
      {/* Display voice; written on each time the page opens */}
      <h1
        aria-label={title}
        className='type-display'
        style={{
          margin: 0,
          letterSpacing: '-0.02em',
          lineHeight: 1.05,
          color: 'var(--ui-accent)',
          fontSize: compact
            ? '1.75rem'
            : device === 'mobile-portrait'
            ? '2.75rem'
            : '3.5rem',
        }}
      >
        <WriteOn text={title} startMs={200} durationMs={900} />
      </h1>
      {subtitle && (
        // Aside voice: the serif, fading up after the title
        <p
          className='type-aside drift-in'
          style={{
            ...joinsAt(500),
            margin: '0.5rem 0 0',
            fontSize: compact ? '1.1rem' : '1.3rem',
            lineHeight: 1.35,
            color: 'var(--ui-ink-muted)',
          }}
        >
          {subtitle}
        </p>
      )}
    </header>
  );
}

export default function SideDrawer({
  isVisible,
  onClose,
  isDarkMode,
  deviceInfo,
  label,
  onPlayClickSound,
  contentStyle,
  children,
  side = 'right', // every page opens on the right
  align = 'center',
}: SideDrawerProps) {
  const isLeft = side === 'left';
  const offscreen = isLeft ? '-100%' : '100%';
  const instant = React.useContext(DrawerInstantContext);
  const device = getDrawerDevice(deviceInfo);
  const { panel, tab } = isDarkMode ? DRAWER_COLORS.dark : DRAWER_COLORS.light;
  const ink = isDarkMode ? DRAWER_INK.dark : DRAWER_INK.light;
  const inkVars = {
    '--ui-ink': ink.ink,
    '--ui-ink-muted': ink.muted,
    '--ui-accent': ink.accent,
    '--ui-on-accent': isDarkMode ? '#101c34' : '#0b3a73',
    '--ui-line': ink.line,
  } as React.CSSProperties;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.aside
          key={`${label}-drawer`}
          aria-label={label}
          initial={instant ? { x: 0 } : { x: offscreen }}
          animate={{ x: 0 }}
          exit={instant ? { opacity: 0, transition: { duration: 0 } } : { x: offscreen }}
          transition={{ type: 'tween', duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          style={{
            position: 'fixed',
            top: 0,
            [isLeft ? 'left' : 'right']: 0,
            height: '100dvh',
            width: DRAWER_WIDTH[device],
            zIndex: ResponsiveValues.zIndex.overlay,
            backgroundColor: panel,
            // No backdrop blur: the panel is near-opaque, and blurring the
            // ever-moving 3D scene behind it costs a lot on phones
            boxShadow: `${isLeft ? '' : '-'}0.5rem 0 2rem rgba(0, 0, 0, 0.25)`,
            ...inkVars,
            color: 'var(--ui-ink)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Close: an X in the top corner on portrait phones (the sheet fills
              the screen), otherwise a tab centred on the drawer's outer edge */}
          {device === 'mobile-portrait' ? (
            <motion.button
              type='button'
              onClick={() => {
                onPlayClickSound?.();
                onClose();
              }}
              aria-label={`Close ${label.toLowerCase()}`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25, delay: 0.35 }}
              whileTap={{ scale: 0.9 }}
              style={{
                position: 'absolute',
                top: 'max(env(safe-area-inset-top), 0.85rem)',
                right: '0.85rem',
                zIndex: 2,
                width: '2.75rem',
                height: '2.75rem',
                borderRadius: '50%',
                border: 'none',
                backgroundColor: tab,
                color: 'var(--ui-accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 0.375rem 1rem rgba(0, 0, 0, 0.25)',
              }}
            >
              <FontAwesomeIcon icon={faXmark} style={{ fontSize: '20px' }} />
            </motion.button>
          ) : (
          <motion.button
            type='button'
            onClick={() => {
              onPlayClickSound?.();
              onClose();
            }}
            aria-label={`Close ${label.toLowerCase()}`}
            initial={{ opacity: 0, x: isLeft ? -8 : 8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.45 }}
            whileHover={{ x: isLeft ? -3 : 3 }}
            style={{
              position: 'absolute',
              top: '50%',
              [isLeft ? 'left' : 'right']: '100%',
              marginTop: '-2.5rem',
              width: '2.5rem',
              height: '5rem',
              border: 'none',
              borderRadius: isLeft
                ? '0 var(--radius-lg) var(--radius-lg) 0'
                : 'var(--radius-lg) 0 0 var(--radius-lg)',
              backgroundColor: tab,
              color: 'var(--ui-accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: `${isLeft ? '' : '-'}0.375rem 0 1rem rgba(0, 0, 0, 0.2)`,
            }}
          >
            <FontAwesomeIcon
              icon={isLeft ? faChevronLeft : faChevronRight}
              style={{ fontSize: '18px' }}
            />
          </motion.button>
          )}

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: DRAWER_PADDING[device],
              ...contentStyle,
              // The drawer owns position, size and scrolling
              position: 'relative',
              width: '100%',
              flex: 1,
              minHeight: 0,
              overflowY: 'auto',
              boxSizing: 'border-box',
            }}
          >
            {/* Centred (or top-aligned) when short, scrolls when tall */}
            <div
              style={{
                margin: align === 'top' ? '0 0 auto' : 'auto 0',
                width: '100%',
                maxWidth: '40rem',
              }}
            >
              {children}
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
