import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DeviceInfo } from '../lib/types';
import SideDrawer, { DrawerTitle, getDrawerDevice } from './SideDrawer';
import { PROJECT_CATEGORIES, ProjectCategory, projects } from '../lib/projects';

interface PortfolioPageProps {
  isVisible: boolean;
  onClose: () => void;
  onOpenBurgerMenu: (slideDirection?: 'left' | 'right') => void;
  isDarkMode: boolean;
  shouldAnimateText?: boolean;
  deviceInfo?: DeviceInfo;
  onPlayClickSound?: () => void;
}

// Projects: Web / Design tabs over a grid of cards that scrolls down.
// Two columns where the half-screen drawer is wide enough, one on phones.
export default function PortfolioPage({
  isVisible,
  onClose,
  isDarkMode,
  shouldAnimateText = true,
  deviceInfo,
  onPlayClickSound,
}: PortfolioPageProps) {
  const [category, setCategory] = React.useState<ProjectCategory>('web');
  const [hoveredLink, setHoveredLink] = React.useState<string | null>(null);
  const device = getDrawerDevice(deviceInfo);
  const isPhone = device === 'mobile-portrait' || device === 'mobile-landscape';
  const columns = device === 'mobile-portrait' ? 1 : 2;
  const brand = isDarkMode ? '#101c34' : '#0b3a73';
  const shown = projects.filter((p) => p.category === category);

  const linkStyle = (key: string): React.CSSProperties => {
    const hovered = hoveredLink === key;
    return {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.3em',
      minHeight: '2.25rem',
      padding: '0 0.75rem',
      borderRadius: '999px',
      border: '1px solid var(--ui-line)',
      backgroundColor: hovered ? 'var(--ui-accent)' : 'transparent',
      color: hovered ? 'var(--ui-on-accent)' : 'var(--ui-ink)',
      fontFamily: "'Baloo 2', sans-serif",
      fontWeight: 700,
      fontSize: '0.875rem',
      textDecoration: 'none',
      whiteSpace: 'nowrap',
      transition: 'background-color 0.15s ease, color 0.15s ease',
    };
  };

  return (
    <SideDrawer
      isVisible={isVisible}
      onClose={onClose}
      isDarkMode={isDarkMode}
      deviceInfo={deviceInfo}
      label='Projects'
      side='right'
      align='top'
      onPlayClickSound={onPlayClickSound}
    >
      <motion.div
        initial={shouldAnimateText ? { opacity: 0, y: 16 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.35 }}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
      >
        <DrawerTitle
          title='Projects'
          subtitle='Websites I built and apps I designed.'
          deviceInfo={deviceInfo}
        />

        {/* Web / Design tabs */}
        <div
          role='tablist'
          aria-label='Project type'
          style={{
            display: 'flex',
            gap: '0.25rem',
            padding: '0.25rem',
            borderRadius: '999px',
            backgroundColor: 'rgba(0, 0, 0, 0.2)',
            marginBottom: device === 'mobile-landscape' ? '1rem' : '1.75rem',
          }}
        >
          {PROJECT_CATEGORIES.map((c) => {
            const active = c.id === category;
            const count = projects.filter((p) => p.category === c.id).length;
            return (
              <button
                key={c.id}
                type='button'
                role='tab'
                aria-selected={active}
                onClick={() => {
                  onPlayClickSound?.();
                  setCategory(c.id);
                }}
                style={{
                  border: 'none',
                  cursor: 'pointer',
                  borderRadius: '999px',
                  minHeight: '2.5rem',
                  padding: isPhone ? '0.5rem 1.1rem' : '0.6rem 1.5rem',
                  fontFamily: "'Baloo 2', sans-serif",
                  fontWeight: 700,
                  fontSize: isPhone ? '0.875rem' : '1rem',
                  backgroundColor: active ? 'var(--ui-accent)' : 'transparent',
                  color: active ? 'var(--ui-on-accent)' : 'var(--ui-ink)',
                  transition: 'background-color 0.2s ease, color 0.2s ease',
                }}
              >
                {c.label} <span style={{ fontWeight: 600 }}>({count})</span>
              </button>
            );
          })}
        </div>

        {/* Cards */}
        <AnimatePresence mode='wait'>
          <motion.ul
            key={category}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{
              listStyle: 'none',
              margin: 0,
              padding: 0,
              width: '100%',
              display: 'grid',
              gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
              gap: isPhone ? '0.875rem' : '1.25rem',
            }}
          >
            {shown.map((project) => (
              <li
                key={project.title}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  borderRadius: '1rem',
                  overflow: 'hidden',
                  backgroundColor: 'rgba(0, 0, 0, 0.2)', // keeps white text above 7:1
                }}
              >
                <img
                  src={project.image}
                  alt=''
                  loading='lazy'
                  style={{
                    display: 'block',
                    width: '100%',
                    aspectRatio: device === 'mobile-landscape' ? '16 / 8' : '16 / 9',
                    objectFit: 'cover',
                  }}
                />
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.4rem',
                    padding: isPhone ? '0.85rem 0.9rem 1rem' : '1rem 1.1rem 1.15rem',
                    flex: 1,
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      fontFamily: "'Baloo 2', sans-serif",
                      fontWeight: 700,
                      fontSize: '0.75rem',
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      color: 'var(--ui-ink-muted)',
                    }}
                  >
                    {project.kind}
                  </p>
                  <h2
                    style={{
                      margin: 0,
                      fontFamily: "'Baloo 2', sans-serif",
                      fontWeight: 800,
                      fontSize: isPhone ? '1.1rem' : '1.2rem',
                      lineHeight: 1.2,
                      color: 'var(--ui-ink)',
                    }}
                  >
                    {project.title}
                  </h2>
                  <p
                    style={{
                      margin: 0,
                      fontFamily: "'Baloo 2', sans-serif",
                      fontSize: '0.9rem',
                      lineHeight: 1.45,
                      color: 'var(--ui-ink)',
                    }}
                  >
                    {project.summary}
                  </p>
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '0.4rem',
                      marginTop: 'auto',
                      paddingTop: '0.5rem',
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
                          style={linkStyle(key)}
                        >
                          {link.label}
                          <span aria-hidden='true'>↗</span>
                        </a>
                      );
                    })}
                  </div>
                </div>
              </li>
            ))}
          </motion.ul>
        </AnimatePresence>
      </motion.div>
    </SideDrawer>
  );
}
