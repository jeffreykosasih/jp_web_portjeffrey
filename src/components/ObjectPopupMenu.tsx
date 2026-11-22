import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faEnvelope,
  faBriefcase,
  faUser,
  faCogs,
} from '@fortawesome/free-solid-svg-icons';

type ObjectType = 'twochairs' | 'house' | 'stonehead' | 'surfboard';
type PageName = 'profile' | 'skillset' | 'portfolio' | 'connect';

interface ObjectPopupMenuProps {
  isDarkMode: boolean;
  deviceInfo?: any;
  objectPositions: Partial<Record<ObjectType, [number, number]>>;
  onNavigate?: (page: PageName) => void;
  onHoverObject?: (objectType: ObjectType | null) => void;
  isVisible?: boolean;
  introDelayMs?: number;
  /** Object hovered in the 3D scene, so its label lights up too */
  highlightedObject?: string | null;
}

const getObjectConfig = (
  objectType: ObjectType,
  isDarkMode: boolean,
  isMobile: boolean
) => {
  const configs = {
    twochairs: {
      title: 'Connect',
      page: 'connect' as PageName,
      icon: faEnvelope,
      row: 'back' as const,
    },
    house: {
      title: 'Projects',
      page: 'portfolio' as PageName,
      icon: faBriefcase,
      row: 'back' as const,
    },
    stonehead: {
      title: 'Profile',
      page: 'profile' as PageName,
      icon: faUser,
      row: 'front' as const,
    },
    surfboard: {
      title: 'Skillset',
      page: 'skillset' as PageName,
      icon: faCogs,
      row: 'back' as const,
    },
  };

  const theme = isDarkMode
    ? {
        baseBackground: '#162542', // same navy as the corner buttons
        hoverBackground: '#ffd36b', // night accent: navy and yellow
        textColor: '#ffd36b',
        hoverTextColor: '#162542',
        shadowColor: 'rgba(3, 10, 22, 0.45)',
      }
    : {
        baseBackground: 'rgba(11, 58, 115, 0.95)', // 9:1 with white text
        hoverBackground: '#ffffff',
        textColor: '#ffffff',
        hoverTextColor: '#12508f',
        shadowColor: 'rgba(18, 80, 143, 0.18)',
      };

  return {
    ...configs[objectType],
    ...theme,
  };
};

