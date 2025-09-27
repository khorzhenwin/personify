'use client';

import { ActionIcon, Tooltip, useMantineColorScheme } from '@mantine/core';
import { IconSun, IconMoon, IconDeviceDesktop } from '@tabler/icons-react';
import { useThemeStore, ColorScheme } from '@/store/theme';
import { useEffect } from 'react';
import { designTokens } from '@/theme';

export function ThemeToggle() {
  const { colorScheme, effectiveColorScheme, setColorScheme, toggleColorScheme } = useThemeStore();
  const { setColorScheme: setMantineColorScheme } = useMantineColorScheme();

  // Sync with Mantine's color scheme
  useEffect(() => {
    setMantineColorScheme(effectiveColorScheme);
  }, [effectiveColorScheme, setMantineColorScheme]);

  const getIcon = () => {
    switch (colorScheme) {
      case 'light':
        return <IconSun size={18} />;
      case 'dark':
        return <IconMoon size={18} />;
      case 'auto':
        return <IconDeviceDesktop size={18} />;
      default:
        return <IconSun size={18} />;
    }
  };

  const getTooltipLabel = () => {
    switch (colorScheme) {
      case 'light':
        return 'Switch to dark theme';
      case 'dark':
        return 'Switch to auto theme';
      case 'auto':
        return 'Switch to light theme';
      default:
        return 'Toggle theme';
    }
  };

  const handleClick = () => {
    const nextScheme: ColorScheme = 
      colorScheme === 'light' ? 'dark' : 
      colorScheme === 'dark' ? 'auto' : 'light';
    
    setColorScheme(nextScheme);
  };

  return (
    <Tooltip label={getTooltipLabel()} position="bottom">
      <ActionIcon
        onClick={handleClick}
        variant="subtle"
        size="lg"
        radius="md"
        data-testid="theme-toggle"
        aria-label={getTooltipLabel()}
        aria-pressed={colorScheme !== 'auto'}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
          }
        }}
        style={{
          transition: 'all 0.2s ease',
          transform: 'scale(1)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.05)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
        }}
        onFocus={(e) => {
          e.currentTarget.style.outline = `2px solid ${designTokens.colors.primary}`;
          e.currentTarget.style.outlineOffset = '2px';
        }}
        onBlur={(e) => {
          e.currentTarget.style.outline = 'none';
        }}
      >
        <div
          style={{
            transition: 'transform 0.3s ease',
            transform: effectiveColorScheme === 'dark' ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
          aria-hidden="true"
        >
          {getIcon()}
        </div>
      </ActionIcon>
    </Tooltip>
  );
}