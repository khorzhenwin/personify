import { createTheme, MantineColorsTuple, MantineTheme } from '@mantine/core';

// Design tokens for consistent spacing, colors, and typography
export const designTokens = {
  colors: {
    primary: '#3B82F6', // Blue-500
    primaryLight: '#60A5FA', // Blue-400
    primaryDark: '#1D4ED8', // Blue-700
    secondary: '#10B981', // Emerald-500
    secondaryLight: '#34D399', // Emerald-400
    secondaryDark: '#059669', // Emerald-600
    accent: '#8B5CF6', // Violet-500
    success: '#10B981', // Emerald-500
    warning: '#F59E0B', // Amber-500
    error: '#EF4444', // Red-500
    gray: {
      50: '#F9FAFB',
      100: '#F3F4F6',
      200: '#E5E7EB',
      300: '#D1D5DB',
      400: '#9CA3AF',
      500: '#6B7280',
      600: '#4B5563',
      700: '#374151',
      800: '#1F2937',
      900: '#111827',
    },
  },
  spacing: {
    xs: '0.5rem', // 8px
    sm: '0.75rem', // 12px
    md: '1rem', // 16px
    lg: '1.5rem', // 24px
    xl: '2rem', // 32px
    xxl: '3rem', // 48px
  },
  borderRadius: {
    sm: '0.375rem', // 6px
    md: '0.5rem', // 8px
    lg: '0.75rem', // 12px
    xl: '1rem', // 16px
  },
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  },
  typography: {
    fontFamily: {
      sans: ['Inter', 'system-ui', 'sans-serif'],
      mono: ['JetBrains Mono', 'Consolas', 'monospace'],
    },
    fontSize: {
      xs: '0.75rem', // 12px
      sm: '0.875rem', // 14px
      base: '1rem', // 16px
      lg: '1.125rem', // 18px
      xl: '1.25rem', // 20px
      '2xl': '1.5rem', // 24px
      '3xl': '1.875rem', // 30px
      '4xl': '2.25rem', // 36px
    },
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
  },
};

// Custom color tuples for Mantine
const primaryColor: MantineColorsTuple = [
  '#EBF4FF',
  '#DBEAFE',
  '#BFDBFE',
  '#93C5FD',
  '#60A5FA',
  '#3B82F6',
  '#2563EB',
  '#1D4ED8',
  '#1E40AF',
  '#1E3A8A',
];

const secondaryColor: MantineColorsTuple = [
  '#ECFDF5',
  '#D1FAE5',
  '#A7F3D0',
  '#6EE7B7',
  '#34D399',
  '#10B981',
  '#059669',
  '#047857',
  '#065F46',
  '#064E3B',
];

// Dark theme colors
const darkDesignTokens = {
  ...designTokens,
  colors: {
    ...designTokens.colors,
    gray: {
      50: '#18181B', // zinc-900
      100: '#27272A', // zinc-800
      200: '#3F3F46', // zinc-700
      300: '#52525B', // zinc-600
      400: '#71717A', // zinc-500
      500: '#A1A1AA', // zinc-400
      600: '#D4D4D8', // zinc-300
      700: '#E4E4E7', // zinc-200
      800: '#F4F4F5', // zinc-100
      900: '#FAFAFA', // zinc-50
    },
  },
};

const createAppTheme = (colorScheme: 'light' | 'dark' = 'light') => {
  const tokens = colorScheme === 'dark' ? darkDesignTokens : designTokens;
  
  return createTheme({
    colors: {
      primary: primaryColor,
      secondary: secondaryColor,
    },
    primaryColor: 'primary',
    primaryShade: 5,
    fontFamily: tokens.typography.fontFamily.sans.join(', '),
    fontFamilyMonospace: tokens.typography.fontFamily.mono.join(', '),
    headings: {
      fontFamily: tokens.typography.fontFamily.sans.join(', '),
      fontWeight: tokens.typography.fontWeight.semibold,
      sizes: {
        h1: { fontSize: tokens.typography.fontSize['4xl'], fontWeight: tokens.typography.fontWeight.bold },
        h2: { fontSize: tokens.typography.fontSize['3xl'], fontWeight: tokens.typography.fontWeight.bold },
        h3: { fontSize: tokens.typography.fontSize['2xl'], fontWeight: tokens.typography.fontWeight.semibold },
        h4: { fontSize: tokens.typography.fontSize.xl, fontWeight: tokens.typography.fontWeight.semibold },
        h5: { fontSize: tokens.typography.fontSize.lg, fontWeight: tokens.typography.fontWeight.medium },
        h6: { fontSize: tokens.typography.fontSize.base, fontWeight: tokens.typography.fontWeight.medium },
      },
    },
    spacing: {
      xs: tokens.spacing.xs,
      sm: tokens.spacing.sm,
      md: tokens.spacing.md,
      lg: tokens.spacing.lg,
      xl: tokens.spacing.xl,
    },
    radius: {
      xs: '0.25rem',
      sm: tokens.borderRadius.sm,
      md: tokens.borderRadius.md,
      lg: tokens.borderRadius.lg,
      xl: tokens.borderRadius.xl,
    },
    shadows: {
      xs: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
      sm: tokens.shadows.sm,
      md: tokens.shadows.md,
      lg: tokens.shadows.lg,
      xl: tokens.shadows.xl,
    },
    components: {
      Button: {
        defaultProps: {
          radius: 'md',
        },
        styles: {
          root: {
            fontWeight: tokens.typography.fontWeight.medium,
            transition: 'all 0.2s ease',
            '&:hover': {
              transform: 'translateY(-1px)',
            },
          },
        },
      },
      Card: {
        defaultProps: {
          radius: 'lg',
          shadow: 'md',
          padding: 'lg',
        },
        styles: {
          root: {
            border: `1px solid ${tokens.colors.gray[200]}`,
            transition: 'all 0.2s ease',
            backgroundColor: colorScheme === 'dark' ? tokens.colors.gray[100] : '#ffffff',
            '&:hover': {
              boxShadow: tokens.shadows.lg,
            },
          },
        },
      },
      TextInput: {
        defaultProps: {
          radius: 'md',
        },
        styles: {
          input: {
            border: `1px solid ${tokens.colors.gray[300]}`,
            backgroundColor: colorScheme === 'dark' ? tokens.colors.gray[100] : '#ffffff',
            color: colorScheme === 'dark' ? tokens.colors.gray[800] : tokens.colors.gray[900],
            '&:focus': {
              borderColor: tokens.colors.primary,
              boxShadow: `0 0 0 3px ${tokens.colors.primary}20`,
            },
          },
        },
      },
      PasswordInput: {
        defaultProps: {
          radius: 'md',
        },
        styles: {
          input: {
            border: `1px solid ${tokens.colors.gray[300]}`,
            backgroundColor: colorScheme === 'dark' ? tokens.colors.gray[100] : '#ffffff',
            color: colorScheme === 'dark' ? tokens.colors.gray[800] : tokens.colors.gray[900],
            '&:focus': {
              borderColor: tokens.colors.primary,
              boxShadow: `0 0 0 3px ${tokens.colors.primary}20`,
            },
          },
        },
      },
    },
  });
};

export const theme = createAppTheme('light');
export const darkTheme = createAppTheme('dark');
export { createAppTheme };