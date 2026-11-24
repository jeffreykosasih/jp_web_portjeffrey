import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DeviceInfo } from '../lib/types';

interface AppLoadingScreenProps {
  onExploreClick: () => void;
  isDarkMode: boolean;
  deviceInfo?: DeviceInfo;
  onPlayClickSound?: () => void;
}

// The button used to appear after 4.3s. Now it's about 1.7s, so a recruiter
// skimming several portfolios sees who this is and can start straight away.
const DOTS_DURATION = 800; // 0.8 seconds (faster loading)
const TITLE_DELAY = 300; // shortly after dots fade out
const BUTTON_DELAY = 600; // shortly after title appears
// The button fades and the title is wiped away (about 0.8s), then the tide
// (see Tide in main) takes over in the same blue
const TRANSITION_DURATION = 850;

// Three layers of waves rolling along the bottom of the welcome screen.
// Each path repeats every half width, so sliding it by 50% loops seamlessly.
// On the way out (`leaving`) the waves ebb away, sinking down one layer after
// another from the front.
function OpeningWaves({ isDarkMode, leaving = false }: { isDarkMode: boolean; leaving?: boolean }) {
  const layers = isDarkMode
    ? ['#1c2f55', '#22396a', '#2b467c']
    : ['#1a5fa6', '#2b77c0', '#3f91d8'];
  const wave =
    'M0,60 C120,22 240,22 360,60 C480,98 600,98 720,60 C840,22 960,22 1080,60 C1200,98 1320,98 1440,60 L1440,120 L0,120 Z';
  return (
    <div
      aria-hidden='true'
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: '30vh',
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    >
      {layers.map((color, i) => (
        <div
          key={color}
          className={leaving ? 'opening-wave-layer opening-wave-layer--out' : 'opening-wave-layer'}
          // the front (last) layer leaves first
          style={{ '--d': `${(layers.length - 1 - i) * 90}ms` } as React.CSSProperties}
        >
          <svg
            className={`opening-wave opening-wave-${i}`}
            viewBox='0 0 1440 120'
            preserveAspectRatio='none'
            style={{
              position: 'absolute',
              left: 0,
              bottom: 0,
              width: '200%',
              height: `${100 - i * 22}%`,
            }}
          >
            <path d={wave} fill={color} />
          </svg>
        </div>
      ))}
    </div>
  );
}

