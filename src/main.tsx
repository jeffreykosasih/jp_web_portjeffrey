import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css'; // Tailwind CSS
import { motion, AnimatePresence } from 'framer-motion';

import LazyScene from './components/LazyScene';
import PageDock, { PhoneButtonBand, SubPage } from './components/PageSwitcher';
import { DrawerInstantContext } from './components/SideDrawer';

// Length of each half of the fade when switching between pages
const FADE_MS = 280;
import ThemeToggle from './components/ThemeToggle';
import BurgerMenu from './components/BurgerMenu';
import CreditsButton from './components/CreditsButton';
import CreditsPopup from './components/CreditsPopup';
import SoundToggle from './components/SoundToggle';
import ProfilePage from './components/ProfilePage';
import SkillsetPage from './components/SkillsetPage';
import PortfolioPage from './components/PortfolioPage';
import ConnectPage from './components/ConnectPage';
import AppLoadingScreen from './components/AppLoadingScreen';
import { Tide, WriteOn } from './components/Letters';
import ClickSpark from './components/ClickSpark';

import OceanAudio from './components/OceanAudio';
import useDeviceDetection from './hooks/useDeviceDetection';
import { useClickSound } from './hooks/useClickSound';
import { PROFILE } from './lib/profile';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLightbulb, faMoon } from '@fortawesome/free-solid-svg-icons';
import { HiSpeakerWave, HiSpeakerXMark } from 'react-icons/hi2';
import { SiSketchfab } from 'react-icons/si';

// Type definitions
type PageName = 'home' | 'profile' | 'skillset' | 'portfolio' | 'connect';

// Memoized components for better performance
const MemoizedLazyScene = React.memo(LazyScene);
const MemoizedThemeToggle = React.memo(ThemeToggle);
const MemoizedBurgerMenu = React.memo(BurgerMenu);
const MemoizedCreditsButton = React.memo(CreditsButton);
const MemoizedCreditsPopup = React.memo(CreditsPopup);
const MemoizedSoundToggle = React.memo(SoundToggle);

// Remembers whether a visitor turned the wave sound on. The sound starts off,
// so nobody opening the site at work gets surprised by ocean noise.
const WAVE_SOUND_KEY = 'portjeffrey-wave-sound';

const getInitialWaveSound = (): boolean => {
  try {
    return localStorage.getItem(WAVE_SOUND_KEY) === 'on';
  } catch {
    return false;
  }
};

