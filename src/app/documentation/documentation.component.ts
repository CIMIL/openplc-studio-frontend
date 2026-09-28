import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { combineLatest, Subject, takeUntil } from 'rxjs';
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
  private static readonly referencePathPattern = /^reference\/[a-z0-9_]+\/$/;
  private static readonly referenceFragmentPattern = /^plctestbench\.[A-Za-z0-9_.-]+$/;

  public documentationUrl = DocumentationComponent.documentationBaseUrl;
  public documentationResourceUrl: SafeResourceUrl;

  @ViewChild('documentationFrame')
  public documentationFrame?: ElementRef<HTMLIFrameElement>;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly themeService: ThemeService,
    private readonly route: ActivatedRoute,
    private readonly sanitizer: DomSanitizer,
  ) {
    this.documentationResourceUrl = this.trustDocumentationUrl(this.documentationUrl);
  }

  public ngOnInit(): void {
    this.themeService.isDarkMode.pipe(takeUntil(this.destroy$)).subscribe(() => this.syncTheme());
    combineLatest([this.route.queryParamMap, this.route.fragment])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([queryParams, fragment]) => {
        this.documentationUrl = this.buildDocumentationUrl(queryParams.get('path'), fragment);
        this.documentationResourceUrl = this.trustDocumentationUrl(this.documentationUrl);
      });
  }

  public onFrameLoad(): void {
    this.syncTheme();
  }

  public ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private buildDocumentationUrl(path: string | null, fragment: string | null): string {
    if (!path || !DocumentationComponent.referencePathPattern.test(path)) {
      return DocumentationComponent.documentationBaseUrl;
    }

    const safeFragment =
      fragment && DocumentationComponent.referenceFragmentPattern.test(fragment) ? `#${fragment}` : '';
    return `${DocumentationComponent.documentationBaseUrl}${path}${safeFragment}`;
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