export default function AppLoadingScreen({
  onExploreClick,
  isDarkMode,
  deviceInfo,
  onPlayClickSound,
}: AppLoadingScreenProps): React.JSX.Element {
  const [showTitle, setShowTitle] = useState(false);
  const [showButton, setShowButton] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Theme colors
  const colors = {
    background: isDarkMode ? '#162542' : '#12508f',
    text: isDarkMode ? '#ffd36b' : '#ffffff',
    dots: isDarkMode ? '#ffd36b' : '#ffffff',
  };

  // Animation sequence
  useEffect(() => {
    // Show title after dots finish
    const titleTimer = setTimeout(() => {
      setShowTitle(true);
    }, DOTS_DURATION + TITLE_DELAY);

    // Show button after title
    const buttonTimer = setTimeout(() => {
      setShowButton(true);
    }, DOTS_DURATION + TITLE_DELAY + BUTTON_DELAY);

    return () => {
      clearTimeout(titleTimer);
      clearTimeout(buttonTimer);
    };
  }, []);

  // Background color effect
  useEffect(() => {
    document.body.style.backgroundColor = colors.background;
    document.documentElement.style.backgroundColor = colors.background;

    return () => {
      setTimeout(() => {
        document.body.style.backgroundColor = '';
        document.documentElement.style.backgroundColor = '';
      }, 1000);
    };
  }, [colors.background]);

  const handleExploreClick = () => {
    onPlayClickSound?.(); // Play click sound
    setIsTransitioning(true);

    // Start the transition sequence
    setTimeout(() => {
      onExploreClick();
    }, TRANSITION_DURATION);
  };

  // Container styles
  const containerStyles: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: colors.background,
    zIndex: 9999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const contentStyles: React.CSSProperties = {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    width: '100%',
    height: '100%',
  };

  // Responsive title styles based on device type
  const titleStyles: React.CSSProperties = React.useMemo(() => {
    const baseStyles: React.CSSProperties = {
      // Display voice: the joined-up script (see .type-display)
      fontFamily: "'Playwrite AU NSW', 'Baloo 2', cursive",
      fontWeight: 400,
      letterSpacing: '0.005em',
      lineHeight: 1.1,
      color: colors.text,
      textAlign: 'center',
    };

    // Device-specific font sizes
    if (deviceInfo?.isMobile) {
      return {
        ...baseStyles,
        fontSize: '2.9rem',
      };
    } else if (deviceInfo?.isLandscapeMobile) {
      return {
        ...baseStyles,
        fontSize: '3rem',
      };
    } else if (deviceInfo?.isTablet) {
      return {
        ...baseStyles,
        fontSize: deviceInfo.orientation === 'landscape' ? '3.5rem' : '4rem',
      };
    } else {
      // Desktop and larger screens
      return {
        ...baseStyles,
        fontSize: '7rem', // Original desktop size
      };
    }
  }, [colors.text, deviceInfo]);

  // Responsive button styles based on device type
  const buttonStyles: React.CSSProperties = React.useMemo(() => {
    const baseStyles: React.CSSProperties = {
      fontFamily: "'Baloo 2', sans-serif",
      lineHeight: 1.2,
      fontWeight: 600,
      borderRadius: 'var(--radius-full)',
      backgroundColor: isDarkMode ? colors.text : '#ffffff',
      color: isDarkMode ? '#162542' : '#12508f',
      border: 'none',
      boxShadow: isDarkMode
        ? '0 0.5rem 1.25rem rgba(232, 230, 130, 0.3)'
        : '0 0.5rem 1.25rem rgba(0, 0, 0, 0.1)',
      transition: 'all 0.3s ease',
      cursor: 'pointer',
    };

    // Device-specific button sizing
    if (deviceInfo?.isMobile) {
      return {
        ...baseStyles,
        fontSize: 'var(--mobile-text-lg)',
        padding: 'var(--space-md) var(--space-xl)',
        minHeight: 'var(--touch-target-sm)',
      };
    } else if (deviceInfo?.isLandscapeMobile) {
      return {
        ...baseStyles,
        fontSize: 'var(--mobile-text-lg)',
        padding: 'var(--space-md) var(--space-xl)',
        minHeight: 'var(--touch-target-sm)',
      };
    } else if (deviceInfo?.isTablet) {
      return {
        ...baseStyles,
        fontSize: 'var(--text-lg)',
        padding: 'var(--space-lg) var(--space-2xl)',
        minHeight: 'var(--touch-target-md)',
      };
    } else {
      // Desktop and larger screens
      return {
        ...baseStyles,
        fontSize: 'var(--text-2xl)',
        padding: 'calc(var(--space-md) + 0.125rem) var(--space-2xl)',
        minHeight: 'var(--touch-target-lg)',
      };
    }
  }, [isDarkMode, colors.text, deviceInfo]);

  const handleButtonMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.transform = 'translateY(-0.125rem)'; // Converted to rem
    e.currentTarget.style.backgroundColor = isDarkMode ? '#f0f0a0' : '#f0f0f0'; // Lighter yellow/gray on hover
  };

  const handleButtonMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.transform = 'translateY(0)';
    e.currentTarget.style.backgroundColor = isDarkMode
      ? colors.text
      : '#ffffff'; // Back to original colors
  };

  const handleButtonMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.transform = 'translateY(0.0625rem)'; // Converted to rem
  };

  const handleButtonMouseUp = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.transform = 'translateY(-0.125rem)'; // Converted to rem
  };

  // Jumping dots animation variants
  const dotsContainer = {
    initial: { opacity: 1 },
    animate: { opacity: 1 },
    exit: {
      opacity: 0,
      transition: { duration: 0.5, ease: 'easeOut' },
    },
  };

  // Transition overlay variants

  return (
    <div style={containerStyles}>
      <OpeningWaves isDarkMode={isDarkMode} leaving={isTransitioning} />
      <div style={{ ...contentStyles, zIndex: 1 }}>
        {/* Main Content Area */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: deviceInfo?.isMobile
              ? 'var(--space-2xl)'
              : deviceInfo?.isLandscapeMobile
              ? '3.5rem'
              : deviceInfo?.isTablet
              ? 'var(--space-3xl)'
              : 'var(--space-4xl)',
            width: '100%',
            maxWidth: deviceInfo?.isMobile
              ? '90%'
              : deviceInfo?.isTablet
              ? '80%'
              : '100%',
          }}
        >
          {/* Dots or Title Area */}
          <div
            style={{
              height: deviceInfo?.isMobile
                ? '12rem'
                : deviceInfo?.isLandscapeMobile
                ? '4rem' // Much smaller title area for landscape mobile
                : deviceInfo?.isTablet
                ? '15rem'
                : '17.5rem', // Responsive height based on device
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* Jumping Dots Loading */}
            <AnimatePresence mode='wait'>
              {!showTitle && (
                <motion.div
                  key='dots'
                  variants={dotsContainer}
                  initial='initial'
                  animate='animate'
                  exit='exit'
                  style={{
                    display: 'flex',
                    gap:
                      deviceInfo?.isMobile || deviceInfo?.isLandscapeMobile
                        ? 'var(--space-sm)'
                        : 'var(--space-md)', // Responsive gap for dots
                  }}
                >
                  {[0, 1, 2].map((index) => (
                    <motion.div
                      key={index}
                      initial={{ y: 0 }}
                      animate={{
                        y: [0, -30, 0],
                      }}
                      style={{
                        width:
                          deviceInfo?.isMobile || deviceInfo?.isLandscapeMobile
                            ? 'var(--space-base)'
                            : 'var(--space-lg)', // Responsive dot size
                        height:
                          deviceInfo?.isMobile || deviceInfo?.isLandscapeMobile
                            ? 'var(--space-base)'
                            : 'var(--space-lg)', // Responsive dot size
                        borderRadius: '50%',
                        backgroundColor: colors.dots,
                      }}
                      transition={{
                        duration: 0.8,
                        repeat: Infinity,
                        repeatType: 'reverse',
                        ease: 'easeInOut',
                        delay: index * 0.2,
                      }}
                    />
                  ))}
                </motion.div>
              )}

              {/* Title */}
              {showTitle && (
                // The lead-in drifts up and the name is written on; on the
                // way out the lead-in drifts off and the name is wiped away
                <motion.h1
                  key='title'
                  aria-label='Welcome to Port Jeffrey'
                  style={{ ...titleStyles, margin: 0 }}
                  exit={{ opacity: 0, transition: { duration: 0.3 } }}
                >
                  <span
                    aria-hidden='true'
                    className='type-aside'
                    style={{
                      display: 'block',
                      overflow: 'hidden',
                      paddingBottom: '0.1em',
                      fontSize: '0.42em',
                      lineHeight: 1.15,
                      marginBottom:
                        deviceInfo?.isMobile || deviceInfo?.isLandscapeMobile
                          ? 'var(--space-xs)'
                          : 'var(--space-sm)',
                    }}
                  >
                    <span
                      className={isTransitioning ? 'drift-out' : 'drift-in'}
                      style={{ display: 'block' }}
                    >
                      Welcome to
                    </span>
                  </span>
                  {/* Joined-up school handwriting; it is written on from left
                      to right, as if by hand (split into letters it would
                      lose the joins between them) */}
                  <span
                    aria-hidden='true'
                    className={isTransitioning ? 'write-off' : 'write-on'}
                    style={{
                      display: 'block',
                      fontFamily: "'Playwrite AU NSW', 'Baloo 2', cursive",
                      fontWeight: 400,
                      fontSize: '0.95em',
                      letterSpacing: 0,
                      lineHeight: 1.6,
                      paddingInline: '0.15em',
                    }}
                  >
                    Port Jeffrey
                  </span>
                </motion.h1>
              )}
            </AnimatePresence>
          </div>

          {/* Button Area */}
          <div
            style={{
              minHeight: deviceInfo?.isMobile
                ? 'var(--space-4xl)'
                : deviceInfo?.isLandscapeMobile
                ? '2rem' // Much smaller button area for landscape mobile
                : deviceInfo?.isTablet
                ? 'var(--space-5xl)'
                : 'var(--space-6xl)', // Responsive height based on device
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <AnimatePresence>
              {showButton && !isTransitioning && (
                <motion.div
                  key='button'
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{
                    opacity: 0,
                    y: -20,
                    transition: { duration: 0.4, ease: 'easeInOut' },
                  }}
                  transition={{
                    duration: 1.0,
                    ease: [0.25, 0.46, 0.45, 0.94],
                    type: 'spring',
                    damping: 30,
                    stiffness: 90,
                  }}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: deviceInfo?.isLandscapeMobile
                      ? 'var(--space-xs)'
                      : 'var(--space-md)',
                  }}
                >
                  <button
                    onClick={handleExploreClick}
                    style={buttonStyles}
                    onMouseEnter={handleButtonMouseEnter}
                    onMouseLeave={handleButtonMouseLeave}
                    onMouseDown={handleButtonMouseDown}
                    onMouseUp={handleButtonMouseUp}
                  >
                    Let's explore
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

    </div>
  );
}
