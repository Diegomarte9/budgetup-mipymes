'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface UserPreferences {
  // Theme preferences
  theme: 'light' | 'dark' | 'system';
  
  // UI preferences
  sidebarCollapsed: boolean;
  compactMode: boolean;
  
  // Dashboard preferences
  defaultDateRange: '7d' | '30d' | '90d' | '1y';
  showWelcomeMessage: boolean;
  
  // Table preferences
  transactionsPerPage: 10 | 25 | 50 | 100;
  
  // Currency and locale preferences
  currencyFormat: 'symbol' | 'code';
  numberFormat: 'standard' | 'compact';
}

interface UserPreferencesState extends UserPreferences {
  // Actions
  setTheme: (theme: UserPreferences['theme']) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setCompactMode: (compact: boolean) => void;
  setDefaultDateRange: (range: UserPreferences['defaultDateRange']) => void;
  setShowWelcomeMessage: (show: boolean) => void;
  setTransactionsPerPage: (count: UserPreferences['transactionsPerPage']) => void;
  setCurrencyFormat: (format: UserPreferences['currencyFormat']) => void;
  setNumberFormat: (format: UserPreferences['numberFormat']) => void;
  
  // Bulk actions
  resetPreferences: () => void;
  updatePreferences: (preferences: Partial<UserPreferences>) => void;
}

const defaultPreferences: UserPreferences = {
  theme: 'system',
  sidebarCollapsed: false,
  compactMode: false,
  defaultDateRange: '30d',
  showWelcomeMessage: true,
  transactionsPerPage: 25,
  currencyFormat: 'symbol',
  numberFormat: 'standard',
};

export const useUserPreferences = create<UserPreferencesState>()(
  persist(
    (set) => ({
      ...defaultPreferences,
      
      // Theme actions
      setTheme: (theme) => set({ theme }),
      
      // UI actions
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
      setCompactMode: (compactMode) => set({ compactMode }),
      
      // Dashboard actions
      setDefaultDateRange: (defaultDateRange) => set({ defaultDateRange }),
      setShowWelcomeMessage: (showWelcomeMessage) => set({ showWelcomeMessage }),
      
      // Table actions
      setTransactionsPerPage: (transactionsPerPage) => set({ transactionsPerPage }),
      
      // Format actions
      setCurrencyFormat: (currencyFormat) => set({ currencyFormat }),
      setNumberFormat: (numberFormat) => set({ numberFormat }),
      
      // Bulk actions
      resetPreferences: () => set(defaultPreferences),
      updatePreferences: (preferences) => set((state) => ({ ...state, ...preferences })),
    }),
    {
      name: 'budgetup-user-preferences',
      storage: createJSONStorage(() => localStorage),
      version: 1,
      
      // Migration function for future versions
      migrate: (persistedState: unknown, version: number) => {
        if (version === 0) {
          // Migration from version 0 to 1
          return {
            ...defaultPreferences,
            ...(persistedState as Partial<UserPreferences>),
          };
        }
        return persistedState as UserPreferences;
      },
      
      // Only persist certain fields
      partialize: (state) => ({
        theme: state.theme,
        sidebarCollapsed: state.sidebarCollapsed,
        compactMode: state.compactMode,
        defaultDateRange: state.defaultDateRange,
        showWelcomeMessage: state.showWelcomeMessage,
        transactionsPerPage: state.transactionsPerPage,
        currencyFormat: state.currencyFormat,
        numberFormat: state.numberFormat,
      }),
    }
  )
);

// Selector hooks for better performance
export const useThemePreference = () => useUserPreferences((state) => state.theme);
export const useSidebarPreference = () => useUserPreferences((state) => state.sidebarCollapsed);
export const useCompactModePreference = () => useUserPreferences((state) => state.compactMode);
export const useDefaultDateRangePreference = () => useUserPreferences((state) => state.defaultDateRange);
export const useTransactionsPerPagePreference = () => useUserPreferences((state) => state.transactionsPerPage);