function App(): React.JSX.Element {
  const deviceInfo = useDeviceDetection();
  // Phones (portrait and landscape) get their own layout: a close view of
  // the dock, the four page buttons along the bottom, and sound, theme and
  // credits moved into the burger menu. Tablets and computers are unchanged.
  const isPhone = deviceInfo.isMobile || deviceInfo.isLandscapeMobile;

  const getInitialTheme = (): boolean => {
    const currentHour = new Date().getHours();
    if (currentHour >= 18 || currentHour < 6) {
      return true; // Dark mode
    }
    return false; // Light mode (covers 6 AM to 5:59 PM)
  };

  const [isDarkMode, setIsDarkMode] = useState<boolean>(getInitialTheme());
  const [activePage, setActivePage] = useState<PageName | null>(null);
  // The landmark the camera is zoomed to. It leads activePage: the camera
  // flies in first, then the page's panel opens.
  const [focusedPage, setFocusedPage] = useState<PageName | null>(null);
  const pageOpenTimer = useRef<number | null>(null);
  const [isBurgerMenuOpen, setIsBurgerMenuOpen] = useState<boolean>(false);
  const [shouldAnimatePageText, setShouldAnimatePageText] =
    useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showMainApp, setShowMainApp] = useState<boolean>(false);
  // The tide that washes the opening screen off the island
  const [showTide, setShowTide] = useState<boolean>(false);
  const [isThemeToggleHidden, setIsThemeToggleHidden] =
    useState<boolean>(false);
  const [isCreditsPopupVisible, setIsCreditsPopupVisible] =
    useState<boolean>(false);
  const [shouldDelayHomeButtonsOnce, setShouldDelayHomeButtonsOnce] =
    useState<boolean>(false);
  const [triggerInitialZoom, setTriggerInitialZoom] = useState<boolean>(false);

  // While a page drawer is open, the corner buttons gather on the free side
  // of the screen (every page opens on the right). Order from the screen
  // edge inward.
  // Follows the page being opened (set on click), so the buttons don't
  // flicker while one drawer closes and the next opens
  // Every page opens on the right, so the free side is always the left
  const freeSide: 'left' | 'right' | null = focusedPage ? 'left' : null;
  const dockFor = (button: 'credits' | 'sound' | 'theme') => {
    if (!freeSide) return null;
    const order =
      freeSide === 'left'
        ? ['credits', 'sound', 'theme']
        : ['theme', 'sound', 'credits'];
    // Portrait phones: credits, sound, theme take footer slots 4-6
    const slot = 4 + ['credits', 'sound', 'theme'].indexOf(button);
    return { side: freeSide, index: order.indexOf(button), slot };
  };

  const toggleTheme = (): void => {
    setIsDarkMode((prevMode) => !prevMode);
  };

  const toggleCreditsPopup = (): void => {
    setIsCreditsPopupVisible((prev) => !prev);
  };

  // One switch for all sound: the ocean waves and the click sounds
  const [isWaveSoundOn, setIsWaveSoundOn] =
    useState<boolean>(getInitialWaveSound);
  // Read by OceanAudio and the click sound during the same click that
  // toggles it, before React re-renders, so turning the sound off is silent.
  const waveSoundOnRef = useRef<boolean>(isWaveSoundOn);
  const isSoundOn = useCallback(() => waveSoundOnRef.current, []);
  const { playClickSound } = useClickSound(0.5, isSoundOn);

  const toggleWaveSound = (): void => {
    const next = !waveSoundOnRef.current;
    waveSoundOnRef.current = next;
    setIsWaveSoundOn(next);
    try {
      localStorage.setItem(WAVE_SOUND_KEY, next ? 'on' : 'off');
    } catch {
      // Storage unavailable: the choice lasts for this visit only.
    }
  };

  // Switching from one open page to another fades the screen out, jumps the
  // camera and drawer while it's covered, then fades back in
  const [isFadeCovering, setIsFadeCovering] = useState(false);
  const [isInstantSwitch, setIsInstantSwitch] = useState(false);
  const fadeTimers = useRef<number[]>([]);

  const switchPageWithFade = (next: PageName) => {
    fadeTimers.current.forEach((t) => window.clearTimeout(t));
    // Set first, so the open drawer already knows to leave without sliding
    setIsInstantSwitch(true);
    setIsFadeCovering(true);
    fadeTimers.current = [
      window.setTimeout(() => {
        setFocusedPage(next);
        setActivePage(next);
      }, FADE_MS),
      window.setTimeout(() => setIsFadeCovering(false), FADE_MS + 160),
      window.setTimeout(() => setIsInstantSwitch(false), FADE_MS * 2 + 400),
    ];
  };

  const openPage = (pageName: PageName): void => {
    setShouldAnimatePageText(true);
    if (pageOpenTimer.current) window.clearTimeout(pageOpenTimer.current);
    const next = pageName === 'home' ? null : pageName;
    if (next && activePage && next !== activePage) {
      switchPageWithFade(next);
      return;
    }
    setFocusedPage(next);
    if (!next) {
      setActivePage(null);
      return;
    }
    // Close any open panel so the zoom to the new landmark is visible,
    // then open the panel once the camera has mostly arrived.
    setActivePage(null);
    const reduceMotion = window.matchMedia?.(
      '(prefers-reduced-motion: reduce)'
    ).matches;
    pageOpenTimer.current = window.setTimeout(
      () => setActivePage(next),
      reduceMotion ? 0 : 1000
    );
  };

  const closePage = (): void => {
    if (pageOpenTimer.current) window.clearTimeout(pageOpenTimer.current);
    setActivePage(null);
    setFocusedPage(null);
  };

  const handleExploreClick = (): void => {
    setShowTide(true);
    window.setTimeout(() => setShowTide(false), 1700); // the tide is out by 1.5s
    setShowMainApp(true);
    setShouldDelayHomeButtonsOnce(true);
    setTriggerInitialZoom(true); // Trigger the zoom animation
    setTimeout(() => {
      setIsLoading(false);
    }, 100);
  };

  useEffect(() => {
    if (!shouldDelayHomeButtonsOnce) return;

    const timer = window.setTimeout(() => {
      setShouldDelayHomeButtonsOnce(false);
    }, 3200);

    return () => window.clearTimeout(timer);
  }, [shouldDelayHomeButtonsOnce]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Responsive styles based on device detection - memoized for performance
  const responsiveStyles = React.useMemo(() => {
    const baseStyles = {
      width: '100vw',
      height: '100dvh',
      position: 'relative' as const,
      backgroundColor: isDarkMode ? '#162542' : '#12508f',
    };

    // Add safe area padding for mobile devices
    if (deviceInfo.isMobile || deviceInfo.isLandscapeMobile) {
      return {
        ...baseStyles,
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
      };
    }

    return baseStyles;
  }, [isDarkMode, deviceInfo.isMobile]);

  const nameTextStyles = React.useMemo(() => {
    const baseStyles = {
      position: 'fixed' as const,
      // Display voice: the joined-up script (see .type-display)
      fontFamily: "'Playwrite AU NSW', 'Baloo 2', cursive",
      fontWeight: '400' as const,
      // White by day, like the page picker; yellow at night. No shadow.
      color: isDarkMode ? '#ffd36b' : '#ffffff',
      pointerEvents: 'none' as const,
      userSelect: 'none' as const,
      zIndex: 1000,
      letterSpacing: '-0.01em',
    };

    // Enhanced mobile positioning with landscape mobile support
    if (deviceInfo.isLandscapeMobile) {
      // Landscape mobile - optimized for limited height, desktop-like proportions
      return {
        ...baseStyles,
        top: 'max(env(safe-area-inset-top), 8px)', // Minimal top margin
        left: 'max(env(safe-area-inset-left), 16px)',
        fontSize: '1.0rem', // Smaller than mobile for landscape
      };
    } else if (deviceInfo.isMobile) {
      if (deviceInfo.orientation === 'landscape') {
        // Regular mobile landscape - legacy support
        return {
          ...baseStyles,
          top: 'max(env(safe-area-inset-top), 12px)',
          left: 'max(env(safe-area-inset-left), 20px)',
          fontSize: '1.1rem',
        };
      } else {
        // Portrait mobile - more standard positioning
        return {
          ...baseStyles,
          top: 'max(env(safe-area-inset-top), 20px)',
          left: 'max(env(safe-area-inset-left), 20px)',
          fontSize: '1.3rem',
        };
      }
    } else if (deviceInfo.isTablet) {
      if (deviceInfo.orientation === 'landscape') {
        return {
          ...baseStyles,
          top: 'max(env(safe-area-inset-top), 16px)',
          left: 'max(env(safe-area-inset-left), 24px)',
          fontSize: '1.25rem',
        };
      } else {
        return {
          ...baseStyles,
          top: 'max(env(safe-area-inset-top), 24px)',
          left: 'max(env(safe-area-inset-left), 24px)',
          fontSize: '1.4rem',
        };
      }
    } else {
      return {
        ...baseStyles,
        top: '20px',
        left: '20px',
        fontSize: '1.5rem',
      };
    }
  }, [
    isDarkMode,
    deviceInfo.isMobile,
    deviceInfo.isTablet,
    deviceInfo.isLandscapeMobile,
    deviceInfo.orientation,
  ]);

  // ClickSpark configuration with landscape mobile support
  const clickSparkProps = React.useMemo(
    () => ({
      sparkColor: '#FFFFFF', // Consistently white for all themes
      sparkSize: deviceInfo.isLandscapeMobile
        ? 10 // Slightly larger than desktop for touch, smaller than mobile
        : deviceInfo.isMobile
        ? 8
        : 12,
      sparkRadius: deviceInfo.isLandscapeMobile
        ? 22 // Medium radius for landscape mobile
        : deviceInfo.isMobile
        ? 20
        : 25,
      sparkCount: deviceInfo.isLowPerformance
        ? 6
        : deviceInfo.isLandscapeMobile
        ? 8
        : 10,
      duration: 600,
      easing: 'ease-out' as const,
      extraScale: 1.2,
    }),
    [
      deviceInfo.isMobile,
      deviceInfo.isLandscapeMobile,
      deviceInfo.isLowPerformance,
    ]
  );

  return (
    <div style={responsiveStyles}>
      {/* Main App - Always present once triggered */}
      {showMainApp && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.2, ease: 'easeInOut' }}
          style={{
            width: '100vw',
            height: '100vh',
            position: 'absolute',
            top: 0,
            left: 0,
            zIndex: 1,
          }}
        >
          <ClickSpark {...{ ...clickSparkProps, disabled: isBurgerMenuOpen }}>
            <div
              style={{
                width: '100vw',
                height: '100vh',
                position: 'relative',
                background: isDarkMode
                  ? 'linear-gradient(to bottom, #162542 0%, #020918 100%)'
                  : 'linear-gradient(to bottom, #12508f 0%, #12508f 100%)',
              }}
            >
              {/* Name in top left corner */}
              {/* written on as the tide goes out */}
              <motion.div
                aria-label={PROFILE.name}
                style={nameTextStyles}
              >
                <WriteOn text={PROFILE.name} startMs={800} durationMs={1000} />
              </motion.div>

              <MemoizedLazyScene
                isDarkMode={isDarkMode}
                showSea={false}
                deviceInfo={deviceInfo}
                onNavigateToConnect={() => openPage('connect')}
                onNavigateToPage={(page: string) => openPage(page as PageName)}
                onPlayClickSound={playClickSound}
                isBurgerMenuOpen={isBurgerMenuOpen}
                triggerInitialZoom={triggerInitialZoom}
                snapCamera={isInstantSwitch}
                focusPage={focusedPage}
                showHomeButtons={
                  focusedPage === null &&
                  !isBurgerMenuOpen &&
                  !isCreditsPopupVisible
                }
                homeButtonsIntroDelayMs={shouldDelayHomeButtonsOnce ? 3000 : 0}
              />

              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  pointerEvents: 'none', // Allow clicks to pass through to 3D scene
                }}
              >
                {!isPhone && (
                <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.6, delay: 0.8 }}
                  style={{ pointerEvents: 'auto' }}
                >
                  <MemoizedThemeToggle
                    isDarkMode={isDarkMode}
                    onToggle={() => {
                      playClickSound();
                      toggleTheme();
                    }}
                    isHidden={isThemeToggleHidden}
                    deviceInfo={deviceInfo}
                    dock={dockFor('theme')}
                  />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.6, delay: 0.9 }}
                  style={{ pointerEvents: 'auto' }}
                >
                  <MemoizedCreditsButton
                    isDarkMode={isDarkMode}
                    onToggle={() => {
                      playClickSound();
                      toggleCreditsPopup();
                    }}
                    deviceInfo={deviceInfo}
                    dock={dockFor('credits')}
                  />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.6, delay: 0.95 }}
                  style={{ pointerEvents: 'auto' }}
                >
                  <MemoizedSoundToggle
                    isDarkMode={isDarkMode}
                    isSoundOn={isWaveSoundOn}
                    onToggle={() => {
                      toggleWaveSound();
                      playClickSound(); // heard when turning sound on, not off
                    }}
                    deviceInfo={deviceInfo}
                    dock={dockFor('sound')}
                  />
                </motion.div>

                </>
                )}

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.6, delay: 1.0 }}
                  style={{ pointerEvents: 'auto' }}
                >
                  <MemoizedBurgerMenu
                    isDarkMode={isDarkMode}
                    onNavigate={openPage}
                    isOpen={isBurgerMenuOpen}
                    onOpenChange={setIsBurgerMenuOpen}
                    activePage={activePage}
                    onHideThemeToggle={setIsThemeToggleHidden}
                    deviceInfo={deviceInfo}
                    onPlayClickSound={playClickSound}
                    extraActions={
                      isPhone
                        ? [
                            {
                              key: 'sound',
                              label: isWaveSoundOn ? 'Turn sound off' : 'Turn sound on',
                              icon: isWaveSoundOn ? <HiSpeakerWave /> : <HiSpeakerXMark />,
                              onClick: () => {
                                toggleWaveSound();
                                playClickSound(); // heard when turning sound on
                              },
                            },
                            {
                              key: 'theme',
                              label: isDarkMode ? 'Switch to light mode' : 'Switch to dark mode',
                              // same icons as the theme button on larger screens
                              icon: <FontAwesomeIcon icon={isDarkMode ? faMoon : faLightbulb} />,
                              onClick: () => {
                                playClickSound();
                                toggleTheme();
                              },
                            },
                            {
                              key: 'credits',
                              label: 'Credits',
                              icon: <SiSketchfab />,
                              closesMenu: true,
                              onClick: () => {
                                playClickSound();
                                setIsCreditsPopupVisible(true);
                              },
                            },
                          ]
                        : []
                    }
                  />
                </motion.div>
              </div>

              {/* Page Components (drawers skip their slide during a fade switch) */}
              <DrawerInstantContext.Provider value={isInstantSwitch}>
              <ProfilePage
                isVisible={activePage === 'profile'}
                onClose={closePage}
                isDarkMode={isDarkMode}
                shouldAnimateText={shouldAnimatePageText}
                deviceInfo={deviceInfo}
                onPlayClickSound={playClickSound}
              />
              <SkillsetPage
                isVisible={activePage === 'skillset'}
                onClose={closePage}
                isDarkMode={isDarkMode}
                shouldAnimateText={shouldAnimatePageText}
                deviceInfo={deviceInfo}
                onPlayClickSound={playClickSound}
              />
              <PortfolioPage
                isVisible={activePage === 'portfolio'}
                onClose={closePage}
                isDarkMode={isDarkMode}
                shouldAnimateText={shouldAnimatePageText}
                deviceInfo={deviceInfo}
                onPlayClickSound={playClickSound}
              />
              <ConnectPage
                isVisible={activePage === 'connect'}
                onClose={closePage}
                isDarkMode={isDarkMode}
                shouldAnimateText={shouldAnimatePageText}
                deviceInfo={deviceInfo}
              />
              </DrawerInstantContext.Provider>

              {/* Fade cover used when switching between pages */}
              <AnimatePresence>
                {isFadeCovering && (
                  <motion.div
                    key='page-fade'
                    aria-hidden='true'
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: FADE_MS / 1000, ease: 'easeInOut' }}
                    style={{
                      position: 'fixed',
                      inset: 0,
                      zIndex: 1700,
                      backgroundColor: isDarkMode ? '#101c34' : '#0b3a73',
                      pointerEvents: 'none',
                    }}
                  />
                )}
              </AnimatePresence>

              {/* Portrait phones: a band behind the bottom row of buttons */}
              <PhoneButtonBand
                freeSide={freeSide}
                isDarkMode={isDarkMode}
                deviceInfo={deviceInfo}
              />

              {/* Page buttons beside the corner buttons while a page is open */}
              <PageDock
                activePage={focusedPage as SubPage | null}
                freeSide={freeSide}
                isDarkMode={isDarkMode}
                deviceInfo={deviceInfo}
                visibleOnIsland={
                  !isBurgerMenuOpen &&
                  !isCreditsPopupVisible &&
                  !isLoading &&
                  !shouldDelayHomeButtonsOnce
                }
                onOpen={(page) => {
                  playClickSound();
                  openPage(page);
                }}
              />

              {/* Credits Popup */}
              <MemoizedCreditsPopup
                isVisible={isCreditsPopupVisible}
                onClose={() => setIsCreditsPopupVisible(false)}
                isDarkMode={isDarkMode}
                deviceInfo={deviceInfo}
              />
            </div>
          </ClickSpark>
        </motion.div>
      )}

      {showTide && (
        <Tide color={isDarkMode ? '#162542' : '#12508f'} />
      )}

      {/* Loading Screen - Overlaid on top */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: 'easeInOut' }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              zIndex: 10,
            }}
          >
            <AppLoadingScreen
              onExploreClick={handleExploreClick}
              isDarkMode={isDarkMode}
              deviceInfo={deviceInfo}
              onPlayClickSound={playClickSound}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Performance monitoring */}

      {/* Ocean background audio - starts after loading screen */}
      <OceanAudio
        isActive={showMainApp && !isLoading && isWaveSoundOn}
        canPlay={() => waveSoundOnRef.current}
        volume={0.5}
      />
    </div>
  );
}

const rootElement = document.getElementById('root');

if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  // PERFORMANCE FIX: Disable StrictMode in development to prevent double renders
  root.render(<App />);
} else {
  console.error(
    'Failed to find the root element. Ensure #root exists in your HTML.'
  );
}
