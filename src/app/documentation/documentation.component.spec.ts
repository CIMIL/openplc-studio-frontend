import { ElementRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, ParamMap } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { ThemeService } from '../shared/services/theme.service';
import { DocumentationComponent } from './documentation.component';

class ThemeServiceStub {
  public readonly isDarkMode = new BehaviorSubject<boolean>(false);
}

describe('DocumentationComponent', () => {
  let themeService: ThemeServiceStub;
  let component: DocumentationComponent;
  let postMessage: jasmine.Spy;
  let queryParamMap: BehaviorSubject<ParamMap>;
  let fragment: BehaviorSubject<string | null>;
  let activatedRoute: Pick<ActivatedRoute, 'queryParamMap' | 'fragment'>;

  beforeEach(() => {
    themeService = new ThemeServiceStub();
    queryParamMap = new BehaviorSubject(convertToParamMap({}));
    fragment = new BehaviorSubject<string | null>(null);
    activatedRoute = { queryParamMap, fragment };
    const sanitizer = { bypassSecurityTrustResourceUrl: (url: string) => url };
    component = new DocumentationComponent(themeService as any, activatedRoute as ActivatedRoute, sanitizer as any);
    postMessage = jasmine.createSpy('postMessage');
    component.documentationFrame = new ElementRef({ contentWindow: { postMessage } } as unknown as HTMLIFrameElement);
  });

  it('renders the backend documentation endpoint with an accessible title', async () => {
    await TestBed.configureTestingModule({
      imports: [DocumentationComponent],
      providers: [
        { provide: ThemeService, useValue: themeService },
        { provide: ActivatedRoute, useValue: activatedRoute },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(DocumentationComponent);
    fixture.detectChanges();
    const iframe = fixture.nativeElement.querySelector('iframe') as HTMLIFrameElement;

    expect(iframe.getAttribute('src')).toBe('/api/plctestbench-docs/');
    expect(iframe.title).toBe('PLCTestbench documentation');
    fixture.destroy();
  });

  it('uses the backend documentation endpoint and synchronizes the initial theme', () => {
    component.ngOnInit();

    expect(component.documentationUrl).toBe('/api/plctestbench-docs/');
    expect(postMessage).toHaveBeenCalledWith({ type: 'plctestbench-theme', theme: 'light' }, window.location.origin);
  });

  it('opens a requested API reference section', () => {
    queryParamMap.next(convertToParamMap({ path: 'reference/plc_algorithm/' }));
    fragment.next('plctestbench.plc_algorithm.BurgPLC');

    component.ngOnInit();

    expect(component.documentationUrl).toBe(
      '/api/plctestbench-docs/reference/plc_algorithm/#plctestbench.plc_algorithm.BurgPLC',
    );
  });

  it('ignores unsafe documentation paths and fragments', () => {
    queryParamMap.next(convertToParamMap({ path: '../health' }));
    fragment.next('invalid fragment');

    component.ngOnInit();

    expect(component.documentationUrl).toBe('/api/plctestbench-docs/');
  });

  it('synchronizes theme changes and iframe reloads', () => {
    component.ngOnInit();
    postMessage.calls.reset();

    themeService.isDarkMode.next(true);
    component.onFrameLoad();

    expect(postMessage.calls.allArgs()).toEqual([
      [{ type: 'plctestbench-theme', theme: 'dark' }, window.location.origin],
      [{ type: 'plctestbench-theme', theme: 'dark' }, window.location.origin],
    ]);
  });

  it('stops synchronizing after destruction', () => {
    component.ngOnInit();
    component.ngOnDestroy();
    postMessage.calls.reset();

    themeService.isDarkMode.next(true);

    expect(postMessage).not.toHaveBeenCalled();
  });
});