const ObjectPopupMenu: React.FC<ObjectPopupMenuProps> = ({
  isDarkMode,
  deviceInfo,
  objectPositions,
  onNavigate,
  onHoverObject,
  isVisible = true,
  introDelayMs = 0,
  highlightedObject = null,
}) => {
  const isMobile = deviceInfo?.isMobile || deviceInfo?.isLandscapeMobile;
  const [hoveredButton, setHoveredButton] = useState<ObjectType | null>(null);
  // Bumped on click so the ring pulse replays
  const [pulse, setPulse] = useState<Record<string, number>>({});
  const [shouldRenderButtons, setShouldRenderButtons] = useState(false);
  const buttonOrder: ObjectType[] = ['stonehead', 'house', 'surfboard', 'twochairs'];

  useEffect(() => {
    if (!isVisible) {
      setHoveredButton(null);
      setPulse({}); // labels come back clean, without a ring
      onHoverObject?.(null);
      setShouldRenderButtons(false);
      return;
    }

    if (introDelayMs <= 0) {
      setShouldRenderButtons(true);
      return;
    }

    const timer = window.setTimeout(() => {
      setShouldRenderButtons(true);
    }, introDelayMs);

    return () => window.clearTimeout(timer);
  }, [introDelayMs, isVisible, onHoverObject]);

  return (
    <AnimatePresence>
      {shouldRenderButtons &&
        buttonOrder.map((objectType, index) => {
          const objectPosition = objectPositions[objectType];
          if (!objectPosition) return null;

          const config = getObjectConfig(objectType, isDarkMode, isMobile);
          // Keep every label fully on screen (estimated label width)
          const estWidth = config.title.length * (isMobile ? 8.5 : 10) + (isMobile ? 58 : 76);
          const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1280;
          // Each label is centred on its landmark: back-row labels sit just
          // above the object, front-row labels just below it, so each side of
          // the island reads as one tidy column. Labels always stay on screen.
          const labelHeight = isMobile ? 40 : 54;
          const left = Math.min(
            Math.max(objectPosition[0] - estWidth / 2, 8),
            viewportWidth - estWidth - 8
          );
          const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 800;
          const top = Math.min(
            Math.max(
              config.row === 'back'
                ? objectPosition[1] - labelHeight - 10
                : objectPosition[1] + 10,
              56
            ),
            viewportHeight - 110
          );
          // Lit when the label or its 3D object is hovered
          const isHovered =
            hoveredButton === objectType || highlightedObject === objectType;

          return (
            <motion.button
              key={objectType}
              type='button'
              aria-label={`Open ${config.title}`}
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{
                opacity: 1,
                scale: isHovered ? 1.07 : 1,
                y: isHovered ? -4 : 0,
              }}
              exit={{ opacity: 0, scale: 0.97, y: 8 }}
              transition={{
                duration: shouldRenderButtons ? 0.22 : 0.16,
                delay: index * 0.03,
                ease: [0.22, 1, 0.36, 1],
              }}
              whileTap={{ scale: 0.98 }}
              onMouseEnter={() => {
                setHoveredButton(objectType);
                onHoverObject?.(objectType);
              }}
              onMouseLeave={() => {
                setHoveredButton(null);
                onHoverObject?.(null);
              }}
              onClick={() => {
                setPulse((n) => ({ ...n, [objectType]: (n[objectType] ?? 0) + 1 }));
                onNavigate?.(config.page);
              }}
              style={{
                position: 'fixed',
                left,
                top,
                zIndex: 9999,
                display: 'flex',
                alignItems: 'center',
                gap: isMobile ? '8px' : '12px',
                minWidth: 'fit-content',
                padding: isMobile ? '10px 14px' : '16px 22px',
                borderRadius: '16px',
                border: 'none',
                background: isHovered
                  ? config.hoverBackground
                  : config.baseBackground,
                color: isHovered ? config.hoverTextColor : config.textColor,
                // Thick ring on hover: warm yellow at night, white by day
                boxShadow: isHovered
                  ? `0 0 0 4px ${isDarkMode ? '#ffd36b' : '#ffffff'}, 0 14px 32px ${config.shadowColor}`
                  : `0 10px 28px ${config.shadowColor}`,
                backdropFilter: 'blur(12px)',
                cursor: 'pointer',
                pointerEvents: 'auto',
                transition:
                  'background-color 0.12s ease, color 0.12s ease, box-shadow 0.12s ease, transform 0.12s ease',
              }}
            >
              {/* Ring pulse on click only */}
              {(pulse[objectType] ?? 0) > 0 && (
              <motion.span
                key={`pulse-${objectType}-${pulse[objectType] ?? 0}`}
                aria-hidden='true'
                initial={{ scale: 1, opacity: 0.9 }}
                animate={{ scale: 1.25, opacity: 0 }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '16px',
                  border: `4px solid ${isDarkMode ? '#ffd36b' : '#ffffff'}`,
                  pointerEvents: 'none',
                }}
              />
              )}
              <FontAwesomeIcon
                icon={config.icon}
                style={{
                  color: isHovered ? config.hoverTextColor : config.textColor,
                  fontSize: isMobile ? '15px' : '20px',
                  filter: isDarkMode
                    ? 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.28))'
                    : 'none',
                }}
              />

              <span
                style={{
                  margin: 0,
                  fontFamily: 'Lato, sans-serif',
                  fontWeight: 700,
                  fontSize: isMobile ? '15px' : '18px',
                  lineHeight: '1.2',
                  whiteSpace: 'nowrap',
                }}
              >
                {config.title}
              </span>
            </motion.button>
          );
        })}
    </AnimatePresence>
  );
};

export default ObjectPopupMenu;
