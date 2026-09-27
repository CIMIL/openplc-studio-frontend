import { of, throwError } from 'rxjs';
import { PluginsComponent } from './plugins.component';

describe('PluginsComponent', () => {
  it('loads and counts available and invalid plugins', () => {
    const client = jasmine.createSpyObj('PluginsClient', ['getPlugins']);
    client.getPlugins.and.returnValue(
      of({
        scannedAt: '2026-01-01T12:00:00Z',
        items: [
          { filename: 'Good.py', status: 'available', moduleType: 'PLCAlgorithm', spec: null, error: null },
          { filename: 'Bad.py', status: 'invalid', moduleType: 'PLCAlgorithm', spec: null, error: 'Broken' },
        ],
      }),
    );
    const component = new PluginsComponent(client);

    component.ngOnInit();

    expect(component.plugins.length).toBe(2);
    expect(component.availableCount).toBe(1);
    expect(component.invalidCount).toBe(1);
    expect(component.loading).toBeFalse();
    expect(component.loadError).toBeFalse();
  });

  it('supports refresh and reports API failures', () => {
    const client = jasmine.createSpyObj('PluginsClient', ['getPlugins']);
    client.getPlugins.and.returnValue(throwError(() => new Error('offline')));
    const component = new PluginsComponent(client);

    component.refresh();

    expect(component.loadError).toBeTrue();
    expect(component.loaded).toBeTrue();
    expect(component.loading).toBeFalse();
  });
});
