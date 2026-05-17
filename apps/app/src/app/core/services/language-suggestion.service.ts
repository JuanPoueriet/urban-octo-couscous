import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { CookieService } from 'ngx-cookie-service';
import { BehaviorSubject } from 'rxjs';

export interface LanguageSuggestion {
  code: string;
  name: string;
  currentName: string;
}

const AUTO_DISMISS_MS = 10_000;

@Injectable({
  providedIn: 'root'
})
export class LanguageSuggestionService {
  private suggestionSubject = new BehaviorSubject<LanguageSuggestion | null>(null);
  suggestion$ = this.suggestionSubject.asObservable();

  private readonly PREFERRED_LANG_COOKIE = 'jsl_user_preferred_lang';
  private readonly DISMISSED_STORAGE_KEY = 'jsl_lang_suggestion_dismissed';
  private autoDismissTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private translate: TranslateService,
    private cookieService: CookieService,
    private router: Router
  ) {
    if (isPlatformBrowser(this.platformId)) {
      // Only check once on initial page load — not on SPA navigations.
      const onWindowLoad = () => {
        // Delay suggestion to feel like an assistant, not an interruption
        setTimeout(() => this.checkSuggestion(), 3000);
      };

      if (document.readyState === 'complete') {
        onWindowLoad();
      } else {
        window.addEventListener('load', onWindowLoad, { once: true });
      }
    }
  }

  private checkSuggestion() {
    if (!isPlatformBrowser(this.platformId)) return;

    const dismissedAt = localStorage.getItem(this.DISMISSED_STORAGE_KEY);
    if (dismissedAt) {
      const dismissedTime = parseInt(dismissedAt, 10);
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

      // Don't show again for 30 days if dismissed
      if (Date.now() - dismissedTime < thirtyDaysMs) {
        return;
      }
    }

    const currentUrlLang = this.router.url.split('/')[1];
    const supportedLangs = this.translate.getLangs();

    if (!supportedLangs.includes(currentUrlLang)) return;

    const preferredLang = this.getPreferredLanguage(supportedLangs, currentUrlLang);

    if (preferredLang && preferredLang !== currentUrlLang && supportedLangs.includes(preferredLang)) {
      this.suggestionSubject.next({
        code: preferredLang,
        name: this.getLanguageName(preferredLang),
        currentName: this.getLanguageName(currentUrlLang),
      });
      this.startAutoDismissTimer();
    }
  }

  private startAutoDismissTimer() {
    this.clearAutoDismissTimer();
    this.autoDismissTimer = setTimeout(() => {
      this.dismiss();
    }, AUTO_DISMISS_MS);
  }

  private clearAutoDismissTimer() {
    if (this.autoDismissTimer) {
      clearTimeout(this.autoDismissTimer);
      this.autoDismissTimer = null;
    }
  }

  private getPreferredLanguage(supportedLangs: readonly string[], currentUrlLang: string): string | null {
    const browserLanguages = navigator.languages?.length ? navigator.languages : [navigator.language];

    for (const lang of browserLanguages) {
      const normalized = lang.toLowerCase().split('-')[0];
      if (supportedLangs.includes(normalized) && normalized !== currentUrlLang) {
        return normalized;
      }
    }

    const cookieLang = this.cookieService.get(this.PREFERRED_LANG_COOKIE)?.toLowerCase();
    if (cookieLang && supportedLangs.includes(cookieLang) && cookieLang !== currentUrlLang) {
      return cookieLang;
    }

    return null;
  }

  private getLanguageName(code: string): string {
    const names: Record<string, string> = {
      'en': 'English',
      'es': 'Español',
      'fr': 'Français',
      'de': 'Deutsch',
      'it': 'Italiano',
      'pt': 'Português',
      'ar': 'العربية',
      'zh': '中文',
      'ja': '日本語',
      'ko': '한국어',
      'ht': 'Kreyòl Ayisyen'
    };
    return names[code] || code.toUpperCase();
  }

  dismiss() {
    this.clearAutoDismissTimer();
    localStorage.setItem(this.DISMISSED_STORAGE_KEY, Date.now().toString());
    this.suggestionSubject.next(null);
  }

  switchToPreferred(code: string) {
    this.cookieService.set('lang', code, { expires: 365, path: '/' });
    this.cookieService.set(this.PREFERRED_LANG_COOKIE, code, { expires: 365, path: '/' });

    const urlParts = this.router.url.split('/');
    urlParts[1] = code;

    this.dismiss();
    this.router.navigateByUrl(urlParts.join('/'));
  }
}
