import { routes } from './app.routes';

describe('application settings routes', () => {
  it('defines nested settings pages and keeps the legacy assets redirect', () => {
    const settings = routes.find((route) => route.path === 'settings');
    const legacyAssets = routes.find((route) => route.path === 'assets');

    expect(settings?.children?.find((route) => route.path === '')?.redirectTo).toBe('configs');
    expect(settings?.children?.map((route) => route.path)).toContain('assets');
    expect(settings?.children?.map((route) => route.path)).toContain('plugins');
    expect(legacyAssets?.redirectTo).toBe('settings/assets');
  });
});
