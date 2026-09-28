import { routes } from './app.routes';

describe('application routes', () => {
  it('uses the dashboard as the application home and fallback', () => {
    const home = routes.find((route) => route.path === '');
    const dashboard = routes.find((route) => route.path === 'dashboard');
    const fallback = routes.find((route) => route.path === '**');

    expect(home?.redirectTo).toBe('dashboard');
    expect(dashboard?.loadComponent).toBeDefined();
    expect(fallback?.redirectTo).toBe('dashboard');
  });

  it('lazy-loads the package documentation page', () => {
    const documentation = routes.find((route) => route.path === 'docs');

    expect(documentation?.loadComponent).toBeDefined();
  });

  it('defines nested settings pages and keeps the legacy assets redirect', () => {
    const settings = routes.find((route) => route.path === 'settings');
    const legacyAssets = routes.find((route) => route.path === 'assets');

    expect(settings?.children?.find((route) => route.path === '')?.redirectTo).toBe('configs');
    expect(settings?.children?.map((route) => route.path)).toContain('assets');
    expect(settings?.children?.map((route) => route.path)).toContain('plugins');
    expect(legacyAssets?.redirectTo).toBe('settings/assets');
  });
});
