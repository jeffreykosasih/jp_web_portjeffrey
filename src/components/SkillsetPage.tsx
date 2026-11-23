import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faMousePointer,
  faEllipsis,
  faTimes,
} from '@fortawesome/free-solid-svg-icons';
import { DeviceInfo } from '../lib/types';
import SideDrawer, { DrawerTitle, DRAWER_COLORS } from './SideDrawer';
import {
  getResponsiveValue,
  getSpacing,
  ResponsiveValues,
} from '../lib/responsiveUtils';
import {
  faJs,
  faReact,
  faFigma,
  faGithub as faGithubBrand,
} from '@fortawesome/free-brands-svg-icons';
import {
  SiFramer,
  SiTailwindcss,
  SiThreedotjs,
  SiTypescript,
  SiNotion,
  SiVercel,
  SiAdobephotoshop,
  SiAdobeillustrator,
  SiAdobepremierepro,
  SiAdobeaftereffects,
} from 'react-icons/si';
import { SlCursor } from 'react-icons/sl';

interface SkillsetPageProps {
  isVisible: boolean;
  onClose: () => void;
  onOpenBurgerMenu: (slideDirection?: 'left' | 'right') => void;
  isDarkMode: boolean;
  shouldAnimateText?: boolean;
  deviceInfo?: DeviceInfo;
  onPlayClickSound?: () => void;
}

type SkillCategory = 'tools' | 'programming' | 'languages';

interface SkillItem {
  name: string;
  description: string;
  icon: any;
  color: string;
  textColor?: string;
}

const skillsData: Record<SkillCategory, SkillItem[]> = {
  tools: [
    {
      name: 'Cursor',
      description: 'Primary code editor',
      icon: SlCursor,
      color: '#007ACC',
    },
    {
      name: 'Figma',
      description: 'UI/UX design and prototyping',
      icon: faFigma,
      color: '#ff7262',
    },
    {
      name: 'GitHub',
      description: 'Code for all my projects',
      icon: faGithubBrand,
      color: '#333333',
    },
    {
      name: 'Vercel',
      description: 'Hosting and deploys for my sites',
      icon: SiVercel,
      color: '#000000',
    },
    {
      name: 'Notion',
      description: 'Project management and documentation',
      icon: SiNotion,
      color: '#000000',
    },
  ],
  programming: [
    {
      name: 'Motion',
      description: 'Very cool animation library',
      icon: SiFramer,
      color: '#F7DF1E',
      textColor: '#000000',
    },
    {
      name: 'JavaScript',
      description: 'Primary language for web development',
      icon: faJs,
      color: '#F7DF1E',
      textColor: '#000000',
    },
    {
      name: 'React',
      description: 'Frontend library for building user interfaces',
      icon: faReact,
      color: '#61DAFB',
      textColor: '#000000',
    },
    {
      name: 'Tailwind CSS',
      description: 'CSS framework',
      icon: SiTailwindcss,
      color: '#06B6D4',
    },
    {
      name: 'Three.js',
      description: '3D graphics library',
      icon: SiThreedotjs,
      color: '#000000',
    },
    {
      name: 'TypeScript',
      description: 'Type-safe JavaScript development',
      icon: SiTypescript,
      color: '#3178C6',
    },
  ],
  languages: [
    {
      name: 'English',
      description: 'Fluent',
      icon: '🇺🇸',
      color: '#B22234',
    },
    {
      name: 'Indonesian',
      description: 'Native speaker',
      icon: '🇮🇩',
      color: '#FF0000',
    },
  ],
};

