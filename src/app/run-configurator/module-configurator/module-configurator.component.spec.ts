import { AutoCompleteCompleteEvent } from 'primeng/autocomplete';
import { ModuleConfiguratorComponent, ModuleWithCount } from './module-configurator.component';
import { RunConfiguratorService } from '../run-configurator.service';

function createComponent(): ModuleConfiguratorComponent {
  return new ModuleConfiguratorComponent(
    jasmine.createSpyObj('ModulesClient', ['getModuleTypes']),
    jasmine.createSpyObj('MessageService', ['add']),
    jasmine.createSpyObj('Router', ['navigate']),
    new RunConfiguratorService(),
  );
}

function search(component: ModuleConfiguratorComponent, query = ''): void {
  component.searchModules({ query } as AutoCompleteCompleteEvent);
}

describe('ModuleConfiguratorComponent module suggestions', () => {
  it('leaves built-in-only suggestions ungrouped', () => {
    const component = createComponent();
    const builtIn: ModuleWithCount = { name: 'AdvancedPLC', settings: [] };
    component.modules.next([builtIn]);

    search(component);

    expect(component.availableModulesFilter).toEqual([builtIn]);
  });

  it('separates built-in algorithms from marked plugins', () => {
    const component = createComponent();
    const builtIn: ModuleWithCount = { name: 'AdvancedPLC', settings: [] };
    const plugin: ModuleWithCount = { name: 'Demo', settings: [], is_plugin: true };
    component.modules.next([builtIn, plugin]);

    search(component);

    expect(component.availableModulesFilter).toEqual([
      { label: 'Built-in algorithms', items: [builtIn] },
      { label: 'Plugins', items: [plugin] },
    ]);
  });
});
