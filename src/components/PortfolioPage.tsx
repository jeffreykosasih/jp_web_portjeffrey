import React from 'react';
import { motion } from 'framer-motion';
import { DeviceInfo } from '../lib/types';
import SideDrawer, { DrawerTitle, getDrawerDevice } from './SideDrawer';
import { PROJECT_CATEGORIES, ProjectCategory, projects } from '../lib/projects';
import ProjectRoulette from './ProjectRoulette';

interface PortfolioPageProps {
  isVisible: boolean;
  onClose: () => void;
  onOpenBurgerMenu: (slideDirection?: 'left' | 'right') => void;
  isDarkMode: boolean;
  shouldAnimateText?: boolean;
  deviceInfo?: DeviceInfo;
  onPlayClickSound?: () => void;
}

// Projects: Web / Design tabs over a roulette of project covers. Only the
// covers show at first; a project's words come up when its cover is hovered
// (or tapped on a touch screen).
export default function PortfolioPage({
  isVisible,
  onClose,
  isDarkMode,
  shouldAnimateText = true,
  deviceInfo,
  onPlayClickSound,
}: PortfolioPageProps) {
  const [category, setCategory] = React.useState<ProjectCategory>('web');
  const device = getDrawerDevice(deviceInfo);
  const isPhone = device === 'mobile-portrait' || device === 'mobile-landscape';
  const shown = React.useMemo(() => projects.filter((p) => p.category === category), [category]);
  // Touch screens have no hover, so the cover is tapped instead
  const isTouch =
    typeof window !== 'undefined' && window.matchMedia('(hover: none)').matches;

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

        {/* Roulette of project covers; the words show on hover or tap */}
        <ProjectRoulette
          key={category}
          projects={shown}
          isTouch={isTouch}
          onPlayClickSound={onPlayClickSound}
        />
      </motion.div>
    </SideDrawer>
  );
}
