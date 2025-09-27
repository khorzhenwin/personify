import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ColorScheme = 'light' | 'dark' | 'auto';

interface ThemeState {
  colorScheme: ColorScheme;
  systemColorScheme: 'light' | 'dark';
  effectiveColorScheme: 'light' | 'dark';
  setColorScheme: (scheme: ColorScheme) => void;
  setSystemColorScheme: (scheme: 'light' | 'dark') => void;
  toggleColorScheme: () => void;
}

const getSystemColorScheme = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const getEffectiveColorScheme = (colorScheme: ColorScheme, systemColorScheme: 'light' | 'dark'): 'light' | 'dark' => {
  if (colorScheme === 'auto') return systemColorScheme;
  return colorScheme;
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      colorScheme: 'auto',
      systemColorScheme: getSystemColorScheme(),
      effectiveColorScheme: getEffectiveColorScheme('auto', getSystemColorScheme()),
      
      setColorScheme: (scheme: ColorScheme) => {
        const { systemColorScheme } = get();
        set({
          colorScheme: scheme,
          effectiveColorScheme: getEffectiveColorScheme(scheme, systemColorScheme),
        });
      },
      
      setSystemColorScheme: (scheme: 'light' | 'dark') => {
        const { colorScheme } = get();
        set({
          systemColorScheme: scheme,
          effectiveColorScheme: getEffectiveColorScheme(colorScheme, scheme),
        });
      },
      
      toggleColorScheme: () => {
        const { effectiveColorScheme } = get();
        const newScheme = effectiveColorScheme === 'light' ? 'dark' : 'light';
        set({
          colorScheme: newScheme,
          effectiveColorScheme: newScheme,
        });
      },
    }),
    {
      name: 'theme-storage',
      partialize: (state) => ({ colorScheme: state.colorScheme }),
    }
  )
);

// Hook to initialize system color scheme detection
export const useSystemColorSchemeDetection = () => {
  const setSystemColorScheme = useThemeStore((state) => state.setSystemColorScheme);
  
  if (typeof window !== 'undefined') {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemColorScheme(e.matches ? 'dark' : 'light');
    };
    
    mediaQuery.addEventListener('change', handleChange);
    
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }
  
  return () => {};
};