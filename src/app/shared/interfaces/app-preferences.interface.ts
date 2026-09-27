export const TABLE_PAGE_SIZES = [10, 25, 50] as const;

export type TablePageSize = (typeof TABLE_PAGE_SIZES)[number];
export type ThemeMode = 'light' | 'dark' | 'system';

export interface AppPreferences {
  themeMode: ThemeMode;
  historyPageSize: TablePageSize;
  assetsPageSize: TablePageSize;
  runCompletionNotifications: boolean;
}
