import React from 'react';
import { DeviceInfo } from './types';
import {
  getButtonSize,
  getPositioning,
  getBottomPositioning,
  getIconSize,
  getButtonColors,
  ResponsiveValues,
  Transitions,
  getResponsiveValue,
} from './responsiveUtils';

export type ButtonPosition =
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right';

export interface ButtonConfig {
  position: ButtonPosition;
  isDarkMode: boolean;
  isHovered: boolean;
  deviceInfo?: DeviceInfo;
  zIndex?: number;
  size?: 'small' | 'medium' | 'large';
}

// Enhanced button styles with responsive sizing options
export const getButtonStyles = ({
  position,
  isDarkMode,
  isHovered,
  deviceInfo,
  zIndex = ResponsiveValues.zIndex.button,
  size = 'medium',
}: ButtonConfig): React.CSSProperties => {
  const buttonSize = getResponsiveButtonSize(deviceInfo, size);
  const offset = getPositioning(deviceInfo);
  const bottomOffset = getBottomPositioning(deviceInfo);
  const colors = getButtonColors(isDarkMode, isHovered);
  const positionStyles = getPositionStyles(position, offset, bottomOffset);

  return {
    borderRadius: ResponsiveValues.borderRadius.button,
    position: 'fixed',
    zIndex,
    transition: Transitions.normal,
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    width: `${buttonSize}px`,
    height: `${buttonSize}px`,
    ...colors,
    ...positionStyles,
  };
};

// Position-specific styles
const getPositionStyles = (
  position: ButtonPosition,
  offset: number,
  bottomOffset: number
): React.CSSProperties => {
  const offsetPx = `${offset}px`;
  const bottomOffsetPx = `${bottomOffset}px`;

  switch (position) {
    case 'top-left':
      return { top: offsetPx, left: offsetPx };
    case 'top-right':
      return { top: offsetPx, right: offsetPx };
    case 'bottom-left':
      return { bottom: bottomOffsetPx, left: offsetPx };
    case 'bottom-right':
      return { bottom: bottomOffsetPx, right: offsetPx };
    default:
      return {};
  }
};

// Enhanced button sizing with small/medium/large options
const getResponsiveButtonSize = (
  deviceInfo?: DeviceInfo,
  size: 'small' | 'medium' | 'large' = 'medium'
) => {
  const baseSize = getButtonSize(deviceInfo);
  const multipliers = { small: 0.8, medium: 1, large: 1.2 };
  return Math.round(baseSize * multipliers[size]);
};

// Touch-friendly button sizing for mobile
export const getTouchTargetSize = (deviceInfo?: DeviceInfo) =>
  getResponsiveValue(deviceInfo, {
    mobile: 44,
    landscapeMobile: 40,
    tablet: 48,
    desktop: 44,
  });

export const getResponsiveIconSize = (deviceInfo?: DeviceInfo) =>
  getIconSize(deviceInfo);

// Hover event handlers with sound support
export const createHoverHandlers = (
  setIsHovered: (hovered: boolean) => void,
  onHoverSound?: () => void
) => ({
  onMouseEnter: () => {
    setIsHovered(true);
    onHoverSound?.();
  },
  onMouseLeave: () => {
    setIsHovered(false);
  },
});

export const getIconColor = (isDarkMode: boolean, isHovered: boolean) => {
  const colors = getButtonColors(isDarkMode, isHovered);
  return colors.color;
};

// While a page drawer is open, the corner buttons (credits, sound, theme)
// gather on the side of the screen the drawer leaves free, above the drawer,
// so none of them is hidden. `index` counts from the screen edge inward.
export interface ButtonDock {
  side: 'left' | 'right';
  index: number;
  /** Extra px along the row (or up the stack), e.g. to separate groups */
  extra?: number;
  /** Which row up from the bottom (0 = the corner buttons' row) */
  row?: number;
  /** Portrait phones: position in the footer row inside the drawer,
   * 0-3 the page buttons, 4-6 credits, sound, theme */
  slot?: number;
}

const DOCK_GAP_PX = 12;
// The strip phones keep free beside a drawer: 3.25rem, measured from the
// root font size so it matches the drawer exactly
const phoneStripPx = () => {
  if (typeof window === 'undefined') return 52;
  const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  return 3.25 * rem;
};

// Portrait phones: all seven buttons sit in one row at the bottom of the
// open drawer, on a band of their own (see PhoneButtonBand)
const FOOTER_SLOTS = 7;
const FOOTER_GAP_PX = 6;
const FOOTER_GROUP_GAP_PX = 12; // between the page buttons and the rest
const FOOTER_SIDE_PADDING_PX = 10;
export const FOOTER_BOTTOM_PX = 12;

export const getPhoneFooter = (freeSide: 'left' | 'right') => {
  const vw = typeof window !== 'undefined' ? window.innerWidth : 375;
  const strip = phoneStripPx();
  const drawerWidth = vw - strip;
  // The drawer covers the side opposite the free strip
  const drawerLeft = freeSide === 'left' ? strip : 0;
  const room = drawerWidth - 2 * FOOTER_SIDE_PADDING_PX;
  const size = Math.min(
    40,
    Math.floor((room - (FOOTER_SLOTS - 1) * FOOTER_GAP_PX - FOOTER_GROUP_GAP_PX) / FOOTER_SLOTS)
  );
  const rowWidth = FOOTER_SLOTS * size + (FOOTER_SLOTS - 1) * FOOTER_GAP_PX + FOOTER_GROUP_GAP_PX;
  const start = drawerLeft + (drawerWidth - rowWidth) / 2;
  return { size, drawerLeft, drawerWidth, start };
};

export const getDockedStyles = (
  deviceInfo: DeviceInfo | undefined,
  dock: ButtonDock | null | undefined
): React.CSSProperties => {
  if (!dock) return {};
  const size = getButtonSize(deviceInfo);
  const edge = getPositioning(deviceInfo);
  const bottom = getBottomPositioning(deviceInfo);
  const portraitPhone =
    !!deviceInfo?.isMobile && deviceInfo?.orientation === 'portrait';

  const styles: React.CSSProperties = {
    zIndex: ResponsiveValues.zIndex.overlay + 10,
    left: 'auto',
    right: 'auto',
  };
  if (portraitPhone) {
    // One row along the bottom of the drawer, on its own band
    const footer = getPhoneFooter(dock.side);
    const slot = dock.slot ?? 0;
    const x =
      footer.start +
      slot * (footer.size + FOOTER_GAP_PX) +
      (slot >= 4 ? FOOTER_GROUP_GAP_PX : 0);
    styles.left = `${x}px`;
    styles.bottom = `calc(${FOOTER_BOTTOM_PX}px + env(safe-area-inset-bottom))`;
    styles.width = `${footer.size}px`;
    styles.height = `${footer.size}px`;
  } else {
    // A row along the bottom of the free half
    styles[dock.side] = `${edge + dock.index * (size + DOCK_GAP_PX) + (dock.extra ?? 0)}px`;
    styles.bottom = `${bottom + (dock.row ?? 0) * (size + 10)}px`;
  }
  return styles;
};
