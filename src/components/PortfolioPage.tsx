import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { DeviceInfo } from '../lib/types';
import { ResponsiveValues } from '../lib/responsiveUtils';

interface PortfolioPageProps {
  isVisible: boolean;
  onClose: () => void;
  onOpenBurgerMenu: (slideDirection?: 'left' | 'right') => void;
  isDarkMode: boolean;
  shouldAnimateText?: boolean;
  deviceInfo?: DeviceInfo;
  onPlayClickSound?: () => void;
}

interface ProjectLink {
  label: string;
  href: string;
}

interface Project {
  title: string;
  kind: string; // what it is, and whether it shipped or is a concept
  summary: string; // the problem it solves, in one line
  image: string;
  tech: string[]; // checked against each repo's package.json
  links: ProjectLink[];
}

const projects: Project[] = [
  {
    title: 'Katsu Seiba',
    kind: 'Restaurant website · Concept',
    summary:
      'Menu, locations and table booking, with booking one tap away from every section.',
    image: '/assets/images/project_katsu.jpg',
    tech: ['React', 'JavaScript', 'Tailwind', 'Motion'],
    links: [
      { label: 'Live site', href: 'https://katsuseiba.vercel.app' },
      { label: 'Case study', href: 'https://www.jeffreyko.com/pj/katsu-seiba' },
    ],
  },
  {
    title: 'Port Jeffrey',
    kind: '3D portfolio · This site',
    summary:
      'An island you can explore, with every landmark labelled so the work is never hidden.',
    image: '/assets/images/project_island.jpg',
    tech: ['Three.js', 'React', 'TypeScript', 'Motion'],
    links: [
      { label: 'Case study', href: 'https://www.jeffreyko.com/pj/port-jeffrey' },
    ],
  },
  {
    title: 'Muscle Memory',
    kind: 'Workout web app · Personal',
    summary:
      'Exercises grouped by muscle: pick a group and get the moves for it.',
    image: '/assets/images/project_muscle.jpg',
    tech: ['Next.js', 'TypeScript', 'Tailwind', 'Motion'],
    links: [
      { label: 'Live site', href: 'https://musclememo.vercel.app' },
    ],
  },
];

type DeviceType = 'mobile-landscape' | 'mobile-portrait' | 'tablet' | 'desktop';

// Per-device sizes for the cards, kept together so they are easy to tune
const cardSizes: Record<
  DeviceType,
  {
    width: string;
    minWidth: string;
    maxWidth: string;
    imageHeight: string;
    padding: string;
    title: string;
    summary: string;
    tag: string;
    link: string;
  }
> = {
  'mobile-landscape': {
    width: 'auto',
    minWidth: '12rem',
    maxWidth: '15rem',
    imageHeight: '5.5rem',
    padding: 'var(--space-md)',
    title: 'var(--text-base)',
    summary: 'var(--text-xs)',
    tag: 'var(--text-xs)',
    link: 'var(--text-xs)',
  },
  'mobile-portrait': {
    width: '100%',
    minWidth: '0',
    maxWidth: '24rem',
    imageHeight: '8rem',
    padding: 'var(--space-base)',
    title: 'var(--text-lg)',
    summary: 'var(--text-sm)',
    tag: 'var(--text-xs)',
    link: 'var(--text-sm)',
  },
  tablet: {
    width: 'auto',
    minWidth: '14rem',
    maxWidth: '19rem',
    imageHeight: '9rem',
    padding: 'var(--space-base) var(--space-lg) var(--space-lg)',
    title: 'var(--text-lg)',
    summary: 'var(--text-sm)',
    tag: 'var(--text-xs)',
    link: 'var(--text-sm)',
  },
  desktop: {
    width: 'auto',
    minWidth: '15rem',
    maxWidth: '20rem',
    imageHeight: '11rem',
    padding: 'var(--space-base) var(--space-lg) var(--space-lg)',
    title: 'var(--text-xl)',
    summary: 'calc(var(--text-sm) + 0.05rem)',
    tag: 'var(--text-xs)',
    link: 'var(--text-sm)',
  },
};

