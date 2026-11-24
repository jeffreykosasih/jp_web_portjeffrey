import { DeviceInfo } from './types';

// Common breakpoints for consistent responsive design
export const Breakpoints = {
  mobile: 640, // Portrait mobile
  landscapeMobile: 900, // Landscape mobile (includes iPhone 11, etc.)
  tablet: 1024, // Tablet and small laptops
  desktop: 1440, // Large screens
  landscapeRatio: 1.5, // Landscape mobile threshold
} as const;

// Responsive values for consistent UI across devices
export const ResponsiveValues = {
  buttonSize: {
    mobile: 48,
    landscapeMobile: 44,
    tablet: 50,
    desktop: 50,
  },
  positioning: {
    mobile: 16,
    landscapeMobile: 14,
    tablet: 18,
    desktop: 20,
  },
  positioningBottom: {
    mobile: 20,
    landscapeMobile: 16,
    tablet: 24,
    desktop: 26,
  },
  iconSize: {
    mobile: 18,
    landscapeMobile: 16,
    tablet: 19,
    desktop: 20,
  },
  borderRadius: {
    small: '8px',
    medium: '12px',
    large: '20px',
    button: '9999px',
  },
  zIndex: {
    button: 1001,
    burgerMenu: 10000,
    menu: 9999,
    popup: 2000,
    overlay: 1500,
  },
} as const;

// Device detection helpers
export const getResponsiveValue = <T>(
  deviceInfo: DeviceInfo | undefined,
  values: { mobile: T; landscapeMobile?: T; tablet: T; desktop: T }
): T => {
  if (deviceInfo?.isLandscapeMobile && values.landscapeMobile)
    return values.landscapeMobile;
  if (deviceInfo?.isMobile) return values.mobile;
  if (deviceInfo?.isTablet) return values.tablet;
  return values.desktop;
};

export const getResponsiveValueComplete = <T>(
  deviceInfo: DeviceInfo | undefined,
  values: { mobile: T; landscapeMobile: T; tablet: T; desktop: T }
): T => {
  if (deviceInfo?.isLandscapeMobile) return values.landscapeMobile;
  if (deviceInfo?.isMobile) return values.mobile;
  if (deviceInfo?.isTablet) return values.tablet;
  return values.desktop;
};

// Component-specific responsive helpers
export const getButtonSize = (deviceInfo?: DeviceInfo) =>
  getResponsiveValueComplete(deviceInfo, ResponsiveValues.buttonSize);

export const getPositioning = (deviceInfo?: DeviceInfo) =>
  getResponsiveValueComplete(deviceInfo, ResponsiveValues.positioning);

export const getBottomPositioning = (deviceInfo?: DeviceInfo) =>
  getResponsiveValueComplete(deviceInfo, ResponsiveValues.positioningBottom);

export const getIconSize = (deviceInfo?: DeviceInfo) =>
  `${getResponsiveValueComplete(deviceInfo, ResponsiveValues.iconSize)}px`;

// Theme color schemes
export const ColorSchemes = {
  primary: {
    dark: '#162542',
    light: '#12508f',
  },
  accent: {
    yellow: '#FFEEA9',
    cream: '#FAF1E6',
    // Night accent: dark mode is navy and yellow, as bright mode is blue and white
    night: '#ffd36b',
  },
  text: {
    primary: '#ffffff',
    secondary: 'rgba(255, 255, 255, 0.8)',
    dark: '#0f172a',
  },
} as const;

// Button styling helper
// Bright mode: blue with white icons (white when hovered).
// Dark mode: navy with yellow icons (yellow when hovered).
export const getButtonColors = (isDarkMode: boolean, isHovered: boolean) => {
  const accent = isDarkMode ? ColorSchemes.accent.night : ColorSchemes.text.primary;
  const base = isDarkMode ? ColorSchemes.primary.dark : ColorSchemes.primary.light;
  return {
    backgroundColor: isHovered ? accent : base,
    color: isHovered ? base : accent,
  };
};

// Animation transitions
export const Transitions = {
  fast: 'all 0.15s ease',
  normal: 'all 0.2s ease-in-out',
  slow: 'all 0.3s ease',
} as const;
