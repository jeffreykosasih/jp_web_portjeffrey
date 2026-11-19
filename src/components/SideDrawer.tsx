import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { DeviceInfo } from '../lib/types';
import { ResponsiveValues } from '../lib/responsiveUtils';
import PageSwitcher from './PageSwitcher';

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

// Half the screen on larger screens; phones keep a strip free for the
// close tab and a glimpse of the landmark
const DRAWER_WIDTH: Record<DrawerDevice, string> = {
  'mobile-landscape': '58vw',
  'mobile-portrait': 'calc(100vw - 3.25rem)',
  tablet: 'var(--drawer-tablet-width)',
  desktop: '50vw', // an exact half: the camera centres the landmark in the other half
};

// Same breathing room in every drawer. Phones clear the notch and the
// menu button at the top.
const DRAWER_PADDING: Record<DrawerDevice, string> = {
  'mobile-landscape':
    'max(env(safe-area-inset-top), 1rem) 1.25rem max(env(safe-area-inset-bottom), 1rem)',
  'mobile-portrait':
    'max(env(safe-area-inset-top), 4.5rem) 1.25rem max(env(safe-area-inset-bottom), 2rem)',
  tablet: '4.5rem 2.5rem 3rem',
  desktop: '4.5rem 3rem 3rem',
};

// Deep, near-opaque panels so white text stays above 7:1 (WCAG AAA)
// whatever bright scene is behind it
export const DRAWER_COLORS = {
  light: { panel: 'rgba(0, 68, 94, 0.95)', tab: '#00445e' },
  dark: { panel: 'rgba(16, 28, 52, 0.95)', tab: '#101c34' },
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
      <h1
        style={{
          margin: 0,
          fontFamily: 'Lato, sans-serif',
          fontWeight: 900,
          letterSpacing: '-0.02em',
          lineHeight: 1.1,
          color: '#ffffff',
          fontSize: compact
            ? '1.75rem'
            : device === 'mobile-portrait'
            ? '2.25rem'
            : '2.75rem',
        }}
      >
        {title}
      </h1>
      {subtitle && (
        <p
          style={{
            margin: '0.5rem 0 0',
            fontFamily: 'Lato, sans-serif',
            fontSize: compact ? '0.9rem' : '1rem',
            lineHeight: 1.5,
            color: '#e8f1f5',
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
  side = 'left',
  align = 'center',
}: SideDrawerProps) {
  const isLeft = side === 'left';
  const offscreen = isLeft ? '-100%' : '100%';
  const device = getDrawerDevice(deviceInfo);
  const { panel, tab } = isDarkMode ? DRAWER_COLORS.dark : DRAWER_COLORS.light;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.aside
          key={`${label}-drawer`}
          aria-label={label}
          initial={{ x: offscreen }}
          animate={{ x: 0 }}
          exit={{ x: offscreen }}
          transition={{ type: 'tween', duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          style={{
            position: 'fixed',
            top: 0,
            [isLeft ? 'left' : 'right']: 0,
            height: '100dvh',
            width: DRAWER_WIDTH[device],
            zIndex: ResponsiveValues.zIndex.overlay,
            backgroundColor: panel,
            backdropFilter: 'blur(0.75rem)',
            WebkitBackdropFilter: 'blur(0.75rem)',
            boxShadow: `${isLeft ? '' : '-'}0.5rem 0 2rem rgba(0, 0, 0, 0.25)`,
            color: '#ffffff',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Close tab, centred on the drawer's outer edge */}
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
              color: '#ffffff',
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
          {/* Jump to another page without going back to the island */}
          <div
            style={{
              flex: 'none',
              padding:
                device === 'mobile-landscape'
                  ? '0.5rem 1rem max(env(safe-area-inset-bottom), 0.5rem)'
                  : '0.9rem 1rem max(env(safe-area-inset-bottom), 1.1rem)',
              borderTop: '1px solid rgba(255, 255, 255, 0.18)',
            }}
          >
            <PageSwitcher isDarkMode={isDarkMode} />
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
