import React from 'react';
import { SiSketchfab } from 'react-icons/si';
import { DeviceInfo } from '../lib/types';
import {
  getButtonStyles,
  getDockedStyles,
  type ButtonDock,
  getResponsiveIconSize,
  getIconColor,
  createHoverHandlers,
  type ButtonPosition,
} from '../lib/buttonUtils';

interface CreditsButtonProps {
  isDarkMode: boolean;
  onToggle: () => void;
  isHidden?: boolean;
  deviceInfo?: DeviceInfo;
  /** Where to sit while a page drawer is open */
  dock?: ButtonDock | null;
}

export default function CreditsButton({
  isDarkMode,
  onToggle,
  isHidden = false,
  deviceInfo,
  dock = null,
}: CreditsButtonProps): React.JSX.Element | null {
  const [isHovered, setIsHovered] = React.useState(false);

  if (isHidden) return null;

  const buttonPosition: ButtonPosition = 'bottom-left';
  const buttonStyles = getButtonStyles({
    position: buttonPosition,
    isDarkMode,
    isHovered,
    deviceInfo,
  });

  const iconSize = getResponsiveIconSize(deviceInfo);
  const iconColor = getIconColor(isDarkMode, isHovered);
  const hoverHandlers = createHoverHandlers(setIsHovered);

  return (
    <button
      style={{ ...buttonStyles, ...getDockedStyles(deviceInfo, dock) }}
      onClick={onToggle}
      {...hoverHandlers}
      aria-label='Show credits'
      className='touch-target'
    >
      <SiSketchfab style={{ fontSize: iconSize, color: iconColor }} />
    </button>
  );
}
