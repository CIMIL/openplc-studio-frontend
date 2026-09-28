import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { ThemeService } from '../shared/services/theme.service';
import { HeaderComponent } from './header.component';

describe('HeaderComponent', () => {
  let fixture: ComponentFixture<HeaderComponent>;
  let router: { url: string; navigate: jasmine.Spy };

  beforeEach(async () => {
    router = { url: '/docs', navigate: jasmine.createSpy('navigate') };

    await TestBed.configureTestingModule({
      imports: [HeaderComponent],
      providers: [
        { provide: Router, useValue: router },
        {
          provide: ThemeService,
          useValue: {
            isDarkMode: new BehaviorSubject(false),
            toggle: jasmine.createSpy('toggle'),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HeaderComponent);
    fixture.detectChanges();
  });

  it('places Docs between History and Settings and marks it active', () => {
    const labels = [...fixture.nativeElement.querySelectorAll('.plc-main-nav .p-button-label')].map(
      (element: HTMLElement) => element.textContent?.trim(),
    );

    expect(labels).toEqual(['New', 'History', 'Docs', 'Settings']);
    expect(fixture.componentInstance.isActive('/docs')).toBeTrue();

    router.url = '/docs?path=reference%2Fplc_algorithm%2F#plctestbench.plc_algorithm.BurgPLC';
    expect(fixture.componentInstance.isActive('/docs')).toBeTrue();
  });

  it('navigates to the documentation route', () => {
    const docsButton = [...fixture.nativeElement.querySelectorAll('.plc-main-nav button')].find(
      (button: HTMLButtonElement) => button.textContent?.includes('Docs'),
    ) as HTMLButtonElement;

    docsButton.click();

    expect(router.navigate).toHaveBeenCalledWith(['/docs']);
  });
});
