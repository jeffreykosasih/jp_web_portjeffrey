import React from 'react';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUser,
  faCogs,
  faBriefcase,
  faEnvelope,
} from '@fortawesome/free-solid-svg-icons';

export type SubPage = 'profile' | 'skillset' | 'portfolio' | 'connect';

// Shared by every drawer: which page is open and how to switch to another
export const PageNavContext = React.createContext<{
  activePage: SubPage | null;
  openPage: (page: SubPage) => void;
  onPlayClickSound?: () => void;
} | null>(null);

// Same order and icons as the menu and the island labels
const PAGES: { id: SubPage; label: string; icon: typeof faUser }[] = [
  { id: 'profile', label: 'Profile', icon: faUser },
  { id: 'skillset', label: 'Skillset', icon: faCogs },
  { id: 'portfolio', label: 'Projects', icon: faBriefcase },
  { id: 'connect', label: 'Connect', icon: faEnvelope },
];

// Four round buttons joined by a line, like a progress bar. Lets visitors
// jump straight to another page without going back to the island first.
export default function PageSwitcher({ isDarkMode }: { isDarkMode: boolean }) {
  const nav = React.useContext(PageNavContext);
  if (!nav) return null;
  const brand = isDarkMode ? '#101c34' : '#00445e';
  const size = 40;

  return (
    <nav aria-label='Pages' style={{ display: 'flex', justifyContent: 'center' }}>
      <ol
        style={{
          position: 'relative',
          listStyle: 'none',
          margin: 0,
          padding: 0,
          display: 'flex',
          gap: '1.75rem',
        }}
      >
        {/* The connecting line behind the buttons */}
        <span
          aria-hidden='true'
          style={{
            position: 'absolute',
            top: size / 2 - 1,
            left: size / 2,
            right: size / 2,
            height: 2,
            backgroundColor: 'rgba(255, 255, 255, 0.35)',
          }}
        />
        {PAGES.map((page) => {
          const active = nav.activePage === page.id;
          return (
            <li key={page.id} style={{ position: 'relative' }}>
              <motion.button
                type='button'
                aria-label={page.label}
                aria-current={active ? 'page' : undefined}
                title={page.label}
                disabled={active}
                onClick={() => {
                  nav.onPlayClickSound?.();
                  nav.openPage(page.id);
                }}
                whileHover={active ? undefined : { scale: 1.1 }}
                whileTap={active ? undefined : { scale: 0.95 }}
                style={{
                  width: size,
                  height: size,
                  borderRadius: '50%',
                  border: '2px solid #ffffff',
                  // Active: solid white with the brand icon; others outlined
                  backgroundColor: active ? '#ffffff' : brand,
                  color: active ? brand : '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 15,
                  cursor: active ? 'default' : 'pointer',
                  boxShadow: active ? '0 0 0 4px rgba(255, 255, 255, 0.25)' : 'none',
                }}
              >
                <FontAwesomeIcon icon={page.icon} />
              </motion.button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
