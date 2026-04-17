import { Injectable, Inject, signal, WritableSignal, PLATFORM_ID } from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { TranslateService, LangChangeEvent } from '@ngx-translate/core';

@Injectable({
  providedIn: 'root',
})
export class DirectionService {
  public isRtl: WritableSignal<boolean> = signal(false);
  private readonly RTL_LANGUAGES = ['ar', 'he', 'fa', 'ur'];

  constructor(
    private translate: TranslateService,
    @Inject(DOCUMENT) private document: Document,
    @Inject(PLATFORM_ID) private platformId: object
  ) {
    this.init();
  }

  private init(): void {
    // Initial check
    this.updateDirection(this.translate.currentLang || this.translate.getDefaultLang() || 'en');

    // Subscribe to language changes
    this.translate.onLangChange.subscribe((event: LangChangeEvent) => {
      this.updateDirection(event.lang);
    });
  }

  private updateDirection(lang: string): void {
    const isRtl = this.RTL_LANGUAGES.includes(lang);
    this.isRtl.set(isRtl);

    if (isPlatformBrowser(this.platformId)) {
      const dir = isRtl ? 'rtl' : 'ltr';
      this.document.documentElement.setAttribute('dir', dir);
      this.document.documentElement.setAttribute('lang', lang);
      this.document.body.setAttribute('dir', dir);
    }
  }
}
