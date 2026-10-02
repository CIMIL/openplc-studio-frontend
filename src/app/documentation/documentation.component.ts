import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { NavigationEnd, PRIMARY_OUTLET, Router } from '@angular/router';
import { filter, startWith, Subject, takeUntil } from 'rxjs';
import { ThemeService } from '../shared/services/theme.service';

interface DocumentationThemeMessage {
  type: 'plctestbench-theme';
  theme: 'light' | 'dark';
}

@Component({
  selector: 'plc-documentation',
  templateUrl: './documentation.component.html',
  styleUrl: './documentation.component.scss',
})
export class DocumentationComponent implements OnInit, OnDestroy {
  private static readonly documentationBaseUrl = '/api/plctestbench-docs/';

  public documentationUrl = DocumentationComponent.documentationBaseUrl;
  public documentationResourceUrl: SafeResourceUrl;

  @ViewChild('documentationFrame')
  public documentationFrame?: ElementRef<HTMLIFrameElement>;

  private readonly destroy$ = new Subject<void>();
  private frameWindow?: Window;
  private readonly onFrameLocationChange = (): void => this.syncBrowserUrlFromFrame();

  constructor(
    private readonly themeService: ThemeService,
    private readonly router: Router,
    private readonly sanitizer: DomSanitizer,
  ) {
    this.documentationResourceUrl = this.trustDocumentationUrl(this.documentationUrl);
  }

  public ngOnInit(): void {
    this.themeService.isDarkMode.pipe(takeUntil(this.destroy$)).subscribe(() => this.syncTheme());
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        startWith(null),
        takeUntil(this.destroy$),
      )
      .subscribe(() => this.syncFrameUrlFromBrowser());
  }

  public onFrameLoad(): void {
    this.frameWindow?.removeEventListener('hashchange', this.onFrameLocationChange);
    this.frameWindow = this.documentationFrame?.nativeElement.contentWindow ?? undefined;
    this.frameWindow?.addEventListener('hashchange', this.onFrameLocationChange);
    this.syncTheme();
    this.syncBrowserUrlFromFrame();
  }

  public ngOnDestroy(): void {
    this.frameWindow?.removeEventListener('hashchange', this.onFrameLocationChange);
    this.destroy$.next();
    this.destroy$.complete();
  }

  private syncFrameUrlFromBrowser(): void {
    const urlTree = this.router.parseUrl(this.router.url);
    const primarySegments = urlTree.root.children[PRIMARY_OUTLET]?.segments ?? [];
    const documentationSegments = primarySegments.slice(1);
    const documentationPath = documentationSegments.length
      ? `${documentationSegments.map((segment) => encodeURIComponent(segment.path)).join('/')}/`
      : '';
    const fragment = urlTree.fragment ? `#${encodeURIComponent(urlTree.fragment)}` : '';
    const nextUrl = `${DocumentationComponent.documentationBaseUrl}${documentationPath}${fragment}`;

    if (nextUrl === this.documentationUrl) return;

    this.documentationUrl = nextUrl;
    this.documentationResourceUrl = this.trustDocumentationUrl(nextUrl);
  }

  private syncBrowserUrlFromFrame(): void {
    const frameLocation = this.frameWindow?.location;
    if (!frameLocation?.pathname.startsWith(DocumentationComponent.documentationBaseUrl)) return;

    const relativePath = frameLocation.pathname
      .slice(DocumentationComponent.documentationBaseUrl.length)
      .replace(/^\/+|\/+$/g, '');
    const pathSegments = relativePath ? relativePath.split('/').map((segment) => decodeURIComponent(segment)) : [];
    const fragment = frameLocation.hash ? decodeURIComponent(frameLocation.hash.slice(1)) : undefined;

    // The iframe has already completed this navigation. Recording its URL before
    // updating Angular avoids assigning [src] again and loading the page twice.
    this.documentationUrl = `${frameLocation.pathname}${frameLocation.hash}`;
    const targetUrl = this.router.serializeUrl(this.router.createUrlTree(['/docs', ...pathSegments], { fragment }));

    if (targetUrl !== this.router.url) void this.router.navigateByUrl(targetUrl);
  }

  private trustDocumentationUrl(url: string): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  private syncTheme(): void {
    const frameWindow = this.documentationFrame?.nativeElement.contentWindow;
    if (!frameWindow) return;

    const message: DocumentationThemeMessage = {
      type: 'plctestbench-theme',
      theme: this.themeService.isDarkMode.value ? 'dark' : 'light',
    };
    frameWindow.postMessage(message, window.location.origin);
  }
}
