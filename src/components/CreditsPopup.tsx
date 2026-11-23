import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DeviceInfo } from '../lib/types';
import { LINKS, PROFILE } from '../lib/profile';

interface CreditsPopupProps {
  isVisible: boolean;
  onClose: () => void;
  isDarkMode: boolean;
  deviceInfo?: DeviceInfo;
}

// Models on the island that need credit (CC BY on Sketchfab and Poly Pizza;
// the barrel is CC0 but credited anyway)
const creditsData = [
  {
    name: 'Dog Harvest Moon',
    url: 'https://sketchfab.com/3d-models/dog-harvest-moon-7a034e47c5eb4afe95e08c2e7d74f403',
    author: 'Smoon',
  },
  {
    name: 'Low Poly Computer Desk',
    url: 'https://sketchfab.com/3d-models/low-poly-computer-desk-646ed84ecd9d40089c31d94f79334ca5',
    author: 'Nyangire',
  },
  {
    name: 'Beach House 3D Model',
    url: 'https://skfb.ly/opUtZ',
    author: 'Unknown 3D',
  },
  {
    name: 'Boat',
    url: 'https://sketchfab.com/3d-models/boat-60891d2c56e4448b9c1379bd7cb2b0e8',
    author: 'Arsen.Krityan',
  },
  {
    name: 'cloud',
    url: 'https://sketchfab.com/3d-models/cloud-fab0a880f9d64bd597651e0b1ef85bac',
    author: 'Star Veb',
  },
  {
    name: 'Lighthouse',
    url: 'https://poly.pizza/m/7H8is9jrGeB',
    author: 'Poly by Google',
  },
  {
    name: 'Red/White Beach Umbrella',
    url: 'https://poly.pizza/m/2li3sdSkmCI',
    author: 'S. Paul Michael',
  },
  {
    name: 'Surfboard',
    url: 'https://poly.pizza/m/3js4cQ-O-p2',
    author: 'jeremy',
  },
  {
    name: 'Beach ball',
    url: 'https://poly.pizza/m/4IwPTeOmq6c',
    author: 'the_ normalgamer',
  },
  {
    name: 'Sand castle',
    url: 'https://poly.pizza/m/5iuHHfVoaza',
    author: 'Poly by Google',
  },
  {
    name: 'Campfire',
    url: 'https://poly.pizza/m/dxxHpVXHLZg',
    author: 'jeremy',
  },
  {
    name: 'Crab',
    url: 'https://poly.pizza/m/bmZ6-LnPmp0',
    author: 'jeremy',
  },
  {
    name: 'Treasure chest',
    url: 'https://poly.pizza/m/f7SU-dO1FG7',
    author: 'Louis DeScioli',
  },
  {
    name: 'Life preserver',
    url: 'https://poly.pizza/m/7n1vrlFN0GH',
    author: 'Poly by Google',
  },
  {
    name: 'Inflatable water tube',
    url: 'https://poly.pizza/m/3xMFo1NeFvx',
    author: 'Franco Ricci',
  },
  {
    name: 'Gull',
    url: 'https://poly.pizza/m/7sQHkW0ylJy',
    author: 'Poly by Google',
  },
  {
    name: 'Barrel',
    url: 'https://poly.pizza/m/zjCQP1TAci',
    author: 'Quaternius',
  },
  {
    name: 'Tiki Head',
    url: 'https://poly.pizza/m/98mRturOg91',
    author: 'Tipatat Chennavasin',
  },
  {
    name: 'Hammock (low poly)',
    url: 'https://sketchfab.com/3d-models/hammock-low-poly-c5fd4cef873f44f5a31db1fc6a04c572',
    author: 'Andrey 3D',
  },
  {
    name: 'stylize clouds',
    url: 'https://sketchfab.com/3d-models/stylize-clouds-32ed464f19fe4acf86723eaff08dd568',
    author: 'ragad.sallabi',
  },
];

