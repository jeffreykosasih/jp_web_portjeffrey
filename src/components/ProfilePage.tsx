import React from 'react';
import { motion } from 'framer-motion';
import ProfileCard from './ProfileCard';
import SideDrawer, { DrawerTitle, getDrawerDevice } from './SideDrawer';
import { DeviceInfo } from '../lib/types';
import { ABOUT, PROFILE } from '../lib/profile';

interface ProfilePageProps {
  isVisible: boolean;
  onClose: () => void;
  onOpenBurgerMenu: (slideDirection?: 'left' | 'right') => void;
  onNavigate: (page: 'connect') => void;
  isDarkMode: boolean;
  shouldAnimateText?: boolean;
  deviceInfo?: DeviceInfo;
  onPlayClickSound?: () => void;
}

// Profile: a short intro and the profile card, sized for half the screen.
export default function ProfilePage({
  isVisible,
  onClose,
  onNavigate,
  isDarkMode,
  shouldAnimateText = true,
  deviceInfo,
  onPlayClickSound,
}: ProfilePageProps) {
  const device = getDrawerDevice(deviceInfo);
  // Phones in landscape are short, so text and card sit side by side
  const sideBySide = device === 'mobile-landscape';
  const fade = (delay: number) =>
    shouldAnimateText
      ? {
          initial: { opacity: 0, y: 16 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.45, delay },
        }
      : {};

  return (
    <SideDrawer
      isVisible={isVisible}
      onClose={onClose}
      isDarkMode={isDarkMode}
      deviceInfo={deviceInfo}
      label='Profile'
      side='right'
      onPlayClickSound={onPlayClickSound}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: sideBySide ? 'row' : 'column',
          alignItems: 'center',
          gap: sideBySide ? '1.5rem' : '2rem',
        }}
      >
        <motion.div {...fade(0.35)} style={{ flex: sideBySide ? 1 : 'none', width: '100%' }}>
          <DrawerTitle title='About Me' deviceInfo={deviceInfo} />
          <p
            style={{
              margin: 0,
              fontFamily: 'Lato, sans-serif',
              fontSize: sideBySide ? '1rem' : device === 'mobile-portrait' ? '1.0625rem' : '1.25rem',
              lineHeight: 1.6,
              color: '#ffffff',
              textAlign: 'center',
              maxWidth: '30rem',
              marginInline: 'auto',
            }}
          >
            {ABOUT}
          </p>
        </motion.div>

        <motion.div {...fade(0.5)} style={{ flex: 'none', width: sideBySide ? 'auto' : '100%' }}>
          <ProfileCard
            className='pc-compact'
            isDarkMode={isDarkMode}
            name={PROFILE.name}
            title={PROFILE.role}
            contactText='Contact Me'
            onNavigate={onNavigate}
          />
        </motion.div>
      </div>
    </SideDrawer>
  );
}