export default function PortfolioPage({
  isVisible,
  onClose,
  onOpenBurgerMenu,
  isDarkMode,
  shouldAnimateText = true,
  deviceInfo,
  onPlayClickSound,
}: PortfolioPageProps) {
  const [hoveredLink, setHoveredLink] = React.useState<string | null>(null);

  // Enhanced device type detection with iPhone-specific breakpoints
  const getDeviceType = (): DeviceType => {
    if (!deviceInfo) return 'desktop';

    // Enhanced landscape mobile detection for iPhone 12 Pro and similar devices
    if (
      deviceInfo.isLandscapeMobile ||
      (deviceInfo.isMobile && deviceInfo.orientation === 'landscape') ||
      (window.innerWidth <= 900 &&
        window.innerHeight <= 450 &&
        window.innerWidth > window.innerHeight)
    ) {
      return 'mobile-landscape';
    }
    if (deviceInfo.isMobile) return 'mobile-portrait';
    if (deviceInfo.isTablet) return 'tablet';
    return 'desktop';
  };

  const deviceType = getDeviceType();
  const isPhone =
    deviceType === 'mobile-landscape' || deviceType === 'mobile-portrait';
  const size = cardSizes[deviceType];
  const brand = isDarkMode ? '#162542' : '#005E80';

  // Responsive styles based on device type (following ProfilePage pattern)
  const getContainerStyles = () => {
    const configs = {
      'mobile-landscape': {
        padding: `max(env(safe-area-inset-top), var(--space-sm)) var(--space-base) max(env(safe-area-inset-bottom), var(--space-lg)) var(--space-base)`,
        height: '100dvh',
      },
      'mobile-portrait': {
        padding: `max(env(safe-area-inset-top), var(--space-lg)) var(--space-base) max(env(safe-area-inset-bottom), var(--space-3xl)) var(--space-base)`,
        height: '100dvh',
      },
      tablet: {
        padding: 'calc(var(--space-xl) + 0.625rem) var(--space-xl)',
      },
      desktop: {
        padding: 'var(--space-3xl)',
      },
    };

    return {
      position: 'fixed' as const,
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: isDarkMode
        ? 'rgba(22, 37, 66, 0.4)'
        : 'rgba(0, 94, 128, 0.5)',
      backdropFilter: 'blur(0.5rem)',
      opacity: 1,
      zIndex: ResponsiveValues.zIndex.overlay,
      display: 'flex',
      flexDirection: 'column' as const,
      // Content centres itself with auto margins, so when it is taller than
      // the screen it scrolls instead of being cut off at the top.
      justifyContent: 'flex-start',
      alignItems: 'center',
      color: '#ffffff',
      overflowY: 'auto' as const,
      ...configs[deviceType],
    };
  };

  const getLinkStyles = (key: string): React.CSSProperties => {
    const isHovered = hoveredLink === key;
    return {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.3em',
      minHeight: isPhone ? '2.25rem' : '2rem',
      padding: '0 0.625rem',
      borderRadius: 'var(--radius-full)',
      border: '1px solid rgba(255, 255, 255, 0.45)',
      backgroundColor: isHovered ? '#ffffff' : 'transparent',
      color: isHovered ? brand : '#ffffff',
      fontFamily: 'Lato, sans-serif',
      fontWeight: 700,
      fontSize: size.link,
      textDecoration: 'none',
      whiteSpace: 'nowrap',
      transition: 'background-color 0.15s ease, color 0.15s ease',
    };
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          style={{
            ...getContainerStyles(),
            visibility: isVisible ? 'visible' : 'hidden',
            pointerEvents: isVisible ? 'auto' : 'none',
          }}
        >
          {/* Back button with slide left to right effect */}
          <motion.button
            onClick={() => {
              onPlayClickSound?.();
              onClose(); // Close current page
              onOpenBurgerMenu('right'); // Open burger menu sliding from right corner
            }}
            aria-label='Back to menu'
            initial={{ x: 20 }}
            animate={{ x: 0 }}
            whileHover={{ x: -5 }}
            transition={{ duration: 0.3 }}
            style={{
              borderRadius: '50%',
              position: 'absolute',
              top:
                deviceType === 'mobile-landscape'
                  ? 'max(env(safe-area-inset-top), var(--space-sm))'
                  : deviceType === 'mobile-portrait'
                  ? 'max(env(safe-area-inset-top), var(--space-base))'
                  : 'var(--space-lg)',
              right:
                deviceType === 'mobile-landscape'
                  ? 'var(--space-md)'
                  : deviceType === 'mobile-portrait'
                  ? 'var(--space-base)'
                  : 'var(--space-lg)',
              zIndex: 1001,
              width:
                deviceType === 'mobile-landscape'
                  ? 'var(--touch-target-sm)'
                  : deviceType === 'mobile-portrait'
                  ? 'var(--touch-target-md)'
                  : 'var(--touch-target-lg)',
              height:
                deviceType === 'mobile-landscape'
                  ? 'var(--touch-target-sm)'
                  : deviceType === 'mobile-portrait'
                  ? 'var(--touch-target-md)'
                  : 'var(--touch-target-lg)',
              border: 'none',
              backgroundColor: brand,
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <FontAwesomeIcon
              icon={faArrowLeft}
              style={{
                color: '#ffffff',
                fontSize: 'var(--text-lg)',
              }}
            />
          </motion.button>

          {/* Content with fade in */}
          <motion.div
            initial={
              shouldAnimateText ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }
            }
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={
              shouldAnimateText
                ? { duration: 0.8, delay: 0.2 }
                : { duration: 0 }
            }
            style={{
              width: '100%',
              maxWidth: '1200px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              marginTop: 'auto',
              marginBottom: 'auto',
              paddingTop: isPhone ? 'var(--space-5xl)' : 'var(--space-lg)', // Space for back button
            }}
          >
            {/* Header */}
            <h1
              style={{
                fontSize:
                  deviceType === 'mobile-landscape'
                    ? 'var(--text-2xl)'
                    : deviceType === 'mobile-portrait'
                    ? 'var(--mobile-text-display)'
                    : deviceType === 'tablet'
                    ? 'var(--tablet-text-display)'
                    : 'var(--text-6xl)',
                fontWeight: '900',
                fontFamily: 'Lato, sans-serif',
                margin: 0,
                background: 'linear-gradient(45deg, #ffffff, #e2e8f0)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
                letterSpacing: '-0.02em',
                textAlign: 'center',
              }}
            >
              Portfolio
            </h1>
            <p
              style={{
                margin: 0,
                marginTop:
                  deviceType === 'mobile-landscape' ? '0.125rem' : 'var(--space-sm)',
                fontFamily: 'Lato, sans-serif',
                fontWeight: 400,
                fontSize:
                  deviceType === 'mobile-landscape'
                    ? 'var(--text-sm)'
                    : isPhone
                    ? 'var(--text-base)'
                    : 'var(--text-lg)',
                color: 'rgba(255, 255, 255, 0.85)',
                textAlign: 'center',
              }}
            >
              Things I designed and built on my own.
            </p>

            {/* Projects List */}
            <motion.div
              initial={
                shouldAnimateText ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }
              }
              animate={{ opacity: 1, y: 0 }}
              transition={
                shouldAnimateText
                  ? { duration: 0.6, delay: 0.4 }
                  : { duration: 0 }
              }
              style={{
                display: 'flex',
                flexDirection: deviceType === 'mobile-portrait' ? 'column' : 'row',
                justifyContent: 'center',
                alignItems: deviceType === 'mobile-portrait' ? 'center' : 'stretch',
                gap:
                  deviceType === 'mobile-landscape'
                    ? 'var(--space-md)'
                    : deviceType === 'mobile-portrait'
                    ? 'var(--space-base)'
                    : 'calc(var(--space-xl) + 0.625rem)',
                padding:
                  deviceType === 'mobile-landscape'
                    ? '0 var(--space-base)'
                    : deviceType === 'mobile-portrait'
                    ? '0'
                    : '0 var(--space-lg)',
                flexWrap: deviceType === 'mobile-portrait' ? 'nowrap' : 'wrap',
                marginTop:
                  deviceType === 'mobile-landscape'
                    ? 'var(--space-md)'
                    : deviceType === 'mobile-portrait'
                    ? 'var(--space-lg)'
                    : 'calc(var(--space-xl) + 0.625rem)',
                marginBottom: 'var(--space-lg)',
                maxWidth: deviceType === 'mobile-landscape' ? '95vw' : '1200px',
                width: '100%',
              }}
            >
              {projects.map((project, index) => (
                <motion.article
                  key={project.title}
                  initial={
                    shouldAnimateText
                      ? { opacity: 0, y: 10 }
                      : { opacity: 1, y: 0 }
                  }
                  animate={{ opacity: 1, y: 0 }}
                  transition={
                    shouldAnimateText
                      ? {
                          duration: 0.3,
                          delay: 0.1 + index * 0.05,
                          ease: 'easeOut',
                        }
                      : { duration: 0 }
                  }
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: '16px',
                    backgroundColor: isDarkMode
                      ? 'rgba(255, 255, 255, 0.15)'
                      : 'rgba(255, 255, 255, 0.12)',
                    flex: deviceType === 'mobile-portrait' ? 'none' : '1 1 0',
                    width: size.width,
                    minWidth: size.minWidth,
                    maxWidth: size.maxWidth,
                    overflow: 'hidden',
                  }}
                >
                  <img
                    src={project.image}
                    alt=''
                    loading='lazy'
                    style={{
                      display: 'block',
                      width: '100%',
                      height: size.imageHeight,
                      objectFit: 'cover',
                    }}
                  />

                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      flex: 1,
                      padding: size.padding,
                      gap: deviceType === 'mobile-landscape' ? '0.375rem' : 'var(--space-sm)',
                      textAlign: 'left',
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        fontFamily: 'Lato, sans-serif',
                        fontWeight: 700,
                        fontSize: 'var(--text-xs)',
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        color: 'rgba(255, 255, 255, 0.75)',
                      }}
                    >
                      {project.kind}
                    </p>
                    <h2
                      style={{
                        margin: 0,
                        fontFamily: 'Lato, sans-serif',
                        fontWeight: 800,
                        fontSize: size.title,
                        lineHeight: 1.2,
                        color: '#ffffff',
                      }}
                    >
                      {project.title}
                    </h2>
                    <p
                      style={{
                        margin: 0,
                        fontFamily: 'Lato, sans-serif',
                        fontWeight: 400,
                        fontSize: size.summary,
                        lineHeight: 1.45,
                        color: 'rgba(255, 255, 255, 0.88)',
                      }}
                    >
                      {project.summary}
                    </p>

                    {/* Technology tags */}
                    <ul
                      aria-label='Built with'
                      style={{
                        listStyle: 'none',
                        margin: 0,
                        padding: 0,
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '4px',
                      }}
                    >
                      {project.tech.map((tech) => (
                        <li
                          key={tech}
                          style={{
                            padding: '0.2rem 0.5rem',
                            background: 'rgba(255, 255, 255, 0.1)',
                            borderRadius: 'var(--radius-xs, 4px)',
                            fontSize: size.tag,
                            fontWeight: 500,
                            fontFamily: 'Lato, sans-serif',
                            color: 'rgba(255, 255, 255, 0.9)',
                            border: '1px solid rgba(255, 255, 255, 0.12)',
                          }}
                        >
                          {tech}
                        </li>
                      ))}
                    </ul>

                    {/* Live site, case study and code */}
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '0.375rem',
                        marginTop: 'auto',
                        paddingTop: deviceType === 'mobile-landscape' ? '0.25rem' : 'var(--space-sm)',
                      }}
                    >
                      {project.links.map((link) => {
                        const key = `${project.title}-${link.label}`;
                        return (
                          <a
                            key={key}
                            href={link.href}
                            target='_blank'
                            rel='noopener noreferrer'
                            aria-label={`${project.title}: ${link.label} (opens in a new tab)`}
                            onMouseEnter={() => setHoveredLink(key)}
                            onMouseLeave={() => setHoveredLink(null)}
                            onFocus={() => setHoveredLink(key)}
                            onBlur={() => setHoveredLink(null)}
                            style={getLinkStyles(key)}
                          >
                            {link.label}
                            <span aria-hidden='true'>↗</span>
                          </a>
                        );
                      })}
                    </div>
                  </div>
                </motion.article>
              ))}
            </motion.div>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