export default function CreditsPopup({
  isVisible,
  onClose,
  isDarkMode,
  deviceInfo,
}: CreditsPopupProps): React.JSX.Element | null {
  const popupRef = useRef<HTMLDivElement>(null);

  // Handle clicking outside the popup to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popupRef.current &&
        !popupRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isVisible, onClose]);

  // Handle ESC key to close popup
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isVisible) {
      document.addEventListener('keydown', handleEscKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [isVisible, onClose]);

  // Responsive popup styles
  const getPopupStyles = (): React.CSSProperties => {
    const baseStyles: React.CSSProperties = {
      backgroundColor: isDarkMode ? '#162542' : '#0b3a73',
      borderRadius: '15px',
      boxShadow: isDarkMode
        ? '0 25px 50px rgba(0, 0, 0, 0.5), 0 0 30px rgba(255, 255, 255, 0.1)'
        : '0 25px 50px rgba(0, 0, 0, 0.3), 0 0 30px rgba(255, 255, 255, 0.1)',
      maxHeight: '80vh',
      overflowY: 'auto',
      fontFamily: "'Baloo 2', sans-serif",
    };

    if (deviceInfo?.isLandscapeMobile) {
      return {
        ...baseStyles,
        width: '85vw',
        maxWidth: '480px',
        maxHeight: '85vh',
        padding: '2.5rem',
      };
    } else if (deviceInfo?.isMobile) {
      return {
        ...baseStyles,
        width: '90vw',
        maxWidth: '400px',
        padding: '30px 25px',
      };
    } else if (deviceInfo?.isTablet) {
      return {
        ...baseStyles,
        width: '80vw',
        maxWidth: '500px',
        padding: '40px 35px',
      };
    } else {
      return {
        ...baseStyles,
        width: '70vw',
        maxWidth: '600px',
        padding: '40px 45px',
      };
    }
  };

  const getTitleStyles = (): React.CSSProperties => {
    const fontSize = deviceInfo?.isLandscapeMobile
      ? '1.5rem'
      : deviceInfo?.isMobile
      ? '1.75rem'
      : deviceInfo?.isTablet
      ? '2rem'
      : '2.25rem';

    return {
      fontSize,
      fontWeight: '700',
      color: isDarkMode ? '#ffd36b' : '#ffffff', // title: yellow at night
      marginBottom: '10px',
      textAlign: 'center' as const,
      letterSpacing: '-0.02em',
    };
  };

  const getSubtitleStyles = (): React.CSSProperties => {
    const fontSize = deviceInfo?.isLandscapeMobile
      ? '0.8rem'
      : deviceInfo?.isMobile
      ? '0.9rem'
      : deviceInfo?.isTablet
      ? '1rem'
      : '1.1rem';

    const marginBottom = deviceInfo?.isLandscapeMobile ? '20px' : '30px';

    return {
      fontSize,
      fontWeight: '400',
      color: isDarkMode ? '#fff1cc' : '#ffffff',
      marginBottom,
      textAlign: 'center' as const,
      lineHeight: '1.5',
    };
  };

  const getCreditItemStyles = (): React.CSSProperties => {
    const fontSize = deviceInfo?.isLandscapeMobile
      ? '0.8rem'
      : deviceInfo?.isMobile
      ? '0.85rem'
      : '0.9rem';

    const marginBottom = deviceInfo?.isLandscapeMobile ? '12px' : '15px';

    return {
      fontSize,
      marginBottom,
      lineHeight: '1.6',
      color: isDarkMode ? '#fff1cc' : '#ffffff',
    };
  };

  const getLinkStyles = (): React.CSSProperties => {
    return {
      color: '#FFEEA9',
      textDecoration: 'none',
      fontWeight: '500',
      transition: 'color 0.2s ease',
    };
  };

  const getLicenseStyles = (): React.CSSProperties => {
    const fontSize = deviceInfo?.isLandscapeMobile
      ? '0.75rem'
      : deviceInfo?.isMobile
      ? '0.8rem'
      : '0.85rem';

    const marginTop = deviceInfo?.isLandscapeMobile ? '20px' : '25px';
    const padding = deviceInfo?.isLandscapeMobile ? '16px' : '20px';

    return {
      fontSize,
      marginTop,
      padding,
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      borderRadius: '12px',
      color: isDarkMode ? '#fff1cc' : '#ffffff',
      lineHeight: '1.5',
    };
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(8px)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: deviceInfo?.isLandscapeMobile ? '12px' : '20px',
          }}
        >
          <motion.div
            ref={popupRef}
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{
              duration: 0.2,
              ease: [0.25, 0.46, 0.45, 0.94],
              exit: { duration: 0.15, ease: 'easeIn' },
            }}
            style={getPopupStyles()}
          >
            <h2 style={getTitleStyles()}>Credits</h2>
            <p style={{ ...getSubtitleStyles(), marginBottom: '12px' }}>
              Designed and built by {PROFILE.name} with React, Three.js (React
              Three Fiber) and Motion.{' '}
              <a
                href={LINKS.siteCode}
                target='_blank'
                rel='noopener noreferrer'
                style={getLinkStyles()}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#ffffff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#FFEEA9';
                }}
              >
                See the code ↗
              </a>
            </p>
            <p style={getSubtitleStyles()}>
              Credits to all these people who made such amazing models.
            </p>

            <div>
              {creditsData.map((credit, index) => (
                <div key={index} style={getCreditItemStyles()}>
                  <a
                    href={credit.url}
                    target='_blank'
                    rel='noopener noreferrer'
                    style={getLinkStyles()}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = '#ffffff';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = '#FFEEA9';
                    }}
                  >
                    "{credit.name}"
                  </a>{' '}
                  by {credit.author}
                </div>
              ))}
            </div>

            <div style={getLicenseStyles()}>
              <p style={{ margin: 0 }}>
                All models are licensed under{' '}
                <a
                  href='http://creativecommons.org/licenses/by/4.0/'
                  target='_blank'
                  rel='noopener noreferrer'
                  style={getLinkStyles()}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#ffffff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#FFEEA9';
                  }}
                >
                  Creative Commons Attribution
                </a>
                .
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