const adobeApps: SkillItem[] = [
  {
    name: 'Photoshop',
    description: 'Little bit of patching and filters',
    icon: SiAdobephotoshop,
    color: '#33a8ff',
  },
  {
    name: 'Illustrator',
    description: 'For logo and banner',
    icon: SiAdobeillustrator,
    color: '#fd9b00',
  },
  {
    name: 'Premiere Pro',
    description: 'Back when I was trying to be a "Youtuber"',
    icon: SiAdobepremierepro,
    color: '#9999FF',
  },
  {
    name: 'After Effects',
    description: 'Easy animation',
    icon: SiAdobeaftereffects,
    color: '#4545a3',
  },
];

export default function SkillsetPage({
  isVisible,
  onClose,
  onOpenBurgerMenu,
  isDarkMode,
  shouldAnimateText = true,
  deviceInfo,
  onPlayClickSound,
}: SkillsetPageProps) {
  const [activeCategory, setActiveCategory] = useState<SkillCategory>('tools');
  const [showAdobePopup, setShowAdobePopup] = useState(false);

  // Unified device type detection (following ProfilePage pattern)
  const getDeviceType = ():
    | 'mobile-landscape'
    | 'mobile-portrait'
    | 'tablet'
    | 'desktop' => {
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
  };

  const deviceType = getDeviceType();


  // Responsive styling based on device (following ProfilePage pattern)
  const getContainerStyles = () => {
    const configs = {
      'mobile-landscape': {
        padding: `max(env(safe-area-inset-top), var(--space-lg)) var(--space-xl) max(env(safe-area-inset-bottom), var(--space-lg)) var(--space-xl)`,
        height: '100dvh',
      },
      'mobile-portrait': {
        padding: `max(env(safe-area-inset-top), var(--space-lg)) var(--space-base) max(env(safe-area-inset-bottom), var(--space-3xl)) var(--space-base)`,
        height: '100dvh',
      },
      tablet: {
        padding: 'var(--space-3xl) var(--space-xl)',
      },
      desktop: {
        padding: 'var(--space-2xl) var(--space-xl)',
      },
    };

    return {
      position: 'relative' as const,
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column' as const,
      // The content block grows to fill the panel, so start at the top and
      // let tall content scroll instead of being cut off
      justifyContent: 'flex-start',
      alignItems: 'center',
      color: 'var(--ui-ink)',
      overflowY: 'auto' as const,
      ...configs[deviceType],
    };
  };

  const getTitleStyles = () => {
    const configs = {
      'mobile-landscape': {
        fontSize: 'var(--text-5xl)',
        marginBottom: 'var(--space-lg)',
        marginTop: 'var(--space-sm)',
      },
      'mobile-portrait': {
        fontSize: 'var(--mobile-text-display)',
        marginBottom: 'var(--space-lg)',
        marginTop: 'var(--space-lg)',
      },
      tablet: {
        fontSize: 'var(--tablet-text-display)',
        marginBottom: 'calc(var(--space-xl) + 0.3125rem)',
      },
      desktop: {
        fontSize: 'var(--text-6xl)',
        marginTop: 'var(--space-2xl)',
      },
    };

    return {
      fontWeight: '900',
      fontFamily: "'Baloo 2', sans-serif",
      background: 'linear-gradient(45deg, #ffffff, #e2e8f0)',
      WebkitBackgroundClip: 'text',
      backgroundClip: 'text',
      color: 'transparent',
      letterSpacing: '-0.02em',
      textAlign: 'center' as const,
      ...configs[deviceType],
    };
  };

  const getCategoryButtonStyles = (category: SkillCategory) => {
    const isActive = activeCategory === category;
    const isPhone =
      deviceType === 'mobile-portrait' || deviceType === 'mobile-landscape';
    return {
      border: 'none',
      borderRadius: '999px',
      minHeight: '2.5rem',
      padding: isPhone ? '0.5rem 1rem' : '0.6rem 1.4rem',
      backgroundColor: isActive ? 'var(--ui-accent)' : 'transparent',
      color: isActive ? 'var(--ui-on-accent)' : 'var(--ui-ink)',
      fontWeight: 700,
      fontFamily: "'Baloo 2', sans-serif",
      fontSize: isPhone ? '0.875rem' : '1rem',
      cursor: 'pointer',
      transition: 'background-color 0.2s ease, color 0.2s ease',
    };
  };

  const getFooterStyles = () => {
    const configs = {
      'mobile-landscape': {
        fontSize: 'var(--text-sm)',
        padding: 'var(--space-lg) var(--space-base)',
      },
      'mobile-portrait': {
        fontSize: 'var(--text-sm)',
        padding: 'var(--space-lg) var(--space-base)',
      },
      tablet: {
        fontSize: 'var(--text-base)',
        padding: 'var(--space-lg) var(--space-3xl)',
      },
      desktop: {
        fontSize: 'var(--text-base)',
        padding: 'var(--space-lg) var(--space-3xl)',
      },
    };

    return {
      lineHeight: '1.6',
      fontFamily: "'Baloo 2', sans-serif",
      fontWeight: '400',
      color: 'var(--ui-ink-muted)',
      textAlign: 'center' as const,
      marginTop: 'auto',
      ...configs[deviceType],
    };
  };

  const renderSkillsGrid = () => {
    const skills = skillsData[activeCategory];
    const isPhoneCard =
      deviceType === 'mobile-landscape' || deviceType === 'mobile-portrait';
    const cardMaxWidth = isPhoneCard ? '8.75rem' : '11.25rem';
    const cols = deviceType === 'mobile-portrait' ? 2 : 3;
    const cardGap = isPhoneCard ? '0.875rem' : '1.25rem';
    const cardWidth = `calc((100% - ${cols - 1} * ${cardGap}) / ${cols})`;
    const cardMinHeight = isPhoneCard ? '8.5rem' : '10.5rem';
    const showMoreButton = activeCategory === 'tools';

    return (
      <motion.div
        key={activeCategory}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: 0.05 }}
        style={{
          // Wrapping row, centred, so tabs with fewer cards stay balanced
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: cardGap,
          width: '100%',
          maxWidth: '37.5rem',
          margin: '0 auto',
        }}
      >
        {skills.map((skill, index) => (
          <motion.div
            key={skill.name}
            initial={{ opacity: 0, y: 10, scale: 1 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
              duration: 0.3,
              delay: 0.1 + index * 0.03,
              ease: 'easeOut',
            }}
            whileHover={{
              y: -10,
              transition: { duration: 0.08, ease: 'easeOut' },
            }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding:
                deviceType === 'mobile-landscape'
                  ? 'var(--space-lg) calc(var(--space-md) + 0.1875rem)'
                  : deviceType === 'mobile-portrait'
                  ? 'var(--space-base) var(--space-sm)'
                  : deviceType === 'tablet'
                  ? 'calc(var(--space-xl) + 0.75rem) var(--space-lg)'
                  : 'calc(var(--space-xl) + 0.75rem) var(--space-lg)',
              borderRadius: 'var(--radius-lg)',
              backgroundColor: 'rgba(0, 0, 0, 0.2)', // dark tint keeps white text above 7:1
              cursor: 'pointer',
              width: cardWidth,
              maxWidth: cardMaxWidth,
              minHeight: cardMinHeight,
              boxSizing: 'border-box',
            }}
          >
            <div
              style={{
                width:
                  deviceType === 'mobile-landscape'
                    ? 'var(--space-4xl)'
                    : deviceType === 'mobile-portrait'
                    ? 'calc(var(--space-2xl) + 0.625rem)'
                    : deviceType === 'tablet'
                    ? 'calc(var(--space-4xl) - 0.25rem)'
                    : 'calc(var(--space-4xl) - 0.25rem)',
                height:
                  deviceType === 'mobile-landscape'
                    ? 'var(--space-4xl)'
                    : deviceType === 'mobile-portrait'
                    ? 'calc(var(--space-2xl) + 0.625rem)'
                    : deviceType === 'tablet'
                    ? 'calc(var(--space-4xl) - 0.25rem)'
                    : 'calc(var(--space-4xl) - 0.25rem)',
                borderRadius: 'var(--radius-lg)',
                // flags sit on a neutral tile; brand icons on their colour
                backgroundColor:
                  typeof skill.icon === 'string'
                    ? 'rgba(255, 255, 255, 0.14)'
                    : skill.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom:
                  deviceType === 'mobile-landscape'
                    ? 'var(--space-sm)'
                    : deviceType === 'mobile-portrait'
                    ? 'var(--space-sm)'
                    : deviceType === 'tablet'
                    ? 'calc(var(--space-md) + 0.125rem)'
                    : 'calc(var(--space-md) + 0.125rem)',
              }}
            >
              {typeof skill.icon === 'string' ? (
                <span
                  aria-hidden='true'
                  style={{
                    fontSize:
                      deviceType === 'mobile-portrait' || deviceType === 'mobile-landscape'
                        ? '1.6rem'
                        : '1.9rem',
                    lineHeight: 1,
                  }}
                >
                  {skill.icon}
                </span>
              ) : typeof skill.icon === 'object' ? (
                <FontAwesomeIcon
                  icon={skill.icon}
                  style={{
                    fontSize:
                      deviceType === 'mobile-landscape'
                        ? 'var(--text-2xl)'
                        : deviceType === 'mobile-portrait'
                        ? 'calc(var(--text-xl) + 0.125rem)'
                        : deviceType === 'tablet'
                        ? 'calc(var(--text-2xl) + 0.125rem)'
                        : 'calc(var(--text-2xl) + 0.125rem)',
                    color: skill.textColor || '#ffffff',
                  }}
                />
              ) : (
                <skill.icon
                  style={{
                    fontSize:
                      deviceType === 'mobile-landscape'
                        ? 'var(--text-2xl)'
                        : deviceType === 'mobile-portrait'
                        ? 'calc(var(--text-xl) + 0.125rem)'
                        : deviceType === 'tablet'
                        ? 'calc(var(--text-2xl) + 0.125rem)'
                        : 'calc(var(--text-2xl) + 0.125rem)',
                    color: skill.textColor || '#ffffff',
                  }}
                />
              )}
            </div>
            <h4
              style={{
                fontSize:
                  deviceType === 'mobile-landscape'
                    ? 'calc(var(--text-base) - 0.05rem)'
                    : deviceType === 'mobile-portrait'
                    ? 'calc(var(--text-sm) + 0.05rem)'
                    : deviceType === 'tablet'
                    ? 'var(--text-base)'
                    : 'var(--text-base)',
                fontWeight: '700',
                fontFamily: "'Baloo 2', sans-serif",
                marginBottom:
                  deviceType === 'mobile-landscape'
                    ? 'var(--space-xs)'
                    : deviceType === 'mobile-portrait'
                    ? 'var(--space-xs)'
                    : deviceType === 'tablet'
                    ? 'var(--space-xs)'
                    : 'var(--space-xs)',
                color: 'var(--ui-ink)',
                textAlign: 'center',
              }}
            >
              {skill.name}
            </h4>
            <p
              style={{
                fontSize:
                  deviceType === 'mobile-landscape'
                    ? 'calc(var(--text-sm) - 0.125rem)'
                    : deviceType === 'mobile-portrait'
                    ? 'calc(var(--text-sm) - 0.125rem)'
                    : deviceType === 'tablet'
                    ? 'calc(var(--text-sm) - 0.05rem)'
                    : 'calc(var(--text-sm) - 0.05rem)',
                fontFamily: "'Baloo 2', sans-serif",
                fontWeight: '400',
                color: 'var(--ui-ink-muted)',
                textAlign: 'center',
                margin: 0,
                lineHeight: '1.3',
              }}
            >
              {skill.description}
            </p>
          </motion.div>
        ))}

        {showMoreButton && (
          <motion.button
            type='button'
            aria-haspopup='dialog'
            initial={{ opacity: 0, y: 10, scale: 1 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
              duration: 0.3,
              delay: 0.1 + skills.length * 0.03,
              ease: 'easeOut',
            }}
            whileHover={{
              y: -10,
              transition: { duration: 0.08, ease: 'easeOut' },
            }}
            onClick={() => setShowAdobePopup(true)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1rem 0.75rem',
              borderRadius: 'var(--radius-lg)',
              backgroundColor: 'rgba(0, 0, 0, 0.2)',
              cursor: 'pointer',
              width: cardWidth,
              maxWidth: cardMaxWidth,
              minHeight: cardMinHeight,
              border: 'none', // no outline, like the other cards
              boxSizing: 'border-box',
              fontFamily: 'inherit',
              color: 'var(--ui-ink)',
            }}
          >
            {/* Same parts as the other cards: icon tile, name, one line */}
            <div
              style={{
                width: isPhoneCard ? '2.5rem' : '2.75rem',
                height: isPhoneCard ? '2.5rem' : '2.75rem',
                borderRadius: 'var(--radius-lg)',
                backgroundColor: 'rgba(255, 255, 255, 0.14)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: isPhoneCard ? '0.5rem' : '0.8rem',
              }}
            >
              <FontAwesomeIcon icon={faEllipsis} style={{ fontSize: isPhoneCard ? '1.2rem' : '1.4rem' }} />
            </div>
            <h4
              style={{
                fontSize: isPhoneCard ? '0.9rem' : '1rem',
                fontWeight: '700',
                fontFamily: "'Baloo 2', sans-serif",
                margin: '0 0 0.25rem',
                color: 'var(--ui-ink)',
                textAlign: 'center',
              }}
            >
              More tools
            </h4>
            <p
              style={{
                fontSize: isPhoneCard ? '0.75rem' : '0.8rem',
                fontFamily: "'Baloo 2', sans-serif",
                color: 'var(--ui-ink-muted)',
                textAlign: 'center',
                margin: 0,
                lineHeight: '1.3',
              }}
            >
              Adobe apps I use now and then
            </p>
          </motion.button>
        )}
      </motion.div>
    );
  };

  const renderAdobePopup = () => {
    return (
      <AnimatePresence>
        {showAdobePopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              backgroundColor: 'rgba(0, 0, 0, 0.45)',
              zIndex: 2000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowAdobePopup(false);
              }
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{
                // Same deep panel as the drawers
                backgroundColor: isDarkMode
                  ? DRAWER_COLORS.dark.tab
                  : DRAWER_COLORS.light.tab,
                border: 'none',
                borderRadius: 'var(--radius-lg)',
                padding: deviceInfo?.isMobile ? '28px 18px' : '36px 30px',
                maxWidth: '520px',
                width: '100%',
                maxHeight: '80vh',
                overflow: 'auto',
                position: 'relative',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              }}
            >
              {/* Close button */}
              <motion.button
                onClick={() => setShowAdobePopup(false)}
                aria-label='Close other tools'
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                style={{
                  position: 'absolute',
                  top: '20px',
                  right: '20px',
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  border: 'none', // no outline: the accent colour is on the icon
                  backgroundColor: 'transparent',
                  color: 'var(--ui-accent)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s ease',
                }}
              >
                <FontAwesomeIcon icon={faTimes} style={{ fontSize: '22px' }} />
              </motion.button>

              {/* Title */}
              <h2
                className='type-display'
                style={{
                  fontSize: deviceInfo?.isMobile ? '2.25rem' : '2.75rem',
                  letterSpacing: '-0.02em',
                  color: 'var(--ui-accent)',
                  margin: '0.25rem 0 1.5rem',
                  textAlign: 'center',
                }}
              >
                Other Tools
              </h2>

              {/* Adobe apps grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: deviceInfo?.isMobile
                    ? 'repeat(2, 1fr)'
                    : 'repeat(2, 1fr)',
                  gap: '1rem',
                }}
              >
                {adobeApps.map((app, index) => (
                  <motion.div
                    key={app.name}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    whileHover={{
                      y: -5,
                      transition: { duration: 0.08, ease: 'easeOut' },
                    }}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      padding: '1rem 0.75rem',
                      borderRadius: 'var(--radius-lg)',
                      backgroundColor: 'rgba(0, 0, 0, 0.2)',
                    }}
                  >
                    <div
                      style={{
                        width: '2.75rem',
                        height: '2.75rem',
                        borderRadius: 'var(--radius-lg)',
                        backgroundColor: app.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '0.8rem',
                      }}
                    >
                      <app.icon
                        style={{
                          fontSize: '24px',
                          color: app.textColor || '#ffffff',
                        }}
                      />
                    </div>
                    <h4
                      style={{
                        fontSize: '1rem',
                        fontWeight: '700',
                        fontFamily: "'Baloo 2', sans-serif",
                        margin: '0 0 0.25rem',
                        color: 'var(--ui-ink)',
                        textAlign: 'center',
                      }}
                    >
                      {app.name}
                    </h4>
                    <p
                      style={{
                        fontSize: '0.8rem',
                        fontFamily: "'Baloo 2', sans-serif",
                        fontWeight: '400',
                        color: 'var(--ui-ink-muted)',
                        textAlign: 'center',
                        margin: 0,
                        lineHeight: '1.3',
                      }}
                    >
                      {app.description}
                    </p>
                  </motion.div>
                ))}
              </div>

              {/* Footer */}
              <p
                style={{
                  fontSize: deviceInfo?.isMobile ? '0.8rem' : '0.9rem',
                  fontFamily: "'Baloo 2', sans-serif",
                  fontWeight: '400',
                  color: 'var(--ui-ink-muted)',
                  textAlign: 'center',
                  margin: 0,
                  marginTop: '25px',
                  lineHeight: '1.4',
                }}
              >
                Not core to my work, but I can use them.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  };

  return (
    <SideDrawer
      isVisible={isVisible}
      onClose={onClose}
      isDarkMode={isDarkMode}
      deviceInfo={deviceInfo}
      label='Skills'
      align='top'
      onPlayClickSound={onPlayClickSound}
    >

          {/* Content with fade in */}
          <motion.div
            initial={
              shouldAnimateText ? { opacity: 1, y: 20 } : { opacity: 1, y: 0 }
            }
            animate={{ opacity: 1, y: 0 }}
            transition={
              shouldAnimateText
                ? { duration: 0.3, delay: 0.05 }
                : { duration: 0 }
            }
            style={{
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <DrawerTitle
              title='Skills'
              subtitle='The tools, code and languages I work with.'
              deviceInfo={deviceInfo}
            />

            {/* Category buttons */}
            <div
              role='tablist'
              aria-label='Skill type'
              style={{
                display: 'flex',
                gap: '0.25rem',
                padding: '0.25rem',
                borderRadius: '999px',
                backgroundColor: 'rgba(0, 0, 0, 0.2)',
                marginBottom: deviceType === 'mobile-landscape' ? '1rem' : '1.75rem',
              }}
            >
              {(Object.keys(skillsData) as SkillCategory[]).map((category) => (
                <motion.button
                  key={category}
                  onClick={() => setActiveCategory(category)}
                  role='tab'
                  aria-selected={activeCategory === category}
                  style={getCategoryButtonStyles(category)}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                  className='touch-target'
                >
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </motion.button>
              ))}
            </div>

            {/* Skills content */}
            {renderSkillsGrid()}
          </motion.div>


          {/* Adobe Popup */}
          {renderAdobePopup()}
    </SideDrawer>
  );
}
